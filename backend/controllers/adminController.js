const Customer = require("../models/Customer");
const Invoice = require("../models/Invoice");
const Organization = require("../models/Organization");
const OrganizationMember = require("../models/OrganizationMember");
const Payment = require("../models/Payment");
const Quote = require("../models/Quote");
const Receipt = require("../models/Receipt");
const { normalizeCurrency } = require("../utils/currency");
const { createUniqueSlug } = require("../utils/organization");

const allowedStatuses = ["active", "inactive", "suspended"];
const platformOwnerEmail = () => process.env.SUPER_ADMIN_CREATOR_EMAIL;
const isPlatformOwner = (user) => platformOwnerEmail() && user.email === platformOwnerEmail();

const getAccessibleOrganizationIds = async (userId) => {
  const memberships = await OrganizationMember.find({
    user: userId,
    status: "active",
  }).select("organization");

  return memberships.map((membership) => membership.organization);
};

const ensureOrganizationAccess = async (userId, organizationId) => {
  return OrganizationMember.exists({
    user: userId,
    organization: organizationId,
    status: "active",
  });
};

const serializeOrganizationRow = async (organization) => {
  const [membersCount, customersCount, quotesCount, invoicesCount, ownerMembership] =
    await Promise.all([
      OrganizationMember.countDocuments({
        organization: organization._id,
        status: "active",
      }),
      Customer.countDocuments({
        organization: organization._id,
        isDeleted: { $ne: true },
      }),
      Quote.countDocuments({
        organization: organization._id,
        isDeleted: { $ne: true },
      }),
      Invoice.countDocuments({
        organization: organization._id,
        isDeleted: { $ne: true },
      }),
      OrganizationMember.findOne({
        organization: organization._id,
        role: "owner",
      }).populate("user", "name email"),
    ]);

  return {
    _id: organization._id,
    name: organization.name,
    slug: organization.slug,
    email: organization.email,
    phone: organization.phone,
    address: organization.address,
    currency: organization.currency,
    status: organization.status,
    createdAt: organization.createdAt,
    owner: ownerMembership?.user
      ? {
          name: ownerMembership.user.name,
          email: ownerMembership.user.email,
        }
      : null,
    counts: {
      members: membersCount,
      customers: customersCount,
      quotes: quotesCount,
      invoices: invoicesCount,
    },
  };
};

const getOrganizations = async (req, res) => {
  try {
    const organizationQuery = {};

    if (!isPlatformOwner(req.user)) {
      const organizationIds = await getAccessibleOrganizationIds(req.user._id);
      organizationQuery._id = { $in: organizationIds };
    }

    const organizations = await Organization.find(organizationQuery).sort({ createdAt: -1 });
    const rows = await Promise.all(organizations.map(serializeOrganizationRow));

    res.json(rows);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const createOrganization = async (req, res) => {
  try {
    const { name, email, phone, address, currency, status } = req.body;

    if (!name?.trim()) {
      return res.status(400).json({ message: "Company name is required" });
    }

    if (status && !allowedStatuses.includes(status)) {
      return res.status(400).json({ message: "Invalid organization status" });
    }

    const organization = await Organization.create({
      name: name.trim(),
      slug: await createUniqueSlug(name),
      email: email?.trim(),
      phone: phone?.trim(),
      address: address?.trim(),
      currency: normalizeCurrency(currency),
      status: status || "active",
      createdBy: req.user._id,
    });

    await OrganizationMember.create({
      organization: organization._id,
      user: req.user._id,
      role: "owner",
      status: "active",
    });

    res.status(201).json(await serializeOrganizationRow(organization));
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const updateOrganization = async (req, res) => {
  try {
    const hasAccess = isPlatformOwner(req.user) || (await ensureOrganizationAccess(req.user._id, req.params.id));

    if (!hasAccess) {
      return res.status(403).json({ message: "You do not have access to this company" });
    }

    const updates = {};

    if (req.body.name !== undefined) {
      if (!req.body.name?.trim()) {
        return res.status(400).json({ message: "Company name is required" });
      }
      updates.name = req.body.name.trim();
    }

    if (req.body.email !== undefined) {
      updates.email = req.body.email?.trim();
    }

    if (req.body.phone !== undefined) {
      updates.phone = req.body.phone?.trim();
    }

    if (req.body.address !== undefined) {
      updates.address = req.body.address?.trim();
    }

    if (req.body.status) {
      if (!allowedStatuses.includes(req.body.status)) {
        return res.status(400).json({ message: "Invalid organization status" });
      }
      updates.status = req.body.status;
    }

    if (req.body.currency) {
      updates.currency = normalizeCurrency(req.body.currency);
    }

    const organization = await Organization.findByIdAndUpdate(req.params.id, updates, {
      new: true,
      runValidators: true,
    });

    if (!organization) {
      return res.status(404).json({ message: "Organization not found" });
    }

    res.json(await serializeOrganizationRow(organization));
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const deleteOrganization = async (req, res) => {
  try {
    const hasAccess = isPlatformOwner(req.user) || (await ensureOrganizationAccess(req.user._id, req.params.id));

    if (!hasAccess) {
      return res.status(403).json({ message: "You do not have access to this company" });
    }

    const organization = await Organization.findById(req.params.id);

    if (!organization) {
      return res.status(404).json({ message: "Organization not found" });
    }

    await Promise.all([
      Customer.deleteMany({ organization: organization._id }),
      Quote.deleteMany({ organization: organization._id }),
      Invoice.deleteMany({ organization: organization._id }),
      Payment.deleteMany({ organization: organization._id }),
      Receipt.deleteMany({ organization: organization._id }),
      OrganizationMember.deleteMany({ organization: organization._id }),
    ]);

    await Organization.deleteOne({ _id: organization._id });

    res.json({ message: "Company removed successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getOrganizations,
  createOrganization,
  updateOrganization,
  deleteOrganization,
};
