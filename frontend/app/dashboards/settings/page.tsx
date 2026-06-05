"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Building2, UserCog } from "lucide-react";
import { apiRequest } from "../../difm/lib/api";

type CurrencyCode = "GBP" | "ZMW";

type UserResponse = {
  _id: string;
  name: string;
  email: string;
  role: string;
  currency?: CurrencyCode;
};

const platformOwnerEmail = process.env.NEXT_PUBLIC_SUPER_ADMIN_CREATOR_EMAIL;

export default function SettingsPage() {
  const router = useRouter();
  const [currency, setCurrency] = useState<CurrencyCode>("GBP");
  const [user, setUser] = useState<UserResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const loadSettings = async () => {
      try {
        setIsLoading(true);
        setError("");
        const currentUser = await apiRequest<UserResponse>("/auth/me");
        setUser(currentUser);
        setCurrency(currentUser.currency || "GBP");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load settings");
      } finally {
        setIsLoading(false);
      }
    };

    loadSettings();
  }, []);

  const handleSave = async () => {
    try {
      setIsSaving(true);
      setMessage("");
      setError("");
      const updatedUser = await apiRequest<UserResponse>("/auth/me", {
        method: "PATCH",
        body: JSON.stringify({ currency }),
      });

      localStorage.setItem("user", JSON.stringify(updatedUser));
      setUser(updatedUser);
      setMessage("Settings saved");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save settings");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white sm:text-4xl">Settings</h1>
        <p className="mt-2 text-sm text-slate-300 sm:text-base">
          Choose the default company currency for new quotes and invoices.
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

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <section className="rounded-2xl border border-slate-700 bg-slate-800 p-5 text-white shadow-lg">
          <label className="mb-2 block text-sm font-medium text-slate-300">
            Company Currency
          </label>
          <select
            value={currency}
            onChange={(event) => setCurrency(event.target.value as CurrencyCode)}
            disabled={isLoading}
            className="w-full cursor-pointer rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-white outline-none transition focus:border-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <option value="GBP">GBP</option>
            <option value="ZMW">ZMW (K)</option>
          </select>

          <button
            onClick={handleSave}
            disabled={isSaving || isLoading}
            className="mt-5 cursor-pointer rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSaving ? "Saving..." : "Save Settings"}
          </button>
        </section>

        {user?.role === "super_admin" && (
          <section className="rounded-2xl border border-slate-700 bg-slate-800 p-5 text-white shadow-lg">
            <h2 className="text-xl font-bold">Super Admin</h2>
            <p className="mt-2 text-sm text-slate-300">
              Manage platform-level settings and company workspaces.
            </p>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
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

              {platformOwnerEmail && user.email === platformOwnerEmail && (
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
  );
}
