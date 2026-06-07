"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  FilePlus2,
  Mail,
  Pencil,
  Plus,
  Search,
  X,
} from "lucide-react";
import { apiRequest } from "../../difm/lib/api";

type CurrencyCode = "GBP" | "ZMW";
type QuoteStatus = "draft" | "sent" | "accepted" | "rejected" | "expired" | "converted";

type CustomerResponse = {
  _id: string;
  name: string;
  email?: string;
  phone?: string;
  phoneNumber?: string;
};

type QuoteItem = {
  name: string;
  quantity: string;
  price: string;
};

type QuoteResponse = {
  _id: string;
  quoteNumber: string;
  customer?: CustomerResponse;
  items: Array<{
    name?: string;
    quantity?: number;
    price?: number;
    total?: number;
  }>;
  currency?: CurrencyCode;
  subtotal: number;
  tax?: number;
  discount?: number;
  total: number;
  status: QuoteStatus;
  createdAt?: string;
};

type UserResponse = {
  currency?: CurrencyCode;
};

const currencyOptions: Array<{ value: CurrencyCode; label: string }> = [
  { value: "GBP", label: "GBP (£)" },
  { value: "ZMW", label: "ZMW (K)" },
];

const emptyForm = {
  customer: "",
  currency: "GBP" as CurrencyCode,
  items: [{ name: "", quantity: "1", price: "" }] as QuoteItem[],
};

const formatCurrency = (amount: number, currency: CurrencyCode = "GBP") => {
  if (currency === "ZMW") return `K${Number(amount || 0).toFixed(2)}`;

  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
  }).format(Number(amount) || 0);
};

const toUiStatus = (status: QuoteStatus) => {
  if (status === "draft" || status === "sent") return "Pending";
  if (status === "accepted") return "Accepted";
  if (status === "rejected") return "Rejected";
  if (status === "converted") return "Converted";
  return "Expired";
};

export default function QuotesPage() {
  const [quotes, setQuotes] = useState<QuoteResponse[]>([]);
  const [customers, setCustomers] = useState<CustomerResponse[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [customerSearch, setCustomerSearch] = useState("");
  const [formData, setFormData] = useState(emptyForm);
  const [editingQuoteId, setEditingQuoteId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [sendingQuoteId, setSendingQuoteId] = useState<string | null>(null);
  const [convertingQuoteId, setConvertingQuoteId] = useState<string | null>(null);
  const [defaultCurrency, setDefaultCurrency] = useState<CurrencyCode>("GBP");

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError("");
      const [quoteData, customerData, userData] = await Promise.all([
        apiRequest<QuoteResponse[]>("/quotes"),
        apiRequest<CustomerResponse[]>("/customers"),
        apiRequest<UserResponse>("/auth/me"),
      ]);
      setQuotes(quoteData);
      setCustomers(customerData);
      setDefaultCurrency(userData.currency || "GBP");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load quotes");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const filteredQuotes = useMemo(() => {
    const query = searchTerm.toLowerCase();

    return quotes.filter(
      (quote) =>
        quote.quoteNumber.toLowerCase().includes(query) ||
        quote.customer?.name?.toLowerCase().includes(query) ||
        toUiStatus(quote.status).toLowerCase().includes(query) ||
        quote.items.some((item) => item.name?.toLowerCase().includes(query))
    );
  }, [quotes, searchTerm]);

  const filteredCustomers = useMemo(() => {
    const query = customerSearch.toLowerCase();

    return customers.filter(
      (customer) =>
        customer.name.toLowerCase().includes(query) ||
        customer.email?.toLowerCase().includes(query) ||
        customer.phone?.toLowerCase().includes(query) ||
        customer.phoneNumber?.toLowerCase().includes(query)
    );
  }, [customers, customerSearch]);

  const quoteTotal = useMemo(() => {
    return formData.items.reduce((sum, item) => {
      return sum + (Number(item.quantity) || 0) * (Number(item.price) || 0);
    }, 0);
  }, [formData.items]);

  const openAddModal = () => {
    setEditingQuoteId(null);
    setFormData({ ...emptyForm, currency: defaultCurrency });
    setCustomerSearch("");
    setIsModalOpen(true);
  };

  const openEditModal = (quote: QuoteResponse) => {
    setEditingQuoteId(quote._id);
    setFormData({
      customer: quote.customer?._id || "",
      currency: quote.currency || "GBP",
      items:
        quote.items.length > 0
          ? quote.items.map((item) => ({
              name: item.name || "",
              quantity: String(item.quantity || 1),
              price: String(item.price || ""),
            }))
          : [{ name: "", quantity: "1", price: "" }],
    });
    setCustomerSearch(quote.customer?.name || "");
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingQuoteId(null);
    setFormData(emptyForm);
    setCustomerSearch("");
  };

  const handleItemChange = (index: number, field: keyof QuoteItem, value: string) => {
    setFormData((prev) => ({
      ...prev,
      items: prev.items.map((item, itemIndex) =>
        itemIndex === index
          ? { ...item, [field]: field === "name" ? value : value.replace(/[^\d.]/g, "") }
          : item
      ),
    }));
  };

  const addItem = () => {
    setFormData((prev) => ({
      ...prev,
      items: [...prev.items, { name: "", quantity: "1", price: "" }],
    }));
  };

  const removeItem = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      items:
        prev.items.length > 1
          ? prev.items.filter((_, itemIndex) => itemIndex !== index)
          : [{ name: "", quantity: "1", price: "" }],
    }));
  };

  const handleSave = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const validItems = formData.items.filter(
      (item) => item.name.trim() && Number(item.quantity) > 0 && Number(item.price) >= 0
    );

    if (!formData.customer || validItems.length === 0) return;

    try {
      setError("");
      setSuccessMessage("");

      const payload = {
        customer: formData.customer,
        currency: formData.currency,
        items: validItems.map((item) => ({
          name: item.name.trim(),
          quantity: Number(item.quantity),
          price: Number(item.price),
        })),
      };

      if (editingQuoteId) {
        await apiRequest<QuoteResponse>(`/quotes/${editingQuoteId}`, {
          method: "PUT",
          body: JSON.stringify(payload),
        });
      } else {
        await apiRequest<QuoteResponse>("/quotes", {
          method: "POST",
          body: JSON.stringify(payload),
        });
      }

      await loadData();
      closeModal();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save quote");
    }
  };

  const handleSendQuote = async (quote: QuoteResponse) => {
    try {
      setError("");
      setSuccessMessage("");
      setSendingQuoteId(quote._id);
      const response = await apiRequest<{ message: string }>(`/quotes/${quote._id}/send`, {
        method: "POST",
      });
      setSuccessMessage(response.message);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send quote");
    } finally {
      setSendingQuoteId(null);
    }
  };

  const handleConvertQuote = async (quote: QuoteResponse) => {
    try {
      setError("");
      setSuccessMessage("");
      setConvertingQuoteId(quote._id);
      await apiRequest(`/quotes/${quote._id}/convert-to-invoice`, {
        method: "POST",
        body: JSON.stringify({}),
      });
      setSuccessMessage("Quote converted to invoice and payment email sent");
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to convert quote");
    } finally {
      setConvertingQuoteId(null);
    }
  };

  const statusClasses = (status: QuoteStatus) => {
    switch (status) {
      case "accepted":
        return "bg-green-100 text-green-700";
      case "rejected":
        return "bg-red-100 text-red-700";
      case "converted":
        return "bg-blue-100 text-blue-700";
      case "expired":
        return "bg-slate-200 text-slate-700";
      default:
        return "bg-orange-100 text-orange-700";
    }
  };

  return (
    <div className="min-h-screen">
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white sm:text-4xl">Quotes</h1>
          <p className="mt-2 text-sm text-slate-300 sm:text-base">
            Create quote line items for existing customers.
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
              placeholder="Search quotes..."
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              className="w-full rounded-xl border border-slate-700 bg-slate-800 py-3 pl-10 pr-4 text-sm text-white outline-none transition placeholder:text-slate-400 focus:border-blue-500"
            />
          </div>

          <button
            onClick={openAddModal}
            className="flex cursor-pointer items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-md transition hover:bg-blue-700"
          >
            <FilePlus2 size={18} />
            Add Quote
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
          <h2 className="text-xl font-semibold">Quote Records</h2>
          <p className="mt-1 text-sm text-slate-300">
            Send quotes and convert accepted quotes into invoices.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-full border-separate border-spacing-y-3">
            <thead>
              <tr>
                {["Quote ID", "Customer", "Services", "Amount", "Status", "Actions"].map(
                  (heading) => (
                    <th
                      key={heading}
                      className="px-4 text-left text-sm font-semibold text-slate-400"
                    >
                      {heading}
                    </th>
                  )
                )}
              </tr>
            </thead>

            <tbody>
              {isLoading ? (
                <tr>
                  <td
                    colSpan={6}
                    className="rounded-xl bg-slate-700/30 px-4 py-8 text-center text-sm text-slate-300"
                  >
                    Loading quotes...
                  </td>
                </tr>
              ) : filteredQuotes.length > 0 ? (
                filteredQuotes.map((quote) => (
                  <tr
                    key={quote._id}
                    className="rounded-xl bg-slate-700/40 transition duration-200 hover:bg-slate-700/60"
                  >
                    <td className="rounded-l-xl px-4 py-4 text-sm font-medium text-slate-100">
                      {quote.quoteNumber}
                    </td>
                    <td className="break-words px-4 py-4 text-sm text-slate-200">
                      {quote.customer?.name || "Unknown Customer"}
                    </td>
                    <td className="break-words px-4 py-4 text-sm text-slate-200">
                      {quote.items.map((item) => item.name).filter(Boolean).join(", ") || "-"}
                    </td>
                    <td className="px-4 py-4 text-sm font-semibold text-white">
                      {formatCurrency(quote.total, quote.currency)}
                    </td>
                    <td className="px-4 py-4">
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold ${statusClasses(
                          quote.status
                        )}`}
                      >
                        {toUiStatus(quote.status)}
                      </span>
                    </td>
                    <td className="rounded-r-xl px-4 py-4">
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => openEditModal(quote)}
                          disabled={quote.status === "converted"}
                          className="cursor-pointer rounded-lg bg-blue-500/10 p-2 text-blue-400 transition hover:bg-blue-500/20 disabled:cursor-not-allowed disabled:opacity-40"
                          aria-label={`Edit ${quote.quoteNumber}`}
                        >
                          <Pencil size={16} />
                        </button>

                        <button
                          onClick={() => handleSendQuote(quote)}
                          disabled={sendingQuoteId === quote._id || quote.status === "converted"}
                          className="cursor-pointer rounded-lg bg-emerald-500/10 p-2 text-emerald-400 transition hover:bg-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-40"
                          aria-label={`Send ${quote.quoteNumber}`}
                          title="Send quote"
                        >
                          <Mail size={16} />
                        </button>

                        <button
                          onClick={() => handleConvertQuote(quote)}
                          disabled={
                            quote.status !== "accepted" || convertingQuoteId === quote._id
                          }
                          className="cursor-pointer rounded-lg bg-sky-500/10 p-2 text-sky-400 transition hover:bg-sky-500/20 disabled:cursor-not-allowed disabled:opacity-40"
                          aria-label={`Convert ${quote.quoteNumber} to invoice`}
                          title={
                            quote.status === "accepted"
                              ? "Convert to invoice"
                              : "Available after customer accepts"
                          }
                        >
                          <CheckCircle2 size={16} />
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
                    No quotes found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <>
          <div className="fixed inset-0 z-40 bg-black/50" onClick={closeModal} />
          <div className="fixed inset-x-4 top-4 z-50 max-h-[calc(100dvh-2rem)] overflow-y-auto rounded-2xl border border-slate-700 bg-slate-900 p-4 text-white shadow-2xl sm:left-1/2 sm:top-1/2 sm:max-w-3xl sm:-translate-x-1/2 sm:-translate-y-1/2 sm:p-6">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-semibold">
                  {editingQuoteId ? "Edit Quote" : "Add Quote"}
                </h2>
                <p className="mt-1 text-sm text-slate-400">
                  Choose a customer and add the quoted services.
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
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div className="sm:col-span-2">
                  <label className="mb-2 block text-sm font-medium text-slate-300">
                    Search Customer
                  </label>
                  <input
                    type="text"
                    value={customerSearch}
                    onChange={(event) => setCustomerSearch(event.target.value)}
                    placeholder="Search by name, email, or phone"
                    className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-300">
                    Currency
                  </label>
                  <select
                    value={formData.currency}
                    onChange={(event) =>
                      setFormData((prev) => ({
                        ...prev,
                        currency: event.target.value as CurrencyCode,
                      }))
                    }
                    className="w-full cursor-pointer rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-sm text-white outline-none transition focus:border-blue-500"
                  >
                    {currencyOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-700 bg-slate-800/60 p-4">
                <label className="mb-3 block text-sm font-medium text-slate-300">
                  Select Existing Customer
                </label>
                <div className="grid max-h-44 gap-2 overflow-y-auto pr-1 sm:grid-cols-2">
                  {filteredCustomers.map((customer) => {
                    const selected = formData.customer === customer._id;
                    return (
                      <button
                        type="button"
                        key={customer._id}
                        onClick={() => {
                          setFormData((prev) => ({ ...prev, customer: customer._id }));
                          setCustomerSearch(customer.name);
                        }}
                        className={`cursor-pointer rounded-xl border px-4 py-3 text-left transition ${
                          selected
                            ? "border-blue-400 bg-blue-500/20 text-white"
                            : "border-slate-700 bg-slate-900 text-slate-200 hover:border-slate-500"
                        }`}
                      >
                        <span className="block text-sm font-semibold">{customer.name}</span>
                        <span className="mt-1 block text-xs text-slate-400">
                          {customer.email || customer.phone || customer.phoneNumber || "-"}
                        </span>
                      </button>
                    );
                  })}
                  {filteredCustomers.length === 0 && (
                    <p className="rounded-xl bg-slate-900 px-4 py-4 text-sm text-slate-400">
                      No customers found. Create the customer first from the Customers page.
                    </p>
                  )}
                </div>
              </div>

              <div className="rounded-2xl border border-slate-700 bg-slate-800/60 p-4">
                <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-300">
                  Services / Line Items
                </h3>

                <div className="hidden grid-cols-12 gap-2 px-1 text-xs font-semibold uppercase tracking-wide text-slate-400 sm:grid">
                  <span className="col-span-6">Service</span>
                  <span className="col-span-2">Qty</span>
                  <span className="col-span-3">Unit Price</span>
                  <span />
                </div>

                <div className="mt-2 space-y-3">
                  {formData.items.map((item, index) => (
                    <div
                      key={index}
                      className="grid grid-cols-1 gap-2 sm:grid-cols-12 sm:items-center"
                    >
                      <input
                        type="text"
                        value={item.name}
                        onChange={(event) =>
                          handleItemChange(index, "name", event.target.value)
                        }
                        placeholder="Service name"
                        className="min-w-0 rounded-xl border border-slate-700 bg-slate-900 px-3 py-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-blue-500 sm:col-span-6"
                        required
                      />
                      <input
                        type="number"
                        min="1"
                        step="1"
                        value={item.quantity}
                        onChange={(event) =>
                          handleItemChange(index, "quantity", event.target.value)
                        }
                        aria-label="Quantity"
                        className="min-w-0 rounded-xl border border-slate-700 bg-slate-900 px-3 py-3 text-sm text-white outline-none transition focus:border-blue-500 sm:col-span-2"
                        required
                      />
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={item.price}
                        onChange={(event) =>
                          handleItemChange(index, "price", event.target.value)
                        }
                        placeholder="0.00"
                        aria-label="Unit price"
                        className="min-w-0 rounded-xl border border-slate-700 bg-slate-900 px-3 py-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-blue-500 sm:col-span-3"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => removeItem(index)}
                        className="cursor-pointer justify-self-end rounded-lg p-2 text-slate-400 transition hover:bg-slate-700 hover:text-red-300 sm:col-span-1 sm:justify-self-center"
                        aria-label="Remove service"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={addItem}
                  className="mt-4 flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-slate-500 py-3 text-sm font-semibold text-slate-200 transition hover:border-blue-400 hover:text-blue-300"
                >
                  <Plus size={16} />
                  Add service
                </button>

                <div className="mt-5 border-t border-slate-700 pt-4">
                  <div className="flex items-center justify-between text-sm text-slate-300">
                    <span>Subtotal</span>
                    <span>{formatCurrency(quoteTotal, formData.currency)}</span>
                  </div>
                  <div className="mt-4 border-t border-slate-500 pt-4">
                    <div className="flex items-center justify-between text-lg font-bold text-white">
                      <span>Total</span>
                      <span>{formatCurrency(quoteTotal, formData.currency)}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row">
                <button
                  type="button"
                  onClick={closeModal}
                  className="flex-1 cursor-pointer rounded-xl border border-slate-600 px-4 py-3 text-sm font-semibold text-slate-300 transition hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 cursor-pointer rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-700"
                >
                  {editingQuoteId ? "Save Quote" : "Create Quote"}
                </button>
              </div>
            </form>
          </div>
        </>
      )}
    </div>
  );
}
