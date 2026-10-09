import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { MeProvider, useMe } from "../../data/api/me-provider";
import { HostedSitesProvider, useHostedSites } from "./provider";

const mocks = vi.hoisted(() => {
  const state: { account: { id: string } | null } = { account: null };
  return {
    ...state,
    markAccountDeleted: vi.fn(),
    readSiteList: vi.fn(() => null),
  };
});

vi.mock("react-native", () => ({
  AppState: { addEventListener: vi.fn(() => ({ remove: vi.fn() })) },
}));
vi.mock("../../auth/provider", () => ({
  useAccount: () => ({
    account: mocks.account,
    client: null,
    session: null,
    restored: true,
    markAccountDeleted: mocks.markAccountDeleted,
  }),
}));
vi.mock("../../platform/config", () => ({
  connection: { apiUrl: "https://api.example.test", supabaseUrl: "https://auth.example.test" },
}));
vi.mock("../../data/api/me-file", () => ({
  meFileStore: () => ({ read: () => null, write: vi.fn() }),
}));
vi.mock("./device", () => ({ readSiteList: mocks.readSiteList }));

let root: ReactTestRenderer | undefined;
let renders = 0;
const memberships: ReturnType<typeof useMe>[] = [];
const hosted: ReturnType<typeof useHostedSites>[] = [];

function Probe() {
  memberships.push(useMe());
  hosted.push(useHostedSites());
  renders += 1;
  if (renders > 20) throw new Error("Hosted sites did not settle within 20 renders");
  return null;
}

function Tree() {
  return (
    <MeProvider>
      <HostedSitesProvider>
        <Probe />
      </HostedSitesProvider>
    </MeProvider>
  );
}

beforeEach(() => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  mocks.account = null;
  mocks.readSiteList.mockClear();
  renders = 0;
  memberships.length = 0;
  hosted.length = 0;
});

afterEach(async () => {
  await act(async () => root?.unmount());
  root = undefined;
  vi.unstubAllGlobals();
});

it.each([
  null,
  { id: "cached-account" },
])("settles startup without a profile snapshot for account %j", async (account) => {
  mocks.account = account;
  await act(async () => {
    root = create(<Tree />);
  });
  expect(renders).toBeGreaterThan(1);
  expect(memberships.at(-1)?.ready).toBe(true);
  expect(hosted.at(-1)?.sites).toEqual({});
  expect(hosted.at(-1)?.errors).toEqual({});
  expect(hosted.at(-1)?.signedIn).toBe(false);
  for (const value of memberships) {
    expect(value.projects).toBe(memberships[0]?.projects);
    expect(value.organizations).toBe(memberships[0]?.organizations);
  }
  expect(mocks.readSiteList).not.toHaveBeenCalled();
});
