const Stripe = require("stripe");
const Invoice = require("../models/Invoice");
const Quote = require("../models/Quote");
const {
  formatCurrency,
  getClientBaseUrl,
} = require("../utils/flowHelpers");
const { convertAmount, DEFAULT_STRIPE_FALLBACK_CURRENCY } = require("../utils/exchangeRates");
const { recordInvoicePayment } = require("../utils/paymentHelpers");
const { isStripeCurrencyError, toStripeAmount } = require("../utils/stripeCurrency");

const renderMessage = (title, message) => {
  return `
    <!doctype html>
    <html>
      <head>
        <title>${title}</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <style>
          body { font-family: Arial, sans-serif; background: #0f172a; color: white; margin: 0; padding: 40px; }
          .box { max-width: 640px; margin: 0 auto; background: #1e293b; border: 1px solid #334155; border-radius: 12px; padding: 28px; }
          a, button { display: inline-block; border: 0; border-radius: 8px; background: #2563eb; color: white; padding: 12px 18px; text-decoration: none; cursor: pointer; }
          p { color: #cbd5e1; line-height: 1.5; }
        </style>
      </head>
      <body>
        <div class="box">
          <h1>${title}</h1>
          <p>${message}</p>
        </div>
      </body>
    </html>
  `;
};

const findQuoteByToken = async (token) => {
  return Quote.findOne({
    actionToken: token,
    actionTokenExpires: { $gt: new Date() },
    isDeleted: { $ne: true },
  }).populate("customer");
};

const acceptPublicQuote = async (req, res) => {
  try {
    const quote = await findQuoteByToken(req.params.token);

    if (!quote || !quote.customer) {
      return res.status(404).send(renderMessage("Quote not found", "This quote link is invalid or expired."));
    }

    if (quote.status === "rejected") {
      return res.status(400).send(renderMessage("Quote declined", "This quote has already been declined."));
    }

    if (quote.status === "converted" || quote.acceptedAt) {
      return res
        .status(400)
        .send(renderMessage("Quote already accepted", "This quote has already been accepted and cannot be accepted again."));
    }

    if (quote.status === "expired") {
      return res.status(400).send(renderMessage("Quote expired", "This quote has expired and can no longer be accepted."));
    }

    quote.status = "accepted";
    quote.acceptedAt = new Date();
    await quote.save();

    return res.send(
      renderMessage(
        "Quote accepted",
        `Thank you. Your quote has been accepted for ${formatCurrency(quote.total, quote.currency)}. The company will prepare your invoice next.`
      )
    );
  } catch (error) {
    res.status(500).send(renderMessage("Something went wrong", error.message));
  }
};

const declinePublicQuote = async (req, res) => {
  try {
    const quote = await findQuoteByToken(req.params.token);

    if (!quote || !quote.customer) {
      return res.status(404).send(renderMessage("Quote not found", "This quote link is invalid or expired."));
    }

    if (quote.status === "converted" || quote.acceptedAt) {
      return res
        .status(400)
        .send(renderMessage("Quote already accepted", "This quote has already been accepted and cannot be declined now."));
    }

    if (quote.status === "rejected" || quote.declinedAt) {
      return res
        .status(400)
        .send(renderMessage("Quote already declined", "This quote has already been declined."));
    }

    if (quote.status === "expired") {
      return res.status(400).send(renderMessage("Quote expired", "This quote has expired and can no longer be declined."));
    }

    quote.status = "rejected";
    quote.declinedAt = new Date();
    await quote.save();

    return res.send(renderMessage("Quote declined", "Thank you. The quote has been marked as declined."));
  } catch (error) {
    res.status(500).send(renderMessage("Something went wrong", error.message));
  }
};

const openPayment = async (req, res) => {
  try {
    const invoice = await Invoice.findOne({
      paymentToken: req.params.token,
      status: { $ne: "cancelled" },
      isDeleted: { $ne: true },
    }).populate("customer");

    if (!invoice || !invoice.customer) {
      return res.status(404).send(renderMessage("Invoice not found", "This payment link is invalid."));
    }

    if (invoice.balanceDue <= 0 || invoice.status === "paid") {
      return res.send(renderMessage("Invoice already paid", "This invoice has already been paid."));
    }

    if (process.env.STRIPE_SECRET_KEY) {
      const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
      const apiUrl = process.env.API_URL || `http://localhost:${process.env.PORT || 5000}`;

      const createCheckoutSession = (checkoutCurrency, checkoutAmount, conversion = null) => {
        const originalCurrency = String(invoice.currency || "GBP").toUpperCase();
        const chargedCurrency = String(checkoutCurrency || originalCurrency).toUpperCase();
        const convertedMessage = conversion
          ? ` Payment will be processed as ${formatCurrency(conversion.convertedAmount, chargedCurrency)} using exchange rate 1 ${conversion.from} = ${conversion.rate} ${conversion.to}.`
          : "";

        return stripe.checkout.sessions.create({
        mode: "payment",
        payment_method_types: ["card"],
        line_items: [
          {
            quantity: 1,
            price_data: {
                currency: chargedCurrency.toLowerCase(),
                unit_amount: toStripeAmount(checkoutAmount, chargedCurrency),
              product_data: {
                name: `Invoice ${invoice.invoiceNumber}`,
                  description: `Invoice amount: ${formatCurrency(invoice.balanceDue, originalCurrency)}.${convertedMessage}`,
              },
            },
          },
        ],
        metadata: {
          invoiceId: String(invoice._id),
          paymentToken: invoice.paymentToken,
            invoiceCurrency: originalCurrency,
            invoiceAmount: String(invoice.balanceDue),
            processorCurrency: chargedCurrency,
            processorAmount: String(checkoutAmount),
            exchangeRate: conversion ? String(conversion.rate) : "",
            exchangeRateProvider: conversion?.provider || "",
            exchangeRateFrom: conversion?.from || "",
            exchangeRateTo: conversion?.to || "",
            exchangeRateDate: conversion?.convertedAt ? conversion.convertedAt.toISOString() : "",
        },
        success_url: `${apiUrl}/api/public/invoices/${invoice.paymentToken}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${apiUrl}/api/public/invoices/${invoice.paymentToken}/pay`,
      });
      };

      try {
        const session = await createCheckoutSession(invoice.currency || "GBP", invoice.balanceDue);
        return res.redirect(303, session.url);
      } catch (error) {
        if (!isStripeCurrencyError(error)) {
          throw error;
        }

        const conversion = await convertAmount(
          invoice.balanceDue,
          invoice.currency,
          process.env.STRIPE_FALLBACK_CURRENCY || DEFAULT_STRIPE_FALLBACK_CURRENCY
        );

        const session = await createCheckoutSession(
          conversion.to,
          conversion.convertedAmount,
          conversion
        );

        return res.redirect(303, session.url);
      }
    }

    return res.send(`
      <!doctype html>
      <html>
        <head>
          <title>Pay invoice ${invoice.invoiceNumber}</title>
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <style>
            body { font-family: Arial, sans-serif; background: #0f172a; color: white; margin: 0; padding: 40px; }
            .box { max-width: 640px; margin: 0 auto; background: #1e293b; border: 1px solid #334155; border-radius: 12px; padding: 28px; }
            button { border: 0; border-radius: 8px; background: #16a34a; color: white; padding: 12px 18px; cursor: pointer; }
            p { color: #cbd5e1; line-height: 1.5; }
          </style>
        </head>
        <body>
          <div class="box">
            <h1>Invoice ${invoice.invoiceNumber}</h1>
            <p>Customer: ${invoice.customer.name}</p>
            <p>Amount due: ${formatCurrency(invoice.balanceDue, invoice.currency)}</p>
            <p>Stripe is not configured yet, so this development page simulates a successful payment.</p>
            <form method="POST" action="/api/public/invoices/${invoice.paymentToken}/pay/manual">
              <button type="submit">Mark as Paid</button>
            </form>
          </div>
        </body>
      </html>
    `);
  } catch (error) {
    res.status(500).send(renderMessage("Something went wrong", error.message));
  }
};

const manualPaymentSuccess = async (req, res) => {
  try {
    const invoice = await Invoice.findOne({
      paymentToken: req.params.token,
      status: { $ne: "cancelled" },
      isDeleted: { $ne: true },
    });

    if (!invoice) {
      return res.status(404).send(renderMessage("Invoice not found", "This payment link is invalid."));
    }

    if (invoice.balanceDue > 0) {
      await recordInvoicePayment({
        invoice,
        amount: invoice.balanceDue,
        method: "other",
        referenceNumber: `MANUAL-${Date.now()}`,
        notes: "Development fallback payment",
      });
    }

    res.send(renderMessage("Payment complete", "Payment was recorded and a receipt was generated."));
  } catch (error) {
    res.status(500).send(renderMessage("Something went wrong", error.message));
  }
};

const stripePaymentSuccess = async (req, res) => {
  try {
    const invoice = await Invoice.findOne({
      paymentToken: req.params.token,
      status: { $ne: "cancelled" },
      isDeleted: { $ne: true },
    });

    if (!invoice) {
      return res.status(404).send(renderMessage("Invoice not found", "This payment link is invalid."));
    }

    if (!process.env.STRIPE_SECRET_KEY) {
      return res.redirect(303, `/api/public/invoices/${req.params.token}/pay/manual`);
    }

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    const session = await stripe.checkout.sessions.retrieve(req.query.session_id);

    if (session.payment_status !== "paid") {
      return res.status(400).send(renderMessage("Payment not completed", "Stripe has not marked this payment as paid."));
    }

    if (invoice.balanceDue > 0) {
      const exchangeRate = Number(session.metadata?.exchangeRate) || undefined;
      const processorAmount = Number(session.metadata?.processorAmount) || undefined;
      const processorCurrency = session.metadata?.processorCurrency || session.currency;
      const conversionNote = exchangeRate
        ? `Stripe Checkout payment. Invoice ${formatCurrency(invoice.balanceDue, invoice.currency)} was processed as ${formatCurrency(processorAmount, processorCurrency)}.`
        : "Stripe Checkout payment";

      await recordInvoicePayment({
        invoice,
        amount: invoice.balanceDue,
        method: "card",
        referenceNumber: session.payment_intent,
        processorCurrency,
        processorAmount,
        exchangeRate,
        exchangeRateProvider: session.metadata?.exchangeRateProvider,
        exchangeRateFrom: session.metadata?.exchangeRateFrom,
        exchangeRateTo: session.metadata?.exchangeRateTo,
        exchangeRateDate: session.metadata?.exchangeRateDate
          ? new Date(session.metadata.exchangeRateDate)
          : undefined,
        notes: conversionNote,
      });
    }

    res.send(renderMessage("Payment complete", "Payment was recorded and a receipt was generated."));
  } catch (error) {
    res.status(500).send(renderMessage("Something went wrong", error.message));
  }
};

module.exports = {
  acceptPublicQuote,
  declinePublicQuote,
  manualPaymentSuccess,
  openPayment,
  stripePaymentSuccess,
};
