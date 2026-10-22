import { NextResponse } from 'next/server';
import { getSupabasePublicEnv } from '@/lib/supabase/config';

export async function GET() {
  const pub = getSupabasePublicEnv();
  const hasServiceRoleKey = Boolean((process.env.SUPABASE_SERVICE_ROLE_KEY ?? '').trim());

  return NextResponse.json({
    app: 'Forma360',
    ok: true,
    timestamp: new Date().toISOString(),
    defaultTimezone: process.env.NEXT_PUBLIC_DEFAULT_TIMEZONE ?? 'Europe/Madrid',
    supabase: {
      configured: pub.isConfigured,
      hasPublicUrl: Boolean(pub.url),
      hasAnonKey: Boolean(pub.anonKey),
      hasServerAdminDeleteCapability: hasServiceRoleKey,
      progressBucket: pub.bucketName,
      activeMode: pub.isConfigured ? 'supabase_cloud' : 'local_browser_explicit_demo',
      missingEnvVars: [
        ...(!pub.url ? ['NEXT_PUBLIC_SUPABASE_URL'] : []),
        ...(!pub.anonKey ? ['NEXT_PUBLIC_SUPABASE_ANON_KEY'] : []),
      ],
    },
    futureIntegrationsStatus: {
      healthConnectOrAppleHealth: {
        active: false,
        status: 'architecture_ready_requires_native_bridge_or_csv_export',
      },
      externalAiServices: {
        active: false,
        privacyGuarantee: 'No health data is transmitted to external AI APIs.',
      },
    },
  });
}
