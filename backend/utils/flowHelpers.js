const crypto = require("crypto");
const Invoice = require("../models/Invoice");
const Quote = require("../models/Quote");
const { sendEmail } = require("./emailService");
const { syncCustomerStatusFromInvoice } = require("./customerStatus");

const createNumber = (prefix) => {
  return `${prefix}-${Date.now()}`;
};

const createToken = () => {
  return crypto.randomBytes(32).toString("hex");
};

const getApiBaseUrl = () => {
  return process.env.API_URL || `http://localhost:${process.env.PORT || 5000}`;
};

const getClientBaseUrl = () => {
  return process.env.CLIENT_URL || "http://localhost:3000";
};

const formatCurrency = (amount) => {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
  }).format(Number(amount) || 0);
};

const createInvoiceFromQuote = async (quote, dueDate) => {
  const existingInvoice = await Invoice.findOne({
    quote: quote._id,
    user: quote.user,
  });

  if (existingInvoice) {
    return existingInvoice;
  }

  const invoice = await Invoice.create({
    user: quote.user,
    customer: quote.customer,
    quote: quote._id,
    invoiceNumber: createNumber("INV"),
    items: quote.items,
    subtotal: quote.subtotal,
    tax: quote.tax,
    discount: quote.discount,
    total: quote.total,
    amountPaid: 0,
    balanceDue: quote.total,
    status: "sent",
    dueDate,
    paymentToken: createToken(),
  });

  await syncCustomerStatusFromInvoice(invoice);
  return invoice;
};

const sendQuoteEmail = async (quote) => {
  const populatedQuote = await Quote.findById(quote._id).populate("customer");
  const customer = populatedQuote.customer;

  if (!customer.email) {
    throw new Error("Customer email is required before sending a quote");
  }

  const apiBaseUrl = getApiBaseUrl();
  const acceptUrl = `${apiBaseUrl}/api/public/quotes/${populatedQuote.actionToken}/accept`;
  const declineUrl = `${apiBaseUrl}/api/public/quotes/${populatedQuote.actionToken}/decline`;

  return sendEmail({
    to: customer.email,
    subject: `Quote ${populatedQuote.quoteNumber} from DIFMS`,
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.5;">
        <h2>Quote ${populatedQuote.quoteNumber}</h2>
        <p>Hello ${customer.name},</p>
        <p>Please review your quote details below.</p>
        <table cellpadding="8" cellspacing="0" border="1" style="border-collapse: collapse;">
          <tr><td><strong>Customer</strong></td><td>${customer.name}</td></tr>
          <tr><td><strong>Email</strong></td><td>${customer.email}</td></tr>
          <tr><td><strong>Amount</strong></td><td>${formatCurrency(populatedQuote.total)}</td></tr>
          <tr><td><strong>Status</strong></td><td>${populatedQuote.status}</td></tr>
        </table>
        <p>
          <a href="${acceptUrl}" style="display:inline-block;padding:12px 18px;background:#16a34a;color:#fff;text-decoration:none;border-radius:6px;">Accept Quote</a>
          <a href="${declineUrl}" style="display:inline-block;padding:12px 18px;background:#dc2626;color:#fff;text-decoration:none;border-radius:6px;margin-left:8px;">Decline Quote</a>
        </p>
      </div>
    `,
  });
};

const sendPaymentEmail = async (invoice) => {
  const populatedInvoice = await Invoice.findById(invoice._id).populate("customer");
  const customer = populatedInvoice.customer;

  if (!customer.email) {
    throw new Error("Customer email is required before sending payment email");
  }

  if (!populatedInvoice.paymentToken) {
    populatedInvoice.paymentToken = createToken();
    await populatedInvoice.save();
  }

  const apiBaseUrl = getApiBaseUrl();
  const payUrl = `${apiBaseUrl}/api/public/invoices/${populatedInvoice.paymentToken}/pay`;
  return sendEmail({
    to: customer.email,
    subject: `Payment request for invoice ${populatedInvoice.invoiceNumber}`,
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.5;">
        <h2>Invoice ${populatedInvoice.invoiceNumber}</h2>
        <p>Hello ${customer.name},</p>
        <p>Your quote has been accepted and an invoice has been generated.</p>
        <table cellpadding="8" cellspacing="0" border="1" style="border-collapse: collapse;">
          <tr><td><strong>Invoice</strong></td><td>${populatedInvoice.invoiceNumber}</td></tr>
          <tr><td><strong>Amount Due</strong></td><td>${formatCurrency(populatedInvoice.balanceDue)}</td></tr>
          <tr><td><strong>Status</strong></td><td>${populatedInvoice.status}</td></tr>
        </table>
        <p>
          <a href="${payUrl}" style="display:inline-block;padding:12px 18px;background:#2563eb;color:#fff;text-decoration:none;border-radius:6px;">Pay Now</a>
        </p>
      </div>
    `,
  });
};

module.exports = {
  createNumber,
  createToken,
  createInvoiceFromQuote,
  formatCurrency,
  getClientBaseUrl,
  sendPaymentEmail,
  sendQuoteEmail,
};
