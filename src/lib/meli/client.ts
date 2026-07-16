/**
 * Thin wrapper around the Mercado Libre REST API.
 * Every method automatically injects a valid Bearer token
 * (refreshing it when necessary via getValidToken).
 */
import { getValidToken } from './auth';

const BASE = 'https://api.mercadolibre.com';

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE';

async function meliRequest<T>(
  method: HttpMethod,
  path: string,
  body?: unknown,
): Promise<T> {
  const token = await getValidToken();
  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
    Accept: 'application/json',
  };
  if (body) headers['Content-Type'] = 'application/json';

  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`MeLi API ${method} ${path} → ${res.status}: ${text}`);
  }

  return res.json() as Promise<T>;
}

// ─── User ─────────────────────────────────────────────────────────────────────
export interface MeliUser {
  id: number;
  nickname: string;
  email: string;
  site_id: string;
}

export const meliApi = {
  // ─── Items ─────────────────────────────────────────────────────────────────
  createItem: (payload: MeliItemPayload) =>
    meliRequest<MeliItemResponse>('POST', '/items', payload),

  updateItem: (itemId: string, payload: Partial<MeliItemPayload>) =>
    meliRequest<MeliItemResponse>('PUT', `/items/${itemId}`, payload),

  getItem: (itemId: string) =>
    meliRequest<MeliItemDetail>('GET', `/items/${itemId}`),

  /** Total visits per item in a date range (multi-get, up to ~50 ids) */
  getItemsVisits: (itemIds: string[], dateFrom: string, dateTo: string) => {
    const ids = itemIds.join(',');
    return meliRequest<MeliVisitsEntry[]>(
      'GET',
      `/items/visits?ids=${ids}&date_from=${dateFrom}&date_to=${dateTo}`,
    );
  },

  /** Up to 20 IDs per request (MeLi limit) */
  getItemsByIds: (itemIds: string[]) => {
    const ids = itemIds.join(',');
    const attrs =
      'id,title,status,sub_status,tags,permalink,price,available_quantity,health';
    return meliRequest<MeliMultigetEntry[]>(
      'GET',
      `/items?ids=${ids}&attributes=${attrs}`,
    );
  },

  pauseItem: (itemId: string) =>
    meliRequest<MeliItemResponse>('PUT', `/items/${itemId}`, { status: 'paused' }),

  closeItem: (itemId: string) =>
    meliRequest<MeliItemResponse>('PUT', `/items/${itemId}`, { status: 'closed' }),

  // ─── Orders ────────────────────────────────────────────────────────────────
  getOrder: (orderId: string) =>
    meliRequest<MeliOrderResponse>('GET', `/orders/${orderId}`),

  searchOrders: (sellerId: number, limit = 50) =>
    meliRequest<{ results: MeliOrderResponse[]; paging: { total: number; offset: number; limit: number } }>(
      'GET',
      `/orders/search?seller=${sellerId}&sort=date_desc&limit=${limit}&offset=0`,
    ),

  // ─── Shipments ─────────────────────────────────────────────────────────────
  getShipment: (shipmentId: string) =>
    meliRequest<MeliShipmentResponse>('GET', `/shipments/${shipmentId}`),

  getShipmentLabel: (shipmentId: string) =>
    meliRequest<{ label_url: string }>('GET', `/shipment_labels?shipment_ids=${shipmentId}`),

  // ─── Categories ────────────────────────────────────────────────────────────
  predictCategory: (title: string, siteId = 'MCO') =>
    meliRequest<MeliCategoryPrediction[]>(
      'GET',
      `/sites/${siteId}/domain_discovery/search?q=${encodeURIComponent(title)}`,
    ),

  getCategoryAttributes: (categoryId: string) =>
    meliRequest<MeliCategoryAttribute[]>('GET', `/categories/${categoryId}/attributes`),

  // ─── Account ───────────────────────────────────────────────────────────────
  getMe: () => meliRequest<MeliUser>('GET', '/users/me'),
};

// ─── Payload / Response types ─────────────────────────────────────────────────

export interface MeliItemPayload {
  title: string;
  category_id: string;
  price: number;
  currency_id: string;          // 'COP'
  available_quantity: number;
  buying_mode: string;          // 'buy_it_now'
  condition: string;            // 'new'
  listing_type_id: string;      // 'gold_special' | 'gold_pro'
  description?: { plain_text: string };
  pictures?: { source: string }[];
  attributes?: { id: string; value_name: string }[];
  sale_terms?: { id: string; value_name: string }[];
  shipping?: {
    mode: string;
    local_pick_up: boolean;
    free_shipping: boolean;
  };
}

export interface MeliItemResponse {
  id: string;
  title: string;
  price: number;
  available_quantity: number;
  status: string;
  permalink: string;
}

/** Full item payload from GET /items/{id} or multiget body */
export interface MeliItemDetail {
  id: string;
  title: string;
  price: number;
  available_quantity: number;
  status: string;
  sub_status?: string[];
  tags?: string[];
  permalink?: string;
  health?: number | null;
}

type MeliMultigetEntry = {
  code: number;
  body: MeliItemDetail | null;
};

export type MeliVisitsEntry = {
  item_id: string;
  total_visits?: number;
};

export interface MeliOrderResponse {
  id: number;
  status: string;
  date_created: string;
  buyer: { id: number; nickname: string; email: string };
  order_items: Array<{
    item: { id: string; title: string };
    quantity: number;
    unit_price: number;
  }>;
  total_amount: number;
  currency_id: string;
  shipping?: { id: number; status: string };
  payments?: Array<{ id: number; status: string; payment_method_id: string }>;
  tags?: string[];
}

export interface MeliShipmentResponse {
  id: number;
  status: string;
  tracking_number?: string;
  receiver_address?: {
    city: { name: string };
    state: { name: string };
    street_name: string;
    street_number: string;
    zip_code: string;
    receiver_name: string;
    receiver_phone: string;
  };
}

export interface MeliCategoryPrediction {
  domain_id: string;
  domain_name: string;
  category_id: string;
  category_name: string;
}

export interface MeliCategoryAttribute {
  id: string;
  name: string;
  value_type: string;   // 'string' | 'number' | 'list' | 'boolean' | ...
  tags: {
    required?: boolean;
    hidden?: boolean;
    read_only?: boolean;
    variation_attribute?: boolean;
  };
  allowed_units?: { id: string; name: string }[];
  values?: { id: string; name: string }[];
}
