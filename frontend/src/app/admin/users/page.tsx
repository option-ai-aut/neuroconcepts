'use client';

import { useState } from 'react';
import { 
  Users, Plus, Search, Filter, MoreVertical, Shield, ShieldCheck, 
  UserCheck, Mail, Calendar, Edit2, Trash2, X, Eye, EyeOff,
  Loader2, ChevronDown, Copy, CheckCircle2, AlertCircle
} from 'lucide-react';

type Role = 'SUPER_ADMIN' | 'ADMIN' | 'STAFF';
type Department = 'engineering' | 'support' | 'operations' | 'sales' | 'finance' | 'marketing' | 'hr' | 'management';

interface TeamMember {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: Role;
  department: Department;
  status: 'active' | 'inactive' | 'invited';
  lastActive: string;
  createdAt: string;
  avatar?: string;
}

const ROLE_CONFIG: Record<Role, { label: string; color: string; icon: any; level: number }> = {
  SUPER_ADMIN: { label: 'Super Admin', color: 'bg-red-50 text-red-700 border-red-200', icon: Shield, level: 3 },
  ADMIN: { label: 'Admin / Developer', color: 'bg-violet-50 text-violet-700 border-violet-200', icon: ShieldCheck, level: 2 },
  STAFF: { label: 'Mitarbeiter', color: 'bg-blue-50 text-blue-700 border-blue-200', icon: UserCheck, level: 1 },
};

const DEPARTMENTS: Record<Department, string> = {
  engineering: 'Engineering',
  support: 'Support',
  operations: 'Operations',
  sales: 'Sales',
  finance: 'Finance',
  marketing: 'Marketing',
  hr: 'HR / People',
  management: 'Management',
};

// Mock data
const MOCK_MEMBERS: TeamMember[] = [
  { id: '1', firstName: 'Dennis', lastName: 'Kral', email: 'dennis.kral@immivo.ai', role: 'SUPER_ADMIN', department: 'management', status: 'active', lastActive: 'Gerade eben', createdAt: '2026-01-15' },
  { id: '2', firstName: 'Max', lastName: 'Huber', email: 'max.huber@immivo.ai', role: 'ADMIN', department: 'engineering', status: 'active', lastActive: 'vor 10 Min', createdAt: '2026-01-20' },
  { id: '3', firstName: 'Sarah', lastName: 'Weber', email: 'sarah.weber@immivo.ai', role: 'STAFF', department: 'support', status: 'active', lastActive: 'vor 1 Std', createdAt: '2026-01-22' },
  { id: '4', firstName: 'Lisa', lastName: 'Müller', email: 'lisa.mueller@immivo.ai', role: 'STAFF', department: 'sales', status: 'invited', lastActive: '—', createdAt: '2026-01-28' },
  { id: '5', firstName: 'Tom', lastName: 'Fischer', email: 'tom.fischer@immivo.ai', role: 'ADMIN', department: 'engineering', status: 'active', lastActive: 'vor 30 Min', createdAt: '2026-01-25' },
];

export default function UsersPage() {
  const [members, setMembers] = useState<TeamMember[]>(MOCK_MEMBERS);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<Role | 'ALL'>('ALL');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [creating, setCreating] = useState(false);
  const [copied, setCopied] = useState(false);

  // New member form
  const [newMember, setNewMember] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    role: 'STAFF' as Role,
    department: 'support' as Department,
    createEmail: true,
  });

  const filteredMembers = members.filter((m) => {
    const matchesSearch = `${m.firstName} ${m.lastName} ${m.email}`.toLowerCase().includes(search.toLowerCase());
    const matchesRole = roleFilter === 'ALL' || m.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  const generateEmail = () => {
    const first = newMember.firstName.toLowerCase().replace(/[^a-z]/g, '');
    const last = newMember.lastName.toLowerCase().replace(/[^a-z]/g, '');
    if (first && last) {
      setNewMember(prev => ({ ...prev, email: `${first}.${last}@immivo.ai` }));
    }
  };

  const generatePassword = () => {
    const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%';
    let pw = '';
    for (let i = 0; i < 16; i++) pw += chars.charAt(Math.floor(Math.random() * chars.length));
    setNewMember(prev => ({ ...prev, password: pw }));
  };

  const handleCreate = async () => {
    setCreating(true);
    // Simulate API call
    await new Promise(r => setTimeout(r, 1500));
    
    const member: TeamMember = {
      id: String(Date.now()),
      firstName: newMember.firstName,
      lastName: newMember.lastName,
      email: newMember.email,
      role: newMember.role,
      department: newMember.department,
      status: 'invited',
      lastActive: '—',
      createdAt: new Date().toISOString().split('T')[0],
    };
    
    setMembers(prev => [member, ...prev]);
    setShowCreateModal(false);
    setNewMember({ firstName: '', lastName: '', email: '', password: '', role: 'STAFF', department: 'support', createEmail: true });
    setCreating(false);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="p-6 max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Mitarbeiter</h1>
          <p className="text-sm text-gray-500 mt-0.5">{members.length} Teammitglieder · {members.filter(m => m.status === 'active').length} aktiv</p>
        </div>
        <button
          onClick={() => { setShowCreateModal(true); generatePassword(); }}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4" />
          Neuer Mitarbeiter
        </button>
      </div>

      {/* Role Level Explanation */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6">
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Rollen-Hierarchie</h3>
        <div className="grid grid-cols-3 gap-4">
          {(Object.entries(ROLE_CONFIG) as [Role, typeof ROLE_CONFIG[Role]][]).map(([key, config]) => (
            <div key={key} className="flex items-start gap-3 p-3 rounded-lg bg-gray-50 border border-gray-100">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${key === 'SUPER_ADMIN' ? 'bg-red-100' : key === 'ADMIN' ? 'bg-violet-100' : 'bg-blue-100'}`}>
                <config.icon className={`w-4 h-4 ${key === 'SUPER_ADMIN' ? 'text-red-600' : key === 'ADMIN' ? 'text-violet-600' : 'text-blue-600'}`} />
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-900">Level {config.level} — {config.label}</p>
                <p className="text-[10px] text-gray-500 mt-0.5 leading-relaxed">
                  {key === 'SUPER_ADMIN' && 'Voller Zugriff. Kann alle Rollen verwalten, Billing, System-Config, Deployments.'}
                  {key === 'ADMIN' && 'Kann Staff verwalten, Support-Tickets, Chat-Channels. Kein Zugriff auf Super-Admin-Features.'}
                  {key === 'STAFF' && 'Zugriff je nach Abteilung: Support, Sales, Finance, Operations, Marketing, HR.'}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 mb-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Name oder E-Mail suchen..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          />
        </div>
        <div className="flex gap-1 bg-gray-100 rounded-lg p-0.5">
          {['ALL', 'SUPER_ADMIN', 'ADMIN', 'STAFF'].map((role) => (
            <button
              key={role}
              onClick={() => setRoleFilter(role as Role | 'ALL')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                roleFilter === role ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {role === 'ALL' ? 'Alle' : ROLE_CONFIG[role as Role].label}
            </button>
          ))}
        </div>
      </div>

      {/* Members Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-100">
              <th className="text-left px-4 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Mitarbeiter</th>
              <th className="text-left px-4 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Rolle</th>
              <th className="text-left px-4 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Abteilung</th>
              <th className="text-left px-4 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Status</th>
              <th className="text-left px-4 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Zuletzt aktiv</th>
              <th className="text-right px-4 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Aktionen</th>
            </tr>
          </thead>
          <tbody>
            {filteredMembers.map((member) => (
              <tr key={member.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50 transition-colors">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                      member.role === 'SUPER_ADMIN' ? 'bg-gradient-to-br from-red-500 to-orange-500 text-white' :
                      member.role === 'ADMIN' ? 'bg-gradient-to-br from-violet-500 to-indigo-500 text-white' :
                      'bg-gradient-to-br from-blue-500 to-cyan-500 text-white'
                    }`}>
                      {member.firstName[0]}{member.lastName[0]}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">{member.firstName} {member.lastName}</p>
                      <p className="text-xs text-gray-400">{member.email}</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-medium rounded border ${ROLE_CONFIG[member.role].color}`}>
                    {ROLE_CONFIG[member.role].label}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className="text-xs text-gray-600">{DEPARTMENTS[member.department]}</span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1.5">
                    <div className={`w-1.5 h-1.5 rounded-full ${
                      member.status === 'active' ? 'bg-emerald-500' : 
                      member.status === 'invited' ? 'bg-amber-500 animate-pulse' : 'bg-gray-300'
                    }`} />
                    <span className="text-xs text-gray-600 capitalize">{member.status === 'invited' ? 'Eingeladen' : member.status === 'active' ? 'Aktiv' : 'Inaktiv'}</span>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span className="text-xs text-gray-400">{member.lastActive}</span>
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-1">
                    <button className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-md transition-colors" title="Bearbeiten">
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-md transition-colors" title="E-Mail senden">
                      <Mail className="w-3.5 h-3.5" />
                    </button>
                    {member.role !== 'SUPER_ADMIN' && (
                      <button className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors" title="Entfernen">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowCreateModal(false)}>
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg mx-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <div>
                <h2 className="text-base font-semibold text-gray-900">Neuen Mitarbeiter erstellen</h2>
                <p className="text-xs text-gray-400 mt-0.5">AWS Cognito User + E-Mail Adresse</p>
              </div>
              <button onClick={() => setShowCreateModal(false)} className="p-1 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            <div className="px-6 py-4 space-y-4">
              {/* Name */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Vorname *</label>
                  <input
                    type="text"
                    value={newMember.firstName}
                    onChange={(e) => setNewMember(prev => ({ ...prev, firstName: e.target.value }))}
                    onBlur={generateEmail}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    placeholder="Max"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Nachname *</label>
                  <input
                    type="text"
                    value={newMember.lastName}
                    onChange={(e) => setNewMember(prev => ({ ...prev, lastName: e.target.value }))}
                    onBlur={generateEmail}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    placeholder="Mustermann"
                  />
                </div>
              </div>

              {/* Email */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">E-Mail Adresse *</label>
                <div className="flex gap-2">
                  <input
                    type="email"
                    value={newMember.email}
                    onChange={(e) => setNewMember(prev => ({ ...prev, email: e.target.value }))}
                    className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    placeholder="max.mustermann@immivo.ai"
                  />
                  <button
                    onClick={() => copyToClipboard(newMember.email)}
                    className="px-2 py-2 text-gray-400 hover:text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50"
                    title="Kopieren"
                  >
                    {copied ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
                <div className="flex items-center gap-2 mt-1.5">
                  <input
                    type="checkbox"
                    id="createEmail"
                    checked={newMember.createEmail}
                    onChange={(e) => setNewMember(prev => ({ ...prev, createEmail: e.target.checked }))}
                    className="w-3.5 h-3.5 text-indigo-600 rounded border-gray-300"
                  />
                  <label htmlFor="createEmail" className="text-[11px] text-gray-500">AWS SES E-Mail-Adresse erstellen</label>
                </div>
              </div>

              {/* Password */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Temporäres Passwort *</label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={newMember.password}
                      onChange={(e) => setNewMember(prev => ({ ...prev, password: e.target.value }))}
                      className="w-full px-3 py-2 pr-9 text-sm font-mono border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <button
                    onClick={generatePassword}
                    className="px-3 py-2 text-xs font-medium text-indigo-600 bg-indigo-50 border border-indigo-200 rounded-lg hover:bg-indigo-100"
                  >
                    Generieren
                  </button>
                </div>
                <p className="text-[10px] text-gray-400 mt-1">Der User muss das Passwort beim ersten Login ändern.</p>
              </div>

              {/* Role & Department */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Rolle *</label>
                  <select
                    value={newMember.role}
                    onChange={(e) => setNewMember(prev => ({ ...prev, role: e.target.value as Role }))}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white"
                  >
                    <option value="STAFF">Level 1 — Mitarbeiter</option>
                    <option value="ADMIN">Level 2 — Admin / Developer</option>
                    <option value="SUPER_ADMIN">Level 3 — Super Admin</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Abteilung *</label>
                  <select
                    value={newMember.department}
                    onChange={(e) => setNewMember(prev => ({ ...prev, department: e.target.value as Department }))}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white"
                  >
                    {Object.entries(DEPARTMENTS).map(([key, label]) => (
                      <option key={key} value={key}>{label}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Info */}
              <div className="flex items-start gap-2 p-3 bg-blue-50 rounded-lg border border-blue-100">
                <AlertCircle className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
                <p className="text-[11px] text-blue-700 leading-relaxed">
                  Der Mitarbeiter erhält eine Einladungs-E-Mail mit den Zugangsdaten. Beim ersten Login muss ein neues Passwort gesetzt werden.
                </p>
              </div>
            </div>

            <div className="flex gap-3 px-6 py-4 border-t border-gray-100 bg-gray-50 rounded-b-xl">
              <button
                onClick={() => setShowCreateModal(false)}
                className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50"
              >
                Abbrechen
              </button>
              <button
                onClick={handleCreate}
                disabled={!newMember.firstName || !newMember.lastName || !newMember.email || !newMember.password || creating}
                className="flex-1 px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                {creating ? 'Wird erstellt...' : 'Erstellen'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
