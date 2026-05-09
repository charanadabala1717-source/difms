const express = require("express");
const {
  createCustomer,
  getCustomers,
  getCustomerById,
  updateCustomer,
  deleteCustomer,
  sendCustomerQuoteEmail,
} = require("../controllers/customerController");
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

router.use(protect);

router.route("/").post(createCustomer).get(getCustomers);
router.post("/:id/send-quote", sendCustomerQuoteEmail);
router.route("/:id").get(getCustomerById).put(updateCustomer).delete(deleteCustomer);

module.exports = router;
