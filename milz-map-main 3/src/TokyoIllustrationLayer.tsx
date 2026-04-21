import { useMemo, useState } from 'react';
import { Circle, ImageOverlay, Pane, Polyline, Rectangle, useMap, useMapEvents } from 'react-leaflet';
import { TOKYO_ILLUSTRATION_THEME } from './illustrationMaps';

const TOKYO_PRIMARY_ROUTE: [number, number][] = [
  [35.6938, 139.7034],
  [35.6896, 139.7304],
  [35.6907, 139.7495],
  [35.6812, 139.7671],
  [35.6762, 139.7603],
  [35.6717, 139.765],
  [35.666, 139.7708],
  [35.655, 139.7953],
];

const TOKYO_SECONDARY_ROUTE: [number, number][] = [
  [35.6595, 139.7005],
  [35.6655, 139.7293],
  [35.668, 139.7414],
  [35.6639, 139.758],
  [35.658, 139.7782],
  [35.6274, 139.7768],
];

const TOKYO_NORTHERN_ROUTE: [number, number][] = [
  [35.7138, 139.777],
  [35.7061, 139.7745],
  [35.6942, 139.7679],
  [35.6812, 139.7671],
  [35.6735, 139.7638],
  [35.6678, 139.7941],
  [35.6274, 139.7768],
];

const TOKYO_PARKS = [
  { center: [35.6852, 139.7528] as [number, number], radius: 1200 },
  { center: [35.6727, 139.6949] as [number, number], radius: 980 },
  { center: [35.7156, 139.7745] as [number, number], radius: 820 },
  { center: [35.6254, 139.7757] as [number, number], radius: 720 },
];

const TOKYO_WATER = [
  { center: [35.659, 139.779] as [number, number], radius: 1600 },
  { center: [35.628, 139.788] as [number, number], radius: 1800 },
];

const TOKYO_DISTRICT_MASS_URL = svgToDataUri(`
<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="1200" viewBox="0 0 1600 1200">
  <defs>
    <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="18" stdDeviation="16" flood-color="#24312c" flood-opacity="0.12"/>
    </filter>
    <linearGradient id="topStone" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#f2ead8"/>
      <stop offset="100%" stop-color="#e4dcc8"/>
    </linearGradient>
    <linearGradient id="topSage" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#dbe4cf"/>
      <stop offset="100%" stop-color="#c8d5bf"/>
    </linearGradient>
    <linearGradient id="topSlate" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#d7e3e4"/>
      <stop offset="100%" stop-color="#c2d1d2"/>
    </linearGradient>
  </defs>

  <g filter="url(#shadow)" opacity="0.78">
    <g transform="translate(300 420)">
      ${renderCluster('#e6d9bf', '#cabf9f', '#b4aa8e')}
    </g>
    <g transform="translate(540 505) scale(1.1)">
      ${renderCluster('#d0ddc3', '#b8c8ab', '#93a98b')}
    </g>
    <g transform="translate(760 445) scale(1.08)">
      ${renderCluster('#d7e1e2', '#c1cfd0', '#92a6aa')}
    </g>
    <g transform="translate(1015 610) scale(0.95)">
      ${renderCluster('#ead5bd', '#d8bea1', '#b6987c')}
    </g>
    <g transform="translate(1040 300) scale(0.92)">
      ${renderCluster('#d8e2ce', '#c0cfb5', '#98ac8e')}
    </g>
    <g transform="translate(350 740) scale(0.9)">
      ${renderCluster('#d7e1e2', '#c1cfd0', '#92a6aa')}
    </g>
  </g>
</svg>`);

const TOKYO_WASH_URL = svgToDataUri(`
<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="1200" viewBox="0 0 1600 1200">
  <defs>
    <filter id="blur1" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="48" />
    </filter>
    <pattern id="paper" width="160" height="160" patternUnits="userSpaceOnUse">
      <circle cx="22" cy="30" r="2" fill="#ffffff" fill-opacity="0.28"/>
      <circle cx="116" cy="78" r="1.6" fill="#20312c" fill-opacity="0.05"/>
      <circle cx="62" cy="126" r="1.5" fill="#ffffff" fill-opacity="0.16"/>
      <circle cx="136" cy="140" r="1.1" fill="#20312c" fill-opacity="0.04"/>
    </pattern>
  </defs>
  <rect width="1600" height="1200" fill="#f6f3ea" fill-opacity="0.16"/>
  <rect width="1600" height="1200" fill="url(#paper)" opacity="0.95"/>
  <g filter="url(#blur1)" opacity="0.34">
    <ellipse cx="340" cy="250" rx="240" ry="160" fill="#bfd6d8"/>
    <ellipse cx="1190" cy="300" rx="260" ry="180" fill="#c2d7b0"/>
    <ellipse cx="520" cy="840" rx="300" ry="190" fill="#ead19d"/>
    <ellipse cx="1220" cy="860" rx="330" ry="220" fill="#bfd6d8"/>
  </g>
  <g opacity="0.28">
    <path d="M210 375 C 420 290, 615 315, 790 390 S 1135 515, 1385 470" fill="none" stroke="#dd9d37" stroke-width="56" stroke-linecap="round"/>
    <path d="M245 710 C 455 610, 610 615, 815 670 S 1135 790, 1360 708" fill="none" stroke="#90b2be" stroke-width="62" stroke-linecap="round"/>
  </g>
</svg>`);

function renderCluster(top: string, side: string, shadow: string) {
  const blocks = [
    { x: 0, y: 42, w: 86, h: 42, d: 20 },
    { x: 92, y: 14, w: 74, h: 36, d: 18 },
    { x: 170, y: 60, w: 66, h: 32, d: 16 },
    { x: 60, y: 86, w: 108, h: 50, d: 22 },
    { x: 190, y: 102, w: 58, h: 28, d: 14 },
    { x: 145, y: -18, w: 42, h: 70, d: 18 },
  ];

  return blocks
    .map(({ x, y, w, h, d }) => {
      const topPoly = `${x},${y} ${x + w},${y} ${x + w + d},${y + d} ${x + d},${y + d}`;
      const rightPoly = `${x + w},${y} ${x + w + d},${y + d} ${x + w + d},${y + h + d} ${x + w},${y + h}`;
      const frontPoly = `${x},${y} ${x + d},${y + d} ${x + d},${y + h + d} ${x},${y + h}`;
      return `
        <polygon points="${frontPoly}" fill="${side}" opacity="0.92"/>
        <polygon points="${rightPoly}" fill="${shadow}" opacity="0.92"/>
        <polygon points="${topPoly}" fill="${top}" opacity="0.96"/>
      `;
    })
    .join('');
}

function svgToDataUri(svg: string) {
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg.replace(/\s+/g, ' ').trim())}`;
}

export default function TokyoIllustrationLayer() {
  const map = useMap();
  const [zoom, setZoom] = useState(map.getZoom());

  useMapEvents({
    zoomend() {
      setZoom(map.getZoom());
    },
    moveend() {
      setZoom(map.getZoom());
    },
  });

  const routeConfig = useMemo(() => {
    if (zoom >= 14.8) {
      return {
        showMasses: false,
        washOpacity: 0.11,
        primaryWeight: 7,
        secondaryWeight: 5,
        routeOpacity: 0.22,
        parkOpacity: 0.08,
        waterOpacity: 0.1,
        massOpacity: 0,
      };
    }

    if (zoom >= 13.2) {
      return {
        showMasses: true,
        washOpacity: 0.15,
        primaryWeight: 8,
        secondaryWeight: 6,
        routeOpacity: 0.32,
        parkOpacity: 0.11,
        waterOpacity: 0.12,
        massOpacity: 0.2,
      };
    }

    return {
      showMasses: true,
      washOpacity: 0.22,
      primaryWeight: 10,
      secondaryWeight: 7,
      routeOpacity: 0.42,
      parkOpacity: 0.14,
      waterOpacity: 0.16,
      massOpacity: 0.34,
    };
  }, [zoom]);

  return (
    <>
      <Pane name="tokyo-base-wash-pane" style={{ zIndex: 205, pointerEvents: 'none', mixBlendMode: 'multiply' }}>
        <Rectangle
          bounds={TOKYO_ILLUSTRATION_THEME.bounds}
          pathOptions={{
            stroke: false,
            fillColor: TOKYO_ILLUSTRATION_THEME.palette.wash,
            fillOpacity: zoom >= 14.8 ? 0.05 : 0.08,
          }}
        />
        <ImageOverlay url={TOKYO_WASH_URL} bounds={TOKYO_ILLUSTRATION_THEME.bounds} opacity={routeConfig.washOpacity} />
      </Pane>

      <Pane name="tokyo-water-pane" style={{ zIndex: 214, pointerEvents: 'none' }}>
        {TOKYO_WATER.map((water, index) => (
          <Circle
            key={`water-${index}`}
            center={water.center}
            radius={water.radius}
            pathOptions={{
              color: TOKYO_ILLUSTRATION_THEME.palette.water,
              weight: 0,
              fillColor: TOKYO_ILLUSTRATION_THEME.palette.water,
              fillOpacity: routeConfig.waterOpacity,
            }}
          />
        ))}
      </Pane>

      <Pane name="tokyo-park-pane" style={{ zIndex: 220, pointerEvents: 'none' }}>
        {TOKYO_PARKS.map((park, index) => (
          <Circle
            key={`park-${index}`}
            center={park.center}
            radius={park.radius}
            pathOptions={{
              color: TOKYO_ILLUSTRATION_THEME.palette.park,
              weight: 0,
              fillColor: TOKYO_ILLUSTRATION_THEME.palette.park,
              fillOpacity: routeConfig.parkOpacity,
            }}
          />
        ))}
      </Pane>

      {routeConfig.showMasses && (
        <Pane name="tokyo-mass-pane" style={{ zIndex: 240, pointerEvents: 'none', mixBlendMode: 'multiply' }}>
          <ImageOverlay url={TOKYO_DISTRICT_MASS_URL} bounds={TOKYO_ILLUSTRATION_THEME.bounds} opacity={routeConfig.massOpacity} />
        </Pane>
      )}

      <Pane name="tokyo-route-pane" style={{ zIndex: 250, pointerEvents: 'none' }}>
        <Polyline
          positions={TOKYO_PRIMARY_ROUTE}
          pathOptions={{
            color: TOKYO_ILLUSTRATION_THEME.palette.routePrimary,
            weight: routeConfig.primaryWeight,
            opacity: routeConfig.routeOpacity,
            lineCap: 'round',
            lineJoin: 'round',
          }}
        />
        <Polyline
          positions={TOKYO_SECONDARY_ROUTE}
          pathOptions={{
            color: TOKYO_ILLUSTRATION_THEME.palette.routeSecondary,
            weight: routeConfig.secondaryWeight,
            opacity: routeConfig.routeOpacity * 0.9,
            lineCap: 'round',
            lineJoin: 'round',
          }}
        />
        <Polyline
          positions={TOKYO_NORTHERN_ROUTE}
          pathOptions={{
            color: '#a8c9d3',
            weight: Math.max(4, routeConfig.secondaryWeight - 1),
            opacity: routeConfig.routeOpacity * 0.72,
            lineCap: 'round',
            lineJoin: 'round',
            dashArray: zoom >= 14.8 ? '2 10' : '4 14',
          }}
        />
      </Pane>
    </>
  );
}
