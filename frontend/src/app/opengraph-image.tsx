import { ImageResponse } from 'next/og';
import { readFile } from 'fs/promises';
import { join } from 'path';

export const runtime = 'nodejs';
export const alt = 'Immivo AI — KI-gesteuertes Betriebssystem für Immobilienmakler';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function OGImage() {
  // Read logo file and convert to base64 data URL
  const logoPath = join(process.cwd(), 'public', 'logo-white.png');
  const logoData = await readFile(logoPath);
  const logoBase64 = `data:image/png;base64,${logoData.toString('base64')}`;

  return new ImageResponse(
    (
      <div
        style={{
          background: 'linear-gradient(135deg, #030712 0%, #111827 40%, #1f2937 70%, #111827 100%)',
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'system-ui, -apple-system, sans-serif',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Background glow effects */}
        <div
          style={{
            position: 'absolute',
            top: '-150px',
            right: '-100px',
            width: '500px',
            height: '500px',
            background: 'radial-gradient(circle, rgba(255,255,255,0.04) 0%, transparent 70%)',
            borderRadius: '50%',
            display: 'flex',
          }}
        />
        <div
          style={{
            position: 'absolute',
            bottom: '-200px',
            left: '-150px',
            width: '600px',
            height: '600px',
            background: 'radial-gradient(circle, rgba(255,255,255,0.03) 0%, transparent 70%)',
            borderRadius: '50%',
            display: 'flex',
          }}
        />

        {/* Logo */}
        <img
          src={logoBase64}
          alt="Immivo"
          width={180}
          height={60}
          style={{
            marginBottom: '32px',
            objectFit: 'contain',
          }}
        />

        {/* Headline */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            marginBottom: '20px',
          }}
        >
          <span
            style={{
              fontSize: '58px',
              fontWeight: 800,
              color: 'white',
              textAlign: 'center',
              lineHeight: 1.15,
              letterSpacing: '-2px',
            }}
          >
            Dein Büro arbeitet.
          </span>
          <span
            style={{
              fontSize: '58px',
              fontWeight: 800,
              color: '#9ca3af',
              textAlign: 'center',
              lineHeight: 1.15,
              letterSpacing: '-2px',
            }}
          >
            Du verdienst.
          </span>
        </div>

        {/* Subtitle */}
        <div
          style={{
            fontSize: '22px',
            color: 'rgba(255,255,255,0.5)',
            textAlign: 'center',
            maxWidth: '700px',
            lineHeight: 1.5,
            display: 'flex',
            marginBottom: '40px',
          }}
        >
          Das erste KI-gesteuerte Betriebssystem für Immobilienmakler
        </div>

        {/* Features bar */}
        <div
          style={{
            display: 'flex',
            gap: '24px',
            padding: '14px 28px',
            background: 'rgba(255,255,255,0.06)',
            borderRadius: '14px',
            border: '1px solid rgba(255,255,255,0.08)',
          }}
        >
          {['Jarvis KI', 'CRM', 'Exposés', 'Bildstudio', '24 Portale'].map((text) => (
            <div key={text} style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'rgba(255,255,255,0.7)', fontSize: '17px' }}>
              <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#22c55e', display: 'flex' }} />
              <span>{text}</span>
            </div>
          ))}
        </div>

        {/* URL + Tagline */}
        <div
          style={{
            position: 'absolute',
            bottom: '28px',
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
          }}
        >
          <span style={{ color: 'rgba(255,255,255,0.25)', fontSize: '16px' }}>
            immivo.ai
          </span>
          <div style={{ width: '1px', height: '14px', background: 'rgba(255,255,255,0.15)', display: 'flex' }} />
          <span style={{ color: 'rgba(255,255,255,0.25)', fontSize: '16px' }}>
            7 Tage kostenlos testen
          </span>
        </div>
      </div>
    ),
    { ...size }
  );
}
