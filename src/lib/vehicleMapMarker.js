import { resolveVehicleStatus, statusColors } from "@/lib/vehicleStatus";

const iconCache = new Map();

/** Status ring colors aligned with fleet dashboard */
const STATUS_RING = {
  moving: statusColors.moving.marker,
  idle: statusColors.idle.marker,
  offline: statusColors.offline.marker,
  maintenance: statusColors.maintenance.marker,
};

function headingBucket(heading) {
  return Math.round((Number(heading) || 0) / 12) * 12;
}

/**
 * Top-down fleet marker: status ring + white disc + vehicle silhouette.
 * Moving vehicles show a directional chevron; selected vehicles get a teal focus ring.
 */
function buildMarkerSvg({ ringColor, selected, moving, heading, driver }) {
  const accent = driver ? "#0d9488" : "#0f766e";
  const ring = ringColor || STATUS_RING.offline;
  const rot = moving || driver ? headingBucket(heading) : 0;

  const focusRing = selected
    ? `<circle cx="24" cy="24" r="22.5" fill="none" stroke="${accent}" stroke-width="2.5" opacity="0.95"/>
       <circle cx="24" cy="24" r="20" fill="none" stroke="${accent}" stroke-width="1" opacity="0.35"/>`
    : "";

  const direction =
    moving || driver
      ? `<g transform="rotate(${rot} 24 24)">
           <path d="M24 5 L29.5 14.5 L18.5 14.5 Z" fill="${ring}" stroke="#fff" stroke-width="1.25" stroke-linejoin="round"/>
         </g>`
      : "";

  const bodyFill = driver ? "#134e4a" : "#1e293b";
  const glass = driver ? "#5eead4" : "#94a3b8";

  return `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48" role="img">
    <defs>
      <filter id="vm-shadow" x="-30%" y="-30%" width="160%" height="160%">
        <feDropShadow dx="0" dy="1.5" stdDeviation="1.8" flood-color="#0f172a" flood-opacity="0.28"/>
      </filter>
    </defs>
    ${focusRing}
    <g filter="url(#vm-shadow)">
      <circle cx="24" cy="24" r="16.5" fill="${ring}" stroke="#ffffff" stroke-width="2.75"/>
      <circle cx="24" cy="24" r="12.5" fill="#ffffff"/>
    </g>
    ${direction}
    <g transform="translate(24 24) rotate(${rot})">
      <path
        d="M-7.5 -10.5h15a2.8 2.8 0 0 1 2.8 2.8v7.2a1.8 1.8 0 0 1-1.8 1.8h-1.2l-1.2 2.2h-3.2l-1.2-2.2h-1.2a1.8 1.8 0 0 1-1.8-1.8v-7.2a2.8 2.8 0 0 1 2.8-2.8z"
        fill="${bodyFill}"
      />
      <path d="M-5.5 -7.5h11v4.5h-11z" fill="${glass}" opacity="0.92"/>
      <circle cx="-5.5" cy="8.5" r="2.35" fill="#0f172a"/>
      <circle cx="5.5" cy="8.5" r="2.35" fill="#0f172a"/>
      <circle cx="-5.5" cy="8.5" r="1.1" fill="#64748b"/>
      <circle cx="5.5" cy="8.5" r="1.1" fill="#64748b"/>
    </g>
  </svg>`;
}

/**
 * Google Maps icon descriptor for fleet vehicles (admin live map).
 */
export function getVehicleMapMarkerIcon(vehicle, { selected = false, driver = false } = {}) {
  if (!window.google?.maps) return undefined;

  const status = driver ? "moving" : resolveVehicleStatus(vehicle, { live: true });
  const moving = status === "moving" || driver;
  const heading = vehicle?.heading ?? 0;
  const ringColor = driver ? "#0d9488" : STATUS_RING[status] || STATUS_RING.offline;
  const size = selected ? 52 : 44;

  const key = `${status}|${selected}|${driver}|${moving ? headingBucket(heading) : "s"}`;
  if (!iconCache.has(key)) {
    const svg = buildMarkerSvg({
      ringColor,
      selected,
      moving,
      heading,
      driver,
    });
    iconCache.set(key, {
      url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`,
      scaledSize: new window.google.maps.Size(size, size),
      anchor: new window.google.maps.Point(size / 2, size / 2),
    });
  }

  return iconCache.get(key);
}

/** Start / end pins for trip playback (not teardrop pins). */
export function getRouteEndpointIcon(type) {
  if (!window.google?.maps) return undefined;

  const isEnd = type === "end";
  const color = isEnd ? "#dc2626" : "#16a34a";
  const label = isEnd ? "E" : "S";
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 36 36">
    <circle cx="18" cy="18" r="15" fill="${color}" stroke="#fff" stroke-width="2.5"/>
    <text x="18" y="18" text-anchor="middle" dominant-baseline="central"
      font-family="system-ui,sans-serif" font-size="13" font-weight="700" fill="#fff">${label}</text>
  </svg>`;

  return {
    url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`,
    scaledSize: new window.google.maps.Size(36, 36),
    anchor: new window.google.maps.Point(18, 18),
  };
}

export function getPlaybackVehicleIcon() {
  if (!window.google?.maps) return undefined;
  const svg = buildMarkerSvg({
    ringColor: "#0284c7",
    selected: true,
    moving: true,
    heading: 0,
    driver: false,
  });
  return {
    url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`,
    scaledSize: new window.google.maps.Size(48, 48),
    anchor: new window.google.maps.Point(24, 24),
  };
}
