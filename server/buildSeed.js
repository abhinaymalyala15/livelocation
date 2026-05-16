/** Empty fleet — real data only (drivers, vehicles, trips added in app). */
export function buildInitialStorage() {
  return {
    vehicles: [],
    trips: [],
    locationLogs: [],
    geofences: [],
    maintenance: [],
    reportSchedules: [],
  };
}
