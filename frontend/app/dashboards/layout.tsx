"use client";

import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { clearAuthSession, getToken } from "../difm/lib/api";
import {
  LayoutDashboard,
  Users,
  FileText,
  MessageSquare,
  Ticket,
  LogOut,
  Menu,
  X,
} from "lucide-react";

const navItems = [
  { name: "Overview", path: "/dashboards/overview", icon: LayoutDashboard },
  { name: "Customers", path: "/dashboards/customers", icon: Users },
  { name: "Invoices", path: "/dashboards/invoices", icon: FileText },
  { name: "Feedback", path: "/dashboards/feedback", icon: MessageSquare },
  { name: "Tickets", path: "/dashboards/tickets", icon: Ticket },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    if (!getToken()) {
      router.push("/");
    }
  }, [router]);

  const currentPageName = useMemo(() => {
    const found = navItems.find((item) => item.path === pathname);
    return found?.name ?? "Dashboard";
  }, [pathname]);

  const handleNavigate = (path: string) => {
    router.push(path);
    setMobileMenuOpen(false);
  };

  const handleLogout = () => {
    clearAuthSession();
    router.push("/");
    setMobileMenuOpen(false);
  };

  const logoutButtonClass =
    "flex w-full cursor-pointer items-center gap-4 rounded-xl px-5 py-4 text-left text-lg font-semibold tracking-wide text-slate-300 transition-all duration-200 hover:bg-red-500/10 hover:text-red-400 active:scale-[0.98]";

  return (
    <div className="min-h-screen bg-slate-100">
      {/* MOBILE TOP BAR */}
      <header className="sticky top-0 z-40 flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3 shadow-sm md:hidden">
        <div className="flex items-center gap-3">
          <Image
            src="/images/intern.jpg"
            alt="DIFMS Logo"
            width={42}
            height={42}
            className="h-auto w-auto rounded-md object-contain"
            priority
          />
          <div>
            <h1 className="text-sm font-bold text-slate-900">DIFMS</h1>
            <p className="text-xs text-slate-500">{currentPageName}</p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setMobileMenuOpen((prev) => !prev)}
          className="cursor-pointer rounded-lg p-2 text-slate-700 transition hover:bg-slate-100"
          aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
        >
          {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </header>

      <div className="flex min-h-screen">
        {/* DESKTOP SIDEBAR */}
        <aside className="hidden w-72 flex-col bg-gradient-to-b from-slate-600 to-slate-900 text-white shadow-xl md:flex">
          <div className="border-b border-slate-700 px-5 py-6">
            <div className="flex items-center gap-4">
              <Image
                src="/images/intern.jpg"
                alt="DIFMS Logo"
                width={70}
                height={70}
                className="h-auto w-auto rounded-md object-contain"
                priority
              />
              <div>
                <h1 className="text-xl font-bold tracking-wide">DIFMS</h1>
                <p className="text-sm text-slate-300">Admin Panel</p>
              </div>
            </div>
          </div>

          <nav className="flex-1 px-4 py-6">
            <div className="space-y-3">
              {navItems.map((item) => {
                const isActive = pathname === item.path;
                const Icon = item.icon;

                return (
                  <button
                    key={item.name}
                    onClick={() => handleNavigate(item.path)}
                    className={`flex w-full cursor-pointer items-center gap-4 rounded-xl px-5 py-4 text-left text-lg font-semibold tracking-wide transition-all duration-200 ${
                      isActive
                        ? "bg-blue-600 text-white shadow-md"
                        : "text-slate-200 hover:bg-slate-700 hover:text-white"
                    }`}
                  >
                    <Icon size={22} />
                    <span>{item.name}</span>
                  </button>
                );
              })}
            </div>
          </nav>

          <div className="border-t border-slate-700 px-3 pb-4 pt-4">
            <button onClick={handleLogout} className={logoutButtonClass}>
              <LogOut size={22} />
              <span>Logout</span>
            </button>
          </div>
        </aside>

        {/* MOBILE DRAWER */}
        {mobileMenuOpen && (
          <>
            <div
              className="fixed inset-0 z-40 bg-black/40 md:hidden"
              onClick={() => setMobileMenuOpen(false)}
            />

            <aside className="fixed left-0 top-0 z-50 flex h-full w-72 flex-col bg-gradient-to-b from-slate-600 to-slate-900 text-white shadow-2xl md:hidden">
              <div className="flex items-center justify-between border-b border-slate-700 px-5 py-5">
                <div className="flex items-center gap-3">
                  <Image
                    src="/images/intern.jpg"
                    alt="DIFMS Logo"
                    width={52}
                    height={52}
                    className="h-auto w-auto rounded-md object-contain"
                    priority
                  />
                  <div>
                    <h1 className="text-lg font-bold tracking-wide">DIFMS</h1>
                    <p className="text-xs text-slate-300">Admin Panel</p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setMobileMenuOpen(false)}
                  className="cursor-pointer rounded-lg p-2 text-white transition hover:bg-slate-700"
                  aria-label="Close menu"
                >
                  <X size={22} />
                </button>
              </div>

              <nav className="flex-1 px-4 py-6">
                <div className="space-y-3">
                  {navItems.map((item) => {
                    const isActive = pathname === item.path;
                    const Icon = item.icon;

                    return (
                      <button
                        key={item.name}
                        onClick={() => handleNavigate(item.path)}
                        className={`flex w-full cursor-pointer items-center gap-4 rounded-xl px-5 py-4 text-left text-base font-semibold tracking-wide transition-all duration-200 ${
                          isActive
                            ? "bg-blue-600 text-white shadow-md"
                            : "text-slate-200 hover:bg-slate-700 hover:text-white"
                        }`}
                      >
                        <Icon size={20} />
                        <span>{item.name}</span>
                      </button>
                    );
                  })}
                </div>
              </nav>

              <div className="border-t border-slate-700 px-3 pb-4 pt-4">
                <button onClick={handleLogout} className={logoutButtonClass}>
                  <LogOut size={22} />
                  <span>Logout</span>
                </button>
              </div>
            </aside>
          </>
        )}

        {/* MAIN CONTENT */}
        <main className="min-w-0 flex-1 bg-gradient-to-br from-slate-600 via-slate-500 to-slate-900 p-4 sm:p-5 md:p-6">{children}</main>
      </div>
    </div>
  );
}