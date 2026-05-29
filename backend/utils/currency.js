const SUPPORTED_CURRENCIES = ["GBP", "ZMW"];

const normalizeCurrency = (currency) => {
  const normalized = String(currency || process.env.COMPANY_CURRENCY || "GBP").toUpperCase();
  return SUPPORTED_CURRENCIES.includes(normalized) ? normalized : "GBP";
};

const formatCurrency = (amount, currency = process.env.COMPANY_CURRENCY || "GBP") => {
  const normalized = normalizeCurrency(currency);

  if (normalized === "ZMW") {
    return `K${Number(amount || 0).toFixed(2)}`;
  }

  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: normalized,
  }).format(Number(amount) || 0);
};

module.exports = { SUPPORTED_CURRENCIES, formatCurrency, normalizeCurrency };
