const jwt = require("jsonwebtoken");
const User = require("../models/User");
const { getActiveMembershipForUser } = require("../utils/organization");

const protect = async (req, res, next) => {
  try {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith("Bearer")) {
      token = req.headers.authorization.split(" ")[1];
    }

    if (!token) {
      return res.status(401).json({ message: "Not authorized, no token provided" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select("-password");

    if (!user) {
      return res.status(401).json({ message: "Not authorized, user not found" });
    }

    req.user = user;
    const requestedOrganizationId = req.headers["x-organization-id"];
    const membership = await getActiveMembershipForUser(user._id, requestedOrganizationId);

    if (membership) {
      req.membership = membership;
      req.organization = membership.organization;
    }

    if (user.role !== "super_admin") {
      if (!req.organization) {
        return res.status(403).json({ message: "No active organization access found" });
      }

      if (req.organization.status !== "active") {
        return res.status(403).json({ message: "Organization access is not active" });
      }

    }

    next();
  } catch (error) {
    res.status(401).json({ message: "Not authorized, token failed" });
  }
};

const requireSuperAdmin = (req, res, next) => {
  if (req.user?.role !== "super_admin") {
    return res.status(403).json({ message: "Super admin access required" });
  }

  next();
};

module.exports = { protect, requireSuperAdmin };
