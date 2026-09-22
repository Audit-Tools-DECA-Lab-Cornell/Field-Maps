import { type FormDefinition, parseFormDefinition } from "../definition";

/**
 * The existing practice form, expressed as a definition so it renders through the same engine
 * as the instrument. Its three fields, their limits and its record shape are unchanged, so
 * practice records saved before this redesign keep listing and uploading exactly as they did.
 *
 * This is the only version the API accepts today.
 */
export const shellV1: FormDefinition = parseFormDefinition({
  version: "shell-v1",
  title: "Practice form",
  summary: "Three practice fields against the bundled training map.",
  source: "The original FieldMaps shell; not a research instrument.",
  status: "published",
  inclusion: "Practice only. These records are not part of Janet's variable library.",
  knownExportCollisions: [],
  protocolNotes: [],
  questions: [
    {
      id: "observer",
      code: "Observer",
      exportColumn: "observer",
      act: "Record",
      label: "Who is observing?",
      hint: "Up to twelve characters.",
      kind: "text",
      rows: 1,
      maxLength: 12,
      required: true,
      placeholder: "e.g. JL",
      source: "Practice form",
    },
    {
      id: "people",
      code: "People",
      exportColumn: "people",
      act: "Social",
      label: "How many people are here?",
      kind: "number",
      min: 0,
      max: 999,
      required: true,
      placeholder: "0–999",
      source: "Practice form",
    },
    {
      id: "notes",
      code: "Notes",
      exportColumn: "notes",
      act: "Record",
      label: "What do you notice?",
      hint: "Optional field notes.",
      kind: "text",
      rows: 4,
      maxLength: 1000,
      source: "Practice form",
    },
  ],
});
