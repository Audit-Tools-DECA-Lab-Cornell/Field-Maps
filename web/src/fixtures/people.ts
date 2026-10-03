import type { Person } from "./types";

/** Everyone in the preview world. Pratyush is the signed-in reader ("you"). */
export const PEOPLE: Record<string, Person> = {
	janet: { id: "janet", name: "Janet Loebach", initials: "JL", email: "janet@example.org" },
	pratyush: { id: "pratyush", name: "Pratyush Sudhakar", initials: "PS", email: "p.sudhakar@example.org" },
	alex: { id: "alex", name: "Alex Kim", initials: "AK", email: "alex@example.org" }
};

export const VIEWER_ID = "pratyush";
export const VIEWER = PEOPLE.pratyush!;

export function personByInitials(initials: string): Person | undefined {
	return Object.values(PEOPLE).find(person => person.initials === initials);
}
