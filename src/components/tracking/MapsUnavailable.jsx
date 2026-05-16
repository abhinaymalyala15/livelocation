import { getGoogleMapsConfigStatus } from '@/lib/env';
import { env } from '@/lib/env';

export default function MapsUnavailable({ className = 'h-full w-full' }) {
  const status = getGoogleMapsConfigStatus();

  return (
    <div className={`rounded-xl flex items-center justify-center bg-muted/50 border border-dashed ${className}`}>
      <div className="text-center p-6 max-w-md space-y-3">
        <p className="font-semibold text-foreground">Google Maps not configured</p>
        <p className="text-sm text-muted-foreground">{status.message}</p>
        <div className="text-left text-xs text-muted-foreground bg-muted/60 rounded-lg p-3 space-y-2">
          <p className="font-medium text-foreground">Checklist</p>
          <ol className="list-decimal list-inside space-y-1">
            <li>
              File: <code className="bg-muted px-1 rounded">tracking-base44/.env.local</code> (project root)
            </li>
            <li>
              Line: <code className="bg-muted px-1 rounded">VITE_GOOGLE_MAPS_API_KEY=your_key</code> (no spaces around
              <code className="bg-muted px-1 rounded">=</code>)
            </li>
            <li>Stop the dev server (Ctrl+C), then run <code className="bg-muted px-1 rounded">npm run dev</code> again</li>
            <li>Run from the folder that contains <code className="bg-muted px-1 rounded">package.json</code> and{' '}
              <code className="bg-muted px-1 rounded">src/</code>
            </li>
          </ol>
        </div>
        {env.isDev && (
          <p className="text-[10px] text-muted-foreground/80">
            Dev hint: key detected in Node = run <code className="bg-muted px-1 rounded">npm run env:check</code>
          </p>
        )}
      </div>
    </div>
  );
}
