const express = require("express");
const {
  createInvoice,
  getInvoices,
  getInvoiceById,
  updateInvoice,
  sendInvoice,
  sendReceiptEmail,
  downloadReceiptPdf,
  deleteInvoice,
} = require("../controllers/invoiceController");
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

router.use(protect);

router.route("/").post(createInvoice).get(getInvoices);
router.post("/:id/send", sendInvoice);
router.post("/:id/send-receipt", sendReceiptEmail);
router.get("/:id/receipt-pdf", downloadReceiptPdf);
router.route("/:id").get(getInvoiceById).put(updateInvoice).delete(deleteInvoice);

module.exports = router;
