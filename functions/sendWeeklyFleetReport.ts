// sendWeeklyFleetReport function
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);

  // Allow both direct admin calls and automated scheduler calls (no user session)
  let user = null;
  try { user = await base44.auth.me(); } catch (_) {}

  if (user && user.role !== 'admin') {
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  }

  const schedules = await base44.asServiceRole.entities.ReportSchedule.filter({ is_active: true });
  const now = new Date();
  const weekAgo = new Date(now - 7 * 24 * 60 * 60 * 1000);

  const trips = await base44.asServiceRole.entities.Trip.list('-start_time', 1000);
  const weekTrips = trips.filter(t => t.start_time && new Date(t.start_time) >= weekAgo);

  let sent = 0;
  for (const schedule of schedules) {
    const dayMatch = now.getDay() === (schedule.day_of_week ?? 1);
    if (!dayMatch) continue;

    const relevantTrips = schedule.include_all_vehicles
      ? weekTrips
      : weekTrips.filter(t => (schedule.vehicle_ids || []).includes(t.vehicle_id));

    const totalDistance = relevantTrips.reduce((s, t) => s + (t.distance_km || 0), 0);
    const completed = relevantTrips.filter(t => t.status === 'completed').length;
    const active = relevantTrips.filter(t => t.status === 'active').length;

    const tripRows = relevantTrips.slice(0, 30).map(t => {
      const dur = t.start_time && t.end_time
        ? Math.round((new Date(t.end_time) - new Date(t.start_time)) / 60000) + 'm'
        : '—';
      return `<tr style="border-bottom:1px solid #eee">
        <td style="padding:6px 10px">${t.vehicle_name || '—'}</td>
        <td style="padding:6px 10px">${t.driver_name || '—'}</td>
        <td style="padding:6px 10px">${t.destination || '—'}</td>
        <td style="padding:6px 10px">${t.status}</td>
        <td style="padding:6px 10px">${dur}</td>
        <td style="padding:6px 10px">${t.distance_km != null ? t.distance_km.toFixed(1) + ' km' : '—'}</td>
      </tr>`;
    }).join('');

    const body = `
      <div style="font-family:Inter,sans-serif;max-width:700px;margin:auto">
        <div style="background:#0ea575;padding:24px;border-radius:12px 12px 0 0">
          <h1 style="color:#fff;margin:0;font-size:22px">FleetTrack Weekly Report</h1>
          <p style="color:#d1fae5;margin:4px 0 0">${schedule.name} · Week ending ${now.toLocaleDateString()}</p>
        </div>
        <div style="background:#f8fafc;padding:24px;display:flex;gap:20px">
          ${[
            ['Total Trips', relevantTrips.length],
            ['Completed', completed],
            ['Active', active],
            ['Distance', totalDistance.toFixed(1) + ' km'],
          ].map(([l, v]) => `<div style="background:#fff;border-radius:8px;padding:16px;flex:1;text-align:center;border:1px solid #e2e8f0">
            <p style="font-size:22px;font-weight:bold;color:#0ea575;margin:0">${v}</p>
            <p style="color:#64748b;font-size:12px;margin:4px 0 0">${l}</p>
          </div>`).join('')}
        </div>
        <div style="background:#fff;padding:24px;border:1px solid #e2e8f0">
          <h3 style="color:#1e293b;margin:0 0 12px">Trip Details</h3>
          <table style="width:100%;border-collapse:collapse;font-size:13px">
            <thead>
              <tr style="background:#f1f5f9">
                <th style="padding:8px 10px;text-align:left">Vehicle</th>
                <th style="padding:8px 10px;text-align:left">Driver</th>
                <th style="padding:8px 10px;text-align:left">Destination</th>
                <th style="padding:8px 10px;text-align:left">Status</th>
                <th style="padding:8px 10px;text-align:left">Duration</th>
                <th style="padding:8px 10px;text-align:left">Distance</th>
              </tr>
            </thead>
            <tbody>${tripRows || '<tr><td colspan="6" style="padding:12px;color:#94a3b8;text-align:center">No trips this week</td></tr>'}</tbody>
          </table>
        </div>
        <p style="color:#94a3b8;font-size:11px;text-align:center;padding:16px">Sent automatically by FleetTrack</p>
      </div>
    `;

    await base44.asServiceRole.integrations.Core.SendEmail({
      to: schedule.recipient_email,
      subject: `FleetTrack Weekly Report — ${now.toLocaleDateString()}`,
      body,
    });

    await base44.asServiceRole.entities.ReportSchedule.update(schedule.id, { last_sent: now.toISOString() });
    sent++;
  }

  return Response.json({ sent, message: `Sent ${sent} weekly reports` });
});