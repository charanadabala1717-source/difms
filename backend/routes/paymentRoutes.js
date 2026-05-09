const express = require("express");
const {
  recordPayment,
  getPayments,
  getPaymentsByInvoice,
  getReceiptById,
  getReceiptByPayment,
} = require("../controllers/paymentController");
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

router.use(protect);

router.route("/").post(recordPayment).get(getPayments);
router.get("/invoice/:invoiceId", getPaymentsByInvoice);
router.get("/receipts/payment/:paymentId", getReceiptByPayment);
router.get("/receipts/:id", getReceiptById);

module.exports = router;
