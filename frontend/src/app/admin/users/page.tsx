'use client';

import { useState, useEffect, useCallback } from 'react';
import { 
  Users, Search, Shield, ShieldCheck, UserCheck, Loader2, 
  Pencil, Trash2, X, Check, AlertCircle, Plus, Phone, Mail, HeadphonesIcon
} from 'lucide-react';
import { fetchAuthSession } from 'aws-amplify/auth';
import { getRuntimeConfig } from '@/components/EnvProvider';

function getApiUrl(): string {
  const config = getRuntimeConfig();
  return (config.apiUrl || process.env.NEXT_PUBLIC_API_URL || '').replace(/\/+$/, '');
}

async function adminFetch(path: string, options?: RequestInit) {
  const session = await fetchAuthSession();
  const token = session.tokens?.idToken?.toString();
  const res = await fetch(`${getApiUrl()}${path}`, {
    ...options,
    headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), 'Content-Type': 'application/json', ...options?.headers },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  return res.json();
}

interface TeamMember {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
  role: string;
  createdAt: string;
}

const ROLE_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
  SUPER_ADMIN: { label: 'Super Admin', color: 'bg-red-50 text-red-700 border-red-200', icon: Shield },
  ADMIN: { label: 'Admin', color: 'bg-gray-100 text-gray-700 border-gray-200', icon: ShieldCheck },
  SUPPORT: { label: 'Support', color: 'bg-purple-50 text-purple-700 border-purple-200', icon: HeadphonesIcon },
  AGENT: { label: 'Agent', color: 'bg-blue-50 text-blue-700 border-blue-200', icon: UserCheck },
};

export default function TeamMembersPage() {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [toast, setToast] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Create state
  const [showCreate, setShowCreate] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [newFirstName, setNewFirstName] = useState('');
  const [newLastName, setNewLastName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newRole, setNewRole] = useState('ADMIN');
  const [createWorkMail, setCreateWorkMail] = useState(false);
  const [creating, setCreating] = useState(false);

  // Edit state
  const [editingMember, setEditingMember] = useState<TeamMember | null>(null);
  const [editRole, setEditRole] = useState('');
  const [editFirstName, setEditFirstName] = useState('');
  const [editLastName, setEditLastName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [saving, setSaving] = useState(false);

  // Delete state
  const [deletingMember, setDeletingMember] = useState<TeamMember | null>(null);
  const [deleting, setDeleting] = useState(false);

  const showToast = useCallback((type: 'success' | 'error', text: string) => {
    setToast({ type, text });
    setTimeout(() => setToast(null), 4000);
  }, []);

  const fetchMembers = useCallback(async () => {
    setLoading(true);
    try {
      const data = await adminFetch('/admin/team/members');
      setMembers(Array.isArray(data) ? data : []);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Fehler beim Laden');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchMembers(); }, [fetchMembers]);

  const filtered = members.filter(m => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      m.email.toLowerCase().includes(q) ||
      (m.firstName || '').toLowerCase().includes(q) ||
      (m.lastName || '').toLowerCase().includes(q)
    );
  });

  const openCreate = () => {
    setNewEmail('');
    setNewFirstName('');
    setNewLastName('');
    setNewPhone('');
    setNewRole('ADMIN');
    setCreateWorkMail(false);
    setShowCreate(true);
  };

  const handleCreate = async () => {
    if (!newEmail.trim()) return;
    setCreating(true);
    try {
      const result = await adminFetch('/admin/team/members', {
        method: 'POST',
        body: JSON.stringify({
          email: newEmail.trim(),
          firstName: newFirstName.trim() || undefined,
          lastName: newLastName.trim() || undefined,
          phone: newPhone.trim() || undefined,
          role: newRole,
          createEmail: createWorkMail,
        }),
      });
      showToast('success', result.message || 'Mitarbeiter erstellt');
      setShowCreate(false);
      fetchMembers();
    } catch (e) {
      showToast('error', e instanceof Error ? e.message : 'Fehler');
    } finally {
      setCreating(false);
    }
  };

  const openEdit = (m: TeamMember) => {
    setEditingMember(m);
    setEditRole(m.role);
    setEditFirstName(m.firstName || '');
    setEditLastName(m.lastName || '');
    setEditPhone(m.phone || '');
  };

  const handleSave = async () => {
    if (!editingMember) return;
    setSaving(true);
    try {
      await adminFetch(`/admin/team/members/${editingMember.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          role: editRole,
          firstName: editFirstName,
          lastName: editLastName,
          phone: editPhone,
        }),
      });
      showToast('success', 'Mitarbeiter aktualisiert');
      setEditingMember(null);
      fetchMembers();
    } catch (e) {
      showToast('error', e instanceof Error ? e.message : 'Fehler');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingMember) return;
    setDeleting(true);
    try {
      await adminFetch(`/admin/team/members/${deletingMember.id}`, { method: 'DELETE' });
      showToast('success', 'Mitarbeiter entfernt');
      setDeletingMember(null);
      fetchMembers();
    } catch (e) {
      showToast('error', e instanceof Error ? e.message : 'Fehler');
    } finally {
      setDeleting(false);
    }
  };

  const isImmivoEmail = newEmail.toLowerCase().includes('@immivo.ai');

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Mitarbeiter</h1>
          <p className="text-sm text-gray-500 mt-0.5">{members.length} Mitarbeiter im Immivo Team</p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4" />
          Mitarbeiter hinzufügen
        </button>
      </div>

      {/* Search */}
      <div className="relative mb-5">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Mitarbeiter suchen..."
          className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      {error && (
        <div className="flex items-center gap-2 p-4 mb-5 rounded-lg bg-red-50 text-red-700 text-sm">
          <AlertCircle className="w-4 h-4" /> {error}
        </div>
      )}

      {loading ? (
        <div className="bg-white rounded-xl border border-gray-200 p-16 text-center">
          <Loader2 className="w-6 h-6 animate-spin text-gray-400 mx-auto" />
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="text-left px-4 py-3 font-medium text-gray-600">Mitarbeiter</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Kontakt</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Rolle</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Aktionen</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-12 text-center text-gray-400">
                    {search ? 'Keine Ergebnisse' : 'Keine Mitarbeiter gefunden'}
                  </td>
                </tr>
              ) : (
                filtered.map((m) => {
                  const roleConf = ROLE_CONFIG[m.role] || ROLE_CONFIG.AGENT;
                  const RoleIcon = roleConf.icon;
                  const name = [m.firstName, m.lastName].filter(Boolean).join(' ') || m.email;
                  return (
                    <tr key={m.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 font-medium text-sm">
                            {(m.firstName?.[0] || m.email[0]).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">{name}</p>
                            <p className="text-xs text-gray-400">{m.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-col gap-0.5 text-xs text-gray-500">
                          <span className="flex items-center gap-1"><Mail className="w-3 h-3" />{m.email}</span>
                          {m.phone && <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{m.phone}</span>}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium border ${roleConf.color}`}>
                          <RoleIcon className="w-3 h-3" />
                          {roleConf.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => openEdit(m)}
                            className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Bearbeiten"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          {m.role !== 'SUPER_ADMIN' && (
                            <button
                              onClick={() => setDeletingMember(m)}
                              className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              title="Entfernen"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Create Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setShowCreate(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h3 className="font-semibold text-gray-900">Mitarbeiter hinzufügen</h3>
              <button onClick={() => setShowCreate(false)} className="p-1 text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">E-Mail *</label>
                <input type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="vorname.nachname@immivo.ai"
                  autoFocus
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Vorname</label>
                  <input type="text" value={newFirstName} onChange={(e) => setNewFirstName(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Nachname</label>
                  <input type="text" value={newLastName} onChange={(e) => setNewLastName(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Telefon</label>
                <input type="tel" value={newPhone} onChange={(e) => setNewPhone(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Rolle</label>
                <select value={newRole} onChange={(e) => setNewRole(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                  <option value="SUPER_ADMIN">Super Admin</option>
                  <option value="ADMIN">Admin</option>
                  <option value="SUPPORT">Support</option>
                </select>
              </div>
              {/* WorkMail Email Creation Toggle */}
              {isImmivoEmail && (
                <div className="flex items-center gap-3 p-3 bg-blue-50 border border-blue-100 rounded-lg">
                  <input
                    type="checkbox"
                    id="createWorkMail"
                    checked={createWorkMail}
                    onChange={(e) => setCreateWorkMail(e.target.checked)}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <label htmlFor="createWorkMail" className="text-sm text-blue-800 cursor-pointer">
                    <span className="font-medium">E-Mail-Postfach erstellen</span>
                    <span className="block text-xs text-blue-600 mt-0.5">
                      Erstellt ein AWS WorkMail Postfach für {newEmail.toLowerCase().trim()}
                    </span>
                  </label>
                </div>
              )}
            </div>
            <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-gray-100 bg-gray-50 rounded-b-2xl">
              <button onClick={() => setShowCreate(false)} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-200 rounded-lg">Abbrechen</button>
              <button onClick={handleCreate} disabled={creating || !newEmail.trim()}
                className="px-4 py-2 text-sm font-medium bg-gray-900 text-white rounded-lg hover:bg-gray-800 disabled:opacity-50 flex items-center gap-2">
                {creating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                {creating ? 'Erstelle...' : 'Hinzufügen'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editingMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h3 className="font-semibold text-gray-900">Mitarbeiter bearbeiten</h3>
              <button onClick={() => setEditingMember(null)} className="p-1 text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Vorname</label>
                  <input type="text" value={editFirstName} onChange={(e) => setEditFirstName(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Nachname</label>
                  <input type="text" value={editLastName} onChange={(e) => setEditLastName(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Telefon</label>
                <input type="tel" value={editPhone} onChange={(e) => setEditPhone(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Rolle</label>
                <select value={editRole} onChange={(e) => setEditRole(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                  <option value="SUPER_ADMIN">Super Admin</option>
                  <option value="ADMIN">Admin</option>
                  <option value="SUPPORT">Support</option>
                </select>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-gray-100 bg-gray-50 rounded-b-2xl">
              <button onClick={() => setEditingMember(null)} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-200 rounded-lg">Abbrechen</button>
              <button onClick={handleSave} disabled={saving}
                className="px-4 py-2 text-sm font-medium bg-gray-900 text-white rounded-lg hover:bg-gray-800 disabled:opacity-50 flex items-center gap-2">
                {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                Speichern
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {deletingMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 p-6">
            <h3 className="font-semibold text-gray-900 mb-2">Mitarbeiter entfernen?</h3>
            <p className="text-sm text-gray-500 mb-6">
              {[deletingMember.firstName, deletingMember.lastName].filter(Boolean).join(' ') || deletingMember.email} wirklich entfernen?
            </p>
            <div className="flex justify-end gap-2">
              <button onClick={() => setDeletingMember(null)} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">Abbrechen</button>
              <button onClick={handleDelete} disabled={deleting}
                className="px-4 py-2 text-sm font-medium bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 flex items-center gap-2">
                {deleting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                Entfernen
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className={`fixed bottom-6 right-6 px-4 py-2 rounded-lg text-sm font-medium shadow-lg z-50 ${
          toast.type === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'
        }`}>
          {toast.text}
        </div>
      )}
    </div>
  );
}
