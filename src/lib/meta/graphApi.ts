interface MetaErrorResponse {
  error: {
    message: string;
    type: string;
    code: number;
    fbtrace_id: string;
  };
}

interface PageTokenResponse {
  data: Array<{
    access_token: string;
    id: string;
    name: string;
  }>;
}

interface InstagramAccountResponse {
  data: Array<{
    id: string;
  }>;
}

interface FacebookPostResponse {
  id: string;
}

interface InstagramContainerResponse {
  id: string;
}

const APP_ID = process.env.META_APP_ID;
const APP_SECRET = process.env.META_APP_SECRET;
const GRAPH_API_VERSION = process.env.META_GRAPH_VERSION ?? 'v22.0';
const GRAPH_BASE = `https://graph.facebook.com/${GRAPH_API_VERSION}`;

function isMetaError(data: unknown): data is MetaErrorResponse {
  return (
    typeof data === 'object' &&
    data !== null &&
    'error' in data &&
    typeof (data as MetaErrorResponse).error.code === 'number'
  );
}

export async function exchangeForLongLivedToken(
  shortLivedToken: string
): Promise<{ accessToken: string; expiresAt: Date } | null> {
  const params = new URLSearchParams({
    grant_type: 'fb_exchange_token',
    client_id: APP_ID!,
    client_secret: APP_SECRET!,
    fb_exchange_token: shortLivedToken,
  });

  const res = await fetch(`${GRAPH_BASE}/oauth/access_token?${params}`);

  if (!res.ok) {
    console.error('Failed to exchange token:', await res.text());
    return null;
  }

  const data = await res.json();
  return {
    accessToken: data.access_token,
    expiresAt: new Date(Date.now() + (data.expires_in || 5184000) * 1000),
  };
}

export async function fetchPageTokens(
  userAccessToken: string
): Promise<Array<{ pageId: string; pageAccessToken: string; pageName: string }> | null> {
  const params = new URLSearchParams({
    access_token: userAccessToken,
  });

  const res = await fetch(
    `${GRAPH_BASE}/me/accounts?${params}`
  );

  if (!res.ok) {
    console.error('Failed to fetch pages:', await res.text());
    return null;
  }

  const data: PageTokenResponse = await res.json();
  return data.data.map((page) => ({
    pageId: page.id,
    pageAccessToken: page.access_token,
    pageName: page.name,
  }));
}

export async function fetchInstagramAccountId(
  pageAccessToken: string,
  pageId: string
): Promise<string | null> {
  const params = new URLSearchParams({
    access_token: pageAccessToken,
  });

  const res = await fetch(
    `${GRAPH_BASE}/${pageId}?fields=instagram_business_account&${params}`
  );

  if (!res.ok) {
    console.error('Failed to fetch Instagram account:', await res.text());
    return null;
  }

  const data: InstagramAccountResponse = await res.json();
  return data.data?.[0]?.id ?? null;
}

export async function publishToFacebook(
  pageAccessToken: string,
  pageId: string,
  photoUrl: string,
  caption: string
): Promise<string | null> {
  const params = new URLSearchParams({
    access_token: pageAccessToken,
    message: caption,
    url: photoUrl,
  });

  const res = await fetch(`${GRAPH_BASE}/${pageId}/photos`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params.toString(),
  });

  const data = await res.json();

  if (isMetaError(data)) {
    console.error('Facebook publish error:', data.error);
    return null;
  }

  return (data as FacebookPostResponse).id;
}

export async function createInstagramMediaContainer(
  pageAccessToken: string,
  instagramAccountId: string,
  photoUrl: string,
  caption: string
): Promise<string | null> {
  const params = new URLSearchParams({
    image_url: photoUrl,
    caption: caption,
    access_token: pageAccessToken,
  });

  const res = await fetch(
    `${GRAPH_BASE}/${instagramAccountId}/media`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    }
  );

  const data = await res.json();

  if (isMetaError(data)) {
    console.error('Instagram container error:', data.error);
    return null;
  }

  return (data as InstagramContainerResponse).id;
}

export async function publishInstagramContainer(
  pageAccessToken: string,
  instagramAccountId: string,
  creationId: string
): Promise<string | null> {
  const params = new URLSearchParams({
    creation_id: creationId,
    access_token: pageAccessToken,
  });

  const res = await fetch(
    `${GRAPH_BASE}/${instagramAccountId}/media_publish`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    }
  );

  const data = await res.json();

  if (isMetaError(data)) {
    console.error('Instagram publish error:', data.error);
    return null;
  }

  return (data as InstagramContainerResponse).id;
}

export function isTokenInvalidError(errorCode: number): boolean {
  return errorCode === 190;
}