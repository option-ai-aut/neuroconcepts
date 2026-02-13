'use client';

import { useState, useEffect } from 'react';
import { 
  Users, Search, Shield, ShieldCheck, UserCheck, Mail, Loader2, Building2, 
  MoreHorizontal, Pencil, Trash2, X, Check, AlertCircle
} from 'lucide-react';
import { getAdminUsers, updateAdminUser, deleteAdminUser, AdminUser } from '@/lib/adminApi';

const ROLE_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
  SUPER_ADMIN: { label: 'Super Admin', color: 'bg-red-50 text-red-700 border-red-200', icon: Shield },
  ADMIN: { label: 'Admin', color: 'bg-gray-100 text-gray-700 border-gray-200', icon: ShieldCheck },
  AGENT: { label: 'Agent', color: 'bg-blue-50 text-blue-700 border-blue-200', icon: UserCheck },
};

const ROLES = ['SUPER_ADMIN', 'ADMIN', 'AGENT'] as const;

export default function UsersPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('ALL');

  // Edit state
  const [editingUser, setEditingUser] = useState<AdminUser | null>(null);
  const [editRole, setEditRole] = useState<string>('');
  const [editFirstName, setEditFirstName] = useState('');
  const [editLastName, setEditLastName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [saving, setSaving] = useState(false);

  // Delete state
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Success/Error messages
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchUsers = () => {
    setLoading(true);
    getAdminUsers()
      .then(setUsers)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchUsers(); }, []);

  const filteredUsers = users.filter((u) => {
    const matchesSearch = `${u.firstName || ''} ${u.lastName || ''} ${u.email} ${u.tenantName}`.toLowerCase().includes(search.toLowerCase());
    const matchesRole = roleFilter === 'ALL' || u.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  const tenantGroups = filteredUsers.reduce<Record<string, AdminUser[]>>((acc, user) => {
    const key = user.tenantName;
    if (!acc[key]) acc[key] = [];
    acc[key].push(user);
    return acc;
  }, {});

  const openEdit = (user: AdminUser) => {
    setEditingUser(user);
    setEditRole(user.role);
    setEditFirstName(user.firstName || '');
    setEditLastName(user.lastName || '');
    setEditPhone(user.phone || '');
  };

  const handleSave = async () => {
    if (!editingUser) return;
    setSaving(true);
    try {
      await updateAdminUser(editingUser.id, {
        role: editRole,
        firstName: editFirstName || undefined,
        lastName: editLastName || undefined,
        phone: editPhone || undefined,
      });
      setMessage({ type: 'success', text: `${editFirstName || editingUser.email} wurde aktualisiert.` });
      setEditingUser(null);
      fetchUsers();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Fehler beim Speichern' });
    } finally {
      setSaving(false);
    }
    setTimeout(() => setMessage(null), 4000);
  };

  const handleDelete = async (userId: string) => {
    setDeleting(true);
    try {
      await deleteAdminUser(userId);
      setMessage({ type: 'success', text: 'User wurde entfernt.' });
      setDeleteConfirm(null);
      fetchUsers();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Fehler beim Löschen' });
    } finally {
      setDeleting(false);
    }
    setTimeout(() => setMessage(null), 4000);
  };

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
          <h1 className="text-xl font-bold text-gray-900">Plattform-User</h1>
          <p className="text-sm text-gray-500 mt-0.5">{users.length} User · {Object.keys(tenantGroups).length} Tenants</p>
        </div>
      </div>

      {/* Messages */}
      {message && (
        <div className={`mb-4 flex items-center gap-2 px-4 py-3 rounded-lg text-sm ${
          message.type === 'success' ? 'bg-green-50 border border-green-200 text-green-700' : 'bg-red-50 border border-red-200 text-red-700'
        }`}>
          {message.type === 'success' ? <Check className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          {message.text}
          <button onClick={() => setMessage(null)} className="ml-auto"><X className="w-4 h-4 opacity-50" /></button>
        </div>
      )}

      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">{error}</div>
      )}

      {/* Filters */}
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Name, E-Mail oder Tenant suchen..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        <div className="flex gap-1 bg-gray-100 rounded-lg p-0.5">
          {['ALL', ...ROLES].map((role) => (
            <button
              key={role}
              onClick={() => setRoleFilter(role)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                roleFilter === role ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {role === 'ALL' ? 'Alle' : ROLE_CONFIG[role]?.label || role}
            </button>
          ))}
        </div>
      </div>

      {/* Users Table */}
      {filteredUsers.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <Users className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-sm text-gray-500">{users.length === 0 ? 'Noch keine User auf der Plattform' : 'Keine Treffer für deine Suche'}</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left px-4 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">User</th>
                <th className="text-left px-4 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Rolle</th>
                <th className="text-left px-4 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Tenant</th>
                <th className="text-right px-4 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Leads</th>
                <th className="text-right px-4 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wider w-24">Aktionen</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((user) => {
                const roleConf = ROLE_CONFIG[user.role] || ROLE_CONFIG.AGENT;
                return (
                  <tr key={user.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gray-800 text-white flex items-center justify-center text-xs font-bold">
                          {(user.firstName?.[0] || user.email[0] || '?').toUpperCase()}
                          {(user.lastName?.[0] || '').toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {user.firstName && user.lastName ? `${user.firstName} ${user.lastName}` : user.email}
                          </p>
                          <p className="text-xs text-gray-400">{user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-medium rounded border ${roleConf.color}`}>
                        {roleConf.label}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <Building2 className="w-3 h-3 text-gray-400" />
                        <span className="text-xs text-gray-600">{user.tenantName}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="text-xs font-medium text-gray-600">{user.leadCount}</span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => openEdit(user)}
                          className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Bearbeiten"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        {user.role !== 'SUPER_ADMIN' && (
                          <button
                            onClick={() => setDeleteConfirm(user.id)}
                            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Entfernen"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Edit Modal */}
      {editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h3 className="font-semibold text-gray-900">User bearbeiten</h3>
              <button onClick={() => setEditingUser(null)} className="p-1 text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 space-y-4">
              {/* User Info */}
              <div className="flex items-center gap-3 bg-gray-50 rounded-xl p-3">
                <div className="w-10 h-10 rounded-full bg-gray-800 text-white flex items-center justify-center text-sm font-bold">
                  {(editingUser.firstName?.[0] || editingUser.email[0] || '?').toUpperCase()}
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">{editingUser.email}</p>
                  <p className="text-xs text-gray-400">{editingUser.tenantName}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Vorname</label>
                  <input
                    type="text"
                    value={editFirstName}
                    onChange={(e) => setEditFirstName(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Nachname</label>
                  <input
                    type="text"
                    value={editLastName}
                    onChange={(e) => setEditLastName(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Telefon</label>
                <input
                  type="text"
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="+43..."
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-2">Rolle</label>
                <div className="grid grid-cols-3 gap-2">
                  {ROLES.map((role) => {
                    const conf = ROLE_CONFIG[role];
                    const Icon = conf.icon;
                    return (
                      <button
                        key={role}
                        onClick={() => setEditRole(role)}
                        className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all ${
                          editRole === role
                            ? 'border-gray-900 bg-gray-50'
                            : 'border-gray-100 hover:border-gray-200'
                        }`}
                      >
                        <Icon className={`w-5 h-5 ${editRole === role ? 'text-gray-900' : 'text-gray-400'}`} />
                        <span className={`text-xs font-medium ${editRole === role ? 'text-gray-900' : 'text-gray-500'}`}>{conf.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-gray-100 bg-gray-50">
              <button onClick={() => setEditingUser(null)} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-200 rounded-lg transition-colors">
                Abbrechen
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-4 py-2 text-sm font-medium bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                Speichern
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 p-6 text-center">
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-6 h-6 text-red-600" />
            </div>
            <h3 className="font-semibold text-gray-900 mb-2">User entfernen?</h3>
            <p className="text-sm text-gray-500 mb-6">
              Dieser User wird unwiderruflich von der Plattform entfernt. Alle zugehörigen Daten bleiben erhalten.
            </p>
            <div className="flex gap-2">
              <button onClick={() => setDeleteConfirm(null)} className="flex-1 px-4 py-2 text-sm text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors">
                Abbrechen
              </button>
              <button
                onClick={() => handleDelete(deleteConfirm)}
                disabled={deleting}
                className="flex-1 px-4 py-2 text-sm font-medium bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {deleting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                Entfernen
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
