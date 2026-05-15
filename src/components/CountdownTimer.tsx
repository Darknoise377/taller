"use client";

import React, { useEffect, useState } from "react";

interface Props {
  endTimeIso?: string;
  className?: string;
  onExpire?: () => void;
}

function getDefaultEnd() {
  // Compute end-of-day in Colombia timezone (UTC-5, America/Bogota)
  const bogotaFormatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Bogota",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  // Returns "YYYY-MM-DD" for today in Bogotá
  const bogotaDateStr = bogotaFormatter.format(new Date());
  // Build a Date at 23:59:59 Bogotá local time (UTC-5 = +18000 seconds offset)
  const bogotaMidnight = new Date(`${bogotaDateStr}T23:59:59-05:00`);
  return bogotaMidnight.getTime();
}

export default function CountdownTimer({ endTimeIso, className = "", onExpire }: Props) {
  const computeEnd = () => {
    if (endTimeIso) {
      const t = Date.parse(endTimeIso);
      return Number.isNaN(t) ? getDefaultEnd() : t;
    }
    return getDefaultEnd();
  };

  // Keep SSR and first client paint deterministic to avoid hydration mismatch.
  const [remaining, setRemaining] = useState(0);

  useEffect(() => {
    const end = computeEnd();
    setRemaining(Math.max(0, end - Date.now()));

    const id = setInterval(() => {
      const rem = Math.max(0, end - Date.now());
      setRemaining(rem);
      if (rem <= 0) {
        clearInterval(id);
        onExpire?.();
      }
    }, 1000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [endTimeIso]);

  const seconds = Math.floor(remaining / 1000);
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  const formatted = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;

  return (
    <div role="region" aria-label="Oferta relámpago" className={`flex items-center gap-3 ${className}`}>
      <span className="inline-flex items-center gap-2 bg-gradient-to-r from-amber-200 to-amber-100 text-amber-900 px-3 py-1 rounded-full text-sm font-semibold">
        Oferta relámpago
      </span>
      <span
        role="timer"
        aria-live="polite"
        aria-atomic="true"
        className="font-mono text-sm bg-white/90 dark:bg-slate-800 px-3 py-1 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100"
      >
        {formatted}
      </span>
      <span className="sr-only">La oferta termina en {formatted}</span>
    </div>
  );
}
