"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ShieldCheck, UserCog } from "lucide-react";
import { apiRequest } from "../../../difm/lib/api";

type AuthUser = {
  email: string;
  role: string;
};

type OrganizationOption = {
  _id: string;
  name: string;
};

const platformOwnerEmail = process.env.NEXT_PUBLIC_SUPER_ADMIN_CREATOR_EMAIL;

export default function MakeSuperAdminPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [organizations, setOrganizations] = useState<OrganizationOption[]>([]);
  const [selectedOrganizationIds, setSelectedOrganizationIds] = useState<string[]>([]);
  const [checkingAccess, setCheckingAccess] = useState(true);
  const [promoting, setPromoting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    const checkAccess = async () => {
      setCheckingAccess(true);
      setError("");

      try {
        const user = await apiRequest<AuthUser>("/auth/me");

        if (!platformOwnerEmail || user.role !== "super_admin" || user.email !== platformOwnerEmail) {
          router.replace("/dashboards/overview");
          return;
        }

        const companyData = await apiRequest<OrganizationOption[]>("/admin/organizations");
        setOrganizations(companyData);
        setSelectedOrganizationIds(companyData[0]?._id ? [companyData[0]._id] : []);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unable to verify access");
      } finally {
        setCheckingAccess(false);
      }
    };

    checkAccess();
  }, [router]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const targetEmail = email.trim().toLowerCase();

    if (!targetEmail) {
      setError("Please enter the user's email address.");
      return;
    }

    if (selectedOrganizationIds.length === 0) {
      setError("Please select at least one company.");
      return;
    }

    setPromoting(true);
    setError("");
    setSuccess("");

    try {
      await apiRequest("/auth/promote-super-admin", {
        method: "POST",
        body: JSON.stringify({
          email: targetEmail,
          organizationIds: selectedOrganizationIds,
        }),
      });

      setEmail("");
      setSuccess(`${targetEmail} is now a super admin.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to promote user");
    } finally {
      setPromoting(false);
    }
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

  if (checkingAccess) {
    return (
      <div className="mx-auto w-full max-w-4xl">
        <section className="rounded-2xl bg-slate-900/80 p-8 text-center font-semibold text-white shadow-xl ring-1 ring-white/10">
          Checking platform owner access...
        </section>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6">
      <section className="py-4">
        <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-blue-600 text-white shadow-lg">
          <ShieldCheck size={24} />
        </div>
        <h1 className="text-2xl font-bold text-white sm:text-4xl">Make Super Admin</h1>
        <p className="mt-2 max-w-2xl text-lg text-slate-100">
          Promote an existing registered user to platform super admin.
        </p>
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

      <section className="rounded-2xl bg-slate-900/80 p-5 shadow-xl ring-1 ring-white/10">
        <div className="mb-5 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-600 text-white">
            <UserCog size={22} />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-white">User Email</h2>
            <p className="text-slate-200">The user must already be registered in the system.</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3 md:flex-row">
          <div className="flex-1 space-y-4">
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="user@example.com"
              className="min-h-12 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 text-white outline-none transition focus:border-blue-400"
            />

            <div className="rounded-xl border border-slate-700 bg-slate-950 p-3">
              <p className="mb-2 text-sm font-semibold text-slate-300">Company Access</p>
              <label className="flex cursor-pointer items-center gap-3 rounded-lg px-2 py-2 text-sm text-slate-200 transition hover:bg-slate-800">
                <input
                  type="checkbox"
                  checked={organizations.length > 0 && selectedOrganizationIds.length === organizations.length}
                  onChange={handleAllOrganizationsToggle}
                  className="h-4 w-4 accent-blue-600"
                />
                <span>All companies</span>
              </label>

              <div className="mt-2 max-h-48 space-y-1 overflow-y-auto border-t border-slate-700 pt-2">
                {organizations.length > 0 ? (
                  organizations.map((organization) => (
                    <label
                      key={organization._id}
                      className="flex cursor-pointer items-center gap-3 rounded-lg px-2 py-2 text-sm text-slate-200 transition hover:bg-slate-800"
                    >
                      <input
                        type="checkbox"
                        checked={selectedOrganizationIds.includes(organization._id)}
                        onChange={() => handleOrganizationToggle(organization._id)}
                        className="h-4 w-4 accent-blue-600"
                      />
                      <span>{organization.name}</span>
                    </label>
                  ))
                ) : (
                  <p className="px-2 py-3 text-sm text-slate-400">No companies available.</p>
                )}
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={promoting}
            className="inline-flex min-h-12 cursor-pointer items-center justify-center rounded-xl bg-blue-600 px-6 font-bold text-white shadow-lg transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60 md:self-start"
          >
            {promoting ? "Promoting..." : "Make Super Admin"}
          </button>
        </form>
      </section>
    </div>
  );
}
