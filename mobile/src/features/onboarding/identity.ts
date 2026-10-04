/**
 * The observer identity: a full name and the initials that become the observer code on every new
 * observation (PRODUCT.md glossary: "Observer code · Up to ten uppercase characters"). Pure rules, so
 * the profile screen, the profile store and the tests share one definition.
 */

/** The longest observer code. */
export const INITIALS_MAX = 10;

/** The longest full name the profile keeps. Names wrap on screen; this only bounds storage. */
export const NAME_MAX = 80;

const INITIALS_PATTERN = /^[A-Z0-9]{1,10}$/;

/** One to ten letters A to Z or digits, in upper case. */
export function isValidInitials(value: string): boolean {
  return INITIALS_PATTERN.test(value);
}

/**
 * What the initials field shows as it is typed: upper case, without spaces, at most ten characters.
 * Anything else typed stays visible so the field can say what is wrong with it.
 */
export function typedInitials(raw: string): string {
  return raw.toUpperCase().replace(/\s+/g, "").slice(0, INITIALS_MAX);
}

/** A name with its outer spaces trimmed and inner runs of spaces collapsed. */
export function cleanName(raw: string): string {
  return raw.trim().replace(/\s+/g, " ");
}

/** Letters without their accents, so "Ólafur" suggests "O". */
function plainLetters(value: string): string {
  try {
    return value.normalize("NFD").replace(/[̀-ͯ]/g, "");
  } catch {
    return value;
  }
}

/**
 * Initials suggested from a name until the observer types their own: the first letter of each word, up
 * to three ("Pratyush Sudhakar" → "PS", "Mary Ann Smith" → "MAS").
 */
export function suggestInitials(name: string): string {
  return cleanName(plainLetters(name))
    .split(" ")
    .map((word) =>
      word
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, "")
        .charAt(0),
    )
    .filter(Boolean)
    .slice(0, 3)
    .join("");
}

/** What is wrong with a full name, in the field's words, or undefined when it can be saved. */
export function nameProblem(raw: string): string | undefined {
  return cleanName(raw) === "" ? "Enter your full name" : undefined;
}

/** What is wrong with the initials, in the field's words, or undefined when they can be saved. */
export function initialsProblem(value: string): string | undefined {
  if (value === "" || value.length > INITIALS_MAX) return "Enter up to 10 uppercase characters";
  if (!isValidInitials(value)) return "Use the letters A to Z and numbers only";
  return undefined;
}
