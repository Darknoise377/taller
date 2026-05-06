// middleware.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  verifyAdminToken,
  verifyCustomerToken,
  refreshAdminToken,
  getJwtCookieMaxAgeSeconds,
  type AdminTokenPayload,
} from "./lib/auth/jwt";
import { COOKIE_NAME, CUSTOMER_COOKIE_NAME } from "./config/admin";
import type { AdminRole } from "./types/auth";
import { auditSecurityEvent } from "./lib/security/audit";

// ─── Role hierarchy ───────────────────────────────────────────────────────────
const ROLE_RANK: Record<AdminRole, number> = { SUPERADMIN: 3, ADMIN: 2, VENDEDOR: 1 };

type AccessRule = {
  pathPrefix: string;
  methods?: string[];
  requiredRole: AdminRole;
};

const accessRules: AccessRule[] = [
  // SUPERADMIN only
  { pathPrefix: "/api/admin/security-audit", requiredRole: "SUPERADMIN" },
  { pathPrefix: "/admin/security-audit", requiredRole: "SUPERADMIN" },
  { pathPrefix: "/admin/users", requiredRole: "SUPERADMIN" },
  { pathPrefix: "/api/users", requiredRole: "SUPERADMIN" },
  { pathPrefix: "/api/codes", methods: ["POST", "PUT", "DELETE"], requiredRole: "SUPERADMIN" },
  { pathPrefix: "/api/orders/", methods: ["DELETE"], requiredRole: "SUPERADMIN" },
  // ADMIN only (write)
  { pathPrefix: "/api/orders", methods: ["PATCH"], requiredRole: "ADMIN" },
  { pathPrefix: "/api/products", methods: ["POST", "PUT", "DELETE"], requiredRole: "ADMIN" },
  { pathPrefix: "/api/upload", methods: ["POST"], requiredRole: "ADMIN" },
  { pathPrefix: "/api/cart", methods: ["PUT"], requiredRole: "ADMIN" },
  // VENDEDOR and above (read-only)
  { pathPrefix: "/api/orders", methods: ["GET"], requiredRole: "VENDEDOR" },
  { pathPrefix: "/api/codes", methods: ["GET"], requiredRole: "VENDEDOR" },
];

function requiredRoleForRequest(pathname: string, method: string): AdminRole | null {
  const matchedRule = accessRules.find((rule) => {
    if (!pathname.startsWith(rule.pathPrefix)) return false;
    if (!rule.methods) return true;
    return rule.methods.includes(method);
  });

  return matchedRule?.requiredRole ?? null;
}

function hasRequiredRole(role: AdminRole, requiredRole: AdminRole | null): boolean {
  if (!requiredRole) return true;
  return ROLE_RANK[role] >= ROLE_RANK[requiredRole];
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const requestIp = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const userAgent = req.headers.get("user-agent") ?? "unknown";

  // ────────────────────────────────────────────────────────────────────────
  // 🟦 Customer routes (/cuenta)
  // ────────────────────────────────────────────────────────────────────────
  if (pathname.startsWith("/cuenta")) {
    const customerToken = req.cookies.get(CUSTOMER_COOKIE_NAME)?.value;
    let isCustomerAuth = false;

    if (customerToken) {
      try {
        await verifyCustomerToken(customerToken);
        isCustomerAuth = true;
      } catch {
        isCustomerAuth = false;
      }
    }

    const isPublicCustomerPage =
      pathname === "/cuenta/login" || pathname === "/cuenta/registro";

    if (isCustomerAuth && isPublicCustomerPage) {
      return NextResponse.redirect(new URL("/cuenta/pedidos", req.url));
    }
    if (!isCustomerAuth && !isPublicCustomerPage) {
      return NextResponse.redirect(
        new URL(`/cuenta/login?next=${encodeURIComponent(pathname)}`, req.url),
      );
    }

    return NextResponse.next();
  }

  // ────────────────────────────────────────────────────────────────────────
  // 🟥 Admin routes
  // ────────────────────────────────────────────────────────────────────────
  const token = req.cookies.get(COOKIE_NAME)?.value;

  let payload: AdminTokenPayload | null = null;
  let shouldClearCookie = false;

  if (token) {
    try {
      payload = await verifyAdminToken(token);
    } catch {
      payload = null;
      shouldClearCookie = true;
      console.warn("❌ Token inválido o expirado");
    }
  }

  const isAdmin = !!payload;

  // 2️⃣ Panel de administración
  const isAdminRoute = pathname.startsWith("/admin");
  if (isAdminRoute) {
    if (isAdmin && pathname === "/admin/login")
      return NextResponse.redirect(new URL("/admin", req.url));
    if (!isAdmin && pathname !== "/admin/login")
      return NextResponse.redirect(new URL("/admin/login", req.url));

    // Role-based page protection
    if (isAdmin && payload && pathname !== "/admin/login") {
      const requiredRole = requiredRoleForRequest(pathname, req.method);
      if (requiredRole && !hasRequiredRole(payload.role, requiredRole)) {
        return NextResponse.redirect(new URL("/admin?forbidden=1", req.url));
      }
    }
  }

  // 3️⃣ APIs protegidas
  const isCodesValidate = pathname === "/api/codes/validate" && req.method === "GET";
  const isPublicOrdersCreate = pathname === "/api/orders" && req.method === "POST";
  const isPublicOrderStatus = pathname.startsWith("/api/orders/status/") && req.method === "GET";
  const isPublicProductsRead = pathname.startsWith("/api/products") && req.method === "GET";
  const isPublicCartRead = pathname === "/api/cart" && req.method === "GET";

  const isProtectedApi = (
    pathname.startsWith("/api/admin/") ||
    pathname.startsWith("/api/codes") ||
    pathname.startsWith("/api/orders") ||
    pathname.startsWith("/api/users") ||
    pathname.startsWith("/api/products") ||
    pathname.startsWith("/api/upload") ||
    pathname === "/api/cart"
  ) && !(
    pathname === "/api/admin/login" ||
    isPublicOrdersCreate ||
    isPublicOrderStatus ||
    isCodesValidate ||
    isPublicProductsRead ||
    isPublicCartRead
  );

  // Mitigación CSRF
  if (isProtectedApi && ["POST", "PUT", "PATCH", "DELETE"].includes(req.method)) {
    const origin = req.headers.get("origin");
    const host = req.headers.get("host");

    if (!origin || !host) {
      const hasCustomHeader = req.headers.get("x-requested-with") === "XMLHttpRequest";
      if (!hasCustomHeader) {
        return new NextResponse(JSON.stringify({ error: "Forbidden: missing origin" }), {
          status: 403,
          headers: { "content-type": "application/json" },
        });
      }
    } else {
      try {
        const originHost = new URL(origin).host;
        if (originHost !== host) {
          return new NextResponse(JSON.stringify({ error: "Forbidden" }), {
            status: 403,
            headers: { "content-type": "application/json" },
          });
        }
      } catch {
        return new NextResponse(JSON.stringify({ error: "Forbidden" }), {
          status: 403,
          headers: { "content-type": "application/json" },
        });
      }
    }
  }

  if (isProtectedApi && !isAdmin) {
    auditSecurityEvent({
      action: "ACCESS_DENIED",
      path: pathname,
      method: req.method,
      reason: "Unauthenticated request to protected API",
      ip: requestIp,
      userAgent,
    });

    const res = new NextResponse(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "content-type": "application/json" },
    });

    if (shouldClearCookie) {
      res.cookies.set(COOKIE_NAME, "", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        path: "/",
        maxAge: 0,
      });
    }

    return res;
  }

  if (isProtectedApi && payload) {
    const requiredRole = requiredRoleForRequest(pathname, req.method);
    if (!hasRequiredRole(payload.role, requiredRole)) {
      auditSecurityEvent({
        action: "ACCESS_DENIED",
        path: pathname,
        method: req.method,
        actorId: payload.uid,
        actorEmail: payload.sub,
        actorRole: payload.role,
        reason: `Required role: ${requiredRole}`,
        ip: requestIp,
        userAgent,
      });
      return new NextResponse(JSON.stringify({ error: "Forbidden: insufficient role" }), {
        status: 403,
        headers: { "content-type": "application/json" },
      });
    }
  }

  if (isProtectedApi && payload && ["POST", "PUT", "PATCH", "DELETE"].includes(req.method)) {
    auditSecurityEvent({
      action: "SENSITIVE_ACTION",
      path: pathname,
      method: req.method,
      actorId: payload.uid,
      actorEmail: payload.sub,
      actorRole: payload.role,
      ip: requestIp,
      userAgent,
    });
  }

  // 4️⃣ Continuar
  const response = NextResponse.next();
  response.headers.set("Cache-Control", "no-store");

  if (token && isAdmin) {
    const refreshedToken = await refreshAdminToken(token);
    if (refreshedToken && refreshedToken !== token) {
      response.cookies.set(COOKIE_NAME, refreshedToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        path: "/",
        maxAge: getJwtCookieMaxAgeSeconds(),
      });
    }
  }

  if (shouldClearCookie) {
    response.cookies.set(COOKIE_NAME, "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/",
      maxAge: 0,
    });
  }

  return response;
}

export const config = {
  matcher: [
    "/admin/:path*",
    "/cuenta/:path*",
    "/api/admin/:path*",
    "/api/orders/:path*",
    "/api/orders",
    "/api/codes/:path*",
    "/api/codes",
    "/api/products/:path*",
    "/api/products",
    "/api/upload/:path*",
    "/api/upload",
    "/api/users/:path*",
    "/api/users",
    "/api/cart",
  ],
};

