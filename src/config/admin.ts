export const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "";
// ADMIN_PASSWORD removed — never export secrets; login reads hashed password from DB
export const JWT_SECRET = process.env.JWT_SECRET || "";
export const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "7d"; // 7 days
export const COOKIE_NAME = process.env.COOKIE_NAME || "admin_token";