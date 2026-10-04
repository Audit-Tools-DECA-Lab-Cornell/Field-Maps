import { expect, it } from "vitest";
import { identitySchema } from "./identity";
import { readMeCache, refreshMeCache } from "./me-cache";

const user = "50000000-0000-4000-8000-000000000001";
const training = "10000000-0000-4000-8000-000000000002";
const project = "10000000-0000-4000-8000-000000000003";
const identity = identitySchema.parse({
  profile: {
    user_id: user,
    display_name: "Test",
    observer_initials: "TS",
    locale: null,
    created_at: "2026-10-04T00:00:00Z",
  },
  organization_memberships: [],
  project_memberships: [training, project].map((id) => ({
    project_id: id,
    organization_id: training,
    code: id,
    name: id,
    role: "observer",
    is_training: id === training,
  })),
});
it("restores cached projects and the selected project on offline starts", () => {
  const snapshot = { identity, activeProjectId: training };
  expect(readMeCache(JSON.stringify(snapshot), user)).toEqual(snapshot);
});
it("treats missing, corrupt and another account's cache as misses", () => {
  for (const value of [
    null,
    "broken",
    "{}",
    JSON.stringify({ identity, activeProjectId: training }),
  ])
    expect(readMeCache(value, project)).toBeNull();
});
it("refreshes stale projects while preserving a valid selection", () => {
  const previous = refreshMeCache(identity, null);
  expect(previous.activeProjectId).toBe(project);
  expect(refreshMeCache(identity, previous).activeProjectId).toBe(project);
  const updated = { ...identity, project_memberships: identity.project_memberships.slice(0, 1) };
  expect(refreshMeCache(updated, previous).activeProjectId).toBe(training);
  expect(
    refreshMeCache({ ...identity, project_memberships: [] }, previous).activeProjectId,
  ).toBeNull();
});
