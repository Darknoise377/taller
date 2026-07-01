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

const MAX_CAROUSEL_IMAGES = 10;

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
  mediaUrls: string | string[],
  caption: string,
  isVideo?: boolean
): Promise<string | null> {
  const urls = Array.isArray(mediaUrls) ? mediaUrls.slice(0, MAX_CAROUSEL_IMAGES) : [mediaUrls];

  if (isVideo) {
    const params = new URLSearchParams({ access_token: pageAccessToken, description: caption, source: urls[0] });
    const res = await fetch(`${GRAPH_BASE}/${pageId}/videos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
    });
    const data = await res.json();
    if (isMetaError(data)) {
      console.error('Facebook video publish error:', data.error);
      return null;
    }
    return (data as FacebookPostResponse).id;
  }

  if (urls.length === 1) {
    const params = new URLSearchParams({ access_token: pageAccessToken, message: caption, url: urls[0] });
    const res = await fetch(`${GRAPH_BASE}/${pageId}/photos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
    });
    const data = await res.json();
    if (isMetaError(data)) {
      console.error('Facebook photo publish error:', data.error);
      return null;
    }
    return (data as FacebookPostResponse).id;
  }

// Carousel
   const childIds: string[] = [];
   for (const url of urls) {
     console.log('[carousel] Creating unpublished photo for URL:', url);
     const photoParams = new URLSearchParams({ access_token: pageAccessToken, published: 'false', url });
     const photoRes = await fetch(`${GRAPH_BASE}/${pageId}/photos`, {
       method: 'POST',
       headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
       body: photoParams.toString(),
     });
     const photoData = await photoRes.json();
     console.log('[carousel] Photo response:', JSON.stringify(photoData));
     if (isMetaError(photoData) || !photoData.id) {
       console.error('Carousel photo error or missing ID:', photoData);
       // Fallback: publish just the first image
       console.log('[carousel] Falling back to single image publish');
       const fallbackParams = new URLSearchParams({ access_token: pageAccessToken, message: caption, url: urls[0] });
       const fallbackRes = await fetch(`${GRAPH_BASE}/${pageId}/photos`, {
         method: 'POST',
         headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
         body: fallbackParams.toString(),
       });
       const fallbackData = await fallbackRes.json();
       if (isMetaError(fallbackData)) {
         console.error('Fallback single image error:', fallbackData.error);
         return null;
       }
       return (fallbackData as FacebookPostResponse).id;
     }
     childIds.push(photoData.id);
   }

   console.log('[carousel] Created', childIds.length, 'child IDs:', childIds);

   // Facebook carousel requires attached_media as JSON array with specific format
   const attachedMediaArray = childIds.map(id => ({ media_fbid: id }));
   const carouselEndpoint = `${GRAPH_BASE}/${pageId}/feed?access_token=${pageAccessToken}`;
   console.log('[carousel] Making carousel request to:', carouselEndpoint);

   const res = await fetch(carouselEndpoint, {
     method: 'POST',
     headers: { 'Content-Type': 'application/json' },
     body: JSON.stringify({
       message: caption,
       attached_media: attachedMediaArray,
     }),
   });

   const data = await res.json();
   console.log('[carousel] Feed response:', JSON.stringify(data));
   if (isMetaError(data) || !data.id) {
     console.error('Facebook carousel error, falling back to single:', data);
     // Fallback: publish just the first image
     const fallbackParams = new URLSearchParams({ access_token: pageAccessToken, message: caption, url: urls[0] });
     const fallbackRes = await fetch(`${GRAPH_BASE}/${pageId}/photos`, {
       method: 'POST',
       headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
       body: fallbackParams.toString(),
     });
     const fallbackData = await fallbackRes.json();
     if (isMetaError(fallbackData)) {
       console.error('Fallback single image error:', fallbackData.error);
       return null;
     }
     return (fallbackData as FacebookPostResponse).id;
   }
   return data.id;
 }

export async function createInstagramMediaContainer(
  pageAccessToken: string,
  instagramAccountId: string,
  mediaUrls: string | string[],
  caption: string,
  isVideo?: boolean
): Promise<string | null> {
  const urls = Array.isArray(mediaUrls) ? mediaUrls.slice(0, MAX_CAROUSEL_IMAGES) : [mediaUrls];

  if (isVideo) {
    const params = new URLSearchParams({ access_token: pageAccessToken, video_url: urls[0], caption, media_type: 'VIDEO' });
    const res = await fetch(`${GRAPH_BASE}/${instagramAccountId}/media`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
    });
    const data = await res.json();
    if (isMetaError(data)) {
      console.error('Instagram video error:', data.error);
      return null;
    }
    return (data as InstagramContainerResponse).id;
  }

  if (urls.length === 1) {
    const params = new URLSearchParams({ access_token: pageAccessToken, image_url: urls[0], caption });
    const res = await fetch(`${GRAPH_BASE}/${instagramAccountId}/media`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
    });
    const data = await res.json();
    if (isMetaError(data)) {
      console.error('Instagram container error:', data.error);
      return null;
    }
    return (data as InstagramContainerResponse).id;
  }

// Carousel
   const childIds: string[] = [];
   for (const url of urls) {
     const childParams = new URLSearchParams({
       access_token: pageAccessToken,
       image_url: url,
       is_carousel_item: 'true',
     });
     const childRes = await fetch(`${GRAPH_BASE}/${instagramAccountId}/media`, {
       method: 'POST',
       headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
       body: childParams.toString(),
     });
     const childData = await childRes.json();
     console.log('[ig-carousel] Child response:', JSON.stringify(childData));
     if (isMetaError(childData)) {
       console.error('Instagram carousel child error:', childData.error);
       return null;
     }
     childIds.push((childData as InstagramContainerResponse).id);
   }

   console.log('[ig-carousel] Created', childIds.length, 'child IDs, now creating main container');

   const mainParams = new URLSearchParams({
     access_token: pageAccessToken,
     caption,
     media_type: 'CAROUSEL',
   });
   childIds.forEach(id => mainParams.append('children', id));

   const mainRes = await fetch(`${GRAPH_BASE}/${instagramAccountId}/media`, {
     method: 'POST',
     headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
     body: mainParams.toString(),
   });
   const mainData = await mainRes.json();
   console.log('[ig-carousel] Main container response:', JSON.stringify(mainData));

   if (isMetaError(mainData)) {
     console.error('Instagram carousel container error:', mainData.error);
     return null;
   }

   return (mainData as InstagramContainerResponse).id;
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
    metric: 'engagement,reactions,comments,shares,reach,impressions',
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