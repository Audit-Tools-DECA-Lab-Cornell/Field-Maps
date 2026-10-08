import { type FormDefinition, parseFormDefinition } from "../../forms/definition";
import { isInventoryForm, PackageArchiveError, publishedVersions, readArchive } from "./archive";
import type { FormSummary, FormVersion, HostedSite, StoredPackage } from "./schemas";

/**
 * Making a site ready offline: the package archive, checked against the digest the server recorded
 * when it prepared it, then the forms the site is collected with. Every part is checked before
 * anything is kept, so a site is either fully on the device or not at all.
 *
 * The four parts match the site screen's checklist (`PACKAGE_ASSETS`): the map, the zones, the form
 * and the offline field guide, which ships with the app.
 */

export type PreparePart = 0 | 1 | 2 | 3;

export type PackageSource = {
  readonly archive: (packageId: string) => Promise<Uint8Array>;
  readonly sha256: (bytes: Uint8Array) => Promise<string>;
  readonly forms: () => Promise<readonly FormSummary[]>;
  readonly formVersion: (code: string) => Promise<FormVersion>;
};

export class PrepareError extends Error {}

function publishedForm(version: FormVersion): FormDefinition {
  try {
    const form = parseFormDefinition(version.definition);
    if (form.status !== "published") throw new PrepareError(`${version.code} is not published.`);
    return form;
  } catch (error) {
    if (error instanceof PrepareError) throw error;
    throw new PrepareError(`${version.code} cannot be read on this device.`);
  }
}

/** The project's inventory form: the first published form, other than the site's own, that asks only about the zone. */
async function inventoryForm(
  source: PackageSource,
  summaries: readonly FormSummary[],
  play: string,
): Promise<FormVersion | null> {
  for (const code of publishedVersions(summaries, play)) {
    const version = await source.formVersion(code);
    try {
      if (isInventoryForm(parseFormDefinition(version.definition))) return version;
    } catch {
      // A form this device cannot read is not offered for the Inventory round.
    }
  }
  return null;
}

export async function preparePackage(
  projectId: string,
  site: HostedSite,
  source: PackageSource,
  onPart: (part: PreparePart) => void = () => {},
  now: () => Date = () => new Date(),
): Promise<StoredPackage> {
  const current = site.package;
  if (!current) throw new PrepareError(`${site.name} has no map package yet.`);
  if (!current.form_version) throw new PrepareError(`${site.name}'s package names no form.`);

  onPart(0);
  const bytes = await source.archive(current.package_id);
  if ((await source.sha256(bytes)) !== current.archive_sha256)
    throw new PrepareError(
      "The download did not match the package the server prepared. Try again.",
    );
  let contents: ReturnType<typeof readArchive>;
  try {
    contents = readArchive(bytes);
  } catch (error) {
    throw new PrepareError(
      error instanceof PackageArchiveError ? error.message : "The package could not be read.",
    );
  }

  onPart(1);
  if (contents.manifest.site_code !== site.code)
    throw new PrepareError("The package belongs to another site.");

  onPart(2);
  const play = await source.formVersion(current.form_version);
  publishedForm(play);
  const inventory = await inventoryForm(source, await source.forms(), play.code);
  if (inventory) publishedForm(inventory);

  onPart(3);
  return {
    format: 1,
    projectId,
    siteId: site.site_id,
    siteCode: site.code,
    siteName: site.name,
    packageId: current.package_id,
    packageVersion: current.version,
    archiveBytes: bytes.byteLength,
    archiveSha256: current.archive_sha256,
    savedAt: now().toISOString(),
    manifest: contents.manifest,
    layers: contents.layers,
    forms: { play: play.definition, inventory: inventory?.definition ?? null },
  };
}

/** The forms a stored package is collected with, parsed again: what reaches the field is always checked. */
export function storedForms(stored: StoredPackage): {
  readonly play: FormDefinition;
  readonly inventory: FormDefinition | null;
} {
  const play = parseFormDefinition(stored.forms.play);
  let inventory: FormDefinition | null = null;
  try {
    inventory = stored.forms.inventory ? parseFormDefinition(stored.forms.inventory) : null;
  } catch {
    inventory = null;
  }
  return { play, inventory };
}
