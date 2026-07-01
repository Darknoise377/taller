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
  const urls = (Array.isArray(mediaUrls) ? mediaUrls : [mediaUrls])
    .filter((u): u is string => typeof u === 'string' && u.startsWith('http'))
    .slice(0, MAX_CAROUSEL_IMAGES);

  if (urls.length === 0) {
    console.error('[publishToFacebook] No valid image URLs provided');
    return null;
  }

  // Fix: use file_url (not source) for URL-based video uploads
  if (isVideo) {
    const params = new URLSearchParams({ access_token: pageAccessToken, description: caption, file_url: urls[0] });
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

  // Download the image from Cloudinary on the server and upload binary to Facebook.
  // This avoids silent failures that occur when Facebook's crawler can't fetch
  // Cloudinary CDN URLs (returning an ID but an empty/broken photo).
  const uploadAsBinary = async (url: string, published: boolean, message?: string): Promise<string | null> => {
    try {
      const imgRes = await fetch(url);
      if (!imgRes.ok) {
        console.warn('[fb-photo] Could not download image:', url, imgRes.status);
        return null;
      }
      const buffer = await imgRes.arrayBuffer();
      const contentType = imgRes.headers.get('content-type') || 'image/jpeg';

      const fd = new FormData();
      fd.append('access_token', pageAccessToken);
      fd.append('published', String(published));
      fd.append('source', new Blob([buffer], { type: contentType }), 'photo.jpg');
      if (message) fd.append('message', message);

      const r = await fetch(`${GRAPH_BASE}/${pageId}/photos`, { method: 'POST', body: fd });
      const d = await r.json();
      if (isMetaError(d) || !(d as FacebookPostResponse).id) {
        console.error('[fb-photo] Binary upload failed:', d);
        return null;
      }
      return (d as FacebookPostResponse).id;
    } catch (err) {
      console.error('[fb-photo] Error uploading photo:', err);
      return null;
    }
  };

  if (urls.length === 1) {
    // Single image — upload binary with caption
    const id = await uploadAsBinary(urls[0], true, caption);
    if (id) return id;

    // Fallback: URL-based upload
    console.warn('[fb-photo] Binary upload failed, trying URL fallback');
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

  // Multiple images — upload all concurrently as unpublished, then attach to a feed post
  console.log('[carousel] Uploading', urls.length, 'photos as binary');
  const uploadResults = await Promise.all(urls.map(url => uploadAsBinary(url, false)));
  const childIds = uploadResults.filter((id): id is string => id !== null);
  console.log('[carousel] Uploaded', childIds.length, '/', urls.length, 'photos successfully');

  if (childIds.length === 0) {
    // All binary uploads failed — try URL approach for first image
    console.warn('[carousel] All uploads failed, falling back to URL single-image publish');
    const params = new URLSearchParams({ access_token: pageAccessToken, message: caption, url: urls[0] });
    const res = await fetch(`${GRAPH_BASE}/${pageId}/photos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
    });
    const data = await res.json();
    if (isMetaError(data)) {
      console.error('Fallback single image error:', data.error);
      return null;
    }
    return (data as FacebookPostResponse).id;
  }

  // Use attached_media for 1 or more successfully uploaded photos
  const attachedMediaArray = childIds.map(id => ({ media_fbid: id }));
  console.log('[carousel] Creating feed post with', childIds.length, 'attached photos');

  const res = await fetch(`${GRAPH_BASE}/${pageId}/feed`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message: caption,
      attached_media: attachedMediaArray,
      access_token: pageAccessToken,
    }),
  });

  const data = await res.json();
  console.log('[carousel] Feed response:', JSON.stringify(data));

  if (isMetaError(data) || !(data as FacebookPostResponse).id) {
    console.error('[carousel] Feed post failed:', data);
    // Final fallback: publish first image via URL
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

  return (data as FacebookPostResponse).id;
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

interface PostFieldsResponse {
  likes?: { summary?: { total_count?: number } };
  comments?: { summary?: { total_count?: number } };
  shares?: { count?: number };
}

export async function fetchPostInsights(
  pageAccessToken: string,
  postId: string
): Promise<Record<string, number> | null> {
  const params = new URLSearchParams({
    access_token: pageAccessToken,
    fields: 'likes.summary(true),comments.summary(true),shares',
  });

  const res = await fetch(`${GRAPH_BASE}/${postId}?${params}`);
  const data = await res.json();

  if (isMetaError(data)) {
    // Post may not exist or token lacks permission — fail silently
    return null;
  }

  const fields = data as PostFieldsResponse;
  return {
    like: fields.likes?.summary?.total_count || 0,
    comments: fields.comments?.summary?.total_count || 0,
    shares: fields.shares?.count || 0,
  };
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