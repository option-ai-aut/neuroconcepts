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
  Save,
  Menu,
} from 'lucide-react';
import useSWR from 'swr';
import { useTranslations } from 'next-intl';
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

const ROOM_TRANSLATION_KEYS: Record<string, string> = {
  'living room': 'livingRoom',
  'bedroom': 'bedroom',
  'kitchen': 'kitchen',
  'dining room': 'diningRoom',
  'home office': 'homeOffice',
  'bathroom': 'bathroom',
  'kids room': 'kidsRoom',
};

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
function BeforeAfterSlider({ before, after, beforeLabel, afterLabel }: { before: string; after: string; beforeLabel: string; afterLabel: string }) {
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
      {/* After image: full width, sets the container height */}
      <img src={after} alt={afterLabel} className="w-full h-auto block" draggable={false} />
      {/* Before image: absolutely positioned, same size, clipped by width */}
      <div className="absolute inset-0 overflow-hidden" style={{ clipPath: `inset(0 ${100 - sliderPos}% 0 0)` }}>
        <img 
          src={before} alt={beforeLabel} className="absolute inset-0 w-full h-full object-cover"
          draggable={false}
        />
      </div>
      {/* Slider line + handle */}
      <div className="absolute top-0 bottom-0 w-0.5 bg-white shadow-lg z-10" style={{ left: `${sliderPos}%`, transform: 'translateX(-50%)' }}>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 bg-white rounded-full shadow-lg flex items-center justify-center">
          <GripVertical className="w-4 h-4 text-gray-600" />
        </div>
      </div>
      <div className="absolute top-3 left-3 bg-black/60 text-white text-[10px] font-semibold px-2 py-1 rounded-md uppercase tracking-wider">{beforeLabel}</div>
      <div className="absolute top-3 right-3 bg-black/60 text-white text-[10px] font-semibold px-2 py-1 rounded-md uppercase tracking-wider">{afterLabel}</div>
    </div>
  );
}

export default function ImageStudioPage() {
  const t = useTranslations('imageStudio');
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
  const [showSaveDropdown, setShowSaveDropdown] = useState(false);
  const [savedToProperty, setSavedToProperty] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const saveDropdownRef = useRef<HTMLDivElement>(null);
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

  // Close save dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (saveDropdownRef.current && !saveDropdownRef.current.contains(e.target as Node)) {
        setShowSaveDropdown(false);
      }
    }
    if (showSaveDropdown) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showSaveDropdown]);

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
      const apiUrl = (config.apiUrl || '').replace(/\/+$/, '');
      
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
        throw new Error(data.error || t('errorGeneric'));
      }

      const data = await response.json();
      setResultImage(data.image);
    } catch (err: any) {
      console.error('Image studio error:', err);
      setError(err.message || t('errorFailed'));
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownload = async () => {
    if (!resultImage) return;
    try {
      // For S3 URLs we need to fetch and create a blob URL for download
      if (resultImage.startsWith('http')) {
        const response = await fetch(resultImage);
        const blob = await response.blob();
        const blobUrl = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = blobUrl;
        link.download = `staged-${selectedRoom?.id || 'room'}-${selectedStyle?.id || 'style'}-${Date.now()}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(blobUrl);
      } else {
        // Base64 data URL — direct download
        const link = document.createElement('a');
        link.href = resultImage;
        link.download = `staged-${selectedRoom?.id || 'room'}-${selectedStyle?.id || 'style'}-${Date.now()}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    } catch (err) {
      console.error('Download error:', err);
    }
  };

  const handleSaveToProperty = async (property: Property) => {
    if (!resultImage) return;
    try {
      const { fetchAuthSession } = await import('aws-amplify/auth');
      const session = await fetchAuthSession();
      const token = session.tokens?.idToken?.toString();
      
      const response = await fetch(resultImage);
      const blob = await response.blob();
      const formData = new FormData();
      formData.append('images', blob, `staged-${selectedRoom?.id || 'room'}-${Date.now()}.png`);
      
      const config = getRuntimeConfig();
      const apiUrl = (config.apiUrl || '').replace(/\/+$/, '');
      
      await fetch(`${apiUrl}/properties/${property.id}/images`, {
        method: 'POST',
        headers: { ...(token ? { 'Authorization': `Bearer ${token}` } : {}) },
        body: formData
      });
      
      setSavedToProperty(property.id);
      setShowSaveDropdown(false);
      setTimeout(() => setSavedToProperty(null), 3000);
    } catch (err) {
      console.error('Error saving to property:', err);
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
    setSavedToProperty(null);
    setShowSaveDropdown(false);
  };

  // ── Unified Layout: Settings left, Image right ──
  return (
    <div className="h-full flex bg-white relative">
      {/* Mobile sidebar toggle */}
      <button
        onClick={() => setSidebarOpen(true)}
        className="lg:hidden absolute top-4 left-4 z-20 p-2 bg-white border border-gray-200 rounded-lg shadow-sm hover:bg-gray-50 transition-colors"
        aria-label="Einstellungen öffnen"
      >
        <Menu className="w-5 h-5 text-gray-600" />
      </button>

      {/* Mobile backdrop */}
      {sidebarOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/40 z-30"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* ── Left Sidebar: Settings ── */}
      <div className={`w-72 2xl:w-80 shrink-0 border-r border-gray-100 flex flex-col h-full overflow-y-auto bg-white transition-transform duration-300 z-40 ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      } lg:translate-x-0 fixed lg:static inset-y-0 left-0 shadow-xl lg:shadow-none`}>
        {/* Close button for mobile */}
        <div className="lg:hidden flex items-center justify-between p-4 border-b border-gray-100 shrink-0">
          <span className="text-sm font-semibold text-gray-900">Einstellungen</span>
          <button
            onClick={() => setSidebarOpen(false)}
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            aria-label="Schließen"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-4 2xl:p-5 space-y-5 flex-1">
          {/* Image Source */}
          <div>
            <h3 className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-2">{t('sections.image')}</h3>
            
            {/* Current image info */}
            {originalImage && (
              <div className="flex items-center gap-2 mb-2 p-2 bg-gray-50 rounded-lg">
                <img src={originalImage} alt="" className="w-10 h-10 rounded object-cover" />
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] font-medium text-gray-700 truncate">
                    {selectedProperty?.title || t('uploaded')}
                  </p>
                  {imageDimensions && (
                    <p className="text-[10px] text-gray-400">{imageDimensions.width} x {imageDimensions.height}px</p>
                  )}
                </div>
                <button onClick={handleReset} className="p-1 hover:bg-gray-200 rounded transition-colors shrink-0">
                  <X className="w-3.5 h-3.5 text-gray-400" />
                </button>
              </div>
            )}

            {/* Property Picker */}
            {properties.length > 0 && (
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setShowPropertyDropdown(!showPropertyDropdown)}
                  className="w-full flex items-center justify-between px-3 py-2 bg-white rounded-lg border border-gray-200 hover:border-gray-300 transition-colors text-xs"
                >
                  <div className="flex items-center gap-2">
                    <Building2 className="w-3.5 h-3.5 text-gray-400" />
                    <span className="text-gray-600">{t('selectFromProperty')}</span>
                  </div>
                  <ChevronDown className={`w-3.5 h-3.5 text-gray-400 transition-transform ${showPropertyDropdown ? 'rotate-180' : ''}`} />
                </button>
                
                {showPropertyDropdown && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-xl shadow-xl border border-gray-200 max-h-[350px] overflow-y-auto z-30">
                    {properties.filter(p => p.images && p.images.length > 0).length === 0 ? (
                      <div className="p-4 text-center text-gray-400 text-xs">
                        <ImageIcon className="w-6 h-6 mx-auto mb-1.5 text-gray-300" />
                        {t('noPropertiesWithImages')}
                      </div>
                    ) : (
                      properties.filter(p => p.images && p.images.length > 0).map((property) => (
                        <div key={property.id} className="border-b border-gray-100 last:border-0">
                          <div className="px-3 pt-2.5 pb-1.5">
                            <p className="text-xs font-semibold text-gray-900">{property.title}</p>
                            {property.address && (
                              <p className="text-[10px] text-gray-400">{property.address}</p>
                            )}
                          </div>
                          <div className="px-2.5 pb-2.5 grid grid-cols-3 gap-1.5">
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
                                    alt={`${property.title} ${idx + 1}`} 
                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200" 
                                    onError={(e) => {
                                      const target = e.target as HTMLImageElement;
                                      target.onerror = null;
                                      target.src = 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="200" height="150" viewBox="0 0 200 150"><rect fill="#e5e7eb" width="200" height="150"/><text x="50%" y="50%" text-anchor="middle" dy=".3em" fill="#9ca3af" font-size="12" font-family="sans-serif">—</text></svg>');
                                    }}
                                  />
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

            {/* Upload button */}
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full mt-2 flex items-center justify-center gap-2 px-3 py-2 border border-dashed border-gray-200 rounded-lg text-xs text-gray-500 hover:border-gray-400 hover:text-gray-700 hover:bg-gray-50/50 transition-all"
            >
              <Upload className="w-3.5 h-3.5" />
              {originalImage ? t('changeImage') : t('uploadPhoto')}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleFileUpload}
              className="hidden"
            />
          </div>

          {/* Divider */}
          <div className="h-px bg-gray-100" />

          {/* Style Selection */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">{t('sections.style')}</h3>
              {selectedStyle && (
                <button onClick={() => setSelectedStyle(null)} className="text-[10px] text-gray-400 hover:text-gray-600">
                  {t('reset')}
                </button>
              )}
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              {STYLES.map((style) => (
                <button
                  key={style.id}
                  onClick={() => setSelectedStyle(selectedStyle?.id === style.id ? null : style)}
                  className={`px-2.5 py-2 rounded-lg text-left transition-all ${
                    selectedStyle?.id === style.id
                      ? 'bg-gray-900 text-white shadow-sm'
                      : 'bg-gray-50 text-gray-600 hover:bg-gray-100 border border-gray-100'
                  }`}
                >
                  <span className="text-xs font-medium block">{t(`styles.${style.id}.name`)}</span>
                  <span className={`text-[10px] block ${selectedStyle?.id === style.id ? 'text-gray-300' : 'text-gray-400'}`}>{t(`styles.${style.id}.desc`)}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Room Type */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">{t('sections.roomType')}</h3>
              {selectedRoom && (
                <button onClick={() => setSelectedRoom(null)} className="text-[10px] text-gray-400 hover:text-gray-600">
                  {t('reset')}
                </button>
              )}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {ROOMS.map((room) => (
                <button
                  key={room.id}
                  onClick={() => setSelectedRoom(selectedRoom?.id === room.id ? null : room)}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    selectedRoom?.id === room.id
                      ? 'bg-gray-900 text-white shadow-sm'
                      : 'bg-gray-50 text-gray-600 hover:bg-gray-100 border border-gray-100'
                  }`}
                >
                  {t(`rooms.${ROOM_TRANSLATION_KEYS[room.id]}`)}
                </button>
              ))}
            </div>
          </div>

          {/* Custom Prompt */}
          <div>
            <h3 className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-2">
              {t('sections.prompt')} <span className="font-normal normal-case text-gray-400">{t('optional')}</span>
            </h3>
            <textarea
              value={customPrompt}
              onChange={(e) => setCustomPrompt(e.target.value)}
              placeholder={t('promptPlaceholder')}
              rows={3}
              className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent text-xs text-gray-900 placeholder-gray-400 resize-none"
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey && hasSelection && !isProcessing && originalImage) { e.preventDefault(); handleGenerate(); } }}
            />
          </div>
        </div>

        {/* Bottom: Generate button + info */}
        <div className="p-4 2xl:p-5 border-t border-gray-100 space-y-3">
          {/* Validation hint */}
          {!hasSelection && originalImage && (
            <p className="text-[10px] text-amber-600 flex items-center gap-1">
              <AlertTriangle className="w-3 h-3 shrink-0" />
              {t('validationHint')}
            </p>
          )}

          {error && (
            <p className="text-[10px] text-red-600 flex items-start gap-1">
              <AlertTriangle className="w-3 h-3 shrink-0 mt-0.5" />
              {error}
            </p>
          )}

          <button
            onClick={handleGenerate}
            disabled={isProcessing || !hasSelection || !originalImage}
            className={`w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg font-medium text-sm transition-all ${
              isProcessing || !hasSelection || !originalImage
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                : 'bg-gray-900 text-white hover:bg-gray-800 shadow-sm hover:shadow-md'
            }`}
          >
            {isProcessing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                {t('generateProcessing', { elapsed })}
              </>
            ) : (
              <>
                <Wand2 className="w-4 h-4" />
                {t('generate')}
              </>
            )}
          </button>

          

          <p className="text-[9px] text-gray-300 text-center">
            {t('compressionInfo')}
          </p>
        </div>
      </div>

      {/* ── Right: Image Area ── */}
      <div 
        className="flex-1 flex items-center justify-center p-6 2xl:p-10 overflow-auto bg-gray-50/50"
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
      >
        {/* No image yet: Upload prompt */}
        {!originalImage && (
          <div 
            onClick={() => fileInputRef.current?.click()}
            className="w-full max-w-2xl aspect-[4/3] border-2 border-dashed border-gray-200 rounded-2xl flex flex-col items-center justify-center cursor-pointer hover:border-gray-400 hover:bg-white/60 transition-all group"
          >
            <Upload className="w-12 h-12 text-gray-200 group-hover:text-gray-400 mb-4 transition-colors" />
            <p className="text-sm font-medium text-gray-400 group-hover:text-gray-600 transition-colors">{t('uploadPrompt')}</p>
            <p className="text-xs text-gray-300 mt-1">{t('fileTypes')}</p>
          </div>
        )}

        {/* Processing */}
        {isProcessing && originalImage && (
          <div className="w-full max-w-2xl">
            <div className="relative rounded-xl overflow-hidden bg-gray-100">
              <img src={originalImage} alt="Original" className="w-full h-auto opacity-40" />
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <div className="relative w-20 h-20 mb-6">
                  <div className="absolute inset-0 border-2 border-gray-200 rounded-2xl bg-white/80" />
                  <div className="absolute bottom-2 left-2 w-6 h-4 bg-gray-400 rounded-sm animate-[staging-pop_2s_ease-in-out_infinite]" />
                  <div className="absolute bottom-2 right-3 w-4 h-6 bg-gray-500 rounded-sm animate-[staging-pop_2s_ease-in-out_0.4s_infinite]" />
                  <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-8 h-2.5 bg-gray-400 rounded-sm animate-[staging-pop_2s_ease-in-out_0.8s_infinite]" />
                  <div className="absolute -top-1 -right-1 animate-[staging-sparkle_1.5s_ease-in-out_infinite]">
                    <Sparkles className="w-4 h-4 text-yellow-400" />
                  </div>
                </div>
                <div className="w-48 h-1.5 bg-white/60 rounded-full overflow-hidden mb-4">
                  <div 
                    className="h-full bg-gray-800 rounded-full transition-all duration-1000 ease-out"
                    style={{ width: `${Math.min((elapsed / 25) * 100, 95)}%` }}
                  />
                </div>
                <p className="text-base font-semibold text-gray-900">{t('processing')}</p>
                <p className="text-sm text-gray-500 mt-1">{t('processingTime', { elapsed })}</p>
              </div>
            </div>
          </div>
        )}

        {/* Result: Before/After + Action Buttons */}
        {resultImage && originalImage && !isProcessing && (
          <div className="w-full max-w-2xl">
            <BeforeAfterSlider before={originalImage} after={resultImage} beforeLabel={t('before')} afterLabel={t('after')} />
            
            {/* Action buttons below the image */}
            <div className="flex items-center gap-2 mt-4">
              <button
                onClick={handleGenerate}
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                {t('regenerate')}
              </button>
              <button
                onClick={handleDownload}
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                {t('download')}
              </button>

              {/* Save to property */}
              <div className="relative ml-auto" ref={saveDropdownRef}>
                {selectedProperty ? (
                  <button
                    onClick={() => handleSaveToProperty(selectedProperty)}
                    className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg transition-colors ${
                      savedToProperty === selectedProperty.id
                        ? 'bg-green-100 text-green-700 border border-green-200'
                        : 'bg-gray-900 text-white hover:bg-gray-800'
                    }`}
                  >
                    {savedToProperty === selectedProperty.id ? (
                      <><Check className="w-3.5 h-3.5" /> {t('saved')}</>
                    ) : (
                      <><Save className="w-3.5 h-3.5" /> {t('addToProperty', { title: selectedProperty.title.length > 20 ? selectedProperty.title.slice(0, 20) + '...' : selectedProperty.title })}</>
                    )}
                  </button>
                ) : (
                  <>
                    <button
                      onClick={() => setShowSaveDropdown(!showSaveDropdown)}
                      className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg transition-colors ${
                        savedToProperty
                          ? 'bg-green-100 text-green-700 border border-green-200'
                          : 'bg-gray-900 text-white hover:bg-gray-800'
                      }`}
                    >
                      {savedToProperty ? (
                        <><Check className="w-3.5 h-3.5" /> {t('saved')}</>
                      ) : (
                        <><Building2 className="w-3.5 h-3.5" /> {t('addToPropertyShort')}</>
                      )}
                    </button>
                    {showSaveDropdown && (
                      <div className="absolute bottom-full right-0 mb-2 w-64 bg-white rounded-xl shadow-xl border border-gray-200 max-h-[300px] overflow-y-auto z-30">
                        <div className="p-2">
                          <p className="text-[10px] text-gray-400 font-medium uppercase tracking-wider px-2 py-1">{t('saveToHeading')}</p>
                          {properties.length === 0 ? (
                            <p className="text-xs text-gray-400 p-3 text-center">{t('noProperties')}</p>
                          ) : (
                            properties.map((property) => (
                              <button
                                key={property.id}
                                onClick={() => handleSaveToProperty(property)}
                                className="w-full text-left px-2.5 py-2 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2"
                              >
                                <Building2 className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                                <div className="min-w-0">
                                  <p className="text-xs font-medium text-gray-900 truncate">{property.title}</p>
                                  {property.address && <p className="text-[10px] text-gray-400 truncate">{property.address}</p>}
                                </div>
                              </button>
                            ))
                          )}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Original image (no result, not processing) */}
        {originalImage && !resultImage && !isProcessing && (
          <div className="w-full max-w-2xl">
            <div className="rounded-xl overflow-hidden bg-gray-100 border border-gray-100">
              <img src={originalImage} alt="Original" className="w-full h-auto" />
            </div>
            <p className="text-[10px] text-gray-400 text-center mt-3">
              {t('hint')}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
