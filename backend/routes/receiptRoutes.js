const express = require("express");
const {
  getReceiptById,
  getReceiptByPayment,
} = require("../controllers/paymentController");
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

router.use(protect);

router.get("/payment/:paymentId", getReceiptByPayment);
router.get("/:id", getReceiptById);

module.exports = router;
