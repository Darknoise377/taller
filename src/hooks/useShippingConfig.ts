"use client";

import { useState, useEffect } from "react";
import { DEFAULT_SHIPPING_CONFIG, SHIPPING_REGIONS } from "@/config/shippingRates";
import type { ShippingConfig } from "@/config/shippingRates";

/** Module-level cache — fetches only once per page load across all components */
let _cached: ShippingConfig | null = null;
let _promise: Promise<ShippingConfig> | null = null;

function fetchConfig(): Promise<ShippingConfig> {
  if (!_promise) {
    _promise = fetch("/api/store-settings")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        const cfg = (data?.shippingRules as ShippingConfig) ?? DEFAULT_SHIPPING_CONFIG;
        _cached = cfg;
        return cfg;
      })
      .catch(() => {
        _cached = DEFAULT_SHIPPING_CONFIG;
        return DEFAULT_SHIPPING_CONFIG;
      });
  }
  return _promise;
}

export interface ShippingConfigResult {
  config: ShippingConfig;
  /** Lowest baseRate across all regions (Bogotá = 9,000) */
  minShippingRate: number;
  /** Average baseRate across all regions */
  avgShippingRate: number;
  freeShippingThreshold: number;
  isFreeShippingAll: boolean;
}

export function useShippingConfig(): ShippingConfigResult {
  const [config, setConfig] = useState<ShippingConfig>(_cached ?? DEFAULT_SHIPPING_CONFIG);

  useEffect(() => {
    if (_cached) return; // already have it
    fetchConfig().then(setConfig);
  }, []);

  const rates = config.regions.map((r) => r.baseRate);
  const minShippingRate = rates.length ? Math.min(...rates) : SHIPPING_REGIONS[0].baseRate;
  const avgShippingRate = rates.length
    ? Math.round(rates.reduce((a, b) => a + b, 0) / rates.length)
    : 14_000;

  return {
    config,
    minShippingRate,
    avgShippingRate,
    freeShippingThreshold: config.freeShippingThreshold,
    isFreeShippingAll: config.freeShippingAll,
  };
}
