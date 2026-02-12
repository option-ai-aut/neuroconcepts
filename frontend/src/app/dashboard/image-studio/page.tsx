'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { 
  Upload, 
  Loader2, 
  Download, 
  RefreshCw,
  Building2,
  Sparkles,
  ChevronDown,
  X,
  Check,
  GripVertical,
  AlertTriangle,
  Image as ImageIcon,
  Wand2,
} from 'lucide-react';
import useSWR from 'swr';
import { getProperties, getImageUrl } from '@/lib/api';
import { getRuntimeConfig } from '@/components/EnvProvider';

interface Property {
  id: string;
  title: string;
  address?: string;
  images?: string[];
}

const STYLES = [
  { id: 'modern', name: 'Modern', desc: 'Klar & minimalistisch' },
  { id: 'scandinavian', name: 'Skandinavisch', desc: 'Hell & gemütlich' },
  { id: 'industrial', name: 'Industrial', desc: 'Urban & rau' },
  { id: 'classic', name: 'Klassisch', desc: 'Elegant & zeitlos' },
  { id: 'bohemian', name: 'Boho', desc: 'Warm & eklektisch' },
  { id: 'luxury', name: 'Luxus', desc: 'High-End & exklusiv' },
];

const ROOMS = [
  { id: 'living room', name: 'Wohnzimmer' },
  { id: 'bedroom', name: 'Schlafzimmer' },
  { id: 'kitchen', name: 'Küche' },
  { id: 'dining room', name: 'Esszimmer' },
  { id: 'home office', name: 'Büro' },
  { id: 'bathroom', name: 'Badezimmer' },
  { id: 'kids room', name: 'Kinderzimmer' },
];

// Compress image to max dimension and JPEG quality
function compressImage(dataUrl: string, maxDim = 2048, quality = 0.85): Promise<{ compressed: string; width: number; height: number }> {
  return new Promise((resolve) => {
    const img = new window.Image();
    img.onload = () => {
      let { width, height } = img;
      if (width > maxDim || height > maxDim) {
        const scale = maxDim / Math.max(width, height);
        width = Math.round(width * scale);
        height = Math.round(height * scale);
      }
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0, width, height);
      const compressed = canvas.toDataURL('image/jpeg', quality);
      resolve({ compressed, width, height });
    };
    img.src = dataUrl;
  });
}

// Before/After Slider component
function BeforeAfterSlider({ before, after }: { before: string; after: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [sliderPos, setSliderPos] = useState(50);
  const isDragging = useRef(false);

  const updatePosition = useCallback((clientX: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const pct = Math.max(0, Math.min(100, (x / rect.width) * 100));
    setSliderPos(pct);
  }, []);

  const handleMouseDown = useCallback(() => { isDragging.current = true; }, []);
  
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging.current) { e.preventDefault(); updatePosition(e.clientX); }
    };
    const handleMouseUp = () => { isDragging.current = false; };
    const handleTouchMove = (e: TouchEvent) => {
      if (isDragging.current && e.touches[0]) updatePosition(e.touches[0].clientX);
    };
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('touchmove', handleTouchMove, { passive: true });
    window.addEventListener('touchend', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleMouseUp);
    };
  }, [updatePosition]);

  return (
    <div 
      ref={containerRef} 
      className="relative overflow-hidden rounded-xl cursor-col-resize select-none bg-gray-100"
      onMouseDown={handleMouseDown}
      onTouchStart={handleMouseDown}
      onClick={(e) => updatePosition(e.clientX)}
    >
      <img src={after} alt="Nachher" className="w-full h-auto block" draggable={false} />
      <div className="absolute inset-0 overflow-hidden" style={{ width: `${sliderPos}%` }}>
        <img 
          src={before} alt="Vorher" className="h-full object-cover"
          style={{ width: containerRef.current ? `${containerRef.current.offsetWidth}px` : '100%' }}
          draggable={false}
        />
      </div>
      <div className="absolute top-0 bottom-0 w-0.5 bg-white shadow-lg z-10" style={{ left: `${sliderPos}%`, transform: 'translateX(-50%)' }}>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 bg-white rounded-full shadow-lg flex items-center justify-center">
          <GripVertical className="w-4 h-4 text-gray-600" />
        </div>
      </div>
      <div className="absolute top-3 left-3 bg-black/60 text-white text-[10px] font-semibold px-2 py-1 rounded-md uppercase tracking-wider">Vorher</div>
      <div className="absolute top-3 right-3 bg-black/60 text-white text-[10px] font-semibold px-2 py-1 rounded-md uppercase tracking-wider">Nachher</div>
    </div>
  );
}

// Loading animation component
function StagingLoader({ elapsed }: { elapsed: number }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 md:py-24">
      {/* Animated room with furniture appearing */}
      <div className="relative w-32 h-32 mb-8">
        {/* Room outline */}
        <div className="absolute inset-0 border-2 border-gray-200 rounded-2xl bg-gray-100" />
        
        {/* Animated furniture pieces */}
        <div className="absolute bottom-3 left-3 w-8 h-5 bg-gray-400 rounded-sm animate-[staging-pop_2s_ease-in-out_infinite]" />
        <div className="absolute bottom-3 right-4 w-6 h-8 bg-gray-500 rounded-sm animate-[staging-pop_2s_ease-in-out_0.4s_infinite]" />
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 w-10 h-3 bg-gray-400 rounded-sm animate-[staging-pop_2s_ease-in-out_0.8s_infinite]" />
        <div className="absolute top-4 left-1/2 -translate-x-1/2 w-7 h-7 border-2 border-gray-300 rounded-lg animate-[staging-pop_2s_ease-in-out_1.2s_infinite]" />
        
        {/* Sparkle effects */}
        <div className="absolute -top-1 -right-1 animate-[staging-sparkle_1.5s_ease-in-out_infinite]">
          <Sparkles className="w-5 h-5 text-yellow-400" />
        </div>
        <div className="absolute -bottom-1 -left-1 animate-[staging-sparkle_1.5s_ease-in-out_0.75s_infinite]">
          <Wand2 className="w-4 h-4 text-gray-500" />
        </div>
      </div>

      {/* Progress bar */}
      <div className="w-48 h-1.5 bg-gray-100 rounded-full overflow-hidden mb-4">
        <div 
          className="h-full bg-gray-700 rounded-full transition-all duration-1000 ease-out"
          style={{ width: `${Math.min((elapsed / 45) * 100, 95)}%` }}
        />
      </div>

      <p className="text-sm font-medium text-gray-800">KI platziert Möbel...</p>
      <p className="text-xs text-gray-400 mt-1">{elapsed}s · ca. 15–40 Sekunden</p>
    </div>
  );
}

export default function ImageStudioPage() {
  const { data: properties = [] } = useSWR<Property[]>('/properties', getProperties);
  
  const [originalImage, setOriginalImage] = useState<string | null>(null);
  const [compressedImage, setCompressedImage] = useState<string | null>(null);
  const [imageDimensions, setImageDimensions] = useState<{ width: number; height: number } | null>(null);
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const [showPropertyDropdown, setShowPropertyDropdown] = useState(false);
  const [selectedStyle, setSelectedStyle] = useState<typeof STYLES[0] | null>(null);
  const [selectedRoom, setSelectedRoom] = useState<typeof ROOMS[0] | null>(null);
  const [customPrompt, setCustomPrompt] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [resultImage, setResultImage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Timer during processing
  useEffect(() => {
    if (isProcessing) {
      setElapsed(0);
      timerRef.current = setInterval(() => setElapsed(t => t + 1), 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [isProcessing]);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowPropertyDropdown(false);
      }
    }
    if (showPropertyDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showPropertyDropdown]);

  // Validate: at least one of style, room, or custom prompt selected
  const hasSelection = !!selectedStyle || !!selectedRoom || customPrompt.trim().length > 0;

  const loadImage = useCallback(async (dataUrl: string) => {
    setOriginalImage(dataUrl);
    setResultImage(null);
    setError(null);
    const { compressed, width, height } = await compressImage(dataUrl);
    setCompressedImage(compressed);
    setImageDimensions({ width, height });
  }, []);

  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        loadImage(event.target?.result as string);
        setSelectedProperty(null);
      };
      reader.readAsDataURL(file);
    }
    e.target.value = '';
  }, [loadImage]);

  const handlePropertyImageSelect = useCallback((property: Property, imageUrl: string) => {
    const img = new window.Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      canvas.getContext('2d')!.drawImage(img, 0, 0);
      loadImage(canvas.toDataURL('image/jpeg', 0.9));
    };
    img.onerror = () => {
      setOriginalImage(imageUrl);
      setCompressedImage(imageUrl);
      setImageDimensions({ width: 1536, height: 1024 });
    };
    img.src = imageUrl;
    setSelectedProperty(property);
    setShowPropertyDropdown(false);
    setResultImage(null);
    setError(null);
  }, [loadImage]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file?.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (event) => {
        loadImage(event.target?.result as string);
        setSelectedProperty(null);
      };
      reader.readAsDataURL(file);
    }
  }, [loadImage]);

  const handleGenerate = async () => {
    if (!compressedImage || !hasSelection) return;
    
    setIsProcessing(true);
    setError(null);
    setResultImage(null);
    
    try {
      const { fetchAuthSession } = await import('aws-amplify/auth');
      const session = await fetchAuthSession();
      const token = session.tokens?.idToken?.toString();
      
      const config = getRuntimeConfig();
      const apiUrl = (config.apiUrl || 'http://localhost:3001').replace(/\/+$/, '');
      
      const aspectRatio = imageDimensions 
        ? imageDimensions.width / imageDimensions.height 
        : 1.5;

      const response = await fetch(`${apiUrl}/ai/image-edit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          image: compressedImage,
          prompt: customPrompt || '',
          style: selectedStyle?.id || '',
          roomType: selectedRoom?.id || '',
          aspectRatio,
        })
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || 'Bildbearbeitung fehlgeschlagen');
      }

      const data = await response.json();
      setResultImage(data.image);
    } catch (err: any) {
      console.error('Image studio error:', err);
      setError(err.message || 'Die Bildbearbeitung ist fehlgeschlagen.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownload = () => {
    if (!resultImage) return;
    const link = document.createElement('a');
    link.href = resultImage;
    link.download = `staged-${selectedRoom?.id || 'room'}-${selectedStyle?.id || 'style'}-${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleSaveToProperty = async () => {
    if (!resultImage || !selectedProperty) return;
    try {
      const { fetchAuthSession } = await import('aws-amplify/auth');
      const session = await fetchAuthSession();
      const token = session.tokens?.idToken?.toString();
      
      const response = await fetch(resultImage);
      const blob = await response.blob();
      const formData = new FormData();
      formData.append('images', blob, `staged-${selectedRoom?.id || 'room'}-${Date.now()}.png`);
      
      const config = getRuntimeConfig();
      const apiUrl = (config.apiUrl || 'http://localhost:3001').replace(/\/+$/, '');
      
      await fetch(`${apiUrl}/properties/${selectedProperty.id}/images`, {
        method: 'POST',
        headers: { ...(token ? { 'Authorization': `Bearer ${token}` } : {}) },
        body: formData
      });
      
      alert('Bild wurde zum Objekt hinzugefügt!');
    } catch (err) {
      console.error('Error saving to property:', err);
      alert('Fehler beim Speichern');
    }
  };

  const handleReset = () => {
    setOriginalImage(null);
    setCompressedImage(null);
    setImageDimensions(null);
    setSelectedProperty(null);
    setResultImage(null);
    setError(null);
    setCustomPrompt('');
    setSelectedStyle(null);
    setSelectedRoom(null);
  };

  // ── No image selected: Upload screen ──
  if (!originalImage) {
    return (
      <div className="h-full flex flex-col bg-white">
        <div className="flex-1 flex items-center justify-center px-4 md:px-8 pb-8">
          <div className="w-full max-w-xl space-y-6">
            {/* Title */}
            <div className="text-center mb-6">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-gray-100 text-gray-700 rounded-full text-xs font-medium mb-4">
                <Sparkles className="w-3.5 h-3.5" />
                Virtual Staging mit Gemini 3
              </div>
              <h2 className="text-2xl md:text-3xl font-bold text-gray-900">Leere Räume einrichten</h2>
              <p className="text-gray-500 mt-2 text-sm">Lade ein Foto hoch und die KI fügt passende Möbel ein.</p>
            </div>

            {/* Property Picker */}
            {properties.length > 0 && (
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setShowPropertyDropdown(!showPropertyDropdown)}
                  className="w-full flex items-center justify-between px-4 py-3 bg-white rounded-lg border border-gray-200 hover:border-gray-300 transition-colors text-sm"
                >
                  <div className="flex items-center gap-2.5">
                    <Building2 className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-600">Bild aus Objekt wählen...</span>
                  </div>
                  <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${showPropertyDropdown ? 'rotate-180' : ''}`} />
                </button>
                
                {showPropertyDropdown && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-xl shadow-xl border border-gray-200 max-h-[420px] overflow-y-auto z-20">
                    {properties.filter(p => p.images && p.images.length > 0).length === 0 ? (
                      <div className="p-6 text-center text-gray-400 text-sm">
                        <ImageIcon className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                        Keine Objekte mit Bildern vorhanden
                      </div>
                    ) : (
                      properties.filter(p => p.images && p.images.length > 0).map((property) => (
                        <div key={property.id} className="border-b border-gray-100 last:border-0">
                          <div className="px-4 pt-3 pb-2">
                            <p className="text-sm font-semibold text-gray-900">{property.title}</p>
                            {property.address && (
                              <p className="text-xs text-gray-400 mt-0.5">{property.address}</p>
                            )}
                          </div>
                          <div className="px-3 pb-3 grid grid-cols-3 gap-2">
                            {property.images!.slice(0, 9).map((img, idx) => {
                              const resolvedUrl = getImageUrl(img);
                              return (
                                <button
                                  key={idx}
                                  onClick={() => handlePropertyImageSelect(property, resolvedUrl)}
                                  className="relative aspect-[4/3] rounded-lg overflow-hidden border-2 border-transparent hover:border-gray-900 transition-all group bg-gray-100"
                                >
                                  <img 
                                    src={resolvedUrl} 
                                    alt={`${property.title} Bild ${idx + 1}`} 
                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200 bg-gray-200" 
                                    onError={(e) => {
                                      const target = e.target as HTMLImageElement;
                                      target.onerror = null;
                                      target.src = 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="200" height="150" viewBox="0 0 200 150"><rect fill="#e5e7eb" width="200" height="150"/><text x="50%" y="50%" text-anchor="middle" dy=".3em" fill="#9ca3af" font-size="12" font-family="sans-serif">Bild nicht verfügbar</text></svg>');
                                    }}
                                  />
                                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Divider */}
            <div className="flex items-center gap-4">
              <div className="flex-1 h-px bg-gray-200" />
              <span className="text-xs text-gray-400">oder</span>
              <div className="flex-1 h-px bg-gray-200" />
            </div>

            {/* Upload Area */}
            <div
              onDrop={handleDrop}
              onDragOver={(e) => e.preventDefault()}
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-gray-200 rounded-xl p-10 md:p-12 text-center cursor-pointer hover:border-gray-400 hover:bg-gray-50/30 transition-all group"
            >
              <Upload className="w-10 h-10 text-gray-300 group-hover:text-gray-500 mx-auto mb-3 transition-colors" />
              <p className="text-sm font-medium text-gray-700">Foto hochladen</p>
              <p className="text-xs text-gray-400 mt-1">Drag & Drop oder klicken · JPG, PNG, WebP</p>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleFileUpload}
                className="hidden"
              />
            </div>

            <p className="text-[11px] text-gray-400 text-center">
              Bilder werden automatisch auf max. 2048px komprimiert.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ── Image selected: Settings top, image bottom ──
  return (
    <div className="h-full flex flex-col bg-white">
      <div className="flex-1 overflow-auto">
        {/* Settings Bar */}
        <div className="border-b border-gray-100 bg-white sticky top-0 z-10">
          <div className="max-w-5xl mx-auto px-4 md:px-8 py-4 space-y-4">
            {/* Row 1: Style selection */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Einrichtungsstil</h3>
                {selectedStyle && (
                  <button onClick={() => setSelectedStyle(null)} className="text-[10px] text-gray-400 hover:text-gray-600">
                    Abwählen
                  </button>
                )}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {STYLES.map((style) => (
                  <button
                    key={style.id}
                    onClick={() => setSelectedStyle(selectedStyle?.id === style.id ? null : style)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      selectedStyle?.id === style.id
                        ? 'bg-gray-900 text-white shadow-sm'
                        : 'bg-gray-50 border border-gray-150 text-gray-600 hover:border-gray-300 hover:bg-gray-100'
                    }`}
                  >
                    {style.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Row 2: Room type */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Raumtyp</h3>
                {selectedRoom && (
                  <button onClick={() => setSelectedRoom(null)} className="text-[10px] text-gray-400 hover:text-gray-600">
                    Abwählen
                  </button>
                )}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {ROOMS.map((room) => (
                  <button
                    key={room.id}
                    onClick={() => setSelectedRoom(selectedRoom?.id === room.id ? null : room)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      selectedRoom?.id === room.id
                        ? 'bg-gray-900 text-white shadow-sm'
                        : 'bg-gray-50 border border-gray-150 text-gray-600 hover:border-gray-300 hover:bg-gray-100'
                    }`}
                  >
                    {room.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Row 3: Custom prompt + generate button */}
            <div className="flex items-end gap-3">
              <div className="flex-1">
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                  Eigene Anweisung <span className="font-normal normal-case text-gray-400">(optional)</span>
                </h3>
                <input
                  type="text"
                  value={customPrompt}
                  onChange={(e) => setCustomPrompt(e.target.value)}
                  placeholder="z.B. 'Graues Sofa, Holztisch' — je kürzer, desto besser"
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm text-gray-900 placeholder-gray-400"
                  onKeyDown={(e) => { if (e.key === 'Enter' && hasSelection && !isProcessing) handleGenerate(); }}
                />
              </div>
              <button
                onClick={handleGenerate}
                disabled={isProcessing || !hasSelection}
                className={`flex items-center gap-2 px-5 py-2 rounded-lg font-medium text-sm transition-all shrink-0 ${
                  isProcessing || !hasSelection
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : 'bg-gray-900 text-white hover:bg-gray-800 shadow-sm hover:shadow-md'
                }`}
              >
                {isProcessing ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Wand2 className="w-4 h-4" />
                )}
                {isProcessing ? `${elapsed}s` : 'Generieren'}
              </button>
            </div>

            {/* Validation hint */}
            {!hasSelection && (
              <p className="text-[11px] text-amber-600 flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" />
                Wähle mindestens einen Stil, Raumtyp oder gib eine Anweisung ein.
              </p>
            )}
          </div>
        </div>

        {/* Image Area */}
        <div className="max-w-5xl mx-auto px-4 md:px-8 py-6">
          {/* Error */}
          {error && (
            <div className="mb-4 bg-red-50 border border-red-100 rounded-lg px-4 py-3 flex items-start gap-3">
              <AlertTriangle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
              <div>
                <p className="text-sm text-red-700">{error}</p>
                <button onClick={handleGenerate} className="text-xs text-red-600 underline mt-1">Erneut versuchen</button>
              </div>
            </div>
          )}

          {/* Loading state */}
          {isProcessing && <StagingLoader elapsed={elapsed} />}

          {/* Result: Before/After Slider */}
          {resultImage && originalImage && !isProcessing && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                  <Check className="w-4 h-4 text-green-500" />
                  Ergebnis
                </h3>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={handleGenerate}
                    className="text-xs text-gray-500 hover:text-gray-700 flex items-center gap-1 px-2.5 py-1.5 rounded-md hover:bg-gray-100 transition-colors"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    Nochmal
                  </button>
                  {selectedProperty && (
                    <button
                      onClick={handleSaveToProperty}
                      className="text-xs text-green-600 hover:text-green-700 flex items-center gap-1 px-2.5 py-1.5 rounded-md hover:bg-green-50 transition-colors"
                    >
                      <Check className="w-3.5 h-3.5" />
                      Zum Objekt
                    </button>
                  )}
                  <button
                    onClick={handleDownload}
                    className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1 px-2.5 py-1.5 rounded-md hover:bg-gray-50 transition-colors"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Download
                  </button>
                </div>
              </div>
              <BeforeAfterSlider before={originalImage} after={resultImage} />
            </div>
          )}

          {/* Original image preview (when no result yet and not processing) */}
          {!resultImage && !isProcessing && originalImage && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-medium text-gray-700 flex items-center gap-2">
                  <ImageIcon className="w-4 h-4 text-gray-400" />
                  Hochgeladenes Bild
                  {imageDimensions && (
                    <span className="text-[10px] text-gray-400 font-normal">{imageDimensions.width} × {imageDimensions.height}px</span>
                  )}
                </h3>
                <button
                  onClick={handleReset}
                  className="text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1 px-2 py-1 rounded-md hover:bg-gray-100 transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                  Bild ändern
                </button>
              </div>
              <div className="rounded-xl overflow-hidden bg-gray-50 border border-gray-100">
                <img src={originalImage} alt="Original" className="w-full h-auto" />
              </div>
            </div>
          )}

          {/* Model info */}
          <p className="text-[10px] text-gray-400 text-center mt-4">
            Model: gemini-3-pro-image-preview · Qualität: 2K
          </p>
        </div>
      </div>
    </div>
  );
}
