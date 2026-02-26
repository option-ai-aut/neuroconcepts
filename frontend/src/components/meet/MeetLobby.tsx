'use client';

import { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Video, VideoOff, Users, AlertCircle, Loader2 } from 'lucide-react';

interface MeetLobbyProps {
  roomCode: string;
  onJoin: (name: string) => void;
  loading: boolean;
  error: string | null;
  apiBase: string; // passed from parent (getApiUrl() result)
}

export default function MeetLobby({ roomCode, onJoin, loading, error, apiBase }: MeetLobbyProps) {
  const [name, setName] = useState('');
  const [roomExists, setRoomExists] = useState<boolean | null>(null);
  const [participantCount, setParticipantCount] = useState<number>(0);
  const [videoDevices, setVideoDevices] = useState<MediaDeviceInfo[]>([]);
  const [audioDevices, setAudioDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedVideo, setSelectedVideo] = useState('');
  const [selectedAudio, setSelectedAudio] = useState('');
  const [videoEnabled, setVideoEnabled] = useState(true);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Check room exists
  useEffect(() => {
    const checkRoom = async () => {
      try {
        const res = await fetch(`${apiBase}/meet/rooms/${roomCode}`);
        if (res.ok) {
          const data = await res.json();
          setRoomExists(true);
          setParticipantCount(data.numParticipants || 0);
        } else {
          setRoomExists(false);
        }
      } catch {
        setRoomExists(false);
      }
    };
    checkRoom();
  }, [roomCode, apiBase]);

  // Request camera/mic and enumerate devices
  useEffect(() => {
    let active = true;
    const setup = async () => {
      try {
        const s = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        if (!active) { s.getTracks().forEach(t => t.stop()); return; }
        setStream(s);
        if (videoRef.current) {
          videoRef.current.srcObject = s;
        }
        const devices = await navigator.mediaDevices.enumerateDevices();
        const vDevs = devices.filter(d => d.kind === 'videoinput');
        const aDevs = devices.filter(d => d.kind === 'audioinput');
        setVideoDevices(vDevs);
        setAudioDevices(aDevs);
        if (vDevs[0]) setSelectedVideo(vDevs[0].deviceId);
        if (aDevs[0]) setSelectedAudio(aDevs[0].deviceId);
      } catch {
        // No permissions — that's ok, user can still join
      }
    };
    setup();
    return () => {
      active = false;
      stream?.getTracks().forEach(t => t.stop());
    };
  }, []);

  const toggleVideo = () => {
    stream?.getVideoTracks().forEach(t => { t.enabled = !videoEnabled; });
    setVideoEnabled(v => !v);
  };

  const toggleAudio = () => {
    stream?.getAudioTracks().forEach(t => { t.enabled = !audioEnabled; });
    setAudioEnabled(a => !a);
  };

  const handleJoin = () => {
    if (!name.trim()) return;
    stream?.getTracks().forEach(t => t.stop());
    onJoin(name.trim());
  };

  if (roomExists === false) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
        <div className="text-center max-w-sm">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-white mb-2">Raum nicht gefunden</h2>
          <p className="text-gray-400 text-sm">
            Dieser Meeting-Raum existiert nicht mehr oder der Link ist ungültig.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
      <div className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-2 gap-6">

        {/* Video Preview */}
        <div className="relative bg-gray-900 rounded-2xl overflow-hidden aspect-video flex items-center justify-center">
          {videoEnabled && stream ? (
            <video
              ref={videoRef}
              autoPlay
              muted
              playsInline
              className="w-full h-full object-cover scale-x-[-1]"
            />
          ) : (
            <div className="flex flex-col items-center gap-3 text-gray-500">
              <VideoOff className="w-10 h-10" />
              <span className="text-sm">Kamera deaktiviert</span>
            </div>
          )}

          {/* Controls overlay */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-3">
            <button
              onClick={toggleAudio}
              className={`p-3 rounded-full transition-colors ${audioEnabled ? 'bg-gray-700 hover:bg-gray-600 text-white' : 'bg-red-600 hover:bg-red-500 text-white'}`}
            >
              {audioEnabled ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
            </button>
            <button
              onClick={toggleVideo}
              className={`p-3 rounded-full transition-colors ${videoEnabled ? 'bg-gray-700 hover:bg-gray-600 text-white' : 'bg-red-600 hover:bg-red-500 text-white'}`}
            >
              {videoEnabled ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Join form */}
        <div className="flex flex-col justify-center gap-5">
          {/* Header */}
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-mono text-gray-500 bg-gray-800 px-2 py-0.5 rounded">{roomCode}</span>
              {roomExists && participantCount > 0 && (
                <span className="flex items-center gap-1 text-xs text-green-400">
                  <Users className="w-3 h-3" />
                  {participantCount} im Call
                </span>
              )}
            </div>
            <h1 className="text-2xl font-bold text-white">Meeting beitreten</h1>
            <p className="text-gray-400 text-sm mt-1">Kein Download nötig — direkt im Browser</p>
          </div>

          {/* Device selection */}
          {videoDevices.length > 1 && (
            <div>
              <label className="block text-xs text-gray-400 mb-1">Kamera</label>
              <select
                value={selectedVideo}
                onChange={e => setSelectedVideo(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {videoDevices.map(d => (
                  <option key={d.deviceId} value={d.deviceId}>{d.label || 'Kamera'}</option>
                ))}
              </select>
            </div>
          )}
          {audioDevices.length > 1 && (
            <div>
              <label className="block text-xs text-gray-400 mb-1">Mikrofon</label>
              <select
                value={selectedAudio}
                onChange={e => setSelectedAudio(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {audioDevices.map(d => (
                  <option key={d.deviceId} value={d.deviceId}>{d.label || 'Mikrofon'}</option>
                ))}
              </select>
            </div>
          )}

          {/* Name input */}
          <div>
            <label className="block text-xs text-gray-400 mb-1">Dein Name</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleJoin()}
              placeholder="z.B. Max Mustermann"
              className="w-full bg-gray-800 border border-gray-700 text-white text-sm rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-gray-500"
              autoFocus
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 text-red-400 text-sm bg-red-900/30 border border-red-800 rounded-lg px-3 py-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {error}
            </div>
          )}

          <button
            onClick={handleJoin}
            disabled={!name.trim() || loading || roomExists === null}
            className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 disabled:text-gray-500 text-white font-semibold py-3 rounded-xl transition-colors flex items-center justify-center gap-2"
          >
            {loading ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Verbinde...</>
            ) : (
              'Jetzt beitreten'
            )}
          </button>

          <p className="text-center text-xs text-gray-600">
            Immivo Meet · Ende-zu-Ende verschlüsselt
          </p>
        </div>
      </div>
    </div>
  );
}
