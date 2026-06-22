"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Mail, Pencil, Trash2, Search, X, FileDown } from "lucide-react";
import { apiBlobRequest, apiRequest } from "../../difm/lib/api";
import { CurrencyCode, currencyOptions, formatCurrency, normalizeCurrency } from "../../difm/lib/currencies";

type InvoiceStatus = "Paid" | "Pending" | "Overdue";

type InvoiceRow = {
  id: string;
  invoiceId: string;
  customerName: string;
  amount: string;
  currency: CurrencyCode;
  status: InvoiceStatus;
};

type InvoiceResponse = {
  _id: string;
  invoiceNumber: string;
  customer?: {
    name?: string;
  };
  total: number;
  currency?: CurrencyCode;
  amountPaid?: number;
  balanceDue?: number;
  status: "draft" | "sent" | "partially_paid" | "paid" | "overdue" | "cancelled";
};

type UserResponse = {
  activeOrganization?: {
    role?: string;
  } | null;
};

const emptyForm = {
  customerName: "",
  amount: "",
  currency: "GBP" as CurrencyCode,
  status: "Pending" as InvoiceStatus,
};

const mapStatus = (invoice: InvoiceResponse): InvoiceStatus => {
  if (
    invoice.status === "paid" ||
    Number(invoice.balanceDue) <= 0 ||
    Number(invoice.amountPaid) >= Number(invoice.total)
  ) {
    return "Paid";
  }

  if (invoice.status === "overdue") return "Overdue";
  return "Pending";
};

const mapInvoice = (invoice: InvoiceResponse): InvoiceRow => ({
  id: invoice._id,
  invoiceId: invoice.invoiceNumber,
  customerName: invoice.customer?.name || "Unknown Customer",
  amount: String(invoice.total || 0),
  currency: normalizeCurrency(invoice.currency),
  status: mapStatus(invoice),
});

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<InvoiceRow[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingInvoiceId, setEditingInvoiceId] = useState<string | null>(null);
  const [formData, setFormData] = useState(emptyForm);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [sendingReceiptId, setSendingReceiptId] = useState<string | null>(null);
  const [downloadingPdfId, setDownloadingPdfId] = useState<string | null>(null);
  const [canEditWorkspace, setCanEditWorkspace] = useState(false);

  const loadInvoices = useCallback(async () => {
    try {
      setIsLoading(true);
      setError("");
      const [data, userData] = await Promise.all([
        apiRequest<InvoiceResponse[]>("/invoices"),
        apiRequest<UserResponse>("/auth/me"),
      ]);
      setCanEditWorkspace(userData.activeOrganization?.role !== "viewer");
      setInvoices(data.map(mapInvoice));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load invoices");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadInvoices();
  }, [loadInvoices]);

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

  const openEditModal = (invoice: InvoiceRow) => {
    if (!canEditWorkspace) return;
    setEditingInvoiceId(invoice.id);
    setFormData({
      customerName: invoice.customerName,
      amount: invoice.amount,
      currency: invoice.currency,
      status: invoice.status,
    });
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingInvoiceId(null);
    setFormData(emptyForm);
  };

  const handleDelete = async (id: string) => {
    if (!canEditWorkspace) {
      setError("Viewers have read-only access");
      return;
    }

    try {
      setError("");
      setSuccessMessage("");
      await apiRequest(`/invoices/${id}`, { method: "DELETE" });
      setInvoices((prev) => prev.filter((invoice) => invoice.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete invoice");
    }
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

  const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!canEditWorkspace) {
      setError("Viewers have read-only access");
      return;
    }

    if (!formData.customerName.trim() || !formData.amount.trim()) return;

    try {
      setError("");
      setSuccessMessage("");
      const payload = {
        customerName: formData.customerName,
        amount: Number(formData.amount),
        currency: formData.currency,
        status: formData.status,
      };

      if (editingInvoiceId !== null) {
        await apiRequest<InvoiceResponse>(`/invoices/${editingInvoiceId}`, {
          method: "PUT",
          body: JSON.stringify(payload),
        });
      } else {
        await apiRequest<InvoiceResponse>("/invoices", {
          method: "POST",
          body: JSON.stringify(payload),
        });
      }

      await loadInvoices();
      closeModal();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save invoice");
    }
  };

  const handleDownloadPdf = async (invoice: InvoiceRow) => {
    try {
      setError("");
      setSuccessMessage("");
      setDownloadingPdfId(invoice.id);

      const { blob, filename } = await apiBlobRequest(`/invoices/${invoice.id}/document-pdf`);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");

      link.href = url;
      link.download =
        filename || `${invoice.invoiceId}-${invoice.status === "Paid" ? "receipt" : "invoice"}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to download PDF");
    } finally {
      setDownloadingPdfId(null);
    }
  };

  const handleSendReceiptEmail = async (invoice: InvoiceRow) => {
    if (!canEditWorkspace) {
      setError("Viewers have read-only access");
      return;
    }

    try {
      setError("");
      setSuccessMessage("");
      setSendingReceiptId(invoice.id);

      const response = await apiRequest<{ message: string }>(
        `/invoices/${invoice.id}/send-receipt`,
        { method: "POST" }
      );

      setSuccessMessage(response.message);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send receipt email");
    } finally {
      setSendingReceiptId(null);
    }
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
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white sm:text-4xl">
            Invoices
          </h1>
          <p className="mt-2 text-sm text-slate-300 sm:text-base">
            Manage invoice entries and download invoice PDFs.
          </p>
        </div>

        <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center lg:items-center">
          <div className="relative w-full min-w-0 sm:flex-1 lg:max-w-sm">
            <Search
              size={18}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              type="text"
              placeholder="Search invoices..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-xl border border-slate-700 bg-slate-800 py-3 pl-10 pr-4 text-sm text-white outline-none transition placeholder:text-slate-400 focus:border-blue-500"
            />
          </div>
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
          <h2 className="text-xl font-semibold">Invoice Records</h2>
          <p className="mt-1 text-sm text-slate-300">
            View, edit, delete, and download invoice details.
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
                <th className="px-4 text-left text-sm font-semibold text-slate-400">
                  Actions
                </th>
              </tr>
            </thead>

            <tbody>
              {isLoading ? (
                <tr>
                  <td
                    colSpan={5}
                    className="rounded-xl bg-slate-700/30 px-4 py-8 text-center text-sm text-slate-300"
                  >
                    Loading invoices...
                  </td>
                </tr>
              ) : filteredInvoices.length > 0 ? (
                filteredInvoices.map((invoice) => (
                  <tr
                    key={invoice.id}
                    className="rounded-xl bg-slate-700/40 transition duration-200 hover:bg-slate-700/60"
                  >
                    <td className="rounded-l-xl px-4 py-4 text-sm font-medium text-slate-100">
                      {invoice.invoiceId}
                    </td>
                    <td className="break-words px-4 py-4 text-sm text-slate-200">
                      {invoice.customerName}
                    </td>
                    <td className="px-4 py-4 text-sm font-semibold text-white">
                      {formatCurrency(invoice.amount, invoice.currency)}
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
                        {canEditWorkspace && (
                          <button
                            onClick={() => openEditModal(invoice)}
                            className="cursor-pointer rounded-lg bg-blue-500/10 p-2 text-blue-400 transition hover:bg-blue-500/20"
                            aria-label={`Edit ${invoice.invoiceId}`}
                          >
                            <Pencil size={16} />
                          </button>
                        )}

                        <button
                          onClick={() => handleDownloadPdf(invoice)}
                          disabled={downloadingPdfId === invoice.id}
                          className="cursor-pointer rounded-lg bg-emerald-500/10 p-2 text-emerald-400 transition hover:bg-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-40"
                          aria-label={`Download PDF ${invoice.invoiceId}`}
                          title={invoice.status === "Paid" ? "Download receipt PDF" : "Download invoice PDF"}
                        >
                          <FileDown size={16} />
                        </button>

                        {canEditWorkspace && (
                          <>
                            <button
                              onClick={() => handleSendReceiptEmail(invoice)}
                              disabled={invoice.status !== "Paid" || sendingReceiptId === invoice.id}
                              className="cursor-pointer rounded-lg bg-sky-500/10 p-2 text-sky-400 transition hover:bg-sky-500/20 disabled:cursor-not-allowed disabled:opacity-40"
                              aria-label={`Email receipt for ${invoice.invoiceId}`}
                              title={
                                invoice.status === "Paid"
                                  ? "Email receipt"
                                  : "Receipt email is available after payment"
                              }
                            >
                              <Mail size={16} />
                            </button>

                            <button
                              onClick={() => handleDelete(invoice.id)}
                              className="cursor-pointer rounded-lg bg-red-500/10 p-2 text-red-400 transition hover:bg-red-500/20"
                              aria-label={`Delete ${invoice.invoiceId}`}
                            >
                              <Trash2 size={16} />
                            </button>
                          </>
                        )}
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

          <div className="fixed inset-x-4 top-4 z-50 max-h-[calc(100dvh-2rem)] overflow-y-auto rounded-2xl border border-slate-700 bg-slate-900 p-4 text-white shadow-2xl sm:left-1/2 sm:top-1/2 sm:max-w-lg sm:-translate-x-1/2 sm:-translate-y-1/2 sm:p-6">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-semibold">
                  Edit Invoice
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
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <select
                    name="currency"
                    value={formData.currency}
                    onChange={handleChange}
                    className="cursor-pointer rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-sm text-white outline-none transition focus:border-blue-500"
                  >
                    {currencyOptions.map((currency) => (
                      <option key={currency.value} value={currency.value}>
                        {currency.label}
                      </option>
                    ))}
                  </select>
                  <input
                    type="text"
                    name="amount"
                    value={formData.amount}
                    onChange={handleChange}
                    placeholder="Enter amount"
                    className="rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-blue-500 sm:col-span-2"
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

              <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end">
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
                  Update
                </button>
              </div>
            </form>
          </div>
        </>
      )}
    </div>
  );
}

