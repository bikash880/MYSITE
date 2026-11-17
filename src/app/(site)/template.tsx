"use client";

import { motion } from "framer-motion";

/**
 * Re-mounts on every navigation → soft cross-fade between pages.
 * Opacity only: transforms here would break position:fixed elements inside pages.
 */
export default function SiteTemplate({ children }: { children: React.ReactNode }) {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}>
      {children}
    </motion.div>
  );
}
