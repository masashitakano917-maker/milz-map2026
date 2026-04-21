export type IllustrationThemeKey = 'style2' | 'style3' | 'style4';
export type MapThemeKey = 'original' | IllustrationThemeKey;

export type LatLngTuple = [number, number];
export type BoundsTuple = [LatLngTuple, LatLngTuple];

interface StandardTheme {
  type: 'standard';
  name: string;
  description: string;
  url: string;
  attribution: string;
}

export interface TokyoIllustrationTheme {
  type: 'illustration';
  name: string;
  description: string;
  url: string;
  attribution: string;
  center: LatLngTuple;
  zoom: number;
  bounds: BoundsTuple;
  palette: {
    wash: string;
    ink: string;
    routePrimary: string;
    routeSecondary: string;
    park: string;
    water: string;
    card: string;
  };
}

export type MapTheme = StandardTheme | TokyoIllustrationTheme;

const baseTileUrl = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
const baseAttribution = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

export const TOKYO_ILLUSTRATION_THEME: TokyoIllustrationTheme = {
  type: 'illustration',
  name: 'Tokyo Miniature',
  description: 'MapTiler built-in style preview for Tokyo miniature camera presets',
  url: baseTileUrl,
  attribution: baseAttribution,
  center: [35.6812, 139.7671],
  zoom: 12,
  bounds: [[35.60, 139.64], [35.78, 139.88]],
  palette: {
    wash: '#f4f1e6',
    ink: '#24312c',
    routePrimary: '#dd9d37',
    routeSecondary: '#86a9b6',
    park: '#91b57d',
    water: '#d9ebe7',
    card: '#fbf7ed',
  },
};

export const MAP_THEMES: Record<MapThemeKey, MapTheme> = {
  original: {
    type: 'standard',
    name: 'オリジナル',
    description: '通常の実用マップ',
    url: baseTileUrl,
    attribution: baseAttribution,
  },
  style2: { ...TOKYO_ILLUSTRATION_THEME, name: 'Style2', description: 'Current TOP visual style in a top-down view' },
  style3: { ...TOKYO_ILLUSTRATION_THEME, name: 'Style3', description: 'Current Soft Tilt visual style in a top-down view' },
  style4: { ...TOKYO_ILLUSTRATION_THEME, name: 'Style4', description: 'Current Miniature visual style in a top-down view' },
};

export const isIllustrationTheme = (theme: MapThemeKey): theme is IllustrationThemeKey => ['style2', 'style3', 'style4'].includes(theme);
