const express = require("express");
const {
  registerUser,
  loginUser,
  getMe,
  updateMe,
  promoteSuperAdmin,
} = require("../controllers/authController");
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

router.post("/register", registerUser);
router.post("/login", loginUser);
router.get("/me", protect, getMe);
router.patch("/me", protect, updateMe);
router.post("/promote-super-admin", protect, promoteSuperAdmin);

module.exports = router;
