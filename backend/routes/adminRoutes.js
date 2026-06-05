const express = require("express");
const {
  getOrganizations,
  createOrganization,
  updateOrganization,
  deleteOrganization,
} = require("../controllers/adminController");
const { protect, requireSuperAdmin } = require("../middleware/authMiddleware");

const router = express.Router();

router.use(protect, requireSuperAdmin);

router.get("/organizations", getOrganizations);
router.post("/organizations", createOrganization);
router.patch("/organizations/:id", updateOrganization);
router.delete("/organizations/:id", deleteOrganization);

module.exports = router;
