import { type FormDefinition, parseFormDefinition } from "../definition";

/**
 * The first versioned instrument slice, built from the candidate subset in
 * `docs/Janet-Test-Form-Scope.md`: timestamp and initials, play event summary, child age range,
 * both play type slots with their subtypes, CARS intensity, and the wildlife branch.
 *
 * Nothing here is invented. Where the source workbook has not supplied an option list or an
 * export column, the field carries the gap explicitly and the UI shows it. The definition stays
 * `draft` until those decisions are made and the API accepts the version, so records saved
 * against it are held on the device rather than queued for upload.
 */

const PLAY_TYPES = [
  { code: "physical", label: "Physical" },
  { code: "exploratory", label: "Exploratory" },
  { code: "imaginative", label: "Imaginative" },
  { code: "play_with_rules", label: "Play with Rules" },
  { code: "bio", label: "Bio" },
  { code: "expressive", label: "Expressive" },
  { code: "restorative", label: "Restorative" },
  { code: "digital", label: "Digital" },
  { code: "non_play", label: "Non-Play" },
] as const;

function subtypeSets(slot: 1 | 2) {
  const column = (name: string) => (slot === 1 ? name : "");
  const set = (code: string, label: string, options: readonly (readonly [string, string])[]) => ({
    code,
    exportColumn: column(code),
    label,
    options: options.map(([value, text]) => ({ code: value, label: text })),
  });
  return {
    physical: set("Phys_Subtype", "Physical play — which kind?", [
      ["gross_motor", "Gross motor"],
      ["fine_motor", "Fine motor"],
      ["vestibular", "Vestibular"],
      ["rough_and_tumble", "Rough & tumble"],
    ]),
    exploratory: set("Expl_Subtype", "Exploratory play — which kind?", [
      ["sensory", "Sensory"],
      ["active", "Active"],
      ["constructive", "Constructive"],
    ]),
    imaginative: set("Imag_Subtype", "Imaginative play — which kind?", [
      ["symbolic", "Symbolic"],
      ["socio_dramatic", "Socio-dramatic"],
      ["fantasy", "Fantasy"],
    ]),
    play_with_rules: set("PwR_Subtype", "Rules play — which kind?", [
      ["conventional", "Conventional"],
      ["organic", "Organic"],
    ]),
    bio: set("Bio_Subtype", "Bio play — which kind?", [
      ["plants", "Plants"],
      ["wildlife", "Wildlife"],
      ["care", "Care"],
    ]),
    expressive: set("Expr_Subtype", "Expressive play — which kind?", [
      ["performance", "Performance"],
      ["artistic", "Artistic"],
      ["language", "Language"],
      ["conversation", "Conversation"],
    ]),
    restorative: set("Res_Subtype", "Restorative — which kind?", [
      ["resting", "Resting"],
      ["retreat", "Retreat"],
      ["reading", "Reading"],
      ["onlooking", "Onlooking"],
    ]),
    digital: set("Dig_Subtype", "Digital play — which kind?", [
      ["device", "Device"],
      ["augmented", "Augmented"],
      ["embedded", "Embedded"],
    ]),
    non_play: set("Non_Subtype", "Non-play — which kind?", [
      ["self_care", "Self care"],
      ["nutrition", "Nutrition"],
      ["distress", "Distress"],
      ["aggression", "Aggression"],
      ["transition", "Transition"],
      ["other", "Other"],
    ]),
  };
}

const definition = {
  version: "janet-test-v1",
  title: "Janet test subset",
  summary: "Twelve questions across five acts, drawn from the confirmed candidate subset.",
  source: "Variables to use for App testing.xlsx, Sheet1 — see docs/Janet-Test-Form-Scope.md",
  status: "draft",
  inclusion:
    "Excludes all 16 hidden workbook rows (Sheet1 rows 33–40 and 180–187), as the user confirmed for the first test form. Option codes are provisional implementation identifiers and are not workbook values.",
  knownExportCollisions: [],
  protocolNotes: [
    {
      id: "presenting-gender",
      title: "Presenting gender has no export column",
      detail:
        "Test E51 and Library E75 are both blank. The field is held out of this version until a column name is agreed rather than shipped under an invented one.",
      source: "Sheet1 E51 · Library E75",
    },
    {
      id: "manufactured-loose-parts",
      title: "Manufactured loose parts collide with natural loose parts",
      detail:
        "Test E168 and E169 both read Nat_LP_Intn_Binary, so the two answers would land in one column. The loose-parts group waits for a distinct export name.",
      source: "Sheet1 E168 · E169",
    },
    {
      id: "natural-materials-list",
      title: "The natural materials list has not been provided",
      detail:
        "Test G171 says the list is to be provided. The checklist is held out rather than shipped with the instruction's own examples standing in as if they were the instrument.",
      source: "Sheet1 G171",
    },
    {
      id: "play-type-2-required",
      title: "Whether a second play type is required is undecided",
      detail:
        "The scope document leaves this open, so the second slot is optional here and never blocks a save.",
      source: "Sheet1 B83:G100",
    },
    {
      id: "play-subtype-two-slot",
      title: "The two-slot subtype interpretation is unconfirmed",
      detail:
        "The test sheet supplies one subtype set. Slot two keeps its own independent answer, but has no export column until the full library's interpretation is confirmed.",
      source: "Sheet1 B101:G133",
    },
    {
      id: "wildlife-columns",
      title: "The wildlife branch has no supplied export columns or type list",
      detail:
        "Rows B188:H197 name the fields but not their analysis columns, and the interaction type list is not in the sheet. Answers are stored by question identifier only.",
      source: "Sheet1 B188:H197",
    },
    {
      id: "wildlife-other-reveal",
      title: "The wildlife follow-ups use the broad reveal rule",
      detail:
        "All three follow-ups appear on Yes, as the current rule reads. Confirm whether the Other description should appear only when the interaction type is Other.",
      source: "Sheet1 H188",
    },
    {
      id: "carry-forward",
      title: "Which answers carry across observations is undecided",
      detail:
        "This version carries observer initials, zone and round into the next observation and clears every event answer. Round climate and zone inventory are not collected yet.",
      source: "Sheet1 G171, G173, G175, G177, G179",
    },
  ],
  questions: [
    {
      id: "age_range",
      code: "Age1",
      exportColumn: "Child_AgeRange",
      act: "Child",
      label: "How old is the target child?",
      hint: "Closest of the six supplied ranges. Observers are not expected to ask.",
      kind: "one",
      columns: 3,
      required: true,
      source: "Sheet1 B44:G49",
      options: [
        { code: "age_0_2", label: "0–2 yrs" },
        { code: "age_3_5", label: "3–5 yrs" },
        { code: "age_6_8", label: "6–8 yrs" },
        { code: "age_9_12", label: "9–12 yrs" },
        { code: "age_13_16", label: "13–16 yrs" },
        { code: "age_17_plus", label: "17+" },
      ],
    },
    {
      id: "play_type_1",
      code: "PlayType1",
      exportColumn: "Play_Type_1",
      act: "Play",
      label: "Primary play type",
      kind: "one",
      columns: 3,
      required: true,
      source: "Sheet1 B83:G100",
      options: [...PLAY_TYPES],
    },
    {
      id: "play_subtype_1",
      code: "PlaySubtype1",
      exportColumn: "",
      act: "Play",
      label: "Which kind of play?",
      kind: "one",
      columns: 2,
      source: "Sheet1 B101:G133",
      dependsOn: { kind: "answered", question: "play_type_1" },
      openedBy: "Subtypes follow the primary play type you chose",
      dynamicFrom: { question: "play_type_1", sets: subtypeSets(1) },
    },
    {
      id: "play_type_2",
      code: "PlayType2",
      exportColumn: "Play_Type_2",
      act: "Play",
      label: "A second play type, if there is one",
      hint: "Leave it unanswered when a single type describes the event.",
      kind: "one",
      columns: 3,
      source: "Sheet1 B83:G100",
      options: [...PLAY_TYPES],
      protocolFlag:
        "Whether the second slot is required is still a protocol decision. It is optional here and never blocks a save.",
    },
    {
      id: "play_subtype_2",
      code: "PlaySubtype2",
      exportColumn: "",
      act: "Play",
      label: "Which kind of play?",
      kind: "one",
      columns: 2,
      source: "Sheet1 B101:G133",
      dependsOn: { kind: "answered", question: "play_type_2" },
      openedBy: "Subtypes follow the second play type you chose",
      dynamicFrom: { question: "play_type_2", sets: subtypeSets(2) },
      protocolFlag:
        "Slot two keeps its own answer and never shares slot one's values, but the test sheet supplies only one subtype set, so this answer has no export column yet.",
    },
    {
      id: "cars_intensity",
      code: "CARS2",
      exportColumn: "CARS",
      act: "Play",
      label: "How physically intense is it?",
      hint: "The three supplied CARS bands. Bands are recorded as bands, never as a number.",
      kind: "one",
      columns: 1,
      source: "Sheet1 B135:G137",
      options: [
        { code: "cars_1_2", label: "1–2 · stationary" },
        { code: "cars_3", label: "3 · slow" },
        { code: "cars_4_5", label: "4–5 · moderate to vigorous" },
      ],
    },
    {
      id: "wildlife_interaction",
      code: "Wildlife1",
      exportColumn: "",
      act: "Setting",
      label: "Is the child interacting with wildlife?",
      kind: "one",
      columns: 2,
      source: "Sheet1 B188:H197",
      options: [
        { code: "no", label: "No" },
        { code: "yes", label: "Yes" },
      ],
      protocolFlag:
        "This branch has no supplied export columns. Answers are stored by question identifier until they are agreed.",
    },
    {
      id: "wildlife_type",
      code: "Wildlife2",
      exportColumn: "",
      act: "Setting",
      label: "What kind of interaction?",
      kind: "one",
      columns: 2,
      source: "Sheet1 B188:H197",
      dependsOn: { kind: "equals", question: "wildlife_interaction", option: "yes" },
      openedBy: "Opened by the wildlife answer",
      optionsPending:
        "The workbook does not supply this list. It is left empty rather than filled with examples.",
      protocolFlag:
        "Supply the interaction type list before this version is published. Nothing can be recorded here until then.",
    },
    {
      id: "wildlife_other",
      code: "Wildlife3",
      exportColumn: "",
      act: "Setting",
      label: "Describe the other kind of interaction",
      kind: "text",
      rows: 2,
      maxLength: 100,
      placeholder: "Up to 100 characters",
      source: "Sheet1 B188:H197",
      dependsOn: { kind: "equals", question: "wildlife_interaction", option: "yes" },
      openedBy: "Opened by the wildlife answer",
      protocolFlag:
        "The broad rule reveals this with the whole branch. Confirm whether it should appear only when the interaction type is Other.",
    },
    {
      id: "wildlife_description",
      code: "Wildlife4",
      exportColumn: "",
      act: "Setting",
      label: "Describe the wildlife interaction",
      kind: "text",
      rows: 2,
      maxLength: 100,
      placeholder: "Up to 100 characters",
      source: "Sheet1 B188:H197",
      dependsOn: { kind: "equals", question: "wildlife_interaction", option: "yes" },
      openedBy: "Opened by the wildlife answer",
    },
    {
      id: "observer_initials",
      code: "Observer1",
      exportColumn: "observer",
      act: "Record",
      label: "Who is observing?",
      hint: "Up to ten uppercase characters. Carried into the next observation in this session.",
      kind: "text",
      rows: 1,
      maxLength: 10,
      required: true,
      placeholder: "e.g. JL",
      source: "Sheet1 B4:G5",
    },
    {
      id: "play_event_summary",
      code: "Summary1",
      exportColumn: "Play_Event_Summary",
      act: "Record",
      label: "Describe the play event",
      hint: "A sentence or two, written as you saw it.",
      kind: "text",
      rows: 4,
      maxLength: 1000,
      required: true,
      placeholder:
        "Two children dragging a large branch toward the mud kitchen, negotiating who steers…",
      source: "Sheet1 B42:G42",
    },
  ],
} satisfies Record<string, unknown>;

export const janetTestV1: FormDefinition = parseFormDefinition(definition);

/** Answers carried into the next observation in the same session. */
export const carriedAnswers: readonly string[] = ["observer_initials"];
