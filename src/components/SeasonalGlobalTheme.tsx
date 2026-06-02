"use client";

import { useEffect, useMemo, useState } from "react";
import {
  DEFAULT_SEASONAL_CAMPAIGN,
  type SeasonalCampaignConfig,
  type SeasonalThemeKey,
} from "@/config/shippingRates";

export default function SeasonalGlobalTheme() {
  const [campaign, setCampaign] = useState<SeasonalCampaignConfig>(DEFAULT_SEASONAL_CAMPAIGN);
  const [showEntrance, setShowEntrance] = useState(true);

  const confetti = useMemo(() => Array.from({ length: 48 }, (_, idx) => idx), []);
  const snow = useMemo(() => Array.from({ length: 56 }, (_, idx) => idx), []);
  const bats = useMemo(() => Array.from({ length: 18 }, (_, idx) => idx), []);

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
    return () => {
      document.documentElement.setAttribute("data-season-theme", "none");
    };
  }, [activeKey]);

  if (activeKey === "none") return null;

  return (
    <div className="seasonal-overlay" aria-hidden="true">
      {activeKey === "mundial_2026" && (
        <>
          <div className="seasonal-top-banner" />
          <div className="seasonal-ball">⚽</div>
          {showEntrance && (
            <div className="seasonal-confetti-layer">
              {confetti.map((item) => (
                <span
                  key={item}
                  className={`seasonal-confetti seasonal-confetti-${item % 4}`}
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
          <div className="seasonal-pumpkin seasonal-pumpkin-left">🎃</div>
          <div className="seasonal-pumpkin seasonal-pumpkin-right">🎃</div>
          <div className="seasonal-bat-layer">
            {bats.map((item) => (
              <span key={item} className="seasonal-bat">
                🦇
              </span>
            ))}
          </div>
        </>
      )}

      {activeKey === "navidad" && (
        <>
          <div className="seasonal-tree">🎄</div>
          <div className="seasonal-star">⭐</div>
          <div className="seasonal-snow-layer">
            {snow.map((item) => (
              <span key={item} className="seasonal-snow" />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
