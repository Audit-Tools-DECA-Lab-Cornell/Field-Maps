import type { RoundType } from "../domain/rounds";
import type { FormDefinition } from "../forms/definition";
import { formFor } from "../forms/registry";
import type { SitePackage } from "../packages/site-package";

type RoundForms = Pick<SitePackage, "formVersion" | "inventoryFormVersion">;

/** The form a round asks: the zone inventory in an Inventory round, the site's own form otherwise. */
export function formForRound(sitePackage: RoundForms, roundType: RoundType): FormDefinition | null {
  return (
    formFor(
      roundType === "inventory" ? sitePackage.inventoryFormVersion : sitePackage.formVersion,
    ) ?? null
  );
}

/**
 * Whether a site can offer a round: the round's form is on this device, and the record that form
 * writes keeps the round. The practice form (`shell-v1`) writes its three fixed columns and nothing
 * else, so a Reliability record made with it would be indistinguishable from a Standard one; a
 * practice site offers the Standard round only.
 */
export function offersRound(sitePackage: RoundForms, roundType: RoundType): boolean {
  const form = formForRound(sitePackage, roundType);
  if (!form) return false;
  return roundType === "standard" || form.version !== "shell-v1";
}
