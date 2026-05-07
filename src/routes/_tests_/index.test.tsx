import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import { I18nProvider } from "../../lib/i18n";
import { LandingPage } from "../index";

describe("LandingPage", () => {
  it("renders landing and action links", () => {
    render(
      <I18nProvider>
        <LandingPage />
      </I18nProvider>,
    );

    expect(
      screen.getByText("Turn public documents into public understanding."),
    ).toBeInTheDocument();
    // dashboard link should be present
    expect(
      screen.getByRole("link", { name: /View dashboard/i }),
    ).toBeInTheDocument();
  });
});
