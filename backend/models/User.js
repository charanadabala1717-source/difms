const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: true,
    },
    role: {
      type: String,
      enum: ["super_admin", "admin", "user"],
      default: "user",
    },
    currency: {
      type: String,
      default: "GBP",
      uppercase: true,
      trim: true,
    },
    mustChangePassword: {
      type: Boolean,
      default: false,
    },
    temporaryPasswordExpiresAt: {
      type: Date,
    },
    passwordResetToken: {
      type: String,
    },
    passwordResetExpiresAt: {
      type: Date,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", userSchema);
