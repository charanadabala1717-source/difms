"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ChevronDown, Pencil, Plus, Search, Trash2, X } from "lucide-react";
import { apiRequest } from "../../difm/lib/api";

type CustomerRow = {
  id: string;
  customerId: string;
  name: string;
  email: string;
  countryCode: string;
  phoneNumber: string;
  phone: string;
  address: string;
};

type CustomerResponse = {
  _id: string;
  name: string;
  email?: string;
  phone?: string;
  phoneNumber?: string;
  countryCode?: string;
  address?: string;
};

type OrganizationOption = {
  _id: string;
  name: string;
};

type UserResponse = {
  email?: string;
  role?: string;
  organizations?: OrganizationOption[];
  activeOrganization?: OrganizationOption | null;
};

const platformOwnerEmail = process.env.NEXT_PUBLIC_SUPER_ADMIN_CREATOR_EMAIL;

const emptyForm = {
  name: "",
  email: "",
  countryCode: "+44",
  phoneNumber: "",
  address: "",
};

const countryCodes = [
  { code: "+93", label: "Afghanistan" },
  { code: "+355", label: "Albania" },
  { code: "+213", label: "Algeria" },
  { code: "+1-684", label: "American Samoa" },
  { code: "+376", label: "Andorra" },
  { code: "+244", label: "Angola" },
  { code: "+1-264", label: "Anguilla" },
  { code: "+672", label: "Antarctica" },
  { code: "+1-268", label: "Antigua and Barbuda" },
  { code: "+54", label: "Argentina" },
  { code: "+374", label: "Armenia" },
  { code: "+297", label: "Aruba" },
  { code: "+61", label: "Australia" },
  { code: "+43", label: "Austria" },
  { code: "+994", label: "Azerbaijan" },
  { code: "+1-242", label: "Bahamas" },
  { code: "+973", label: "Bahrain" },
  { code: "+880", label: "Bangladesh" },
  { code: "+1-246", label: "Barbados" },
  { code: "+375", label: "Belarus" },
  { code: "+32", label: "Belgium" },
  { code: "+501", label: "Belize" },
  { code: "+229", label: "Benin" },
  { code: "+1-441", label: "Bermuda" },
  { code: "+975", label: "Bhutan" },
  { code: "+591", label: "Bolivia" },
  { code: "+387", label: "Bosnia and Herzegovina" },
  { code: "+267", label: "Botswana" },
  { code: "+55", label: "Brazil" },
  { code: "+246", label: "British Indian Ocean Territory" },
  { code: "+1-284", label: "British Virgin Islands" },
  { code: "+673", label: "Brunei" },
  { code: "+359", label: "Bulgaria" },
  { code: "+226", label: "Burkina Faso" },
  { code: "+257", label: "Burundi" },
  { code: "+855", label: "Cambodia" },
  { code: "+237", label: "Cameroon" },
  { code: "+1", label: "Canada" },
  { code: "+238", label: "Cape Verde" },
  { code: "+1-345", label: "Cayman Islands" },
  { code: "+236", label: "Central African Republic" },
  { code: "+235", label: "Chad" },
  { code: "+56", label: "Chile" },
  { code: "+86", label: "China" },
  { code: "+61", label: "Christmas Island" },
  { code: "+61", label: "Cocos Islands" },
  { code: "+57", label: "Colombia" },
  { code: "+269", label: "Comoros" },
  { code: "+242", label: "Congo" },
  { code: "+682", label: "Cook Islands" },
  { code: "+506", label: "Costa Rica" },
  { code: "+385", label: "Croatia" },
  { code: "+53", label: "Cuba" },
  { code: "+599", label: "Curacao" },
  { code: "+357", label: "Cyprus" },
  { code: "+420", label: "Czech Republic" },
  { code: "+45", label: "Denmark" },
  { code: "+253", label: "Djibouti" },
  { code: "+1-767", label: "Dominica" },
  { code: "+1-809", label: "Dominican Republic" },
  { code: "+1-829", label: "Dominican Republic" },
  { code: "+1-849", label: "Dominican Republic" },
  { code: "+243", label: "DR Congo" },
  { code: "+593", label: "Ecuador" },
  { code: "+20", label: "Egypt" },
  { code: "+503", label: "El Salvador" },
  { code: "+240", label: "Equatorial Guinea" },
  { code: "+291", label: "Eritrea" },
  { code: "+372", label: "Estonia" },
  { code: "+268", label: "Eswatini" },
  { code: "+251", label: "Ethiopia" },
  { code: "+500", label: "Falkland Islands" },
  { code: "+298", label: "Faroe Islands" },
  { code: "+679", label: "Fiji" },
  { code: "+358", label: "Finland" },
  { code: "+33", label: "France" },
  { code: "+594", label: "French Guiana" },
  { code: "+689", label: "French Polynesia" },
  { code: "+241", label: "Gabon" },
  { code: "+220", label: "Gambia" },
  { code: "+995", label: "Georgia" },
  { code: "+49", label: "Germany" },
  { code: "+233", label: "Ghana" },
  { code: "+350", label: "Gibraltar" },
  { code: "+30", label: "Greece" },
  { code: "+299", label: "Greenland" },
  { code: "+1-473", label: "Grenada" },
  { code: "+590", label: "Guadeloupe" },
  { code: "+1-671", label: "Guam" },
  { code: "+502", label: "Guatemala" },
  { code: "+44-1481", label: "Guernsey" },
  { code: "+224", label: "Guinea" },
  { code: "+245", label: "Guinea-Bissau" },
  { code: "+592", label: "Guyana" },
  { code: "+509", label: "Haiti" },
  { code: "+504", label: "Honduras" },
  { code: "+852", label: "Hong Kong" },
  { code: "+36", label: "Hungary" },
  { code: "+354", label: "Iceland" },
  { code: "+91", label: "India" },
  { code: "+62", label: "Indonesia" },
  { code: "+98", label: "Iran" },
  { code: "+964", label: "Iraq" },
  { code: "+353", label: "Ireland" },
  { code: "+44-1624", label: "Isle of Man" },
  { code: "+972", label: "Israel" },
  { code: "+39", label: "Italy" },
  { code: "+225", label: "Ivory Coast" },
  { code: "+1-876", label: "Jamaica" },
  { code: "+81", label: "Japan" },
  { code: "+44-1534", label: "Jersey" },
  { code: "+962", label: "Jordan" },
  { code: "+7", label: "Kazakhstan" },
  { code: "+254", label: "Kenya" },
  { code: "+686", label: "Kiribati" },
  { code: "+383", label: "Kosovo" },
  { code: "+965", label: "Kuwait" },
  { code: "+996", label: "Kyrgyzstan" },
  { code: "+856", label: "Laos" },
  { code: "+371", label: "Latvia" },
  { code: "+961", label: "Lebanon" },
  { code: "+266", label: "Lesotho" },
  { code: "+231", label: "Liberia" },
  { code: "+218", label: "Libya" },
  { code: "+423", label: "Liechtenstein" },
  { code: "+370", label: "Lithuania" },
  { code: "+352", label: "Luxembourg" },
  { code: "+853", label: "Macau" },
  { code: "+261", label: "Madagascar" },
  { code: "+265", label: "Malawi" },
  { code: "+60", label: "Malaysia" },
  { code: "+960", label: "Maldives" },
  { code: "+223", label: "Mali" },
  { code: "+356", label: "Malta" },
  { code: "+692", label: "Marshall Islands" },
  { code: "+596", label: "Martinique" },
  { code: "+222", label: "Mauritania" },
  { code: "+230", label: "Mauritius" },
  { code: "+262", label: "Mayotte" },
  { code: "+52", label: "Mexico" },
  { code: "+691", label: "Micronesia" },
  { code: "+373", label: "Moldova" },
  { code: "+377", label: "Monaco" },
  { code: "+976", label: "Mongolia" },
  { code: "+382", label: "Montenegro" },
  { code: "+1-664", label: "Montserrat" },
  { code: "+212", label: "Morocco" },
  { code: "+258", label: "Mozambique" },
  { code: "+95", label: "Myanmar" },
  { code: "+264", label: "Namibia" },
  { code: "+674", label: "Nauru" },
  { code: "+977", label: "Nepal" },
  { code: "+31", label: "Netherlands" },
  { code: "+687", label: "New Caledonia" },
  { code: "+64", label: "New Zealand" },
  { code: "+505", label: "Nicaragua" },
  { code: "+227", label: "Niger" },
  { code: "+234", label: "Nigeria" },
  { code: "+683", label: "Niue" },
  { code: "+672", label: "Norfolk Island" },
  { code: "+850", label: "North Korea" },
  { code: "+389", label: "North Macedonia" },
  { code: "+1-670", label: "Northern Mariana Islands" },
  { code: "+47", label: "Norway" },
  { code: "+968", label: "Oman" },
  { code: "+92", label: "Pakistan" },
  { code: "+680", label: "Palau" },
  { code: "+970", label: "Palestine" },
  { code: "+507", label: "Panama" },
  { code: "+675", label: "Papua New Guinea" },
  { code: "+595", label: "Paraguay" },
  { code: "+51", label: "Peru" },
  { code: "+63", label: "Philippines" },
  { code: "+48", label: "Poland" },
  { code: "+351", label: "Portugal" },
  { code: "+1-787", label: "Puerto Rico" },
  { code: "+1-939", label: "Puerto Rico" },
  { code: "+974", label: "Qatar" },
  { code: "+262", label: "Reunion" },
  { code: "+40", label: "Romania" },
  { code: "+7", label: "Russia" },
  { code: "+250", label: "Rwanda" },
  { code: "+590", label: "Saint Barthelemy" },
  { code: "+290", label: "Saint Helena" },
  { code: "+1-869", label: "Saint Kitts and Nevis" },
  { code: "+1-758", label: "Saint Lucia" },
  { code: "+590", label: "Saint Martin" },
  { code: "+508", label: "Saint Pierre and Miquelon" },
  { code: "+1-784", label: "Saint Vincent and the Grenadines" },
  { code: "+685", label: "Samoa" },
  { code: "+378", label: "San Marino" },
  { code: "+239", label: "Sao Tome and Principe" },
  { code: "+966", label: "Saudi Arabia" },
  { code: "+221", label: "Senegal" },
  { code: "+381", label: "Serbia" },
  { code: "+248", label: "Seychelles" },
  { code: "+232", label: "Sierra Leone" },
  { code: "+65", label: "Singapore" },
  { code: "+1-721", label: "Sint Maarten" },
  { code: "+421", label: "Slovakia" },
  { code: "+386", label: "Slovenia" },
  { code: "+677", label: "Solomon Islands" },
  { code: "+252", label: "Somalia" },
  { code: "+27", label: "South Africa" },
  { code: "+82", label: "South Korea" },
  { code: "+211", label: "South Sudan" },
  { code: "+34", label: "Spain" },
  { code: "+94", label: "Sri Lanka" },
  { code: "+249", label: "Sudan" },
  { code: "+597", label: "Suriname" },
  { code: "+47", label: "Svalbard and Jan Mayen" },
  { code: "+46", label: "Sweden" },
  { code: "+41", label: "Switzerland" },
  { code: "+963", label: "Syria" },
  { code: "+886", label: "Taiwan" },
  { code: "+992", label: "Tajikistan" },
  { code: "+255", label: "Tanzania" },
  { code: "+66", label: "Thailand" },
  { code: "+670", label: "Timor-Leste" },
  { code: "+228", label: "Togo" },
  { code: "+690", label: "Tokelau" },
  { code: "+676", label: "Tonga" },
  { code: "+1-868", label: "Trinidad and Tobago" },
  { code: "+216", label: "Tunisia" },
  { code: "+90", label: "Turkey" },
  { code: "+993", label: "Turkmenistan" },
  { code: "+1-649", label: "Turks and Caicos Islands" },
  { code: "+688", label: "Tuvalu" },
  { code: "+1", label: "United States" },
  { code: "+1-340", label: "US Virgin Islands" },
  { code: "+256", label: "Uganda" },
  { code: "+380", label: "Ukraine" },
  { code: "+971", label: "United Arab Emirates" },
  { code: "+44", label: "United Kingdom" },
  { code: "+598", label: "Uruguay" },
  { code: "+998", label: "Uzbekistan" },
  { code: "+678", label: "Vanuatu" },
  { code: "+379", label: "Vatican City" },
  { code: "+58", label: "Venezuela" },
  { code: "+84", label: "Vietnam" },
  { code: "+681", label: "Wallis and Futuna" },
  { code: "+212", label: "Western Sahara" },
  { code: "+967", label: "Yemen" },
  { code: "+260", label: "Zambia" },
  { code: "+263", label: "Zimbabwe" },
];

const stripCountryCode = (phone = "", countryCode = "+44") => {
  const trimmed = phone.trim();
  return trimmed.startsWith(countryCode)
    ? trimmed.slice(countryCode.length).trim()
    : trimmed;
};

export default function CustomersPage() {
  const [customers, setCustomers] = useState<CustomerRow[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCustomerId, setEditingCustomerId] = useState<string | null>(null);
  const [formData, setFormData] = useState(emptyForm);
  const [organizations, setOrganizations] = useState<OrganizationOption[]>([]);
  const [selectedOrganizationIds, setSelectedOrganizationIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [countrySearch, setCountrySearch] = useState("");
  const [isCountryDropdownOpen, setIsCountryDropdownOpen] = useState(false);

  const mapCustomer = (customer: CustomerResponse, index: number): CustomerRow => ({
    id: customer._id,
    customerId: String(index + 1).padStart(2, "0"),
    name: customer.name,
    email: customer.email || "",
    countryCode: customer.countryCode || "+44",
    phoneNumber: customer.phoneNumber || stripCountryCode(customer.phone, customer.countryCode || "+44"),
    phone: [
      customer.countryCode || "+44",
      customer.phoneNumber || stripCountryCode(customer.phone, customer.countryCode || "+44"),
    ]
      .filter(Boolean)
      .join(" "),
    address: customer.address || "",
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

  const loadUserOrganizations = useCallback(async () => {
    try {
      const user = await apiRequest<UserResponse>("/auth/me");
      const userOrganizations =
        platformOwnerEmail && user.email === platformOwnerEmail && user.role === "super_admin"
          ? await apiRequest<OrganizationOption[]>("/admin/organizations")
          : user.organizations || [];

      setOrganizations(userOrganizations);
      setSelectedOrganizationIds(
        user.activeOrganization?._id
          ? [user.activeOrganization._id]
          : userOrganizations[0]?._id
          ? [userOrganizations[0]._id]
          : []
      );
    } catch {
      setOrganizations([]);
      setSelectedOrganizationIds([]);
    }
  }, []);

  useEffect(() => {
    loadCustomers();
    loadUserOrganizations();
  }, [loadCustomers, loadUserOrganizations]);

  const filteredCustomers = useMemo(() => {
    const query = searchTerm.toLowerCase();

    return customers.filter(
      (customer) =>
        customer.customerId.toLowerCase().includes(query) ||
        customer.name.toLowerCase().includes(query) ||
        customer.email.toLowerCase().includes(query) ||
        customer.phone.toLowerCase().includes(query) ||
        customer.address.toLowerCase().includes(query)
    );
  }, [customers, searchTerm]);

  const selectedCountry = useMemo(() => {
    return countryCodes.find((country) => country.code === formData.countryCode) || countryCodes[0];
  }, [formData.countryCode]);

  const filteredCountryCodes = useMemo(() => {
    const query = countrySearch.trim().toLowerCase();

    if (!query) return countryCodes;

    return countryCodes.filter(
      (country) =>
        country.code.toLowerCase().includes(query) ||
        country.label.toLowerCase().includes(query)
    );
  }, [countrySearch]);

  const openAddModal = () => {
    setEditingCustomerId(null);
    setFormData(emptyForm);
    setSelectedOrganizationIds((current) =>
      current.length > 0
        ? current
        : organizations[0]?._id
        ? [organizations[0]._id]
        : []
    );
    setCountrySearch("");
    setIsCountryDropdownOpen(false);
    setIsModalOpen(true);
  };

  const openEditModal = (customer: CustomerRow) => {
    setEditingCustomerId(customer.id);
    setFormData({
      name: customer.name,
      email: customer.email,
      countryCode: customer.countryCode,
      phoneNumber: customer.phoneNumber,
      address: customer.address,
    });
    setCountrySearch("");
    setIsCountryDropdownOpen(false);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingCustomerId(null);
    setFormData(emptyForm);
    setCountrySearch("");
    setIsCountryDropdownOpen(false);
  };

  const handleCountrySelect = (code: string) => {
    setFormData((prev) => ({ ...prev, countryCode: code }));
    setCountrySearch("");
    setIsCountryDropdownOpen(false);
  };

  const handleChange = (
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleOrganizationToggle = (organizationId: string) => {
    setSelectedOrganizationIds((current) =>
      current.includes(organizationId)
        ? current.filter((id) => id !== organizationId)
        : [...current, organizationId]
    );
  };

  const handleAllOrganizationsToggle = () => {
    setSelectedOrganizationIds((current) =>
      current.length === organizations.length ? [] : organizations.map((organization) => organization._id)
    );
  };

  const handleSave = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!formData.name.trim() || !formData.email.trim() || !formData.phoneNumber.trim()) {
      return;
    }

    if (!editingCustomerId && selectedOrganizationIds.length === 0) {
      setError("Please select at least one company for this customer");
      return;
    }

    try {
      setError("");
      const payload = {
        name: formData.name.trim(),
        email: formData.email.trim(),
        countryCode: formData.countryCode,
        phone: `${formData.countryCode} ${formData.phoneNumber.trim()}`,
        phoneNumber: formData.phoneNumber.trim(),
        address: formData.address.trim(),
        ...(!editingCustomerId ? { organizationIds: selectedOrganizationIds } : {}),
      };

      if (editingCustomerId) {
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

  const handleDelete = async (id: string) => {
    try {
      setError("");
      await apiRequest(`/customers/${id}`, { method: "DELETE" });
      setCustomers((prev) => prev.filter((customer) => customer.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete customer");
    }
  };

  return (
    <div className="min-h-screen">
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white sm:text-4xl">Customers</h1>
          <p className="mt-2 text-sm text-slate-300 sm:text-base">
            Manage reusable customer identity details.
          </p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row lg:items-center">
          <div className="relative w-full sm:w-auto">
            <Search
              size={18}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              type="text"
              placeholder="Search customers..."
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              className="w-full rounded-xl border border-slate-700 bg-slate-800 py-3 pl-10 pr-4 text-sm text-white outline-none transition placeholder:text-slate-400 focus:border-blue-500 sm:w-72"
            />
          </div>

          <button
            onClick={openAddModal}
            className="flex cursor-pointer items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-md transition hover:bg-blue-700"
          >
            <Plus size={18} />
            Add Customer
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-xl border border-red-400/40 bg-red-500/20 px-4 py-3 text-sm text-white">
          {error}
        </div>
      )}

      <div className="rounded-2xl border border-slate-700 bg-slate-800 p-5 text-white shadow-lg">
        <div className="mb-4">
          <h2 className="text-xl font-semibold">Customer Records</h2>
          <p className="mt-1 text-sm text-slate-300">
            Customers are selected later when creating quotes.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-max border-separate border-spacing-y-3">
            <thead>
              <tr>
                {["Customer ID", "Name", "Email", "Phone", "Address", "Actions"].map(
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
                    <td className="px-4 py-4 text-sm text-slate-200">{customer.name}</td>
                    <td className="px-4 py-4 text-sm text-slate-200">{customer.email}</td>
                    <td className="px-4 py-4 text-sm text-slate-200">{customer.phone}</td>
                    <td className="px-4 py-4 text-sm text-slate-200">
                      {customer.address || "-"}
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
          <div className="fixed inset-0 z-40 bg-black/50" onClick={closeModal} />

          <div className="fixed inset-x-4 top-4 z-50 max-h-[calc(100dvh-2rem)] overflow-y-auto rounded-2xl border border-slate-700 bg-slate-900 p-4 text-white shadow-2xl sm:left-1/2 sm:top-1/2 sm:max-w-lg sm:-translate-x-1/2 sm:-translate-y-1/2 sm:p-6">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-semibold">
                  {editingCustomerId ? "Edit Customer" : "Add Customer"}
                </h2>
                <p className="mt-1 text-sm text-slate-400">
                  Store customer contact details only.
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
              {!editingCustomerId && organizations.length > 1 && (
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-300">
                    Company
                  </label>
                  <div className="rounded-xl border border-slate-700 bg-slate-800 p-3">
                    <label className="flex cursor-pointer items-center gap-3 rounded-lg px-2 py-2 text-sm text-slate-200 transition hover:bg-slate-700/60">
                      <input
                        type="checkbox"
                        checked={selectedOrganizationIds.length === organizations.length}
                        onChange={handleAllOrganizationsToggle}
                        className="h-4 w-4 accent-blue-600"
                      />
                      <span>All companies</span>
                    </label>

                    <div className="mt-2 max-h-40 space-y-1 overflow-y-auto border-t border-slate-700 pt-2">
                      {organizations.map((organization) => (
                        <label
                          key={organization._id}
                          className="flex cursor-pointer items-center gap-3 rounded-lg px-2 py-2 text-sm text-slate-200 transition hover:bg-slate-700/60"
                        >
                          <input
                            type="checkbox"
                            checked={selectedOrganizationIds.includes(organization._id)}
                            onChange={() => handleOrganizationToggle(organization._id)}
                            className="h-4 w-4 accent-blue-600"
                          />
                          <span>{organization.name}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              )}

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
                  Phone
                </label>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setIsCountryDropdownOpen((prev) => !prev)}
                      className="flex w-full cursor-pointer items-center justify-between gap-2 rounded-xl border border-slate-700 bg-slate-800 px-3 py-3 text-left text-sm text-white outline-none transition hover:border-slate-500 focus:border-blue-500"
                    >
                      <span className="truncate">{selectedCountry.code}</span>
                      <ChevronDown size={16} className="shrink-0 text-slate-400" />
                    </button>

                    {isCountryDropdownOpen && (
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
                          {filteredCountryCodes.length > 0 ? (
                            filteredCountryCodes.map((country) => (
                              <button
                                type="button"
                                key={`${country.label}-${country.code}`}
                                onClick={() => handleCountrySelect(country.code)}
                                className={`flex w-full cursor-pointer items-center justify-between gap-3 px-3 py-2 text-left text-sm transition hover:bg-slate-800 ${
                                  formData.countryCode === country.code
                                    ? "text-blue-300"
                                    : "text-slate-200"
                                }`}
                              >
                                <span className="truncate">{country.label}</span>
                                <span className="shrink-0 font-semibold">{country.code}</span>
                              </button>
                            ))
                          ) : (
                            <p className="px-3 py-3 text-sm text-slate-400">
                              No country codes found.
                            </p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                  <input
                    type="tel"
                    name="phoneNumber"
                    value={formData.phoneNumber}
                    onChange={handleChange}
                    placeholder="Enter phone number"
                    className="rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-blue-500 sm:col-span-2"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-300">
                  Address
                </label>
                <textarea
                  name="address"
                  value={formData.address}
                  onChange={handleChange}
                  placeholder="Enter customer address"
                  rows={3}
                  className="w-full resize-none rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-blue-500"
                />
              </div>

              <div className="flex gap-3 pt-2">
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
                  {editingCustomerId ? "Save Changes" : "Create Customer"}
                </button>
              </div>
            </form>
          </div>
        </>
      )}
    </div>
  );
}
