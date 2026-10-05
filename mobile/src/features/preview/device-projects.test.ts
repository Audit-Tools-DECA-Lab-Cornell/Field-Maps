import { describe, expect, it } from "vitest";
import { identitySchema } from "../../data/api/identity";
import { deviceProjects, FALLBACK_ORG } from "./device-projects";
import { PREVIEW_PROJECTS } from "./fixtures";

const org = "20000000-0000-4000-8000-000000000001";
const trainingOrg = "20000000-0000-4000-8000-000000000099";
const identity = identitySchema.parse({
  profile: {
    user_id: "50000000-0000-4000-8000-000000000001",
    display_name: "Pratyush Sudhakar",
    observer_initials: "PS",
    locale: null,
    created_at: "2026-10-04T00:00:00Z",
  },
  organization_memberships: [
    { organization_id: org, slug: "deca", name: "DECA Lab", role: "member" },
  ],
  project_memberships: [
    {
      project_id: "10000000-0000-4000-8000-000000000003",
      code: "PLAY-26",
      name: "Play Study",
      organization_id: org,
      role: "observer",
      is_training: false,
    },
    {
      project_id: "10000000-0000-4000-8000-000000000002",
      code: "TRAINING",
      name: "Training",
      organization_id: trainingOrg,
      role: "observer",
      is_training: true,
    },
  ],
});

describe("device projects from /v1/me", () => {
  const [study, training] = deviceProjects(
    identity.project_memberships,
    identity.organization_memberships,
  );

  it("maps each membership: id, name, training flag, and its organization's name", () => {
    expect(study).toMatchObject({
      id: "10000000-0000-4000-8000-000000000003",
      name: "Play Study",
      org: "DECA Lab",
      training: false,
      summary: "DECA Lab · observer access",
    });
    expect(training).toMatchObject({
      id: "10000000-0000-4000-8000-000000000002",
      name: "Training",
      training: true,
    });
  });

  it("names FieldMaps when the account is not in the project's organization", () => {
    expect(FALLBACK_ORG).toBe("FieldMaps");
    expect(training?.org).toBe("FieldMaps");
  });

  it("opens the bundled practice site for Training and claims no bundled site for a joined project", () => {
    const fixtureTraining = PREVIEW_PROJECTS.find((project) => project.training);
    expect(training?.siteIds).toEqual(fixtureTraining?.siteIds);
    expect(training?.summary).toBe(fixtureTraining?.summary);
    expect(study?.siteIds).toEqual([]);
  });

  it("lists nothing for an account with no memberships", () => {
    expect(deviceProjects([], [])).toEqual([]);
  });
});
