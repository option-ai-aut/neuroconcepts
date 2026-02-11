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
          overflow: 'hidden',
        }}
      >
        {/* Background decorations */}
        <div
          style={{
            position: 'absolute',
            top: '-100px',
            right: '-100px',
            width: '400px',
            height: '400px',
            borderRadius: '50%',
            background: 'rgba(255,255,255,0.05)',
          }}
        />
        <div
          style={{
            position: 'absolute',
            bottom: '-150px',
            left: '-150px',
            width: '500px',
            height: '500px',
            borderRadius: '50%',
            background: 'rgba(255,255,255,0.03)',
          }}
        />

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
            fontSize: '56px',
            fontWeight: 800,
            color: 'white',
            textAlign: 'center',
            lineHeight: 1.15,
            maxWidth: '900px',
            marginBottom: '24px',
          }}
        >
          Dein Büro arbeitet.
          <br />
          <span style={{ color: '#a5b4fc' }}>Du verdienst.</span>
        </div>

        {/* Subtitle */}
        <div
          style={{
            fontSize: '24px',
            color: 'rgba(255,255,255,0.7)',
            textAlign: 'center',
            maxWidth: '700px',
            lineHeight: 1.5,
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
          {['KI-Assistent', 'CRM', 'Exposés', 'E-Mail', 'Kalender'].map((feature) => (
            <div
              key={feature}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                color: 'rgba(255,255,255,0.8)',
                fontSize: '18px',
              }}
            >
              <div
                style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  background: '#34d399',
                }}
              />
              {feature}
            </div>
          ))}
        </div>

        {/* URL */}
        <div
          style={{
            position: 'absolute',
            bottom: '30px',
            color: 'rgba(255,255,255,0.4)',
            fontSize: '18px',
          }}
        >
          immivo.ai
        </div>
      </div>
    ),
    { ...size }
  );
}
