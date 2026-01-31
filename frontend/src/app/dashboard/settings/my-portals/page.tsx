'use client';

import { useState, useEffect } from 'react';
import { Globe, Check, Building2, User, Eye, EyeOff, Settings2 } from 'lucide-react';
import { getRuntimeConfig } from '@/components/EnvProvider';

interface Portal {
  id: string;
  name: string;
  slug: string;
  country: string;
  websiteUrl: string | null;
  connectionType: string;
  isPremium: boolean;
}

interface EffectiveConnection {
  portal: Portal;
  connection: any | null;
  level: 'user' | 'tenant' | null;
  isConnected: boolean;
}

const COUNTRY_FLAGS: Record<string, string> = {
  DE: '🇩🇪',
  AT: '🇦🇹',
  CH: '🇨🇭'
};

export default function MyPortalsPage() {
  const [effectiveConnections, setEffectiveConnections] = useState<EffectiveConnection[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingPortal, setEditingPortal] = useState<string | null>(null);
  const [formData, setFormData] = useState<any>({});
  const [showPassword, setShowPassword] = useState(false);

  // TODO: Get from auth context
  const userId = 'default-user';
  const tenantId = 'default-tenant';

  useEffect(() => {
    loadConnections();
  }, []);

  const loadConnections = async () => {
    try {
      const config = getRuntimeConfig();
      const res = await fetch(`${config.apiUrl}/portal-connections/effective?userId=${userId}&tenantId=${tenantId}`);
      
      if (res.ok) {
        const data = await res.json();
        setEffectiveConnections(data);
      }
      
      setLoading(false);
    } catch (error) {
      console.error('Error loading connections:', error);
      setLoading(false);
    }
  };

  const handleEdit = (item: EffectiveConnection) => {
    setEditingPortal(item.portal.id);
    
    // If user has own connection, load it
    const userConnection = item.level === 'user' ? item.connection : null;
    
    setFormData({
      ftpHost: userConnection?.ftpHost || '',
      ftpPort: userConnection?.ftpPort || 21,
      ftpUsername: userConnection?.ftpUsername || '',
      ftpPassword: userConnection?.ftpPassword || '',
      ftpPath: userConnection?.ftpPath || '/',
      useSftp: userConnection?.useSftp || false,
      providerId: userConnection?.providerId || '',
      isEnabled: userConnection?.isEnabled ?? true
    });
  };

  const handleSave = async () => {
    if (!editingPortal) return;
    
    try {
      const config = getRuntimeConfig();
      await fetch(`${config.apiUrl}/portal-connections`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          portalId: editingPortal,
          ...formData
        })
      });
      
      await loadConnections();
      setEditingPortal(null);
      setFormData({});
    } catch (error) {
      console.error('Error saving connection:', error);
    }
  };

  const handleUseTenantAccount = async (portalId: string) => {
    try {
      const config = getRuntimeConfig();
      // Delete user's personal connection
      const item = effectiveConnections.find(c => c.portal.id === portalId);
      if (item?.connection && item.level === 'user') {
        await fetch(`${config.apiUrl}/portal-connections/${item.connection.id}`, {
          method: 'DELETE'
        });
      }
      
      await loadConnections();
      setEditingPortal(null);
    } catch (error) {
      console.error('Error removing connection:', error);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64">Lädt...</div>;
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Meine Portale</h2>
        <p className="text-gray-500 mt-1">
          Verwalte deine persönlichen Portal-Verbindungen oder nutze die Firmen-Accounts
        </p>
      </div>

      {/* Info Box */}
      <div className="bg-blue-50 rounded-xl p-4 text-sm text-blue-800">
        <strong>Hinweis:</strong> Du kannst entweder den Firmen-Account nutzen oder deinen eigenen Portal-Account verbinden.
        Deine persönliche Verbindung hat Vorrang vor dem Firmen-Account.
      </div>

      {/* Portal List */}
      <div className="space-y-3">
        {effectiveConnections.map((item) => {
          const isEditing = editingPortal === item.portal.id;
          const hasUserConnection = item.level === 'user';
          const hasTenantConnection = item.level === 'tenant';
          
          return (
            <div 
              key={item.portal.id}
              className={`bg-white rounded-xl border transition-all ${
                isEditing ? 'border-indigo-300 shadow-lg' : 'border-gray-200'
              }`}
            >
              {/* Portal Header */}
              <div className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                    item.isConnected ? 'bg-green-100' : 'bg-gray-100'
                  }`}>
                    <Globe className={`w-5 h-5 ${item.isConnected ? 'text-green-600' : 'text-gray-400'}`} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-900">{item.portal.name}</span>
                      <span className="text-xs">{COUNTRY_FLAGS[item.portal.country]}</span>
                      {item.isConnected && (
                        <div className="flex items-center gap-1 px-2 py-0.5 bg-gray-100 rounded text-[10px] font-medium">
                          {hasUserConnection ? (
                            <>
                              <User className="w-3 h-3 text-indigo-600" />
                              <span className="text-indigo-600">Eigener Account</span>
                            </>
                          ) : (
                            <>
                              <Building2 className="w-3 h-3 text-gray-600" />
                              <span className="text-gray-600">Firmen-Account</span>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="text-xs text-gray-500">
                      {item.isConnected 
                        ? (hasUserConnection ? 'Nutzt deinen Account' : 'Nutzt Firmen-Account')
                        : 'Nicht verbunden'
                      }
                    </div>
                  </div>
                </div>
                
                <button
                  onClick={() => isEditing ? setEditingPortal(null) : handleEdit(item)}
                  className={`p-2 rounded-lg transition-colors ${
                    isEditing 
                      ? 'bg-indigo-100 text-indigo-600' 
                      : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <Settings2 className="w-4 h-4" />
                </button>
              </div>
              
              {/* Edit Form */}
              {isEditing && (
                <div className="border-t border-gray-100 p-4 space-y-4 bg-gray-50/50">
                  {/* Choice: Tenant or Own */}
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 p-3 bg-white border-2 border-gray-200 rounded-lg cursor-pointer hover:border-gray-300 transition-colors">
                      <input
                        type="radio"
                        name={`choice-${item.portal.id}`}
                        checked={!hasUserConnection}
                        onChange={() => handleUseTenantAccount(item.portal.id)}
                        className="w-4 h-4 text-indigo-600"
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-2 text-sm font-medium text-gray-900">
                          <Building2 className="w-4 h-4" />
                          Firmen-Account nutzen
                        </div>
                        <div className="text-xs text-gray-500">
                          {hasTenantConnection || (!hasUserConnection && item.isConnected)
                            ? 'Verbunden und aktiv'
                            : 'Nicht verfügbar - Admin muss Firmen-Account einrichten'
                          }
                        </div>
                      </div>
                    </label>
                    
                    <label className="flex items-center gap-2 p-3 bg-white border-2 border-indigo-200 rounded-lg cursor-pointer hover:border-indigo-300 transition-colors">
                      <input
                        type="radio"
                        name={`choice-${item.portal.id}`}
                        checked={hasUserConnection || (!hasTenantConnection && !item.isConnected)}
                        onChange={() => {/* Already in edit mode */}}
                        className="w-4 h-4 text-indigo-600"
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-2 text-sm font-medium text-gray-900">
                          <User className="w-4 h-4" />
                          Eigenen Account nutzen
                        </div>
                        <div className="text-xs text-gray-500">
                          Deine persönlichen FTP-Zugangsdaten
                        </div>
                      </div>
                    </label>
                  </div>
                  
                  {/* FTP Form (only if using own account) */}
                  {(hasUserConnection || (!hasTenantConnection && !item.isConnected)) && (
                    <div className="space-y-4 pt-4 border-t border-gray-200">
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
                      
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formData.useSftp || false}
                          onChange={(e) => setFormData({ ...formData, useSftp: e.target.checked })}
                          className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                        />
                        <span className="text-sm text-gray-700">SFTP verwenden</span>
                      </label>
                    </div>
                  )}
                  
                  {/* Actions */}
                  <div className="flex justify-end gap-2 pt-2">
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
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
