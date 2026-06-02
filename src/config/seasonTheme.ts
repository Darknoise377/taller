import type { SeasonalThemeKey } from '@/config/shippingRates';

export type SeasonThemeMeta = {
  label: string;
  icon: string;
  heroBg: string;
  badgeBg: string;
  badgeText: string;
  glowPrimary: string;
  glowSecondary: string;
  pulseOne: string;
  pulseTwo: string;
  comboGradient: string;
  comboGlow: string;
  comboBadge: string;
  comboCta: string;
};

export const SEASON_THEME_META: Record<SeasonalThemeKey, SeasonThemeMeta> = {
  none: {
    label: 'Tienda',
    icon: '✨',
    heroBg:
      'bg-gradient-to-br from-[#e9f2ff] via-[#f8fbff] to-[#e3edff] dark:from-[#07122E] dark:via-[#0A2A66] dark:to-[#0D1F4E]',
    badgeBg: 'bg-[#0A2A66]/10 dark:bg-white/10 border-white/40 dark:border-white/10',
    badgeText: 'text-[#0A2A66] dark:text-[#5B9BD5]',
    glowPrimary: 'bg-[#2E5FA7]/15 dark:bg-[#2E5FA7]/10',
    glowSecondary: 'bg-[#0A2A66]/10 dark:bg-[#0A2A66]/20',
    pulseOne: 'bg-[#2E5FA7]/20 dark:bg-[#5B9BD5]/20',
    pulseTwo: 'bg-[#0A2A66]/15 dark:bg-[#8FA8CC]/20',
    comboGradient:
      'from-[#0A2A66] via-[#153B82] to-[#2E5FA7] dark:from-[#07122E] dark:via-[#0A2A66] dark:to-[#2E5FA7]',
    comboGlow: 'bg-[#5B9BD5]/25',
    comboBadge: 'bg-white/15 text-white border-white/25',
    comboCta: 'bg-white text-[#0A2A66] hover:bg-slate-100',
  },
  mundial_2026: {
    label: 'Mundial 2026',
    icon: '⚽',
    heroBg:
      'bg-gradient-to-br from-[#fff8cf] via-[#ffe89b] to-[#cde2ff] dark:from-[#1d1300] dark:via-[#0b1f4f] dark:to-[#2a0810]',
    badgeBg: 'bg-[#FCD116]/30 dark:bg-[#FCD116]/20 border-[#FCD116]/50',
    badgeText: 'text-[#8B6A00] dark:text-[#FFE588]',
    glowPrimary: 'bg-[#0038A8]/20 dark:bg-[#1A67FF]/25',
    glowSecondary: 'bg-[#CE1126]/18 dark:bg-[#FF4B63]/24',
    pulseOne: 'bg-[#FCD116]/35 dark:bg-[#FCD116]/30',
    pulseTwo: 'bg-[#0038A8]/30 dark:bg-[#0038A8]/34',
    comboGradient:
      'from-[#FCD116] via-[#0038A8] to-[#CE1126] dark:from-[#8B6A00] dark:via-[#0038A8] dark:to-[#8B1020]',
    comboGlow: 'bg-[#FCD116]/30',
    comboBadge: 'bg-[#FCD116]/25 text-[#1a1200] border-[#FCD116]/40',
    comboCta: 'bg-[#0038A8] text-white hover:bg-[#002a7a]',
  },
  halloween: {
    label: 'Halloween',
    icon: '🎃',
    heroBg:
      'bg-gradient-to-br from-[#1b0d00] via-[#2c1507] to-[#3f1c08] dark:from-[#120700] dark:via-[#1f0d00] dark:to-[#2f1100]',
    badgeBg: 'bg-[#FF7A00]/25 dark:bg-[#FF7A00]/20 border-[#FF7A00]/40',
    badgeText: 'text-[#FFD39D] dark:text-[#FFE6C7]',
    glowPrimary: 'bg-[#FF7A00]/28 dark:bg-[#FF7A00]/28',
    glowSecondary: 'bg-[#7A3AC9]/22 dark:bg-[#7A3AC9]/28',
    pulseOne: 'bg-[#FF7A00]/32 dark:bg-[#FF7A00]/34',
    pulseTwo: 'bg-[#7A3AC9]/32 dark:bg-[#7A3AC9]/34',
    comboGradient:
      'from-[#FF7A00] via-[#5c2d0e] to-[#7A3AC9] dark:from-[#FF7A00] dark:via-[#3d1a06] dark:to-[#4a1f7a]',
    comboGlow: 'bg-[#FF7A00]/25',
    comboBadge: 'bg-[#FF7A00]/30 text-orange-50 border-orange-300/30',
    comboCta: 'bg-[#FF7A00] text-white hover:bg-orange-600',
  },
  independencia: {
    label: 'Independencia',
    icon: '🇨🇴',
    heroBg:
      'bg-gradient-to-br from-[#fff6e6] via-[#ffe8d0] to-[#ffd8b6] dark:from-[#2A1500] dark:via-[#3A1E04] dark:to-[#5A2F0A]',
    badgeBg: 'bg-[#F57C00]/20 dark:bg-[#F57C00]/15 border-[#F57C00]/35',
    badgeText: 'text-[#C15E00] dark:text-[#FFC67B]',
    glowPrimary: 'bg-[#F57C00]/20 dark:bg-[#F57C00]/25',
    glowSecondary: 'bg-[#C62828]/15 dark:bg-[#C62828]/20',
    pulseOne: 'bg-[#F57C00]/30 dark:bg-[#F57C00]/30',
    pulseTwo: 'bg-[#C62828]/30 dark:bg-[#C62828]/30',
    comboGradient:
      'from-[#FCD116] via-[#003893] to-[#CE1126] dark:from-[#8B6A00] dark:via-[#003893] dark:to-[#8B1020]',
    comboGlow: 'bg-[#FCD116]/22',
    comboBadge: 'bg-white/20 text-white border-white/30',
    comboCta: 'bg-[#CE1126] text-white hover:bg-red-800',
  },
  amor_amistad: {
    label: 'Amor y Amistad',
    icon: '💝',
    heroBg:
      'bg-gradient-to-br from-[#fff0f4] via-[#ffe4ec] to-[#fde0ff] dark:from-[#2B0D1F] dark:via-[#3B1232] dark:to-[#4A1642]',
    badgeBg: 'bg-[#D81B60]/15 dark:bg-[#D81B60]/20 border-pink-300/40',
    badgeText: 'text-[#B0144E] dark:text-[#FF97C2]',
    glowPrimary: 'bg-[#D81B60]/20 dark:bg-[#D81B60]/25',
    glowSecondary: 'bg-[#8E24AA]/15 dark:bg-[#8E24AA]/20',
    pulseOne: 'bg-[#D81B60]/30 dark:bg-[#D81B60]/30',
    pulseTwo: 'bg-[#8E24AA]/30 dark:bg-[#8E24AA]/34',
    comboGradient:
      'from-[#D81B60] via-[#f06292] to-[#8E24AA] dark:from-[#880e4f] dark:via-[#ad1457] dark:to-[#6a1b9a]',
    comboGlow: 'bg-pink-400/25',
    comboBadge: 'bg-white/20 text-white border-pink-200/30',
    comboCta: 'bg-[#D81B60] text-white hover:bg-pink-700',
  },
  black_week: {
    label: 'Black Week',
    icon: '⚡',
    heroBg:
      'bg-gradient-to-br from-[#f3f4f6] via-[#e5e7eb] to-[#d1d5db] dark:from-[#050505] dark:via-[#0b0b0b] dark:to-[#171717]',
    badgeBg: 'bg-black/10 dark:bg-white/10 border-slate-400/30',
    badgeText: 'text-black dark:text-white',
    glowPrimary: 'bg-black/15 dark:bg-white/10',
    glowSecondary: 'bg-slate-500/15 dark:bg-slate-300/10',
    pulseOne: 'bg-black/20 dark:bg-white/20',
    pulseTwo: 'bg-slate-500/30 dark:bg-slate-300/25',
    comboGradient:
      'from-black via-zinc-800 to-amber-500 dark:from-black dark:via-zinc-900 dark:to-amber-600',
    comboGlow: 'bg-amber-400/20',
    comboBadge: 'bg-amber-400/25 text-amber-100 border-amber-300/40',
    comboCta: 'bg-amber-400 text-black hover:bg-amber-300 font-extrabold',
  },
  navidad: {
    label: 'Navidad',
    icon: '🎄',
    heroBg:
      'bg-gradient-to-br from-[#e8f7ea] via-[#fff3f3] to-[#ecf4ff] dark:from-[#06210F] dark:via-[#112f14] dark:to-[#3A0C0C]',
    badgeBg: 'bg-[#1E8E3E]/18 dark:bg-[#1E8E3E]/25 border-emerald-300/35',
    badgeText: 'text-[#0F5A24] dark:text-[#A7F0B3]',
    glowPrimary: 'bg-[#1E8E3E]/24 dark:bg-[#1E8E3E]/30',
    glowSecondary: 'bg-[#C62828]/22 dark:bg-[#E53935]/26',
    pulseOne: 'bg-[#1E8E3E]/34 dark:bg-[#1E8E3E]/32',
    pulseTwo: 'bg-[#C62828]/30 dark:bg-[#C62828]/34',
    comboGradient:
      'from-[#1E8E3E] via-[#2e7d32] to-[#C62828] dark:from-[#0F5A24] dark:via-[#1B5E20] dark:to-[#8B1020]',
    comboGlow: 'bg-emerald-400/22',
    comboBadge: 'bg-white/20 text-white border-emerald-200/30',
    comboCta: 'bg-[#C62828] text-white hover:bg-red-700',
  },
};

export function getSeasonMeta(key: SeasonalThemeKey): SeasonThemeMeta {
  return SEASON_THEME_META[key] ?? SEASON_THEME_META.none;
}
