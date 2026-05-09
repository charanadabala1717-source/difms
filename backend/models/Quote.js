const mongoose = require("mongoose");

const itemSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    description: { type: String },
    quantity: { type: Number, required: true, min: 1 },
    price: { type: Number, required: true, min: 0 },
    total: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const quoteSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Customer",
      required: true,
    },
    quoteNumber: {
      type: String,
      required: true,
      unique: true,
    },
    items: {
      type: [itemSchema],
      required: true,
    },
    subtotal: {
      type: Number,
      required: true,
      min: 0,
    },
    tax: {
      type: Number,
      default: 0,
      min: 0,
    },
    discount: {
      type: Number,
      default: 0,
      min: 0,
    },
    total: {
      type: Number,
      required: true,
      min: 0,
    },
    status: {
      type: String,
      enum: ["draft", "sent", "accepted", "rejected", "expired", "converted"],
      default: "draft",
    },
    validUntil: {
      type: Date,
    },
    notes: {
      type: String,
    },
    actionToken: {
      type: String,
      unique: true,
      sparse: true,
    },
    actionTokenExpires: {
      type: Date,
    },
    acceptedAt: {
      type: Date,
    },
    declinedAt: {
      type: Date,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Quote", quoteSchema);
