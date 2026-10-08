import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { copyFileSync, mkdtempSync, symlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { scramVerifier } from "./api-role-password.mjs";

test("makes the verifier Postgres itself stores for a password", () => {
  // From PostgreSQL 17: SET password_encryption = 'scram-sha-256'; CREATE ROLE … PASSWORD 'Field maps tést 1';
  // then rolpassword from pg_authid. The salt and iteration count are read back from it.
  const expected =
    "SCRAM-SHA-256$4096:AR2bI3epXsoM61LcDIwAPg==$Nzxq+Yk1PcxmSYxjNRdtlnI3kvN/EqB5AkMmwadLveM=:gwoakh+J9oQeQ976TJNaq/UsXGf1QRoOrK/VG8IH6/k=";
  const salt = Buffer.from("AR2bI3epXsoM61LcDIwAPg==", "base64");
  assert.equal(scramVerifier("Field maps tést 1", salt, 4096), expected);
});

test("prints the SQL and the password when run from a path with a space, through a link", () => {
  const script = fileURLToPath(new URL("./api-role-password.mjs", import.meta.url));
  const folder = mkdtempSync(join(tmpdir(), "role password "));
  copyFileSync(script, join(folder, "api-role-password.mjs"));
  symlinkSync(folder, `${folder} link`);
  const output = execFileSync(process.execPath, [join(`${folder} link`, "api-role-password.mjs")], {
    encoding: "utf8",
  });
  assert.match(output, /ALTER ROLE fieldmaps_api WITH PASSWORD 'SCRAM-SHA-256\$4096:[^']+';/);
  assert.match(output, /^ {3}[0-9a-f]{48}$/m);
});
