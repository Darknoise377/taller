// src/lib/email/authEmails.ts
import { Resend } from "resend";

let _resend: Resend | null = null;
function getResend(): Resend | null {
  if (!process.env.RESEND_API_KEY) return null;
  if (!_resend) _resend = new Resend(process.env.RESEND_API_KEY);
  return _resend;
}

const FREE_DOMAINS = ["gmail.com", "hotmail.com", "outlook.com", "yahoo.com", "live.com"];
const _fromRaw =
  process.env.RESEND_FROM_EMAIL || "Motoservicio A&R <noreply@tallerar.com>";
const _fromDomain =
  (_fromRaw.match(/@([\w.-]+)>?/) ?? [])[1]?.toLowerCase() ?? "";
const FROM_EMAIL = _fromRaw;

function isEmailConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY) && !FREE_DOMAINS.includes(_fromDomain);
}

// ── Password Reset Email ─────────────────────────────────────────────────────

export async function sendPasswordResetEmail(
  to: string,
  name: string | null,
  resetUrl: string,
): Promise<void> {
  const resend = getResend();
  if (!resend || !isEmailConfigured()) {
    console.warn(
      "[AuthEmail] Email no configurado. URL de reset:",
      resetUrl,
    );
    return;
  }

  const displayName = name ?? "Cliente";

  await resend.emails.send({
    from: FROM_EMAIL,
    to,
    subject: "Recupera tu contraseña — Motoservicio A&R",
    html: `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Recuperar contraseña</title>
</head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:32px 16px;">
    <tr>
      <td align="center">
        <table width="100%" style="max-width:520px;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">

          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#050F2C,#0A2A66);padding:28px 32px;text-align:center;">
              <p style="margin:0;font-size:22px;font-weight:800;color:#ffffff;letter-spacing:-0.5px;">
                Motoservicio A&amp;R
              </p>
              <p style="margin:6px 0 0;font-size:13px;color:#9DC0E8;">
                Repuestos y servicio técnico
              </p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:32px 32px 24px;">
              <h1 style="margin:0 0 8px;font-size:20px;font-weight:700;color:#0A2A66;">
                Recupera tu contraseña
              </h1>
              <p style="margin:0 0 20px;font-size:15px;color:#374151;line-height:1.6;">
                Hola <strong>${displayName}</strong>, recibimos una solicitud para restablecer la contraseña de tu cuenta.
              </p>
              <p style="margin:0 0 24px;font-size:14px;color:#6b7280;line-height:1.6;">
                Haz clic en el botón de abajo para crear una nueva contraseña. Este enlace es válido por <strong>1 hora</strong>.
              </p>

              <!-- CTA Button -->
              <table cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td align="center">
                    <a href="${resetUrl}"
                       style="display:inline-block;padding:13px 32px;background:#0A2A66;color:#ffffff;text-decoration:none;border-radius:8px;font-size:15px;font-weight:600;letter-spacing:0.2px;">
                      Restablecer contraseña
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin:24px 0 0;font-size:13px;color:#9ca3af;line-height:1.5;">
                Si no solicitaste este cambio, ignora este correo. Tu contraseña no será modificada.
              </p>
              <p style="margin:12px 0 0;font-size:12px;color:#d1d5db;word-break:break-all;">
                Enlace directo: <a href="${resetUrl}" style="color:#6b7280;">${resetUrl}</a>
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#f9fafb;border-top:1px solid #e5e7eb;padding:16px 32px;text-align:center;">
              <p style="margin:0;font-size:12px;color:#9ca3af;">
                © ${new Date().getFullYear()} Motoservicio A&R · Colombia
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `.trim(),
  });
}
