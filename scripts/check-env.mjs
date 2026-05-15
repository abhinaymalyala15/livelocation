import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const envPath = path.join(root, '.env.local');

if (!fs.existsSync(envPath)) {
  console.error('Missing .env.local — copy .env.example and add your Google Maps API key.');
  process.exit(1);
}

const content = fs.readFileSync(envPath, 'utf8');
const match = content.match(/^VITE_GOOGLE_MAPS_API_KEY=(.+)$/m);
const key = match?.[1]?.trim();

if (!key || key === 'your_google_maps_api_key') {
  console.error('VITE_GOOGLE_MAPS_API_KEY is not set in .env.local');
  process.exit(1);
}

console.log('OK: Google Maps API key is present (' + key.slice(0, 8) + '…)');
process.exit(0);
