"use client";

import { useEffect, useMemo, useState } from "react";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
import { apiRequest } from "../../difm/lib/api";
import { formatCurrency as formatMoney, normalizeCurrency } from "../../difm/lib/currencies";

type CustomerResponse = {
  _id: string;
};

type InvoiceStatus =
  | "draft"
  | "sent"
  | "partially_paid"
  | "paid"
  | "overdue"
  | "cancelled";

type InvoiceResponse = {
  _id: string;
  invoiceNumber: string;
  customer?: {
    name?: string;
  };
  total: number;
  currency?: string;
  amountPaid?: number;
  status: InvoiceStatus;
  createdAt?: string;
};

type PaymentResponse = {
  _id: string;
  amount: number;
  currency?: string;
  invoice?: {
    currency?: string;
  };
  paymentDate?: string;
  createdAt?: string;
};

type QuoteResponse = {
  _id: string;
  status: "draft" | "sent" | "accepted" | "rejected" | "expired" | "converted";
};

const formatCurrency = (value: number, currency = "GBP") =>
  formatMoney(value, normalizeCurrency(currency));

const monthLabels = ["Jan", "Feb", "Mar", "Apr", "May", "Jun"];

const getStoredOrganizationCurrency = () => {
  if (typeof window === "undefined") return "GBP";

  try {
    const user = JSON.parse(localStorage.getItem("user") || "null");
    return normalizeCurrency(user?.activeOrganization?.currency);
  } catch {
    return "GBP";
  }
};

const toUiStatus = (status: InvoiceStatus) => {
  if (status === "paid") return "Paid";
  if (status === "overdue") return "Overdue";
  return "Pending";
};

const isSameWeek = (date: Date, now: Date) => {
  const start = new Date(now);
  start.setDate(now.getDate() - now.getDay());
  start.setHours(0, 0, 0, 0);

  const end = new Date(start);
  end.setDate(start.getDate() + 7);

  return date >= start && date < end;
};

const isSameMonth = (date: Date, now: Date) => {
  return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
};

const isSameYear = (date: Date, now: Date) => {
  return date.getFullYear() === now.getFullYear();
};

function StatCard({
  title,
  value,
  trend,
  trendColor,
}: {
  title: string;
  value: string;
  trend?: string;
  trendColor?: string;
}) {
  return (
    <div className="cursor-pointer rounded-2xl border border-slate-700 bg-slate-700 p-4 text-white shadow-lg transition duration-300 hover:-translate-y-1 hover:shadow-xl sm:p-5">
      <h2 className="text-sm font-medium text-slate-400">{title}</h2>
      <p className="mt-3 break-words text-2xl font-bold sm:text-3xl">{value}</p>
      {trend && <p className={`mt-2 text-sm font-medium ${trendColor || "text-slate-400"}`}>{trend}</p>}
    </div>
  );
}

export default function OverviewPage() {
  const [customers, setCustomers] = useState<CustomerResponse[]>([]);
  const [invoices, setInvoices] = useState<InvoiceResponse[]>([]);
  const [payments, setPayments] = useState<PaymentResponse[]>([]);
  const [quotes, setQuotes] = useState<QuoteResponse[]>([]);
  const [organizationCurrency, setOrganizationCurrency] = useState("GBP");
  const [isLoading, setIsLoading] = useState(true);
  const [chartsReady, setChartsReady] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadOverview = async () => {
      try {
        setIsLoading(true);
        setError("");

        const [customerData, invoiceData, paymentData, quoteData] = await Promise.all([
          apiRequest<CustomerResponse[]>("/customers"),
          apiRequest<InvoiceResponse[]>("/invoices"),
          apiRequest<PaymentResponse[]>("/payments"),
          apiRequest<QuoteResponse[]>("/quotes"),
        ]);

        setCustomers(customerData);
        setInvoices(invoiceData);
        setPayments(paymentData);
        setQuotes(quoteData);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load overview data");
      } finally {
        setIsLoading(false);
      }
    };

    loadOverview();
    setOrganizationCurrency(getStoredOrganizationCurrency());
    const frameId = window.requestAnimationFrame(() => setChartsReady(true));

    return () => window.cancelAnimationFrame(frameId);
  }, []);

  const overview = useMemo(() => {
    const now = new Date();
    const revenueItems =
      payments.length > 0
        ? payments.map((payment) => ({
              amount: Number(payment.amount) || 0,
              currency: normalizeCurrency(payment.currency || payment.invoice?.currency || organizationCurrency),
              date: new Date(payment.paymentDate || payment.createdAt || Date.now()),
            }))
        : invoices
            .filter((invoice) => invoice.status === "paid")
            .map((invoice) => ({
              amount: Number(invoice.amountPaid || invoice.total) || 0,
              currency: normalizeCurrency(invoice.currency),
              date: new Date(invoice.createdAt || Date.now()),
            }));

    const displayCurrency = normalizeCurrency(
      organizationCurrency || revenueItems[0]?.currency || invoices[0]?.currency
    );
    const revenueItemsForDisplay = revenueItems.filter((item) => item.currency === displayCurrency);
    const hasMixedCurrencies = revenueItems.some((item) => item.currency !== displayCurrency);
    const totalRevenue = revenueItemsForDisplay.reduce((sum, item) => sum + item.amount, 0);
    const weeklyRevenue = revenueItemsForDisplay
      .filter((item) => isSameWeek(item.date, now))
      .reduce((sum, item) => sum + item.amount, 0);
    const monthlyRevenue = revenueItemsForDisplay
      .filter((item) => isSameMonth(item.date, now))
      .reduce((sum, item) => sum + item.amount, 0);
    const annualRevenue = revenueItemsForDisplay
      .filter((item) => isSameYear(item.date, now))
      .reduce((sum, item) => sum + item.amount, 0);

    const paidInvoices = invoices.filter((invoice) => invoice.status === "paid").length;
    const overdueInvoices = invoices.filter((invoice) => invoice.status === "overdue").length;
    const pendingInvoices = invoices.filter(
      (invoice) =>
        invoice.status === "draft" ||
        invoice.status === "sent" ||
        invoice.status === "partially_paid"
    ).length;

    const maxStatusCount = Math.max(paidInvoices, pendingInvoices, overdueInvoices, 1);

    const revenueData = [
      { name: "Weekly", value: weeklyRevenue, color: "#6366f1" },
      { name: "Monthly", value: monthlyRevenue, color: "#38bdf8" },
      { name: "Annual", value: annualRevenue, color: "#989eba" },
    ];

    const revenueGrowthData = monthLabels.map((month, index) => {
      const monthRevenue = revenueItemsForDisplay
        .filter(
          (item) =>
            item.date.getMonth() === index && item.date.getFullYear() === now.getFullYear()
        )
        .reduce((sum, item) => sum + item.amount, 0);

      return { month, revenue: monthRevenue };
    });

    const recentTransactions = invoices
      .slice()
      .sort(
        (a, b) =>
          new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
      )
      .slice(0, 5)
      .map((invoice) => ({
        id: invoice.invoiceNumber,
        customer: invoice.customer?.name || "Unknown Customer",
        amount: formatCurrency(invoice.total, invoice.currency),
        status: toUiStatus(invoice.status),
      }));

    return {
      totalCustomers: customers.length,
      totalInvoices: invoices.length,
      openQuotes: quotes.filter((quote) => quote.status !== "converted").length,
      totalRevenue,
      displayCurrency,
      weeklyRevenue,
      monthlyRevenue,
      annualRevenue,
      hasMixedCurrencies,
      paidInvoices,
      pendingInvoices,
      overdueInvoices,
      maxStatusCount,
      revenueData,
      revenueGrowthData,
      recentTransactions,
    };
  }, [customers.length, invoices, organizationCurrency, payments, quotes]);

  return (
    <div className="min-h-screen">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white sm:text-4xl">Overview</h1>
        <p className="mt-2 text-sm text-slate-300 sm:text-base">
          {isLoading ? "Loading live dashboard data..." : "Welcome to your dashboard overview."}
        </p>
      </div>

      {error && (
        <div className="mb-4 rounded-xl border border-red-400/40 bg-red-500/20 px-4 py-3 text-sm text-white">
          {error}
        </div>
      )}

      {overview.hasMixedCurrencies && (
        <div className="mb-4 rounded-xl border border-amber-300/40 bg-amber-500/20 px-4 py-3 text-sm text-white">
          Revenue totals are shown in {overview.displayCurrency}. Invoices in other currencies are shown in recent transactions but excluded from revenue totals.
        </div>
      )}

      {/* Main Stats */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3">
        <StatCard
          title="Total Customers"
          value={String(overview.totalCustomers)}
        />
        <StatCard
          title="Invoices"
          value={String(overview.totalInvoices)}
        />
        <StatCard
          title="Open Quotes"
          value={String(overview.openQuotes)}
          trend="Pending quote activity"
          trendColor="text-slate-400"
        />
      </div>

      {/* Revenue Cards */}
      <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Total Revenue"
          value={formatCurrency(overview.totalRevenue, overview.displayCurrency)}
          trend="From payments/paid invoices"
          trendColor="text-green-400"
        />
        <StatCard
          title="Weekly Revenue"
          value={formatCurrency(overview.weeklyRevenue, overview.displayCurrency)}
          trend="Current week"
          trendColor="text-green-400"
        />
        <StatCard
          title="Monthly Revenue"
          value={formatCurrency(overview.monthlyRevenue, overview.displayCurrency)}
          trend="Current month"
          trendColor="text-green-400"
        />
        <StatCard
          title="Annual Revenue"
          value={formatCurrency(overview.annualRevenue, overview.displayCurrency)}
          trend="Current year"
          trendColor="text-green-400"
        />
      </div>

      {/* Charts */}
      <div className="mt-8 grid grid-cols-1 gap-6 xl:grid-cols-3">
        {/* Revenue Split */}
        <div className="min-w-0 cursor-pointer rounded-2xl border border-slate-700 bg-slate-700 p-4 text-white shadow-lg transition duration-300 hover:shadow-xl sm:p-6 xl:col-span-1">
          <h2 className="text-xl font-semibold">Revenue Split</h2>
          <p className="mt-1 text-sm text-slate-300">
            Weekly, monthly, and annual distribution.
          </p>

          <div className="mt-6 h-64 min-w-0">
            {chartsReady ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={overview.revenueData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={90}
                    label
                  >
                    {overview.revenueData.map((item, index) => (
                      <Cell key={index} fill={item.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : null}
          </div>

          <div className="mt-6 flex flex-wrap justify-center gap-6">
            {overview.revenueData.map((item, index) => (
              <div
                key={index}
                className="flex cursor-pointer items-center gap-2 transition hover:scale-105"
              >
                <span
                  className="h-3 w-3 rounded-full"
                  style={{ backgroundColor: item.color }}
                />
                <span className="text-sm font-medium text-slate-200">
                  {item.name}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Revenue Growth */}
        <div className="min-w-0 cursor-pointer rounded-2xl border border-slate-700 bg-slate-700 p-4 text-white shadow-lg transition duration-300 hover:shadow-xl sm:p-6 xl:col-span-2">
          <h2 className="text-xl font-semibold">Revenue Growth</h2>
          <p className="mt-1 text-sm text-slate-300">
            Monthly revenue trend for the current period.
          </p>

          <div className="mt-6 h-72 min-w-0">
            {chartsReady ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={overview.revenueGrowthData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#475569" />
                  <XAxis dataKey="month" stroke="#cbd5e1" />
                  <YAxis stroke="#cbd5e1" />
                  <Tooltip />
                  <Line
                    type="monotone"
                    dataKey="revenue"
                    stroke="#3b82f6"
                    strokeWidth={3}
                    dot={{ r: 5 }}
                    activeDot={{ r: 7 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : null}
          </div>
        </div>
      </div>

      {/* Invoice Status */}
      <div className="mt-8 cursor-pointer rounded-2xl bg-gradient-to-r from-slate-600 to-slate-900 p-4 text-white shadow-lg transition duration-300 hover:shadow-xl sm:p-6">
        <h2 className="text-xl font-semibold">Invoice Status Overview</h2>
        <p className="mt-1 text-sm text-slate-300">
          Comparison of paid, pending, and overdue invoices.
        </p>

        <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-3">
          <div className="cursor-pointer rounded-xl bg-white/10 p-5 backdrop-blur-md transition duration-300 hover:-translate-y-1 hover:bg-white/15">
            <p className="text-sm text-slate-300">Paid</p>
            <p className="mt-2 text-2xl font-bold text-green-400">
              {overview.paidInvoices}
            </p>
            <div className="mt-4 h-2 w-full rounded-full bg-white/20">
              <div
                className="h-2 rounded-full bg-green-500"
                style={{
                  width: `${(overview.paidInvoices / overview.maxStatusCount) * 100}%`,
                }}
              />
            </div>
          </div>

          <div className="cursor-pointer rounded-xl bg-white/10 p-5 backdrop-blur-md transition duration-300 hover:-translate-y-1 hover:bg-white/15">
            <p className="text-sm text-slate-300">Pending</p>
            <p className="mt-2 text-2xl font-bold text-orange-400">
              {overview.pendingInvoices}
            </p>
            <div className="mt-4 h-2 w-full rounded-full bg-white/20">
              <div
                className="h-2 rounded-full bg-orange-500"
                style={{
                  width: `${(overview.pendingInvoices / overview.maxStatusCount) * 100}%`,
                }}
              />
            </div>
          </div>

          <div className="cursor-pointer rounded-xl bg-white/10 p-5 backdrop-blur-md transition duration-300 hover:-translate-y-1 hover:bg-white/15">
            <p className="text-sm text-slate-300">Overdue</p>
            <p className="mt-2 text-2xl font-bold text-red-400">
              {overview.overdueInvoices}
            </p>
            <div className="mt-4 h-2 w-full rounded-full bg-white/20">
              <div
                className="h-2 rounded-full bg-red-500"
                style={{
                  width: `${(overview.overdueInvoices / overview.maxStatusCount) * 100}%`,
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Recent Transactions */}
      <div className="mt-8 cursor-pointer rounded-2xl border border-slate-700 bg-slate-700 p-4 text-white shadow-lg transition duration-300 hover:shadow-xl sm:p-6">
        <div className="mb-4">
          <h2 className="text-xl font-semibold">Recent Transactions</h2>
          <p className="mt-1 text-sm text-slate-300">
            Latest invoice activity in the system.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-full border-separate border-spacing-y-3">
            <thead>
              <tr>
                <th className="px-4 text-left text-sm font-semibold text-slate-400">
                  Invoice ID
                </th>
                <th className="px-4 text-left text-sm font-semibold text-slate-400">
                  Customer
                </th>
                <th className="px-4 text-left text-sm font-semibold text-slate-400">
                  Amount
                </th>
                <th className="px-4 text-left text-sm font-semibold text-slate-400">
                  Status
                </th>
              </tr>
            </thead>

            <tbody>
              {overview.recentTransactions.length > 0 ? (
                overview.recentTransactions.map((transaction) => (
                <tr key={transaction.id} className="rounded-xl bg-slate-700/40">
                  <td className="rounded-l-xl px-4 py-3 text-sm font-medium text-slate-100">
                    {transaction.id}
                  </td>
                  <td className="break-words px-4 py-3 text-sm text-slate-200">
                    {transaction.customer}
                  </td>
                  <td className="px-4 py-3 text-sm font-semibold text-white">
                    {transaction.amount}
                  </td>
                  <td className="rounded-r-xl px-4 py-3">
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${
                        transaction.status === "Paid"
                          ? "bg-green-100 text-green-700"
                          : transaction.status === "Pending"
                          ? "bg-orange-100 text-orange-700"
                          : "bg-red-100 text-red-700"
                      }`}
                    >
                      {transaction.status}
                    </span>
                  </td>
                </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={4}
                    className="rounded-xl bg-slate-700/30 px-4 py-8 text-center text-sm text-slate-300"
                  >
                    No invoice activity yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
