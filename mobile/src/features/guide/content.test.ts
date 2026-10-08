import { describe, expect, it } from "vitest";
import { GUIDE, searchGuide } from "./content";

describe("field guide", () => {
  it("covers placing, the three rounds and uploading", () => {
    const titles = GUIDE.map((section) => section.title);
    expect(titles).toEqual(
      expect.arrayContaining(["Placing a point", "The three rounds", "Saving and uploading"]),
    );
    expect(new Set(GUIDE.map((section) => section.id)).size).toBe(GUIDE.length);
  });

  it("shows every section for an empty search", () => {
    expect(searchGuide("  ")).toHaveLength(GUIDE.length);
  });

  it("finds sections containing every word, ignoring case", () => {
    expect(searchGuide("Reliability").map((section) => section.id)).toEqual(["rounds"]);
    expect(searchGuide("cross zone").map((section) => section.id)).toEqual(["zones"]);
    expect(searchGuide("PIN map").map((section) => section.id)).toEqual(["placing"]);
    expect(searchGuide("nonexistent words")).toEqual([]);
  });

  it("explains the queue words the screens use", () => {
    const saving = GUIDE.find((section) => section.id === "saving");
    const text = saving?.body.join(" ") ?? "";
    for (const word of ["On device", "Uploaded", "Held", "Needs attention"])
      expect(text).toContain(word);
  });
});
