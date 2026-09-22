import type { LngLatBounds, StyleSpecification } from "@maplibre/maplibre-react-native";
import type { FeatureCollection } from "geojson";
import type { Coordinate } from "../domain/observation";
import type { SiteZone } from "../maps/sample-site";

/**
 * The shape a site package will take when packages are really delivered: geometry, zones,
 * rounds and the form version the site collects. Delivery itself is stubbed behind
 * {@link PackageProvider} — there is no hosted package format yet, so nothing here pretends to
 * download one or to enforce a cellular policy.
 */

export type PackageAvailability = "on-device" | "not-downloaded" | "archived";

export type LayerPaint =
  | { readonly type: "line"; readonly color: string; readonly width: number }
  | {
      readonly type: "fill";
      readonly color: string;
      readonly outline: string;
      readonly dashed: boolean;
    }
  | { readonly type: "circle"; readonly color: string; readonly radius: number };

/** An overlay the observer can switch off, drawn above the base and below the observations. */
export type PackageLayer = {
  readonly id: string;
  readonly name: string;
  readonly data: FeatureCollection;
  readonly plan: LayerPaint;
  readonly aerial: LayerPaint;
};

export type PackageSummary = {
  readonly id: string;
  readonly name: string;
  readonly meta: string;
  readonly availability: PackageAvailability;
  readonly formVersion: string;
};

export type SitePackage = PackageSummary & {
  readonly version: string;
  readonly siteId: string;
  readonly sizeOnDevice: string;
  readonly zones: readonly SiteZone[];
  readonly rounds: readonly number[];
  /** What a round inherits when the observer has not declared a fresh period. */
  readonly inheritedContext: string;
  readonly centre: Coordinate;
  readonly bounds: LngLatBounds;
  readonly bases: { readonly plan: StyleSpecification; readonly aerial: StyleSpecification };
  readonly layers: readonly PackageLayer[];
};

/**
 * Where packages come from. Only the bundled fixture provider exists today; a hosted provider
 * implements the same two calls without the field flow changing.
 */
export interface PackageProvider {
  list(): Promise<readonly PackageSummary[]>;
  open(id: string): Promise<SitePackage | undefined>;
}
