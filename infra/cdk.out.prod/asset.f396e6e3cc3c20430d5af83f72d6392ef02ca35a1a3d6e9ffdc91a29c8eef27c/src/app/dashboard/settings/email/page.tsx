'use client';

import { useState, useEffect, useRef } from 'react';
import DOMPurify from 'dompurify';
import { fetchWithAuth } from '@/lib/api';
import { useEnv } from '@/components/EnvProvider';
import { Save, Eye, Code, Loader2, Sparkles, User, Mail, Phone, Building2, Globe, AlertCircle } from 'lucide-react';
import useSWR from 'swr';
import { useGlobalState } from '@/context/GlobalStateContext';

export default function EmailSettingsPage() {
  const { apiUrl } = useEnv();
  const { aiActionPerformed } = useGlobalState();
  const [signature, setSignature] = useState('');
  const [signatureName, setSignatureName] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [viewMode, setViewMode] = useState<'edit' | 'preview'>('edit');
  const [generating, setGenerating] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Load user settings
  const { data: settings, mutate } = useSWR(
    apiUrl ? `${apiUrl}/me/settings` : null,
    (url: string) => fetchWithAuth(url)
  );

  // Load user profile for AI generation
  const { data: user } = useSWR(
    apiUrl ? `${apiUrl}/me` : null,
    (url: string) => fetchWithAuth(url)
  );

  useEffect(() => {
    if (settings) {
      setSignature(settings.emailSignature || '');
      setSignatureName(settings.emailSignatureName || '');
    }
  }, [settings]);

  // Reload when Mivo performs an action (e.g. update_email_signature)
  useEffect(() => {
    if (aiActionPerformed) {
      mutate();
    }
  }, [aiActionPerformed, mutate]);

  const handleSave = async () => {
    if (!apiUrl) return;
    setSaving(true);
    try {
      await fetchWithAuth(`${apiUrl}/me/settings`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          emailSignature: signature,
          emailSignatureName: signatureName,
        }),
      });
      mutate();
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (error) {
      console.error('Error saving signature:', error);
      alert('Fehler beim Speichern');
    } finally {
      setSaving(false);
    }
  };

  const generateSignature = async () => {
    if (!apiUrl || !user) return;
    setGenerating(true);
    try {
      const response = await fetchWithAuth(`${apiUrl}/mivo/generate-signature`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: user.name,
          email: user.email,
          phone: user.phone,
          company: user.tenant?.name,
        }),
      });
      if (response.signature) {
        setSignature(response.signature);
      }
    } catch (error) {
      console.error('Error generating signature:', error);
      // Fallback: Generate a simple signature locally
      const fallbackSignature = `
<div style="font-family: Arial, sans-serif; font-size: 14px; color: #333;">
  <p style="margin: 0; font-weight: bold;">${user.name || 'Ihr Name'}</p>
  ${user.tenant?.name ? `<p style="margin: 4px 0 0 0; color: #666;">${user.tenant.name}</p>` : ''}
  <p style="margin: 8px 0 0 0;">
    ${user.email ? `<span style="color: #2563eb;">${user.email}</span>` : ''}
    ${user.phone ? `<span style="margin-left: 16px;">${user.phone}</span>` : ''}
  </p>
</div>
      `.trim();
      setSignature(fallbackSignature);
    } finally {
      setGenerating(false);
    }
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
          onChange={(e) => setSignatureName(e.target.value)}
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

        <button
          onClick={generateSignature}
          disabled={generating}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-blue-600 bg-gray-100 rounded-lg hover:bg-gray-200 disabled:opacity-50 transition-colors"
        >
          {generating ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Sparkles className="w-4 h-4" />
          )}
          Mit Mivo generieren
        </button>
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
            onChange={(e) => setSignature(e.target.value)}
            placeholder="<div>
  <p><strong>Max Mustermann</strong></p>
  <p>Immobilienmakler</p>
  <p>Tel: +49 123 456789</p>
  <p>E-Mail: max@beispiel.de</p>
</div>"
            className="w-full h-64 p-4 text-sm font-mono text-gray-800 bg-gray-50 resize-none focus:outline-none focus:bg-white transition-colors"
          />
        ) : (
          <div className="p-6 bg-white min-h-[256px]">
            {signature ? (
              <div 
                className="prose prose-sm max-w-none"
                dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(signature) }}
              />
            ) : (
              <div className="flex flex-col items-center justify-center h-48 text-gray-400">
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

      {/* Save Button */}
      <div className="flex items-center gap-4 pt-4 border-t border-gray-200">
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-6 py-2.5 text-sm font-medium text-white bg-gray-900 rounded-lg hover:bg-gray-800 disabled:opacity-50 transition-colors"
        >
          {saving ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          {saving ? 'Speichern...' : 'Speichern'}
        </button>
        {saved && (
          <span className="text-sm text-green-600 font-medium">
            Signatur gespeichert!
          </span>
        )}
      </div>
    </div>
  );
}
