import { Dimensions, useWindowDimensions } from "react-native";

/**
 * The field map targets tablet landscape first, then phone landscape; phone portrait is the
 * fallback where the map stacks over the panel. Reading screens run in either orientation on
 * both. Sizes come from the window so a split view or a rotation is handled the same way as a
 * different device.
 */

export type Layout = {
  readonly width: number;
  readonly height: number;
  readonly tablet: boolean;
  readonly portrait: boolean;
  /** Landscape: the map and the panel sit side by side. */
  readonly wide: boolean;
  readonly panelWidth: number;
  /** Option grids narrow on small screens so nothing scrolls sideways at 844×390. */
  columns: (preferred: number) => number;
};

export function isTabletScreen(): boolean {
  const screen = Dimensions.get("screen");
  return Math.min(screen.width, screen.height) >= 600;
}

export function useLayout(): Layout {
  const { width, height } = useWindowDimensions();
  const tablet = isTabletScreen();
  const portrait = height > width;
  return {
    width,
    height,
    tablet,
    portrait,
    wide: !portrait,
    panelWidth: tablet ? 392 : 310,
    columns: (preferred) => Math.max(1, Math.min(preferred, tablet ? 4 : 2)),
  };
}
