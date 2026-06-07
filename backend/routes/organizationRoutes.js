const express = require("express");
const {
  getMembersAndInvitations,
  inviteUser,
  searchUsers,
} = require("../controllers/organizationController");
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

router.use(protect);

router.get("/members", getMembersAndInvitations);
router.get("/users/search", searchUsers);
router.post("/invitations", inviteUser);

module.exports = router;
