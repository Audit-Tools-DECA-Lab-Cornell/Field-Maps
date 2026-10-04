import { Directory, File, Paths } from "expo-file-system";
import { type MeSnapshot, readMeCache } from "./me-cache";

export function meFileStore(issuer: string, userId: string) {
  const directory = new Directory(Paths.document, "accounts", encodeURIComponent(issuer), userId);
  const file = new File(directory, "me.json");
  return {
    read: () => readMeCache(file.exists ? file.textSync() : null, userId),
    write: (snapshot: MeSnapshot) => {
      directory.create({ intermediates: true, idempotent: true });
      file.write(JSON.stringify(snapshot));
    },
  };
}
