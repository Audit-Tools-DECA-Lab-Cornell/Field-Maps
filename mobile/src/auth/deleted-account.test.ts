import { expect, it, vi } from "vitest";

const files = new Map<string, string>();
vi.mock("expo-file-system", () => ({
  Paths: { document: "documents" },
  File: class {
    readonly path: string;
    constructor(...parts: string[]) {
      this.path = parts.join("/");
    }
    get exists() {
      return files.has(this.path);
    }
    textSync() {
      return files.get(this.path) ?? "";
    }
    write(value: string) {
      files.set(this.path, value);
    }
    delete() {
      files.delete(this.path);
    }
  },
}));

import { deletedAccountStore } from "./deleted-account";

it("retains deleted identity for offline SQLite visibility without retaining a session", () => {
  const account = { id: "50000000-0000-4000-8000-000000000001", email: "test@example.test" };
  deletedAccountStore("https://auth.example.test").write(account);
  expect(deletedAccountStore("https://auth.example.test").read()).toEqual(account);
  expect(deletedAccountStore("https://other.example.test").read()).toBeNull();
  expect([...files.values()].join()).not.toContain("access_token");
  deletedAccountStore("https://auth.example.test").clear();
  expect(deletedAccountStore("https://auth.example.test").read()).toBeNull();
});
