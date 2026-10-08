import { describe, expect, it } from "vitest";
import {
  cleanName,
  initialsProblem,
  isValidInitials,
  nameProblem,
  profileDefaults,
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

describe("where the identity step starts", () => {
  const server = { display_name: "Pratyush Sudhakar", observer_initials: "PSU" };

  it("starts from the account's server profile, set on the web or another phone", () => {
    expect(profileDefaults({ local: null, server, accountName: "P Sudhakar" })).toEqual({
      name: "Pratyush Sudhakar",
      initials: "PSU",
      initialsChosen: true,
    });
  });

  it("lets an edit still waiting on this phone win over the server", () => {
    const local = { name: "Pratyush S", initials: "PS2", pending: true };
    expect(profileDefaults({ local, server, accountName: "" })).toEqual({
      name: "Pratyush S",
      initials: "PS2",
      initialsChosen: true,
    });
  });

  it("prefers the server to a copy here it already confirmed", () => {
    const local = { name: "Old Name", initials: "ON", pending: false };
    expect(profileDefaults({ local, server, accountName: "" }).initials).toBe("PSU");
  });

  it("suggests initials from the server name when the account has none yet", () => {
    expect(
      profileDefaults({
        local: null,
        server: { display_name: "Janet Loebach", observer_initials: null },
        accountName: "",
      }),
    ).toEqual({ name: "Janet Loebach", initials: "JL", initialsChosen: false });
  });

  it("falls back to the name the account was created with, then to nothing", () => {
    expect(profileDefaults({ local: null, server: null, accountName: "Alex Rivera" })).toEqual({
      name: "Alex Rivera",
      initials: "AR",
      initialsChosen: false,
    });
    expect(profileDefaults({ local: null, server: null, accountName: "" })).toEqual({
      name: "",
      initials: "",
      initialsChosen: false,
    });
  });

  it("does not start from initials the field would refuse", () => {
    expect(
      profileDefaults({
        local: null,
        server: { display_name: "Janet Loebach", observer_initials: "j.l" },
        accountName: "",
      }),
    ).toEqual({ name: "Janet Loebach", initials: "JL", initialsChosen: false });
  });
});
