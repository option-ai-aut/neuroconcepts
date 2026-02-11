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
  Clock,
  AlertTriangle,
} from 'lucide-react';
import useSWR from 'swr';
import { getProperties } from '@/lib/api';
import { getRuntimeConfig } from '@/components/EnvProvider';

interface Property {
  id: string;
  title: string;
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
    const img = new Image();
    img.onload = () => {
      let { width, height } = img;
      
      // Scale down if needed
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
      if (isDragging.current) {
        e.preventDefault();
        updatePosition(e.clientX);
      }
    };
    const handleMouseUp = () => { isDragging.current = false; };
    const handleTouchMove = (e: TouchEvent) => {
      if (isDragging.current && e.touches[0]) {
        updatePosition(e.touches[0].clientX);
      }
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
      {/* After image (full) */}
      <img src={after} alt="Nachher" className="w-full h-auto block" draggable={false} />
      
      {/* Before image (clipped) */}
      <div 
        className="absolute inset-0 overflow-hidden"
        style={{ width: `${sliderPos}%` }}
      >
        <img 
          src={before} 
          alt="Vorher" 
          className="h-full object-cover"
          style={{ width: containerRef.current ? `${containerRef.current.offsetWidth}px` : '100%' }}
          draggable={false}
        />
      </div>

      {/* Slider line + handle */}
      <div 
        className="absolute top-0 bottom-0 w-0.5 bg-white shadow-lg z-10"
        style={{ left: `${sliderPos}%`, transform: 'translateX(-50%)' }}
      >
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 bg-white rounded-full shadow-lg flex items-center justify-center">
          <GripVertical className="w-4 h-4 text-gray-600" />
        </div>
      </div>

      {/* Labels */}
      <div className="absolute top-3 left-3 bg-black/60 text-white text-[10px] font-semibold px-2 py-1 rounded-md uppercase tracking-wider">
        Vorher
      </div>
      <div className="absolute top-3 right-3 bg-black/60 text-white text-[10px] font-semibold px-2 py-1 rounded-md uppercase tracking-wider">
        Nachher
      </div>
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
  const [selectedStyle, setSelectedStyle] = useState(STYLES[0]);
  const [selectedRoom, setSelectedRoom] = useState(ROOMS[0]);
  const [customPrompt, setCustomPrompt] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [resultImage, setResultImage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

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

  const loadImage = useCallback(async (dataUrl: string) => {
    setOriginalImage(dataUrl);
    setResultImage(null);
    setError(null);
    
    // Compress for API
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
    // For property images that are URLs, fetch and convert to base64
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      canvas.getContext('2d')!.drawImage(img, 0, 0);
      loadImage(canvas.toDataURL('image/jpeg', 0.9));
    };
    img.onerror = () => {
      // Fallback: use URL directly
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
    if (!compressedImage) return;
    
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
          style: selectedStyle.id,
          roomType: selectedRoom.id,
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
    link.download = `staged-${selectedRoom.id}-${selectedStyle.id}-${Date.now()}.png`;
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
      formData.append('images', blob, `staged-${selectedRoom.id}-${Date.now()}.png`);
      
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
  };

  // ── No image selected: Show upload screen ──
  if (!originalImage) {
    return (
      <div className="h-full flex flex-col bg-white">
        <div className="flex-1 flex items-center justify-center px-4 md:px-8 pb-8">
          <div className="w-full max-w-2xl space-y-6">
            {/* Title */}
            <div className="text-center mb-8">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-fuchsia-50 text-fuchsia-700 rounded-full text-xs font-medium mb-4">
                <Sparkles className="w-3.5 h-3.5" />
                Virtual Staging mit GPT-Image
              </div>
              <h2 className="text-2xl md:text-3xl font-bold text-gray-900">Leere Räume einrichten</h2>
              <p className="text-gray-500 mt-2 text-sm">Lade ein Foto eines leeren Raums hoch und die KI fügt Möbel ein.</p>
            </div>

            {/* Property Picker */}
            {properties.length > 0 && (
              <div className="relative">
                <button
                  onClick={() => setShowPropertyDropdown(!showPropertyDropdown)}
                  className="w-full flex items-center justify-between px-4 py-3.5 bg-white rounded-xl border border-gray-200 hover:border-gray-300 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Building2 className="w-5 h-5 text-gray-400" />
                    <span className="text-gray-600 text-sm">Bild aus Objekt wählen...</span>
                  </div>
                  <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${showPropertyDropdown ? 'rotate-180' : ''}`} />
                </button>
                
                {showPropertyDropdown && (
                  <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-xl border border-gray-100 max-h-64 overflow-y-auto z-10">
                    {properties.map((property) => (
                      <div key={property.id} className="p-2 border-b border-gray-50 last:border-0">
                        <div className="px-3 py-1.5 text-sm font-medium text-gray-900">{property.title}</div>
                        {property.images && property.images.length > 0 ? (
                          <div className="flex gap-2 px-3 pb-2 overflow-x-auto">
                            {property.images.slice(0, 6).map((img, idx) => (
                              <button
                                key={idx}
                                onClick={() => handlePropertyImageSelect(property, img)}
                                className="w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 border-2 border-transparent hover:border-indigo-500 transition-colors"
                              >
                                <img src={img} alt="" className="w-full h-full object-cover" />
                              </button>
                            ))}
                          </div>
                        ) : (
                          <div className="px-3 pb-2 text-xs text-gray-400">Keine Bilder</div>
                        )}
                      </div>
                    ))}
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
              className="border-2 border-dashed border-gray-200 rounded-2xl p-12 text-center cursor-pointer hover:border-fuchsia-400 hover:bg-fuchsia-50/30 transition-all group"
            >
              <Upload className="w-12 h-12 text-gray-300 group-hover:text-fuchsia-400 mx-auto mb-4 transition-colors" />
              <p className="text-sm font-medium text-gray-700">Foto hochladen</p>
              <p className="text-xs text-gray-400 mt-1">Drag & Drop oder klicken · JPG, PNG</p>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleFileUpload}
                className="hidden"
              />
            </div>

            <p className="text-[11px] text-gray-400 text-center">
              Bilder werden automatisch auf max. 2048px komprimiert. Es werden keine Bilder gespeichert.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ── Image selected: Show editor ──
  return (
    <div className="h-full flex flex-col bg-white">
      <div className="flex-1 overflow-auto px-4 md:px-8 py-4 md:py-6">
        <div className="max-w-6xl mx-auto">
          
          {/* Result: Before/After Slider */}
          {resultImage && originalImage && (
            <div className="mb-6">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                  <Check className="w-4 h-4 text-green-500" />
                  Ergebnis — Vorher / Nachher vergleichen
                </h3>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleGenerate}
                    disabled={isProcessing}
                    className="text-xs text-gray-500 hover:text-gray-700 flex items-center gap-1 px-2 py-1 rounded-md hover:bg-gray-100 transition-colors"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isProcessing ? 'animate-spin' : ''}`} />
                    Nochmal
                  </button>
                  {selectedProperty && (
                    <button
                      onClick={handleSaveToProperty}
                      className="text-xs text-green-600 hover:text-green-700 flex items-center gap-1 px-2 py-1 rounded-md hover:bg-green-50 transition-colors"
                    >
                      <Check className="w-3.5 h-3.5" />
                      Zum Objekt
                    </button>
                  )}
                  <button
                    onClick={handleDownload}
                    className="text-xs text-indigo-600 hover:text-indigo-700 flex items-center gap-1 px-2 py-1 rounded-md hover:bg-indigo-50 transition-colors"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Download
                  </button>
                </div>
              </div>
              <BeforeAfterSlider before={originalImage} after={resultImage} />
            </div>
          )}

          {/* Processing State */}
          {isProcessing && (
            <div className="mb-6 bg-gradient-to-r from-fuchsia-50 to-purple-50 rounded-2xl p-8 text-center">
              <Loader2 className="w-10 h-10 animate-spin text-fuchsia-600 mx-auto mb-4" />
              <p className="text-sm font-medium text-gray-800">KI platziert Möbel...</p>
              <div className="flex items-center justify-center gap-1.5 mt-2 text-xs text-gray-500">
                <Clock className="w-3 h-3" />
                {elapsed}s · ca. 30–60 Sekunden
              </div>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="mb-6 bg-red-50 border border-red-100 rounded-xl px-4 py-3 flex items-start gap-3">
              <AlertTriangle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
              <div>
                <p className="text-sm text-red-700">{error}</p>
                <button onClick={handleGenerate} className="text-xs text-red-600 underline mt-1">Erneut versuchen</button>
              </div>
            </div>
          )}

          <div className="grid lg:grid-cols-3 gap-6">
            {/* Left: Original Image */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-gray-900">Originalbild</h3>
                <button
                  onClick={handleReset}
                  className="text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1"
                >
                  <X className="w-3.5 h-3.5" />
                  Ändern
                </button>
              </div>
              <div className="rounded-xl overflow-hidden bg-gray-100">
                <img src={originalImage} alt="Original" className="w-full h-auto" />
              </div>
              {imageDimensions && (
                <p className="text-[10px] text-gray-400 mt-2">{imageDimensions.width} × {imageDimensions.height}px</p>
              )}
            </div>

            {/* Right: Controls */}
            <div className="lg:col-span-2 space-y-5">
              {/* Style */}
              <div>
                <h3 className="text-sm font-semibold text-gray-900 mb-3">Einrichtungsstil</h3>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                  {STYLES.map((style) => (
                    <button
                      key={style.id}
                      onClick={() => setSelectedStyle(style)}
                      className={`p-2.5 rounded-xl text-center transition-all ${
                        selectedStyle.id === style.id
                          ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/20'
                          : 'bg-gray-50 border border-gray-100 hover:border-indigo-200 hover:bg-indigo-50/50'
                      }`}
                    >
                      <div className={`text-xs font-semibold ${selectedStyle.id === style.id ? 'text-white' : 'text-gray-800'}`}>
                        {style.name}
                      </div>
                      <div className={`text-[10px] mt-0.5 ${selectedStyle.id === style.id ? 'text-indigo-200' : 'text-gray-400'}`}>
                        {style.desc}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Room Type */}
              <div>
                <h3 className="text-sm font-semibold text-gray-900 mb-3">Raumtyp</h3>
                <div className="flex flex-wrap gap-2">
                  {ROOMS.map((room) => (
                    <button
                      key={room.id}
                      onClick={() => setSelectedRoom(room)}
                      className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                        selectedRoom.id === room.id
                          ? 'bg-indigo-600 text-white'
                          : 'bg-gray-50 border border-gray-100 text-gray-600 hover:border-indigo-200'
                      }`}
                    >
                      {room.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Custom Prompt */}
              <div>
                <h3 className="text-sm font-semibold text-gray-900 mb-2">Eigene Anweisung <span className="font-normal text-gray-400">(optional)</span></h3>
                <textarea
                  value={customPrompt}
                  onChange={(e) => setCustomPrompt(e.target.value)}
                  placeholder="z.B. 'Graues Sofa und Holz-Couchtisch' — je kürzer, desto besser"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none text-sm text-gray-900 placeholder-gray-400"
                  rows={2}
                />
              </div>

              {/* Generate Button */}
              <button
                onClick={handleGenerate}
                disabled={isProcessing}
                className={`w-full flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-xl font-semibold transition-all ${
                  isProcessing
                    ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                    : 'bg-gradient-to-r from-fuchsia-600 to-pink-600 text-white hover:shadow-lg hover:shadow-fuchsia-500/25 hover:-translate-y-0.5 active:translate-y-0'
                }`}
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Wird bearbeitet... ({elapsed}s)
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5" />
                    Möbel einbauen
                  </>
                )}
              </button>

              <p className="text-[10px] text-gray-400 text-center">
                Model: gpt-image-1 · Qualität: high · Dauer: ca. 30–60 Sek.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
