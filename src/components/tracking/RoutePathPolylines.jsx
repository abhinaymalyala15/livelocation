import { Polyline } from "@react-google-maps/api";

/**
 * Road-aligned route with optional faint GPS breadcrumb underneath.
 */
export default function RoutePathPolylines({
  path,
  rawPath,
  showRawGhost = false,
  color = "#10b981",
}) {
  if (!path || path.length < 2) return null;

  return (
    <>
      {showRawGhost && rawPath?.length > 1 && (
        <Polyline
          path={rawPath}
          options={{
            strokeColor: color,
            strokeOpacity: 0.12,
            strokeWeight: 4,
            geodesic: false,
            zIndex: 1,
          }}
        />
      )}
      <Polyline
        path={path}
        options={{
          strokeColor: color,
          strokeOpacity: 0.25,
          strokeWeight: 6,
          geodesic: false,
          zIndex: 2,
        }}
      />
      <Polyline
        path={path}
        options={{
          strokeColor: color,
          strokeOpacity: 0.92,
          strokeWeight: 3,
          geodesic: false,
          zIndex: 3,
        }}
      />
    </>
  );
}
