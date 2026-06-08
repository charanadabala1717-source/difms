"use client";

import Image from "next/image";
import { FormEvent, Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";
import { apiRequest } from "../difm/lib/api";

function ResetPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage("");
    setError("");

    if (!token) {
      setError("Reset token is missing.");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Password and confirm password do not match.");
      return;
    }

    try {
      setIsSubmitting(true);
      const response = await apiRequest<{ message: string }>("/auth/reset-password", {
        method: "POST",
        body: JSON.stringify({ token, password }),
        skipAuth: true,
      });
      setMessage(response.message);
      setPassword("");
      setConfirmPassword("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to reset password");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top_left,_#60a5fa_0%,_#1e3a8a_28%,_#0f172a_58%,_#000000_82%,_#dbeafe_100%)]">
      <div className="absolute inset-0 bg-black/10" />
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
            Reset Password
          </h1>

          <form onSubmit={handleSubmit} className="mt-7 space-y-4">
            <label className="block">
              <span className="mb-2 block text-lg font-medium text-white/90">
                New Password
              </span>
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="w-full rounded-xl border border-white/20 bg-white/90 px-4 py-3 text-lg text-slate-900 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-400"
                required
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-lg font-medium text-white/90">
                Confirm Password
              </span>
              <input
                type={showPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                className="w-full rounded-xl border border-white/20 bg-white/90 px-4 py-3 text-lg text-slate-900 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-400"
                required
              />
            </label>

            <button
              type="button"
              onClick={() => setShowPassword((current) => !current)}
              className="inline-flex cursor-pointer items-center gap-2 text-sm font-medium text-blue-100 underline underline-offset-4 hover:text-white"
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              {showPassword ? "Hide password" : "Show password"}
            </button>

            {message && (
              <p className="rounded-xl border border-green-300/40 bg-green-500/20 px-4 py-3 text-sm text-white">
                {message}
              </p>
            )}

            {error && (
              <p className="rounded-xl border border-red-300/40 bg-red-500/20 px-4 py-3 text-sm text-white">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full cursor-pointer rounded-xl bg-gradient-to-r from-sky-400 via-blue-600 to-slate-950 px-4 py-3 text-base font-semibold text-white shadow-lg transition duration-300 hover:scale-[1.01] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? "Saving..." : "Reset Password"}
            </button>

            <button
              type="button"
              onClick={() => router.push("/")}
              className="w-full cursor-pointer text-sm font-medium text-blue-100 underline underline-offset-4 hover:text-white"
            >
              Back to login
            </button>
          </form>
        </div>
      </div>
      <div className="absolute inset-0 bg-[url('/images/intern.jpg')] bg-[length:110px] bg-repeat opacity-[0.07]" />
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-slate-950 text-white">
          Loading reset form...
        </div>
      }
    >
      <ResetPasswordContent />
    </Suspense>
  );
}
