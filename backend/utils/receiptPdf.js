const fs = require("fs");
const path = require("path");
const PDFDocument = require("pdfkit");
const { formatCurrency: formatMoney } = require("./currency");

const formatDate = (date) => {
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(date));
};

const companyName = () => process.env.COMPANY_NAME || "Brent labs";
const companyAddress = () =>
  process.env.COMPANY_ADDRESS ||
  "Brent labs Accounts Department, London, United Kingdom";
const companyEmail = () => process.env.COMPANY_EMAIL || process.env.MAIL_FROM || "";
const defaultLogoPath = () => path.join(__dirname, "..", "assets", "intern.jpg");

const formatStatus = (invoice) => {
  const total = Number(invoice.total) || 0;
  const amountPaid = Number(invoice.amountPaid) || 0;
  const balanceDue = Number(invoice.balanceDue ?? total - amountPaid) || 0;

  if (invoice.status === "paid" || balanceDue <= 0 || amountPaid >= total) {
    return "Paid";
  }

  if (invoice.status === "overdue") {
    return "Overdue";
  }

  if (amountPaid > 0) {
    return "Partially Paid";
  }

  return "Pending";
};

const addRow = (doc, label, value, y) => {
  doc.font("Helvetica-Bold").fontSize(10).fillColor("#334155").text(label, 50, y);
  doc.font("Helvetica").fontSize(10).fillColor("#0f172a").text(value || "-", 210, y);
};

const drawHeader = (doc, subtitle, logoPath) => {
  doc.rect(0, 0, 595, 120).fill("#0f172a");
  if (logoPath && fs.existsSync(logoPath)) {
    doc.save();
    doc.roundedRect(50, 35, 54, 54, 8).clip();
    doc.image(logoPath, 50, 35, { width: 54, height: 54 });
    doc.restore();
  } else {
    doc
      .roundedRect(50, 35, 54, 54, 8)
      .fill("#2563eb")
      .fillColor("#ffffff")
      .font("Helvetica-Bold")
      .fontSize(18)
      .text(companyName().slice(0, 2).toUpperCase(), 64, 52);
  }
  doc.fillColor("#ffffff").font("Helvetica-Bold").fontSize(24).text(companyName(), 120, 38);
  doc.font("Helvetica").fontSize(11).fillColor("#cbd5e1").text(subtitle, 120, 68);
};

const drawItemsTable = (doc, items = [], startY) => {
  doc.font("Helvetica-Bold").fontSize(10).fillColor("#334155");
  doc.text("Service", 50, startY);
  doc.text("Qty", 310, startY);
  doc.text("Price", 370, startY);
  doc.text("Total", 465, startY);
  doc.moveTo(50, startY + 18).lineTo(545, startY + 18).stroke("#cbd5e1");

  let y = startY + 35;
  items.forEach((item) => {
    doc.font("Helvetica").fontSize(10).fillColor("#0f172a");
    doc.text(item.name || "Service", 50, y, {
      width: 240,
    });
    doc.text(String(item.quantity || 1), 310, y);
    doc.text(formatMoney(item.price, doc.invoiceCurrency), 370, y);
    doc.text(formatMoney(item.total, doc.invoiceCurrency), 465, y);
    y += 24;
  });
};

const drawFooter = (doc, message) => {
  doc.moveTo(50, 745).lineTo(545, 745).stroke("#cbd5e1");
  doc
    .font("Helvetica")
    .fontSize(9)
    .fillColor("#64748b")
    .text(companyAddress(), 50, 760, { width: 330 })
    .text(companyEmail(), 50, 774, { width: 330 });
  doc.font("Helvetica-Bold").fillColor("#0f172a").text(message, 380, 760, {
    width: 165,
    align: "right",
  });
};

const generateInvoicePdf = ({
  invoice,
  customer,
  logoPath = defaultLogoPath(),
  documentTitle = "Invoice",
  documentSubtitle = "Official Invoice",
  numberLabel = "Invoice Number",
  numberValue,
}) => {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", margin: 50 });
    const chunks = [];
    const documentNumber = numberValue || invoice.invoiceNumber;

    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    drawHeader(doc, documentSubtitle, logoPath);
    doc.invoiceCurrency = invoice.currency;

    doc.fillColor("#0f172a").font("Helvetica-Bold").fontSize(20).text(documentTitle, 50, 150);
    doc
      .font("Helvetica")
      .fontSize(10)
      .fillColor("#64748b")
      .text("Amount requested for the services listed below.", 50, 178);

    const startY = 220;
    addRow(doc, numberLabel, documentNumber, startY);
    addRow(doc, "Status", formatStatus(invoice), startY + 28);
    addRow(doc, "Customer Name", customer.name, startY + 56);
    addRow(doc, "Customer Email", customer.email, startY + 84);
    addRow(doc, "Issue Date", formatDate(invoice.createdAt || new Date()), startY + 112);
    addRow(doc, "Due Date", invoice.dueDate ? formatDate(invoice.dueDate) : "On receipt", startY + 140);

    doc.roundedRect(50, 400, 495, 90, 8).fill("#f8fafc").stroke("#e2e8f0");
    doc.fillColor("#334155").font("Helvetica-Bold").fontSize(11).text("Amount Due", 75, 428);
    doc
      .fillColor("#2563eb")
      .font("Helvetica-Bold")
      .fontSize(28)
      .text(formatMoney(invoice.balanceDue ?? invoice.total, invoice.currency), 75, 450);
    doc
      .fillColor("#64748b")
      .font("Helvetica")
      .fontSize(10)
      .text(`Subtotal: ${formatMoney(invoice.subtotal ?? invoice.total, invoice.currency)}`, 320, 430)
      .text(`Paid: ${formatMoney(invoice.amountPaid, invoice.currency)}`, 320, 452)
      .text(`Total: ${formatMoney(invoice.total, invoice.currency)}`, 320, 474);

    doc.fillColor("#0f172a").font("Helvetica-Bold").fontSize(12).text("Services", 50, 525);
    drawItemsTable(doc, invoice.items, 555);
    drawFooter(doc, "Thank you for your business.");

    doc.end();
  });
};

const generateReceiptPdf = ({ receipt, invoice, customer, logoPath = defaultLogoPath() }) => {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", margin: 50 });
    const chunks = [];

    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    drawHeader(doc, "Official Payment Receipt", logoPath);
    doc.invoiceCurrency = invoice.currency;

    doc.fillColor("#0f172a").font("Helvetica-Bold").fontSize(20).text("Receipt", 50, 150);
    doc
      .font("Helvetica")
      .fontSize(10)
      .fillColor("#64748b")
      .text("Proof of payment for the invoice listed below.", 50, 178);

    const startY = 220;
    addRow(doc, "Receipt Number", receipt.receiptNumber, startY);
    addRow(doc, "Status", formatStatus(invoice), startY + 28);
    addRow(doc, "Customer Name", customer.name, startY + 56);
    addRow(doc, "Customer Email", customer.email, startY + 84);
    addRow(doc, "Payment Date", formatDate(receipt.paymentDate), startY + 112);
    addRow(doc, "Payment Method", receipt.method, startY + 140);

    doc.roundedRect(50, 400, 495, 90, 8).fill("#f8fafc").stroke("#e2e8f0");
    doc.fillColor("#334155").font("Helvetica-Bold").fontSize(11).text("Amount Paid", 75, 428);
    doc
      .fillColor("#16a34a")
      .font("Helvetica-Bold")
      .fontSize(28)
      .text(formatMoney(receipt.amount, invoice.currency), 75, 450);
    doc
      .fillColor("#64748b")
      .font("Helvetica")
      .fontSize(10)
      .text(`Invoice total: ${formatMoney(invoice.total, invoice.currency)}`, 320, 430)
      .text(`Amount paid: ${formatMoney(invoice.amountPaid, invoice.currency)}`, 320, 452)
      .text(`Balance due: ${formatMoney(invoice.balanceDue, invoice.currency)}`, 320, 474);

    doc.fillColor("#0f172a").font("Helvetica-Bold").fontSize(12).text("Services", 50, 525);

    drawItemsTable(doc, invoice.items, 555);
    drawFooter(doc, "Thank you for your payment.");

    doc.end();
  });
};

module.exports = { formatCurrency: formatMoney, formatDate, generateInvoicePdf, generateReceiptPdf };
