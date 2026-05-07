"use client";

import React, { useEffect, useState } from "react";

interface Props {
  endTimeIso?: string;
  className?: string;
  onExpire?: () => void;
}

function getDefaultEnd() {
  const now = new Date();
  // default to end of today (local time)
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
  return end.getTime();
}

export default function CountdownTimer({ endTimeIso, className = "", onExpire }: Props) {
  const computeEnd = () => {
    if (endTimeIso) {
      const t = Date.parse(endTimeIso);
      return Number.isNaN(t) ? getDefaultEnd() : t;
    }
    return getDefaultEnd();
  };

  const [remaining, setRemaining] = useState(() => Math.max(0, computeEnd() - Date.now()));

  useEffect(() => {
    const end = computeEnd();
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
    <div aria-live="polite" className={`flex items-center gap-3 ${className}`}>
      <span className="inline-flex items-center gap-2 bg-gradient-to-r from-amber-200 to-amber-100 text-amber-900 px-3 py-1 rounded-full text-sm font-semibold">
        Oferta relámpago
      </span>
      <span className="font-mono text-sm bg-white dark:bg-slate-800 px-3 py-1 rounded-lg shadow-sm border border-slate-100 dark:border-slate-800">
        {formatted}
      </span>
    </div>
  );
}
