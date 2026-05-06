export type AdminRole = "SUPERADMIN" | "ADMIN" | "VENDEDOR";

export interface AdminSessionUser {
  id: string;
  email: string;
  role: AdminRole;
  name?: string | null;
}

export interface CustomerUser {
  id: string;
  email: string;
  name?: string | null;
}
