const fs = require("fs");
const path = require("path");
const Customer = require("../models/Customer");
const Invoice = require("../models/Invoice");
const Receipt = require("../models/Receipt");
const { sendEmail } = require("../utils/emailService");
const { syncCustomerStatusFromInvoice } = require("../utils/customerStatus");
const { formatCurrency, formatDate, generateReceiptPdf } = require("../utils/receiptPdf");

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
          await syncCustomerStatusFromInvoice(invoice);
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

const getReceiptLogoPath = () => {
  const customLogoPath = process.env.COMPANY_LOGO_PATH;

  if (customLogoPath && fs.existsSync(customLogoPath)) {
    return customLogoPath;
  }

  return path.join(__dirname, "..", "assets", "intern.jpg");
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
    await syncCustomerStatusFromInvoice(invoice);
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
    await syncCustomerStatusFromInvoice(updatedInvoice);
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

const sendReceiptEmail = async (req, res) => {
  try {
    const invoice = await Invoice.findOne({
      _id: req.params.id,
      user: req.user._id,
    }).populate("customer");

    if (!invoice) {
      return res.status(404).json({ message: "Invoice not found" });
    }

    if (invoice.status !== "paid" && invoice.balanceDue > 0) {
      return res.status(400).json({ message: "Receipt can be sent only after payment is complete" });
    }

    if (!invoice.customer.email) {
      return res.status(400).json({ message: "Customer email is required to send receipt" });
    }

    const receipt = await Receipt.findOne({
      invoice: invoice._id,
      user: req.user._id,
    }).sort({ createdAt: -1 });

    if (!receipt) {
      return res.status(404).json({ message: "Receipt not found for this invoice" });
    }

    const logoPath = getReceiptLogoPath();
    const hasLogoFile = fs.existsSync(logoPath);

    const pdfBuffer = await generateReceiptPdf({
      receipt,
      invoice,
      customer: invoice.customer,
      logoPath,
    });

    const companyName = process.env.COMPANY_NAME || "DIFMS";
    const companyAddress =
      process.env.COMPANY_ADDRESS ||
      "DIFMS Accounts Department, London, United Kingdom";

    const logoHtml = hasLogoFile
      ? `<img src="cid:receipt-logo" alt="${companyName}" style="height:56px;width:56px;object-fit:cover;border-radius:10px;display:block;" />`
      : `<div style="height:56px;width:56px;border-radius:10px;background:#2563eb;color:#fff;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:18px;">${companyName
          .slice(0, 2)
          .toUpperCase()}</div>`;
    const serviceRows = invoice.items
      .map(
        (item) => `
          <tr>
            <td style="padding:10px;border:1px solid #e2e8f0;">${item.name}</td>
            <td style="padding:10px;border:1px solid #e2e8f0;">${item.description || "-"}</td>
            <td style="padding:10px;border:1px solid #e2e8f0;text-align:right;">${formatCurrency(item.total)}</td>
          </tr>
        `
      )
      .join("");

    await sendEmail({
      to: invoice.customer.email,
      subject: `Receipt ${receipt.receiptNumber} for invoice ${invoice.invoiceNumber}`,
      html: `
        <div style="margin:0;padding:0;background:#f8fafc;font-family:Arial,sans-serif;color:#0f172a;">
          <div style="max-width:680px;margin:0 auto;background:#ffffff;border:1px solid #e2e8f0;">
            <div style="background:#0f172a;color:#ffffff;padding:24px 28px;display:flex;align-items:center;gap:16px;">
              ${logoHtml}
              <div>
                <h1 style="margin:0;font-size:24px;line-height:1.2;">${companyName}</h1>
                <p style="margin:6px 0 0;color:#cbd5e1;font-size:14px;">Official Payment Receipt</p>
              </div>
            </div>

            <div style="padding:28px;">
              <p style="margin:0 0 16px;font-size:16px;">Hello ${invoice.customer.name},</p>
              <p style="margin:0 0 24px;line-height:1.6;color:#334155;">
                Thank you for your payment. Please find your receipt attached as a PDF.
              </p>

              <table style="width:100%;border-collapse:collapse;margin-bottom:24px;">
                <tr>
                  <td style="padding:10px;border:1px solid #e2e8f0;background:#f8fafc;font-weight:700;">Receipt Number</td>
                  <td style="padding:10px;border:1px solid #e2e8f0;">${receipt.receiptNumber}</td>
                </tr>
                <tr>
                  <td style="padding:10px;border:1px solid #e2e8f0;background:#f8fafc;font-weight:700;">Invoice Number</td>
                  <td style="padding:10px;border:1px solid #e2e8f0;">${invoice.invoiceNumber}</td>
                </tr>
                <tr>
                  <td style="padding:10px;border:1px solid #e2e8f0;background:#f8fafc;font-weight:700;">Customer</td>
                  <td style="padding:10px;border:1px solid #e2e8f0;">${invoice.customer.name}</td>
                </tr>
                <tr>
                  <td style="padding:10px;border:1px solid #e2e8f0;background:#f8fafc;font-weight:700;">Payment Date</td>
                  <td style="padding:10px;border:1px solid #e2e8f0;">${formatDate(receipt.paymentDate)}</td>
                </tr>
                <tr>
                  <td style="padding:10px;border:1px solid #e2e8f0;background:#f8fafc;font-weight:700;">Amount Paid</td>
                  <td style="padding:10px;border:1px solid #e2e8f0;font-weight:700;color:#16a34a;">${formatCurrency(receipt.amount)}</td>
                </tr>
                <tr>
                  <td style="padding:10px;border:1px solid #e2e8f0;background:#f8fafc;font-weight:700;">Payment Method</td>
                  <td style="padding:10px;border:1px solid #e2e8f0;">${receipt.method}</td>
                </tr>
              </table>

              <table style="width:100%;border-collapse:collapse;margin-bottom:24px;">
                <thead>
                  <tr>
                    <th style="padding:10px;border:1px solid #e2e8f0;background:#f8fafc;text-align:left;">Service</th>
                    <th style="padding:10px;border:1px solid #e2e8f0;background:#f8fafc;text-align:left;">Details</th>
                    <th style="padding:10px;border:1px solid #e2e8f0;background:#f8fafc;text-align:right;">Amount</th>
                  </tr>
                </thead>
                <tbody>${serviceRows}</tbody>
              </table>

              <p style="margin:0;line-height:1.6;color:#334155;">
                This receipt confirms that payment has been received for the above invoice.
              </p>
            </div>

            <div style="background:#f1f5f9;border-top:1px solid #e2e8f0;padding:18px 28px;color:#475569;font-size:13px;line-height:1.5;">
              <strong>${companyName}</strong><br />
              ${companyAddress}<br />
              ${process.env.COMPANY_EMAIL || process.env.MAIL_FROM || ""}
            </div>
          </div>
        </div>
      `,
      attachments: [
        ...(hasLogoFile
          ? [
              {
                filename: "intern.jpg",
                path: logoPath,
                cid: "receipt-logo",
              },
            ]
          : []),
        {
          filename: `${receipt.receiptNumber}.pdf`,
          content: pdfBuffer,
          contentType: "application/pdf",
        },
      ],
    });

    res.json({ message: "Receipt email sent", receipt });
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
  sendReceiptEmail,
  deleteInvoice,
  getInvoiceStatus,
};
