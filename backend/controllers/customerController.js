const Customer = require("../models/Customer");
const Invoice = require("../models/Invoice");
const Payment = require("../models/Payment");
const Quote = require("../models/Quote");
const Receipt = require("../models/Receipt");

const pickCustomerFields = (body) => ({
  name: body.name,
  email: body.email,
  phone: body.phone || body.phoneNumber,
  countryCode: body.countryCode,
  phoneNumber: body.phoneNumber || body.phone,
  address: body.address,
});

const createCustomer = async (req, res) => {
  try {
    const customerFields = pickCustomerFields(req.body);

    if (!customerFields.name) {
      return res.status(400).json({ message: "Customer name is required" });
    }

    const customer = await Customer.create({
      user: req.user._id,
      ...customerFields,
    });

    res.status(201).json(customer);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getCustomers = async (req, res) => {
  try {
    const customers = await Customer.find({
      user: req.user._id,
      isDeleted: { $ne: true },
    }).sort({ createdAt: -1 });

    res.json(customers);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getCustomerById = async (req, res) => {
  try {
    const customer = await Customer.findOne({
      _id: req.params.id,
      user: req.user._id,
      isDeleted: { $ne: true },
    });

    if (!customer) {
      return res.status(404).json({ message: "Customer not found" });
    }

    res.json(customer);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const updateCustomer = async (req, res) => {
  try {
    const customer = await Customer.findOneAndUpdate(
      { _id: req.params.id, user: req.user._id, isDeleted: { $ne: true } },
      pickCustomerFields(req.body),
      { new: true, runValidators: true }
    );

    if (!customer) {
      return res.status(404).json({ message: "Customer not found" });
    }

    res.json(customer);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const deleteCustomer = async (req, res) => {
  try {
    const customer = await Customer.findOneAndUpdate(
      {
        _id: req.params.id,
        user: req.user._id,
        isDeleted: { $ne: true },
      },
      {
        isDeleted: true,
        deletedAt: new Date(),
      },
      { new: true }
    );

    if (!customer) {
      return res.status(404).json({ message: "Customer not found" });
    }

    const softDelete = {
      isDeleted: true,
      deletedAt: new Date(),
    };

    await Promise.all([
      Receipt.updateMany({ customer: customer._id, user: req.user._id }, softDelete),
      Payment.updateMany({ customer: customer._id, user: req.user._id }, softDelete),
      Invoice.updateMany({ customer: customer._id, user: req.user._id }, softDelete),
      Quote.updateMany({ customer: customer._id, user: req.user._id }, softDelete),
    ]);

    res.json({ message: "Customer and related records deleted" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  createCustomer,
  getCustomers,
  getCustomerById,
  updateCustomer,
  deleteCustomer,
};
