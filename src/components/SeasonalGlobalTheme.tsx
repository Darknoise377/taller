"use client";

import { useEffect, useMemo, useState } from "react";
import {
  DEFAULT_SEASONAL_CAMPAIGN,
  type SeasonalCampaignConfig,
  type SeasonalThemeKey,
  type SeasonalVisualIntensity,
} from "@/config/shippingRates";

export default function SeasonalGlobalTheme() {
  const [campaign, setCampaign] = useState<SeasonalCampaignConfig>(DEFAULT_SEASONAL_CAMPAIGN);
  const [userChoice, setUserChoice] = useState<SeasonalThemeKey | null>(null);
  const [showEntrance, setShowEntrance] = useState(true);

  // Load user preference from localStorage or listen to theme change event
  useEffect(() => {
    try {
      const stored = localStorage.getItem("ar-season-theme");
      if (stored === "navidad" || stored === "none") {
        setUserChoice(stored as SeasonalThemeKey);
      }
    } catch {
      // ignore
    }

    const handler = (e: Event) => {
      const detail = (e as CustomEvent<{ key: SeasonalThemeKey }>).detail;
      if (detail && detail.key !== undefined) {
        setUserChoice(detail.key);
      }
    };

    window.addEventListener("ar-season-theme-change", handler);
    return () => window.removeEventListener("ar-season-theme-change", handler);
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => setShowEntrance(false), 5000);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    fetch("/api/store-settings")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        const raw = data?.seasonalCampaign ?? data?.shippingRules?.seasonalCampaign;
        if (!raw || typeof raw !== "object") return;
        setCampaign((prev) => ({ ...prev, ...raw }));
      })
      .catch(() => {
        // Keep defaults when settings are unavailable.
      });
  }, []);

  // Priority: user manual toggle > campaign from server > default (navidad)
  const activeKey: SeasonalThemeKey =
    userChoice !== null
      ? userChoice
      : campaign.enabled && campaign.key
      ? campaign.key
      : "navidad";

  const intensity: SeasonalVisualIntensity = campaign.intensity ?? "full";
  const multiplier = intensity === "subtle" ? 0.45 : intensity === "medium" ? 0.72 : 1;

  // Gentle holiday stardust & crystalline snow particles
  const particles = useMemo(
    () => Array.from({ length: Math.max(14, Math.round(36 * multiplier)) }, (_, idx) => idx),
    [multiplier]
  );

  const confetti = useMemo(
    () => Array.from({ length: Math.max(16, Math.round(50 * multiplier)) }, (_, idx) => idx),
    [multiplier]
  );
  const bats = useMemo(
    () => Array.from({ length: Math.max(8, Math.round(20 * multiplier)) }, (_, idx) => idx),
    [multiplier]
  );
  const ghosts = useMemo(
    () => Array.from({ length: Math.max(4, Math.round(12 * multiplier)) }, (_, idx) => idx),
    [multiplier]
  );
  const hearts = useMemo(
    () => Array.from({ length: Math.max(10, Math.round(24 * multiplier)) }, (_, idx) => idx),
    [multiplier]
  );
  const streamers = useMemo(
    () => Array.from({ length: Math.max(10, Math.round(28 * multiplier)) }, (_, idx) => idx),
    [multiplier]
  );
  const offers = useMemo(
    () => Array.from({ length: Math.max(8, Math.round(18 * multiplier)) }, (_, idx) => idx),
    [multiplier]
  );

  useEffect(() => {
    document.documentElement.setAttribute("data-season-theme", activeKey);
    document.documentElement.setAttribute("data-season-intensity", intensity);
    return () => {
      document.documentElement.setAttribute("data-season-theme", "none");
      document.documentElement.setAttribute("data-season-intensity", "full");
    };
  }, [activeKey, intensity]);

  if (activeKey === "none") return null;

  return (
    <div
      className={`seasonal-overlay seasonal-overlay-${intensity} ${showEntrance ? "seasonal-overlay-entrance" : ""}`}
      aria-hidden="true"
    >
      {/* Luxurious Liquid Ambient Lighting */}
      <div className="seasonal-art-blob seasonal-blob-1" />
      <div className="seasonal-art-blob seasonal-blob-2" />
      <div className="seasonal-art-blob seasonal-blob-3" />

      {/* ── EDICIÓN ESPECIAL NAVIDAD PREMIUM ── */}
      {activeKey === "navidad" && (
        <>
          {/* Subtle Golden Horizon Line at Top */}
          <div className="seasonal-navidad-glow-line" />

          {/* Elegant Stardust & Micro-Crystalline Snow Dust */}
          <div className="seasonal-navidad-particles" aria-hidden="true">
            {particles.map((item) => (
              <span
                key={item}
                className={`seasonal-navidad-particle seasonal-navidad-p-${item % 8}`}
              />
            ))}
          </div>

          {/* Luxury Champagne Corner Accents */}
          <div className="seasonal-navidad-corner seasonal-navidad-corner-left" />
          <div className="seasonal-navidad-corner seasonal-navidad-corner-right" />
        </>
      )}

      {/* Other seasonal campaigns retained cleanly */}
      {activeKey === "mundial_2026" && (
        <>
          <div className="seasonal-top-wave-banner" />
          <div className="seasonal-top-banner-glow" />
          <div className="seasonal-ribbon seasonal-ribbon-left" />
          <div className="seasonal-ribbon seasonal-ribbon-right" />
          {showEntrance && intensity !== "subtle" && (
            <div className="seasonal-confetti-layer">
              {confetti.map((item) => (
                <span
                  key={item}
                  className={`seasonal-confetti seasonal-confetti-${item % 6}`}
                />
              ))}
            </div>
          )}
        </>
      )}

      {activeKey === "halloween" && (
        <>
          <div className="seasonal-top-wave-banner seasonal-halloween-wave" />
          <div className="seasonal-web seasonal-web-left" />
          <div className="seasonal-web seasonal-web-right" />
          <div className="seasonal-moon" />
          <div className="seasonal-bat-layer">
            {bats.map((item) => (
              <span key={item} className="seasonal-bat">
                🦇
              </span>
            ))}
          </div>
          <div className="seasonal-ghost-layer">
            {ghosts.map((item) => (
              <span key={item} className="seasonal-ghost">
                👻
              </span>
            ))}
          </div>
        </>
      )}

      {activeKey === "independencia" && (
        <>
          <div className="seasonal-heritage-banner" />
          <div className="seasonal-ribbon seasonal-ribbon-left" />
          <div className="seasonal-ribbon seasonal-ribbon-right" />
          <div className="seasonal-streamer-layer">
            {streamers.map((item) => (
              <span
                key={item}
                className={`seasonal-streamer seasonal-streamer-${item % 3}`}
              />
            ))}
          </div>
        </>
      )}

      {activeKey === "amor_amistad" && (
        <>
          <div className="seasonal-top-wave-banner seasonal-love-wave" />
          <div className="seasonal-love-glow" />
          <div className="seasonal-heart-layer">
            {hearts.map((item) => (
              <span key={item} className={`seasonal-heart seasonal-heart-${item % 4}`}>
                {item % 5 === 0 ? "💘" : "❤"}
              </span>
            ))}
          </div>
        </>
      )}

      {activeKey === "black_week" && (
        <>
          <div className="seasonal-blackweek-border" />
          <div className="seasonal-offer-layer">
            {offers.map((item) => (
              <span key={item} className="seasonal-offer-badge">
                {item % 3 === 0 ? "-40%" : item % 3 === 1 ? "HOT" : "DEAL"}
              </span>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
