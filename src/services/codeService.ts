// Tipos básicos (puedes mejorarlos importando desde @prisma/client si configuras bien tu proyecto)
interface SellerData {
  name: string;
  code: string;
}

interface PromotionData {
  code: string;
  description: string;
  discount: number; // Porcentaje (ej. 10 para 10%)
  isActive?: boolean;
}

/**
 * Obtiene todos los vendedores y promociones.
 * Llama a: GET /api/codes
 */
export const getAllCodes = async () => {
  const res = await fetch("/api/codes");
  if (!res.ok) throw new Error("Error al obtener los códigos");
  return res.json();
};

// --- Vendedores (Sellers) ---

/**
 * Crea un nuevo vendedor.
 * Llama a: POST /api/codes/seller
 */
export const createSeller = async (data: SellerData) => {
  const res = await fetch("/api/codes/seller", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Error al crear el vendedor");
  return res.json();
};

/**
 * Elimina un vendedor.
 * Llama a: DELETE /api/codes/seller
 */
export const deleteSeller = async (id: string) => {
  const res = await fetch("/api/codes/seller", {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id }), // Tu API espera el ID en el body
  });
  if (!res.ok) throw new Error("Error al eliminar el vendedor");
  return res.json();
};

// --- Promociones (Promotions) ---

/**
 * Crea una nueva promoción.
 * Llama a: POST /api/codes/promotion
 */
export const createPromotion = async (data: PromotionData) => {
  const res = await fetch("/api/codes/promotion", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Error al crear la promoción");
  return res.json();
};

/**
 * Elimina una promoción.
 * Llama a: DELETE /api/codes/promotion
 */
export const deletePromotion = async (id: string) => {
  const res = await fetch("/api/codes/promotion", {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id }),
  });
  if (!res.ok) throw new Error("Error al eliminar la promoción");
  return res.json();
};

// --- Updates ---

export const updateSeller = async (id: string, data: Partial<SellerData>) => {
  const res = await fetch("/api/codes/seller", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id, ...data }),
  });
  if (!res.ok) throw new Error("Error al actualizar el vendedor");
  return res.json();
};

export const updatePromotion = async (id: string, data: Partial<PromotionData>) => {
  const res = await fetch("/api/codes/promotion", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id, ...data }),
  });
  if (!res.ok) throw new Error("Error al actualizar la promoción");
  return res.json();
};