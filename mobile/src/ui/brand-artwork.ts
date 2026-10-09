/**
 * The FieldMaps brand mark is the purple app icon: three zones of a site plan cut by a path, with the
 * collector's own observation marker (dark halo, light ring, lavender dot) on the path. It is the icon
 * that installs on the phone, the one the store lists and the one the web shows (D29).
 *
 * `assets/icon-source/generate.py` writes that artwork to `assets/icon-source/icon.svg`. `Logo` draws
 * the same artwork in the app from the numbers below, in the icon's own 1024 × 1024 space, and
 * `brand-artwork.test.ts` fails if a colour or a shape here differs from `icon.svg`. Change the icon in
 * `generate.py` first, then here.
 *
 * These colours are artwork, not interface colours: they have no Contour token and stay the same in
 * Day and Dusk. Besides `tokens.ts`, this is the only module in the collector that holds a colour value.
 */

export type BrandZone = {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  readonly fill: string;
};

export type BrandRing = { readonly r: number; readonly fill: string };

export type BrandArtwork = {
  readonly size: number;
  readonly corner: number;
  readonly background: {
    readonly cx: number;
    readonly cy: number;
    readonly r: number;
    readonly inner: string;
    readonly outer: string;
  };
  readonly scale: number;
  readonly zoneCorner: number;
  readonly zones: readonly BrandZone[];
  readonly path: { readonly d: string; readonly stroke: string; readonly width: number };
  readonly marker: {
    readonly cx: number;
    readonly cy: number;
    readonly rings: readonly BrandRing[];
  };
};

export const BRAND_ARTWORK = {
  /** The side of the square, in the icon's own units. */
  size: 1024,
  /**
   * The square's rounded corner, about 22 % of the side: the shape a launcher gives the icon, and the
   * corner the web icon (`web/public/icons/icon.svg`) is clipped to.
   */
  corner: 230,
  /** The ground: a radial gradient lit just above the centre. */
  background: { cx: 512, cy: 430, r: 760, inner: "#20223a", outer: "#161826" },
  /** The plan is drawn 1.2 times its size about the centre, so it fills the square. */
  scale: 1.2,
  /** Every zone has the same rounded corner. */
  zoneCorner: 52,
  zones: [
    { x: 268, y: 330, width: 224, height: 420, fill: "#5d5294" },
    { x: 548, y: 274, width: 208, height: 236, fill: "#796cbf" },
    { x: 548, y: 566, width: 172, height: 150, fill: "#423a6a" },
  ],
  /** The path, drawn only where it crosses a zone. */
  path: {
    d: "M250 700 C 380 690, 430 560, 520 538 S 700 420, 790 300",
    stroke: "#161826",
    width: 44,
  },
  /** The observation marker on the path, outermost ring first. */
  marker: {
    cx: 520,
    cy: 538,
    rings: [
      { r: 128, fill: "#161826" },
      { r: 98, fill: "#e9e9ed" },
      { r: 58, fill: "#9184d9" },
    ],
  },
} as const satisfies BrandArtwork;
