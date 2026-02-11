import { ImageResponse } from 'next/og';

export const runtime = 'nodejs';
export const alt = 'Immivo AI — KI-gesteuertes Betriebssystem für Immobilienmakler';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function OGImage() {
  return new ImageResponse(
    (
      <div
        style={{
          background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 30%, #4338ca 60%, #6366f1 100%)',
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'system-ui, sans-serif',
          position: 'relative',
        }}
      >
        {/* Logo */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            marginBottom: '30px',
          }}
        >
          <div
            style={{
              width: '64px',
              height: '64px',
              background: 'rgba(255,255,255,0.15)',
              borderRadius: '16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginRight: '16px',
              border: '1px solid rgba(255,255,255,0.2)',
            }}
          >
            <span style={{ fontSize: '32px', color: 'white', fontWeight: 700 }}>N</span>
          </div>
          <span style={{ fontSize: '40px', color: 'white', fontWeight: 700, letterSpacing: '-1px' }}>
            Immivo AI
          </span>
        </div>

        {/* Headline */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            marginBottom: '24px',
          }}
        >
          <span
            style={{
              fontSize: '56px',
              fontWeight: 800,
              color: 'white',
              textAlign: 'center',
              lineHeight: 1.15,
            }}
          >
            Dein Büro arbeitet.
          </span>
          <span
            style={{
              fontSize: '56px',
              fontWeight: 800,
              color: '#a5b4fc',
              textAlign: 'center',
              lineHeight: 1.15,
            }}
          >
            Du verdienst.
          </span>
        </div>

        {/* Subtitle */}
        <div
          style={{
            fontSize: '24px',
            color: 'rgba(255,255,255,0.7)',
            textAlign: 'center',
            maxWidth: '700px',
            lineHeight: 1.5,
            display: 'flex',
          }}
        >
          Das erste KI-gesteuerte Betriebssystem für Immobilienmakler
        </div>

        {/* Features bar */}
        <div
          style={{
            display: 'flex',
            gap: '32px',
            marginTop: '40px',
            padding: '16px 32px',
            background: 'rgba(255,255,255,0.1)',
            borderRadius: '16px',
            border: '1px solid rgba(255,255,255,0.15)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'rgba(255,255,255,0.8)', fontSize: '18px' }}>
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#34d399', display: 'flex' }} />
            <span>KI-Assistent</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'rgba(255,255,255,0.8)', fontSize: '18px' }}>
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#34d399', display: 'flex' }} />
            <span>CRM</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'rgba(255,255,255,0.8)', fontSize: '18px' }}>
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#34d399', display: 'flex' }} />
            <span>Exposés</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'rgba(255,255,255,0.8)', fontSize: '18px' }}>
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#34d399', display: 'flex' }} />
            <span>E-Mail</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'rgba(255,255,255,0.8)', fontSize: '18px' }}>
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#34d399', display: 'flex' }} />
            <span>Kalender</span>
          </div>
        </div>

        {/* URL */}
        <div
          style={{
            position: 'absolute',
            bottom: '30px',
            color: 'rgba(255,255,255,0.4)',
            fontSize: '18px',
            display: 'flex',
          }}
        >
          immivo.ai
        </div>
      </div>
    ),
    { ...size }
  );
}
