"use client";

import Image from "next/image";
import { useState } from "react";

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    console.log({ username, password });
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
              src="/images/logo-1.jpg"
              alt="DIFMS Logo"
              width={180}
              height={80}
              className="h-auto w-auto rounded-md object-contain"
              priority
            />
          </div>

          <h1 className="mb-7 text-center text-3xl font-semibold tracking-wide text-white sm:text-4xl">
            Admin Login
          </h1>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="mb-2 block text-sm font-medium text-white/90">
                Username
              </label>
              <input
                type="text"
                placeholder="Enter your username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full rounded-xl border border-white/20 bg-white/90 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-400"
                required
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-white/90">
                Password
              </label>
              <input
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-xl border border-white/20 bg-white/90 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-400"
                required
              />
            </div>

            <div className="text-right">
              <a
                href="#"
                className="text-sm text-blue-100 underline underline-offset-4 hover:text-white"
              >
                Forgot password?
              </a>
            </div>

            <button
              type="submit"
              className="w-full cursor-pointer rounded-xl bg-gradient-to-r from-sky-400 via-blue-600 to-slate-950 px-4 py-3 text-base font-semibold text-white shadow-lg transition duration-300 hover:scale-[1.01] hover:shadow-blue-500/30 active:scale-[0.99]"
            >
              Login
            </button>
          </form>
          
        </div>
        
        
      </div>
      {/* Pattern */}
        <div className="absolute inset-0 opacity-[0.07] bg-[url('/images/logo-1.jpg')]
        bg-repeat bg-[length:110px]">
        </div>


    </div>
  );
}