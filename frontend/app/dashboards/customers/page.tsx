"use client";

import { useEffect, useMemo, useState } from "react";
import { Plus, Pencil, Trash2, Search, X } from "lucide-react";

type CustomerStatus = "Paid" | "Unpaid" | "Pending";

type CustomerRow = {
  id: number;
  customerId: string;
  name: string;
  countryCode: string;
  phoneNumber: string;
  totalAmount: string;
  status: CustomerStatus;
};

const initialCustomers: CustomerRow[] = [
  {
    id: 1,
    customerId: "01",
    name: "John Mathew",
    countryCode: "+44",
    phoneNumber: "7123456789",
    totalAmount: "1250",
    status: "Paid",
  },
  {
    id: 2,
    customerId: "02",
    name: "Sarah Khan",
    countryCode: "+91",
    phoneNumber: "9876543210",
    totalAmount: "980",
    status: "Pending",
  },
  {
    id: 3,
    customerId: "03",
    name: "David Roy",
    countryCode: "+1",
    phoneNumber: "4085550199",
    totalAmount: "2430",
    status: "Unpaid",
  },
  {
    id: 4,
    customerId: "04",
    name: "Anita Joseph",
    countryCode: "+44",
    phoneNumber: "7987654321",
    totalAmount: "760",
    status: "Paid",
  },
];

const countryCodes = ["+44", "+91", "+1", "+61", "+971"];

const emptyForm = {
  name: "",
  countryCode: "+44",
  phoneNumber: "",
  totalAmount: "",
  status: "Pending" as CustomerStatus,
};

export default function CustomersPage() {
  const [customers, setCustomers] = useState<CustomerRow[]>(initialCustomers);
  const [searchTerm, setSearchTerm] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCustomerId, setEditingCustomerId] = useState<number | null>(null);
  const [formData, setFormData] = useState(emptyForm);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("customers");
    if (saved) {
      setCustomers(JSON.parse(saved));
    }
    setIsLoaded(true);
  }, []);

  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem("customers", JSON.stringify(customers));
    }
  }, [customers, isLoaded]);

  const filteredCustomers = useMemo(() => {
    const q = searchTerm.toLowerCase();

    return customers.filter(
      (customer) =>
        customer.customerId.toLowerCase().includes(q) ||
        customer.name.toLowerCase().includes(q) ||
        `${customer.countryCode} ${customer.phoneNumber}`.toLowerCase().includes(q) ||
        customer.totalAmount.toLowerCase().includes(q) ||
        customer.status.toLowerCase().includes(q)
    );
  }, [customers, searchTerm]);

  const generateCustomerId = () => {
    if (customers.length === 0) return "01";

    const maxId = Math.max(
      ...customers.map((customer) => Number(customer.customerId))
    );

    return String(maxId + 1).padStart(2, "0");
  };

  const openAddModal = () => {
    setEditingCustomerId(null);
    setFormData(emptyForm);
    setIsModalOpen(true);
  };

  const openEditModal = (customer: CustomerRow) => {
    setEditingCustomerId(customer.id);
    setFormData({
      name: customer.name,
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

  const handleDelete = (id: number) => {
    setCustomers((prev) => prev.filter((customer) => customer.id !== id));
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

  const handleSave = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (
      !formData.name.trim() ||
      !formData.phoneNumber.trim() ||
      !formData.totalAmount.trim()
    ) {
      return;
    }

    if (editingCustomerId !== null) {
      setCustomers((prev) =>
        prev.map((customer) =>
          customer.id === editingCustomerId
            ? {
                ...customer,
                name: formData.name,
                countryCode: formData.countryCode,
                phoneNumber: formData.phoneNumber,
                totalAmount: formData.totalAmount,
                status: formData.status,
              }
            : customer
        )
      );
    } else {
      const newCustomer: CustomerRow = {
        id: Date.now(),
        customerId: generateCustomerId(),
        name: formData.name,
        countryCode: formData.countryCode,
        phoneNumber: formData.phoneNumber,
        totalAmount: formData.totalAmount,
        status: formData.status,
      };

      setCustomers((prev) => [newCustomer, ...prev]);
    }

    closeModal();
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
              {filteredCustomers.length > 0 ? (
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
                    colSpan={6}
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