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
const { protect, requireWorkspaceWriteAccess } = require("../middleware/authMiddleware");

const router = express.Router();

router.use(protect);

router.route("/").post(requireWorkspaceWriteAccess, createInvoice).get(getInvoices);
router.post("/:id/send", requireWorkspaceWriteAccess, sendInvoice);
router.post("/:id/send-receipt", requireWorkspaceWriteAccess, sendReceiptEmail);
router.get("/:id/document-pdf", downloadInvoiceDocumentPdf);
router.get("/:id/receipt-pdf", downloadInvoiceDocumentPdf);
router
  .route("/:id")
  .get(getInvoiceById)
  .put(requireWorkspaceWriteAccess, updateInvoice)
  .delete(requireWorkspaceWriteAccess, deleteInvoice);

module.exports = router;
