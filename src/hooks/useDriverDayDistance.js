import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import moment from "moment";
import { base44 } from "@/api/base44Client";

/** Sum completed trip distances since local midnight for the driver */
export default function useDriverDayDistance(driverEmail, liveTripKm = 0, tripActive = false) {
  const { data: trips = [] } = useQuery({
    queryKey: ["driver-trips-day", driverEmail],
    queryFn: () => base44.entities.Trip.filter({ driver_email: driverEmail }),
    enabled: !!driverEmail,
    staleTime: 60_000,
  });

  const completedTodayKm = useMemo(() => {
    const start = moment().startOf("day");
    return trips
      .filter(
        (t) =>
          t.start_time &&
          moment(t.start_time).isSameOrAfter(start) &&
          (t.status === "completed" || t.end_time)
      )
      .reduce((sum, t) => sum + Number(t.distance_km ?? t.distance ?? 0), 0);
  }, [trips]);

  const todayTotalKm = completedTodayKm + (tripActive ? liveTripKm : 0);

  return { completedTodayKm, todayTotalKm, tripsToday: trips.length };
}
