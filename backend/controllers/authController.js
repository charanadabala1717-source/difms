const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const Organization = require("../models/Organization");
const OrganizationMember = require("../models/OrganizationMember");
const { normalizeCurrency } = require("../utils/currency");
const {
  createOrganizationForUser,
  getActiveMembershipForUser,
  listOrganizationsForUser,
  serializeOrganization,
} = require("../utils/organization");

const SUPER_ADMIN_CREATOR_EMAIL = process.env.SUPER_ADMIN_CREATOR_EMAIL;
const isSuperAdminCreator = (user) =>
  SUPER_ADMIN_CREATOR_EMAIL && user.email === SUPER_ADMIN_CREATOR_EMAIL;

const generateToken = (userId) => {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: "30d",
  });
};

const buildAuthResponse = async (user, token) => {
  let membership = await getActiveMembershipForUser(user._id);

  if (!membership && user.role !== "super_admin") {
    const created = await createOrganizationForUser({
      user,
      companyName: `${user.name}'s Company`,
      currency: user.currency,
    });
    membership = await getActiveMembershipForUser(created.membership.user);
  }

  const organizations = await listOrganizationsForUser(user._id);
  const activeOrganization = membership?.organization
    ? serializeOrganization(membership.organization, membership)
    : null;

  return {
    _id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    currency: user.currency,
    organizations,
    activeOrganization,
    token,
  };
};

const registerUser = async (req, res) => {
  try {
    const { name, email, password, organizationId, currency } = req.body;

    if (!name || !email || !password || !organizationId) {
      return res.status(400).json({ message: "Name, email, password, and company are required" });
    }

    if (password.length < 6) {
      return res.status(400).json({ message: "Password must be at least 6 characters" });
    }

    const existingUser = await User.findOne({ email });

    if (existingUser) {
      return res.status(400).json({ message: "User already exists with this email" });
    }

    const organization = await Organization.findOne({
      _id: organizationId,
      status: "active",
    });

    if (!organization) {
      return res.status(404).json({ message: "Selected company was not found" });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      currency: normalizeCurrency(currency),
    });

    await OrganizationMember.create({
      organization: organization._id,
      user: user._id,
      role: "staff",
      status: "active",
    });

    res.status(201).json(await buildAuthResponse(user, generateToken(user._id)));
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const passwordMatches = await bcrypt.compare(password, user.password);

    if (!passwordMatches) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    res.json(await buildAuthResponse(user, generateToken(user._id)));
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getMe = async (req, res) => {
  const organizations = await listOrganizationsForUser(req.user._id);
  res.json({
    _id: req.user._id,
    name: req.user.name,
    email: req.user.email,
    role: req.user.role,
    currency: req.user.currency,
    organizations,
    activeOrganization: req.organization
      ? serializeOrganization(req.organization, req.membership)
      : null,
  });
};

const getRegistrationOrganizations = async (req, res) => {
  try {
    const organizations = await Organization.find({ status: "active" })
      .select("name")
      .sort({ name: 1 });

    res.json(organizations);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const updateMe = async (req, res) => {
  try {
    if (req.body.currency) {
      req.user.currency = normalizeCurrency(req.body.currency);
    }

    const user = await req.user.save();
    if (req.organization && req.body.currency && ["owner", "admin"].includes(req.membership?.role)) {
      req.organization.currency = normalizeCurrency(req.body.currency);
      await req.organization.save();
    }

    const organizations = await listOrganizationsForUser(user._id);
    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      currency: user.currency,
      organizations,
      activeOrganization: req.organization
        ? serializeOrganization(req.organization, req.membership)
        : null,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const promoteSuperAdmin = async (req, res) => {
  try {
    if (!isSuperAdminCreator(req.user)) {
      return res.status(403).json({
        message: "Only the platform owner can create super admins",
      });
    }

    const email = req.body.email?.trim().toLowerCase();
    const organizationIds = Array.isArray(req.body.organizationIds)
      ? req.body.organizationIds.filter(Boolean)
      : [];

    if (!email) {
      return res.status(400).json({ message: "User email is required" });
    }

    if (organizationIds.length === 0) {
      return res.status(400).json({ message: "At least one company must be selected" });
    }

    if (!isSuperAdminCreator(req.user)) {
      const creatorMemberships = await OrganizationMember.find({
        user: req.user._id,
        organization: { $in: organizationIds },
        status: "active",
      }).select("organization");

      if (creatorMemberships.length !== organizationIds.length) {
        return res.status(403).json({
          message: "You do not have access to one or more selected companies",
        });
      }
    }

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({
        message: "User not found. Please register the user before promoting them.",
      });
    }

    user.role = "super_admin";
    await user.save();

    await Promise.all(
      organizationIds.map((organizationId) =>
        OrganizationMember.findOneAndUpdate(
          {
            organization: organizationId,
            user: user._id,
          },
          {
            organization: organizationId,
            user: user._id,
            role: "admin",
            status: "active",
            invitedBy: req.user._id,
            joinedAt: new Date(),
          },
          {
            upsert: true,
            new: true,
            setDefaultsOnInsert: true,
          }
        )
      )
    );

    res.json({
      message: "User promoted to super admin successfully",
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  registerUser,
  loginUser,
  getMe,
  updateMe,
  promoteSuperAdmin,
  getRegistrationOrganizations,
};
