export interface Env {
  R2_BUCKET: R2Bucket;
  R2_PUBLIC_DOMAIN?: string;
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
    },
  });

const sanitizeFilename = (name: string) =>
  name
    .normalize('NFKC')
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .replace(/_+/g, '_');

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  try {
    if (!env.R2_BUCKET) {
      return json({ error: 'R2 bucket binding is not configured.' }, 500);
    }

    const formData = await request.formData();
    const file = formData.get('file');

    if (!(file instanceof File)) {
      return json({ error: 'No file uploaded' }, 400);
    }

    const safeName = sanitizeFilename(file.name || 'upload.bin');
    const key = `uploads/${crypto.randomUUID()}-${safeName}`;

    await env.R2_BUCKET.put(key, await file.arrayBuffer(), {
      httpMetadata: {
        contentType: file.type || 'application/octet-stream',
      },
    });

    const publicDomain = (env.R2_PUBLIC_DOMAIN || '').trim().replace(/\/$/, '');
    const publicUrl = publicDomain
      ? `${publicDomain.startsWith('http') ? publicDomain : `https://${publicDomain}`}/${key}`
      : `/${key}`;

    return json({ publicUrl });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown upload error';
    return json({ error: 'Failed to upload to storage', details: message }, 500);
  }
};
