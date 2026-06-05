const mongoose = require("mongoose");

const organizationMemberSchema = new mongoose.Schema(
  {
    organization: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    role: {
      type: String,
      enum: ["owner", "admin", "staff"],
      default: "staff",
    },
    status: {
      type: String,
      enum: ["active", "invited", "disabled"],
      default: "active",
    },
    invitedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    invitedAt: {
      type: Date,
    },
    joinedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

organizationMemberSchema.index({ organization: 1, user: 1 }, { unique: true });

module.exports = mongoose.model("OrganizationMember", organizationMemberSchema);
