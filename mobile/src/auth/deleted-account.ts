import { File, Paths } from "expo-file-system";
import { type CachedAccount, cachedAccount } from "./cached-account";

export function deletedAccountStore(issuer: string) {
  const file = new File(Paths.document, `deleted-account-${encodeURIComponent(issuer)}.json`);
  return {
    read: () => cachedAccount(file.exists ? file.textSync() : null),
    write: (account: CachedAccount) => file.write(JSON.stringify({ user: account })),
    clear: () => {
      if (file.exists) file.delete();
    },
  };
}
