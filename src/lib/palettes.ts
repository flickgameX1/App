/**
 * Palette registry. The token *values* live in index.css under
 * `[data-palette='...']` selectors — this is the metadata the app needs to list
 * and apply them. Every colour in the UI reads from these tokens; nothing
 * hardcodes a hex, so switching themes is a single attribute swap on the root.
 */
export interface PaletteMeta {
  id: string;
  name: string;
  scheme: 'dark' | 'light';
  /** Browser UI colour, kept in step with the palette's background. */
  themeColor: string;
}

export const PALETTES: PaletteMeta[] = [
  { id: 'blush', name: 'Blush', scheme: 'light', themeColor: '#FFE1ED' },
  { id: 'mint', name: 'Mint', scheme: 'light', themeColor: '#D5EFE4' },
  { id: 'lilac', name: 'Lilac', scheme: 'light', themeColor: '#DED0F9' },
  { id: 'dusk', name: 'Dusk', scheme: 'dark', themeColor: '#241B31' },
];

export const DEFAULT_PALETTE_ID = 'blush';

/** The tokens every palette must define. Asserted against index.css in tests. */
export const PALETTE_TOKENS = [
  'bg',
  'surface',
  'text',
  'muted',
  'dim',
  'accent',
  'on-accent',
  'reward',
  'p1',
  'p2',
  'p3',
  'warn',
  'line',
] as const;

export function paletteById(id: string): PaletteMeta {
  return PALETTES.find((p) => p.id === id) ?? PALETTES[0];
}
