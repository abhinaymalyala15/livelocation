import { getGoogleMapsConfigStatus } from '@/lib/env';

export default function MapsUnavailable({ className = 'h-full w-full' }) {
  const status = getGoogleMapsConfigStatus();
  return (
    <div className={`rounded-xl flex items-center justify-center bg-muted/50 border border-dashed ${className}`}>
      <div className="text-center p-6 max-w-sm">
        <p className="font-semibold text-foreground mb-1">Google Maps not configured</p>
        <p className="text-sm text-muted-foreground">{status.message}</p>
        <p className="text-xs text-muted-foreground mt-2">
          Add <code className="bg-muted px-1 rounded">VITE_GOOGLE_MAPS_API_KEY</code> to <code className="bg-muted px-1 rounded">.env.local</code>
        </p>
      </div>
    </div>
  );
}
