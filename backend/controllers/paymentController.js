const Invoice = require("../models/Invoice");
const Payment = require("../models/Payment");
const Receipt = require("../models/Receipt");
const { recordInvoicePayment } = require("../utils/paymentHelpers");

const recordPayment = async (req, res) => {
  try {
    const { invoice: invoiceId, amount, paymentDate, method, referenceNumber, notes } = req.body;

    if (!invoiceId) {
      return res.status(400).json({ message: "Invoice is required" });
    }

    if (!amount || Number(amount) <= 0) {
      return res.status(400).json({ message: "Payment amount must be greater than 0" });
    }

    const invoice = await Invoice.findOne({
      _id: invoiceId,
      user: req.user._id,
    });

    if (!invoice) {
      return res.status(404).json({ message: "Invoice not found" });
    }

    if (invoice.status === "cancelled") {
      return res.status(400).json({ message: "Cannot record payment for a cancelled invoice" });
    }

    if (Number(amount) > invoice.balanceDue) {
      return res.status(400).json({ message: "Payment amount cannot be greater than balance due" });
    }

    const result = await recordInvoicePayment({
      invoice,
      amount: Number(amount),
      method: method || "cash",
      referenceNumber,
      notes: notes || (paymentDate ? `Payment date: ${paymentDate}` : undefined),
    });

    const populatedPayment = await result.payment.populate(["invoice", "customer"]);
    const populatedReceipt = await result.receipt.populate(["payment", "invoice", "customer"]);

    res.status(201).json({
      payment: populatedPayment,
      invoice: result.invoice,
      receipt: populatedReceipt,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getPayments = async (req, res) => {
  try {
    const payments = await Payment.find({ user: req.user._id })
      .populate("invoice")
      .populate("customer")
      .sort({ createdAt: -1 });

    res.json(payments);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getPaymentsByInvoice = async (req, res) => {
  try {
    const invoice = await Invoice.findOne({
      _id: req.params.invoiceId,
      user: req.user._id,
    });

    if (!invoice) {
      return res.status(404).json({ message: "Invoice not found" });
    }

    const payments = await Payment.find({
      user: req.user._id,
      invoice: req.params.invoiceId,
    })
      .populate("invoice")
      .populate("customer")
      .sort({ createdAt: -1 });

    res.json(payments);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getReceiptById = async (req, res) => {
  try {
    const receipt = await Receipt.findOne({
      _id: req.params.id,
      user: req.user._id,
    })
      .populate("payment")
      .populate("invoice")
      .populate("customer");

    if (!receipt) {
      return res.status(404).json({ message: "Receipt not found" });
    }

    res.json(receipt);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getReceiptByPayment = async (req, res) => {
  try {
    const receipt = await Receipt.findOne({
      payment: req.params.paymentId,
      user: req.user._id,
    })
      .populate("payment")
      .populate("invoice")
      .populate("customer");

    if (!receipt) {
      return res.status(404).json({ message: "Receipt not found" });
    }

    res.json(receipt);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  recordPayment,
  getPayments,
  getPaymentsByInvoice,
  getReceiptById,
  getReceiptByPayment,
};
