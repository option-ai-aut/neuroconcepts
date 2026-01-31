'use client';

import { useState, useEffect } from 'react';
import { Globe, Check, X, RefreshCw, Settings2, ExternalLink, ChevronDown, Eye, EyeOff, TestTube } from 'lucide-react';
import { getRuntimeConfig } from '@/components/EnvProvider';

interface Portal {
  id: string;
  name: string;
  slug: string;
  country: string;
  websiteUrl: string | null;
  connectionType: string;
  isPremium: boolean;
  defaultFtpHost: string | null;
}

interface PortalConnection {
  id: string;
  portalId: string;
  portal: Portal;
  ftpHost: string | null;
  ftpPort: number;
  ftpUsername: string | null;
  ftpPassword: string | null;
  ftpPath: string | null;
  useSftp: boolean;
  providerId: string | null;
  isEnabled: boolean;
  lastSyncAt: string | null;
  lastSyncStatus: string | null;
  autoSyncEnabled: boolean;
  autoSyncInterval: number;
}

const COUNTRY_LABELS: Record<string, string> = {
  DE: 'Deutschland',
  AT: 'Österreich',
  CH: 'Schweiz'
};

const COUNTRY_FLAGS: Record<string, string> = {
  DE: '🇩🇪',
  AT: '🇦🇹',
  CH: '🇨🇭'
};

export default function PortalsSettingsPage() {
  const [portals, setPortals] = useState<Portal[]>([]);
  const [connections, setConnections] = useState<PortalConnection[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCountry, setSelectedCountry] = useState<string>('all');
  const [editingPortal, setEditingPortal] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<PortalConnection>>({});
  const [showPassword, setShowPassword] = useState(false);
  const [testing, setTesting] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  // TODO: Get from auth context
  const tenantId = 'default-tenant';

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const config = getRuntimeConfig();
      
      const [portalsRes, connectionsRes] = await Promise.all([
        fetch(`${config.apiUrl}/portals`),
        fetch(`${config.apiUrl}/portal-connections?tenantId=${tenantId}`)
      ]);
      
      if (portalsRes.ok) {
        const portalsData = await portalsRes.json();
        setPortals(portalsData);
      }
      
      if (connectionsRes.ok) {
        const connectionsData = await connectionsRes.json();
        setConnections(connectionsData);
      }
      
      setLoading(false);
    } catch (error) {
      console.error('Error loading portals:', error);
      setLoading(false);
    }
  };

  const getConnection = (portalId: string) => {
    return connections.find(c => c.portalId === portalId);
  };

  const handleEdit = (portal: Portal) => {
    const existing = getConnection(portal.id);
    setEditingPortal(portal.id);
    setFormData({
      ftpHost: existing?.ftpHost || portal.defaultFtpHost || '',
      ftpPort: existing?.ftpPort || 21,
      ftpUsername: existing?.ftpUsername || '',
      ftpPassword: existing?.ftpPassword || '',
      ftpPath: existing?.ftpPath || '/',
      useSftp: existing?.useSftp || false,
      providerId: existing?.providerId || '',
      isEnabled: existing?.isEnabled ?? true,
      autoSyncEnabled: existing?.autoSyncEnabled || false,
      autoSyncInterval: existing?.autoSyncInterval || 24
    });
    setTestResult(null);
  };

  const handleSave = async () => {
    if (!editingPortal) return;
    
    try {
      const config = getRuntimeConfig();
      const res = await fetch(`${config.apiUrl}/portal-connections`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenantId,
          portalId: editingPortal,
          ...formData
        })
      });
      
      if (res.ok) {
        await loadData();
        setEditingPortal(null);
        setFormData({});
      }
    } catch (error) {
      console.error('Error saving connection:', error);
    }
  };

  const handleTest = async (connectionId: string) => {
    setTesting(connectionId);
    setTestResult(null);
    
    try {
      const config = getRuntimeConfig();
      const res = await fetch(`${config.apiUrl}/portal-connections/${connectionId}/test`, {
        method: 'POST'
      });
      
      if (res.ok) {
        const result = await res.json();
        setTestResult(result);
      }
    } catch (error) {
      setTestResult({ success: false, message: 'Verbindungsfehler' });
    } finally {
      setTesting(null);
    }
  };

  const handleToggle = async (portal: Portal, enabled: boolean) => {
    try {
      const config = getRuntimeConfig();
      const existing = getConnection(portal.id);
      
      await fetch(`${config.apiUrl}/portal-connections`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenantId,
          portalId: portal.id,
          ftpHost: existing?.ftpHost || portal.defaultFtpHost,
          isEnabled: enabled
        })
      });
      
      await loadData();
    } catch (error) {
      console.error('Error toggling portal:', error);
    }
  };

  const filteredPortals = selectedCountry === 'all' 
    ? portals 
    : portals.filter(p => p.country === selectedCountry);

  const groupedPortals = filteredPortals.reduce((acc, portal) => {
    if (!acc[portal.country]) acc[portal.country] = [];
    acc[portal.country].push(portal);
    return acc;
  }, {} as Record<string, Portal[]>);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Immobilienportale</h2>
        <p className="text-gray-500 mt-1">
          Verbinde deine Objekte mit {portals.length} Immobilienportalen im DACH-Raum
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-gray-50 rounded-xl p-4">
          <div className="text-3xl font-bold text-gray-900">{portals.length}</div>
          <div className="text-sm text-gray-500">Verfügbare Portale</div>
        </div>
        <div className="bg-green-50 rounded-xl p-4">
          <div className="text-3xl font-bold text-green-600">
            {connections.filter(c => c.isEnabled).length}
          </div>
          <div className="text-sm text-gray-500">Verbunden</div>
        </div>
        <div className="bg-indigo-50 rounded-xl p-4">
          <div className="text-3xl font-bold text-indigo-600">
            {connections.filter(c => c.autoSyncEnabled).length}
          </div>
          <div className="text-sm text-gray-500">Auto-Sync aktiv</div>
        </div>
      </div>

      {/* Filter */}
      <div className="flex gap-2">
        <button
          onClick={() => setSelectedCountry('all')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            selectedCountry === 'all' 
              ? 'bg-gray-900 text-white' 
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          Alle ({portals.length})
        </button>
        {['DE', 'AT', 'CH'].map(country => (
          <button
            key={country}
            onClick={() => setSelectedCountry(country)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              selectedCountry === country 
                ? 'bg-gray-900 text-white' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {COUNTRY_FLAGS[country]} {COUNTRY_LABELS[country]} ({portals.filter(p => p.country === country).length})
          </button>
        ))}
      </div>

      {/* Portal List */}
      {Object.entries(groupedPortals).map(([country, countryPortals]) => (
        <div key={country} className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <span>{COUNTRY_FLAGS[country]}</span>
            {COUNTRY_LABELS[country]}
          </h3>
          
          <div className="grid gap-3">
            {countryPortals.map(portal => {
              const connection = getConnection(portal.id);
              const isConnected = connection?.isEnabled && connection?.ftpUsername;
              const isEditing = editingPortal === portal.id;
              
              return (
                <div 
                  key={portal.id}
                  className={`bg-white rounded-xl border transition-all ${
                    isEditing ? 'border-indigo-300 shadow-lg' : 'border-gray-200'
                  }`}
                >
                  {/* Portal Header */}
                  <div className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                        isConnected ? 'bg-green-100' : 'bg-gray-100'
                      }`}>
                        <Globe className={`w-5 h-5 ${isConnected ? 'text-green-600' : 'text-gray-400'}`} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-gray-900">{portal.name}</span>
                          {portal.isPremium && (
                            <span className="px-2 py-0.5 bg-amber-100 text-amber-700 text-[10px] font-medium rounded">
                              API
                            </span>
                          )}
                          {isConnected && (
                            <Check className="w-4 h-4 text-green-500" />
                          )}
                        </div>
                        <div className="text-xs text-gray-500">
                          {portal.connectionType === 'OPENIMMO_FTP' ? 'OpenImmo + FTP' : 
                           portal.connectionType === 'REST_API' ? 'REST API' : portal.connectionType}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      {portal.websiteUrl && (
                        <a 
                          href={portal.websiteUrl} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      )}
                      <button
                        onClick={() => isEditing ? setEditingPortal(null) : handleEdit(portal)}
                        className={`p-2 rounded-lg transition-colors ${
                          isEditing 
                            ? 'bg-indigo-100 text-indigo-600' 
                            : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
                        }`}
                      >
                        <Settings2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  
                  {/* Edit Form */}
                  {isEditing && (
                    <div className="border-t border-gray-100 p-4 space-y-4 bg-gray-50/50">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">FTP Host</label>
                          <input
                            type="text"
                            value={formData.ftpHost || ''}
                            onChange={(e) => setFormData({ ...formData, ftpHost: e.target.value })}
                            className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">Port</label>
                          <input
                            type="number"
                            value={formData.ftpPort || 21}
                            onChange={(e) => setFormData({ ...formData, ftpPort: parseInt(e.target.value) })}
                            className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          />
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">Benutzername</label>
                          <input
                            type="text"
                            value={formData.ftpUsername || ''}
                            onChange={(e) => setFormData({ ...formData, ftpUsername: e.target.value })}
                            className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">Passwort</label>
                          <div className="relative">
                            <input
                              type={showPassword ? 'text' : 'password'}
                              value={formData.ftpPassword || ''}
                              onChange={(e) => setFormData({ ...formData, ftpPassword: e.target.value })}
                              className="w-full px-3 py-2 pr-10 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            />
                            <button
                              type="button"
                              onClick={() => setShowPassword(!showPassword)}
                              className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                            >
                              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                          </div>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">Verzeichnis</label>
                          <input
                            type="text"
                            value={formData.ftpPath || '/'}
                            onChange={(e) => setFormData({ ...formData, ftpPath: e.target.value })}
                            className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">Anbieternummer</label>
                          <input
                            type="text"
                            value={formData.providerId || ''}
                            onChange={(e) => setFormData({ ...formData, providerId: e.target.value })}
                            className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          />
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-6">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={formData.useSftp || false}
                            onChange={(e) => setFormData({ ...formData, useSftp: e.target.checked })}
                            className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                          />
                          <span className="text-sm text-gray-700">SFTP verwenden</span>
                        </label>
                        
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={formData.isEnabled ?? true}
                            onChange={(e) => setFormData({ ...formData, isEnabled: e.target.checked })}
                            className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                          />
                          <span className="text-sm text-gray-700">Aktiviert</span>
                        </label>
                        
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={formData.autoSyncEnabled || false}
                            onChange={(e) => setFormData({ ...formData, autoSyncEnabled: e.target.checked })}
                            className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                          />
                          <span className="text-sm text-gray-700">Auto-Sync</span>
                        </label>
                      </div>
                      
                      {/* Test Result */}
                      {testResult && (
                        <div className={`p-3 rounded-lg text-sm ${
                          testResult.success ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                        }`}>
                          {testResult.message}
                        </div>
                      )}
                      
                      {/* Actions */}
                      <div className="flex justify-between pt-2">
                        <button
                          onClick={() => connection && handleTest(connection.id)}
                          disabled={!connection || testing === connection?.id}
                          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors"
                        >
                          {testing === connection?.id ? (
                            <RefreshCw className="w-4 h-4 animate-spin" />
                          ) : (
                            <TestTube className="w-4 h-4" />
                          )}
                          Verbindung testen
                        </button>
                        
                        <div className="flex gap-2">
                          <button
                            onClick={() => setEditingPortal(null)}
                            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                          >
                            Abbrechen
                          </button>
                          <button
                            onClick={handleSave}
                            className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors"
                          >
                            Speichern
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}
      
      {/* Info Box */}
      <div className="bg-blue-50 rounded-xl p-4 text-sm text-blue-800">
        <strong>Hinweis:</strong> Die FTP-Zugangsdaten erhältst du direkt vom jeweiligen Portal nach der Registrierung als gewerblicher Anbieter.
        Die meisten Portale nutzen den OpenImmo-Standard für den automatischen Datenimport.
      </div>
    </div>
  );
}
