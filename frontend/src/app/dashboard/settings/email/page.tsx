'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { fetchWithAuth } from '@/lib/api';
import { useEnv } from '@/components/EnvProvider';
import { Eye, Code, Loader2, Sparkles, User, Mail, Phone, Building2, Globe, AlertCircle, Check } from 'lucide-react';
import useSWR from 'swr';
import { useGlobalState } from '@/context/GlobalStateContext';

// Iframe-based preview — renders HTML natively, no DOMPurify stripping of images/styles
function SignaturePreview({ html }: { html: string }) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [height, setHeight] = useState(120);

  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;
    const doc = iframe.contentDocument;
    if (!doc) return;

    doc.open();
    doc.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><style>
      * { box-sizing: border-box; margin: 0; padding: 0; }
      body { font-family: Arial, sans-serif; font-size: 14px; line-height: 1.5; color: #333; padding: 16px; word-wrap: break-word; overflow-x: hidden; }
      img { max-width: 100%; height: auto; }
      a { color: #2563eb; }
      p { margin: 0 0 4px 0; }
    </style></head><body>${html}</body></html>`);
    doc.close();

    const resize = () => {
      const body = iframe.contentDocument?.body;
      if (body) setHeight(Math.max(80, body.scrollHeight + 32));
    };
    setTimeout(resize, 80);
    setTimeout(resize, 400);
  }, [html]);

  return (
    <iframe
      ref={iframeRef}
      className="w-full border-0"
      style={{ height }}
      sandbox="allow-same-origin"
      title="Signatur Vorschau"
    />
  );
}

export default function EmailSettingsPage() {
  const { apiUrl } = useEnv();
  const { aiActionPerformed, setAiChatDraft, setSidebarExpanded } = useGlobalState();
  const [signature, setSignature] = useState('');
  const [signatureName, setSignatureName] = useState('');
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [viewMode, setViewMode] = useState<'edit' | 'preview'>('edit');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isInitialLoad = useRef(true);

  // Load user settings
  const { data: settings, mutate } = useSWR(
    apiUrl ? `${apiUrl}/me/settings` : null,
    (url: string) => fetchWithAuth(url)
  );

  useEffect(() => {
    if (settings) {
      setSignature(settings.emailSignature || '');
      setSignatureName(settings.emailSignatureName || '');
      isInitialLoad.current = false;
    }
  }, [settings]);

  // Reload when Mivo performs an action + auto-switch to preview
  useEffect(() => {
    if (aiActionPerformed) {
      mutate().then(() => setViewMode('preview'));
    }
  }, [aiActionPerformed, mutate]);

  // Auto-save: debounced 900ms after any change
  const triggerAutoSave = useCallback((sig: string, sigName: string) => {
    if (isInitialLoad.current) return;
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    setSaveState('saving');
    autoSaveTimer.current = setTimeout(async () => {
      if (!apiUrl) return;
      try {
        await fetchWithAuth(`${apiUrl}/me/settings`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ emailSignature: sig, emailSignatureName: sigName }),
        });
        mutate();
        setSaveState('saved');
        setTimeout(() => setSaveState('idle'), 2000);
      } catch {
        setSaveState('idle');
      }
    }, 900);
  }, [apiUrl, mutate]);

  const handleSignatureChange = (val: string) => {
    setSignature(val);
    triggerAutoSave(val, signatureName);
  };

  const handleSignatureNameChange = (val: string) => {
    setSignatureName(val);
    triggerAutoSave(signature, val);
  };

  // Opens Mivo chat with a guided prompt for signature creation
  const openMivoForSignature = () => {
    setAiChatDraft(
      'Erstelle mir eine professionelle HTML E-Mail-Signatur. Frag mich kurz: welche Infos sollen rein (Name, Titel, Telefon, Website etc.) und ob ich ein Logo hochladen möchte. Falls ein Logo dabei ist, pass die Größe automatisch an (max. 150px Höhe).'
    );
    setSidebarExpanded(true);
  };

  const insertVariable = (variable: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const newSignature = signature.substring(0, start) + variable + signature.substring(end);
    setSignature(newSignature);
    
    // Restore cursor position
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + variable.length, start + variable.length);
    }, 0);
  };

  const variables = [
    { label: 'Name', value: '{{name}}', icon: User },
    { label: 'E-Mail', value: '{{email}}', icon: Mail },
    { label: 'Telefon', value: '{{phone}}', icon: Phone },
    { label: 'Firma', value: '{{company}}', icon: Building2 },
    { label: 'Website', value: '{{website}}', icon: Globe },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h2 className="text-xl font-semibold text-gray-900">E-Mail Signatur</h2>
        <p className="mt-1 text-sm text-gray-500">
          Erstelle eine professionelle Signatur, die automatisch an deine E-Mails angehängt wird.
        </p>
      </div>

      {/* Signature Name */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Signatur-Name (optional)
        </label>
        <input
          type="text"
          value={signatureName}
          onChange={(e) => handleSignatureNameChange(e.target.value)}
          placeholder="z.B. Geschäftlich, Privat..."
          className="w-full max-w-md rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:ring-opacity-20 outline-none transition-all"
        />
      </div>

      {/* Editor/Preview Toggle */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 bg-gray-100 rounded-lg p-1">
          <button
            onClick={() => setViewMode('edit')}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
              viewMode === 'edit'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Code className="w-4 h-4 inline mr-2" />
            Bearbeiten
          </button>
          <button
            onClick={() => setViewMode('preview')}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
              viewMode === 'preview'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Eye className="w-4 h-4 inline mr-2" />
            Vorschau
          </button>
        </div>

        <div className="flex items-center gap-3">
          {saveState === 'saving' && (
            <span className="flex items-center gap-1.5 text-xs text-gray-400">
              <Loader2 className="w-3.5 h-3.5 animate-spin" /> Speichern...
            </span>
          )}
          {saveState === 'saved' && (
            <span className="flex items-center gap-1.5 text-xs text-green-600 font-medium">
              <Check className="w-3.5 h-3.5" /> Gespeichert
            </span>
          )}
          <button
            onClick={openMivoForSignature}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-blue-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
          >
            <Sparkles className="w-4 h-4" />
            Mit Mivo generieren
          </button>
        </div>
      </div>

      {/* Variables (only in edit mode) */}
      {viewMode === 'edit' && (
        <div className="flex flex-wrap gap-2">
          <span className="text-xs text-gray-500 mr-2 self-center">Variablen einfügen:</span>
          {variables.map((v) => {
            const Icon = v.icon;
            return (
              <button
                key={v.value}
                onClick={() => insertVariable(v.value)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 bg-gray-100 rounded-full hover:bg-gray-200 transition-colors"
              >
                <Icon className="w-3.5 h-3.5" />
                {v.label}
              </button>
            );
          })}
        </div>
      )}

      {/* Editor / Preview */}
      <div className="border border-gray-200 rounded-xl overflow-hidden">
        {viewMode === 'edit' ? (
          <textarea
            ref={textareaRef}
            value={signature}
            onChange={(e) => handleSignatureChange(e.target.value)}
            placeholder="<div>
  <p><strong>Max Mustermann</strong></p>
  <p>Immobilienmakler</p>
  <p>Tel: +49 123 456789</p>
  <p>E-Mail: max@beispiel.de</p>
</div>"
            className="w-full h-64 p-4 text-sm font-mono text-gray-800 bg-gray-50 resize-none focus:outline-none focus:bg-white transition-colors"
          />
        ) : (
          <div className="bg-white min-h-[120px]">
            {signature ? (
              <SignaturePreview html={signature} />
            ) : (
              <div className="flex flex-col items-center justify-center h-32 text-gray-400">
                <AlertCircle className="w-8 h-8 mb-2 opacity-50" />
                <p className="text-sm">Keine Signatur vorhanden</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Info */}
      <div className="bg-blue-50 border border-blue-100 rounded-lg p-4">
        <div className="flex gap-3">
          <Mail className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
          <div className="text-sm text-blue-800">
            <p className="font-medium mb-1">HTML-Signatur</p>
            <p className="text-blue-600">
              Du kannst HTML verwenden, um deine Signatur zu formatieren. Die Signatur wird automatisch 
              an alle E-Mails angehängt, die du über das System versendest. Mivo kann die Signatur 
              auch automatisch bei E-Mails einfügen.
            </p>
          </div>
        </div>
      </div>

    </div>
  );
}
