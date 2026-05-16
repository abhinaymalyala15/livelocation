import { motion } from "framer-motion";
import { Circle } from "lucide-react";
import moment from "moment";

export default function EventTimeline({ events = [] }) {
  if (!events.length) {
    return (
      <motion.section className="surface-card rounded-xl border border-border p-4 text-sm text-muted-foreground">
        No events yet. Start a trip to see activity.
      </motion.section>
    );
  }

  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="surface-card rounded-xl border border-border p-4"
    >
      <h3 className="text-sm font-medium mb-3">Recent activity</h3>
      <ul className="space-y-3">
        {events.slice(0, 8).map((ev) => (
          <li key={ev.id} className="flex gap-3 text-sm">
            <Circle className="h-2 w-2 mt-1.5 shrink-0 fill-primary text-primary" />
            <motion.div>
              <p>{ev.message}</p>
              <p className="text-xs text-muted-foreground">{moment(ev.at).format("HH:mm:ss")}</p>
            </motion.div>
          </li>
        ))}
      </ul>
    </motion.section>
  );
}
