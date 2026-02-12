'use client';

import { useState, useEffect } from 'react';
import { Building2, Users, FileText, Home, Search, Loader2, Plus, Trash2, ChevronDown, Mail, ToggleLeft, ToggleRight } from 'lucide-react';
import { getAdminTenants, createAdminTenant, deleteAdminTenant, AdminTenant } from '@/lib/adminApi';

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export default function SalesPage() {
  const [tenants, setTenants] = useState<AdminTenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newName, setNewName] = useState('');
  const [newAddress, setNewAddress] = useState('');
  const [creating, setCreating] = useState(false);

  const loadTenants = () => {
    setLoading(true);
    getAdminTenants()
      .then(setTenants)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadTenants(); }, []);

  const handleCreate = async () => {
    if (!newName.trim()) return;
    setCreating(true);
    try {
      await createAdminTenant({ name: newName.trim(), address: newAddress.trim() || undefined });
      setShowCreateModal(false);
      setNewName('');
      setNewAddress('');
      loadTenants();
    } catch (e: any) {
      alert('Fehler: ' + e.message);
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Tenant "${name}" wirklich löschen? Alle zugehörigen Daten werden gelöscht.`)) return;
    try {
      await deleteAdminTenant(id);
      loadTenants();
    } catch (e: any) {
      alert('Fehler: ' + e.message);
    }
  };

  const filteredTenants = tenants.filter(t =>
    t.name.toLowerCase().includes(search.toLowerCase()) ||
    (t.address || '').toLowerCase().includes(search.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Tenants</h1>
          <p className="text-sm text-gray-500 mt-0.5">{tenants.length} Tenant{tenants.length !== 1 ? 's' : ''} auf der Plattform</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4" />
          Neuer Tenant
        </button>
      </div>

      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">{error}</div>
      )}

      {/* Search */}
      <div className="relative max-w-sm mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          placeholder="Tenant suchen..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      {/* Tenants Grid */}
      {filteredTenants.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <Building2 className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-sm text-gray-500">{tenants.length === 0 ? 'Noch keine Tenants' : 'Keine Treffer'}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredTenants.map((tenant) => (
            <div key={tenant.id} className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="text-sm font-semibold text-gray-900">{tenant.name}</h3>
                  {tenant.address && <p className="text-[10px] text-gray-400 mt-0.5">{tenant.address}</p>}
                </div>
                <button
                  onClick={() => handleDelete(tenant.id, tenant.name)}
                  className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2 mb-3">
                <div className="flex items-center gap-1.5">
                  <Users className="w-3 h-3 text-gray-400" />
                  <span className="text-xs text-gray-600">{tenant.userCount} User</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Home className="w-3 h-3 text-gray-400" />
                  <span className="text-xs text-gray-600">{tenant.propertyCount} Objekte</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <FileText className="w-3 h-3 text-gray-400" />
                  <span className="text-xs text-gray-600">{tenant.leadCount} Leads</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <FileText className="w-3 h-3 text-gray-400" />
                  <span className="text-xs text-gray-600">{tenant.templateCount} Vorlagen</span>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                <span className="text-[10px] text-gray-400">Erstellt: {formatDate(tenant.createdAt)}</span>
                <div className="flex items-center gap-1.5">
                  {tenant.autoReply ? (
                    <ToggleRight className="w-3.5 h-3.5 text-emerald-500" />
                  ) : (
                    <ToggleLeft className="w-3.5 h-3.5 text-gray-300" />
                  )}
                  <span className="text-[10px] text-gray-400">Auto-Reply</span>
                </div>
              </div>
              {tenant.inboundEmail && (
                <div className="flex items-center gap-1.5 mt-2">
                  <Mail className="w-3 h-3 text-gray-400" />
                  <span className="text-[10px] font-mono text-gray-400">{tenant.inboundEmail}</span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowCreateModal(false)}>
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4" onClick={(e) => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-gray-100">
              <h2 className="text-base font-semibold text-gray-900">Neuen Tenant erstellen</h2>
            </div>
            <div className="px-6 py-4 space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Name *</label>
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="z.B. Kellner Immobilien"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Adresse</label>
                <input
                  type="text"
                  value={newAddress}
                  onChange={(e) => setNewAddress(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Optional"
                />
              </div>
            </div>
            <div className="flex gap-3 px-6 py-4 border-t border-gray-100 bg-gray-50 rounded-b-xl">
              <button onClick={() => setShowCreateModal(false)} className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50">
                Abbrechen
              </button>
              <button
                onClick={handleCreate}
                disabled={!newName.trim() || creating}
                className="flex-1 px-4 py-2 text-sm font-medium text-white bg-gray-900 rounded-lg hover:bg-gray-800 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                {creating ? 'Erstelle...' : 'Erstellen'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
