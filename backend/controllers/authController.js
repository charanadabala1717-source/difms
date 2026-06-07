const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const Organization = require("../models/Organization");
const OrganizationMember = require("../models/OrganizationMember");
const Invitation = require("../models/Invitation");
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
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const parsePercentage = (value, fieldName) => {
  if (value === undefined || value === null || value === "") {
    return { value: 0 };
  }

  const parsed = Number(value);

  if (!Number.isFinite(parsed) || parsed < 0 || parsed > 100) {
    return { error: `${fieldName} must be between 0 and 100` };
  }

  return { value: parsed };
};

const generateToken = (userId) => {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: "30d",
  });
};

const applyPendingInvitationsForUser = async (user) => {
  const invitations = await Invitation.find({
    email: user.email,
    status: "pending",
    expiresAt: { $gt: new Date() },
  });

  if (invitations.length === 0) return;

  await Promise.all(
    invitations.map(async (invitation) => {
      await OrganizationMember.findOneAndUpdate(
        {
          organization: invitation.organization,
          user: user._id,
        },
        {
          organization: invitation.organization,
          user: user._id,
          role: invitation.role,
          status: "active",
          invitedBy: invitation.invitedBy,
          invitedAt: invitation.createdAt,
          joinedAt: new Date(),
        },
        {
          upsert: true,
          new: true,
          setDefaultsOnInsert: true,
        }
      );

      invitation.status = "accepted";
      invitation.acceptedBy = user._id;
      invitation.acceptedAt = new Date();
      await invitation.save();
    })
  );
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
    const { name, email, password, currency } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: "Name, email, and password are required" });
    }

    if (password.length < 6) {
      return res.status(400).json({ message: "Password must be at least 6 characters" });
    }

    const existingUser = await User.findOne({ email });

    if (existingUser) {
      return res.status(400).json({ message: "User already exists with this email" });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      currency: normalizeCurrency(currency),
    });

    await applyPendingInvitationsForUser(user);

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
    const canManageOrganization = ["owner", "admin"].includes(req.membership?.role);

    if (req.body.currency) {
      req.user.currency = normalizeCurrency(req.body.currency);
    }

    const user = await req.user.save();

    if (req.organization && canManageOrganization) {
      if (req.body.name !== undefined) {
        if (!req.body.name?.trim()) {
          return res.status(400).json({ message: "Company name is required" });
        }

        req.organization.name = req.body.name.trim();
      }

      if (req.body.email !== undefined) {
        const normalizedEmail = req.body.email?.trim().toLowerCase();

        if (normalizedEmail && !emailPattern.test(normalizedEmail)) {
          return res.status(400).json({ message: "Please enter a valid company email" });
        }

        if (normalizedEmail) {
          const existingOrganization = await Organization.findOne({
            _id: { $ne: req.organization._id },
            email: new RegExp(`^${escapeRegex(normalizedEmail)}$`, "i"),
          });

          if (existingOrganization) {
            return res.status(400).json({ message: "A company already exists with this email" });
          }
        }

        req.organization.email = normalizedEmail;
      }

      if (req.body.phone !== undefined) {
        req.organization.phone = req.body.phone?.trim();
      }

      if (req.body.address !== undefined) {
        req.organization.address = req.body.address?.trim();
      }

      if (req.body.logoUrl !== undefined) {
        req.organization.logoUrl = req.body.logoUrl?.trim();
      }

      if (req.body.currency) {
        req.organization.currency = normalizeCurrency(req.body.currency);
      }

      if (req.body.taxPercentage !== undefined) {
        const parsedTax = parsePercentage(req.body.taxPercentage, "Tax percentage");

        if (parsedTax.error) {
          return res.status(400).json({ message: parsedTax.error });
        }

        req.organization.taxPercentage = parsedTax.value;
      }

      if (req.body.discountPercentage !== undefined) {
        const parsedDiscount = parsePercentage(req.body.discountPercentage, "Discount percentage");

        if (parsedDiscount.error) {
          return res.status(400).json({ message: parsedDiscount.error });
        }

        req.organization.discountPercentage = parsedDiscount.value;
      }

      await req.organization.save();
    } else if (
      req.organization &&
      ["name", "email", "phone", "address", "logoUrl", "currency", "taxPercentage", "discountPercentage"].some(
        (field) => req.body[field] !== undefined
      )
    ) {
      return res.status(403).json({ message: "Only company owners or admins can update company settings" });
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
