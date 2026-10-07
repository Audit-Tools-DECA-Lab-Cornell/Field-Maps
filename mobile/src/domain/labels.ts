/** The short record label people read aloud: "OBS-3F2A1B", from the record's UUID. */
export function shortLabel(id: string): string {
  return `OBS-${id.slice(0, 6).toUpperCase()}`;
}
