'use client';

import { useState } from 'react';
import {
  LiveKitRoom,
  VideoConference,
  RoomAudioRenderer,
} from '@livekit/components-react';
import '@livekit/components-styles';
import { getApiUrl } from '@/lib/api';
import MeetLobby from './MeetLobby';
import MeetEnded from './MeetEnded';

interface MeetRoomProps {
  roomCode: string;
}

export default function MeetRoom({ roomCode }: MeetRoomProps) {
  const [token, setToken] = useState<string | null>(null);
  const [serverUrl, setServerUrl] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ended, setEnded] = useState(false);

  const apiBase = getApiUrl();

  const handleJoin = async (name: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${apiBase}/meet/rooms/${roomCode}/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || 'Verbindung fehlgeschlagen');
      }
      const data = await res.json();
      setServerUrl(data.serverUrl);
      setToken(data.token);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnected = () => {
    setEnded(true);
    setToken(null);
  };

  if (ended) {
    return <MeetEnded roomCode={roomCode} onRejoin={() => { setEnded(false); }} />;
  }

  if (!token) {
    return (
      <MeetLobby
        roomCode={roomCode}
        onJoin={handleJoin}
        loading={loading}
        error={error}
        apiBase={apiBase}
      />
    );
  }

  return (
    <div style={{ height: '100dvh', width: '100vw', background: '#111' }}>
      <LiveKitRoom
        token={token}
        serverUrl={serverUrl}
        connect={true}
        video={true}
        audio={true}
        onDisconnected={handleDisconnected}
        style={{ height: '100%' }}
      >
        <VideoConference />
        <RoomAudioRenderer />
      </LiveKitRoom>
    </div>
  );
}
