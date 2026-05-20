# Fleet Tracking App - Setup & Configuration Guide

## 🎯 Overview

Your project has been successfully modified to:
- ✅ Remove all Base44 dependencies
- ✅ Replace Leaflet with Google Maps for better location analysis
- ✅ Use a mock API client for local development
- ✅ Keep the same UI/UX with improved mapping features

---

## 🗺️ Google Maps API Setup

### Step 1: Create a Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click **Create a new project**
3. Name it `FleetTrack` (or your preferred name)
4. Click **Create**

### Step 2: Enable Required APIs

In the Google Cloud Console:

1. Search for and enable these APIs:
   - **Maps JavaScript API** - Required for displaying maps
   - **Directions API** - Required for road-aligned trip route lines (admin & driver maps)
   - **Geocoding API** - Required for location searching (optional)
   - **Distance Matrix API** - Required for distance/duration analysis (optional)
   - **Places API** - Required for place search/autocomplete (optional)

To enable an API:
1. Go to **APIs & Services** → **Library**
2. Search for the API name
3. Click on it and click **ENABLE**

### Step 3: Create an API Key

1. Go to **APIs & Services** → **Credentials**
2. Click **+ CREATE CREDENTIALS** → **API Key**
3. Copy your API key (it will look like: `AIzaSy...abc123`)
4. Click **Close**

### Step 4: Restrict Your API Key (Recommended for Production)

1. Click on your API key from the Credentials page
2. Under **Application restrictions**, select **HTTP referrers (web sites)**
3. Add your domain (e.g., `localhost:5173` for local development)
4. Under **API restrictions**, select **Restrict key** and choose your APIs
5. Click **Save**

### Step 5: Add API Key to Your Project

1. Open `.env.local` file in your project root
2. Replace `AIzaSyDZvoW6dRwpfiAtMgWGNGTTDGrNDv0hp08` with your actual API key:

```env
VITE_GOOGLE_MAPS_API_KEY=AIzaSy_xxxxx_your_api_key_xxxxx
```

That's it! Your app will now use Google Maps.

---

## 📁 File Changes Summary

### Removed Files/Dependencies:
- ❌ `@base44/sdk` - Backend service dependency
- ❌ `@base44/vite-plugin` - Build plugin
- ❌ `react-leaflet` - Replaced with Google Maps
- ❌ `leaflet` - Replaced with Google Maps

### New Dependencies Added:
- ✅ `@react-google-maps/api` - React wrapper for Google Maps API

### Modified Files:

#### 1. **src/api/base44Client.js** (Complete Rewrite)
- Created mock API client that mimics Base44 SDK
- All entity methods (Vehicle, Trip, LocationLog, Geofence, MaintenanceLog) work locally
- Simulates real-time updates with 5-second intervals
- No network calls required - works offline

#### 2. **src/api/mockData.js** (New File)
- Contains mock vehicle, trip, location, geofence, and maintenance data
- In-memory storage that resets on page reload
- Easy to modify and extend

#### 3. **src/components/tracking/MapContainer.jsx**
- Replaced Leaflet with Google Maps
- Enhanced geofence visualization
- Better marker clustering and info windows
- Improved vehicle tracking with real-time updates

#### 4. **src/components/tracking/TripPathModal.jsx**
- Now uses Google Maps for trip path visualization
- Shows start/end markers with better styling
- Enhanced route analysis capabilities

#### 5. **.env.local** (New File)
- Template for Google Maps API key configuration
- Optional settings for map defaults (center, zoom level)

#### 6. **vite.config.js**
- Removed Base44 plugin
- Simplified configuration

#### 7. **package.json**
- Removed Base44 dependencies
- Added `@react-google-maps/api`

#### 8. **src/lib/AuthContext.jsx**
- Simplified authentication using mock auth
- Works with mock user data

---

## 🚀 Running the Application

### Prerequisites:
- Node.js (v16 or higher)
- npm (v8 or higher)

### Installation:

1. **Install dependencies** (already done):
   ```bash
   npm install
   ```

2. **Set up environment variables**:
   ```bash
   # Copy .env.local template
   # Add your Google Maps API key
   ```

3. **Start the development server**:
   ```bash
   npm run dev
   ```

4. **Open your browser**:
   - Navigate to `http://localhost:5173`
   - Login with any role (uses mock auth)

### Default Login Credentials:
Since we're using mock authentication, you can:
- Click on login (if prompted)
- The app has 2 default users:
  - **Admin**: admin@fleet.com (with admin role)
  - **Driver**: driver@fleet.com (with driver role)

---

## 🗂️ Project Structure

```
src/
├── api/
│   ├── base44Client.js      ← Mock API client (replaces Base44 SDK)
│   └── mockData.js          ← Mock database with sample data
│
├── components/
│   └── tracking/
│       ├── MapContainer.jsx ← Google Maps integration
│       └── TripPathModal.jsx ← Trip visualization
│
├── lib/
│   └── AuthContext.jsx      ← Simplified auth context
│
├── pages/
│   ├── AdminDashboard.jsx   ← Main admin interface
│   ├── AdminVehicles.jsx
│   ├── AdminTrips.jsx
│   ├── AdminGeofences.jsx
│   ├── AdminAnalytics.jsx
│   ├── AdminMaintenance.jsx
│   └── DriverDashboard.jsx
│
└── .env.local               ← Your Google Maps API key goes here
```

---

## 🔧 Using Google Maps Features

### Vehicle Tracking
- Real-time vehicle markers with status indicators
- Click markers to select and center on vehicles
- Different colors for: `on_trip` (green), `available` (blue), `offline` (gray)

### Geofence Management
- Visual circular overlays showing geofence zones
- Alert zones highlighted in red with thicker borders
- Geofence names displayed on the map

### Trip Path Visualization
- Complete route polyline shown in the Trip Path modal
- Start (green) and End (red) markers
- Multiple GPS points connected in sequence

### Location Analysis
The Google Maps API provides:
- **Distance calculation** between locations
- **Geocoding** (address to coordinates and vice versa)
- **Duration estimation** between points
- **Elevation data** for routes
- **Place searching** capabilities

---

## 📊 Mock Data & Testing

### Available Mock Data:
- **3 Vehicles**: Truck A (on_trip), Van B (on_trip), Bus C (offline)
- **2 Active Trips**: With location history
- **4 Location Logs**: With timestamps
- **2 Geofences**: Downtown Zone, Airport Zone
- **2 Maintenance Records**: Pending and completed

### Modifying Mock Data:
Edit `src/api/mockData.js` to:
- Add more vehicles
- Create sample trips
- Add geofence zones
- Pre-populate maintenance schedules

---

## 🐛 Troubleshooting

### "Google Maps API Key Not Configured"
- **Solution**: Add `VITE_GOOGLE_MAPS_API_KEY` to `.env.local`
- Check the API key is correct and not expired
- Verify APIs are enabled in Google Cloud Console

### Maps Not Displaying
- Check browser console for errors
- Verify API key has `Maps JavaScript API` enabled
- Check domain restrictions if set

### Build Errors After npm install
- Delete `node_modules` folder: `rm -r node_modules`
- Delete lock file: `rm package-lock.json`
- Reinstall: `npm install`

### Mock API Returns 401 Errors
- This is expected behavior when testing auth flows
- The mock client is set to authenticated by default
- Check `src/api/base44Client.js` for auth state

---

## 📈 Next Steps & Enhancements

### To Connect to a Real Backend:
1. Create a backend API (Express.js, Django, etc.)
2. Replace mock API calls with actual HTTP requests
3. Update `src/api/base44Client.js` to make fetch/axios calls

### To Enhance Google Maps Integration:
1. Add **Traffic Layer**: Show real-time traffic conditions
2. Add **Heatmaps**: Visualize vehicle density and routes
3. Add **Directions API**: Generate optimal routes
4. Add **Street View**: Preview locations
5. Add **Marker Clustering**: Group nearby vehicles
6. Add **Custom Overlays**: Add photos, temperature, speed graphs

### To Add More Features:
- Real-time vehicle tracking with WebSocket
- Geofence alerts via notifications
- Historical trip analysis and reports
- Driver behavior scoring
- Fuel consumption tracking
- Maintenance reminders

---

## 🔗 Useful Links

- [Google Maps API Documentation](https://developers.google.com/maps)
- [Google Maps JavaScript API Reference](https://developers.google.com/maps/documentation/javascript)
- [React Google Maps Library](https://react-google-maps-api-docs.netlify.app/)
- [Google Cloud Console](https://console.cloud.google.com/)

---

## ✅ Verification Checklist

Before running the app, make sure:
- [ ] `.env.local` file exists with `VITE_GOOGLE_MAPS_API_KEY`
- [ ] Google Maps API key is valid and not expired
- [ ] Required Google APIs are enabled (Maps JavaScript API minimum)
- [ ] Node.js and npm are installed
- [ ] `npm install` completed without errors
- [ ] Port 5173 is available (or configure in vite.config.js)

---

## 💡 Tips & Tricks

1. **Testing Location Analysis**:
   - Use Google Maps' Geocoding to get real coordinates
   - Update mock data with real locations
   - Test distance/duration calculations

2. **Improving Performance**:
   - Reduce mock subscription interval (default: 5s)
   - Implement marker clustering for many vehicles
   - Use memoization for location calculations

3. **Development Workflow**:
   - Use React DevTools to inspect component state
   - Check Network tab in browser DevTools for mock API responses
   - Use Console to debug location calculations

---

## 📞 Support

If you encounter any issues:
1. Check the Troubleshooting section above
2. Review browser console for error messages
3. Check that all files are saved after edits
4. Verify .env.local is in the project root (not in src/)
5. Clear browser cache if seeing old errors
