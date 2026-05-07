import { useClerk } from "@clerk/clerk-react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useForm } from "@tanstack/react-form";
import { Eye, EyeOff, LogIn, UserPlus, UserCog, LogOut } from "lucide-react";
import { useEffect, useState } from "react";
import { useAuth } from "../../lib/auth";
import { AuthFormShell, AuthRedirectingCard } from "./AuthShell";
import { useI18n } from "../../lib/i18n";

export function LoginPage() {
  const auth = useAuth();
  const clerk = useClerk();
  const navigate = useNavigate();
  const { t } = useI18n();
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const form = useForm({
    defaultValues: {
      email: "",
      password: "",
    },
    onSubmit: async ({ value }) => {
      await auth.localLogin(value);
      await navigate({ to: "/dashboard" });
    },
  });

  useEffect(() => {
    if (!auth.isLoading && auth.isAuthenticated) {
      void navigate({ to: "/dashboard", replace: true });
    }
  }, [auth.isAuthenticated, auth.isLoading, navigate]);

  if (auth.isAuthenticated) return <AuthRedirectingCard />;

  return (
    <AuthFormShell
      eyebrow={t("auth.welcomeBack.eyebrow")}
      title={t("auth.welcomeBack.title")}
      description={
        auth.isClerkEnabled
          ? t("auth.welcomeBack.desc.clerk")
          : t("auth.welcomeBack.desc.local")
      }
      footer={
        <span dangerouslySetInnerHTML={{__html: t("auth.footer.newHere").replace('{link}',`<a href=\"/register\" class=\"font-semibold text-civic-700\">${t("auth.button.createAccount")}</a>`)}} />
      }
    >
      {auth.isClerkEnabled ? (
        <button
          className="btn-primary w-full"
          type="button"
          onClick={() => {
            void clerk.openSignIn({
              forceRedirectUrl: "/dashboard",
              fallbackRedirectUrl: "/dashboard",
            });
          }}
        >
          <LogIn size={16} />
          {t("auth.continueWithClerk")}
        </button>
      ) : (
        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            void form.handleSubmit();
          }}
        >
          <form.Field name="email">
            {(field) => (
              <label className="block">
                <span className="text-sm font-semibold">{t("auth.field.email")}</span>
                <input
                  className="mt-2 w-full rounded-md border border-civic-100 px-3 py-2"
                  type="email"
                  value={field.state.value}
                  onChange={(event) => field.handleChange(event.target.value)}
                  required
                />
              </label>
            )}
          </form.Field>
          <form.Field name="password">
            {(field) => (
              <label className="block">
                <span className="text-sm font-semibold">{t("auth.field.password")}</span>
                <span className="relative mt-2 block">
                  <input
                    className="w-full rounded-md border border-civic-100 px-3 py-2 pr-11"
                    type={isPasswordVisible ? "text" : "password"}
                    value={field.state.value}
                    onChange={(event) => field.handleChange(event.target.value)}
                    required
                  />
                  <button
                    aria-label={
                      isPasswordVisible ? t("auth.hidePassword") : t("auth.showPassword")
                    }
                    className="absolute inset-y-0 right-2 grid w-8 place-items-center text-slate-500 transition hover:text-civic-700"
                    type="button"
                    onClick={() => setIsPasswordVisible((value) => !value)}
                  >
                    {isPasswordVisible ? (
                      <EyeOff size={18} />
                    ) : (
                      <Eye size={18} />
                    )}
                  </button>
                </span>
              </label>
            )}
          </form.Field>
          <button className="btn-primary w-full" type="submit">
            <LogIn size={16} />
            {t("auth.button.signin")}
          </button>
        </form>
      )}
    </AuthFormShell>
  );
}

export function RegisterPage() {
  const auth = useAuth();
  const clerk = useClerk();
  const navigate = useNavigate();
  const { t } = useI18n();
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const form = useForm({
    defaultValues: {
      name: "",
      email: "",
      password: "",
    },
    onSubmit: async ({ value }) => {
      await auth.localRegister(value);
      await navigate({ to: "/dashboard" });
    },
  });

  useEffect(() => {
    if (!auth.isLoading && auth.isAuthenticated) {
      void navigate({ to: "/dashboard", replace: true });
    }
  }, [auth.isAuthenticated, auth.isLoading, navigate]);

  if (auth.isAuthenticated) return <AuthRedirectingCard />;

  return (
    <AuthFormShell
      eyebrow={t("auth.register.eyebrow")}
      title={t("auth.register.title")}
      description={
        auth.isClerkEnabled
          ? t("auth.register.desc.clerk")
          : t("auth.register.desc.local")
      }
      footer={
        <span dangerouslySetInnerHTML={{__html: t("auth.footer.haveAccount").replace('{link}',`<a href=\"/login\" class=\"font-semibold text-civic-700\">${t("auth.button.signin")}</a>`)}} />
      }
    >
      {auth.isClerkEnabled ? (
        <button
          className="btn-primary w-full"
          type="button"
          onClick={() => {
            void clerk.openSignUp({
              forceRedirectUrl: "/dashboard",
              fallbackRedirectUrl: "/dashboard",
            });
          }}
        >
          <UserPlus size={16} />
          {t("auth.continueWithClerk")}
        </button>
      ) : (
        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            void form.handleSubmit();
          }}
        >
          <form.Field name="name">
            {(field) => (
              <label className="block">
                <span className="text-sm font-semibold">{t("auth.field.name")}</span>
                <input
                  className="mt-2 w-full rounded-md border border-civic-100 px-3 py-2"
                  value={field.state.value}
                  onChange={(event) => field.handleChange(event.target.value)}
                  required
                />
              </label>
            )}
          </form.Field>
          <form.Field name="email">
            {(field) => (
              <label className="block">
                <span className="text-sm font-semibold">{t("auth.field.email")}</span>
                <input
                  className="mt-2 w-full rounded-md border border-civic-100 px-3 py-2"
                  type="email"
                  value={field.state.value}
                  onChange={(event) => field.handleChange(event.target.value)}
                  required
                />
              </label>
            )}
          </form.Field>
          <form.Field name="password">
            {(field) => (
              <label className="block">
                <span className="text-sm font-semibold">{t("auth.field.password")}</span>
                <span className="relative mt-2 block">
                  <input
                    className="w-full rounded-md border border-civic-100 px-3 py-2 pr-11"
                    type={isPasswordVisible ? "text" : "password"}
                    value={field.state.value}
                    onChange={(event) => field.handleChange(event.target.value)}
                    required
                    minLength={8}
                  />
                  <button
                    aria-label={
                      isPasswordVisible ? t("auth.hidePassword") : t("auth.showPassword")
                    }
                    className="absolute inset-y-0 right-2 grid w-8 place-items-center text-slate-500 transition hover:text-civic-700"
                    type="button"
                    onClick={() => setIsPasswordVisible((value) => !value)}
                  >
                    {isPasswordVisible ? (
                      <EyeOff size={18} />
                    ) : (
                      <Eye size={18} />
                    )}
                  </button>
                </span>
              </label>
            )}
          </form.Field>
          <button className="btn-primary w-full" type="submit">
            <UserPlus size={16} />
            {t("auth.button.createAccount")}
          </button>
        </form>
      )}
    </AuthFormShell>
  );
}
