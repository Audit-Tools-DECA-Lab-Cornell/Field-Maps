import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { BRAND_ARTWORK as ART } from "./brand-artwork";

/** The app icon as `generate.py` writes it: what installs, and what the store lists. */
const icon = readFileSync(new URL("../../assets/icon-source/icon.svg", import.meta.url), "utf8");
/** The same artwork clipped to a rounded square, which the web shows as its mark and favicon. */
const webIcon = readFileSync(
  new URL("../../../web/public/icons/icon.svg", import.meta.url),
  "utf8",
);

type Attributes = ReadonlyMap<string, string>;

function attributesOf(source: string): Attributes {
  return new Map(
    [...source.matchAll(/([\w:-]+)="([^"]*)"/g)].map((match) => [match[1] ?? "", match[2] ?? ""]),
  );
}

/** Every `<name …>` element in document order, with its attributes. */
function elements(svg: string, name: string): Attributes[] {
  return [...svg.matchAll(new RegExp(`<${name}\\b([^>]*?)/?>`, "g"))].map((match) =>
    attributesOf(match[1] ?? ""),
  );
}

/** The visible drawing: clip paths only shape it, so their black fills are not colours of the mark. */
function drawing(svg: string): string {
  return svg.replace(/<clipPath\b[\s\S]*?<\/clipPath>/g, "");
}

function clipPath(svg: string, id: string): string {
  const match = svg.match(new RegExp(`<clipPath id="${id}">([\\s\\S]*?)</clipPath>`));
  if (!match?.[1]) throw new Error(`icon.svg has no clip path "${id}"`);
  return match[1];
}

/** Every colour the drawing paints with, lower case. */
function svgColours(svg: string): string[] {
  const colours = [...drawing(svg).matchAll(/(?:fill|stroke|stop-color)="(#[0-9a-fA-F]+)"/g)].map(
    (match) => (match[1] ?? "").toLowerCase(),
  );
  return [...new Set(colours)].sort();
}

/** Every colour held in `brand-artwork.ts`, lower case. */
function artworkColours(): string[] {
  const found = new Set<string>();
  const walk = (value: unknown): void => {
    if (typeof value === "string" && value.startsWith("#")) found.add(value.toLowerCase());
    else if (value && typeof value === "object") Object.values(value).forEach(walk);
  };
  walk(ART);
  return [...found].sort();
}

const numbers = (attributes: Attributes, ...keys: string[]) =>
  keys.map((key) => Number(attributes.get(key)));

describe("the brand artwork matches the app icon", () => {
  it("uses exactly the icon's colours", () => {
    expect(artworkColours()).toEqual(svgColours(icon));
  });

  it("draws in the icon's square", () => {
    const [svg] = elements(icon, "svg");
    expect(svg?.get("viewBox")).toBe(`0 0 ${ART.size} ${ART.size}`);
  });

  it("lights the ground with the icon's gradient", () => {
    const [gradient] = elements(icon, "radialGradient");
    expect(gradient?.get("gradientUnits")).toBe("userSpaceOnUse");
    expect(numbers(gradient ?? new Map(), "cx", "cy", "r")).toEqual([
      ART.background.cx,
      ART.background.cy,
      ART.background.r,
    ]);
    const stops = elements(icon, "stop").map((stop) => [
      Number(stop.get("offset")),
      stop.get("stop-color")?.toLowerCase(),
    ]);
    expect(stops).toEqual([
      [0, ART.background.inner],
      [1, ART.background.outer],
    ]);
  });

  it("scales the plan about the centre as the icon does", () => {
    const centre = ART.size / 2;
    const scaled = elements(icon, "g").map((group) => group.get("transform"));
    expect(scaled).toContain(
      `translate(${centre} ${centre}) scale(${ART.scale}) translate(-${centre} -${centre})`,
    );
  });

  it("draws the icon's three zones, in order", () => {
    const zones = elements(drawing(icon), "rect")
      .filter((rect) => rect.has("rx"))
      .map((rect) => ({
        x: Number(rect.get("x")),
        y: Number(rect.get("y")),
        width: Number(rect.get("width")),
        height: Number(rect.get("height")),
        rx: Number(rect.get("rx")),
        fill: rect.get("fill")?.toLowerCase(),
      }));
    expect(zones).toEqual(ART.zones.map((zone) => ({ ...zone, rx: ART.zoneCorner })));
  });

  it("clips the path to the same zones", () => {
    const clip = elements(clipPath(icon, "zones"), "rect").map((rect) =>
      numbers(rect, "x", "y", "width", "height", "rx"),
    );
    expect(clip).toEqual(
      ART.zones.map((zone) => [zone.x, zone.y, zone.width, zone.height, ART.zoneCorner]),
    );
  });

  it("draws the icon's path", () => {
    const [path] = elements(drawing(icon), "path");
    expect(path?.get("d")).toBe(ART.path.d);
    expect(path?.get("stroke")?.toLowerCase()).toBe(ART.path.stroke);
    expect(Number(path?.get("stroke-width"))).toBe(ART.path.width);
    expect(path?.get("stroke-linecap")).toBe("round");
    expect(path?.get("clip-path")).toBe("url(#zones)");
  });

  it("draws the icon's observation marker, outermost ring first", () => {
    const rings = elements(icon, "circle").map((circle) => ({
      cx: Number(circle.get("cx")),
      cy: Number(circle.get("cy")),
      r: Number(circle.get("r")),
      fill: circle.get("fill")?.toLowerCase(),
    }));
    expect(rings).toEqual(
      ART.marker.rings.map((ring) => ({ cx: ART.marker.cx, cy: ART.marker.cy, ...ring })),
    );
  });
});

describe("the web mark is the same artwork", () => {
  it("paints with the same colours", () => {
    expect(svgColours(webIcon)).toEqual(artworkColours());
  });

  it("rounds the square to the same corner", () => {
    const corners = elements(clipPath(webIcon, "round"), "rect").map((rect) =>
      Number(rect.get("rx")),
    );
    expect(corners).toEqual([ART.corner]);
  });
});
