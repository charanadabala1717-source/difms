const Customer = require("../models/Customer");
const Invoice = require("../models/Invoice");

const getInvoiceStatus = (amountPaid, total, currentStatus = "sent") => {
  if (currentStatus === "cancelled") return "cancelled";
  if (amountPaid <= 0) return currentStatus === "draft" ? "draft" : "sent";
  if (amountPaid < total) return "partially_paid";
  return "paid";
};

const getInvoices = async (req, res) => {
  try {
    const invoices = await Invoice.find({ user: req.user._id })
      .populate("customer")
      .populate("quote")
      .sort({ createdAt: -1 });

    const normalizedInvoices = await Promise.all(
      invoices.map(async (invoice) => {
        const nextBalanceDue = Math.max(invoice.total - invoice.amountPaid, 0);
        const nextStatus = getInvoiceStatus(invoice.amountPaid, invoice.total, invoice.status);

        if (invoice.balanceDue !== nextBalanceDue || invoice.status !== nextStatus) {
          invoice.balanceDue = nextBalanceDue;
          invoice.status = nextStatus;
          await invoice.save();
        }

        return invoice;
      })
    );

    res.json(normalizedInvoices);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const createNumber = (prefix) => {
  return `${prefix}-${Date.now()}`;
};

const mapUiStatusToInvoiceStatus = (status) => {
  if (status === "Paid") return "paid";
  if (status === "Overdue") return "overdue";
  return "sent";
};

const createInvoice = async (req, res) => {
  try {
    const { customer, customerName, amount, status, dueDate } = req.body;

    if (!customer && !customerName) {
      return res.status(400).json({ message: "Customer or customer name is required" });
    }

    if (!amount || Number(amount) <= 0) {
      return res.status(400).json({ message: "Invoice amount must be greater than 0" });
    }

    let invoiceCustomer;

    if (customer) {
      invoiceCustomer = await Customer.findOne({
        _id: customer,
        user: req.user._id,
      });
    } else {
      invoiceCustomer = await Customer.findOneAndUpdate(
        { name: customerName, user: req.user._id },
        { name: customerName, user: req.user._id },
        { new: true, upsert: true }
      );
    }

    if (!invoiceCustomer) {
      return res.status(404).json({ message: "Customer not found" });
    }

    const total = Number(amount);
    const invoiceStatus = mapUiStatusToInvoiceStatus(status);
    const amountPaid = invoiceStatus === "paid" ? total : 0;

    const invoice = await Invoice.create({
      user: req.user._id,
      customer: invoiceCustomer._id,
      invoiceNumber: createNumber("INV"),
      items: [
        {
          name: "Invoice amount",
          quantity: 1,
          price: total,
          total,
        },
      ],
      subtotal: total,
      tax: 0,
      discount: 0,
      total,
      amountPaid,
      balanceDue: Math.max(total - amountPaid, 0),
      status: invoiceStatus,
      dueDate,
    });

    const populatedInvoice = await invoice.populate("customer");
    res.status(201).json(populatedInvoice);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getInvoiceById = async (req, res) => {
  try {
    const invoice = await Invoice.findOne({
      _id: req.params.id,
      user: req.user._id,
    })
      .populate("customer")
      .populate("quote");

    if (!invoice) {
      return res.status(404).json({ message: "Invoice not found" });
    }

    res.json(invoice);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const updateInvoice = async (req, res) => {
  try {
    const invoice = await Invoice.findOne({
      _id: req.params.id,
      user: req.user._id,
    });

    if (!invoice) {
      return res.status(404).json({ message: "Invoice not found" });
    }

    const { customerName, amount, dueDate, status } = req.body;

    if (dueDate !== undefined) invoice.dueDate = dueDate;
    if (status !== undefined) {
      invoice.status = mapUiStatusToInvoiceStatus(status);
      invoice.amountPaid = invoice.status === "paid" ? invoice.total : 0;
    }

    if (customerName !== undefined) {
      await Customer.findOneAndUpdate(
        { _id: invoice.customer, user: req.user._id },
        { name: customerName },
        { new: true }
      );
    }

    if (amount !== undefined) {
      const total = Number(amount);
      invoice.items = [
        {
          name: "Invoice amount",
          quantity: 1,
          price: total,
          total,
        },
      ];
      invoice.subtotal = total;
      invoice.total = total;
      if (invoice.status === "paid") {
        invoice.amountPaid = total;
      } else {
        invoice.amountPaid = Math.min(invoice.amountPaid, total);
      }
    }

    invoice.balanceDue = Math.max(invoice.total - invoice.amountPaid, 0);
    invoice.status = getInvoiceStatus(invoice.amountPaid, invoice.total, invoice.status);

    const updatedInvoice = await invoice.save();
    const populatedInvoice = await updatedInvoice.populate(["customer", "quote"]);

    res.json(populatedInvoice);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const deleteInvoice = async (req, res) => {
  try {
    const invoice = await Invoice.findOneAndDelete({
      _id: req.params.id,
      user: req.user._id,
    });

    if (!invoice) {
      return res.status(404).json({ message: "Invoice not found" });
    }

    res.json({ message: "Invoice deleted" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const sendInvoice = async (req, res) => {
  try {
    const invoice = await Invoice.findOne({
      _id: req.params.id,
      user: req.user._id,
    });

    if (!invoice) {
      return res.status(404).json({ message: "Invoice not found" });
    }

    if (invoice.status === "draft") {
      invoice.status = "sent";
    }

    const updatedInvoice = await invoice.save();
    const populatedInvoice = await updatedInvoice.populate(["customer", "quote"]);

    res.json(populatedInvoice);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  createInvoice,
  getInvoices,
  getInvoiceById,
  updateInvoice,
  sendInvoice,
  deleteInvoice,
  getInvoiceStatus,
};
