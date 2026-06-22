const mongoose = require("mongoose");

const paymentSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    organization: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
      index: true,
    },
    invoice: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Invoice",
      required: true,
    },
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Customer",
      required: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    paymentDate: {
      type: Date,
      default: Date.now,
    },
    method: {
      type: String,
      enum: ["cash", "card", "bank_transfer", "upi", "cheque", "other"],
      default: "cash",
    },
    referenceNumber: {
      type: String,
      trim: true,
    },
    processorCurrency: {
      type: String,
      uppercase: true,
      trim: true,
    },
    processorAmount: {
      type: Number,
      min: 0,
    },
    exchangeRate: {
      type: Number,
      min: 0,
    },
    exchangeRateProvider: {
      type: String,
      trim: true,
    },
    exchangeRateFrom: {
      type: String,
      uppercase: true,
      trim: true,
    },
    exchangeRateTo: {
      type: String,
      uppercase: true,
      trim: true,
    },
    exchangeRateDate: {
      type: Date,
    },
    notes: {
      type: String,
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

module.exports = mongoose.model("Payment", paymentSchema);
