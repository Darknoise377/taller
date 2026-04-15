export type AdminRole = "ADMIN" | "SUPERADMIN";

export interface AdminSessionUser {
  id: number;
  email: string;
  role: AdminRole;
  name?: string | null;
}
