const Customer = require("../models/Customer");

const getCustomerStatusFromInvoice = (invoiceStatus) => {
  if (invoiceStatus === "paid") return "Paid";
  if (invoiceStatus === "overdue" || invoiceStatus === "cancelled") return "Unpaid";
  return "Pending";
};

const syncCustomerStatusFromInvoice = async (invoice) => {
  if (!invoice?.customer) return;

  await Customer.findByIdAndUpdate(invoice.customer, {
    status: getCustomerStatusFromInvoice(invoice.status),
  });
};

module.exports = { getCustomerStatusFromInvoice, syncCustomerStatusFromInvoice };
