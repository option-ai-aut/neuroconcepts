'use client';

import { useParams } from 'next/navigation';
import MeetRoom from '@/components/meet/MeetRoom';

export default function MeetPage() {
  const params = useParams();
  const roomCode = params.roomCode as string;
  return <MeetRoom roomCode={roomCode} />;
}
