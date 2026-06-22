"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Building2,
  Pencil,
  Plus,
  Search,
  ShieldCheck,
  Trash2,
  X,
} from "lucide-react";
import { apiRequest } from "../../../difm/lib/api";
import { CurrencyCode, currencyOptions, normalizeCurrency } from "../../../difm/lib/currencies";

type OrganizationStatus = "active" | "inactive" | "suspended";

type OrganizationRow = {
  _id: string;
  name: string;
  slug: string;
  email?: string;
  phone?: string;
  address?: string;
  logoUrl?: string;
  currency: CurrencyCode;
  status: OrganizationStatus;
  createdAt?: string;
  owner?: {
    name?: string;
    email?: string;
  } | null;
  counts: {
    members: number;
    customers: number;
    quotes: number;
    invoices: number;
  };
};

type AuthUser = {
  email: string;
  role: string;
};

type CompanyForm = {
  name: string;
  email: string;
  phone: string;
  address: string;
  logoUrl: string;
  currency: CurrencyCode;
  status: OrganizationStatus;
};

const organizationStatuses: OrganizationStatus[] = ["active", "inactive", "suspended"];

const emptyCompanyForm: CompanyForm = {
  name: "",
  email: "",
  phone: "",
  address: "",
  logoUrl: "",
  currency: "GBP",
  status: "active",
};

const statusClassNames: Record<OrganizationStatus, string> = {
  active: "bg-emerald-100 text-emerald-700",
  inactive: "bg-slate-200 text-slate-700",
  suspended: "bg-red-100 text-red-700",
};

const formatStatus = (value: string) =>
  value
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");

const formatDate = (value?: string) => {
  if (!value) return "Not available";
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
};

export default function SuperAdminCompaniesPage() {
  const router = useRouter();
  const [organizations, setOrganizations] = useState<OrganizationRow[]>([]);
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [search, setSearch] = useState("");
  const [companyForm, setCompanyForm] = useState<CompanyForm>(emptyCompanyForm);
  const [companyFormVisible, setCompanyFormVisible] = useState(false);
  const [editingCompany, setEditingCompany] = useState<OrganizationRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [checkingAccess, setCheckingAccess] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [formSaving, setFormSaving] = useState(false);
  const [logoDragActive, setLogoDragActive] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const logoInputRef = useRef<HTMLInputElement | null>(null);
  const platformOwnerEmail = process.env.NEXT_PUBLIC_SUPER_ADMIN_CREATOR_EMAIL;
  const isPlatformOwner =
    Boolean(platformOwnerEmail) && currentUser?.email === platformOwnerEmail;

  const loadOrganizations = async () => {
    setLoading(true);
    setError("");

    try {
      const data = await apiRequest<OrganizationRow[]>("/admin/organizations");
      setOrganizations(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load companies");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const checkAccessAndLoadOrganizations = async () => {
      setCheckingAccess(true);
      setError("");

      try {
        const user = await apiRequest<AuthUser>("/auth/me");
        setCurrentUser(user);

        if (user.role !== "super_admin") {
          router.replace("/dashboards/overview");
          return;
        }

        await loadOrganizations();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unable to verify access");
      } finally {
        setCheckingAccess(false);
      }
    };

    checkAccessAndLoadOrganizations();
  }, [router]);

  const filteredOrganizations = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return organizations;

    return organizations.filter((organization) => {
      return [
        organization.name,
        organization.slug,
        organization.email,
        organization.phone,
        organization.address,
        organization.owner?.name,
        organization.owner?.email,
      ]
        .filter(Boolean)
        .some((value) => value!.toLowerCase().includes(term));
    });
  }, [organizations, search]);

  const openAddCompanyForm = () => {
    if (!isPlatformOwner) {
      setError("Only the platform owner can add companies.");
      return;
    }

    setEditingCompany(null);
    setCompanyForm(emptyCompanyForm);
    setCompanyFormVisible(true);
    setError("");
    setSuccess("");
  };

  const openEditCompanyForm = (organization: OrganizationRow) => {
    setEditingCompany(organization);
    setCompanyForm({
      name: organization.name || "",
      email: organization.email || "",
      phone: organization.phone || "",
      address: organization.address || "",
      logoUrl: organization.logoUrl || "",
      currency: normalizeCurrency(organization.currency),
      status: organization.status,
    });
    setCompanyFormVisible(true);
    setError("");
    setSuccess("");
  };

  const closeCompanyForm = () => {
    setEditingCompany(null);
    setCompanyForm(emptyCompanyForm);
    setCompanyFormVisible(false);
  };

  const handleCompanyFormChange = (field: keyof CompanyForm, value: string) => {
    setCompanyForm((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const handleLogoFile = (file?: File) => {
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("Please select an image file for the logo.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setCompanyForm((current) => ({
        ...current,
        logoUrl: String(reader.result || ""),
      }));
      setError("");
    };
    reader.readAsDataURL(file);
  };

  const handleLogoDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setLogoDragActive(false);
    handleLogoFile(event.dataTransfer.files[0]);
  };

  const handleCompanySubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!companyForm.name.trim()) {
      setError("Company name is required.");
      return;
    }

    if (!editingCompany && !isPlatformOwner) {
      setError("Only the platform owner can add companies.");
      return;
    }

    setFormSaving(true);
    setError("");
    setSuccess("");

    const payload = {
      ...companyForm,
      name: companyForm.name.trim(),
      email: companyForm.email.trim(),
      phone: companyForm.phone.trim(),
      address: companyForm.address.trim(),
      logoUrl: companyForm.logoUrl.trim(),
    };

    try {
      if (editingCompany) {
        const updated = await apiRequest<OrganizationRow>(
          `/admin/organizations/${editingCompany._id}`,
          {
            method: "PATCH",
            body: JSON.stringify(payload),
          }
        );

        setOrganizations((current) =>
          current.map((organization) =>
            organization._id === updated._id ? updated : organization
          )
        );
        setSuccess("Company updated successfully.");
      } else {
        const created = await apiRequest<OrganizationRow>("/admin/organizations", {
          method: "POST",
          body: JSON.stringify(payload),
        });

        setOrganizations((current) => [created, ...current]);
        setSuccess("Company added successfully.");
      }

      closeCompanyForm();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save company");
    } finally {
      setFormSaving(false);
    }
  };

  const handleStatusUpdate = async (
    organizationId: string,
    status: OrganizationStatus
  ) => {
    setSavingId(organizationId);
    setError("");
    setSuccess("");

    try {
      const updated = await apiRequest<OrganizationRow>(`/admin/organizations/${organizationId}`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });

      setOrganizations((current) =>
        current.map((organization) =>
          organization._id === organizationId ? updated : organization
        )
      );
      setSuccess("Company access updated successfully.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to update company");
    } finally {
      setSavingId(null);
    }
  };

  const handleDeleteCompany = async (organization: OrganizationRow) => {
    const confirmed = window.confirm(
      `Remove ${organization.name}? This will remove the company and its customers, quotes, invoices, payments, and receipts.`
    );

    if (!confirmed) return;

    setSavingId(organization._id);
    setError("");
    setSuccess("");

    try {
      await apiRequest(`/admin/organizations/${organization._id}`, {
        method: "DELETE",
      });

      setOrganizations((current) =>
        current.filter((item) => item._id !== organization._id)
      );
      setSuccess("Company removed successfully.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to remove company");
    } finally {
      setSavingId(null);
    }
  };

  if (checkingAccess) {
    return (
      <div className="mx-auto w-full max-w-7xl">
        <section className="rounded-2xl bg-slate-900/80 p-8 text-center font-semibold text-white shadow-xl ring-1 ring-white/10">
          Checking super admin access...
        </section>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6">
      <section className="flex flex-col gap-4 py-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-blue-600 text-white shadow-lg">
            <ShieldCheck size={24} />
          </div>
          <h1 className="text-2xl font-bold text-white sm:text-4xl">Companies</h1>
          <p className="mt-2 max-w-2xl text-lg text-slate-100">
            Manage business workspaces and company access.
          </p>
        </div>

        <div className="flex w-full flex-col gap-3 lg:max-w-2xl lg:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={22} />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search companies..."
              className="w-full rounded-xl border border-slate-700 bg-slate-900/80 py-4 pl-12 pr-4 text-white outline-none transition focus:border-blue-400"
            />
          </div>
          {isPlatformOwner && (
            <button
              type="button"
              onClick={openAddCompanyForm}
              className="inline-flex min-h-14 cursor-pointer items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 font-bold text-white shadow-lg transition hover:bg-blue-500"
            >
              <Plus size={20} />
              Add Company
            </button>
          )}
        </div>
      </section>

      {error && (
        <div className="rounded-xl border border-red-400 bg-red-500/20 px-5 py-4 font-semibold text-white">
          {error}
        </div>
      )}

      {success && (
        <div className="rounded-xl border border-emerald-400 bg-emerald-500/20 px-5 py-4 font-semibold text-white">
          {success}
        </div>
      )}

      {companyFormVisible && (
        <section className="rounded-2xl bg-slate-900/80 p-5 shadow-xl ring-1 ring-white/10">
          <div className="mb-5 flex items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold text-white">
                {editingCompany ? "Edit Company" : "Add Company"}
              </h2>
              <p className="text-slate-200">Company profile and workspace access details.</p>
            </div>
            <button
              type="button"
              onClick={closeCompanyForm}
              className="cursor-pointer rounded-lg p-2 text-slate-300 transition hover:bg-slate-700 hover:text-white"
              aria-label="Close company form"
            >
              <X size={22} />
            </button>
          </div>

          <form onSubmit={handleCompanySubmit} className="grid gap-4 md:grid-cols-2">
            <label className="space-y-2">
              <span className="text-sm font-bold uppercase tracking-wide text-slate-300">
                Company Name
              </span>
              <input
                value={companyForm.name}
                onChange={(event) => handleCompanyFormChange("name", event.target.value)}
                className="min-h-12 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 text-white outline-none transition focus:border-blue-400"
              />
            </label>

            <label className="space-y-2">
              <span className="text-sm font-bold uppercase tracking-wide text-slate-300">
                Email
              </span>
              <input
                type="email"
                value={companyForm.email}
                onChange={(event) => handleCompanyFormChange("email", event.target.value)}
                className="min-h-12 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 text-white outline-none transition focus:border-blue-400"
              />
            </label>

            <label className="space-y-2">
              <span className="text-sm font-bold uppercase tracking-wide text-slate-300">
                Phone
              </span>
              <input
                value={companyForm.phone}
                onChange={(event) => handleCompanyFormChange("phone", event.target.value)}
                className="min-h-12 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 text-white outline-none transition focus:border-blue-400"
              />
            </label>

            <label className="space-y-2">
              <span className="text-sm font-bold uppercase tracking-wide text-slate-300">
                Currency
              </span>
              <select
                value={companyForm.currency}
                onChange={(event) =>
                  handleCompanyFormChange("currency", event.target.value)
                }
                className="min-h-12 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 text-white outline-none transition focus:border-blue-400"
              >
                {currencyOptions.map((currency) => (
                  <option key={currency.value} value={currency.value}>
                    {currency.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="space-y-2">
              <span className="text-sm font-bold uppercase tracking-wide text-slate-300">
                Status
              </span>
              <select
                value={companyForm.status}
                onChange={(event) =>
                  handleCompanyFormChange("status", event.target.value as OrganizationStatus)
                }
                className="min-h-12 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 text-white outline-none transition focus:border-blue-400"
              >
                {organizationStatuses.map((status) => (
                  <option key={status} value={status}>
                    {formatStatus(status)}
                  </option>
                ))}
              </select>
            </label>

            <div className="space-y-2">
              <span className="text-sm font-bold uppercase tracking-wide text-slate-300">
                Logo
              </span>
              <div
                onDragOver={(event) => {
                  event.preventDefault();
                  setLogoDragActive(true);
                }}
                onDragLeave={() => setLogoDragActive(false)}
                onDrop={handleLogoDrop}
                className={`rounded-xl border border-dashed p-4 transition ${
                  logoDragActive
                    ? "border-blue-400 bg-blue-500/10"
                    : "border-slate-700 bg-slate-950"
                }`}
              >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                  <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-slate-800">
                    {companyForm.logoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={companyForm.logoUrl}
                        alt="Company logo preview"
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <span className="text-xs font-bold uppercase tracking-wide text-slate-400">
                        Logo
                      </span>
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-white">
                      Drag and drop an image here
                    </p>
                    <p className="mt-1 text-sm text-slate-400">
                      Or select an image from your system.
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => logoInputRef.current?.click()}
                        className="cursor-pointer rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-500"
                      >
                        Select Image
                      </button>
                      {companyForm.logoUrl && (
                        <button
                          type="button"
                          onClick={() => handleCompanyFormChange("logoUrl", "")}
                          className="cursor-pointer rounded-lg border border-slate-600 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:bg-slate-800"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                <input
                  ref={logoInputRef}
                  type="file"
                  accept="image/*"
                  onChange={(event) => handleLogoFile(event.target.files?.[0])}
                  className="hidden"
                />
              </div>
            </div>

            <label className="space-y-2 md:col-span-2">
              <span className="text-sm font-bold uppercase tracking-wide text-slate-300">
                Address
              </span>
              <textarea
                value={companyForm.address}
                onChange={(event) => handleCompanyFormChange("address", event.target.value)}
                rows={3}
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none transition focus:border-blue-400"
              />
            </label>

            <div className="flex justify-end gap-3 md:col-span-2">
              <button
                type="button"
                onClick={closeCompanyForm}
                className="min-h-12 cursor-pointer rounded-xl border border-slate-600 px-5 font-bold text-slate-200 transition hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={formSaving}
                className="min-h-12 cursor-pointer rounded-xl bg-blue-600 px-6 font-bold text-white shadow-lg transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {formSaving ? "Saving..." : editingCompany ? "Update Company" : "Create Company"}
              </button>
            </div>
          </form>
        </section>
      )}

      <section className="rounded-2xl bg-slate-900/80 p-5 shadow-xl ring-1 ring-white/10">
        <div className="mb-5 flex items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-white">Company Records</h2>
            <p className="mt-1 text-slate-200">
              {filteredOrganizations.length} companies found.
            </p>
          </div>
          <Building2 className="text-blue-300" size={28} />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-max border-separate border-spacing-y-3 text-left">
            <thead>
              <tr className="text-sm font-semibold uppercase tracking-wide text-slate-400">
                <th className="px-4 py-2">Company</th>
                <th className="px-4 py-2">Contact</th>
                <th className="px-4 py-2">Owner</th>
                <th className="px-4 py-2">Currency</th>
                <th className="px-4 py-2">Usage</th>
                <th className="px-4 py-2">Created</th>
                <th className="px-4 py-2">Access</th>
                <th className="px-4 py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} className="rounded-xl bg-slate-800 px-4 py-8 text-center text-white">
                    Loading companies...
                  </td>
                </tr>
              ) : filteredOrganizations.length === 0 ? (
                <tr>
                  <td colSpan={8} className="rounded-xl bg-slate-800 px-4 py-8 text-center text-white">
                    No companies found.
                  </td>
                </tr>
              ) : (
                filteredOrganizations.map((organization) => (
                  <tr key={organization._id} className="bg-slate-800 text-white">
                    <td className="rounded-l-xl px-4 py-4">
                      <div className="flex items-center gap-3">
                        {organization.logoUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={organization.logoUrl}
                            alt={`${organization.name} logo`}
                            className="h-10 w-10 rounded-lg object-cover"
                          />
                        ) : (
                          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-600 text-sm font-bold">
                            {organization.name.slice(0, 2).toUpperCase()}
                          </div>
                        )}
                        <div>
                          <p className="font-bold">{organization.name}</p>
                          <p className="text-sm text-slate-300">{organization.slug}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-sm text-slate-200">
                      <p>{organization.email || "No email"}</p>
                      <p>{organization.phone || "No phone"}</p>
                      <p className="max-w-[220px] truncate">{organization.address || "No address"}</p>
                    </td>
                    <td className="px-4 py-4">
                      <p className="font-semibold">{organization.owner?.name || "No owner"}</p>
                      <p className="text-sm text-slate-300">{organization.owner?.email || "Not available"}</p>
                    </td>
                    <td className="px-4 py-4 font-semibold">{organization.currency}</td>
                    <td className="px-4 py-4 text-sm text-slate-200">
                      <div className="grid gap-2 sm:grid-cols-2">
                        <span>{organization.counts.members} members</span>
                        <span>{organization.counts.customers} customers</span>
                        <span>{organization.counts.quotes} quotes</span>
                        <span>{organization.counts.invoices} invoices</span>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-sm text-slate-200">{formatDate(organization.createdAt)}</td>
                    <td className="px-4 py-4">
                      <div className="space-y-2">
                        <span
                          className={`inline-flex rounded-full px-3 py-1 text-sm font-bold ${
                            statusClassNames[organization.status]
                          }`}
                        >
                          {formatStatus(organization.status)}
                        </span>
                        <select
                          value={organization.status}
                          disabled={savingId === organization._id}
                          onChange={(event) =>
                            handleStatusUpdate(
                              organization._id,
                              event.target.value as OrganizationStatus
                            )
                          }
                          className="block w-full rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-sm text-white outline-none focus:border-blue-400 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {organizationStatuses.map((status) => (
                            <option key={status} value={status}>
                              {formatStatus(status)}
                            </option>
                          ))}
                        </select>
                      </div>
                    </td>
                    <td className="rounded-r-xl px-4 py-4">
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => openEditCompanyForm(organization)}
                          className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-lg bg-blue-600/20 text-blue-300 transition hover:bg-blue-600 hover:text-white"
                          aria-label={`Edit ${organization.name}`}
                        >
                          <Pencil size={18} />
                        </button>
                        <button
                          type="button"
                          disabled={savingId === organization._id}
                          onClick={() => handleDeleteCompany(organization)}
                          className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-lg bg-red-600/20 text-red-300 transition hover:bg-red-600 hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
                          aria-label={`Remove ${organization.name}`}
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
