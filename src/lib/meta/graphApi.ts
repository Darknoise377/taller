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
  mediaUrl: string,
  caption: string,
  isVideo?: boolean
): Promise<string | null> {
  const params = new URLSearchParams({
    access_token: pageAccessToken,
  });

  let endpoint: string;
  if (isVideo) {
    params.append('description', caption);
    params.append('source', mediaUrl);
    endpoint = `${GRAPH_BASE}/${pageId}/videos`;
  } else {
    params.append('message', caption);
    params.append('url', mediaUrl);
    endpoint = `${GRAPH_BASE}/${pageId}/photos`;
  }

  const res = await fetch(endpoint, {
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

interface PostInsightsResponse {
  data: Array<{
    name: string;
    values: Array<{ value: unknown }>;
  }>;
}

export async function fetchPostInsights(
  pageAccessToken: string,
  postId: string
): Promise<Record<string, number> | null> {
  const params = new URLSearchParams({
    access_token: pageAccessToken,
    metric: 'engagement,like,count,reactions,comments,shares,reach,impressions',
  });

  const res = await fetch(`${GRAPH_BASE}/${postId}/insights?${params}`);
  const data = await res.json();

  if (isMetaError(data)) {
    console.error('Post insights error:', data.error);
    return null;
  }

  const insights: Record<string, number> = {};
  for (const item of (data as PostInsightsResponse).data) {
    insights[item.name] = (item.values[0]?.value as number) || 0;
  }
  return insights;
}

export async function editFacebookPost(
  pageAccessToken: string,
  postId: string,
  caption: string
): Promise<boolean> {
  const params = new URLSearchParams({
    access_token: pageAccessToken,
    message: caption,
  });

  const res = await fetch(`${GRAPH_BASE}/${postId}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params.toString(),
  });

  const data = await res.json();
  if (isMetaError(data)) {
    console.error('Edit post error:', data.error);
    return false;
  }
  return true;
}