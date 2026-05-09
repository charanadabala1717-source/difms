const Payment = require("../models/Payment");
const Receipt = require("../models/Receipt");

const createNumber = (prefix) => {
  return `${prefix}-${Date.now()}`;
};

const getInvoiceStatus = (amountPaid, total, currentStatus = "sent") => {
  if (currentStatus === "cancelled") return "cancelled";
  if (amountPaid <= 0) return currentStatus === "draft" ? "draft" : "sent";
  if (amountPaid < total) return "partially_paid";
  return "paid";
};

const recordInvoicePayment = async ({
  invoice,
  amount,
  method = "card",
  referenceNumber,
  notes,
}) => {
  const paymentAmount = Number(amount);

  if (paymentAmount <= 0) {
    throw new Error("Payment amount must be greater than 0");
  }

  if (paymentAmount > invoice.balanceDue) {
    throw new Error("Payment amount cannot be greater than balance due");
  }

  const payment = await Payment.create({
    user: invoice.user,
    invoice: invoice._id,
    customer: invoice.customer,
    amount: paymentAmount,
    paymentDate: Date.now(),
    method,
    referenceNumber,
    notes,
  });

  invoice.amountPaid += payment.amount;
  invoice.balanceDue = Math.max(invoice.total - invoice.amountPaid, 0);
  invoice.status = getInvoiceStatus(invoice.amountPaid, invoice.total, invoice.status);
  if (invoice.status === "paid") {
    invoice.paidAt = new Date();
  }
  await invoice.save();

  const receipt = await Receipt.create({
    user: invoice.user,
    payment: payment._id,
    invoice: invoice._id,
    customer: invoice.customer,
    receiptNumber: createNumber("RCT"),
    amount: payment.amount,
    paymentDate: payment.paymentDate,
    method: payment.method,
  });

  return { payment, invoice, receipt };
};

module.exports = { getInvoiceStatus, recordInvoicePayment };
