import { z } from "zod";

/**
 * The three rounds every project offers (Janet, 2026-10-07). They replace the numbered rounds
 * ("Round 1, Round 2, …"), which the source workbook never had: it asks whether a play event is part
 * of a reliability round (Rel_Round) and records the zone inventory "at the beginning of a round, not
 * for individual play events" (Sheet1 rows 8 and 19).
 *
 * - **Standard**: map play events. Each observation is a point placed by hand.
 * - **Reliability**: the same form, coded independently by a second observer in the same zone at the
 *   same time, so the two codings can be compared. Its records carry Rel_Round = Yes.
 * - **Inventory**: weather, wind, shade and the loose parts available, entered once per zone. A record
 *   belongs to the whole zone, so no point is placed: it is stored at the zone's centre.
 */
export const ROUND_TYPES = ["standard", "reliability", "inventory"] as const;
export const roundTypeSchema = z.enum(ROUND_TYPES);
export type RoundType = z.infer<typeof roundTypeSchema>;

export type RoundDefinition = {
  readonly type: RoundType;
  /** "Standard round", as buttons and lists read. */
  readonly label: string;
  /** One line under the label in the session brief. */
  readonly description: string;
  /** What an observation in this round is: a play event at a point, or one zone's inventory. */
  readonly records: "play-event" | "zone-inventory";
};

export const ROUNDS: Readonly<Record<RoundType, RoundDefinition>> = {
  standard: {
    type: "standard",
    label: "Standard round",
    description: "Map play events in the zone. Each observation is a point you place on the map.",
    records: "play-event",
  },
  reliability: {
    type: "reliability",
    label: "Reliability round",
    description:
      "Code the same zone at the same time as another observer, independently, so your codings can be compared.",
    records: "play-event",
  },
  inventory: {
    type: "inventory",
    label: "Inventory round",
    description:
      "Record the weather, wind, shade and the loose parts available, once for each zone. No points are placed.",
    records: "zone-inventory",
  },
};

export function roundLabel(type: RoundType): string {
  return ROUNDS[type].label;
}

/** Whether observations in this round are play events placed by hand, rather than a zone's inventory. */
export function placesPoints(type: RoundType): boolean {
  return ROUNDS[type].records === "play-event";
}

/**
 * The analysis columns a round stamps onto each record, beside its answers: the workbook's
 * Rel_Round ("Is this play event part of a Reliability Round?") and First_Round ("Is this the first
 * round of the observation period?"). Inventory records answer neither question, so they carry neither.
 */
export function roundColumns(
  type: RoundType,
  firstRound: boolean,
): Readonly<Record<string, "yes" | "no">> {
  if (type === "inventory") return {};
  return {
    Rel_Round: type === "reliability" ? "yes" : "no",
    First_Round: firstRound ? "yes" : "no",
  };
}
