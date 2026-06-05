const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const connectDB = require("./config/db");

dotenv.config();

const app = express();

app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:3000",
    credentials: true,
  })
);
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

app.get("/", (req, res) => {
  res.send("Invoice backend is running");
});

app.use("/api/auth", require("./routes/authRoutes"));
app.use("/api/admin", require("./routes/adminRoutes"));
app.use("/api/customers", require("./routes/customerRoutes"));
app.use("/api/quotes", require("./routes/quoteRoutes"));
app.use("/api/invoices", require("./routes/invoiceRoutes"));
app.use("/api/payments", require("./routes/paymentRoutes"));
app.use("/api/receipts", require("./routes/receiptRoutes"));
app.use("/api/public", require("./routes/publicRoutes"));

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    await connectDB();
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error("Server startup failed:", error.message);
    process.exit(1);
  }
};

startServer();
