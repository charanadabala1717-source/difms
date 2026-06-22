const { normalizeCurrency } = require("./currency");

const DEFAULT_STRIPE_FALLBACK_CURRENCY = "GBP";

const getExchangeRate = async (fromCurrency, toCurrency = DEFAULT_STRIPE_FALLBACK_CURRENCY) => {
  const from = normalizeCurrency(fromCurrency);
  const to = normalizeCurrency(toCurrency);

  if (from === to) {
    return {
      from,
      to,
      rate: 1,
      provider: "same-currency",
      convertedAt: new Date(),
    };
  }

  if (process.env.EXCHANGE_RATE_API_KEY) {
    const url = `https://v6.exchangerate-api.com/v6/${process.env.EXCHANGE_RATE_API_KEY}/pair/${from}/${to}`;
    const response = await fetch(url);
    const data = await response.json();

    if (!response.ok || data.result === "error" || !data.conversion_rate) {
      throw new Error(data["error-type"] || "Unable to fetch exchange rate");
    }

    return {
      from,
      to,
      rate: Number(data.conversion_rate),
      provider: "exchangerate-api.com",
      convertedAt: new Date(),
    };
  }

  const baseUrl = process.env.EXCHANGE_RATE_API_URL || "https://open.er-api.com/v6/latest";
  const response = await fetch(`${baseUrl}/${from}`);
  const data = await response.json();
  const rate = Number(data?.rates?.[to]);

  if (!response.ok || data.result === "error" || !rate) {
    throw new Error("Unable to fetch exchange rate");
  }

  return {
    from,
    to,
    rate,
    provider: "open.er-api.com",
    convertedAt: new Date(),
  };
};

const convertAmount = async (amount, fromCurrency, toCurrency = DEFAULT_STRIPE_FALLBACK_CURRENCY) => {
  const exchange = await getExchangeRate(fromCurrency, toCurrency);
  const originalAmount = Number(amount) || 0;
  const convertedAmount = Number((originalAmount * exchange.rate).toFixed(2));

  return {
    ...exchange,
    originalAmount,
    convertedAmount,
  };
};

module.exports = {
  DEFAULT_STRIPE_FALLBACK_CURRENCY,
  convertAmount,
  getExchangeRate,
};
