import {
  createContext,
  type PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { AppState } from "react-native";
import { useAccount } from "../../auth/provider";
import { type ApiClient, createApiClient } from "../../data/api/client";
import { ApiError } from "../../data/api/errors";
import { useMe } from "../../data/api/me-provider";
import { connection } from "../../platform/config";
import {
  apiPackageSource,
  hasStoredPackage,
  readSiteList,
  removeStoredPackage,
  writeSiteList,
  writeStoredPackage,
} from "./device";
import { PrepareError, type PreparePart, preparePackage } from "./prepare";
import type { HostedSite } from "./schemas";

/**
 * A project's hosted sites for the signed-in account (MOB-14, on the existing upload path rather than
 * PowerSync): each project's site list, kept on the device so it opens offline and refreshed whenever
 * the app is active and signed in, and the downloads that make a site ready offline.
 */

export type HostedDownload =
  | { readonly state: "downloading"; readonly part: PreparePart }
  | { readonly state: "failed"; readonly message: string };

type HostedValue = {
  /** Sites by project, as last read from the API or this device. Absent: never read for this project. */
  readonly sites: Readonly<Record<string, readonly HostedSite[]>>;
  /** Why the latest refresh failed, by project; cached sites stay usable. */
  readonly errors: Readonly<Record<string, string>>;
  readonly downloads: Readonly<Record<string, HostedDownload>>;
  /** Increments whenever a package is saved or removed, so readers re-check what is stored. */
  readonly revision: number;
  /** Signed in with a session, so the API can be asked. Says nothing about the network itself. */
  readonly signedIn: boolean;
  refresh: (projectId: string) => Promise<void>;
  download: (projectId: string, siteId: string) => Promise<void>;
  cancel: (siteId: string) => void;
  remove: (siteId: string) => void;
};

const HostedContext = createContext<HostedValue>({
  sites: {},
  errors: {},
  downloads: {},
  revision: 0,
  signedIn: false,
  refresh: async () => {},
  download: async () => {},
  cancel: () => {},
  remove: () => {},
});

function message(error: unknown): string {
  if (error instanceof PrepareError) return error.message;
  if (error instanceof ApiError) return error.message;
  return "The download stopped. Check the connection and try again.";
}

export function HostedSitesProvider({ children }: PropsWithChildren) {
  const { client, session, account } = useAccount();
  const { projects } = useMe();
  const userId = account?.id ?? null;
  const [sites, setSites] = useState<Record<string, readonly HostedSite[]>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [downloads, setDownloads] = useState<Record<string, HostedDownload>>({});
  const [revision, setRevision] = useState(0);
  const running = useRef(new Map<string, AbortController>());

  const api = useMemo<ApiClient | null>(
    () =>
      client && session && userId
        ? createApiClient(connection.apiUrl, async () => {
            const { data } = await client.auth.getSession();
            return data.session?.user.id === userId ? data.session.access_token : null;
          })
        : null,
    [client, session, userId],
  );

  // Another account on the same phone starts from its own cached lists.
  const studyProjects = useMemo(
    () => projects.filter((project) => !project.is_training).map((project) => project.project_id),
    [projects],
  );
  useEffect(() => {
    if (!userId) {
      setSites({});
      setErrors({});
      return;
    }
    setSites(
      Object.fromEntries(
        studyProjects.flatMap((projectId) => {
          const cached = readSiteList(userId, projectId);
          return cached ? [[projectId, cached]] : [];
        }),
      ),
    );
    setErrors({});
  }, [studyProjects, userId]);

  const refresh = useCallback(
    async (projectId: string) => {
      if (!api || !userId) return;
      const controller = new AbortController();
      try {
        const list = await api.sites(projectId, controller.signal);
        writeSiteList(userId, projectId, list);
        setSites((current) => ({ ...current, [projectId]: list }));
        setErrors(({ [projectId]: _cleared, ...rest }) => rest);
      } catch (error) {
        setErrors((current) => ({ ...current, [projectId]: message(error) }));
      }
    },
    [api, userId],
  );

  // Every study project's list is refreshed on sign-in and whenever the app comes back to the front.
  useEffect(() => {
    if (!api) return;
    const all = () => {
      for (const projectId of studyProjects) void refresh(projectId);
    };
    all();
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") all();
    });
    return () => subscription.remove();
  }, [api, refresh, studyProjects]);

  const download = useCallback(
    async (projectId: string, siteId: string) => {
      const site = sites[projectId]?.find((entry) => entry.site_id === siteId);
      if (!api || !site || running.current.has(siteId)) return;
      const controller = new AbortController();
      running.current.set(siteId, controller);
      const report = (part: PreparePart) => {
        if (!controller.signal.aborted)
          setDownloads((current) => ({ ...current, [siteId]: { state: "downloading", part } }));
      };
      try {
        const stored = await preparePackage(
          projectId,
          site,
          apiPackageSource(api, projectId, controller.signal),
          report,
        );
        if (controller.signal.aborted) return;
        writeStoredPackage(stored);
        setDownloads(({ [siteId]: _done, ...rest }) => rest);
        setRevision((value) => value + 1);
      } catch (error) {
        if (controller.signal.aborted) return;
        setDownloads((current) => ({
          ...current,
          [siteId]: { state: "failed", message: message(error) },
        }));
      } finally {
        // A cancelled attempt settles after its retry may have started; only its own entry is cleared.
        if (running.current.get(siteId) === controller) running.current.delete(siteId);
      }
    },
    [api, sites],
  );

  const cancel = useCallback((siteId: string) => {
    running.current.get(siteId)?.abort();
    running.current.delete(siteId);
    setDownloads(({ [siteId]: _cancelled, ...rest }) => rest);
  }, []);

  const remove = useCallback(
    (siteId: string) => {
      const site = Object.values(sites)
        .flat()
        .find((entry) => entry.site_id === siteId);
      if (site?.package) removeStoredPackage(site.package.package_id);
      setDownloads(({ [siteId]: _removed, ...rest }) => rest);
      setRevision((value) => value + 1);
    },
    [sites],
  );

  const value = useMemo<HostedValue>(
    () => ({
      sites,
      errors,
      downloads,
      revision,
      signedIn: api !== null,
      refresh,
      download,
      cancel,
      remove,
    }),
    [sites, errors, downloads, revision, api, refresh, download, cancel, remove],
  );
  return <HostedContext value={value}>{children}</HostedContext>;
}

export function useHostedSites(): HostedValue {
  return useContext(HostedContext);
}

/** Whether a site's current package is on this device. */
export function isStored(site: HostedSite): boolean {
  return site.package !== null && hasStoredPackage(site.package.package_id);
}
