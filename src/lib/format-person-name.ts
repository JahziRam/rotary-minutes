/**
 * Uniform person-name display for Rotary Minutes.
 * - Last name (nom): full UPPERCASE
 * - First name (prénom): each word/part Capitalized, rest lowercase
 * - Display order: Prénom NOM
 */

/** Capitalize each alphabetic segment (spaces, hyphens, apostrophes). */
export function formatFirstName(value: string | null | undefined): string {
  const raw = (value ?? "").trim().replace(/\s+/g, " ");
  if (!raw) return "";
  return raw.replace(/[A-Za-zÀ-ÿŒœÆæ]+/g, (word) => {
    return (
      word.charAt(0).toLocaleUpperCase("fr-FR") +
      word.slice(1).toLocaleLowerCase("fr-FR")
    );
  });
}

/** Full majuscules for the family name. */
export function formatLastName(value: string | null | undefined): string {
  const raw = (value ?? "").trim();
  if (!raw) return "";
  return raw.toLocaleUpperCase("fr-FR");
}

/** Standard display: "Prénom NOM". */
export function formatPersonName(
  firstName: string | null | undefined,
  lastName: string | null | undefined
): string {
  return [formatFirstName(firstName), formatLastName(lastName)]
    .filter(Boolean)
    .join(" ");
}

/**
 * Free-text guest name.
 * Multi-word: last token = NOM, rest = prénoms.
 * Single token: Title Case only (cannot know if prénom or nom).
 */
export function formatGuestName(value: string | null | undefined): string {
  const raw = (value ?? "").trim().replace(/\s+/g, " ");
  if (!raw) return "";
  const parts = raw.split(" ");
  if (parts.length === 1) {
    return formatFirstName(parts[0]);
  }
  const last = parts[parts.length - 1];
  const first = parts.slice(0, -1).join(" ");
  return formatPersonName(first, last);
}

export function formatPersonNameParts(
  firstName: string | null | undefined,
  lastName: string | null | undefined
): { firstName: string; lastName: string } {
  return {
    firstName: formatFirstName(firstName),
    lastName: formatLastName(lastName),
  };
}
