// Mock API Client - Replaces Base44 SDK
import { getStorageData, mockUsers } from './mockData';
import { normalizeVehicle, normalizeVehicles } from '@/lib/normalizeVehicle';

// Simulate network delay
const delay = (ms = 300) => new Promise(resolve => setTimeout(resolve, ms));

const sortList = (items, sortBy, limit) => {
  const list = Array.isArray(items) ? [...items] : [];
  if (sortBy) {
    const desc = String(sortBy).startsWith('-');
    const field = desc ? String(sortBy).slice(1) : String(sortBy);
    list.sort((a, b) => {
      const av = a[field];
      const bv = b[field];
      if (av == null && bv == null) return 0;
      if (av == null) return 1;
      if (bv == null) return -1;
      if (field.includes('date') || field.includes('time')) {
        return desc
          ? new Date(bv) - new Date(av)
          : new Date(av) - new Date(bv);
      }
      if (av < bv) return desc ? 1 : -1;
      if (av > bv) return desc ? -1 : 1;
      return 0;
    });
  }
  if (limit != null) return list.slice(0, limit);
  return list;
};

// Mock authentication — start logged out for submission demo (login required)
let currentUser = null;
let isAuthenticated = false;

const mockApiClient = {
  // Auth methods
  auth: {
    me: async () => {
      await delay();
      if (!isAuthenticated || !currentUser) {
        throw { status: 401, message: 'Not authenticated' };
      }
      return { ...currentUser };
    },
    
    login: async (email, password) => {
      await delay();
      const user = mockUsers.find(u => u.email === email);
      if (!user) {
        throw { status: 401, message: 'Invalid credentials' };
      }
      currentUser = user;
      isAuthenticated = true;
      return { ...user };
    },
    
    logout: async () => {
      await delay();
      currentUser = null;
      isAuthenticated = false;
    },
    
    redirectToLogin: (returnUrl) => {
      window.location.href = `/login?return=${encodeURIComponent(returnUrl)}`;
    },
  },

  // Vehicle entity methods
  entities: {
    Vehicle: {
      list: async (sortBy, limit) => {
        await delay();
        return normalizeVehicles(sortList(getStorageData().vehicles, sortBy, limit));
      },
      
      filter: async (query = {}) => {
        await delay();
        let results = getStorageData().vehicles;
        Object.keys(query).forEach(key => {
          results = results.filter(item => item[key] === query[key]);
        });
        return normalizeVehicles(results);
      },
      
      get: async (id) => {
        await delay();
        const v = getStorageData().vehicles.find(veh => veh.id === id);
        return normalizeVehicle(v);
      },
      
      create: async (data) => {
        await delay();
        const newVehicle = {
          id: 'vehicle_' + Date.now(),
          ...data,
          created_date: new Date().toISOString(),
          updated_date: new Date().toISOString(),
        };
        getStorageData().vehicles.push(newVehicle);
        return newVehicle;
      },
      
      update: async (id, data) => {
        await delay();
        const vehicles = getStorageData().vehicles;
        const idx = vehicles.findIndex(v => v.id === id);
        if (idx === -1) throw { status: 404, message: 'Vehicle not found' };
        vehicles[idx] = { ...vehicles[idx], ...data, updated_date: new Date().toISOString() };
        return vehicles[idx];
      },
      
      delete: async (id) => {
        await delay();
        const vehicles = getStorageData().vehicles;
        const idx = vehicles.findIndex(v => v.id === id);
        if (idx === -1) throw { status: 404, message: 'Vehicle not found' };
        return vehicles.splice(idx, 1)[0];
      },
      
      subscribe: (callback) => {
        const interval = setInterval(() => {
          const vehicles = getStorageData().vehicles;
          vehicles.forEach((v) => {
            if (v.status === 'on_trip') {
              const step = 0.0008 + Math.random() * 0.0006;
              const angle = Math.random() * Math.PI * 2;
              v.latitude = (v.latitude ?? 17.385) + Math.cos(angle) * step;
              v.longitude = (v.longitude ?? 78.487) + Math.sin(angle) * step;
              v.current_latitude = v.latitude;
              v.current_longitude = v.longitude;
              v.current_speed = Math.floor(Math.random() * 50 + 12);
              v.speed = v.current_speed;
              v.last_location_update = new Date().toISOString();
              v.updated_date = v.last_location_update;
            }
          });
          callback(normalizeVehicles(vehicles));
        }, 2500);

        return () => clearInterval(interval);
      },
    },

    Trip: {
      list: async (sortBy, limit) => {
        await delay();
        return sortList(getStorageData().trips, sortBy, limit);
      },
      
      filter: async (query = {}) => {
        await delay();
        let results = getStorageData().trips;
        Object.keys(query).forEach(key => {
          results = results.filter(item => item[key] === query[key]);
        });
        return results;
      },
      
      get: async (id) => {
        await delay();
        return getStorageData().trips.find(t => t.id === id);
      },
      
      create: async (data) => {
        await delay();
        const newTrip = {
          id: 'trip_' + Date.now(),
          ...data,
          created_date: new Date().toISOString(),
          updated_date: new Date().toISOString(),
        };
        getStorageData().trips.push(newTrip);
        return newTrip;
      },
      
      update: async (id, data) => {
        await delay();
        const trips = getStorageData().trips;
        const idx = trips.findIndex(t => t.id === id);
        if (idx === -1) throw { status: 404, message: 'Trip not found' };
        trips[idx] = { ...trips[idx], ...data, updated_date: new Date().toISOString() };
        return trips[idx];
      },
      
      delete: async (id) => {
        await delay();
        const trips = getStorageData().trips;
        const idx = trips.findIndex(t => t.id === id);
        if (idx === -1) throw { status: 404, message: 'Trip not found' };
        return trips.splice(idx, 1)[0];
      },
    },

    LocationLog: {
      list: async () => {
        await delay();
        return getStorageData().locationLogs;
      },
      
      filter: async (query = {}, sortBy = null, limit = 100) => {
        await delay();
        let results = getStorageData().locationLogs;
        Object.keys(query).forEach(key => {
          results = results.filter(item => item[key] === query[key]);
        });
        
        if (sortBy) {
          results.sort((a, b) => {
            if (sortBy === 'created_date' || sortBy === 'timestamp') {
              return new Date(b[sortBy]) - new Date(a[sortBy]);
            }
            return b[sortBy] - a[sortBy];
          });
        }
        
        return results.slice(0, limit);
      },
      
      create: async (data) => {
        await delay();
        const newLog = {
          id: 'log_' + Date.now(),
          ...data,
          timestamp: new Date().toISOString(),
        };
        getStorageData().locationLogs.push(newLog);
        return newLog;
      },
    },

    Geofence: {
      list: async () => {
        await delay();
        return getStorageData().geofences;
      },
      
      filter: async (query = {}) => {
        await delay();
        let results = getStorageData().geofences;
        Object.keys(query).forEach(key => {
          results = results.filter(item => item[key] === query[key]);
        });
        return results;
      },
      
      get: async (id) => {
        await delay();
        return getStorageData().geofences.find(g => g.id === id);
      },
      
      create: async (data) => {
        await delay();
        const newGeofence = {
          id: 'geofence_' + Date.now(),
          ...data,
          created_date: new Date().toISOString(),
          updated_date: new Date().toISOString(),
        };
        getStorageData().geofences.push(newGeofence);
        return newGeofence;
      },
      
      update: async (id, data) => {
        await delay();
        const geofences = getStorageData().geofences;
        const idx = geofences.findIndex(g => g.id === id);
        if (idx === -1) throw { status: 404, message: 'Geofence not found' };
        geofences[idx] = { ...geofences[idx], ...data, updated_date: new Date().toISOString() };
        return geofences[idx];
      },
      
      delete: async (id) => {
        await delay();
        const geofences = getStorageData().geofences;
        const idx = geofences.findIndex(g => g.id === id);
        if (idx === -1) throw { status: 404, message: 'Geofence not found' };
        return geofences.splice(idx, 1)[0];
      },
    },

    MaintenanceLog: {
      list: async () => {
        await delay();
        return getStorageData().maintenance;
      },
      
      filter: async (query = {}) => {
        await delay();
        let results = getStorageData().maintenance;
        Object.keys(query).forEach(key => {
          results = results.filter(item => item[key] === query[key]);
        });
        return results;
      },
      
      create: async (data) => {
        await delay();
        const newMaint = {
          id: 'maint_' + Date.now(),
          ...data,
          created_date: new Date().toISOString(),
          updated_date: new Date().toISOString(),
        };
        getStorageData().maintenance.push(newMaint);
        return newMaint;
      },
      
      update: async (id, data) => {
        await delay();
        const maintenance = getStorageData().maintenance;
        const idx = maintenance.findIndex(m => m.id === id);
        if (idx === -1) throw { status: 404, message: 'Maintenance log not found' };
        maintenance[idx] = { ...maintenance[idx], ...data, updated_date: new Date().toISOString() };
        return maintenance[idx];
      },
      
      delete: async (id) => {
        await delay();
        const maintenance = getStorageData().maintenance;
        const idx = maintenance.findIndex(m => m.id === id);
        if (idx === -1) throw { status: 404, message: 'Maintenance log not found' };
        return maintenance.splice(idx, 1)[0];
      },
    },

    ReportSchedule: {
      list: async (sortBy, limit) => {
        await delay();
        return sortList(getStorageData().reportSchedules ?? [], sortBy, limit);
      },
      
      filter: async (query = {}) => {
        await delay();
        let results = getStorageData().reportSchedules;
        Object.keys(query).forEach(key => {
          results = results.filter(item => item[key] === query[key]);
        });
        return results;
      },
      
      create: async (data) => {
        await delay();
        const newReport = {
          id: 'report_' + Date.now(),
          ...data,
          created_date: new Date().toISOString(),
          updated_date: new Date().toISOString(),
        };
        getStorageData().reportSchedules.push(newReport);
        return newReport;
      },
      
      delete: async (id) => {
        await delay();
        const reports = getStorageData().reportSchedules;
        const idx = reports.findIndex(r => r.id === id);
        if (idx === -1) throw { status: 404, message: 'Report schedule not found' };
        return reports.splice(idx, 1)[0];
      },
    },
  },

  // Functions (async operations)
  functions: {
    invoke: async (functionName, params = {}) => {
      await delay(500);
      
      if (functionName === 'generateTripReport') {
        // Mock PDF generation
        const trip = await mockApiClient.entities.Trip.get(params.trip_id);
        const logs = await mockApiClient.entities.LocationLog.filter({ trip_id: params.trip_id });
        
        const reportData = {
          trip,
          locationLogs: logs,
          generatedAt: new Date().toISOString(),
        };
        
        return {
          data: JSON.stringify(reportData),
          status: 200,
        };
      }
      
      if (functionName === 'sendWeeklyFleetReport') {
        return {
          data: { message: 'Weekly report sent to all admins' },
          status: 200,
        };
      }
      
      throw { status: 404, message: `Function ${functionName} not found` };
    },
  },

};

mockApiClient.asServiceRole = {
  entities: {
    Vehicle: mockApiClient.entities.Vehicle,
    Trip: mockApiClient.entities.Trip,
    LocationLog: mockApiClient.entities.LocationLog,
    Geofence: mockApiClient.entities.Geofence,
    MaintenanceLog: mockApiClient.entities.MaintenanceLog,
    ReportSchedule: mockApiClient.entities.ReportSchedule,
  },
};

export const base44 = mockApiClient;

export default mockApiClient;
