import { MeliListingStatus } from '@prisma/client';
import type { MeliItemDetail } from './client';

export type MeliSyncFilter = 'all' | 'synced' | 'pending' | 'issues';

export type MeliListingHealth = 'ok' | 'warning' | 'error' | 'unknown';

export type ParsedMeliLiveStatus = {
  liveStatus: string;
  subStatuses: string[];
  tags: string[];
  dbStatus: MeliListingStatus;
  health: MeliListingHealth;
  isPaused: boolean;
  isActive: boolean;
  pauseReason: string | null;
  statusLabel: string;
  statusDetail: string | null;
  permalink: string | null;
  availableQuantity: number | null;
  livePrice: number | null;
};

const SUB_STATUS_LABELS: Record<string, string> = {
  out_of_stock: 'Sin stock en Mercado Libre',
  paused_by_seller: 'Pausado manualmente en MeLi',
  picture_download_pending: 'Procesando imágenes de la publicación',
  picture_downloading_pending: 'Descargando imágenes',
  moderation_penalty: 'Moderación de Mercado Libre',
};

export function mapApiStatusToDb(status: string): MeliListingStatus {
  switch (status.toLowerCase()) {
    case 'active':
      return MeliListingStatus.ACTIVE;
    case 'paused':
      return MeliListingStatus.PAUSED;
    case 'closed':
      return MeliListingStatus.CLOSED;
    case 'under_review':
      return MeliListingStatus.UNDER_REVIEW;
    default:
      return MeliListingStatus.ERROR;
  }
}

export function describeSubStatuses(subStatuses: string[], tags: string[]): string | null {
  const parts: string[] = [];

  for (const sub of subStatuses) {
    const label = SUB_STATUS_LABELS[sub];
    parts.push(label ?? sub.replaceAll('_', ' '));
  }

  if (tags.includes('moderation_penalty')) {
    parts.push('Publicación con penalización de moderación');
  }

  return parts.length > 0 ? parts.join(' · ') : null;
}

export function parseMeliLiveStatus(item: MeliItemDetail | null): ParsedMeliLiveStatus | null {
  if (!item) return null;

  const liveStatus = item.status.toLowerCase();
  const subStatuses = item.sub_status ?? [];
  const tags = item.tags ?? [];
  const dbStatus = mapApiStatusToDb(liveStatus);
  const isPaused = liveStatus === 'paused';
  const isActive = liveStatus === 'active';

  let health: MeliListingHealth = 'ok';
  let pauseReason: string | null = null;
  let statusDetail: string | null = null;

  if (liveStatus === 'closed') {
    health = 'error';
    statusDetail = 'La publicación está cerrada en Mercado Libre';
  } else if (liveStatus === 'under_review') {
    health = 'warning';
    statusDetail = 'En revisión por Mercado Libre';
  } else if (isPaused) {
    health = 'warning';
    pauseReason = describeSubStatuses(subStatuses, tags) ?? 'Publicación pausada en Mercado Libre';
    statusDetail = pauseReason;
  } else if (subStatuses.includes('out_of_stock') || item.available_quantity === 0) {
    health = 'warning';
    statusDetail = 'Sin unidades disponibles en MeLi';
  } else if (tags.includes('moderation_penalty')) {
    health = 'warning';
    statusDetail = 'Penalización de moderación activa';
  }

  const statusLabel =
    liveStatus === 'active'
      ? 'Activa'
      : liveStatus === 'paused'
        ? 'Pausada'
        : liveStatus === 'closed'
          ? 'Cerrada'
          : liveStatus === 'under_review'
            ? 'En revisión'
            : item.status;

  return {
    liveStatus,
    subStatuses,
    tags,
    dbStatus,
    health,
    isPaused,
    isActive,
    pauseReason,
    statusLabel,
    statusDetail,
    permalink: item.permalink ?? null,
    availableQuantity: item.available_quantity ?? null,
    livePrice: item.price ?? null,
  };
}

export function getSyncState(row: {
  meliExport: boolean;
  meliItemId?: string;
  localStatus?: string;
  live?: ParsedMeliLiveStatus | null;
}): 'synced' | 'pending' | 'issues' {
  if (!row.meliItemId) {
    return row.meliExport ? 'pending' : 'synced';
  }
  if (row.localStatus === 'ERROR') return 'issues';
  if (row.live) {
    if (row.live.health === 'error' || row.live.health === 'warning') return 'issues';
    if (row.localStatus && row.live.dbStatus !== row.localStatus) return 'issues';
  }
  return 'synced';
}

export function matchesSyncFilter(
  filter: MeliSyncFilter,
  syncState: 'synced' | 'pending' | 'issues',
): boolean {
  if (filter === 'all') return true;
  if (filter === 'synced') return syncState === 'synced';
  if (filter === 'pending') return syncState === 'pending';
  return syncState === 'issues';
}
