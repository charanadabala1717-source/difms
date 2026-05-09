const express = require("express");
const {
  createQuote,
  getQuotes,
  getQuoteById,
  updateQuote,
  acceptQuote,
  convertQuoteToInvoice,
} = require("../controllers/quoteController");
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

router.use(protect);

router.route("/").post(createQuote).get(getQuotes);
router.post("/:id/accept", acceptQuote);
router.post("/:id/convert-to-invoice", convertQuoteToInvoice);
router.route("/:id").get(getQuoteById).put(updateQuote);

module.exports = router;
