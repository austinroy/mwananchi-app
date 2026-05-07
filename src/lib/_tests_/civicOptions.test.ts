import { categories, actionTypes, actionTones } from "../civicOptions";

describe("civicOptions", () => {
  it("exports expected categories, action types, and tones", () => {
    expect(categories).toContain("Budget");
    expect(actionTypes.some((t) => t.value === "email")).toBe(true);
    expect(actionTones).toContain("Respectful");
  });
});
