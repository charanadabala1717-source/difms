"use client";

import Image from "next/image";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { apiRequest } from "../difm/lib/api";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage("");
    setError("");

    try {
      setIsSubmitting(true);
      const response = await apiRequest<{ message: string }>("/auth/forgot-password", {
        method: "POST",
        body: JSON.stringify({ email }),
        skipAuth: true,
      });
      setMessage(response.message);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to request reset link");
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
            Forgot Password
          </h1>
          <p className="mt-3 text-center text-sm text-blue-100">
            Enter your email and we will send a password reset link.
          </p>

          <form onSubmit={handleSubmit} className="mt-7 space-y-4">
            <label className="block">
              <span className="mb-2 block text-lg font-medium text-white/90">Email</span>
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="w-full rounded-xl border border-white/20 bg-white/90 px-4 py-3 text-lg text-slate-900 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-400"
                required
              />
            </label>

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
              {isSubmitting ? "Sending..." : "Send Reset Link"}
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
