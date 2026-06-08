const crypto = require("crypto");
const Invoice = require("../models/Invoice");
const Quote = require("../models/Quote");
const { sendEmail } = require("./emailService");
const { syncCustomerStatusFromInvoice } = require("./customerStatus");
const { formatCurrency, normalizeCurrency } = require("./currency");
const { generateInvoicePdf } = require("./receiptPdf");

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

const formatStatus = (record) => {
  const total = Number(record.total) || 0;
  const amountPaid = Number(record.amountPaid) || 0;
  const balanceDue = Number(record.balanceDue ?? total - amountPaid) || 0;

  if (record.status === "paid" || balanceDue <= 0 || amountPaid >= total) {
    return "Paid";
  }

  if (amountPaid > 0) {
    return "Partially Paid";
  }

  return "Pending";
};

const formatServiceRows = (items = [], currency) => {
  return items
    .map(
      (item) => `
        <tr>
          <td>${item.name || "Service"}</td>
          <td>${item.quantity || 1}</td>
          <td>${formatCurrency(item.total, currency)}</td>
        </tr>
      `
    )
    .join("");
};

const createInitialsLogoHtml = (companyName, size = 48) => {
  const fontSize = size >= 56 ? 18 : 16;

  return `<div style="height:${size}px;width:${size}px;border-radius:10px;background:#2563eb;color:#fff;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:${fontSize}px;">${companyName
    .slice(0, 2)
    .toUpperCase()}</div>`;
};

const getImageExtension = (contentType = "") => {
  if (contentType.includes("png")) return "png";
  if (contentType.includes("webp")) return "webp";
  if (contentType.includes("gif")) return "gif";
  return "jpg";
};

const getInlineCompanyLogo = (company, cid, size = 48) => {
  const companyName = company?.name || "Brent labs";
  const logoUrl = company?.logoUrl || "";

  if (logoUrl.startsWith("data:image/")) {
    const match = logoUrl.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);

    if (match) {
      const [, contentType, base64Content] = match;
      return {
        html: `<img src="cid:${cid}" alt="${companyName}" style="height:${size}px;width:${size}px;object-fit:cover;border-radius:10px;display:block;" />`,
        attachments: [
          {
            filename: `company-logo.${getImageExtension(contentType)}`,
            content: Buffer.from(base64Content, "base64"),
            contentType,
            cid,
          },
        ],
      };
    }
  }

  if (logoUrl.startsWith("http://") || logoUrl.startsWith("https://")) {
    return {
      html: `<img src="${logoUrl}" alt="${companyName}" style="height:${size}px;width:${size}px;object-fit:cover;border-radius:10px;display:block;" />`,
      attachments: [],
    };
  }

  return {
    html: createInitialsLogoHtml(companyName, size),
    attachments: [],
  };
};

const createInvoiceFromQuote = async (quote, dueDate) => {
  const existingInvoice = await Invoice.findOne({
    quote: quote._id,
    organization: quote.organization,
    isDeleted: { $ne: true },
  });

  if (existingInvoice) {
    return existingInvoice;
  }

  const invoice = await Invoice.create({
    user: quote.user,
    organization: quote.organization,
    customer: quote.customer,
    quote: quote._id,
    invoiceNumber: createNumber("INV"),
    items: quote.items,
    subtotal: quote.subtotal,
    currency: normalizeCurrency(quote.currency),
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
  const populatedQuote = await Quote.findOne({
    _id: quote._id,
    isDeleted: { $ne: true },
  })
    .populate("customer")
    .populate("organization");
  const customer = populatedQuote.customer;
  const company = populatedQuote.organization;
  const companyName = company?.name || "Brent labs";

  if (!customer.email) {
    throw new Error("Customer email is required before sending a quote");
  }

  const apiBaseUrl = getApiBaseUrl();
  const acceptUrl = `${apiBaseUrl}/api/public/quotes/${populatedQuote.actionToken}/accept`;
  const declineUrl = `${apiBaseUrl}/api/public/quotes/${populatedQuote.actionToken}/decline`;
  const currency = normalizeCurrency(populatedQuote.currency);
  const serviceRows = formatServiceRows(populatedQuote.items, currency);
  const logo = getInlineCompanyLogo(company, "quote-company-logo");
  const quotePdfBuffer = await generateInvoicePdf({
    invoice: {
      invoiceNumber: populatedQuote.quoteNumber,
      items: populatedQuote.items,
      subtotal: populatedQuote.subtotal,
      currency,
      tax: populatedQuote.tax,
      discount: populatedQuote.discount,
      total: populatedQuote.total,
      amountPaid: 0,
      balanceDue: populatedQuote.total,
      status: "sent",
      createdAt: populatedQuote.createdAt,
      dueDate: populatedQuote.validUntil,
    },
    customer,
    company,
    documentTitle: "Quote",
    documentSubtitle: "Official Quote",
    numberLabel: "Quote Number",
    numberValue: populatedQuote.quoteNumber,
  });

  return sendEmail({
    to: customer.email,
    subject: `Quote ${populatedQuote.quoteNumber} from ${companyName}`,
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.5;">
        <div style="display:flex;align-items:center;gap:12px;margin-bottom:18px;">
          ${logo.html}
          <strong style="font-size:20px;">${companyName}</strong>
        </div>
        <h2>Quote ${populatedQuote.quoteNumber}</h2>
        <p>Hello ${customer.name},</p>
        <p>Please review your quote details below.</p>
        <table cellpadding="8" cellspacing="0" border="1" style="border-collapse: collapse;">
          <tr><td><strong>Customer</strong></td><td>${customer.name}</td></tr>
          <tr><td><strong>Email</strong></td><td>${customer.email}</td></tr>
          <tr><td><strong>Amount</strong></td><td>${formatCurrency(populatedQuote.total, currency)}</td></tr>
          <tr><td><strong>Status</strong></td><td>Pending</td></tr>
        </table>
        <h3>Services</h3>
        <table cellpadding="8" cellspacing="0" border="1" style="border-collapse: collapse;">
          <thead>
            <tr>
              <th align="left">Service</th>
              <th align="left">Qty</th>
              <th align="left">Amount</th>
            </tr>
          </thead>
          <tbody>${serviceRows}</tbody>
        </table>
        <p>
          <a href="${acceptUrl}" style="display:inline-block;padding:12px 18px;background:#16a34a;color:#fff;text-decoration:none;border-radius:6px;">Accept Quote</a>
          <a href="${declineUrl}" style="display:inline-block;padding:12px 18px;background:#dc2626;color:#fff;text-decoration:none;border-radius:6px;margin-left:8px;">Decline Quote</a>
        </p>
      </div>
    `,
    attachments: [
      ...logo.attachments,
      {
        filename: `${populatedQuote.quoteNumber}.pdf`,
        content: quotePdfBuffer,
        contentType: "application/pdf",
      },
    ],
  });
};

const sendPaymentEmail = async (invoice) => {
  const populatedInvoice = await Invoice.findOne({
    _id: invoice._id,
    isDeleted: { $ne: true },
  })
    .populate("customer")
    .populate("organization");
  const customer = populatedInvoice.customer;
  const company = populatedInvoice.organization;
  const companyName = company?.name || "Brent labs";

  if (!customer.email) {
    throw new Error("Customer email is required before sending payment email");
  }

  if (!populatedInvoice.paymentToken) {
    populatedInvoice.paymentToken = createToken();
    await populatedInvoice.save();
  }

  const apiBaseUrl = getApiBaseUrl();
  const payUrl = `${apiBaseUrl}/api/public/invoices/${populatedInvoice.paymentToken}/pay`;
  const currency = normalizeCurrency(populatedInvoice.currency);
  const serviceRows = formatServiceRows(populatedInvoice.items, currency);
  const status = formatStatus(populatedInvoice);
  const logo = getInlineCompanyLogo(company, "invoice-company-logo");
  const invoicePdfBuffer = await generateInvoicePdf({
    invoice: populatedInvoice,
    customer,
    company,
  });

  return sendEmail({
    to: customer.email,
    subject: `Payment request from ${companyName} for invoice ${populatedInvoice.invoiceNumber}`,
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.5;">
        <div style="display:flex;align-items:center;gap:12px;margin-bottom:18px;">
          ${logo.html}
          <strong style="font-size:20px;">${companyName}</strong>
        </div>
        <h2>Invoice ${populatedInvoice.invoiceNumber}</h2>
        <p>Hello ${customer.name},</p>
        <p>Your quote has been accepted and an invoice has been generated.</p>
        <table cellpadding="8" cellspacing="0" border="1" style="border-collapse: collapse;">
          <tr><td><strong>Invoice</strong></td><td>${populatedInvoice.invoiceNumber}</td></tr>
          <tr><td><strong>Amount Due</strong></td><td>${formatCurrency(populatedInvoice.balanceDue, currency)}</td></tr>
          <tr><td><strong>Status</strong></td><td>${status}</td></tr>
        </table>
        <h3>Services</h3>
        <table cellpadding="8" cellspacing="0" border="1" style="border-collapse: collapse;">
          <thead>
            <tr>
              <th align="left">Service</th>
              <th align="left">Qty</th>
              <th align="left">Amount</th>
            </tr>
          </thead>
          <tbody>${serviceRows}</tbody>
        </table>
        <p>
          <a href="${payUrl}" style="display:inline-block;padding:12px 18px;background:#2563eb;color:#fff;text-decoration:none;border-radius:6px;">Pay Now</a>
        </p>
      </div>
    `,
    attachments: [
      ...logo.attachments,
      {
        filename: `${populatedInvoice.invoiceNumber}.pdf`,
        content: invoicePdfBuffer,
        contentType: "application/pdf",
      },
    ],
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
