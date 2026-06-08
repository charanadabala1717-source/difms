"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Building2, ChevronDown, ImagePlus, Mail, Search, UserCog, Users, X } from "lucide-react";
import { apiRequest } from "../../difm/lib/api";

type CurrencyCode = "GBP" | "ZMW";

type OrganizationResponse = {
  _id: string;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  logoUrl?: string;
  currency?: CurrencyCode;
  taxPercentage?: number;
  discountPercentage?: number;
  role?: string;
};

type UserResponse = {
  _id: string;
  name: string;
  email: string;
  role: string;
  activeOrganization?: OrganizationResponse | null;
};

type CompanySettingsForm = {
  name: string;
  email: string;
  countryCode: string;
  phoneNumber: string;
  address: string;
  logoUrl: string;
  currency: CurrencyCode;
  taxPercentage: string;
  discountPercentage: string;
};

type TeamRole = "admin" | "staff" | "viewer";

type TeamAccessResponse = {
  members: Array<{
    _id: string;
    role: "owner" | TeamRole;
    status: string;
    user: {
      _id: string;
      name: string;
      email: string;
    } | null;
  }>;
  invitations: Array<{
    _id: string;
    email: string;
    role: TeamRole;
    status: string;
    expiresAt: string;
  }>;
};

type UserSuggestion = {
  _id: string;
  name: string;
  email: string;
};

const platformOwnerEmail = process.env.NEXT_PUBLIC_SUPER_ADMIN_CREATOR_EMAIL;

const emptyCompanySettings: CompanySettingsForm = {
  name: "",
  email: "",
  countryCode: "+44",
  phoneNumber: "",
  address: "",
  logoUrl: "",
  currency: "GBP",
  taxPercentage: "0",
  discountPercentage: "0",
};

const currencies: Array<{ value: CurrencyCode; label: string }> = [
  { value: "GBP", label: "GBP" },
  { value: "ZMW", label: "ZMW (K)" },
];

const teamRoles: Array<{ value: TeamRole; label: string; description: string }> = [
  {
    value: "admin",
    label: "Admin",
    description: "Can manage company settings and invite users.",
  },
  {
    value: "staff",
    label: "Staff",
    description: "Can work with customers, quotes, invoices, and payments.",
  },
  {
    value: "viewer",
    label: "Viewer",
    description: "Read-only workspace access.",
  },
];

const countryCodes = [
  { code: "+1", label: "Canada / United States" },
  { code: "+20", label: "Egypt" },
  { code: "+27", label: "South Africa" },
  { code: "+30", label: "Greece" },
  { code: "+31", label: "Netherlands" },
  { code: "+32", label: "Belgium" },
  { code: "+33", label: "France" },
  { code: "+34", label: "Spain" },
  { code: "+39", label: "Italy" },
  { code: "+44", label: "United Kingdom" },
  { code: "+49", label: "Germany" },
  { code: "+52", label: "Mexico" },
  { code: "+61", label: "Australia" },
  { code: "+64", label: "New Zealand" },
  { code: "+81", label: "Japan" },
  { code: "+86", label: "China" },
  { code: "+91", label: "India" },
  { code: "+234", label: "Nigeria" },
  { code: "+254", label: "Kenya" },
  { code: "+260", label: "Zambia" },
  { code: "+263", label: "Zimbabwe" },
  { code: "+971", label: "United Arab Emirates" },
];

const splitPhoneNumber = (phone = "") => {
  const trimmedPhone = phone.trim();
  const matchedCountry = [...countryCodes]
    .sort((a, b) => b.code.length - a.code.length)
    .find((country) => trimmedPhone.startsWith(country.code));

  return {
    countryCode: matchedCountry?.code || "+44",
    phoneNumber: matchedCountry
      ? trimmedPhone.slice(matchedCountry.code.length).trim()
      : trimmedPhone,
  };
};

export default function SettingsPage() {
  const router = useRouter();
  const logoInputRef = useRef<HTMLInputElement | null>(null);
  const [user, setUser] = useState<UserResponse | null>(null);
  const [formData, setFormData] = useState<CompanySettingsForm>(emptyCompanySettings);
  const [isLoading, setIsLoading] = useState(true);
  const [hasSettingsAccess, setHasSettingsAccess] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [logoDragActive, setLogoDragActive] = useState(false);
  const [countrySearch, setCountrySearch] = useState("");
  const [isCountryDropdownOpen, setIsCountryDropdownOpen] = useState(false);
  const [teamAccess, setTeamAccess] = useState<TeamAccessResponse>({
    members: [],
    invitations: [],
  });
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<TeamRole>("staff");
  const [userSuggestions, setUserSuggestions] = useState<UserSuggestion[]>([]);
  const [showUserSuggestions, setShowUserSuggestions] = useState(false);
  const [isInviting, setIsInviting] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const canEditCompany =
    user?.activeOrganization?.role === "owner" || user?.activeOrganization?.role === "admin";
  const isPlatformOwner = Boolean(platformOwnerEmail) && user?.email === platformOwnerEmail;

  const loadTeamAccess = async () => {
    const access = await apiRequest<TeamAccessResponse>("/organization/members");
    setTeamAccess(access);
  };

  useEffect(() => {
    const loadSettings = async () => {
      try {
        setIsLoading(true);
        setError("");
        const currentUser = await apiRequest<UserResponse>("/auth/me");
        const company = currentUser.activeOrganization;
        const phoneParts = splitPhoneNumber(company?.phone || "");

        const canAccessSettings =
          company?.role === "owner" ||
          company?.role === "admin" ||
          (platformOwnerEmail && currentUser.email === platformOwnerEmail);

        if (!canAccessSettings) {
          setHasSettingsAccess(false);
          router.replace("/dashboards/overview");
          return;
        }

        setHasSettingsAccess(true);
        setUser(currentUser);
        setFormData({
          name: company?.name || "",
          email: company?.email || "",
          countryCode: phoneParts.countryCode,
          phoneNumber: phoneParts.phoneNumber,
          address: company?.address || "",
          logoUrl: company?.logoUrl || "",
          currency: company?.currency || "GBP",
          taxPercentage: String(company?.taxPercentage ?? 0),
          discountPercentage: String(company?.discountPercentage ?? 0),
        });

        if (company?.role === "owner" || company?.role === "admin") {
          await loadTeamAccess();
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load settings");
      } finally {
        setIsLoading(false);
      }
    };

    loadSettings();
  }, [router]);

  const handleChange = (field: keyof CompanySettingsForm, value: string) => {
    setFormData((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const handleInviteUser = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!canEditCompany) {
      setError("Only company owners or admins can invite users.");
      return;
    }

    if (!inviteEmail.trim()) {
      setError("Invite email is required.");
      return;
    }

    try {
      setIsInviting(true);
      setMessage("");
      setError("");

      const response = await apiRequest<{ message: string }>("/organization/invitations", {
        method: "POST",
        body: JSON.stringify({
          email: inviteEmail.trim(),
          role: inviteRole,
        }),
      });

      setInviteEmail("");
      setInviteRole("staff");
      setUserSuggestions([]);
      setShowUserSuggestions(false);
      setMessage(response.message || "Invitation sent");
      await loadTeamAccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send invitation");
    } finally {
      setIsInviting(false);
    }
  };

  const handleInviteEmailChange = async (value: string) => {
    setInviteEmail(value);

    const query = value.trim();

    if (query.length < 2) {
      setUserSuggestions([]);
      setShowUserSuggestions(false);
      return;
    }

    try {
      const suggestions = await apiRequest<UserSuggestion[]>(
        `/organization/users/search?q=${encodeURIComponent(query)}`
      );
      setUserSuggestions(suggestions);
      setShowUserSuggestions(suggestions.length > 0);
    } catch {
      setUserSuggestions([]);
      setShowUserSuggestions(false);
    }
  };

  const handleLogoFile = (file?: File) => {
    if (!file) return;
    if (!canEditCompany) return;

    if (!file.type.startsWith("image/")) {
      setError("Please select an image file for the company logo.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setFormData((current) => ({
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

  const handleSave = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!canEditCompany) {
      setError("Only company owners or admins can update company settings.");
      return;
    }

    if (!formData.name.trim()) {
      setError("Company name is required.");
      return;
    }

    const taxPercentage = Number(formData.taxPercentage || 0);
    const discountPercentage = Number(formData.discountPercentage || 0);

    if (!Number.isFinite(taxPercentage) || taxPercentage < 0 || taxPercentage > 100) {
      setError("Tax percentage must be between 0 and 100.");
      return;
    }

    if (!Number.isFinite(discountPercentage) || discountPercentage < 0 || discountPercentage > 100) {
      setError("Discount percentage must be between 0 and 100.");
      return;
    }

    try {
      setIsSaving(true);
      setMessage("");
      setError("");

      const updatedUser = await apiRequest<UserResponse>("/auth/me", {
        method: "PATCH",
        body: JSON.stringify({
          name: formData.name.trim(),
          email: formData.email.trim(),
          phone: [formData.countryCode, formData.phoneNumber.trim()].filter(Boolean).join(" "),
          address: formData.address.trim(),
          logoUrl: formData.logoUrl.trim(),
          currency: formData.currency,
          taxPercentage,
          discountPercentage,
        }),
      });

      localStorage.setItem("user", JSON.stringify(updatedUser));
      setUser(updatedUser);
      setMessage("Company settings saved");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save company settings");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    isLoading || !hasSettingsAccess ? (
      <div className="rounded-2xl border border-slate-700 bg-slate-800 p-5 text-center text-white shadow-lg">
        Checking settings access...
      </div>
    ) : (
    <div className="min-h-screen">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white sm:text-4xl">Company Settings</h1>
        <p className="mt-2 text-sm text-slate-300 sm:text-base">
          Manage the active company profile used across quotes, invoices, emails, and PDFs.
        </p>
      </div>

      {error && (
        <div className="mb-4 rounded-xl border border-red-400/40 bg-red-500/20 px-4 py-3 text-sm text-white">
          {error}
        </div>
      )}

      {message && (
        <div className="mb-4 rounded-xl border border-green-400/40 bg-green-500/20 px-4 py-3 text-sm text-white">
          {message}
        </div>
      )}

      <div className="grid min-w-0 gap-6">
        <section className="rounded-2xl border border-slate-700 bg-slate-800 p-5 text-white shadow-lg">
          <div className="mb-5 flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-600 text-white">
              <Building2 size={22} />
            </div>
            <div>
              <h2 className="text-xl font-bold">Company Profile</h2>
              <p className="text-sm text-slate-300">
                {canEditCompany ? "Update your active company details." : "View your active company details."}
              </p>
            </div>
          </div>

          {isLoading ? (
            <div className="rounded-xl bg-slate-700/40 px-4 py-8 text-center text-sm text-slate-300">
              Loading company settings...
            </div>
          ) : !user?.activeOrganization ? (
            <div className="rounded-xl bg-slate-700/40 px-4 py-8 text-center text-sm text-slate-300">
              No active company found for this account.
            </div>
          ) : (
            <form onSubmit={handleSave} className="grid min-w-0 gap-4 md:grid-cols-2">
              <div className="space-y-2 md:col-span-2">
                <span className="text-sm font-medium text-slate-300">Company Logo</span>
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
                      : "border-slate-700 bg-slate-900"
                  } ${!canEditCompany ? "opacity-80" : ""}`}
                >
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                    <div className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-slate-800">
                      {formData.logoUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={formData.logoUrl}
                          alt="Company logo preview"
                          className="h-full w-full object-contain"
                        />
                      ) : (
                        <ImagePlus className="text-slate-500" size={28} />
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-white">
                        Drag and drop an image here
                      </p>
                      <p className="mt-1 text-sm text-slate-400">
                        This logo appears in the sidebar, emails, and PDFs.
                      </p>
                      {canEditCompany && (
                        <div className="mt-3 flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => logoInputRef.current?.click()}
                            className="cursor-pointer rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-500"
                          >
                            Select Image
                          </button>
                          {formData.logoUrl && (
                            <button
                              type="button"
                              onClick={() => handleChange("logoUrl", "")}
                              className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-slate-600 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:bg-slate-800"
                            >
                              <X size={16} />
                              Remove
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  <input
                    ref={logoInputRef}
                    type="file"
                    accept="image/*"
                    disabled={!canEditCompany}
                    onChange={(event) => handleLogoFile(event.target.files?.[0])}
                    className="hidden"
                  />
                </div>
              </div>

              <label className="space-y-2">
                <span className="text-sm font-medium text-slate-300">Company Name</span>
                <input
                  value={formData.name}
                  onChange={(event) => handleChange("name", event.target.value)}
                  disabled={!canEditCompany}
                  className="min-h-12 w-full rounded-xl border border-slate-700 bg-slate-900 px-4 text-white outline-none transition focus:border-blue-500 disabled:cursor-not-allowed disabled:opacity-70"
                  required
                />
              </label>

              <label className="space-y-2">
                <span className="text-sm font-medium text-slate-300">Company Email</span>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(event) => handleChange("email", event.target.value)}
                  disabled={!canEditCompany}
                  className="min-h-12 w-full rounded-xl border border-slate-700 bg-slate-900 px-4 text-white outline-none transition focus:border-blue-500 disabled:cursor-not-allowed disabled:opacity-70"
                />
              </label>

              <div className="space-y-2">
                <span className="text-sm font-medium text-slate-300">Phone</span>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <div className="relative">
                    <button
                      type="button"
                      disabled={!canEditCompany}
                      onClick={() => {
                        setCountrySearch("");
                        setIsCountryDropdownOpen((current) => !current);
                      }}
                      className="flex min-h-12 w-full cursor-pointer items-center justify-between gap-2 rounded-xl border border-slate-700 bg-slate-900 px-4 text-left text-white outline-none transition focus:border-blue-500 disabled:cursor-not-allowed disabled:opacity-70"
                    >
                      <span>{formData.countryCode}</span>
                      <ChevronDown size={16} className="text-slate-400" />
                    </button>

                    {isCountryDropdownOpen && canEditCompany && (
                      <div className="absolute left-0 right-0 top-full z-50 mt-2 overflow-hidden rounded-xl border border-slate-700 bg-slate-900 shadow-2xl sm:right-auto sm:w-80">
                        <div className="border-b border-slate-700 p-2">
                          <div className="relative">
                            <Search
                              size={16}
                              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"
                            />
                            <input
                              type="text"
                              value={countrySearch}
                              onChange={(event) => setCountrySearch(event.target.value)}
                              placeholder="Search country code..."
                              className="w-full rounded-lg border border-slate-700 bg-slate-800 py-2 pl-9 pr-3 text-sm text-white outline-none placeholder:text-slate-500 focus:border-blue-500"
                            />
                          </div>
                        </div>

                        <div className="max-h-56 overflow-y-auto py-1">
                          {countryCodes
                            .filter((country) => {
                              const query = countrySearch.trim().toLowerCase();
                              return (
                                !query ||
                                country.code.includes(query) ||
                                country.label.toLowerCase().includes(query)
                              );
                            })
                            .map((country) => (
                              <button
                                type="button"
                                key={`${country.label}-${country.code}`}
                                onClick={() => {
                                  handleChange("countryCode", country.code);
                                  setCountrySearch("");
                                  setIsCountryDropdownOpen(false);
                                }}
                                className={`flex w-full cursor-pointer items-center justify-between gap-3 px-3 py-2 text-left text-sm transition hover:bg-slate-800 ${
                                  formData.countryCode === country.code
                                    ? "text-blue-300"
                                    : "text-slate-200"
                                }`}
                              >
                                <span className="truncate">{country.label}</span>
                                <span className="shrink-0 font-semibold">{country.code}</span>
                              </button>
                            ))}
                        </div>
                      </div>
                    )}
                  </div>

                  <input
                    type="tel"
                    value={formData.phoneNumber}
                    onChange={(event) => handleChange("phoneNumber", event.target.value)}
                    disabled={!canEditCompany}
                    className="min-h-12 w-full rounded-xl border border-slate-700 bg-slate-900 px-4 text-white outline-none transition focus:border-blue-500 disabled:cursor-not-allowed disabled:opacity-70 sm:col-span-2"
                  />
                </div>
              </div>

              <label className="space-y-2">
                <span className="text-sm font-medium text-slate-300">Currency</span>
                <select
                  value={formData.currency}
                  onChange={(event) => handleChange("currency", event.target.value as CurrencyCode)}
                  disabled={!canEditCompany}
                  className="min-h-12 w-full cursor-pointer rounded-xl border border-slate-700 bg-slate-900 px-4 text-white outline-none transition focus:border-blue-500 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {currencies.map((currency) => (
                    <option key={currency.value} value={currency.value}>
                      {currency.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="space-y-2 md:col-span-2">
                <span className="text-sm font-medium text-slate-300">Address</span>
                <textarea
                  value={formData.address}
                  onChange={(event) => handleChange("address", event.target.value)}
                  disabled={!canEditCompany}
                  rows={3}
                  className="w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-white outline-none transition focus:border-blue-500 disabled:cursor-not-allowed disabled:opacity-70"
                />
              </label>

              <div className="rounded-xl border border-slate-700 bg-slate-900/70 p-4 md:col-span-2">
                <h3 className="text-lg font-bold text-white">Tax & Discount Rules</h3>
                <p className="mt-1 text-sm text-slate-400">
                  These defaults are applied when generating quotes and invoices.
                </p>

                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  <label className="space-y-2">
                    <span className="text-sm font-medium text-slate-300">
                      Default Tax Percentage
                    </span>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="0.01"
                      value={formData.taxPercentage}
                      onChange={(event) => handleChange("taxPercentage", event.target.value)}
                      disabled={!canEditCompany}
                      className="min-h-12 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 text-white outline-none transition focus:border-blue-500 disabled:cursor-not-allowed disabled:opacity-70"
                    />
                  </label>

                  <label className="space-y-2">
                    <span className="text-sm font-medium text-slate-300">
                      Default Discount Percentage
                    </span>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="0.01"
                      value={formData.discountPercentage}
                      onChange={(event) => handleChange("discountPercentage", event.target.value)}
                      disabled={!canEditCompany}
                      className="min-h-12 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 text-white outline-none transition focus:border-blue-500 disabled:cursor-not-allowed disabled:opacity-70"
                    />
                  </label>
                </div>
              </div>

              {canEditCompany && (
              <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end md:col-span-2">
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="cursor-pointer rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isSaving ? "Saving..." : "Save Company Settings"}
                  </button>
                </div>
              )}
            </form>
          )}
        </section>

        {canEditCompany && (
          <section className="rounded-2xl border border-slate-700 bg-slate-800 p-5 text-white shadow-lg">
            <div className="mb-5 flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-600 text-white">
                <Users size={22} />
              </div>
              <div>
                <h2 className="text-xl font-bold">Users & Roles</h2>
                <p className="text-sm text-slate-300">
                  Invite team members and control their access.
                </p>
              </div>
            </div>

            <form onSubmit={handleInviteUser} className="grid min-w-0 gap-4 lg:grid-cols-[minmax(0,1fr)_auto_auto]">
              <label className="relative space-y-2">
                <span className="text-sm font-medium text-slate-300">User Email</span>
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={(event) => handleInviteEmailChange(event.target.value)}
                  onFocus={() => setShowUserSuggestions(userSuggestions.length > 0)}
                  placeholder="Search user or enter email"
                  className="min-h-12 w-full rounded-xl border border-slate-700 bg-slate-900 px-4 text-white outline-none transition placeholder:text-slate-500 focus:border-blue-500"
                  required
                />
                {showUserSuggestions && (
                  <div className="absolute left-0 right-0 top-full z-40 mt-2 overflow-hidden rounded-xl border border-slate-700 bg-slate-950 shadow-2xl">
                    {userSuggestions.map((suggestion) => (
                      <button
                        type="button"
                        key={suggestion._id}
                        onClick={() => {
                          setInviteEmail(suggestion.email);
                          setUserSuggestions([]);
                          setShowUserSuggestions(false);
                        }}
                        className="block w-full cursor-pointer px-4 py-3 text-left transition hover:bg-slate-800"
                      >
                        <span className="block font-semibold text-white">{suggestion.name}</span>
                        <span className="block break-words text-sm text-slate-400">
                          {suggestion.email}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </label>

              <label className="space-y-2">
                <span className="text-sm font-medium text-slate-300">Role</span>
                <select
                  value={inviteRole}
                  onChange={(event) => setInviteRole(event.target.value as TeamRole)}
                  className="min-h-12 w-full cursor-pointer rounded-xl border border-slate-700 bg-slate-900 px-4 text-white outline-none transition focus:border-blue-500"
                >
                  {teamRoles.map((role) => (
                    <option key={role.value} value={role.value}>
                      {role.label}
                    </option>
                  ))}
                </select>
              </label>

              <div className="flex items-end">
                <button
                  type="submit"
                  disabled={isInviting}
                  className="inline-flex min-h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60 lg:w-auto"
                >
                  <Mail size={18} />
                  {isInviting ? "Sending..." : "Send Invite"}
                </button>
              </div>
            </form>

            <div className="mt-4 grid min-w-0 gap-3 md:grid-cols-3">
              {teamRoles.map((role) => (
                <div key={role.value} className="rounded-xl border border-slate-700 bg-slate-900 p-4">
                  <p className="font-bold text-white">{role.label}</p>
                  <p className="mt-1 text-sm text-slate-400">{role.description}</p>
                </div>
              ))}
            </div>

            <div className="mt-6 grid min-w-0 gap-5 xl:grid-cols-2">
              <div>
                <h3 className="mb-3 text-lg font-bold text-white">Active Members</h3>
                <div className="space-y-3">
                  {teamAccess.members.length > 0 ? (
                    teamAccess.members.map((member) => (
                      <div
                        key={member._id}
                        className="flex flex-col gap-2 rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div className="min-w-0">
                          <p className="font-semibold text-white">
                            {member.user?.name || "Unknown user"}
                          </p>
                          <p className="break-words text-sm text-slate-400">{member.user?.email}</p>
                        </div>
                        <span className="w-fit rounded-full bg-blue-100 px-3 py-1 text-sm font-bold capitalize text-blue-700">
                          {member.role}
                        </span>
                      </div>
                    ))
                  ) : (
                    <div className="rounded-xl border border-slate-700 bg-slate-900 px-4 py-6 text-center text-sm text-slate-400">
                      No members found.
                    </div>
                  )}
                </div>
              </div>

              <div>
                <h3 className="mb-3 text-lg font-bold text-white">Pending Invitations</h3>
                <div className="space-y-3">
                  {teamAccess.invitations.length > 0 ? (
                    teamAccess.invitations.map((invitation) => (
                      <div
                        key={invitation._id}
                        className="flex flex-col gap-2 rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div className="min-w-0">
                          <p className="break-words font-semibold text-white">{invitation.email}</p>
                          <p className="text-sm text-slate-400">
                            Expires {new Date(invitation.expiresAt).toLocaleDateString("en-GB")}
                          </p>
                        </div>
                        <span className="w-fit rounded-full bg-amber-100 px-3 py-1 text-sm font-bold capitalize text-amber-700">
                          {invitation.role}
                        </span>
                      </div>
                    ))
                  ) : (
                    <div className="rounded-xl border border-slate-700 bg-slate-900 px-4 py-6 text-center text-sm text-slate-400">
                      No pending invitations.
                    </div>
                  )}
                </div>
              </div>
            </div>
          </section>
        )}

        {isPlatformOwner && (
          <section className="rounded-2xl border border-slate-700 bg-slate-800 p-5 text-white shadow-lg">
            <h2 className="text-xl font-bold">Super Admin</h2>
            <p className="mt-2 text-sm text-slate-300">
              Manage platform-level company access.
            </p>

            <div className="mt-5 grid gap-3">
              <button
                type="button"
                onClick={() => router.push("/dashboards/super-admin/companies")}
                className="flex min-h-24 cursor-pointer items-center gap-4 rounded-xl border border-slate-700 bg-slate-900 p-4 text-left transition hover:border-blue-400 hover:bg-slate-900/70"
              >
                <Building2 className="shrink-0 text-blue-300" size={24} />
                <span>
                  <span className="block font-bold">Companies</span>
                  <span className="mt-1 block text-sm text-slate-400">
                    Add, edit, or remove companies.
                  </span>
                </span>
              </button>

              {isPlatformOwner && (
                <button
                  type="button"
                  onClick={() => router.push("/dashboards/super-admin/make-super-admin")}
                  className="flex min-h-24 cursor-pointer items-center gap-4 rounded-xl border border-slate-700 bg-slate-900 p-4 text-left transition hover:border-blue-400 hover:bg-slate-900/70"
                >
                  <UserCog className="shrink-0 text-blue-300" size={24} />
                  <span>
                    <span className="block font-bold">Make Super Admin</span>
                    <span className="mt-1 block text-sm text-slate-400">
                      Promote an existing user.
                    </span>
                  </span>
                </button>
              )}
            </div>
          </section>
        )}
      </div>
    </div>
    )
  );
}
