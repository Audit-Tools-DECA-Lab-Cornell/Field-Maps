import { syncScopeSchema } from "../../sync/contracts";
export const legacyProjectId = "10000000-0000-4000-8000-000000000002";
// Persisted SQLite identity must stay byte-for-byte stable until MOB-11 migrates it.
export function legacyScope(userId: string) {
  return syncScopeSchema.safeParse({
    apiUrl: "http://127.0.0.1:8000",
    issuer: "https://lezmqhuucfwqknspgcdy.supabase.co/auth/v1",
    userId,
    projectId: legacyProjectId,
  });
}
