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
  useClerk: () => ({
    signOut: jest.fn(),
    openSignIn: jest.fn(),
    openSignUp: jest.fn(),
  }),
}));

import { AppShell } from "../AppShell";

describe("AppShell", () => {
  it("renders app name and language selector", () => {
    render(
      <I18nProvider>
        <AppShell />
      </I18nProvider>,
    );

    expect(screen.getAllByText("Mwananchi App")).toHaveLength(2);

    const menuButton = screen.getByRole("button", {
      name: "Open navigation menu",
    });
    expect(menuButton).toBeInTheDocument();
  });
});
