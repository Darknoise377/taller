/**
 * Verification script for P0 security fixes.
 * Run with: node --import tsx tests/verify-security.ts
 */

import { config } from "dotenv";
config({ path: ".env.local" });

// ─── 1. JWT secret separation ────────────────────────────────────────────────
async function verifyJwt() {
  const { signAdminToken, verifyAdminToken, signCustomerToken, verifyCustomerToken } =
    await import("../src/lib/auth/jwt");

  console.log("\n── JWT secrets ──────────────────────────────────────");

  // Sign admin token
  const adminToken = await signAdminToken({
    email: "test@admin.com",
    userId: "uuid-admin-1",
    role: "ADMIN",
    name: "Test Admin",
  });

  // Sign customer token
  const customerToken = await signCustomerToken({
    email: "test@customer.com",
    userId: "uuid-customer-1",
    name: "Test Customer",
  });

  // Admin token should verify as admin
  const adminPayload = await verifyAdminToken(adminToken);
  console.log("✅ Admin token verified:", adminPayload.sub, "role:", adminPayload.role);

  // Customer token should verify as customer
  const customerPayload = await verifyCustomerToken(customerToken);
  console.log("✅ Customer token verified:", customerPayload.sub, "type:", customerPayload.tokenType);

  // Customer token MUST NOT be accepted by admin verifier (key mismatch)
  let crossVerifyFailed = false;
  try {
    await verifyAdminToken(customerToken);
    console.log("❌ SECURITY ISSUE: Customer token accepted by admin verifier!");
  } catch {
    crossVerifyFailed = true;
    console.log("✅ Cross-token attack blocked: customer token rejected by admin verifier");
  }

  // Admin token MUST NOT be accepted by customer verifier
  try {
    await verifyCustomerToken(adminToken);
    console.log("❌ SECURITY ISSUE: Admin token accepted by customer verifier!");
  } catch {
    if (crossVerifyFailed) {
      console.log("✅ Cross-token attack blocked: admin token rejected by customer verifier");
    }
  }
}

// ─── 2. Upstash rate limiter detection ───────────────────────────────────────
async function verifyRateLimit() {
  console.log("\n── Rate limiter ──────────────────────────────────────");

  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (url && token) {
    console.log("✅ Upstash env vars present — Redis backend will be used in production");
    console.log("   URL:", url.slice(0, 40) + "...");
  } else {
    console.log("⚠️  Upstash env vars NOT set — using in-memory fallback (OK for local dev)");
    console.log("   Add UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN to .env.local to test Redis locally");
  }

  // Functional test with in-memory fallback
  const { rateLimit } = await import("../src/lib/rateLimit");
  const fakeReq = new Request("http://localhost/test", {
    headers: { "x-forwarded-for": "1.2.3.4" },
  });

  const r1 = await rateLimit(fakeReq, { keyPrefix: "test-verify", windowMs: 5000, max: 3 });
  const r2 = await rateLimit(fakeReq, { keyPrefix: "test-verify", windowMs: 5000, max: 3 });
  const r3 = await rateLimit(fakeReq, { keyPrefix: "test-verify", windowMs: 5000, max: 3 });
  const r4 = await rateLimit(fakeReq, { keyPrefix: "test-verify", windowMs: 5000, max: 3 });

  if (r1.ok && r2.ok && r3.ok && !r4.ok) {
    console.log("✅ Rate limiter works: 3 requests allowed, 4th blocked (429)");
  } else {
    console.log("❌ Rate limiter behavior unexpected:", { r1: r1.ok, r2: r2.ok, r3: r3.ok, r4: r4.ok });
  }
}

// ─── 3. AuditLog model presence ──────────────────────────────────────────────
async function verifyAuditLog() {
  console.log("\n── AuditLog ──────────────────────────────────────────");

  const { PrismaClient } = await import("@prisma/client");
  const prisma = new PrismaClient();

  try {
    const count = await prisma.auditLog.count();
    console.log(`✅ AuditLog table exists in DB — ${count} rows so far`);
  } catch (err) {
    console.log("❌ AuditLog table not found in DB:", err);
  } finally {
    await prisma.$disconnect();
  }
}

// ─── Run all ─────────────────────────────────────────────────────────────────
(async () => {
  try {
    await verifyJwt();
    await verifyRateLimit();
    await verifyAuditLog();
    console.log("\n── Done ──────────────────────────────────────────────\n");
  } catch (err) {
    console.error("Unexpected error:", err);
    process.exit(1);
  }
})();
