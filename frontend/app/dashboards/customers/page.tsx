"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Mail, Plus, Pencil, Trash2, Search, X } from "lucide-react";
import { apiRequest } from "../../difm/lib/api";

type CustomerStatus = "Paid" | "Unpaid" | "Pending";

type CustomerRow = {
  id: string;
  customerId: string;
  name: string;
  email: string;
  countryCode: string;
  phoneNumber: string;
  totalAmount: string;
  status: CustomerStatus;
};

type CustomerResponse = {
  _id: string;
  name: string;
  email?: string;
  countryCode?: string;
  phone?: string;
  phoneNumber?: string;
  totalAmount?: number;
  status?: CustomerStatus;
};

const countryCodes = ["+44", "+91", "+1", "+61", "+971"];

const emptyForm = {
  name: "",
  email: "",
  countryCode: "+44",
  phoneNumber: "",
  totalAmount: "",
  status: "Pending" as CustomerStatus,
};

export default function CustomersPage() {
  const [customers, setCustomers] = useState<CustomerRow[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCustomerId, setEditingCustomerId] = useState<string | null>(null);
  const [formData, setFormData] = useState(emptyForm);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [sendingQuoteId, setSendingQuoteId] = useState<string | null>(null);

  const mapCustomer = (customer: CustomerResponse, index: number): CustomerRow => ({
    id: customer._id,
    customerId: String(index + 1).padStart(2, "0"),
    name: customer.name,
    email: customer.email || "",
    countryCode: customer.countryCode || "+44",
    phoneNumber: customer.phoneNumber || customer.phone || "",
    totalAmount: String(customer.totalAmount || 0),
    status: customer.status || "Pending",
  });

  const loadCustomers = useCallback(async () => {
    try {
      setIsLoading(true);
      setError("");
      const data = await apiRequest<CustomerResponse[]>("/customers");
      setCustomers(data.map(mapCustomer));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load customers");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCustomers();
  }, [loadCustomers]);

  const filteredCustomers = useMemo(() => {
    const q = searchTerm.toLowerCase();

    return customers.filter(
      (customer) =>
        customer.customerId.toLowerCase().includes(q) ||
        customer.name.toLowerCase().includes(q) ||
        customer.email.toLowerCase().includes(q) ||
        `${customer.countryCode} ${customer.phoneNumber}`.toLowerCase().includes(q) ||
        customer.totalAmount.toLowerCase().includes(q) ||
        customer.status.toLowerCase().includes(q)
    );
  }, [customers, searchTerm]);

  const openAddModal = () => {
    setEditingCustomerId(null);
    setFormData(emptyForm);
    setIsModalOpen(true);
  };

  const openEditModal = (customer: CustomerRow) => {
    setEditingCustomerId(customer.id);
    setFormData({
      name: customer.name,
      email: customer.email,
      countryCode: customer.countryCode,
      phoneNumber: customer.phoneNumber,
      totalAmount: customer.totalAmount,
      status: customer.status,
    });
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingCustomerId(null);
    setFormData(emptyForm);
  };

  const handleDelete = async (id: string) => {
    try {
      setError("");
      setSuccessMessage("");
      await apiRequest(`/customers/${id}`, { method: "DELETE" });
      setCustomers((prev) => prev.filter((customer) => customer.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete customer");
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;

    if (name === "phoneNumber") {
      const digitsOnly = value.replace(/\D/g, "");
      setFormData((prev) => ({
        ...prev,
        [name]: digitsOnly,
      }));
      return;
    }

    if (name === "totalAmount") {
      const numericOnly = value.replace(/[^\d.]/g, "");
      setFormData((prev) => ({
        ...prev,
        [name]: numericOnly,
      }));
      return;
    }

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (
      !formData.name.trim() ||
      !formData.email.trim() ||
      !formData.phoneNumber.trim() ||
      !formData.totalAmount.trim()
    ) {
      return;
    }

    try {
      setError("");
      setSuccessMessage("");
      const payload = {
        name: formData.name,
        email: formData.email,
        countryCode: formData.countryCode,
        phoneNumber: formData.phoneNumber,
        phone: formData.phoneNumber,
        totalAmount: Number(formData.totalAmount),
        status: formData.status,
      };

      if (editingCustomerId !== null) {
        await apiRequest<CustomerResponse>(`/customers/${editingCustomerId}`, {
          method: "PUT",
          body: JSON.stringify(payload),
        });
      } else {
        await apiRequest<CustomerResponse>("/customers", {
          method: "POST",
          body: JSON.stringify(payload),
        });
      }

      await loadCustomers();
      closeModal();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save customer");
    }
  };

  const handleSendQuote = async (customer: CustomerRow) => {
    try {
      setError("");
      setSuccessMessage("");
      setSendingQuoteId(customer.id);

      const response = await apiRequest<{ message: string }>(
        `/customers/${customer.id}/send-quote`,
        { method: "POST" }
      );

      setSuccessMessage(response.message);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send quote email");
    } finally {
      setSendingQuoteId(null);
    }
  };

  const getStatusClasses = (status: CustomerStatus) => {
    switch (status) {
      case "Paid":
        return "bg-green-100 text-green-700";
      case "Pending":
        return "bg-orange-100 text-orange-700";
      case "Unpaid":
        return "bg-red-100 text-red-700";
      default:
        return "";
    }
  };

  return (
    <div className="min-h-screen">
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white sm:text-4xl">
            Customers
          </h1>
          <p className="mt-2 text-sm text-slate-300 sm:text-base">
            Manage customer details, phone numbers, and total amounts.
          </p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="relative">
            <Search
              size={18}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              type="text"
              placeholder="Search customers..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-xl border border-slate-700 bg-slate-800 py-3 pl-10 pr-4 text-sm text-white outline-none transition placeholder:text-slate-400 focus:border-blue-500 sm:w-72"
            />
          </div>

          <button
            onClick={openAddModal}
            className="flex cursor-pointer items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition duration-200 hover:bg-blue-700"
          >
            <Plus size={18} />
            <span>Add Customer</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-xl border border-red-400/40 bg-red-500/20 px-4 py-3 text-sm text-white">
          {error}
        </div>
      )}

      {successMessage && (
        <div className="mb-4 rounded-xl border border-green-400/40 bg-green-500/20 px-4 py-3 text-sm text-white">
          {successMessage}
        </div>
      )}

      <div className="rounded-2xl border border-slate-700 bg-slate-800 p-5 text-white shadow-lg">
        <div className="mb-4">
          <h2 className="text-xl font-semibold">Customer Records</h2>
          <p className="mt-1 text-sm text-slate-300">
            View and manage customer account entries.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full border-separate border-spacing-y-3">
            <thead>
              <tr>
                <th className="px-4 text-left text-sm font-semibold text-slate-400">
                  Customer ID
                </th>
                <th className="px-4 text-left text-sm font-semibold text-slate-400">
                  Name
                </th>
                <th className="px-4 text-left text-sm font-semibold text-slate-400">
                  Email
                </th>
                <th className="px-4 text-left text-sm font-semibold text-slate-400">
                  Phone Number
                </th>
                <th className="px-4 text-left text-sm font-semibold text-slate-400">
                  Total Amount
                </th>
                <th className="px-4 text-left text-sm font-semibold text-slate-400">
                  Status
                </th>
                <th className="px-4 text-left text-sm font-semibold text-slate-400">
                  Actions
                </th>
              </tr>
            </thead>

            <tbody>
              {isLoading ? (
                <tr>
                  <td
                    colSpan={7}
                    className="rounded-xl bg-slate-700/30 px-4 py-8 text-center text-sm text-slate-300"
                  >
                    Loading customers...
                  </td>
                </tr>
              ) : filteredCustomers.length > 0 ? (
                filteredCustomers.map((customer) => (
                  <tr
                    key={customer.id}
                    className="rounded-xl bg-slate-700/40 transition duration-200 hover:bg-slate-700/60"
                  >
                    <td className="rounded-l-xl px-4 py-4 text-sm font-medium text-slate-100">
                      {customer.customerId}
                    </td>
                    <td className="px-4 py-4 text-sm text-slate-200">
                      {customer.name}
                    </td>
                    <td className="px-4 py-4 text-sm text-slate-200">
                      {customer.email}
                    </td>
                    <td className="px-4 py-4 text-sm text-slate-200">
                      {customer.countryCode} {customer.phoneNumber}
                    </td>
                    <td className="px-4 py-4 text-sm font-semibold text-white">
                      £{customer.totalAmount}
                    </td>
                    <td className="px-4 py-4">
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold ${getStatusClasses(
                          customer.status
                        )}`}
                      >
                        {customer.status}
                      </span>
                    </td>
                    <td className="rounded-r-xl px-4 py-4">
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => handleSendQuote(customer)}
                          disabled={sendingQuoteId === customer.id}
                          className="cursor-pointer rounded-lg bg-emerald-500/10 p-2 text-emerald-400 transition hover:bg-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-50"
                          aria-label={`Send quote email to ${customer.name}`}
                        >
                          <Mail size={16} />
                        </button>

                        <button
                          onClick={() => openEditModal(customer)}
                          className="cursor-pointer rounded-lg bg-blue-500/10 p-2 text-blue-400 transition hover:bg-blue-500/20"
                          aria-label={`Edit ${customer.name}`}
                        >
                          <Pencil size={16} />
                        </button>

                        <button
                          onClick={() => handleDelete(customer.id)}
                          className="cursor-pointer rounded-lg bg-red-500/10 p-2 text-red-400 transition hover:bg-red-500/20"
                          aria-label={`Delete ${customer.name}`}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={7}
                    className="rounded-xl bg-slate-700/30 px-4 py-8 text-center text-sm text-slate-300"
                  >
                    No customer records found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/50"
            onClick={closeModal}
          />

          <div className="fixed left-1/2 top-1/2 z-50 w-[92%] max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-slate-700 bg-slate-900 p-6 text-white shadow-2xl">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-semibold">
                  {editingCustomerId !== null ? "Edit Customer" : "Add Customer"}
                </h2>
                <p className="mt-1 text-sm text-slate-400">
                  Fill in the customer details below.
                </p>
              </div>

              <button
                onClick={closeModal}
                className="cursor-pointer rounded-lg p-2 text-slate-300 transition hover:bg-slate-800"
                aria-label="Close modal"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-300">
                  Name
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="Enter customer name"
                  className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-blue-500"
                  required
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-300">
                  Email
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="Enter customer email"
                  className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-blue-500"
                  required
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-300">
                  Phone Number
                </label>
                <div className="grid grid-cols-3 gap-3">
                  <select
                    name="countryCode"
                    value={formData.countryCode}
                    onChange={handleChange}
                    className="rounded-xl border border-slate-700 bg-slate-800 px-3 py-3 text-sm text-white outline-none transition focus:border-blue-500"
                  >
                    {countryCodes.map((code) => (
                      <option key={code} value={code}>
                        {code}
                      </option>
                    ))}
                  </select>

                  <input
                    type="text"
                    name="phoneNumber"
                    value={formData.phoneNumber}
                    onChange={handleChange}
                    placeholder="Enter number"
                    className="col-span-2 rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-blue-500"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-300">
                  Total Amount
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm text-slate-400">
                    £
                  </span>
                  <input
                    type="text"
                    name="totalAmount"
                    value={formData.totalAmount}
                    onChange={handleChange}
                    placeholder="Enter total amount"
                    className="w-full rounded-xl border border-slate-700 bg-slate-800 py-3 pl-8 pr-4 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-blue-500"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-300">
                  Status
                </label>
                <select
                  name="status"
                  value={formData.status}
                  onChange={handleChange}
                  className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-sm text-white outline-none transition focus:border-blue-500"
                >
                  <option value="Paid">Paid</option>
                  <option value="Unpaid">Unpaid</option>
                  <option value="Pending">Pending</option>
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={closeModal}
                  className="cursor-pointer rounded-xl border border-slate-700 px-5 py-3 text-sm font-medium text-slate-300 transition hover:bg-slate-800"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="cursor-pointer rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700"
                >
                  {editingCustomerId !== null ? "Update" : "Save"}
                </button>
              </div>
            </form>
          </div>
        </>
      )}
    </div>
  );
}