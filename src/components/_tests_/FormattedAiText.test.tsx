import "@testing-library/jest-dom";
import { render, screen, within } from "@testing-library/react";

import { FormattedAiText } from "../FormattedAiText";

describe("FormattedAiText", () => {
  it("renders headings, paragraphs, links, emphasis, inline code, and lists", () => {
    render(
      <FormattedAiText
        content={[
          "## What changed",
          "",
          "The **county** should review `fees` and visit [official source](https://example.com).",
          "",
          "- Ask for public participation dates",
          "- Share a plain-language summary",
          "",
          "1. Read the bill",
          "2. Submit comments",
        ].join("\n")}
      />,
    );

    expect(
      screen.getByRole("heading", { name: "What changed", level: 3 }),
    ).toBeInTheDocument();
    expect(screen.getByText("county")).toBeInTheDocument();
    expect(screen.getByText("fees")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "official source" }),
    ).toHaveAttribute("href", "https://example.com");

    const lists = screen.getAllByRole("list");
    expect(within(lists[0]).getAllByRole("listitem")).toHaveLength(2);
    expect(within(lists[1]).getAllByRole("listitem")).toHaveLength(2);
  });

  it("preserves fenced code blocks without formatting their contents", () => {
    render(
      <FormattedAiText
        content={[
          "Before",
          "",
          "```",
          "const message = '**not bold**';",
          "console.log(message);",
          "```",
        ].join("\n")}
      />,
    );

    expect(screen.getByText("Before")).toBeInTheDocument();
    expect(screen.getByText(/const message/).textContent).toBe(
      "const message = '**not bold**';\nconsole.log(message);",
    );
  });
});
