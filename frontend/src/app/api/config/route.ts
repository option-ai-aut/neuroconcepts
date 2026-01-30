import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET() {
  // Use non-NEXT_PUBLIC_ env vars for runtime config
  // NEXT_PUBLIC_ vars are replaced at build time and won't work at runtime
  return NextResponse.json({
    apiUrl: process.env.RUNTIME_API_URL || process.env.NEXT_PUBLIC_API_URL || '',
    userPoolId: process.env.RUNTIME_USER_POOL_ID || process.env.NEXT_PUBLIC_USER_POOL_ID || '',
    userPoolClientId: process.env.RUNTIME_USER_POOL_CLIENT_ID || process.env.NEXT_PUBLIC_USER_POOL_CLIENT_ID || '',
    awsRegion: process.env.RUNTIME_AWS_REGION || process.env.NEXT_PUBLIC_AWS_REGION || 'eu-central-1',
  });
}
