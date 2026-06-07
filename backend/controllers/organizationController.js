const crypto = require("crypto");
const Invitation = require("../models/Invitation");
const OrganizationMember = require("../models/OrganizationMember");
const User = require("../models/User");
const { sendEmail } = require("../utils/emailService");

const allowedInviteRoles = ["admin", "staff", "viewer"];
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const canManageTeam = (membership) => ["owner", "admin"].includes(membership?.role);

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

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

const sendInvitationEmail = async ({ email, role, organization, existingUser }) => {
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
            : "Please create an account using this same email address. Your company access will be added automatically after registration."
        }
      </p>
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
        status: "pending",
        invitedBy: req.user._id,
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
    });

    res.status(201).json({
      message: "Invitation sent",
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
