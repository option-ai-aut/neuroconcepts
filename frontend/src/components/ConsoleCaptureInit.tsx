'use client';

import { useEffect } from 'react';
import { initConsoleCapture } from '@/lib/consoleCapture';

export default function ConsoleCaptureInit() {
  useEffect(() => {
    initConsoleCapture();
  }, []);
  return null;
}
