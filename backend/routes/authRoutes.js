const express = require("express");
const {
  registerUser,
  loginUser,
  forgotPassword,
  resetPassword,
  getMe,
  updateMe,
  changePassword,
  promoteSuperAdmin,
  getRegistrationOrganizations,
} = require("../controllers/authController");
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

router.post("/register", registerUser);
router.post("/login", loginUser);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);
router.get("/organizations", getRegistrationOrganizations);
router.get("/me", protect, getMe);
router.patch("/me", protect, updateMe);
router.patch("/change-password", protect, changePassword);
router.post("/promote-super-admin", protect, promoteSuperAdmin);

module.exports = router;
