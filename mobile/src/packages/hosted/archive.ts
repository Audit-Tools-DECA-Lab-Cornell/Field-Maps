import { strFromU8, unzipSync } from "fflate";
import type { FormDefinition } from "../../forms/definition";
import {
  type FormSummary,
  layersSchema,
  type Manifest,
  manifestSchema,
  type PackageLayers,
} from "./schemas";

/**
 * Reading a site package the API prepared: a zip holding `manifest.json` and `layers/<name>.json`
 * (`_build_archive` in `backend/src/fieldmaps_api/domain/packages.py`). Pure, so it runs the same in
 * the tests as on the phone.
 */

export class PackageArchiveError extends Error {}

const LAYER_NAMES = ["ground", "paths", "trees", "zones"] as const;

function json(entries: Record<string, Uint8Array>, name: string): unknown {
  const entry = entries[name];
  if (!entry) return undefined;
  try {
    return JSON.parse(strFromU8(entry));
  } catch {
    throw new PackageArchiveError(`${name} in the package is not valid JSON.`);
  }
}

export function readArchive(bytes: Uint8Array): {
  readonly manifest: Manifest;
  readonly layers: PackageLayers;
} {
  let entries: Record<string, Uint8Array>;
  try {
    entries = unzipSync(bytes);
  } catch {
    throw new PackageArchiveError("The package is not a readable archive.");
  }
  const manifest = manifestSchema.safeParse(json(entries, "manifest.json"));
  if (!manifest.success) throw new PackageArchiveError("The package has no readable manifest.");
  const layers = layersSchema.safeParse(
    Object.fromEntries(
      LAYER_NAMES.flatMap((name) => {
        const value = json(entries, `layers/${name}.json`);
        return value === undefined ? [] : [[name, value]];
      }),
    ),
  );
  if (!layers.success)
    throw new PackageArchiveError("The package is missing its ground or zones layer.");
  return { manifest: manifest.data, layers: layers.data };
}

/** Lower-case hex, the form `archive_sha256` takes. */
export function hex(digest: ArrayBuffer): string {
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

/** The acts that describe a zone rather than a play event. */
const ZONE_ACTS = new Set(["Climate", "Inventory"]);
/** Acts any form may ask beside them: who observed, and a note. */
const SHARED_ACTS = new Set(["Record"]);

/**
 * Whether a form records a zone's inventory: it asks about the zone's climate or the loose parts
 * available, and nothing about a play event (D26). Recognised by its content rather than its name, so
 * a project can call it what it likes.
 */
export function isInventoryForm(form: FormDefinition): boolean {
  return (
    form.questions.some((question) => ZONE_ACTS.has(question.act)) &&
    form.questions.every((question) => ZONE_ACTS.has(question.act) || SHARED_ACTS.has(question.act))
  );
}

/** The newest published version of each of a project's forms, leaving out the one named. */
export function publishedVersions(forms: readonly FormSummary[], except: string): string[] {
  return forms.flatMap((form) => {
    const newest = form.versions
      .filter((version) => version.state === "published")
      .sort((a, b) => b.version - a.version)[0];
    return newest && newest.code !== except ? [newest.code] : [];
  });
}
