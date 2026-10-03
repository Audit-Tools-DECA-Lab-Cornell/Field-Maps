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
import type { Observation } from "../../domain/observation";
import { shortLabel } from "../../session/provider";
import { useObservations } from "../../storage/use-observations";
import { useSync } from "../../sync/provider";
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
 * Where the collector's screens read from. `device` uses what really exists on this phone (the SQLite
 * queue, sync, the bundled packages) and says plainly when something needs the server. `preview` shows
 * the designed fixtures, including the states the device cannot produce yet ("Uploading", a download in
 * progress). Preview is a development tool: release builds always read the device.
 */
export type DataMode = "device" | "preview";

const MODE_KEY = "fm.dev.dataSource";
const PREVIEW_ALLOWED = __DEV__;

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
  startDownload: (siteId: string) => void;
  cancelDownload: (siteId: string) => void;
  removeDownload: (siteId: string) => void;
};

const DataSourceContext = createContext<DataSourceValue | null>(null);

function initialDownloads(): Record<string, SiteDownload> {
  return Object.fromEntries(
    PREVIEW_SITES.map((site) => [
      site.id,
      site.initialDownload === "ready"
        ? readyDownload(site)
        : { state: "notDownloaded", receivedMb: 0, totalMb: site.sizeMb, assets: waitingAssets() },
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
  const [downloads, setDownloads] = useState<Record<string, SiteDownload>>(initialDownloads);
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

  const startDownload = useCallback(
    (siteId: string) => {
      const site = PREVIEW_SITES.find((entry) => entry.id === siteId);
      if (!site) return;
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
    [stopTimer],
  );

  const cancelDownload = useCallback(
    (siteId: string) => {
      stopTimer(siteId);
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
    [stopTimer],
  );

  const value = useMemo<DataSourceValue>(
    () => ({
      mode,
      setMode,
      previewAllowed: PREVIEW_ALLOWED,
      downloads,
      startDownload,
      cancelDownload,
      removeDownload: cancelDownload,
    }),
    [mode, setMode, downloads, startDownload, cancelDownload],
  );

  return <DataSourceContext.Provider value={value}>{children}</DataSourceContext.Provider>;
}

export function useDataSource(): DataSourceValue {
  const value = useContext(DataSourceContext);
  if (!value) throw new Error("useDataSource needs a DataSourceProvider above it");
  return value;
}

export function useProjects(): PreviewProject[] {
  return PREVIEW_PROJECTS;
}

export function useProject(projectId: string): PreviewProject | undefined {
  return PREVIEW_PROJECTS.find((project) => project.id === projectId);
}

export function useSites(projectId: string): (PreviewSite & { download: SiteDownload })[] {
  const { downloads } = useDataSource();
  return PREVIEW_SITES.filter((site) => site.projectId === projectId).map((site) => ({
    ...site,
    download: downloads[site.id] ?? readyDownload(site),
  }));
}

export function useSite(siteId: string): (PreviewSite & { download: SiteDownload }) | undefined {
  const { downloads } = useDataSource();
  const site = PREVIEW_SITES.find((entry) => entry.id === siteId);
  return site ? { ...site, download: downloads[site.id] ?? readyDownload(site) } : undefined;
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
