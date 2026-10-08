import assert from "node:assert/strict";
import { test } from "node:test";
import { localUrl, main } from "./seed-web-workspace.mjs";

test("the seed refuses hosted, ambiguous and credential-bearing targets", async () => {
  for (const target of ["https://example.supabase.co", "http://localhost.evil:8001",
    "http://127.0.0.1:8000", "http://user:password@127.0.0.1:8001",
    "http://127.0.0.1:8001/path", "http://127.0.0.1:8001/?next=hosted"])
    await assert.rejects(main(["--api-url", target]), /loopback/);
});

test("the seed accepts only the documented local ports and origins", () => {
  assert.equal(localUrl("http://127.0.0.1:8001/", 8001), "http://127.0.0.1:8001");
  assert.equal(localUrl("http://localhost:54321", 54321), "http://localhost:54321");
  assert.throws(() => localUrl("https://example.supabase.co", 54321), /loopback/);
});
