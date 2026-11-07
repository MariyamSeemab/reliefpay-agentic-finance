// AG Studio theme in ReliefPay's brand colours (tailwind.config.js): white cards
// with a light border on the app's #F6F8F9 background, teal accent, navy titles.

import { studioTheme } from 'ag-studio';

const PALETTE = ['#087E83', '#16845B', '#123B4A', '#B7791F', '#B54747', '#5B8DEF'];

const palette = Object.fromEntries(
  PALETTE.flatMap((color, i) => [
    [`chartPaletteFills${i + 1}Color`, color],
    [`chartPaletteStrokes${i + 1}Color`, color],
  ]),
);

export const reliefPayStudioTheme = studioTheme.withParams({
  fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif',
  fontSize: 14,
  textColor: '#0f172a',
  foregroundColor: '#0f172a',
  subtleTextColor: '#64748b',
  backgroundColor: '#ffffff',
  borderColor: '#e2e8f0',
  accentColor: '#087E83',
  iconColor: '#123B4A',
  rowHoverColor: '#ecfeff',

  studioWrapperBorder: false,
  studioWrapperBackgroundColor: '#F6F8F9',
  studioCanvasBackgroundColor: '#F6F8F9',
  studioCanvasPadding: 20,
  studioCanvasRowHeight: 18,

  studioWidgetBackgroundColor: '#ffffff',
  studioWidgetBorder: { width: 1, color: '#e2e8f0' },
  studioWidgetBorderRadius: 16,
  studioWidgetTitleFontSize: 16,
  studioWidgetTitleFontWeight: 600,
  studioWidgetTitleTextColor: '#123B4A',
  studioWidgetSubtitleTextColor: '#64748b',

  gridHeaderTextColor: '#64748b',
  gridHeaderFontWeight: 600,
  gridRowHeight: 40,

  ...palette,
});
