import { CryptoDigestAlgorithm, digest } from "expo-crypto";
import { Directory, File, Paths } from "expo-file-system";
import type { z } from "zod";
import type { ApiClient } from "../../data/api/client";
import { hex } from "./archive";
import type { PackageSource } from "./prepare";
import { type HostedSite, type StoredPackage, sitesSchema, storedPackageSchema } from "./schemas";

/**
 * Hosted sites on this device: the JSON files that keep a project's site list and each downloaded
 * package, beside the other on-device JSON (`accounts/…/me.json`, `preferences/orientation.json`).
 *
 * A site list belongs to the account that read it, so another account on the same phone never sees
 * it. A package is named by its id and never changes once prepared (the API keeps them immutable), so
 * one copy serves every account that may open it; whether an account may is the site list's question.
 */

const ROOT = "hosted";

function directory(...names: string[]): Directory {
  const dir = new Directory(Paths.document, ROOT, ...names);
  dir.create({ intermediates: true, idempotent: true });
  return dir;
}

function packageFile(packageId: string): File {
  return new File(directory("packages"), `${packageId}.json`);
}

function sitesFile(userId: string, projectId: string): File {
  return new File(directory("accounts", userId), `sites-${projectId}.json`);
}

function readJson<T>(file: File, schema: z.ZodType<T>): T | null {
  try {
    if (!file.exists) return null;
    const parsed = schema.safeParse(JSON.parse(file.textSync()));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

export function readStoredPackage(packageId: string): StoredPackage | null {
  return readJson(packageFile(packageId), storedPackageSchema);
}

/** Whether a package is on this device, without reading it. */
export function hasStoredPackage(packageId: string): boolean {
  try {
    return packageFile(packageId).exists;
  } catch {
    return false;
  }
}

export function writeStoredPackage(stored: StoredPackage): void {
  packageFile(stored.packageId).write(JSON.stringify(stored));
}

export function removeStoredPackage(packageId: string): void {
  const file = packageFile(packageId);
  if (file.exists) file.delete();
}

export function readSiteList(userId: string, projectId: string): HostedSite[] | null {
  return readJson(sitesFile(userId, projectId), sitesSchema);
}

export function writeSiteList(userId: string, projectId: string, sites: readonly HostedSite[]) {
  sitesFile(userId, projectId).write(JSON.stringify(sites));
}

/** The API, as the preparation pipeline reads it: the archive arrives as a file, then is read once. */
export function apiPackageSource(
  api: ApiClient,
  projectId: string,
  signal: AbortSignal,
): PackageSource {
  return {
    archive: async (packageId) => {
      const request = await api.archiveRequest(projectId, packageId);
      const target = new File(Paths.cache, `package-${packageId}.zip`);
      if (target.exists) target.delete();
      try {
        const file = await File.downloadFileAsync(request.url, target, {
          headers: request.headers,
          idempotent: true,
        });
        return await file.bytes();
      } finally {
        if (target.exists) target.delete();
      }
    },
    // A copy typed as the digest wants it: an ArrayBuffer-backed view.
    sha256: async (bytes) => hex(await digest(CryptoDigestAlgorithm.SHA256, new Uint8Array(bytes))),
    forms: () => api.forms(projectId, signal),
    formVersion: (code) => api.formVersion(projectId, code, signal),
  };
}
