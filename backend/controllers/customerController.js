const Customer = require("../models/Customer");
const Invoice = require("../models/Invoice");
const Payment = require("../models/Payment");
const Quote = require("../models/Quote");
const Receipt = require("../models/Receipt");
const OrganizationMember = require("../models/OrganizationMember");

const platformOwnerEmail = () => process.env.SUPER_ADMIN_CREATOR_EMAIL;
const isPlatformOwner = (user) => platformOwnerEmail() && user.email === platformOwnerEmail();
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const pickCustomerFields = (body) => ({
  name: body.name?.trim(),
  email: body.email?.trim().toLowerCase(),
  phone: (body.phone || body.phoneNumber)?.trim(),
  countryCode: body.countryCode?.trim(),
  phoneNumber: (body.phoneNumber || body.phone)?.trim(),
  address: body.address?.trim(),
});

const validateCustomerFields = (customerFields) => {
  if (!customerFields.name) {
    return "Customer name is required";
  }

  if (!customerFields.email) {
    return "Customer email is required";
  }

  if (!emailPattern.test(customerFields.email)) {
    return "Please enter a valid customer email";
  }

  if (!customerFields.phoneNumber) {
    return "Customer phone number is required";
  }

  if (!customerFields.address) {
    return "Customer address is required";
  }

  return "";
};

const findDuplicateCustomer = (email, organizationIds, excludedCustomerId) => {
  const query = {
    organization: { $in: organizationIds },
    email: new RegExp(`^${escapeRegex(email)}$`, "i"),
    isDeleted: { $ne: true },
  };

  if (excludedCustomerId) {
    query._id = { $ne: excludedCustomerId };
  }

  return Customer.findOne(query).populate("organization", "name");
};

const createCustomer = async (req, res) => {
  try {
    const customerFields = pickCustomerFields(req.body);

    const validationMessage = validateCustomerFields(customerFields);

    if (validationMessage) {
      return res.status(400).json({ message: validationMessage });
    }

    if (!req.organization?._id) {
      return res.status(400).json({ message: "Active company is required to create a customer" });
    }

    const organizationIds = [req.organization._id];

    if (!isPlatformOwner(req.user)) {
      const memberships = await OrganizationMember.find({
        user: req.user._id,
        organization: { $in: organizationIds },
        status: "active",
      }).select("organization");

      if (memberships.length !== organizationIds.length) {
        return res.status(403).json({ message: "You do not have access to one or more selected companies" });
      }
    }

    const duplicateCustomer = await findDuplicateCustomer(customerFields.email, organizationIds);

    if (duplicateCustomer) {
      const companyName = duplicateCustomer.organization?.name || "the selected company";
      return res.status(400).json({
        message: `A customer already exists with this email in ${companyName}`,
      });
    }

    const customers = await Customer.insertMany(
      organizationIds.map((organizationId) => ({
        user: req.user._id,
        organization: organizationId,
        ...customerFields,
      }))
    );

    res.status(201).json(customers.length === 1 ? customers[0] : customers);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getCustomers = async (req, res) => {
  try {
    const customers = await Customer.find({
      organization: req.organization._id,
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
      organization: req.organization._id,
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
    const customerFields = pickCustomerFields(req.body);
    const validationMessage = validateCustomerFields(customerFields);

    if (validationMessage) {
      return res.status(400).json({ message: validationMessage });
    }

    const duplicateCustomer = await findDuplicateCustomer(
      customerFields.email,
      [req.organization._id],
      req.params.id
    );

    if (duplicateCustomer) {
      return res.status(400).json({
        message: "A customer already exists with this email in this company",
      });
    }

    const customer = await Customer.findOneAndUpdate(
      { _id: req.params.id, organization: req.organization._id, isDeleted: { $ne: true } },
      customerFields,
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
        organization: req.organization._id,
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
      Receipt.updateMany({ customer: customer._id, organization: req.organization._id }, softDelete),
      Payment.updateMany({ customer: customer._id, organization: req.organization._id }, softDelete),
      Invoice.updateMany({ customer: customer._id, organization: req.organization._id }, softDelete),
      Quote.updateMany({ customer: customer._id, organization: req.organization._id }, softDelete),
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
