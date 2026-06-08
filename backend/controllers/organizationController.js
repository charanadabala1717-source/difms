const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const Invitation = require("../models/Invitation");
const OrganizationMember = require("../models/OrganizationMember");
const User = require("../models/User");
const { sendEmail } = require("../utils/emailService");

const allowedInviteRoles = ["admin", "staff", "viewer"];
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const canManageTeam = (membership) => ["owner", "admin"].includes(membership?.role);

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const generateTemporaryPassword = () => {
  return crypto.randomBytes(9).toString("base64url");
};

const searchUsers = async (req, res) => {
  try {
    if (!canManageTeam(req.membership)) {
      return res.status(403).json({ message: "Only company owners or admins can search users" });
    }

    const query = req.query.q?.trim();

    if (!query || query.length < 2) {
      return res.json([]);
    }

    const users = await User.find({
      $or: [
        { name: new RegExp(escapeRegex(query), "i") },
        { email: new RegExp(escapeRegex(query), "i") },
      ],
    })
      .select("name email")
      .limit(8)
      .sort({ name: 1 });

    res.json(users);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getMembersAndInvitations = async (req, res) => {
  try {
    if (!canManageTeam(req.membership)) {
      return res.status(403).json({ message: "Only company owners or admins can manage users" });
    }

    const [members, invitations] = await Promise.all([
      OrganizationMember.find({
        organization: req.organization._id,
        status: "active",
      })
        .populate("user", "name email role")
        .sort({ createdAt: 1 }),
      Invitation.find({
        organization: req.organization._id,
        status: "pending",
        expiresAt: { $gt: new Date() },
      })
        .populate("invitedBy", "name email")
        .sort({ createdAt: -1 }),
    ]);

    res.json({
      members: members.map((member) => ({
        _id: member._id,
        role: member.role,
        status: member.status,
        joinedAt: member.joinedAt,
        user: member.user
          ? {
              _id: member.user._id,
              name: member.user.name,
              email: member.user.email,
              role: member.user.role,
            }
          : null,
      })),
      invitations: invitations.map((invitation) => ({
        _id: invitation._id,
        email: invitation.email,
        role: invitation.role,
        status: invitation.status,
        expiresAt: invitation.expiresAt,
        invitedBy: invitation.invitedBy
          ? {
              name: invitation.invitedBy.name,
              email: invitation.invitedBy.email,
            }
          : null,
      })),
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const sendInvitationEmail = async ({ email, role, organization, existingUser, temporaryPassword }) => {
  const clientUrl = process.env.CLIENT_URL || "http://localhost:3000";
  const subject = existingUser
    ? `You now have access to ${organization.name}`
    : `Invitation to join ${organization.name}`;

  const html = `
    <div style="font-family: Arial, sans-serif; color: #0f172a; line-height: 1.6;">
      <h2>${organization.name}</h2>
      <p>You have been ${existingUser ? "given access" : "invited"} to the ${organization.name} workspace.</p>
      <p><strong>Role:</strong> ${role}</p>
      <p>
        ${
          existingUser
            ? "You can log in with your existing account to access this company."
            : "An account has been created for you. Please log in with the temporary password below. You will be asked to change it before accessing the dashboard."
        }
      </p>
      ${
        temporaryPassword
          ? `
            <div style="background:#f1f5f9;border:1px solid #cbd5e1;border-radius:8px;padding:12px;margin:16px 0;">
              <p style="margin:0 0 8px;"><strong>Email:</strong> ${email}</p>
              <p style="margin:0;"><strong>Temporary Password:</strong> ${temporaryPassword}</p>
            </div>
          `
          : ""
      }
      <p>
        <a href="${clientUrl}" style="display:inline-block;background:#2563eb;color:#ffffff;text-decoration:none;padding:12px 18px;border-radius:8px;font-weight:bold;">
          Open DIFMS
        </a>
      </p>
    </div>
  `;

  return sendEmail({ to: email, subject, html });
};

const inviteUser = async (req, res) => {
  try {
    if (!canManageTeam(req.membership)) {
      return res.status(403).json({ message: "Only company owners or admins can invite users" });
    }

    const email = req.body.email?.trim().toLowerCase();
    const role = req.body.role || "staff";

    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    if (!emailPattern.test(email)) {
      return res.status(400).json({ message: "Please enter a valid email" });
    }

    if (!allowedInviteRoles.includes(role)) {
      return res.status(400).json({ message: "Invalid role selected" });
    }

    const existingUser = await User.findOne({ email });

    if (existingUser) {
      await OrganizationMember.findOneAndUpdate(
        {
          organization: req.organization._id,
          user: existingUser._id,
        },
        {
          organization: req.organization._id,
          user: existingUser._id,
          role,
          status: "active",
          invitedBy: req.user._id,
          invitedAt: new Date(),
          joinedAt: new Date(),
        },
        {
          upsert: true,
          new: true,
          setDefaultsOnInsert: true,
        }
      );

      await Invitation.updateMany(
        {
          organization: req.organization._id,
          email,
          status: "pending",
        },
        {
          status: "accepted",
          acceptedBy: existingUser._id,
          acceptedAt: new Date(),
        }
      );

      const emailResult = await sendInvitationEmail({
        email,
        role,
        organization: req.organization,
        existingUser: true,
      });

      return res.status(201).json({
        message: "Existing user was added to this company",
        email: emailResult,
      });
    }

    const temporaryPassword = generateTemporaryPassword();
    const hashedPassword = await bcrypt.hash(temporaryPassword, await bcrypt.genSalt(10));
    const invitedUser = await User.create({
      name: email.split("@")[0],
      email,
      password: hashedPassword,
      mustChangePassword: true,
      temporaryPasswordExpiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });

    await OrganizationMember.create({
      organization: req.organization._id,
      user: invitedUser._id,
      role,
      status: "active",
      invitedBy: req.user._id,
      invitedAt: new Date(),
      joinedAt: new Date(),
    });

    const invitation = await Invitation.findOneAndUpdate(
      {
        organization: req.organization._id,
        email,
        status: "pending",
      },
      {
        organization: req.organization._id,
        email,
        role,
        token: crypto.randomBytes(32).toString("hex"),
        status: "accepted",
        invitedBy: req.user._id,
        acceptedBy: invitedUser._id,
        acceptedAt: new Date(),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
      {
        upsert: true,
        new: true,
        setDefaultsOnInsert: true,
      }
    );

    const emailResult = await sendInvitationEmail({
      email,
      role: invitation.role,
      organization: req.organization,
      existingUser: false,
      temporaryPassword,
    });

    res.status(201).json({
      message: "User account created and temporary login credentials sent",
      invitation,
      email: emailResult,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getMembersAndInvitations,
  inviteUser,
  searchUsers,
};
