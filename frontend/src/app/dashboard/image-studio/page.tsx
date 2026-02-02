'use client';

import { useState, useRef, useCallback } from 'react';
import { 
  Upload, 
  Wand2, 
  Image as ImageIcon, 
  Sofa, 
  Loader2, 
  Download, 
  RefreshCw,
  Building2,
  Sparkles,
  ChevronDown,
  X,
  Check
} from 'lucide-react';
import useSWR from 'swr';
import { getProperties } from '@/lib/api';

interface Property {
  id: string;
  title: string;
  images?: string[];
}

const FURNITURE_STYLES = [
  { id: 'modern', name: 'Modern', description: 'Klare Linien, minimalistisch' },
  { id: 'scandinavian', name: 'Skandinavisch', description: 'Hell, gemütlich, Holz' },
  { id: 'industrial', name: 'Industrial', description: 'Metall, Beton, urban' },
  { id: 'classic', name: 'Klassisch', description: 'Elegant, zeitlos' },
  { id: 'bohemian', name: 'Boho', description: 'Farbenfroh, eklektisch' },
  { id: 'luxury', name: 'Luxus', description: 'High-End, exklusiv' },
];

const ROOM_TYPES = [
  { id: 'living', name: 'Wohnzimmer' },
  { id: 'bedroom', name: 'Schlafzimmer' },
  { id: 'kitchen', name: 'Küche' },
  { id: 'dining', name: 'Esszimmer' },
  { id: 'office', name: 'Büro' },
  { id: 'bathroom', name: 'Badezimmer' },
];

export default function ImageStudioPage() {
  const { data: properties = [] } = useSWR<Property[]>('/properties', getProperties);
  
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const [showPropertyDropdown, setShowPropertyDropdown] = useState(false);
  const [selectedStyle, setSelectedStyle] = useState(FURNITURE_STYLES[0]);
  const [selectedRoom, setSelectedRoom] = useState(ROOM_TYPES[0]);
  const [customPrompt, setCustomPrompt] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [resultImage, setResultImage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setSelectedImage(event.target?.result as string);
        setSelectedProperty(null);
        setResultImage(null);
        setError(null);
      };
      reader.readAsDataURL(file);
    }
  }, []);

  const handlePropertyImageSelect = (property: Property, imageUrl: string) => {
    setSelectedImage(imageUrl);
    setSelectedProperty(property);
    setShowPropertyDropdown(false);
    setResultImage(null);
    setError(null);
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setSelectedImage(event.target?.result as string);
        setSelectedProperty(null);
        setResultImage(null);
        setError(null);
      };
      reader.readAsDataURL(file);
    }
  }, []);

  const handleGenerate = async () => {
    if (!selectedImage) return;
    
    setIsProcessing(true);
    setError(null);
    
    try {
      const token = localStorage.getItem('token');
      const prompt = customPrompt || 
        `Füge ${selectedStyle.name.toLowerCase()} Möbel in dieses ${selectedRoom.name.toLowerCase()} ein. ` +
        `Der Stil soll ${selectedStyle.description.toLowerCase()} sein. ` +
        `Behalte die Raumstruktur bei und füge passende Möbel, Dekoration und Beleuchtung hinzu. ` +
        `Das Ergebnis soll fotorealistisch und einladend aussehen.`;

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/ai/image-edit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          image: selectedImage,
          prompt,
          style: selectedStyle.id,
          roomType: selectedRoom.id
        })
      });

      if (!response.ok) {
        throw new Error('Bildbearbeitung fehlgeschlagen');
      }

      const data = await response.json();
      setResultImage(data.image);
    } catch (err) {
      console.error('Error generating image:', err);
      setError('Die Bildbearbeitung ist fehlgeschlagen. Bitte versuche es erneut.');
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
      const token = localStorage.getItem('token');
      // Convert base64 to blob
      const response = await fetch(resultImage);
      const blob = await response.blob();
      
      const formData = new FormData();
      formData.append('images', blob, `staged-${selectedRoom.id}-${Date.now()}.png`);
      
      await fetch(`${process.env.NEXT_PUBLIC_API_URL}/properties/${selectedProperty.id}/images`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });
      
      alert('Bild wurde zum Objekt hinzugefügt!');
    } catch (err) {
      console.error('Error saving to property:', err);
      alert('Fehler beim Speichern');
    }
  };

  const handleReset = () => {
    setSelectedImage(null);
    setSelectedProperty(null);
    setResultImage(null);
    setError(null);
    setCustomPrompt('');
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="px-8 pt-8 pb-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 bg-gradient-to-br from-fuchsia-500 to-pink-500 rounded-xl flex items-center justify-center">
            <Wand2 className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-gray-900">KI-Bildstudio</h1>
            <p className="text-gray-500 text-sm">Virtual Staging mit Gemini 3 Pro Image</p>
          </div>
        </div>
      </div>

      <div className="px-8 pb-8">
        <div className="grid lg:grid-cols-2 gap-8">
          {/* Left: Image Selection & Upload */}
          <div className="space-y-6">
            {/* Source Selection */}
            <div className="bg-gray-50 rounded-2xl p-6">
              <h3 className="text-sm font-semibold text-gray-900 mb-4">Bild auswählen</h3>
              
              {/* Property Dropdown */}
              <div className="relative mb-4">
                <button
                  onClick={() => setShowPropertyDropdown(!showPropertyDropdown)}
                  className="w-full flex items-center justify-between px-4 py-3 bg-white rounded-xl border border-gray-200 hover:border-gray-300 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Building2 className="w-5 h-5 text-gray-400" />
                    <span className="text-gray-700">
                      {selectedProperty ? selectedProperty.title : 'Aus Objekt wählen...'}
                    </span>
                  </div>
                  <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform ${showPropertyDropdown ? 'rotate-180' : ''}`} />
                </button>
                
                {showPropertyDropdown && (
                  <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-xl border border-gray-100 max-h-64 overflow-y-auto z-10">
                    {properties.length === 0 ? (
                      <div className="px-4 py-3 text-sm text-gray-500">Keine Objekte vorhanden</div>
                    ) : (
                      properties.map((property) => (
                        <div key={property.id} className="p-2">
                          <div className="px-3 py-2 text-sm font-medium text-gray-900">{property.title}</div>
                          {property.images && property.images.length > 0 ? (
                            <div className="flex gap-2 px-3 pb-2 overflow-x-auto">
                              {property.images.slice(0, 5).map((img, idx) => (
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
                      ))
                    )}
                  </div>
                )}
              </div>

              {/* Divider */}
              <div className="flex items-center gap-4 my-4">
                <div className="flex-1 h-px bg-gray-200" />
                <span className="text-xs text-gray-400 uppercase">oder</span>
                <div className="flex-1 h-px bg-gray-200" />
              </div>

              {/* Upload Area */}
              <div
                onDrop={handleDrop}
                onDragOver={(e) => e.preventDefault()}
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-gray-200 rounded-xl p-8 text-center cursor-pointer hover:border-indigo-400 hover:bg-indigo-50/50 transition-all"
              >
                <Upload className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                <p className="text-sm text-gray-600 mb-1">Bild hochladen</p>
                <p className="text-xs text-gray-400">Drag & Drop oder klicken</p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </div>
            </div>

            {/* Preview */}
            {selectedImage && (
              <div className="bg-gray-50 rounded-2xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-semibold text-gray-900">Originalbild</h3>
                  <button
                    onClick={handleReset}
                    className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1"
                  >
                    <X className="w-4 h-4" />
                    Entfernen
                  </button>
                </div>
                <div className="rounded-xl overflow-hidden bg-gray-200">
                  <img src={selectedImage} alt="Original" className="w-full h-auto" />
                </div>
              </div>
            )}
          </div>

          {/* Right: Settings & Result */}
          <div className="space-y-6">
            {/* Style Selection */}
            <div className="bg-gray-50 rounded-2xl p-6">
              <h3 className="text-sm font-semibold text-gray-900 mb-4">Einrichtungsstil</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {FURNITURE_STYLES.map((style) => (
                  <button
                    key={style.id}
                    onClick={() => setSelectedStyle(style)}
                    className={`p-3 rounded-xl text-left transition-all ${
                      selectedStyle.id === style.id
                        ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/30'
                        : 'bg-white border border-gray-200 hover:border-indigo-300'
                    }`}
                  >
                    <div className={`text-sm font-medium ${selectedStyle.id === style.id ? 'text-white' : 'text-gray-900'}`}>
                      {style.name}
                    </div>
                    <div className={`text-xs mt-1 ${selectedStyle.id === style.id ? 'text-indigo-200' : 'text-gray-500'}`}>
                      {style.description}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Room Type */}
            <div className="bg-gray-50 rounded-2xl p-6">
              <h3 className="text-sm font-semibold text-gray-900 mb-4">Raumtyp</h3>
              <div className="flex flex-wrap gap-2">
                {ROOM_TYPES.map((room) => (
                  <button
                    key={room.id}
                    onClick={() => setSelectedRoom(room)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                      selectedRoom.id === room.id
                        ? 'bg-indigo-600 text-white'
                        : 'bg-white border border-gray-200 text-gray-700 hover:border-indigo-300'
                    }`}
                  >
                    {room.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Prompt */}
            <div className="bg-gray-50 rounded-2xl p-6">
              <h3 className="text-sm font-semibold text-gray-900 mb-4">Eigene Anweisungen (optional)</h3>
              <textarea
                value={customPrompt}
                onChange={(e) => setCustomPrompt(e.target.value)}
                placeholder="z.B. 'Füge ein graues Sofa und einen Couchtisch aus Holz hinzu...'"
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none text-gray-900"
                rows={3}
              />
            </div>

            {/* Generate Button */}
            <button
              onClick={handleGenerate}
              disabled={!selectedImage || isProcessing}
              className={`w-full flex items-center justify-center gap-3 px-6 py-4 rounded-xl font-semibold text-lg transition-all ${
                !selectedImage || isProcessing
                  ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                  : 'bg-gradient-to-r from-fuchsia-500 to-pink-500 text-white hover:shadow-lg hover:shadow-fuchsia-500/30 hover:-translate-y-0.5'
              }`}
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Wird bearbeitet...
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5" />
                  Möbel einbauen
                </>
              )}
            </button>

            {/* Error */}
            {error && (
              <div className="bg-red-50 text-red-600 px-4 py-3 rounded-xl text-sm">
                {error}
              </div>
            )}

            {/* Result - Before/After Comparison */}
            {resultImage && selectedImage && (
              <div className="bg-gray-50 rounded-2xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                    <Check className="w-4 h-4 text-green-500" />
                    Vorher / Nachher
                  </h3>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleGenerate}
                      className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1"
                    >
                      <RefreshCw className="w-4 h-4" />
                      Neu generieren
                    </button>
                    {selectedProperty && (
                      <button
                        onClick={handleSaveToProperty}
                        className="text-sm text-green-600 hover:text-green-700 flex items-center gap-1"
                      >
                        <Check className="w-4 h-4" />
                        Zum Objekt
                      </button>
                    )}
                    <button
                      onClick={handleDownload}
                      className="text-sm text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
                    >
                      <Download className="w-4 h-4" />
                      Download
                    </button>
                  </div>
                </div>
                
                {/* Before/After Slider */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-gray-500 mb-2 text-center">Vorher</p>
                    <div className="rounded-xl overflow-hidden bg-gray-200 aspect-video">
                      <img src={selectedImage} alt="Vorher" className="w-full h-full object-cover" />
                    </div>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-2 text-center">Nachher</p>
                    <div className="rounded-xl overflow-hidden bg-gray-200 aspect-video">
                      <img src={resultImage} alt="Nachher" className="w-full h-full object-cover" />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
