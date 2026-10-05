import Storage from "expo-sqlite/kv-store";
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useMe } from "../../data/api/me-provider";
import type { Observation } from "../../domain/observation";
import { bundledPackage } from "../../packages/bundled";
import type { SitePackage } from "../../packages/site-package";
import { shortLabel } from "../../session/provider";
import { useObservations } from "../../storage/use-observations";
import { useSync } from "../../sync/provider";
import { deviceProjects } from "./device-projects";
import {
  PACKAGE_ASSETS,
  PREVIEW_PROJECTS,
  PREVIEW_QUEUE,
  PREVIEW_SITES,
  type PreviewProject,
  type PreviewSite,
  type QueueRecord,
  type QueueState,
} from "./fixtures";

/**
 * Where the collector's screens read from. `device` uses the account and this phone: projects and the
 * profile from `/v1/me` (D24), join codes through the FieldMaps API, and the SQLite queue, sync and
 * bundled packages; it says plainly when something needs the server. `preview` shows the designed
 * fixtures, including the states the device cannot produce yet ("Uploading", a download in progress),
 * and sends nothing. Preview is a review tool: release builds always read the device.
 */
export type DataMode = "device" | "preview";

const MODE_KEY = "fm.dev.dataSource";
/** Development builds, and builds made for review with EXPO_PUBLIC_PREVIEW_TOOLS=1, may show preview data. */
export const PREVIEW_ALLOWED = __DEV__ || process.env.EXPO_PUBLIC_PREVIEW_TOOLS === "1";

function readMode(): DataMode {
  if (!PREVIEW_ALLOWED) return "device";
  try {
    const stored = Storage.getItemSync(MODE_KEY);
    return stored === "device" ? "device" : "preview";
  } catch {
    return "preview";
  }
}

export type DownloadState = "notDownloaded" | "downloading" | "ready";
export type AssetState = "verified" | "downloading" | "waiting";

export type SiteDownload = {
  state: DownloadState;
  receivedMb: number;
  totalMb: number;
  assets: { label: string; state: AssetState }[];
};

type DataSourceValue = {
  mode: DataMode;
  setMode: (mode: DataMode) => void;
  previewAllowed: boolean;
  downloads: Record<string, SiteDownload>;
  /**
   * Whether this mode can fetch a package. Package delivery is not built yet, so only preview simulates
   * one; on the device a site is ready only when its package ships with the app, and screens say that a
   * download needs the server instead of pretending to run one.
   */
  canDownload: boolean;
  startDownload: (siteId: string) => void;
  cancelDownload: (siteId: string) => void;
  removeDownload: (siteId: string) => void;
};

const DataSourceContext = createContext<DataSourceValue | null>(null);

function previewDownloads(): Record<string, SiteDownload> {
  return Object.fromEntries(
    PREVIEW_SITES.map((site) => [
      site.id,
      site.initialDownload === "ready" ? readyDownload(site) : notDownloaded(site),
    ]),
  );
}

function readyDownload(site: PreviewSite): SiteDownload {
  return {
    state: "ready",
    receivedMb: site.sizeMb,
    totalMb: site.sizeMb,
    assets: PACKAGE_ASSETS.map((label) => ({ label, state: "verified" })),
  };
}

function notDownloaded(site: PreviewSite): SiteDownload {
  return { state: "notDownloaded", receivedMb: 0, totalMb: site.sizeMb, assets: waitingAssets() };
}

/** The package that really exists on this phone for a site, if any. */
function devicePackage(site: PreviewSite): SitePackage | undefined {
  const found = bundledPackage(site.packageId);
  return found?.availability === "on-device" ? found : undefined;
}

/** A site as the device knows it: the real package version, and ready only if that package is here. */
function deviceSite(site: PreviewSite): PreviewSite & { download: SiteDownload } {
  const found = devicePackage(site);
  const onDevice: PreviewSite = found
    ? {
        ...site,
        packageVersion: found.version,
        sizeMb: 0,
        verifiedLabel: "ships with the app",
        bundled: true,
      }
    : { ...site, verifiedLabel: "" };
  return { ...onDevice, download: found ? readyDownload(onDevice) : notDownloaded(onDevice) };
}

function waitingAssets(): SiteDownload["assets"] {
  return PACKAGE_ASSETS.map((label) => ({ label, state: "waiting" }));
}

/** Asset states for a download that is part-way: earlier parts verify first. */
function assetsAt(fraction: number): SiteDownload["assets"] {
  return PACKAGE_ASSETS.map((label, index) => {
    const start = index / PACKAGE_ASSETS.length;
    const end = (index + 1) / PACKAGE_ASSETS.length;
    const state: AssetState =
      fraction >= end ? "verified" : fraction >= start ? "downloading" : "waiting";
    return { label, state };
  });
}

/** Preview only: how long a simulated download takes, and how often it reports progress. */
const SIMULATED_DOWNLOAD_MS = 6000;
const PROGRESS_STEP_MS = 250;

export function DataSourceProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<DataMode>(readMode);
  const [simulated, setDownloads] = useState<Record<string, SiteDownload>>(previewDownloads);
  const timers = useRef(new Map<string, ReturnType<typeof setInterval>>());

  useEffect(() => {
    const running = timers.current;
    return () => {
      for (const timer of running.values()) clearInterval(timer);
    };
  }, []);

  const setMode = useCallback((next: DataMode) => {
    if (!PREVIEW_ALLOWED) return;
    try {
      Storage.setItemSync(MODE_KEY, next);
    } catch {
      // The choice still applies until the app closes.
    }
    setModeState(next);
  }, []);

  const stopTimer = useCallback((siteId: string) => {
    const timer = timers.current.get(siteId);
    if (timer) clearInterval(timer);
    timers.current.delete(siteId);
  }, []);

  const canDownload = mode === "preview";
  const downloads = useMemo<Record<string, SiteDownload>>(
    () =>
      canDownload
        ? simulated
        : Object.fromEntries(PREVIEW_SITES.map((site) => [site.id, deviceSite(site).download])),
    [canDownload, simulated],
  );

  const startDownload = useCallback(
    (siteId: string) => {
      const site = PREVIEW_SITES.find((entry) => entry.id === siteId);
      if (!site || !canDownload) return;
      stopTimer(siteId);
      const started = Date.now();
      const tick = () => {
        const fraction = Math.min(1, (Date.now() - started) / SIMULATED_DOWNLOAD_MS);
        setDownloads((current) => ({
          ...current,
          [siteId]:
            fraction >= 1
              ? readyDownload(site)
              : {
                  state: "downloading",
                  receivedMb: Math.round(site.sizeMb * fraction),
                  totalMb: site.sizeMb,
                  assets: assetsAt(fraction),
                },
        }));
        if (fraction >= 1) stopTimer(siteId);
      };
      tick();
      timers.current.set(siteId, setInterval(tick, PROGRESS_STEP_MS));
    },
    [canDownload, stopTimer],
  );

  const cancelDownload = useCallback(
    (siteId: string) => {
      stopTimer(siteId);
      if (!canDownload) return;
      setDownloads((current) => {
        const site = current[siteId];
        if (!site) return current;
        return {
          ...current,
          [siteId]: {
            state: "notDownloaded",
            receivedMb: 0,
            totalMb: site.totalMb,
            assets: waitingAssets(),
          },
        };
      });
    },
    [canDownload, stopTimer],
  );

  const value = useMemo<DataSourceValue>(
    () => ({
      mode,
      setMode,
      previewAllowed: PREVIEW_ALLOWED,
      downloads,
      canDownload,
      startDownload,
      cancelDownload,
      removeDownload: cancelDownload,
    }),
    [mode, setMode, downloads, canDownload, startDownload, cancelDownload],
  );

  return <DataSourceContext.Provider value={value}>{children}</DataSourceContext.Provider>;
}

export function useDataSource(): DataSourceValue {
  const value = useContext(DataSourceContext);
  if (!value) throw new Error("useDataSource needs a DataSourceProvider above it");
  return value;
}

/**
 * The projects the observer has joined. Device data reads them from `/v1/me` (memberships, cached for
 * offline starts); preview shows the designed Play Study and Training.
 */
export function useProjects(): PreviewProject[] {
  const { mode } = useDataSource();
  const { projects, organizations } = useMe();
  return useMemo(
    () => (mode === "preview" ? PREVIEW_PROJECTS : deviceProjects(projects, organizations)),
    [mode, projects, organizations],
  );
}

export function useProject(projectId: string): PreviewProject | undefined {
  return useProjects().find((project) => project.id === projectId);
}

/**
 * The project collection is for now: on device data the active project `/v1/me` keeps (the first
 * joined project that is not Training, otherwise Training); in preview, Play Study.
 */
export function useActiveProject(): PreviewProject | undefined {
  const { mode } = useDataSource();
  const { activeProjectId } = useMe();
  const projects = useProjects();
  const id =
    mode === "preview" ? projects.find((project) => !project.training)?.id : activeProjectId;
  return projects.find((project) => project.id === id) ?? projects[0];
}

type SiteWithDownload = PreviewSite & { download: SiteDownload };

function withDownload(
  site: PreviewSite,
  mode: DataMode,
  downloads: Record<string, SiteDownload>,
): SiteWithDownload {
  if (mode === "device") return deviceSite(site);
  return { ...site, download: downloads[site.id] ?? notDownloaded(site) };
}

/** A project's sites, which still ship with the app on device data (MOB-14 brings hosted ones). */
export function useSites(projectId: string): SiteWithDownload[] {
  const { mode, downloads } = useDataSource();
  const siteIds = useProject(projectId)?.siteIds ?? [];
  return PREVIEW_SITES.filter((site) => siteIds.includes(site.id)).map((site) =>
    withDownload(site, mode, downloads),
  );
}

export function useSite(siteId: string): SiteWithDownload | undefined {
  const { mode, downloads } = useDataSource();
  const site = PREVIEW_SITES.find((entry) => entry.id === siteId);
  return site ? withDownload(site, mode, downloads) : undefined;
}

const STATUS_TO_STATE: Record<Observation["storageStatus"], QueueState> = {
  "local-only": "held",
  pending: "onDevice",
  synced: "uploaded",
  "needs-attention": "attention",
};

function fromDevice(record: Observation): QueueRecord {
  const created = new Date(record.createdAt);
  const time = `${String(created.getHours()).padStart(2, "0")}:${String(created.getMinutes()).padStart(2, "0")}`;
  const zone =
    record.formVersion === "janet-test-v1" ? record.context.zoneLabel : "Practice garden";
  const round = record.formVersion === "janet-test-v1" ? record.context.round : 1;
  return {
    id: record.id,
    label: shortLabel(record.id),
    zone,
    round,
    time,
    state: STATUS_TO_STATE[record.storageStatus],
    summary: record.formVersion === "janet-test-v1" ? "Behaviour mapping" : "Practice record",
    problem: record.syncError || undefined,
    storage: record.storageStatus === "synced" ? "Uploaded" : "On this device",
    observer: record.observer,
    form: record.formVersion,
  };
}

export type QueueCounts = Record<QueueState, number>;

export type Queue = {
  records: QueueRecord[];
  counts: QueueCounts;
  /** Records that have not been acknowledged by the server. */
  unsent: number;
  loading: boolean;
  error: string | null;
  retry: () => void;
  uploadNow: () => void;
};

function countStates(records: QueueRecord[]): QueueCounts {
  const counts: QueueCounts = { onDevice: 0, uploading: 0, uploaded: 0, attention: 0, held: 0 };
  for (const record of records) counts[record.state] += 1;
  return counts;
}

/** The upload queue in the five Contour states, newest first. */
export function useQueue(): Queue {
  const { mode } = useDataSource();
  const device = useObservations();
  const sync = useSync();
  const records = useMemo(
    () => (mode === "preview" ? PREVIEW_QUEUE : device.records.map(fromDevice)),
    [mode, device.records],
  );
  const counts = countStates(records);
  return {
    records,
    counts,
    unsent: records.length - counts.uploaded,
    loading: mode === "preview" ? false : device.loading,
    error: mode === "preview" ? null : device.error,
    retry: device.retry,
    uploadNow: sync.wake,
  };
}

export function useQueueRecord(id: string): QueueRecord | undefined {
  const { records } = useQueue();
  return records.find((record) => record.id === id);
}
