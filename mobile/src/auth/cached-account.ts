import { Directory, File, Paths } from "expo-file-system";
import { z } from "zod";

const accountSchema = z.object({ id: z.uuid(), email: z.string().optional() });
const recordSchema = z.object({ userId: z.uuid(), email: z.string().nullable(), issuer: z.url() });
export type CachedAccount = Readonly<z.infer<typeof accountSchema>>;

export function sessionAccount(value: string | null): CachedAccount | null {
  if (!value) return null;
  try {
    const parsed = z.object({ user: accountSchema }).safeParse(JSON.parse(value));
    return parsed.success ? parsed.data.user : null;
  } catch (error) {
    if (error instanceof Error) return null;
    throw error;
  }
}

function accountFile() {
  return new File(Paths.document, "auth", "last-account.json");
}

export function cachedAccount(issuer: string): CachedAccount | null {
  try {
    const file = accountFile();
    if (!file.exists) return null;
    const record = recordSchema.parse(JSON.parse(file.textSync()));
    if (record.issuer !== issuer) return null;
    return { id: record.userId, ...(record.email === null ? {} : { email: record.email }) };
  } catch (error) {
    if (error instanceof Error) return null;
    throw error;
  }
}

export function rememberAccount(account: CachedAccount, issuer: string): void {
  new Directory(Paths.document, "auth").create({ intermediates: true, idempotent: true });
  accountFile().write(JSON.stringify({ userId: account.id, email: account.email ?? null, issuer }));
}

export function forgetAccount(): void {
  const file = accountFile();
  if (file.exists) file.delete();
}

export function rememberSessionAccount(account: CachedAccount, issuer: string): string | null {
  try {
    rememberAccount(account, issuer);
    return null;
  } catch (error) {
    if (!(error instanceof Error)) throw error;
    return "Could not retain your account on this device. Retry sign-in before working offline.";
  }
}

export function sessionIdentity<T extends { readonly user: CachedAccount }>(
  session: T,
  issuer: string,
) {
  return { session, account: session.user, error: rememberSessionAccount(session.user, issuer) };
}
