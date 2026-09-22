import {
  aerialStyle,
  planStyle,
  sampleBounds,
  sampleCenter,
  sitePaths,
  siteTrees,
  siteZones,
  zoneGeometry,
} from "../maps/sample-site";
import type { PackageLayer, PackageProvider, PackageSummary, SitePackage } from "./site-package";

/**
 * The bundled fixture provider. Two packages are on the device because their geometry ships
 * with the app; the other two exist only as rows, so download states can be designed against
 * something honest. Nothing here contacts a network.
 */

const layers: readonly PackageLayer[] = [
  {
    id: "paths",
    name: "Paths",
    data: sitePaths,
    plan: { type: "line", color: "#2f3243", width: 7 },
    aerial: { type: "line", color: "#4a4437", width: 7 },
  },
  {
    id: "zones",
    name: "Zone polygons",
    data: zoneGeometry,
    plan: { type: "fill", color: "#9184d90f", outline: "#796cbf", dashed: true },
    aerial: { type: "fill", color: "#9184d914", outline: "#968ae0", dashed: true },
  },
  {
    id: "trees",
    name: "Trees",
    data: siteTrees,
    plan: { type: "circle", color: "#2b3527", radius: 11 },
    aerial: { type: "circle", color: "#313d2b", radius: 11 },
  },
];

const riverside: SitePackage = {
  id: "riverside-play-study",
  name: "Riverside Play Study",
  meta: "North Playground · 3 zones · package v4",
  availability: "on-device",
  formVersion: "janet-test-v1",
  version: "v4",
  siteId: "riverside-north-playground",
  sizeOnDevice: "18.4 MB on device",
  zones: siteZones,
  rounds: [1, 2, 3],
  inheritedContext:
    "Climate and zone inventory are not collected yet, so a round inherits only its zone and number.",
  centre: sampleCenter,
  bounds: sampleBounds,
  bases: { plan: planStyle, aerial: aerialStyle },
  layers,
};

const practice: SitePackage = {
  id: "sample-garden",
  name: "Sample garden practice",
  meta: "Bundled training map · practice form · uploads to the API",
  availability: "on-device",
  formVersion: "shell-v1",
  version: "v1",
  siteId: "sample-garden",
  sizeOnDevice: "Bundled with the app",
  zones: [
    siteZones[0] ?? {
      id: "A",
      label: "Whole garden",
      centre: sampleCenter,
      west: -76.4865,
      south: 42.447,
      east: -76.4835,
      north: 42.449,
    },
  ],
  rounds: [1],
  inheritedContext: "The practice form stores no round context; only its three fields are saved.",
  centre: sampleCenter,
  bounds: sampleBounds,
  bases: { plan: planStyle, aerial: aerialStyle },
  layers,
};

const undownloaded: readonly PackageSummary[] = [
  {
    id: "cedar-park-baseline",
    name: "Cedar Park Baseline",
    meta: "2 zones · 42 MB · wi-fi needed",
    availability: "not-downloaded",
    formVersion: "janet-test-v1",
  },
  {
    id: "harbour-green-pilot",
    name: "Harbour Green Pilot",
    meta: "Closed 4 Sept · read only",
    availability: "archived",
    formVersion: "janet-test-v1",
  },
];

const packages: readonly SitePackage[] = [riverside, practice];

export const bundledPackages: PackageProvider = {
  async list() {
    return [...packages.map(summary), ...undownloaded];
  },
  async open(id) {
    return packages.find((entry) => entry.id === id);
  },
};

function summary(entry: SitePackage): PackageSummary {
  return {
    id: entry.id,
    name: entry.name,
    meta: entry.meta,
    availability: entry.availability,
    formVersion: entry.formVersion,
  };
}

export function availabilityChip(availability: PackageSummary["availability"]) {
  switch (availability) {
    case "on-device":
      return { label: "On device", tone: "accent" } as const;
    case "not-downloaded":
      return { label: "Not downloaded", tone: "muted" } as const;
    case "archived":
      return { label: "Archived", tone: "muted" } as const;
  }
}
