const Organization = require("../models/Organization");
const OrganizationMember = require("../models/OrganizationMember");
const { normalizeCurrency } = require("./currency");

const slugify = (value) => {
  return String(value || "company")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
};

const createUniqueSlug = async (name) => {
  const baseSlug = slugify(name);
  let slug = baseSlug;
  let suffix = 1;

  while (await Organization.exists({ slug })) {
    suffix += 1;
    slug = `${baseSlug}-${suffix}`;
  }

  return slug;
};

const serializeOrganization = (organization, membership) => ({
  _id: organization._id,
  name: organization.name,
  slug: organization.slug,
  email: organization.email,
  phone: organization.phone,
  address: organization.address,
  logoUrl: organization.logoUrl,
  currency: organization.currency,
  taxPercentage: organization.taxPercentage || 0,
  discountPercentage: organization.discountPercentage || 0,
  status: organization.status,
  role: membership?.role,
  memberStatus: membership?.status,
});

const createOrganizationForUser = async ({ user, companyName, currency }) => {
  const organizationName = companyName || `${user.name}'s Company`;
  const organization = await Organization.create({
    name: organizationName,
    slug: await createUniqueSlug(organizationName),
    email: user.email,
    currency: normalizeCurrency(currency || user.currency),
    createdBy: user._id,
  });

  const membership = await OrganizationMember.create({
    organization: organization._id,
    user: user._id,
    role: "owner",
    status: "active",
  });

  return { organization, membership };
};

const getActiveMembershipForUser = async (userId, requestedOrganizationId) => {
  const query = {
    user: userId,
    status: "active",
  };

  if (requestedOrganizationId) {
    query.organization = requestedOrganizationId;
  }

  const membership = await OrganizationMember.findOne(query)
    .populate("organization")
    .sort({ createdAt: 1 });

  if (!membership || !membership.organization) {
    return null;
  }

  return membership;
};

const listOrganizationsForUser = async (userId) => {
  const memberships = await OrganizationMember.find({
    user: userId,
    status: "active",
  })
    .populate("organization")
    .sort({ createdAt: 1 });

  return memberships
    .filter((membership) => membership.organization)
    .map((membership) => serializeOrganization(membership.organization, membership));
};

module.exports = {
  createUniqueSlug,
  createOrganizationForUser,
  getActiveMembershipForUser,
  listOrganizationsForUser,
  serializeOrganization,
};
