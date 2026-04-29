export type AdminRole = "ADMIN" | "SUPERADMIN";

export interface AdminSessionUser {
  id: string;
  email: string;
  role: AdminRole;
  name?: string | null;
}
