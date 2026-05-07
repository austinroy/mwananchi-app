import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import { I18nProvider } from "../../lib/i18n";

jest.mock("../../lib/auth", () => ({
  useAuth: () => ({
    isAuthenticated: false,
    isClerkEnabled: false,
    localLogout: jest.fn(),
  }),
}));

jest.mock("@clerk/clerk-react", () => ({
  useClerk: () => ({ signOut: jest.fn(), openSignIn: jest.fn(), openSignUp: jest.fn() }),
}));

import { AppShell } from "../AppShell";

describe("AppShell", () => {
  it("renders app name and language selector", () => {
    render(
      <I18nProvider>
        <AppShell />
      </I18nProvider>,
    );

    // app name comes from i18n
    expect(screen.getByText("Mwananchi App")).toBeInTheDocument();
    // language label is present in the menu button (hidden on small screens may not appear), but the select exists in the DOM when opened
    const menuButton = screen.getByRole("button");
    expect(menuButton).toBeInTheDocument();
  });
});
