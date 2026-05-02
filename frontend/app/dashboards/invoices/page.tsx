"use client";

import { useEffect, useMemo, useState } from "react";
import { Plus, Pencil, Trash2, Search, X, FileDown } from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

type InvoiceStatus = "Paid" | "Pending" | "Overdue";

type InvoiceRow = {
  id: number;
  invoiceId: string;
  customerName: string;
  amount: string;
  status: InvoiceStatus;
};

const initialInvoices: InvoiceRow[] = [
  {
    id: 1,
    invoiceId: "INV-01",
    customerName: "John Mathew",
    amount: "1250",
    status: "Paid",
  },
  {
    id: 2,
    invoiceId: "INV-02",
    customerName: "Sarah Khan",
    amount: "980",
    status: "Pending",
  },
];

const emptyForm = {
  customerName: "",
  amount: "",
  status: "Pending" as InvoiceStatus,
};

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<InvoiceRow[]>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("invoices");
      return saved ? JSON.parse(saved) : initialInvoices;
    }
    return initialInvoices;
  });

  useEffect(() => {
    localStorage.setItem("invoices", JSON.stringify(invoices));
  }, [invoices]);

  const [searchTerm, setSearchTerm] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingInvoiceId, setEditingInvoiceId] = useState<number | null>(null);
  const [formData, setFormData] = useState(emptyForm);

  const filteredInvoices = useMemo(() => {
    const q = searchTerm.toLowerCase();

    return invoices.filter(
      (invoice) =>
        invoice.invoiceId.toLowerCase().includes(q) ||
        invoice.customerName.toLowerCase().includes(q) ||
        invoice.status.toLowerCase().includes(q) ||
        invoice.amount.toLowerCase().includes(q)
    );
  }, [invoices, searchTerm]);

  const generateInvoiceId = () => {
    if (invoices.length === 0) return "INV-01";

    const maxId = Math.max(
      ...invoices.map((invoice) =>
        Number(invoice.invoiceId.replace("INV-", ""))
      )
    );

    return `INV-${String(maxId + 1).padStart(2, "0")}`;
  };

  const openAddModal = () => {
    setEditingInvoiceId(null);
    setFormData(emptyForm);
    setIsModalOpen(true);
  };

  const openEditModal = (invoice: InvoiceRow) => {
    setEditingInvoiceId(invoice.id);
    setFormData({
      customerName: invoice.customerName,
      amount: invoice.amount,
      status: invoice.status,
    });
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingInvoiceId(null);
    setFormData(emptyForm);
  };

  const handleDelete = (id: number) => {
    setInvoices((prev) => prev.filter((invoice) => invoice.id !== id));
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSave = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!formData.customerName.trim() || !formData.amount.trim()) return;

    if (editingInvoiceId !== null) {
      setInvoices((prev) =>
        prev.map((invoice) =>
          invoice.id === editingInvoiceId
            ? {
                ...invoice,
                customerName: formData.customerName,
                amount: formData.amount,
                status: formData.status,
              }
            : invoice
        )
      );
    } else {
      const newInvoice: InvoiceRow = {
        id: Date.now(),
        invoiceId: generateInvoiceId(),
        customerName: formData.customerName,
        amount: formData.amount,
        status: formData.status,
      };

      setInvoices((prev) => [newInvoice, ...prev]);
    }

    closeModal();
  };

  const handleDownloadPdf = (invoice: InvoiceRow) => {
    const doc = new jsPDF();

    doc.setFontSize(18);
    doc.text("DIFMS Invoice", 14, 18);

    autoTable(doc, {
      startY: 30,
      head: [["Invoice ID", "Customer Name", "Amount", "Status"]],
      body: [[invoice.invoiceId, invoice.customerName, `£${invoice.amount}`, invoice.status]],
      theme: "grid",
      headStyles: {
        fillColor: [37, 99, 235],
        textColor: 255,
        fontStyle: "bold",
      },
      bodyStyles: {
        textColor: 30,
      },
      styles: {
        halign: "left",
        valign: "middle",
        lineColor: [200, 200, 200],
        lineWidth: 0.2,
      },
    });

    doc.save(`${invoice.invoiceId}.pdf`);
  };

  const getStatusClasses = (status: InvoiceStatus) => {
    switch (status) {
      case "Paid":
        return "bg-green-100 text-green-700";
      case "Pending":
        return "bg-orange-100 text-orange-700";
      case "Overdue":
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
            Invoices
          </h1>
          <p className="mt-2 text-sm text-slate-300 sm:text-base">
            Manage invoice entries and download invoice PDFs.
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
              placeholder="Search invoices..."
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
            <span>Add Invoice</span>
          </button>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-700 bg-slate-800 p-5 text-white shadow-lg">
        <div className="mb-4">
          <h2 className="text-xl font-semibold">Invoice Records</h2>
          <p className="mt-1 text-sm text-slate-300">
            View, edit, delete, and download invoice details.
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
                <th className="px-4 text-left text-sm font-semibold text-slate-400">
                  Actions
                </th>
              </tr>
            </thead>

            <tbody>
              {filteredInvoices.length > 0 ? (
                filteredInvoices.map((invoice) => (
                  <tr
                    key={invoice.id}
                    className="rounded-xl bg-slate-700/40 transition duration-200 hover:bg-slate-700/60"
                  >
                    <td className="rounded-l-xl px-4 py-4 text-sm font-medium text-slate-100">
                      {invoice.invoiceId}
                    </td>
                    <td className="px-4 py-4 text-sm text-slate-200">
                      {invoice.customerName}
                    </td>
                    <td className="px-4 py-4 text-sm font-semibold text-white">
                      £{invoice.amount}
                    </td>
                    <td className="px-4 py-4">
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold ${getStatusClasses(
                          invoice.status
                        )}`}
                      >
                        {invoice.status}
                      </span>
                    </td>
                    <td className="rounded-r-xl px-4 py-4">
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => openEditModal(invoice)}
                          className="cursor-pointer rounded-lg bg-blue-500/10 p-2 text-blue-400 transition hover:bg-blue-500/20"
                          aria-label={`Edit ${invoice.invoiceId}`}
                        >
                          <Pencil size={16} />
                        </button>

                        <button
                          onClick={() => handleDownloadPdf(invoice)}
                          className="cursor-pointer rounded-lg bg-emerald-500/10 p-2 text-emerald-400 transition hover:bg-emerald-500/20"
                          aria-label={`Download PDF ${invoice.invoiceId}`}
                        >
                          <FileDown size={16} />
                        </button>

                        <button
                          onClick={() => handleDelete(invoice.id)}
                          className="cursor-pointer rounded-lg bg-red-500/10 p-2 text-red-400 transition hover:bg-red-500/20"
                          aria-label={`Delete ${invoice.invoiceId}`}
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
                    colSpan={5}
                    className="rounded-xl bg-slate-700/30 px-4 py-8 text-center text-sm text-slate-300"
                  >
                    No invoice records found.
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
                  {editingInvoiceId !== null ? "Edit Invoice" : "Add Invoice"}
                </h2>
                <p className="mt-1 text-sm text-slate-400">
                  Fill in the invoice details below.
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
                  Customer Name
                </label>
                <input
                  type="text"
                  name="customerName"
                  value={formData.customerName}
                  onChange={handleChange}
                  placeholder="Enter customer name"
                  className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-blue-500"
                  required
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-300">
                  Amount
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm text-slate-400">
                    £
                  </span>
                  <input
                    type="text"
                    name="amount"
                    value={formData.amount}
                    onChange={handleChange}
                    placeholder="Enter amount"
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
                  <option value="Pending">Pending</option>
                  <option value="Overdue">Overdue</option>
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
                  {editingInvoiceId !== null ? "Update" : "Save"}
                </button>
              </div>
            </form>
          </div>
        </>
      )}
    </div>
  );
}