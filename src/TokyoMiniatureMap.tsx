import { useEffect, useRef, useState, type MutableRefObject } from 'react';
import L from 'leaflet';

import type { IllustrationThemeKey } from './illustrationMaps';

export type TokyoAnglePreset = 'top' | 'soft' | 'miniature';

type PresetConfig = {
  label: string;
  pitch: number;
  bearing: number;
  zoom: number;
  minZoom: number;
  maxZoom: number;
};

export const TOKYO_ANGLE_PRESETS: Record<TokyoAnglePreset, PresetConfig> = {
  top: { label: 'Top', pitch: 8, bearing: 0, zoom: 15.05, minZoom: 11.5, maxZoom: 17.8 },
  soft: { label: 'Soft Tilt', pitch: 42, bearing: -18, zoom: 15.4, minZoom: 11.5, maxZoom: 18.5 },
  miniature: { label: 'Miniature', pitch: 68, bearing: -28, zoom: 16.0, minZoom: 11.5, maxZoom: 19 },
};

export interface MapNavigator {
  flyTo: (coords: [number, number], zoom: number, options?: { animate?: boolean; duration?: number }) => void;
}

interface PlaceLike {
  id: string;
  name: string;
  category: string;
  lat: number;
  lng: number;
}

interface TempAiPinLike {
  lat: number;
  lng: number;
  name: string;
}

interface AiFavoritePinLike {
  key: string;
  lat: number;
  lng: number;
  name: string;
}

interface TokyoMiniatureMapProps {
  apiKey?: string;
  styleVariant: IllustrationThemeKey;
  places: PlaceLike[];
  tempAiPin: TempAiPinLike | null;
  aiFavoritePins: AiFavoritePinLike[];
  newPlacePos: { lat: number; lng: number } | null;
  role: 'admin' | 'user' | null;
  activeTab: 'map' | 'list' | 'shorts' | 'ai' | 'profile';
  isAdding: boolean;
  setTempAiPin: (value: TempAiPinLike | null) => void;
  setNewPlacePos: (value: { lat: number; lng: number } | null) => void;
  setIsAdding: (value: boolean) => void;
  setMapBounds: (bounds: L.LatLngBounds | null) => void;
  mapRef: MutableRefObject<MapNavigator | null>;
  onSelectPlace: (place: any) => void;
  focusTarget: { lat: number; lng: number } | null;
  onFocusHandled: () => void;
}

declare global {
  interface Window {
    maptilersdk?: any;
  }
}

const TOKYO_CENTER: [number, number] = [35.6812, 139.7671];
const MAPTILER_JS = 'https://cdn.maptiler.com/maptiler-sdk-js/v3.10.2/maptiler-sdk.umd.min.js';
const MAPTILER_CSS = 'https://cdn.maptiler.com/maptiler-sdk-js/v3.10.2/maptiler-sdk.css';
const TERRAIN_SOURCE_URL = 'https://api.maptiler.com/tiles/terrain-rgb-v2/tiles.json';

let sdkLoader: Promise<any> | null = null;

const CATEGORY_MARKER_STYLES: Record<string, { bg: string; fg: string; svg: string }> = {
  'レストラン': { bg: '#111111', fg: '#ffffff', svg: '<svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2"></path><path d="M7 2v20"></path><path d="M21 15V2v0a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7"></path></svg>' },
  'カフェ': { bg: '#4f3422', fg: '#ffffff', svg: '<svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M17 8h1a4 4 0 1 1 0 8h-1"></path><path d="M3 8h14v7a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4Z"></path><line x1="6" y1="2" x2="6" y2="5"></line><line x1="10" y1="2" x2="10" y2="5"></line><line x1="14" y1="2" x2="14" y2="5"></line></svg>' },
  '駅・交通': { bg: '#1d4ed8', fg: '#ffffff', svg: '<svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><rect x="8" y="3" width="8" height="12" rx="2"></rect><path d="M8 11h8"></path><path d="M12 15v4"></path><path d="M8 19l-2 2"></path><path d="M16 19l2 2"></path></svg>' },
  '駐車場': { bg: '#0f766e', fg: '#ffffff', svg: '<svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M13 4h-3v16"></path><path d="M10 4h5a4 4 0 0 1 0 8h-5"></path></svg>' },
  '公園・自然': { bg: '#166534', fg: '#ffffff', svg: '<svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M10 10v.2A3 3 0 0 1 8.9 16H5a3 3 0 0 1-1-5.8V10a3 3 0 0 1 6 0Z"></path><path d="M18 12v.2A3 3 0 0 1 16.9 18H13a3 3 0 0 1-1-5.8V12a3 3 0 0 1 6 0Z"></path><path d="M12 22v-3"></path><path d="M8 22v-2"></path><path d="M16 22v-2"></path></svg>' },
  'ショッピング': { bg: '#7c3aed', fg: '#ffffff', svg: '<svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"></path><path d="M3 6h18"></path><path d="M16 10a4 4 0 0 1-8 0"></path></svg>' },
  '学校': { bg: '#7c2d12', fg: '#ffffff', svg: '<svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="m4 6 8-4 8 4"></path><path d="m18 10 2 1v8a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-8l2-1"></path><path d="M14 22v-4a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v4"></path></svg>' },
  'コンビニ': { bg: '#be123c', fg: '#ffffff', svg: '<svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="m2 7 4.41-4.41A2 2 0 0 1 7.83 2h8.34a2 2 0 0 1 1.42.59L22 7"></path><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"></path><path d="M15 22v-4a2 2 0 0 0-2-2h-2a2 2 0 0 0-2 2v4"></path><path d="M2 7h20"></path></svg>' },
  'その他': { bg: '#374151', fg: '#ffffff', svg: '<svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="1"></circle><circle cx="19" cy="12" r="1"></circle><circle cx="5" cy="12" r="1"></circle></svg>' },
  'restaurant': { bg: '#111111', fg: '#ffffff', svg: '<svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2"></path><path d="M7 2v20"></path><path d="M21 15V2v0a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7"></path></svg>' },
  'cafe': { bg: '#4f3422', fg: '#ffffff', svg: '<svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M17 8h1a4 4 0 1 1 0 8h-1"></path><path d="M3 8h14v7a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4Z"></path><line x1="6" y1="2" x2="6" y2="5"></line><line x1="10" y1="2" x2="10" y2="5"></line><line x1="14" y1="2" x2="14" y2="5"></line></svg>' },
  'shop': { bg: '#7c3aed', fg: '#ffffff', svg: '<svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"></path><path d="M3 6h18"></path><path d="M16 10a4 4 0 0 1-8 0"></path></svg>' },
  'other': { bg: '#374151', fg: '#ffffff', svg: '<svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="1"></circle><circle cx="19" cy="12" r="1"></circle><circle cx="5" cy="12" r="1"></circle></svg>' },
};

function ensureMapTilerAssets() {
  if (typeof window === 'undefined') return Promise.reject(new Error('window unavailable'));
  if (window.maptilersdk) return Promise.resolve(window.maptilersdk);
  if (sdkLoader) return sdkLoader;

  sdkLoader = new Promise((resolve, reject) => {
    if (!document.querySelector('link[data-maptiler-sdk="true"]')) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = MAPTILER_CSS;
      link.setAttribute('data-maptiler-sdk', 'true');
      document.head.appendChild(link);
    }

    const existing = document.querySelector<HTMLScriptElement>('script[data-maptiler-sdk="true"]');
    if (existing) {
      existing.addEventListener('load', () => resolve(window.maptilersdk), { once: true });
      existing.addEventListener('error', () => reject(new Error('Failed to load MapTiler SDK script')), { once: true });
      return;
    }

    const script = document.createElement('script');
    script.src = MAPTILER_JS;
    script.async = true;
    script.setAttribute('data-maptiler-sdk', 'true');
    script.onload = () => resolve(window.maptilersdk);
    script.onerror = () => reject(new Error('Failed to load MapTiler SDK script'));
    document.head.appendChild(script);
  });

  return sdkLoader;
}

function createMarkerNode(kind: 'place' | 'ai' | 'aiSaved' | 'new', label?: string, category?: string) {
  const el = document.createElement('button');
  el.type = 'button';
  el.className = 'milz-maptiler-marker';

  const inner = document.createElement('span');
  inner.className = `milz-maptiler-marker__inner milz-maptiler-marker__inner--${kind}`;

  if (kind === 'place') {
    const markerStyle = CATEGORY_MARKER_STYLES[category || ''] || CATEGORY_MARKER_STYLES['その他'];
    inner.style.background = markerStyle.bg;
    inner.style.color = markerStyle.fg;
    inner.innerHTML = markerStyle.svg;
  } else {
    inner.textContent = kind === 'ai' ? 'AI' : kind === 'aiSaved' ? '★' : kind === 'new' ? '+' : '';
  }

  el.appendChild(inner);

  if (label && kind === 'place') {
    const tag = document.createElement('span');
    tag.className = 'milz-maptiler-marker__label';
    tag.textContent = label;
    el.appendChild(tag);
  }

  return el;
}

function buildMapNavigator(map: any): MapNavigator {
  return {
    flyTo(coords, zoom, options) {
      map.flyTo({
        center: [coords[1], coords[0]],
        zoom,
        duration: options?.duration ?? 1000,
        essential: true,
      });
    },
  };
}

function resolveStyle(sdk: any, preset: TokyoAnglePreset) {
  const style = sdk?.MapStyle;
  if (!style) return 'streets-v2';

  switch (preset) {
    case 'top':
      return style.STREETS?.PASTEL || style.BASIC?.LIGHT || style.STREETS || 'streets-v2';
    case 'soft':
      return style.VOYAGER?.VINTAGE || style.BASIC?.LIGHT || style.STREETS || 'streets-v2';
    case 'miniature':
      return style.HYBRID || style.SATELLITE || style.STREETS || 'streets-v2';
    default:
      return style.STREETS || 'streets-v2';
  }
}

function addTerrain(map: any, apiKey: string, preset: TokyoAnglePreset) {
  if (preset === 'top') {
    try {
      map.setTerrain?.(null);
    } catch {
      // noop
    }
    return;
  }

  if (!map.getSource?.('milz-terrain')) {
    try {
      map.addSource('milz-terrain', {
        type: 'raster-dem',
        url: `${TERRAIN_SOURCE_URL}?key=${apiKey}`,
        tileSize: 256,
        maxzoom: 14,
      });
    } catch {
      // noop
    }
  }

  try {
    map.setTerrain?.({ source: 'milz-terrain', exaggeration: preset === 'miniature' ? 1.22 : 1.1 });
  } catch {
    // noop
  }
}

function addAtmosphere(map: any, preset: TokyoAnglePreset) {
  try {
    map.setFog?.({
      color: preset === 'miniature' ? 'rgba(236,231,220,0.78)' : 'rgba(244,241,234,0.62)',
      'high-color': preset === 'miniature' ? 'rgba(164,186,214,0.34)' : 'rgba(194,211,228,0.20)',
      'horizon-blend': preset === 'miniature' ? 0.18 : 0.08,
      'space-color': 'rgba(255,255,255,0)',
      'star-intensity': 0,
    });
  } catch {
    // noop
  }
}

function add3dBuildings(map: any, preset: TokyoAnglePreset) {
  const style = map.getStyle?.();
  if (!style?.layers || !style?.sources) return;

  if (map.getLayer?.('milz-3d-buildings')) {
    try {
      map.removeLayer('milz-3d-buildings');
    } catch {
      // noop
    }
  }

  const candidateLayer = style.layers.find((layer: any) => {
    const sourceLayer = String(layer['source-layer'] || '');
    return sourceLayer.toLowerCase().includes('building') && layer.source;
  });
  const sourceId = candidateLayer?.source;
  const sourceLayer = candidateLayer?.['source-layer'] || 'building';
  if (!sourceId) return;

  const beforeId = style.layers.find((layer: any) => layer.type === 'symbol' && layer.layout?.['text-field'])?.id;

  const opacity = preset === 'miniature' ? 0.92 : preset === 'soft' ? 0.84 : 0.72;
  const baseColor = preset === 'miniature' ? '#e0dad0' : '#d9d3ca';
  const tallColor = preset === 'miniature' ? '#b9b0a7' : '#c4bbb2';

  try {
    map.addLayer(
      {
        id: 'milz-3d-buildings',
        type: 'fill-extrusion',
        source: sourceId,
        'source-layer': sourceLayer,
        minzoom: 13,
        paint: {
          'fill-extrusion-color': [
            'interpolate',
            ['linear'],
            ['coalesce', ['to-number', ['get', 'render_height']], ['to-number', ['get', 'height']], 0],
            0,
            baseColor,
            30,
            '#d0c7bc',
            90,
            tallColor,
            180,
            '#a59a91',
          ],
          'fill-extrusion-height': [
            'interpolate',
            ['linear'],
            ['zoom'],
            13,
            0,
            14,
            ['coalesce', ['to-number', ['get', 'render_height']], ['to-number', ['get', 'height']], 0],
          ],
          'fill-extrusion-base': [
            'coalesce',
            ['to-number', ['get', 'render_min_height']],
            ['to-number', ['get', 'min_height']],
            0,
          ],
          'fill-extrusion-opacity': opacity,
          'fill-extrusion-vertical-gradient': true,
        },
      },
      beforeId,
    );
  } catch {
    // noop
  }
}

function applyMiniaturePresentation(
  map: any,
  apiKey: string,
  visualPresetKey: TokyoAnglePreset,
  options: { instant?: boolean; preserveCenter?: boolean } = {},
) {
  const preset = TOKYO_ANGLE_PRESETS.top;
  const duration = options.instant ? 0 : 1100;

  addAtmosphere(map, visualPresetKey);
  addTerrain(map, apiKey, visualPresetKey);
  add3dBuildings(map, visualPresetKey);

  try {
    const currentCenter = map.getCenter?.();
    const hasMeaningfulCurrentCenter =
      currentCenter &&
      (Math.abs(currentCenter.lat - TOKYO_CENTER[0]) > 0.0001 || Math.abs(currentCenter.lng - TOKYO_CENTER[1]) > 0.0001);

    const targetCenter = options.preserveCenter || hasMeaningfulCurrentCenter
      ? [currentCenter.lng, currentCenter.lat]
      : [TOKYO_CENTER[1], TOKYO_CENTER[0]];

    map.easeTo({
      center: targetCenter,
      zoom: preset.zoom,
      pitch: preset.pitch,
      bearing: preset.bearing,
      duration,
      essential: true,
    });
  } catch {
    // noop
  }
}

export default function TokyoMiniatureMap({
  apiKey,
  styleVariant,
  places,
  tempAiPin,
  aiFavoritePins,
  newPlacePos,
  role,
  activeTab,
  isAdding,
  setTempAiPin,
  setNewPlacePos,
  setIsAdding,
  setMapBounds,
  mapRef,
  onSelectPlace,
  focusTarget,
  onFocusHandled,
}: TokyoMiniatureMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<any>(null);
  const markerRefs = useRef<any[]>([]);
  const aiFavoriteMarkerRefs = useRef<any[]>([]);
  const tempMarkerRef = useRef<any | null>(null);
  const addMarkerRef = useRef<any | null>(null);
  const [runtimeError, setRuntimeError] = useState<string | null>(null);
  const hasKey = Boolean(apiKey && apiKey.trim());
  const visualPreset = styleVariant === 'style3' ? 'soft' : styleVariant === 'style4' ? 'miniature' : 'top';
  const preset = TOKYO_ANGLE_PRESETS.top;
  const latestRoleRef = useRef(role);
  const latestTabRef = useRef(activeTab);
  const latestAddingRef = useRef(isAdding);

  useEffect(() => {
    latestRoleRef.current = role;
    latestTabRef.current = activeTab;
    latestAddingRef.current = isAdding;
  }, [role, activeTab, isAdding]);
  const roleRef = useRef(role);
  const activeTabRef = useRef(activeTab);
  const isAddingRef = useRef(isAdding);

  useEffect(() => {
    roleRef.current = role;
  }, [role]);

  useEffect(() => {
    activeTabRef.current = activeTab;
  }, [activeTab]);

  useEffect(() => {
    isAddingRef.current = isAdding;
  }, [isAdding]);

  useEffect(() => {
    if (!hasKey || !containerRef.current) return;
    let cancelled = false;

    ensureMapTilerAssets()
      .then((sdk) => {
        if (cancelled || !containerRef.current) return;
        sdk.config.apiKey = apiKey;

        const map = new sdk.Map({
          container: containerRef.current,
          style: resolveStyle(sdk, visualPreset),
          center: [TOKYO_CENTER[1], TOKYO_CENTER[0]],
          zoom: preset.zoom,
          bearing: preset.bearing,
          pitch: preset.pitch,
          antialias: true,
          attributionControl: false,
          maxPitch: 85,
          maxZoom: preset.maxZoom,
          minZoom: preset.minZoom,
          dragRotate: true,
          touchPitch: true,
          terrainControl: false,
        });

        mapInstanceRef.current = map;
        mapRef.current = buildMapNavigator(map);

        const syncBounds = () => {
          const bounds = map.getBounds?.();
          if (bounds) {
            setMapBounds(L.latLngBounds([bounds.getSouth(), bounds.getWest()], [bounds.getNorth(), bounds.getEast()]));
          }
        };

        map.on('load', () => {
          applyMiniaturePresentation(map, apiKey!, visualPreset, { instant: true, preserveCenter: false });
          syncBounds();
        });

        map.on('style.load', () => {
          applyMiniaturePresentation(map, apiKey!, visualPreset, { instant: true, preserveCenter: true });
        });

        map.on('idle', () => {
          add3dBuildings(map, visualPreset);
        });

        map.on('moveend', syncBounds);

        map.on('click', (event: any) => {
          if (roleRef.current === 'admin' && activeTabRef.current === 'map') {
            setNewPlacePos({ lat: event.lngLat.lat, lng: event.lngLat.lng });
            setIsAdding(true);
          }
        });
      })
      .catch((error) => {
        if (!cancelled) {
          setRuntimeError(error instanceof Error ? error.message : 'MapTiler SDK failed to load');
        }
      });

    return () => {
      cancelled = true;
      markerRefs.current.forEach((marker) => marker.remove?.());
      markerRefs.current = [];
      aiFavoriteMarkerRefs.current.forEach((marker) => marker.remove?.());
      aiFavoriteMarkerRefs.current = [];
      tempMarkerRef.current?.remove?.();
      addMarkerRef.current?.remove?.();
      mapInstanceRef.current?.remove?.();
      mapInstanceRef.current = null;
      mapRef.current = null;
    };
  }, [apiKey, hasKey, visualPreset, preset]);

  useEffect(() => {
    const sdk = window.maptilersdk;
    const map = mapInstanceRef.current;
    if (!sdk || !map || !hasKey) return;

    map.setStyle(resolveStyle(sdk, visualPreset));
    map.once('style.load', () => {
      applyMiniaturePresentation(map, apiKey!, visualPreset, { preserveCenter: true });
    });
  }, [apiKey, hasKey, visualPreset]);

  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !hasKey) return;
    map.setMinZoom?.(preset.minZoom);
    map.setMaxZoom?.(preset.maxZoom);
    applyMiniaturePresentation(map, apiKey!, visualPreset, { preserveCenter: true });
  }, [visualPreset, apiKey, hasKey, preset]);

  useEffect(() => {
    const sdk = window.maptilersdk;
    const map = mapInstanceRef.current;
    if (!sdk || !map) return;

    markerRefs.current.forEach((marker) => marker.remove?.());
    markerRefs.current = [];

    places.forEach((place) => {
      const el = createMarkerNode('place', place.name, place.category);
      el.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        onSelectPlace(place);
      });

      const marker = new sdk.Marker({ element: el, anchor: 'bottom' })
        .setLngLat([place.lng, place.lat])
        .addTo(map);

      markerRefs.current.push(marker);
    });
  }, [places, onSelectPlace]);

  useEffect(() => {
    const sdk = window.maptilersdk;
    const map = mapInstanceRef.current;
    if (!sdk || !map) return;

    aiFavoriteMarkerRefs.current.forEach((marker) => marker.remove?.());
    aiFavoriteMarkerRefs.current = [];

    aiFavoritePins.forEach((place) => {
      const el = createMarkerNode('aiSaved');
      const marker = new sdk.Marker({ element: el, anchor: 'bottom' })
        .setLngLat([place.lng, place.lat])
        .addTo(map);
      aiFavoriteMarkerRefs.current.push(marker);
    });
  }, [aiFavoritePins]);

  useEffect(() => {
    const sdk = window.maptilersdk;
    const map = mapInstanceRef.current;
    if (!sdk || !map) return;

    tempMarkerRef.current?.remove?.();
    tempMarkerRef.current = null;
    if (tempAiPin) {
      const el = createMarkerNode('ai');
      el.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        setTempAiPin(null);
      });
      tempMarkerRef.current = new sdk.Marker({ element: el, anchor: 'bottom' })
        .setLngLat([tempAiPin.lng, tempAiPin.lat])
        .addTo(map);
    }
  }, [tempAiPin, setTempAiPin]);

  useEffect(() => {
    const sdk = window.maptilersdk;
    const map = mapInstanceRef.current;
    if (!sdk || !map) return;

    addMarkerRef.current?.remove?.();
    addMarkerRef.current = null;
    if (newPlacePos) {
      const el = createMarkerNode('new');
      addMarkerRef.current = new sdk.Marker({ element: el, anchor: 'bottom' })
        .setLngLat([newPlacePos.lng, newPlacePos.lat])
        .addTo(map);
    }
  }, [newPlacePos]);

  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !focusTarget || activeTab !== 'map') return;
    map.flyTo({
      center: [focusTarget.lng, focusTarget.lat],
      zoom: Math.max(map.getZoom?.() ?? 16, 16),
      duration: 1200,
      essential: true,
    });
    onFocusHandled();
  }, [focusTarget, activeTab, onFocusHandled]);

  if (!hasKey) {
    return (
      <div className="h-full w-full bg-stone-50 flex items-center justify-center p-8">
        <div className="max-w-md w-full rounded-[2rem] border border-stone-200 bg-white/92 p-8 text-center shadow-2xl backdrop-blur-xl">
          <div className="text-[11px] font-black uppercase tracking-[0.35em] text-stone-400">Tokyo Miniature Preview</div>
          <h3 className="mt-4 text-2xl font-serif text-black">MapTiler key is required</h3>
          <p className="mt-3 text-sm leading-relaxed text-stone-500">
            Cloudflare の Variables and Secrets に <code className="rounded bg-stone-100 px-2 py-1 text-[12px]">VITE_MAPTILER_KEY</code> を設定すると、
            東京の MapTiler プレビューが表示されます。
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-full w-full overflow-hidden bg-[#ebe7df]">
      <div ref={containerRef} className="h-full w-full" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0)_36%,rgba(233,229,220,0.24)_78%,rgba(231,226,216,0.62)_100%)]" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-white/66 to-transparent" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-white/42 to-transparent" />
      {runtimeError && (
        <div className="absolute inset-x-6 bottom-28 rounded-2xl border border-rose-200 bg-white/95 px-4 py-3 text-[11px] font-semibold text-rose-600 shadow-lg backdrop-blur">
          {runtimeError}
        </div>
      )}
    </div>
  );
}
