"use client";

import Image from "next/image";
import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { useRouter } from "next/navigation";
import { apiRequest, setAuthSession } from "../difm/lib/api";

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

export default function Login() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      const endpoint = authMode === "login" ? "/auth/login" : "/auth/register";
      const body =
        authMode === "login"
          ? { email, password }
          : { name, email, password };

      const user = await apiRequest<AuthResponse>(endpoint, {
        method: "POST",
        body: JSON.stringify(body),
        skipAuth: true,
      });

      setAuthSession(user.token, user);
      router.push(user.mustChangePassword ? "/change-password" : "/dashboards/overview");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Authentication failed");
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
        <div className="w-full max-w-md rounded-3xl border border-white/20 bg-white/20 p-6 shadow-2xl backdrop-blur-xl sm:p-8">
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

          <h1 className="mb-7 text-center text-3xl font-semibold tracking-wide text-white sm:text-4xl">
            {authMode === "login" ? "Admin Login" : "Create Account"}
          </h1>

          <form onSubmit={handleSubmit} className="space-y-4">
            {authMode === "register" && (
              <div>
                <label className="mb-2 block text-lg font-medium text-white/90">
                  Name
                </label>
                <input
                  type="text"
                  placeholder="Enter your name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-xl border border-white/20 bg-white/90 px-4 py-3 text-lg text-slate-900 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-400"
                  required
                />
              </div>
            )}

            <div>
              <label className="mb-2 block text-lg font-medium text-white/90">
                Email
              </label>
              <input
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-xl border border-white/20 bg-white/90 px-4 py-3 text-lg text-slate-900 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-400"
                required
              />
            </div>

            <div>
                <label className="mb-2 block text-lg font-medium text-white/90">
                    Password
                </label>

                    <div className="relative">
                        <input
                            type={showPassword ? "text" : "password"}
                            placeholder="Enter your password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full rounded-xl border border-white/15 bg-white/90 px-4 py-3 pr-12 text-lg text-slate-900 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-400/60"
                            required
                        />

                        <button
                        type="button"
                        onClick={() => setShowPassword((prev) => !prev)}
                        className="absolute inset-y-0 right-0 flex items-center px-4 text-slate-600 cursor-pointer"
                        aria-label={showPassword ? "Hide password" : "Show password"}
                        >
                        {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                        </button>
                    </div>
            </div>

            {error && (
              <p className="rounded-xl border border-red-300/40 bg-red-500/20 px-4 py-3 text-sm text-white">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full cursor-pointer rounded-xl bg-gradient-to-r from-sky-400 via-blue-600 to-slate-950 px-4 py-3 text-base font-semibold text-white shadow-lg transition duration-300 hover:scale-[1.01] hover:shadow-blue-500/30 active:scale-[0.99]"
            >
              {isSubmitting
                ? "Please wait..."
                : authMode === "login"
                  ? "Login"
                  : "Register"}
            </button>

            {authMode === "login" && (
              <button
                type="button"
                onClick={() => router.push("/forgot-password")}
                className="w-full cursor-pointer text-sm font-medium text-blue-100 underline underline-offset-4 hover:text-white"
              >
                Forgot password?
              </button>
            )}

            <button
              type="button"
              onClick={() => {
                setAuthMode((prev) => (prev === "login" ? "register" : "login"));
                setName("");
                setError("");
              }}
              className="w-full cursor-pointer text-sm font-medium text-blue-100 underline underline-offset-4 hover:text-white"
            >
              {authMode === "login"
                ? "Create a new account"
                : "Already have an account? Login"}
            </button>
          </form>
          
        </div>
        
        
         </div>
                <div className="absolute inset-0 opacity-[0.07] bg-[url('/images/intern.jpg')]
                bg-repeat bg-[length:110px]">
               </div>


    </div>
  );
}
