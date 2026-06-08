const express = require("express");
const {
  createCustomer,
  getCustomers,
  getCustomerById,
  updateCustomer,
  deleteCustomer,
} = require("../controllers/customerController");
const { protect, requireWorkspaceWriteAccess } = require("../middleware/authMiddleware");

const router = express.Router();

router.use(protect);

router.route("/").post(requireWorkspaceWriteAccess, createCustomer).get(getCustomers);
router
  .route("/:id")
  .get(getCustomerById)
  .put(requireWorkspaceWriteAccess, updateCustomer)
  .delete(requireWorkspaceWriteAccess, deleteCustomer);

module.exports = router;
