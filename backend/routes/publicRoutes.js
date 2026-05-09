const express = require("express");
const {
  acceptPublicQuote,
  declinePublicQuote,
  manualPaymentSuccess,
  openPayment,
  stripePaymentSuccess,
} = require("../controllers/publicController");

const router = express.Router();

router.get("/quotes/:token/accept", acceptPublicQuote);
router.get("/quotes/:token/decline", declinePublicQuote);
router.get("/invoices/:token/pay", openPayment);
router.post("/invoices/:token/pay/manual", manualPaymentSuccess);
router.get("/invoices/:token/payment-success", stripePaymentSuccess);

module.exports = router;
