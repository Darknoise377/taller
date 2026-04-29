import { SignJWT, importPKCS8 } from 'jose';

type VertexAccessTokenResponse = {
  access_token: string;
};

export function getVertexModelEndpoint(model: string, projectId: string, location: string) {
  const safeModel = model.includes('/') ? model : `models/${model}`;
  return `https://${location}-aiplatform.googleapis.com/v1/projects/${projectId}/locations/${location}/publishers/google/${safeModel}:generateContent`;
}

export async function getVertexAccessToken(): Promise<string> {
  const staticToken = process.env.GCP_ACCESS_TOKEN ?? process.env.VERTEX_ACCESS_TOKEN;
  if (staticToken) return staticToken;

  let clientEmail: string | undefined;
  let privateKeyPem: string | undefined;
  let projectId: string | undefined;

  // Prefer full service account JSON if provided
  if (process.env.VERTEX_SA_JSON || process.env.VERTEX_SA_JSON_BASE64) {
    const raw = process.env.VERTEX_SA_JSON ?? (process.env.VERTEX_SA_JSON_BASE64 ? Buffer.from(process.env.VERTEX_SA_JSON_BASE64, 'base64').toString('utf-8') : null);
    if (raw) {
      try {
        const sa: any = JSON.parse(raw);
        clientEmail = sa.client_email;
        privateKeyPem = sa.private_key;
        projectId = sa.project_id;
      } catch (e) {
        // ignore
      }
    }
  }

  clientEmail = clientEmail ?? process.env.GCP_CLIENT_EMAIL ?? process.env.VERTEX_CLIENT_EMAIL;
  privateKeyPem = privateKeyPem ?? process.env.GCP_PRIVATE_KEY ?? process.env.VERTEX_PRIVATE_KEY;
  projectId = projectId ?? process.env.VERTEX_PROJECT_ID;

  if (!clientEmail || !privateKeyPem) {
    throw new Error('Configura GCP_CLIENT_EMAIL y GCP_PRIVATE_KEY o VERTEX_SA_JSON en las variables de entorno');
  }

  // ensure proper newlines
  privateKeyPem = privateKeyPem.replace(/\\n/g, '\n');

  const alg = 'RS256';
  const key = await importPKCS8(privateKeyPem, alg);

  const jwt = await new SignJWT({ scope: 'https://www.googleapis.com/auth/cloud-platform' })
    .setIssuer(clientEmail)
    .setSubject(clientEmail)
    .setAudience('https://oauth2.googleapis.com/token')
    .setIssuedAt()
    .setExpirationTime('1h')
    .sign(key);

  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }),
  });

  if (!tokenRes.ok) {
    const err = await tokenRes.text();
    throw new Error(`Error obteniendo access token de Google: ${err}`);
  }

  const tokenData = (await tokenRes.json()) as VertexAccessTokenResponse;
  return tokenData.access_token;
}
