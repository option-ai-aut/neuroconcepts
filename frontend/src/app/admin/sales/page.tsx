'use client';

import { useState, useEffect } from 'react';
import { Building2, Users, Home, Search, Loader2, Plus, Trash2, Mail, ToggleLeft, ToggleRight, X, ChevronRight, BarChart3, Clock, User } from 'lucide-react';
import { getAdminTenants, createAdminTenant, deleteAdminTenant, getAdminTenantDetail, AdminTenant } from '@/lib/adminApi';

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

interface TenantDetail {
  id: string;
  name: string;
  address: string | null;
  createdAt: string;
  users: { id: string; email: string; firstName: string | null; lastName: string | null; role: string; phone: string | null; createdAt: string }[];
  settings: { autoReplyEnabled: boolean; inboundLeadEmail: string | null; language: string | null } | null;
  stats: { userCount: number; leadCount: number; propertyCount: number; templateCount: number; recentLeads: number };
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

  // Detail drawer
  const [selectedTenant, setSelectedTenant] = useState<TenantDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

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

  const handleDelete = async (e: React.MouseEvent, id: string, name: string) => {
    e.stopPropagation();
    if (!confirm(`Tenant "${name}" wirklich löschen? Alle zugehörigen Daten werden gelöscht.`)) return;
    try {
      await deleteAdminTenant(id);
      if (selectedTenant?.id === id) setSelectedTenant(null);
      loadTenants();
    } catch (e: any) {
      alert('Fehler: ' + e.message);
    }
  };

  const openDetail = async (tenantId: string) => {
    setLoadingDetail(true);
    setSelectedTenant(null);
    try {
      const detail = await getAdminTenantDetail(tenantId);
      setSelectedTenant(detail);
    } catch (e: any) {
      alert('Fehler beim Laden: ' + e.message);
    } finally {
      setLoadingDetail(false);
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

      {/* Tenants List */}
      {filteredTenants.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <Building2 className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-sm text-gray-500">{tenants.length === 0 ? 'Noch keine Tenants' : 'Keine Treffer'}</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="text-left px-4 py-3 font-medium text-gray-600">Tenant</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">User</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Objekte</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Leads</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Erstellt</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Aktionen</th>
              </tr>
            </thead>
            <tbody>
              {filteredTenants.map((tenant) => (
                <tr
                  key={tenant.id}
                  onClick={() => openDetail(tenant.id)}
                  className="border-b border-gray-50 hover:bg-blue-50/40 cursor-pointer transition-colors group"
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-gray-100 flex items-center justify-center text-gray-500">
                        <Building2 className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900 group-hover:text-blue-700 transition-colors">{tenant.name}</p>
                        {tenant.address && <p className="text-xs text-gray-400">{tenant.address}</p>}
                        {tenant.inboundEmail && (
                          <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                            <Mail className="w-3 h-3" />{tenant.inboundEmail}
                          </p>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="flex items-center gap-1 text-gray-600">
                      <Users className="w-3.5 h-3.5 text-gray-400" />
                      {tenant.userCount}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="flex items-center gap-1 text-gray-600">
                      <Home className="w-3.5 h-3.5 text-gray-400" />
                      {tenant.propertyCount}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{tenant.leadCount}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1 text-xs font-medium ${tenant.autoReply ? 'text-emerald-600' : 'text-gray-400'}`}>
                      {tenant.autoReply ? <ToggleRight className="w-3.5 h-3.5" /> : <ToggleLeft className="w-3.5 h-3.5" />}
                      {tenant.autoReply ? 'Auto-Reply an' : 'Auto-Reply aus'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-400">{formatDate(tenant.createdAt)}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={(e) => handleDelete(e, tenant.id, tenant.name)}
                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Löschen"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                      <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-blue-500 transition-colors" />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Detail Drawer */}
      {(selectedTenant || loadingDetail) && (
        <div className="fixed inset-0 z-50 flex justify-end" onClick={() => { setSelectedTenant(null); setLoadingDetail(false); }}>
          <div className="absolute inset-0 bg-black/30" />
          <div
            className="relative bg-white max-w-lg w-full shadow-2xl overflow-y-auto animate-in slide-in-from-right"
            onClick={e => e.stopPropagation()}
          >
            {loadingDetail ? (
              <div className="flex items-center justify-center h-full">
                <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
              </div>
            ) : selectedTenant && (
              <>
                {/* Header */}
                <div className="sticky top-0 z-10 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-bold text-gray-900">{selectedTenant.name}</h2>
                    {selectedTenant.address && <p className="text-sm text-gray-500">{selectedTenant.address}</p>}
                  </div>
                  <button onClick={() => setSelectedTenant(null)} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Stats */}
                <div className="px-6 py-5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="bg-gray-50 rounded-xl p-4">
                      <div className="flex items-center gap-2 text-gray-400 mb-1">
                        <Users className="w-4 h-4" />
                        <span className="text-xs font-medium">User</span>
                      </div>
                      <p className="text-2xl font-bold text-gray-900">{selectedTenant.stats.userCount}</p>
                    </div>
                    <div className="bg-gray-50 rounded-xl p-4">
                      <div className="flex items-center gap-2 text-gray-400 mb-1">
                        <Home className="w-4 h-4" />
                        <span className="text-xs font-medium">Objekte</span>
                      </div>
                      <p className="text-2xl font-bold text-gray-900">{selectedTenant.stats.propertyCount}</p>
                    </div>
                    <div className="bg-gray-50 rounded-xl p-4">
                      <div className="flex items-center gap-2 text-gray-400 mb-1">
                        <BarChart3 className="w-4 h-4" />
                        <span className="text-xs font-medium">Leads gesamt</span>
                      </div>
                      <p className="text-2xl font-bold text-gray-900">{selectedTenant.stats.leadCount}</p>
                    </div>
                    <div className="bg-gray-50 rounded-xl p-4">
                      <div className="flex items-center gap-2 text-gray-400 mb-1">
                        <Clock className="w-4 h-4" />
                        <span className="text-xs font-medium">Leads (30 Tage)</span>
                      </div>
                      <p className="text-2xl font-bold text-gray-900">{selectedTenant.stats.recentLeads}</p>
                    </div>
                  </div>
                </div>

                {/* Settings */}
                {selectedTenant.settings && (
                  <div className="px-6 pb-4">
                    <h3 className="text-sm font-semibold text-gray-700 mb-3">Einstellungen</h3>
                    <div className="bg-gray-50 rounded-xl p-4 space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-500">Auto-Reply</span>
                        <span className={selectedTenant.settings.autoReplyEnabled ? 'text-emerald-600 font-medium' : 'text-gray-400'}>
                          {selectedTenant.settings.autoReplyEnabled ? 'Aktiviert' : 'Deaktiviert'}
                        </span>
                      </div>
                      {selectedTenant.settings.inboundLeadEmail && (
                        <div className="flex justify-between">
                          <span className="text-gray-500">Inbound E-Mail</span>
                          <span className="text-gray-900">{selectedTenant.settings.inboundLeadEmail}@leads.immivo.ai</span>
                        </div>
                      )}
                      {selectedTenant.settings.language && (
                        <div className="flex justify-between">
                          <span className="text-gray-500">Sprache</span>
                          <span className="text-gray-900">{selectedTenant.settings.language}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Users */}
                <div className="px-6 pb-6">
                  <h3 className="text-sm font-semibold text-gray-700 mb-3">User ({selectedTenant.users.length})</h3>
                  {selectedTenant.users.length === 0 ? (
                    <p className="text-sm text-gray-400 bg-gray-50 rounded-xl p-4 text-center">Keine User</p>
                  ) : (
                    <div className="space-y-2">
                      {selectedTenant.users.map(user => (
                        <div key={user.id} className="flex items-center gap-3 bg-gray-50 rounded-xl p-3">
                          <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 text-xs font-medium">
                            {(user.firstName?.[0] || user.email[0]).toUpperCase()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">
                              {[user.firstName, user.lastName].filter(Boolean).join(' ') || user.email}
                            </p>
                            <p className="text-xs text-gray-400 truncate">{user.email}</p>
                          </div>
                          <span className="text-xs text-gray-400 bg-gray-200 px-2 py-0.5 rounded-full">{user.role}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Meta */}
                <div className="px-6 pb-6 text-xs text-gray-400">
                  Erstellt am {formatDate(selectedTenant.createdAt)} &middot; {selectedTenant.stats.templateCount} Exposé-Vorlage{selectedTenant.stats.templateCount !== 1 ? 'n' : ''}
                </div>
              </>
            )}
          </div>
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
