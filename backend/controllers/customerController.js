const Customer = require("../models/Customer");
const Invoice = require("../models/Invoice");
const Payment = require("../models/Payment");
const Quote = require("../models/Quote");
const Receipt = require("../models/Receipt");
const { createNumber, createToken, sendQuoteEmail } = require("../utils/flowHelpers");

const createCustomer = async (req, res) => {
  try {
    const {
      name,
      email,
      phone,
      countryCode,
      phoneNumber,
      totalAmount,
      service,
      status,
      address,
      companyName,
    } = req.body;

    if (!name) {
      return res.status(400).json({ message: "Customer name is required" });
    }

    const customer = await Customer.create({
      user: req.user._id,
      name,
      email,
      phone: phone || phoneNumber,
      countryCode,
      phoneNumber,
      totalAmount: Number(totalAmount) || 0,
      service,
      status,
      address,
      companyName,
    });

    res.status(201).json(customer);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getCustomers = async (req, res) => {
  try {
    const customers = await Customer.find({
      user: req.user._id,
      isDeleted: { $ne: true },
    }).sort({ createdAt: -1 });
    res.json(customers);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getCustomerById = async (req, res) => {
  try {
    const customer = await Customer.findOne({
      _id: req.params.id,
      user: req.user._id,
      isDeleted: { $ne: true },
    });

    if (!customer) {
      return res.status(404).json({ message: "Customer not found" });
    }

    res.json(customer);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const updateCustomer = async (req, res) => {
  try {
    const customer = await Customer.findOneAndUpdate(
      { _id: req.params.id, user: req.user._id, isDeleted: { $ne: true } },
      req.body,
      { new: true, runValidators: true }
    );

    if (!customer) {
      return res.status(404).json({ message: "Customer not found" });
    }

    res.json(customer);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const deleteCustomer = async (req, res) => {
  try {
    const customer = await Customer.findOneAndUpdate(
      {
        _id: req.params.id,
        user: req.user._id,
        isDeleted: { $ne: true },
      },
      {
        isDeleted: true,
        deletedAt: new Date(),
      },
      { new: true }
    );

    if (!customer) {
      return res.status(404).json({ message: "Customer not found" });
    }

    const softDelete = {
      isDeleted: true,
      deletedAt: new Date(),
    };

    await Promise.all([
      Receipt.updateMany({ customer: customer._id, user: req.user._id }, softDelete),
      Payment.updateMany({ customer: customer._id, user: req.user._id }, softDelete),
      Invoice.updateMany({ customer: customer._id, user: req.user._id }, softDelete),
      Quote.updateMany({ customer: customer._id, user: req.user._id }, softDelete),
    ]);

    res.json({ message: "Customer and related records deleted" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const sendCustomerQuoteEmail = async (req, res) => {
  try {
    const customer = await Customer.findOne({
      _id: req.params.id,
      user: req.user._id,
      isDeleted: { $ne: true },
    });

    if (!customer) {
      return res.status(404).json({ message: "Customer not found" });
    }

    if (!customer.email) {
      return res.status(400).json({ message: "Customer email is required" });
    }

    if (!customer.totalAmount || Number(customer.totalAmount) <= 0) {
      return res.status(400).json({ message: "Customer total amount must be greater than 0" });
    }

    const amount = Number(customer.totalAmount);
    const quote = await Quote.create({
      user: req.user._id,
      customer: customer._id,
      quoteNumber: createNumber("QTE"),
      items: [
        {
          name: customer.service || "Service",
          description: `Quote for ${customer.name}`,
          quantity: 1,
          price: amount,
          total: amount,
        },
      ],
      subtotal: amount,
      tax: 0,
      discount: 0,
      total: amount,
      status: "sent",
      notes: `Quote created from customer record for ${customer.name}`,
      actionToken: createToken(),
      actionTokenExpires: new Date(Date.now() + 1000 * 60 * 60 * 24 * 14),
    });

    const emailResult = await sendQuoteEmail(quote);
    const populatedQuote = await quote.populate("customer");

    res.status(201).json({
      message: emailResult.sent
        ? "Quote email sent"
        : "Quote created, but email was not sent because SMTP is not configured",
      quote: populatedQuote,
      email: emailResult,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  createCustomer,
  getCustomers,
  getCustomerById,
  updateCustomer,
  deleteCustomer,
  sendCustomerQuoteEmail,
};
