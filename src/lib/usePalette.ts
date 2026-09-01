import { useEffect } from 'react';
import { DEFAULT_PALETTE_ID, paletteById } from './palettes';

/**
 * Applies a palette by stamping the root element — the whole token set swaps at
 * once, and the browser chrome follows the background so the app doesn't sit in
 * a mismatched frame when it's installed.
 */
export function usePalette(paletteId: string | undefined): void {
  useEffect(() => {
    const palette = paletteById(paletteId ?? DEFAULT_PALETTE_ID);
    document.documentElement.dataset.palette = palette.id;
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', palette.themeColor);
  }, [paletteId]);
}
