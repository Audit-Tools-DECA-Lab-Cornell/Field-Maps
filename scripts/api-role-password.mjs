#!/usr/bin/env node
// A new password for the hosted `fieldmaps_api` database role, made on this machine.
//
//   node scripts/api-role-password.mjs
//
// It prints two things: the password itself, for the API's `database-password` Secret File on Render,
// and an ALTER ROLE statement for the Supabase SQL editor that carries only its SCRAM-SHA-256 verifier.
// Postgres logs DDL, so a plain `PASSWORD '...'` would be written to the project's logs in clear; the
// verifier is what the server stores anyway, and the password cannot be read back from it. Plain Node 24,
// no dependencies.

import { createHash, createHmac, pbkdf2Sync, randomBytes } from "node:crypto";

const ROLE = "fieldmaps_api";
const ITERATIONS = 4096;

/** Postgres's SCRAM-SHA-256 verifier for a password: `SCRAM-SHA-256$<iterations>:<salt>$<stored>:<server>`. */
export function scramVerifier(password, salt = randomBytes(16), iterations = ITERATIONS) {
  const salted = pbkdf2Sync(password.normalize("NFKC"), salt, iterations, 32, "sha256");
  const clientKey = createHmac("sha256", salted).update("Client Key").digest();
  const storedKey = createHash("sha256").update(clientKey).digest();
  const serverKey = createHmac("sha256", salted).update("Server Key").digest();
  const b64 = (bytes) => bytes.toString("base64");
  return `SCRAM-SHA-256$${iterations}:${b64(salt)}$${b64(storedKey)}:${b64(serverKey)}`;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  // Hex only: nothing to escape in SQL, a Secret File or a shell.
  const password = randomBytes(24).toString("hex");
  console.log(`1. Supabase dashboard → SQL Editor, run:

   ALTER ROLE ${ROLE} WITH PASSWORD '${scramVerifier(password)}';

2. Render → the API service → Environment → Secret Files → database-password, replace its contents
   with this line and nothing else, save, and redeploy:

   ${password}

Nothing is stored; run this again for another password. Anything else that signs in as ${ROLE}
(a local API against the hosted database) needs the new password too.`);
}
