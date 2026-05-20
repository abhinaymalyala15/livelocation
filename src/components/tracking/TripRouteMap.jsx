import { useEffect, useRef, useCallback } from 'react';
import { GoogleMap, Polyline, Marker } from '@react-google-maps/api';
import { Route, MapPin } from 'lucide-react';
import moment from 'moment';
import { useGoogleMaps } from '@/components/GoogleMapsProvider';
import { defaultMapCenter, defaultMapOptions, triggerMapResize } from '@/lib/mapConfig';
import useTripRoutePath from '@/hooks/useTripRoutePath';
import useRoadSnappedPath from '@/hooks/useRoadSnappedPath';
import useRoutePlayback from '@/hooks/useRoutePlayback';
import RoutePathPolylines from '@/components/tracking/RoutePathPolylines';
import MapsUnavailable from './MapsUnavailable';
import Loader from './Loader';
import AnimatedVehicleMarker from './AnimatedVehicleMarker';
import RoutePlaybackControls from './RoutePlaybackControls';
import { getRouteEndpointIcon, getPlaybackVehicleIcon } from '@/lib/vehicleMapMarker';

const mapContainerStyle = {
  width: '100%',
  height: '100%',
  minHeight: '320px',
  borderRadius: '12px',
};

function getDuration(trip) {
  if (!trip?.start_time) return '—';
  if (trip.status === 'active') return 'In progress';
  if (!trip.end_time) return '—';
  const diff = moment.duration(moment(trip.end_time).diff(moment(trip.start_time)));
  const h = Math.floor(diff.asHours());
  const m = diff.minutes();
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

export default function TripRouteMap({ trip, className = '' }) {
  const mapRef = useRef(null);
  const { isLoaded, isConfigured } = useGoogleMaps();
  const { path, loading, pointCount } = useTripRoutePath(trip);
  const { displayPath: roadPath, rawPath, isSnapped } = useRoadSnappedPath(path, {
    enabled: path.length > 1,
    debounceMs: 400,
  });
  const routePath = roadPath.length > 1 ? roadPath : path;

  const playback = useRoutePlayback(routePath);
  const {
    playing,
    play,
    pause,
    reset,
    seek,
    speed,
    setSpeed,
    currentPosition,
    visiblePath,
    playbackPercent,
    currentPointIndex,
  } = playback;

  const fitRoute = useCallback(
    (map) => {
      if (!map || routePath.length === 0 || !window.google?.maps) return;
      const bounds = new window.google.maps.LatLngBounds();
      routePath.forEach((p) => bounds.extend(p));
      map.fitBounds(bounds, { top: 56, right: 48, bottom: 80, left: 48 });
    },
    [routePath]
  );

  const handleMapLoad = useCallback(
    (map) => {
      mapRef.current = map;
      triggerMapResize(map);
      fitRoute(map);
      requestAnimationFrame(() => triggerMapResize(map));
    },
    [fitRoute]
  );

  useEffect(() => {
    if (mapRef.current && routePath.length > 0) fitRoute(mapRef.current);
  }, [routePath, fitRoute]);

  useEffect(() => {
    reset();
  }, [trip?.id, reset]);

  useEffect(() => {
    if (!mapRef.current || !currentPosition || !playing) return;
    mapRef.current.panTo({ lat: currentPosition.lat, lng: currentPosition.lng });
  }, [currentPosition?.lat, currentPosition?.lng, playing]);

  if (!trip) {
    return (
      <div className={`flex flex-col items-center justify-center bg-muted/30 border border-dashed rounded-xl min-h-[280px] ${className}`}>
        <Route className="h-10 w-10 text-muted-foreground/40 mb-2" />
        <p className="text-sm text-muted-foreground">Select a trip to view the full route</p>
        <p className="text-xs text-muted-foreground/80 mt-1">Use playback to replay the journey</p>
      </div>
    );
  }

  const distanceKm = trip.distance_km ?? trip.distance;
  const isActive = trip.status === 'active';
  const startPoint = routePath[0];
  const endPoint = routePath.length > 1 ? routePath[routePath.length - 1] : null;
  const showEndMarker = Boolean(endPoint) && !playing;
  const playbackPath = playing || playbackPercent > 0 ? visiblePath : null;
  const mapCenter =
    currentPosition ??
    (routePath.length > 0
      ? {
          lat: routePath[Math.floor(routePath.length / 2)].lat,
          lng: routePath[Math.floor(routePath.length / 2)].lng,
        }
      : defaultMapCenter);

  return (
    <div className={`flex flex-col gap-3 ${className}`}>
      <div className="flex flex-wrap items-start justify-between gap-2 px-1">
        <div>
          <h3 className="font-semibold text-sm flex items-center gap-2">
            <Route className="h-4 w-4 text-primary" />
            {trip.vehicle_name || 'Vehicle'} — {trip.start_location || 'Start'} →{' '}
            {trip.end_location || trip.destination || 'End'}
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            {trip.driver_name || '—'} · {getDuration(trip)}
            {distanceKm != null && ` · ${Number(distanceKm).toFixed(2)} km`}
          </p>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-muted/60 px-2 py-1 rounded-md">
          <MapPin className="h-3.5 w-3.5" />
          {pointCount} GPS point{pointCount !== 1 ? 's' : ''}
        </div>
      </div>

      <div className="relative flex-1 min-h-[320px] lg:min-h-[400px] rounded-xl overflow-hidden border bg-muted/20">
        {loading && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/80">
            <Loader text="Loading route..." />
          </div>
        )}

        {!loading && path.length === 0 && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground gap-2 p-4 text-center">
            <Route className="h-10 w-10 opacity-30" />
            <p className="text-sm font-medium">No route data for this trip</p>
          </div>
        )}

        {!loading && path.length > 0 && !isConfigured && (
          <MapsUnavailable className="h-full min-h-[320px]" />
        )}
        {!loading && path.length > 0 && isConfigured && !isLoaded && (
          <Loader text="Loading map..." className="h-full min-h-[320px]" />
        )}

        {!loading && path.length > 0 && isConfigured && isLoaded && (
          <GoogleMap
            mapContainerStyle={mapContainerStyle}
            center={mapCenter}
            zoom={12}
            onLoad={handleMapLoad}
            options={{
              ...defaultMapOptions,
              gestureHandling: 'greedy',
            }}
          >
            {!playbackPath && (
              <RoutePathPolylines
                path={routePath}
                rawPath={rawPath}
                showRawGhost={isSnapped && rawPath.length > 1}
                color={isActive ? '#0ea5e9' : '#10b981'}
              />
            )}

            {playbackPath && playbackPath.length > 1 && (
              <Polyline
                path={playbackPath}
                options={{
                  strokeColor: isActive ? '#0ea5e9' : '#10b981',
                  strokeOpacity: 0.95,
                  strokeWeight: 5,
                  geodesic: false,
                }}
              />
            )}

            {startPoint && (
              <Marker
                position={startPoint}
                title={`Start: ${trip.start_location || 'Departure'}`}
                icon={getRouteEndpointIcon("start")}
              />
            )}

            {showEndMarker && endPoint && (
              <Marker
                position={endPoint}
                title={`End: ${trip.end_location || 'Arrival'}`}
                icon={getRouteEndpointIcon("end")}
              />
            )}

            {currentPosition && (playing || playbackPercent > 0) && (
              <AnimatedVehicleMarker
                position={currentPosition}
                icon={getPlaybackVehicleIcon()}
                title="Playback position"
                zIndex={2000}
              />
            )}
          </GoogleMap>
        )}
      </div>

      {!loading && path.length >= 2 && (
        <RoutePlaybackControls
          playing={playing}
          onPlay={play}
          onPause={pause}
          onReset={reset}
          playbackPercent={playbackPercent}
          onSeek={seek}
          speed={speed}
          onSpeedChange={setSpeed}
          currentPointIndex={currentPointIndex}
          pointCount={pointCount}
          currentTimestamp={currentPosition?.timestamp}
        />
      )}

      {!loading && path.length > 0 && (
        <div className="flex flex-wrap gap-4 text-xs text-muted-foreground px-1">
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
            Start {trip.start_time ? moment(trip.start_time).format('MMM D, HH:mm') : ''}
          </span>
          {trip.end_time && (
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-red-500" />
              End {moment(trip.end_time).format('MMM D, HH:mm')}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
