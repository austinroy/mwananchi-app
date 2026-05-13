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
import { localeOptions, useI18n } from "../lib/i18n";

export function AppShell() {
  const auth = useAuth();
  const clerk = useClerk();
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { locale, setLocale, t } = useI18n();

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
    <div className="min-h-screen bg-transparent lg:grid lg:grid-cols-[17rem_minmax(0,1fr)]">
      <aside className="sticky top-0 z-30 hidden h-screen border-r border-white/40 bg-white/45 p-4 shadow-sm backdrop-blur-xl lg:flex lg:flex-col">
        <Link
          to="/"
          className="flex min-w-0 items-center gap-3 rounded-md px-2 py-2 text-lg font-bold text-civic-900"
        >
          <span className="grid size-10 shrink-0 place-items-center rounded-md bg-civic-700 text-white shadow-sm">
            <Sparkles size={18} />
          </span>
          <span className="truncate">{t("app.name")}</span>
        </Link>
        <nav className="mt-8 grid gap-2">
          <SideNavLink
            to="/dashboard"
            icon={<LayoutDashboard size={18} />}
            label={t("nav.dashboard")}
          />
          <SideNavLink
            to="/briefs/new"
            icon={<FileText size={18} />}
            label={t("nav.newBrief")}
          />
          {auth.isAuthenticated ? (
            <SideNavLink
              to="/account"
              icon={<UserCog size={18} />}
              label={t("nav.account")}
            />
          ) : null}
        </nav>
        <div className="mt-auto space-y-4 border-t border-white/45 pt-4">
          <label className="block px-1 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
            {t("nav.language")}
            <select
              className="mt-2 w-full rounded-md border border-white/50 bg-white/60 px-2 py-1.5 text-sm font-semibold normal-case tracking-normal text-slate-700 outline-none focus:border-civic-500 focus:ring-2 focus:ring-civic-100"
              value={locale}
              onChange={(event) =>
                setLocale(event.target.value as typeof locale)
              }
            >
              {localeOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          {auth.isAuthenticated ? (
            <button
              className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm font-semibold text-slate-700 transition hover:bg-white/60"
              type="button"
              onClick={() => {
                void signOut();
              }}
            >
              <LogOut size={16} />
              {t("nav.signOut")}
            </button>
          ) : (
            <div className="grid gap-2">
              <Link
                to="/login"
                className="flex items-center gap-2 rounded-md px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-white/60"
              >
                <LogIn size={16} />
                {t("nav.signIn")}
              </Link>
              <Link
                to="/register"
                className="flex items-center gap-2 rounded-md bg-civic-700 px-3 py-2 text-sm font-semibold text-white transition hover:bg-civic-900"
              >
                <UserPlus size={16} />
                {t("nav.createAccount")}
              </Link>
            </div>
          )}
        </div>
      </aside>
      <div className="min-w-0">
        <header className="sticky top-0 z-[70] border-b border-white/40 bg-white/45 shadow-sm backdrop-blur-xl lg:hidden">
          <nav className="page-shell relative flex items-center justify-between gap-3 py-4">
            <Link
              to="/"
              className="flex min-w-0 items-center gap-2 text-lg font-bold text-civic-900"
            >
              <span className="grid size-9 shrink-0 place-items-center rounded-md bg-civic-700 text-white">
                <Sparkles size={18} />
              </span>
              <span className="truncate">{t("app.name")}</span>
            </Link>
            <button
              aria-expanded={isMenuOpen}
              aria-label={isMenuOpen ? t("nav.close") : t("nav.open")}
              className="btn-secondary px-3"
              type="button"
              onClick={() => setIsMenuOpen((value) => !value)}
            >
              {isMenuOpen ? <X size={18} /> : <Menu size={18} />}
              <span className="hidden sm:inline">{t("nav.menu")}</span>
            </button>
            {isMenuOpen ? (
              <div className="absolute right-4 top-[calc(100%-0.5rem)] z-[80] w-[min(18rem,calc(100vw-2rem))] rounded-lg border border-white/60 bg-white/95 p-2 shadow-xl backdrop-blur-xl">
                <label className="mb-2 block px-3 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                  {t("nav.language")}
                  <select
                    className="mt-1 w-full rounded-md border border-white/50 bg-white/60 px-2 py-1.5 text-sm font-semibold normal-case tracking-normal text-slate-700 outline-none focus:border-civic-500 focus:ring-2 focus:ring-civic-100"
                    value={locale}
                    onChange={(event) =>
                      setLocale(event.target.value as typeof locale)
                    }
                  >
                    {localeOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
                {auth.isAuthenticated ? (
                  <div className="grid gap-1">
                    <MenuLink
                      to="/dashboard"
                      icon={<LayoutDashboard size={16} />}
                      label={t("nav.dashboard")}
                      onSelect={closeMenu}
                    />
                    <MenuLink
                      to="/account"
                      icon={<UserCog size={16} />}
                      label={t("nav.account")}
                      onSelect={closeMenu}
                    />
                    <MenuLink
                      to="/briefs/new"
                      icon={<FileText size={16} />}
                      label={t("nav.newBrief")}
                      onSelect={closeMenu}
                    />
                    <button
                      className="flex items-center gap-2 rounded-md px-3 py-2 text-left text-sm font-semibold text-slate-700 transition hover:bg-civic-50"
                      type="button"
                      onClick={() => {
                        void signOut();
                      }}
                    >
                      <LogOut size={16} />
                      {t("nav.signOut")}
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
                      {t("nav.signIn")}
                    </Link>
                    <Link
                      to="/register"
                      className="flex items-center gap-2 rounded-md bg-civic-700 px-3 py-2 text-sm font-semibold text-white transition hover:bg-civic-800"
                      onClick={closeMenu}
                    >
                      <UserPlus size={16} />
                      {t("nav.createAccount")}
                    </Link>
                  </div>
                )}
              </div>
            ) : null}
          </nav>
        </header>
        <Outlet />
      </div>
      <Toaster position="top-right" richColors />
    </div>
  );
}

function SideNavLink({
  to,
  icon,
  label,
}: {
  to: "/dashboard" | "/briefs/new" | "/account";
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <Link
      to={to}
      className="flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-white/60 hover:text-civic-900 [&.active]:bg-civic-700 [&.active]:text-white"
    >
      {icon}
      <span className="truncate">{label}</span>
    </Link>
  );
}

function MenuLink({
  to,
  icon,
  label,
  onSelect,
}: {
  to: "/dashboard" | "/briefs/new" | "/account";
  icon: React.ReactNode;
  label: string;
  onSelect: () => void;
}) {
  return (
    <Link
      to={to}
      className="flex items-center gap-2 rounded-md px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-civic-50 hover:text-civic-900 [&.active]:bg-civic-700 [&.active]:text-white"
      onClick={onSelect}
    >
      {icon}
      {label}
    </Link>
  );
}
