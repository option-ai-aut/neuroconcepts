import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json({
    apiUrl: process.env.NEXT_PUBLIC_API_URL || '',
    userPoolId: process.env.NEXT_PUBLIC_USER_POOL_ID || '',
    userPoolClientId: process.env.NEXT_PUBLIC_USER_POOL_CLIENT_ID || '',
    awsRegion: process.env.NEXT_PUBLIC_AWS_REGION || 'eu-central-1',
  });
}
