import { useClerk } from "@clerk/clerk-react";
import { Link, Outlet, useNavigate } from "@tanstack/react-router";
import {
  FileText,
  LayoutDashboard,
  LogIn,
  LogOut,
  Menu,
  Sparkles,
  UserCog,
  UserPlus,
  X,
} from "lucide-react";
import { useState } from "react";
import type React from "react";
import { Toaster } from "sonner";
import { useAuth } from "../lib/auth";

export function AppShell() {
  const auth = useAuth();
  const clerk = useClerk();
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const closeMenu = () => setIsMenuOpen(false);
  const signOut = async () => {
    closeMenu();

    if (auth.isClerkEnabled) {
      await clerk.signOut({ redirectUrl: "/" });
      return;
    }

    await auth.localLogout();
    await navigate({ to: "/" });
  };

  return (
    <div className="min-h-screen bg-civic-50">
      <header className="border-b border-civic-100 bg-white">
        <nav className="page-shell relative flex items-center justify-between gap-3 py-4">
          <Link
            to="/"
            className="flex min-w-0 items-center gap-2 text-lg font-bold text-civic-900"
          >
            <span className="grid size-9 shrink-0 place-items-center rounded-md bg-civic-700 text-white">
              <Sparkles size={18} />
            </span>
            <span className="truncate">Mwananchi App</span>
          </Link>
          <button
            aria-expanded={isMenuOpen}
            aria-label={
              isMenuOpen ? "Close navigation menu" : "Open navigation menu"
            }
            className="btn-secondary px-3"
            type="button"
            onClick={() => setIsMenuOpen((value) => !value)}
          >
            {isMenuOpen ? <X size={18} /> : <Menu size={18} />}
            <span className="hidden sm:inline">Menu</span>
          </button>
          {isMenuOpen ? (
            <div className="absolute right-4 top-[calc(100%-0.5rem)] z-20 w-[min(18rem,calc(100vw-2rem))] rounded-lg border border-civic-100 bg-white p-2 shadow-lg">
              {auth.isAuthenticated ? (
                <div className="grid gap-1">
                  <MenuLink
                    to="/dashboard"
                    icon={<LayoutDashboard size={16} />}
                    label="Dashboard"
                    onSelect={closeMenu}
                  />
                  <MenuLink
                    to="/account"
                    icon={<UserCog size={16} />}
                    label="Account"
                    onSelect={closeMenu}
                  />
                  <Link
                    to="/briefs/new"
                    className="flex items-center gap-2 rounded-md px-3 py-2 text-sm font-semibold text-civic-800 transition hover:bg-civic-50"
                    onClick={closeMenu}
                  >
                    <FileText size={16} />
                    New brief
                  </Link>
                  <button
                    className="flex items-center gap-2 rounded-md px-3 py-2 text-left text-sm font-semibold text-slate-700 transition hover:bg-civic-50"
                    type="button"
                    onClick={() => {
                      void signOut();
                    }}
                  >
                    <LogOut size={16} />
                    Sign out
                  </button>
                </div>
              ) : (
                <div className="grid gap-1">
                  <Link
                    to="/login"
                    className="flex items-center gap-2 rounded-md px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-civic-50"
                    onClick={closeMenu}
                  >
                    <LogIn size={16} />
                    Sign in
                  </Link>
                  <Link
                    to="/register"
                    className="flex items-center gap-2 rounded-md bg-civic-700 px-3 py-2 text-sm font-semibold text-white transition hover:bg-civic-800"
                    onClick={closeMenu}
                  >
                    <UserPlus size={16} />
                    Create account
                  </Link>
                </div>
              )}
            </div>
          ) : null}
        </nav>
      </header>
      <Outlet />
      <Toaster position="top-right" richColors />
    </div>
  );
}

function MenuLink({
  to,
  icon,
  label,
  onSelect,
}: {
  to: "/dashboard" | "/account";
  icon: React.ReactNode;
  label: string;
  onSelect: () => void;
}) {
  return (
    <Link
      to={to}
      className="flex items-center gap-2 rounded-md px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-civic-50"
      onClick={onSelect}
    >
      {icon}
      {label}
    </Link>
  );
}
