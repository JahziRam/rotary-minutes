/**
 * Tokens charte Rotary International (Brand Center).
 * Usage : PV, PDF, emails club — pas le bloc-marque seul ; logo club prioritaire.
 * @see https://brandcenter.rotary.org
 */

/** Couleurs officielles Rotary (documents promotionnels club). */
export const ROTARY_BRAND = {
  royalBlue: "#17458B",
  gold: "#F7A81B",
  azure: "#0067C8",
  charcoal: "#1B1B1B",
  white: "#FFFFFF",
  offWhite: "#F8F7F4",
  muted: "#64748B",
  border: "#E2E8F0",
} as const;

/** Espace de respiration minimal autour du logo (≈ hauteur du « R » de Rotary). */
export const ROTARY_LOGO_DISPLAY = {
  maxHeightPx: 72,
  maxWidthPx: 280,
  clearSpacePx: 16,
  emailMaxHeightPx: 64,
  pdfMaxHeightPt: 56,
  pdfMaxWidthPt: 200,
} as const;

/** Classe Tailwind : espace de respiration autour du logo. */
export const ROTARY_LOGO_CLEAR_SPACE_CLASS = "p-4";

/**
 * Polices logo club (repli Brand Center — proche Arial / Franklin Gothic).
 * Wordmark « Rotary » : gras condensé ; nom du club : régulier même famille.
 */
export const ROTARY_LOGO_FONTS = {
  wordmark:
    "Arial Black, Arial Bold, Helvetica Neue Bold, Helvetica Bold, Helvetica, sans-serif",
  clubName: "Arial, Helvetica Neue, Helvetica, sans-serif",
} as const;

export type ClubBrandHeaderFields = {
  clubName: string;
  addressLine?: string | null;
  districtLine?: string | null;
  logoUrl?: string | null;
};