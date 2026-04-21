export interface Env {
  R2_BUCKET?: R2Bucket;
  R2_PUBLIC_DOMAIN?: string;
}

export const onRequestGet: PagesFunction<Env> = async ({ env }) => {
  return new Response(
    JSON.stringify({
      status: 'ok',
      timestamp: new Date().toISOString(),
      r2Configured: Boolean(env.R2_BUCKET),
      publicDomainConfigured: Boolean(env.R2_PUBLIC_DOMAIN),
    }),
    {
      headers: {
        'content-type': 'application/json; charset=utf-8',
        'cache-control': 'no-store',
      },
    },
  );
};
