"use client";

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

const revenueData = [
  { name: "Weekly", value: 12000, color: "#6366f1" },
  { name: "Monthly", value: 24000, color: "#38bdf8" },
  { name: "Annual", value: 64000, color: "#989eba" },
];

const revenueGrowthData = [
  { month: "Jan", revenue: 42000 },
  { month: "Feb", revenue: 51000 },
  { month: "Mar", revenue: 48000 },
  { month: "Apr", revenue: 62000 },
  { month: "May", revenue: 70000 },
  { month: "Jun", revenue: 76000 },
];

const recentTransactions = [
  { id: "INV-1001", customer: "John Mathew", amount: "$1,250", status: "Paid" },
  { id: "INV-1002", customer: "Sarah Khan", amount: "$980", status: "Pending" },
  { id: "INV-1003", customer: "David Roy", amount: "$2,430", status: "Paid" },
  { id: "INV-1004", customer: "Anita Joseph", amount: "$760", status: "Overdue" },
];

function StatCard({
  title,
  value,
  trend,
  trendColor,
}: {
  title: string;
  value: string;
  trend: string;
  trendColor: string;
}) {
  return (
    <div className="cursor-pointer rounded-2xl border border-slate-700 bg-slate-700 p-5 text-white shadow-lg transition duration-300 hover:-translate-y-1 hover:shadow-xl">
      <h2 className="text-sm font-medium text-slate-400">{title}</h2>
      <p className="mt-3 text-3xl font-bold">{value}</p>
      <p className={`mt-2 text-sm font-medium ${trendColor}`}>{trend}</p>
    </div>
  );
}

export default function OverviewPage() {
  return (
    <div className="min-h-screen">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-white sm:text-4xl">Overview</h1>
        <p className="mt-2 text-sm text-slate-300 sm:text-base">
          Welcome to the DIFMS dashboard overview.
        </p>
      </div>

      {/* Main Stats */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Total Customers"
          value="1,245"
          trend="+12.5% this month"
          trendColor="text-green-400"
        />
        <StatCard
          title="Invoices"
          value="320"
          trend="+8.2% this month"
          trendColor="text-green-400"
        />
        <StatCard
          title="Feedback"
          value="89"
          trend="+4.1% this week"
          trendColor="text-green-400"
        />
        <StatCard
          title="Open Tickets"
          value="14"
          trend="-2.3% this week"
          trendColor="text-red-400"
        />
      </div>

      {/* Revenue Cards */}
      <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Total Revenue"
          value="$954,000"
          trend="+15.8% growth"
          trendColor="text-green-400"
        />
        <StatCard
          title="Weekly Revenue"
          value="$18,000"
          trend="+5.4% this week"
          trendColor="text-green-400"
        />
        <StatCard
          title="Monthly Revenue"
          value="$72,000"
          trend="+9.7% this month"
          trendColor="text-green-400"
        />
        <StatCard
          title="Annual Revenue"
          value="$864,000"
          trend="+18.3% this year"
          trendColor="text-green-400"
        />
      </div>

      {/* Charts */}
      <div className="mt-8 grid grid-cols-1 gap-6 xl:grid-cols-3">
        {/* Revenue Split */}
        <div className="cursor-pointer rounded-2xl border border-slate-700 bg-slate-700 p-6 text-white shadow-lg transition duration-300 hover:shadow-xl xl:col-span-1">
          <h2 className="text-xl font-semibold">Revenue Split</h2>
          <p className="mt-1 text-sm text-slate-300">
            Weekly, monthly, and annual distribution.
          </p>

          <div className="mt-6 h-[260px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={revenueData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={90}
                  label
                >
                  {revenueData.map((item, index) => (
                    <Cell key={index} fill={item.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="mt-6 flex flex-wrap justify-center gap-6">
            {revenueData.map((item, index) => (
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
        <div className="cursor-pointer rounded-2xl border border-slate-700 bg-slate-700 p-6 text-white shadow-lg transition duration-300 hover:shadow-xl xl:col-span-2">
          <h2 className="text-xl font-semibold">Revenue Growth</h2>
          <p className="mt-1 text-sm text-slate-300">
            Monthly revenue trend for the current period.
          </p>

          <div className="mt-6 h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={revenueGrowthData}>
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
          </div>
        </div>
      </div>

      {/* Invoice Status */}
      <div className="mt-8 cursor-pointer rounded-2xl bg-gradient-to-r from-slate-600 to-slate-900 p-6 text-white shadow-lg transition duration-300 hover:shadow-xl">
        <h2 className="text-xl font-semibold">Invoice Status Overview</h2>
        <p className="mt-1 text-sm text-slate-300">
          Comparison of paid, pending, and overdue invoices.
        </p>

        <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-3">
          <div className="cursor-pointer rounded-xl bg-white/10 p-5 backdrop-blur-md transition duration-300 hover:-translate-y-1 hover:bg-white/15">
            <p className="text-sm text-slate-300">Paid</p>
            <p className="mt-2 text-2xl font-bold text-green-400">220</p>
            <div className="mt-4 h-2 w-full rounded-full bg-white/20">
              <div className="h-2 w-[85%] rounded-full bg-green-500" />
            </div>
          </div>

          <div className="cursor-pointer rounded-xl bg-white/10 p-5 backdrop-blur-md transition duration-300 hover:-translate-y-1 hover:bg-white/15">
            <p className="text-sm text-slate-300">Pending</p>
            <p className="mt-2 text-2xl font-bold text-orange-400">70</p>
            <div className="mt-4 h-2 w-full rounded-full bg-white/20">
              <div className="h-2 w-[40%] rounded-full bg-orange-500" />
            </div>
          </div>

          <div className="cursor-pointer rounded-xl bg-white/10 p-5 backdrop-blur-md transition duration-300 hover:-translate-y-1 hover:bg-white/15">
            <p className="text-sm text-slate-300">Overdue</p>
            <p className="mt-2 text-2xl font-bold text-red-400">30</p>
            <div className="mt-4 h-2 w-full rounded-full bg-white/20">
              <div className="h-2 w-[20%] rounded-full bg-red-500" />
            </div>
          </div>
        </div>
      </div>

      {/* Recent Transactions */}
      <div className="mt-8 cursor-pointer rounded-2xl border border-slate-700 bg-slate-700 p-6 text-white shadow-lg transition duration-300 hover:shadow-xl">
        <div className="mb-4">
          <h2 className="text-xl font-semibold">Recent Transactions</h2>
          <p className="mt-1 text-sm text-slate-300">
            Latest invoice activity in the system.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full border-separate border-spacing-y-3">
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
              {recentTransactions.map((transaction) => (
                <tr key={transaction.id} className="rounded-xl bg-slate-700/40">
                  <td className="rounded-l-xl px-4 py-3 text-sm font-medium text-slate-100">
                    {transaction.id}
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-200">
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
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}