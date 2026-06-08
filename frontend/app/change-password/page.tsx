"use client";

import Image from "next/image";
import { FormEvent, useEffect, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { useRouter } from "next/navigation";
import { apiRequest, getToken, setAuthSession } from "../difm/lib/api";

type AuthResponse = {
  _id: string;
  name: string;
  email: string;
  role: string;
  token: string;
  mustChangePassword?: boolean;
  organizations?: unknown[];
  activeOrganization?: unknown;
};

export default function ChangePasswordPage() {
  const router = useRouter();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPasswords, setShowPasswords] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!getToken()) {
      router.replace("/");
    }
  }, [router]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");

    if (newPassword.length < 6) {
      setError("New password must be at least 6 characters.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("New password and confirm password do not match.");
      return;
    }

    try {
      setIsSubmitting(true);
      const user = await apiRequest<AuthResponse>("/auth/change-password", {
        method: "PATCH",
        body: JSON.stringify({
          currentPassword,
          newPassword,
        }),
      });

      setAuthSession(user.token, user);
      router.replace("/dashboards/overview");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to change password");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top_left,_#60a5fa_0%,_#1e3a8a_28%,_#0f172a_58%,_#000000_82%,_#dbeafe_100%)]">
      <div className="absolute inset-0 bg-black/10" />
      <div className="absolute -left-16 top-20 h-72 w-72 rounded-full bg-blue-400/20 blur-3xl" />
      <div className="absolute bottom-0 right-0 h-80 w-80 rounded-full bg-white/10 blur-3xl" />

      <div className="relative z-10 flex min-h-screen items-center justify-center px-4 py-8">
        <div className="w-full max-w-md rounded-3xl border border-white/20 bg-white/20 p-6 text-white shadow-2xl backdrop-blur-xl sm:p-8">
          <div className="mb-6 flex justify-center">
            <Image
              src="/images/intern.jpg"
              alt="Brent labs Logo"
              width={80}
              height={80}
              className="h-auto w-auto rounded-md object-contain"
              priority
            />
          </div>

          <h1 className="text-center text-3xl font-semibold tracking-wide sm:text-4xl">
            Change Password
          </h1>
          <p className="mt-3 text-center text-sm text-blue-100">
            Please replace your temporary password before accessing the dashboard.
          </p>

          <form onSubmit={handleSubmit} className="mt-7 space-y-4">
            <label className="block">
              <span className="mb-2 block text-lg font-medium text-white/90">
                Temporary Password
              </span>
              <input
                type={showPasswords ? "text" : "password"}
                value={currentPassword}
                onChange={(event) => setCurrentPassword(event.target.value)}
                className="w-full rounded-xl border border-white/20 bg-white/90 px-4 py-3 text-lg text-slate-900 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-400"
                required
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-lg font-medium text-white/90">
                New Password
              </span>
              <input
                type={showPasswords ? "text" : "password"}
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                className="w-full rounded-xl border border-white/20 bg-white/90 px-4 py-3 text-lg text-slate-900 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-400"
                required
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-lg font-medium text-white/90">
                Confirm New Password
              </span>
              <input
                type={showPasswords ? "text" : "password"}
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                className="w-full rounded-xl border border-white/20 bg-white/90 px-4 py-3 text-lg text-slate-900 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-400"
                required
              />
            </label>

            <button
              type="button"
              onClick={() => setShowPasswords((current) => !current)}
              className="inline-flex cursor-pointer items-center gap-2 text-sm font-medium text-blue-100 underline underline-offset-4 hover:text-white"
            >
              {showPasswords ? <EyeOff size={18} /> : <Eye size={18} />}
              {showPasswords ? "Hide passwords" : "Show passwords"}
            </button>

            {error && (
              <p className="rounded-xl border border-red-300/40 bg-red-500/20 px-4 py-3 text-sm text-white">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full cursor-pointer rounded-xl bg-gradient-to-r from-sky-400 via-blue-600 to-slate-950 px-4 py-3 text-base font-semibold text-white shadow-lg transition duration-300 hover:scale-[1.01] hover:shadow-blue-500/30 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? "Saving..." : "Save New Password"}
            </button>
          </form>
        </div>
      </div>

      <div className="absolute inset-0 bg-[url('/images/intern.jpg')] bg-[length:110px] bg-repeat opacity-[0.07]" />
    </div>
  );
}
