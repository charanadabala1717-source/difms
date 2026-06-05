const dotenv = require("dotenv");
const connectDB = require("../config/db");
const Customer = require("../models/Customer");
const Invoice = require("../models/Invoice");
const OrganizationMember = require("../models/OrganizationMember");
const Payment = require("../models/Payment");
const Quote = require("../models/Quote");
const Receipt = require("../models/Receipt");
const User = require("../models/User");
const {
  createOrganizationForUser,
  getActiveMembershipForUser,
} = require("../utils/organization");

dotenv.config();

const modelsToBackfill = [Customer, Quote, Invoice, Payment, Receipt];

const backfillOrganizations = async () => {
  await connectDB();

  const users = await User.find({});

  for (const user of users) {
    let membership = await getActiveMembershipForUser(user._id);

    if (!membership && user.role !== "super_admin") {
      const created = await createOrganizationForUser({
        user,
        companyName: `${user.name}'s Company`,
        currency: user.currency,
      });
      membership = await OrganizationMember.findById(created.membership._id).populate("organization");
    }

    if (!membership?.organization) continue;

    for (const Model of modelsToBackfill) {
      await Model.updateMany(
        {
          user: user._id,
          $or: [{ organization: { $exists: false } }, { organization: null }],
        },
        {
          organization: membership.organization._id,
        }
      );
    }

    console.log(`Backfilled organization for ${user.email}`);
  }

  console.log("Organization backfill complete");
  process.exit(0);
};

backfillOrganizations().catch((error) => {
  console.error(error);
  process.exit(1);
});
