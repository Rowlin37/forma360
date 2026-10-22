export function getSupabasePublicEnv(): {
  url: string;
  anonKey: string;
  bucketName: string;
  isConfigured: boolean;
} {
  const url = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? '').trim();
  const anonKey = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '').trim();
  const bucketName = (process.env.NEXT_PUBLIC_SUPABASE_PROGRESS_BUCKET ?? 'progress-photos').trim();

  const isConfigured =
    url.startsWith('http') &&
    !url.includes('placeholder') &&
    anonKey.length > 20 &&
    !anonKey.includes('placeholder');

  return {
    url,
    anonKey,
    bucketName,
    isConfigured,
  };
}
