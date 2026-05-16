const fs = require("fs");
const path = require("path");
const PDFDocument = require("pdfkit");

const formatCurrency = (amount) => {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
  }).format(Number(amount) || 0);
};

const formatDate = (date) => {
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(date));
};

const companyName = () => process.env.COMPANY_NAME || "DIFMS";
const companyAddress = () =>
  process.env.COMPANY_ADDRESS ||
  "DIFMS Accounts Department, London, United Kingdom";
const companyEmail = () => process.env.COMPANY_EMAIL || process.env.MAIL_FROM || "";
const defaultLogoPath = () => path.join(__dirname, "..", "assets", "intern.jpg");

const addRow = (doc, label, value, y) => {
  doc.font("Helvetica-Bold").fontSize(10).fillColor("#334155").text(label, 50, y);
  doc.font("Helvetica").fontSize(10).fillColor("#0f172a").text(value || "-", 210, y);
};

const generateReceiptPdf = ({ receipt, invoice, customer, logoPath = defaultLogoPath() }) => {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", margin: 50 });
    const chunks = [];

    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

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
    doc.font("Helvetica").fontSize(11).fillColor("#cbd5e1").text("Official Payment Receipt", 120, 68);

    doc.fillColor("#0f172a").font("Helvetica-Bold").fontSize(20).text("Receipt", 50, 150);
    doc
      .font("Helvetica")
      .fontSize(10)
      .fillColor("#64748b")
      .text("Proof of payment for the invoice listed below.", 50, 178);

    const startY = 220;
    addRow(doc, "Receipt Number", receipt.receiptNumber, startY);
    addRow(doc, "Invoice Number", invoice.invoiceNumber, startY + 28);
    addRow(doc, "Customer Name", customer.name, startY + 56);
    addRow(doc, "Customer Email", customer.email, startY + 84);
    addRow(doc, "Payment Date", formatDate(receipt.paymentDate), startY + 112);
    addRow(doc, "Payment Method", receipt.method, startY + 140);

    doc.roundedRect(50, 400, 495, 90, 8).fill("#f8fafc").stroke("#e2e8f0");
    doc.fillColor("#334155").font("Helvetica-Bold").fontSize(11).text("Amount Paid", 75, 428);
    doc.fillColor("#16a34a").font("Helvetica-Bold").fontSize(28).text(formatCurrency(receipt.amount), 75, 450);
    doc
      .fillColor("#64748b")
      .font("Helvetica")
      .fontSize(10)
      .text(`Invoice total: ${formatCurrency(invoice.total)}`, 320, 430)
      .text(`Amount paid: ${formatCurrency(invoice.amountPaid)}`, 320, 452)
      .text(`Balance due: ${formatCurrency(invoice.balanceDue)}`, 320, 474);

    doc.fillColor("#0f172a").font("Helvetica-Bold").fontSize(12).text("Payment Details", 50, 525);

    const itemY = 555;
    doc.font("Helvetica-Bold").fontSize(10).fillColor("#334155");
    doc.text("Description", 50, itemY);
    doc.text("Qty", 310, itemY);
    doc.text("Price", 370, itemY);
    doc.text("Total", 465, itemY);
    doc.moveTo(50, itemY + 18).lineTo(545, itemY + 18).stroke("#cbd5e1");

    let y = itemY + 35;
    invoice.items.forEach((item) => {
      doc.font("Helvetica").fontSize(10).fillColor("#0f172a");
      doc.text(item.description ? `${item.name} - ${item.description}` : item.name, 50, y, { width: 240 });
      doc.text(String(item.quantity), 310, y);
      doc.text(formatCurrency(item.price), 370, y);
      doc.text(formatCurrency(item.total), 465, y);
      y += 24;
    });

    doc.moveTo(50, 745).lineTo(545, 745).stroke("#cbd5e1");
    doc
      .font("Helvetica")
      .fontSize(9)
      .fillColor("#64748b")
      .text(companyAddress(), 50, 760, { width: 330 })
      .text(companyEmail(), 50, 774, { width: 330 });
    doc
      .font("Helvetica-Bold")
      .fillColor("#0f172a")
      .text("Thank you for your payment.", 380, 760, {
        width: 165,
        align: "right",
      });

    doc.end();
  });
};

module.exports = { formatCurrency, formatDate, generateReceiptPdf };
