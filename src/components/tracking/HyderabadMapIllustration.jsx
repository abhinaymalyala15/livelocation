import { motion } from "framer-motion";

/** Decorative Hyderabad skyline / route illustration for login */
export default function HyderabadMapIllustration() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      <motion.div
        className="absolute -top-1/4 -right-1/4 w-[80%] h-[80%] rounded-full bg-primary/20 blur-3xl"
        animate={{ scale: [1, 1.15, 1], opacity: [0.3, 0.5, 0.3] }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute bottom-0 left-0 w-[60%] h-[50%] rounded-full bg-emerald-500/15 blur-3xl"
        animate={{ scale: [1.1, 1, 1.1], opacity: [0.2, 0.4, 0.2] }}
        transition={{ duration: 10, repeat: Infinity, ease: "easeInOut", delay: 1 }}
      />
      <svg
        className="absolute bottom-0 left-0 right-0 w-full h-[55%] opacity-[0.12]"
        viewBox="0 0 400 200"
        preserveAspectRatio="xMidYMax slice"
        fill="none"
      >
        <motion.path
          d="M0 180 Q80 120 160 150 T320 130 L400 160 L400 200 L0 200 Z"
          fill="currentColor"
          className="text-primary"
          initial={{ opacity: 0.3 }}
          animate={{ opacity: [0.2, 0.35, 0.2] }}
          transition={{ duration: 6, repeat: Infinity }}
        />
        <motion.path
          d="M0 160 L60 140 L120 155 L200 120 L280 145 L360 110 L400 140"
          stroke="currentColor"
          strokeWidth="2"
          className="text-emerald-400"
          strokeDasharray="8 6"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1, strokeDashoffset: [0, -28] }}
          transition={{ pathLength: { duration: 2 }, strokeDashoffset: { duration: 4, repeat: Infinity, ease: "linear" } }}
        />
        {[
          [80, 130], [160, 145], [240, 125], [320, 135],
        ].map(([cx, cy], i) => (
          <motion.circle
            key={i}
            cx={cx}
            cy={cy}
            r="4"
            className="fill-primary"
            animate={{ opacity: [0.4, 1, 0.4], r: [3, 5, 3] }}
            transition={{ duration: 2 + i * 0.5, repeat: Infinity }}
          />
        ))}
      </svg>
    </div>
  );
}
