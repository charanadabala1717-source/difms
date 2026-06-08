const express = require("express");
const {
  createQuote,
  getQuotes,
  getQuoteById,
  updateQuote,
  acceptQuote,
  sendQuote,
  convertQuoteToInvoice,
} = require("../controllers/quoteController");
const { protect, requireWorkspaceWriteAccess } = require("../middleware/authMiddleware");

const router = express.Router();

router.use(protect);

router.route("/").post(requireWorkspaceWriteAccess, createQuote).get(getQuotes);
router.post("/:id/send", requireWorkspaceWriteAccess, sendQuote);
router.post("/:id/accept", requireWorkspaceWriteAccess, acceptQuote);
router.post("/:id/convert-to-invoice", requireWorkspaceWriteAccess, convertQuoteToInvoice);
router.route("/:id").get(getQuoteById).put(requireWorkspaceWriteAccess, updateQuote);

module.exports = router;
