import { describe, expect, it } from "vitest";
import {
  cleanName,
  initialsProblem,
  isValidInitials,
  nameProblem,
  suggestInitials,
  typedInitials,
} from "./identity";

describe("observer initials", () => {
  it.each(["P", "PS", "PS2", "ABCDEFGHIJ", "0123456789"])("accepts %s", (value) => {
    expect(isValidInitials(value)).toBe(true);
    expect(initialsProblem(value)).toBeUndefined();
  });

  it.each([
    ["", "Enter up to 10 uppercase characters"],
    ["ABCDEFGHIJK", "Enter up to 10 uppercase characters"],
    ["ps", "Use the letters A to Z and numbers only"],
    ["P.S", "Use the letters A to Z and numbers only"],
    ["ÓR", "Use the letters A to Z and numbers only"],
  ])("rejects %j with a message that says what is needed", (value, message) => {
    expect(isValidInitials(value)).toBe(false);
    expect(initialsProblem(value)).toBe(message);
  });

  it("uppercases as typed, drops spaces and stops at ten characters", () => {
    expect(typedInitials("p s")).toBe("PS");
    expect(typedInitials("abcdefghijkl")).toBe("ABCDEFGHIJ");
    expect(typedInitials("p.s")).toBe("P.S");
  });

  it("suggests initials from a name, without accents, up to three letters", () => {
    expect(suggestInitials("Pratyush Sudhakar")).toBe("PS");
    expect(suggestInitials("  janet   loebach ")).toBe("JL");
    expect(suggestInitials("Mary Ann Van Smith")).toBe("MAV");
    expect(suggestInitials("Ólafur Ragnar")).toBe("OR");
    expect(suggestInitials("")).toBe("");
  });
});

describe("full name", () => {
  it("needs at least one character that is not a space", () => {
    expect(nameProblem("   ")).toBe("Enter your full name");
    expect(nameProblem("Janet Loebach")).toBeUndefined();
  });

  it("is kept trimmed with single spaces", () => {
    expect(cleanName("  Janet   Loebach ")).toBe("Janet Loebach");
  });
});
