const Customer = require("../models/Customer");
const Invoice = require("../models/Invoice");
const Quote = require("../models/Quote");
const {
  createInvoiceFromQuote,
  createNumber,
  createToken,
  sendPaymentEmail,
  sendQuoteEmail,
} = require("../utils/flowHelpers");
const { normalizeCurrency } = require("../utils/currency");

const calculateTotals = (items, tax = 0, discount = 0) => {
  const calculatedItems = items.map((item) => {
    const quantity = Number(item.quantity);
    const price = Number(item.price);

    return {
      name: String(item.name || "").trim(),
      quantity,
      price,
      total: quantity * price,
    };
  }).filter((item) => item.name && item.quantity > 0 && item.price >= 0);

  const subtotal = calculatedItems.reduce((sum, item) => sum + item.total, 0);
  const total = Math.max(subtotal + Number(tax) - Number(discount), 0);

  return {
    items: calculatedItems,
    subtotal,
    tax: Number(tax),
    discount: Number(discount),
    total,
  };
};

const createQuote = async (req, res) => {
  try {
    const { customer, items, tax, discount, validUntil, notes, status, currency } = req.body;

    if (!customer) {
      return res.status(400).json({ message: "Customer is required" });
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: "At least one quote item is required" });
    }

    const existingCustomer = await Customer.findOne({
      _id: customer,
      user: req.user._id,
      isDeleted: { $ne: true },
    });

    if (!existingCustomer) {
      return res.status(404).json({ message: "Customer not found" });
    }

    const totals = calculateTotals(items, tax, discount);
    if (totals.items.length === 0) {
      return res.status(400).json({ message: "At least one valid quote item is required" });
    }

    const quote = await Quote.create({
      user: req.user._id,
      customer,
      quoteNumber: createNumber("QTE"),
      ...totals,
      currency: normalizeCurrency(currency || req.user.currency),
      validUntil,
      notes,
      status: status || "draft",
      actionToken: createToken(),
      actionTokenExpires: new Date(Date.now() + 1000 * 60 * 60 * 24 * 14),
    });

    const populatedQuote = await quote.populate("customer");
    res.status(201).json(populatedQuote);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getQuotes = async (req, res) => {
  try {
    const quotes = await Quote.find({ user: req.user._id, isDeleted: { $ne: true } })
      .populate("customer")
      .sort({ createdAt: -1 });

    res.json(quotes.filter((quote) => quote.customer));
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getQuoteById = async (req, res) => {
  try {
    const quote = await Quote.findOne({
      _id: req.params.id,
      user: req.user._id,
      isDeleted: { $ne: true },
    }).populate("customer");

    if (!quote || !quote.customer) {
      return res.status(404).json({ message: "Quote not found" });
    }

    res.json(quote);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const updateQuote = async (req, res) => {
  try {
    const quote = await Quote.findOne({
      _id: req.params.id,
      user: req.user._id,
      isDeleted: { $ne: true },
    });

    if (!quote) {
      return res.status(404).json({ message: "Quote not found" });
    }

    if (quote.status === "converted") {
      return res.status(400).json({ message: "Converted quotes cannot be edited" });
    }

    const { customer, items, tax, discount, validUntil, notes, status, currency } = req.body;

    if (customer) {
      const existingCustomer = await Customer.findOne({
        _id: customer,
        user: req.user._id,
        isDeleted: { $ne: true },
      });

      if (!existingCustomer) {
        return res.status(404).json({ message: "Customer not found" });
      }

      quote.customer = customer;
    }

    if (items) {
      const totals = calculateTotals(items, tax ?? quote.tax, discount ?? quote.discount);
      if (totals.items.length === 0) {
        return res.status(400).json({ message: "At least one valid quote item is required" });
      }
      quote.items = totals.items;
      quote.subtotal = totals.subtotal;
      quote.tax = totals.tax;
      quote.discount = totals.discount;
      quote.total = totals.total;
    } else {
      if (tax !== undefined) quote.tax = Number(tax);
      if (discount !== undefined) quote.discount = Number(discount);
      quote.total = Math.max(quote.subtotal + quote.tax - quote.discount, 0);
    }

    if (validUntil !== undefined) quote.validUntil = validUntil;
    if (notes !== undefined) quote.notes = notes;
    if (status) quote.status = status;
    if (currency) quote.currency = normalizeCurrency(currency);

    const updatedQuote = await quote.save();
    const populatedQuote = await updatedQuote.populate("customer");

    res.json(populatedQuote);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const sendQuote = async (req, res) => {
  try {
    const quote = await Quote.findOne({
      _id: req.params.id,
      user: req.user._id,
      isDeleted: { $ne: true },
    }).populate("customer");

    if (!quote || !quote.customer) {
      return res.status(404).json({ message: "Quote not found" });
    }

    if (!quote.customer.email) {
      return res.status(400).json({ message: "Customer email is required to send quote" });
    }

    if (quote.status === "converted") {
      return res.status(400).json({ message: "Converted quotes cannot be sent" });
    }

    if (!quote.actionToken) {
      quote.actionToken = createToken();
      quote.actionTokenExpires = new Date(Date.now() + 1000 * 60 * 60 * 24 * 14);
    }

    const email = await sendQuoteEmail(quote);
    if (!email.sent) {
      return res.status(400).json({
        message: `Quote email was not sent: ${email.reason || "Unknown email error"}`,
        email,
      });
    }

    quote.status = "sent";
    await quote.save();
    const populatedQuote = await quote.populate("customer");

    res.json({
      message: `Quote email sent to ${quote.customer.email}`,
      quote: populatedQuote,
      email,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const acceptQuote = async (req, res) => {
  try {
    const quote = await Quote.findOne({
      _id: req.params.id,
      user: req.user._id,
      isDeleted: { $ne: true },
    }).populate("customer");

    if (!quote || !quote.customer) {
      return res.status(404).json({ message: "Quote not found" });
    }

    if (quote.status === "converted") {
      return res.status(400).json({ message: "Converted quotes cannot be accepted again" });
    }

    quote.status = "accepted";
    await quote.save();

    res.json(quote);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const convertQuoteToInvoice = async (req, res) => {
  try {
    const quote = await Quote.findOne({
      _id: req.params.id,
      user: req.user._id,
      isDeleted: { $ne: true },
    });

    if (!quote) {
      return res.status(404).json({ message: "Quote not found" });
    }

    if (quote.status !== "accepted") {
      return res.status(400).json({ message: "Only accepted quotes can be converted to invoices" });
    }

    const existingInvoice = await Invoice.findOne({
      quote: quote._id,
      user: req.user._id,
      isDeleted: { $ne: true },
    });

    if (existingInvoice) {
      return res.status(400).json({ message: "This quote is already converted to an invoice" });
    }

    const invoice = await createInvoiceFromQuote(quote, req.body.dueDate);

    quote.status = "converted";
    quote.acceptedAt = quote.acceptedAt || new Date();
    await quote.save();

    await sendPaymentEmail(invoice);

    const populatedInvoice = await invoice.populate(["customer", "quote"]);
    res.status(201).json(populatedInvoice);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  createQuote,
  getQuotes,
  getQuoteById,
  updateQuote,
  acceptQuote,
  sendQuote,
  convertQuoteToInvoice,
};
