const mongoose = require("mongoose");

const customerSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      trim: true,
    },
    phone: {
      type: String,
      trim: true,
    },
    countryCode: {
      type: String,
      trim: true,
      default: "+44",
    },
    phoneNumber: {
      type: String,
      trim: true,
    },
    totalAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    service: {
      type: String,
      trim: true,
    },
    status: {
      type: String,
      enum: ["Paid", "Unpaid", "Pending"],
      default: "Pending",
    },
    address: {
      type: String,
      trim: true,
    },
    companyName: {
      type: String,
      trim: true,
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
    deletedAt: {
      type: Date,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Customer", customerSchema);
