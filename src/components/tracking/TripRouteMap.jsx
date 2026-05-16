import { useEffect, useRef, useCallback } from 'react';
import { GoogleMap, Polyline, Marker } from '@react-google-maps/api';
import { Route, MapPin } from 'lucide-react';
import moment from 'moment';
import { useGoogleMaps } from '@/components/GoogleMapsProvider';
import { defaultMapCenter } from '@/lib/mapConfig';
import useTripRoutePath from '@/hooks/useTripRoutePath';
import useRoutePlayback from '@/hooks/useRoutePlayback';
import MapsUnavailable from './MapsUnavailable';
import Loader from './Loader';
import AnimatedVehicleMarker from './AnimatedVehicleMarker';
import RoutePlaybackControls from './RoutePlaybackControls';

const mapContainerStyle = {
  width: '100%',
  height: '100%',
  minHeight: '320px',
  borderRadius: '12px',
};

const pinPath =
  'M12.5,0C7,0 2.86,4.19 2.86,9.42C2.86,15.8 12.5,27.5 12.5,27.5C12.5,27.5 22.14,15.8 22.14,9.42C22.14,4.19 18,0 12.5,0ZM12.5,11.7C10.3,11.7 8.5,9.9 8.5,7.7C8.5,5.5 10.3,3.7 12.5,3.7C14.7,3.7 16.5,5.5 16.5,7.7C16.5,9.9 14.7,11.7 12.5,11.7Z';

const startIcon = {
  path: pinPath,
  fillColor: '#10b981',
  fillOpacity: 1,
  strokeColor: '#ffffff',
  strokeWeight: 2,
  scale: 1,
  anchor: { x: 12, y: 24 },
};

const endIcon = { ...startIcon, fillColor: '#ef4444' };

const playbackIcon = {
  path: pinPath,
  fillColor: '#0ea5e9',
  fillOpacity: 1,
  strokeColor: '#ffffff',
  strokeWeight: 2,
  scale: 1.25,
  anchor: { x: 12, y: 24 },
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

  const playback = useRoutePlayback(path);
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
      if (!map || path.length === 0 || !window.google?.maps) return;
      const bounds = new window.google.maps.LatLngBounds();
      path.forEach((p) => bounds.extend(p));
      map.fitBounds(bounds, { top: 56, right: 48, bottom: 80, left: 48 });
    },
    [path]
  );

  const handleMapLoad = useCallback(
    (map) => {
      mapRef.current = map;
      fitRoute(map);
    },
    [fitRoute]
  );

  useEffect(() => {
    if (mapRef.current && path.length > 0) fitRoute(mapRef.current);
  }, [path, fitRoute]);

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
  const startPoint = path[0];
  const endPoint = path.length > 1 ? path[path.length - 1] : null;
  const showEndMarker = Boolean(endPoint) && !playing;
  const displayPath = playing || playbackPercent > 0 ? visiblePath : path;
  const mapCenter =
    currentPosition ??
    (path.length > 0
      ? { lat: path[Math.floor(path.length / 2)].lat, lng: path[Math.floor(path.length / 2)].lng }
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
              mapTypeControl: true,
              streetViewControl: false,
              fullscreenControl: true,
              zoomControl: true,
            }}
          >
            {path.length > 1 && (
              <Polyline
                path={path}
                options={{
                  strokeColor: '#94a3b8',
                  strokeOpacity: 0.35,
                  strokeWeight: 5,
                  geodesic: true,
                }}
              />
            )}

            {displayPath.length > 1 && (
              <Polyline
                path={displayPath}
                options={{
                  strokeColor: isActive ? '#0ea5e9' : '#10b981',
                  strokeOpacity: 0.95,
                  strokeWeight: 5,
                  geodesic: true,
                }}
              />
            )}

            {startPoint && (
              <Marker
                position={startPoint}
                title={`Start: ${trip.start_location || 'Departure'}`}
                icon={startIcon}
                label={{ text: 'START', color: '#fff', fontSize: '10px', fontWeight: 'bold' }}
              />
            )}

            {showEndMarker && endPoint && (
              <Marker
                position={endPoint}
                title={`End: ${trip.end_location || 'Arrival'}`}
                icon={endIcon}
                label={{ text: 'END', color: '#fff', fontSize: '10px', fontWeight: 'bold' }}
              />
            )}

            {currentPosition && (playing || playbackPercent > 0) && (
              <AnimatedVehicleMarker
                position={currentPosition}
                icon={playbackIcon}
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
