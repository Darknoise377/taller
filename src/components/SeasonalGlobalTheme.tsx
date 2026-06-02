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
  const [showEntrance, setShowEntrance] = useState(true);

  const intensity: SeasonalVisualIntensity = campaign.intensity ?? "full";
  const multiplier = intensity === "subtle" ? 0.45 : intensity === "medium" ? 0.72 : 1;

  const confetti = useMemo(
    () => Array.from({ length: Math.max(16, Math.round(72 * multiplier)) }, (_, idx) => idx),
    [multiplier],
  );
  const snow = useMemo(
    () => Array.from({ length: Math.max(20, Math.round(84 * multiplier)) }, (_, idx) => idx),
    [multiplier],
  );
  const bats = useMemo(
    () => Array.from({ length: Math.max(10, Math.round(28 * multiplier)) }, (_, idx) => idx),
    [multiplier],
  );
  const ghosts = useMemo(
    () => Array.from({ length: Math.max(6, Math.round(16 * multiplier)) }, (_, idx) => idx),
    [multiplier],
  );
  const hearts = useMemo(
    () => Array.from({ length: Math.max(12, Math.round(36 * multiplier)) }, (_, idx) => idx),
    [multiplier],
  );
  const streamers = useMemo(
    () => Array.from({ length: Math.max(14, Math.round(42 * multiplier)) }, (_, idx) => idx),
    [multiplier],
  );
  const offers = useMemo(
    () => Array.from({ length: Math.max(9, Math.round(26 * multiplier)) }, (_, idx) => idx),
    [multiplier],
  );

  useEffect(() => {
    const timer = window.setTimeout(() => setShowEntrance(false), 6800);
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

  const activeKey: SeasonalThemeKey = campaign.enabled && campaign.key ? campaign.key : "none";

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
      {activeKey === "mundial_2026" && (
        <>
          <div className="seasonal-top-banner" />
          <div className="seasonal-top-banner-glow" />
          <div className="seasonal-ribbon seasonal-ribbon-left" />
          <div className="seasonal-ribbon seasonal-ribbon-right" />
          <div className="seasonal-ball">⚽</div>
          <div className="seasonal-cup">A&R CUP</div>
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
          <div className="seasonal-web seasonal-web-left" />
          <div className="seasonal-web seasonal-web-right" />
          <div className="seasonal-moon" />
          <div className="seasonal-lantern seasonal-lantern-left" />
          <div className="seasonal-lantern seasonal-lantern-center" />
          <div className="seasonal-lantern seasonal-lantern-right" />
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

      {activeKey === "navidad" && (
        <>
          <div className="seasonal-tree" />
          <div className="seasonal-star">⭐</div>
          <div className="seasonal-gift seasonal-gift-left" />
          <div className="seasonal-gift seasonal-gift-right" />
          <div className="seasonal-lights" />
          <div className="seasonal-snow-layer">
            {snow.map((item) => (
              <span key={item} className="seasonal-snow" />
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
          <div className="seasonal-love-glow" />
          <div className="seasonal-love-title">Amor y Amistad</div>
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
          <div className="seasonal-blackweek-title">BLACK WEEK</div>
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
