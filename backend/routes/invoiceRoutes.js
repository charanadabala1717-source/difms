const express = require("express");
const {
  createInvoice,
  getInvoices,
  getInvoiceById,
  updateInvoice,
  sendInvoice,
  sendReceiptEmail,
  downloadInvoiceDocumentPdf,
  deleteInvoice,
} = require("../controllers/invoiceController");
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

router.use(protect);

router.route("/").post(createInvoice).get(getInvoices);
router.post("/:id/send", sendInvoice);
router.post("/:id/send-receipt", sendReceiptEmail);
router.get("/:id/document-pdf", downloadInvoiceDocumentPdf);
router.get("/:id/receipt-pdf", downloadInvoiceDocumentPdf);
router.route("/:id").get(getInvoiceById).put(updateInvoice).delete(deleteInvoice);

module.exports = router;
