const ZERO_DECIMAL_CURRENCIES = new Set([
  "BIF",
  "CLP",
  "DJF",
  "GNF",
  "JPY",
  "KMF",
  "KRW",
  "MGA",
  "PYG",
  "RWF",
  "UGX",
  "VND",
  "VUV",
  "XAF",
  "XOF",
  "XPF",
]);

const toStripeAmount = (amount, currency) => {
  const numericAmount = Number(amount) || 0;
  const normalizedCurrency = String(currency || "GBP").toUpperCase();

  if (ZERO_DECIMAL_CURRENCIES.has(normalizedCurrency)) {
    return Math.round(numericAmount);
  }

  return Math.round(numericAmount * 100);
};

const isStripeCurrencyError = (error) => {
  const message = String(error?.message || "").toLowerCase();
  const code = String(error?.code || "").toLowerCase();

  return (
    code.includes("currency") ||
    message.includes("currency") ||
    message.includes("presentment")
  );
};

module.exports = {
  ZERO_DECIMAL_CURRENCIES,
  isStripeCurrencyError,
  toStripeAmount,
};
