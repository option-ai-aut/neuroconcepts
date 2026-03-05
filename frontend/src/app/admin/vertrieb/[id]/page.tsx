'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { fetchAuthSession } from 'aws-amplify/auth';
import { useRuntimeConfig } from '@/components/RuntimeConfigProvider';
import {
  ArrowLeft, Loader2, AlertTriangle, Edit2, Save, X, Plus,
  Mail, Phone, Building2, Globe, DollarSign, Calendar, User,
  Video, ExternalLink, Copy, CheckCircle2, Clock, Trash2,
  MessageSquare, TrendingUp, Activity, FileText
} from 'lucide-react';

interface SalesProspect {
  id: string;
  name: string;
  email: string;
  phone?: string;
  jobTitle?: string;
  company?: string;
  companySize?: string;
  companyUrl?: string;
  stage: string;
  dealValue?: number;
  expectedCloseDate?: string;
  assignedToEmail?: string;
  meetLink?: string;
  meetRoomCode?: string;
  lastActivityAt?: string;
  sourceBookingId?: string;
  createdAt: string;
  activities: SalesActivity[];
  tasks: SalesTask[];
}

interface SalesActivity {
  id: string;
  type: string;
  content: string;
  createdBy?: string;
  createdAt: string;
}

interface SalesTask {
  id: string;
  title: string;
  dueDate?: string;
  done: boolean;
  doneAt?: string;
  assignedTo?: string;
  createdAt: string;
}

const STAGE_OPTIONS = [
  { key: 'NEW_LEAD', label: 'Neuer Lead' },
  { key: 'DEMO_SCHEDULED', label: 'Demo geplant' },
  { key: 'DEMO_DONE', label: 'Demo gehalten' },
  { key: 'PROPOSAL_SENT', label: 'Angebot gesendet' },
  { key: 'NEGOTIATION', label: 'Verhandlung' },
  { key: 'WON', label: 'Gewonnen' },
  { key: 'LOST', label: 'Verloren' },
];

const STAGE_COLORS: Record<string, string> = {
  NEW_LEAD: 'bg-gray-100 text-gray-700',
  DEMO_SCHEDULED: 'bg-blue-100 text-blue-700',
  DEMO_DONE: 'bg-purple-100 text-purple-700',
  PROPOSAL_SENT: 'bg-amber-100 text-amber-700',
  NEGOTIATION: 'bg-orange-100 text-orange-700',
  WON: 'bg-green-100 text-green-700',
  LOST: 'bg-red-100 text-red-700',
};

const ACTIVITY_ICONS: Record<string, string> = {
  NOTE: '📝', EMAIL_SENT: '📧', CALL: '📞', DEMO: '🎥', PROPOSAL: '📄',
  STAGE_CHANGE: '🔄', MEETING: '🤝', FILE_UPLOAD: '📎', TASK_DONE: '✅',
};

const ACTIVITY_TYPES = [
  { key: 'NOTE', label: 'Notiz' },
  { key: 'CALL', label: 'Anruf' },
  { key: 'EMAIL_SENT', label: 'E-Mail gesendet' },
  { key: 'DEMO', label: 'Demo' },
  { key: 'PROPOSAL', label: 'Angebot' },
  { key: 'MEETING', label: 'Meeting' },
];

export default function ProspectDetailPage() {
  const params = useParams();
  const router = useRouter();
  const config = useRuntimeConfig();
  const id = params.id as string;

  const [prospect, setProspect] = useState<SalesProspect | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [token, setToken] = useState('');
  const [saving, setSaving] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editForm, setEditForm] = useState<Partial<SalesProspect>>({});
  const [creatingMeet, setCreatingMeet] = useState(false);
  const [activityContent, setActivityContent] = useState('');
  const [activityType, setActivityType] = useState('NOTE');
  const [addingActivity, setAddingActivity] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDue, setNewTaskDue] = useState('');
  const [addingTask, setAddingTask] = useState(false);
  const [showTaskForm, setShowTaskForm] = useState(false);

  const apiUrl = (config.apiUrl || process.env.NEXT_PUBLIC_API_URL || '').replace(/\/+$/, '');

  const loadProspect = useCallback(async () => {
    try {
      const session = await fetchAuthSession();
      const tok = session.tokens?.idToken?.toString() || '';
      setToken(tok);
      const res = await fetch(`${apiUrl}/admin/sales/prospects/${id}`, { headers: { Authorization: `Bearer ${tok}` } });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setProspect(data.prospect);
    } catch (err: any) {
      setError(err.message || 'Fehler beim Laden');
    } finally {
      setLoading(false);
    }
  }, [apiUrl, id]);

  useEffect(() => { loadProspect(); }, [loadProspect]);

  const startEdit = () => {
    if (!prospect) return;
    setEditForm({
      name: prospect.name,
      email: prospect.email,
      phone: prospect.phone,
      jobTitle: prospect.jobTitle,
      company: prospect.company,
      companySize: prospect.companySize,
      companyUrl: prospect.companyUrl,
      stage: prospect.stage,
      dealValue: prospect.dealValue,
      expectedCloseDate: prospect.expectedCloseDate ? prospect.expectedCloseDate.split('T')[0] : '',
      assignedToEmail: prospect.assignedToEmail,
    });
    setEditMode(true);
  };

  const saveEdit = async () => {
    if (!prospect) return;
    setSaving(true);
    try {
      const res = await fetch(`${apiUrl}/admin/sales/prospects/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(editForm),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setProspect(prev => prev ? { ...prev, ...data.prospect, activities: prev.activities, tasks: prev.tasks } : null);
      setEditMode(false);
    } catch (err: any) {
      alert('Fehler beim Speichern: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const createMeet = async () => {
    setCreatingMeet(true);
    try {
      const res = await fetch(`${apiUrl}/admin/sales/prospects/${id}/meet`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setProspect(prev => prev ? { ...prev, meetLink: data.meetLink, meetRoomCode: data.meetRoomCode } : null);
    } catch (err: any) {
      alert('Fehler beim Erstellen: ' + err.message);
    } finally {
      setCreatingMeet(false);
    }
  };

  const addActivity = async () => {
    if (!activityContent.trim()) return;
    setAddingActivity(true);
    try {
      const res = await fetch(`${apiUrl}/admin/sales/prospects/${id}/activities`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ type: activityType, content: activityContent }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setProspect(prev => prev ? { ...prev, activities: [data.activity, ...prev.activities] } : null);
      setActivityContent('');
    } catch (err: any) {
      alert('Fehler: ' + err.message);
    } finally {
      setAddingActivity(false);
    }
  };

  const addTask = async () => {
    if (!newTaskTitle.trim()) return;
    setAddingTask(true);
    try {
      const res = await fetch(`${apiUrl}/admin/sales/prospects/${id}/tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ title: newTaskTitle, dueDate: newTaskDue || undefined }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setProspect(prev => prev ? { ...prev, tasks: [data.task, ...prev.tasks] } : null);
      setNewTaskTitle('');
      setNewTaskDue('');
      setShowTaskForm(false);
    } catch (err: any) {
      alert('Fehler: ' + err.message);
    } finally {
      setAddingTask(false);
    }
  };

  const toggleTask = async (taskId: string, done: boolean) => {
    try {
      const res = await fetch(`${apiUrl}/admin/sales/prospects/${id}/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ done }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setProspect(prev => prev ? { ...prev, tasks: prev.tasks.map(t => t.id === taskId ? { ...t, done } : t) } : null);
      if (done) loadProspect();
    } catch (err: any) {
      alert('Fehler: ' + err.message);
    }
  };

  const changeStage = async (newStage: string) => {
    try {
      const res = await fetch(`${apiUrl}/admin/sales/prospects/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ stage: newStage }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setProspect(prev => prev ? { ...prev, stage: newStage, lastActivityAt: data.prospect.lastActivityAt } : null);
      loadProspect();
    } catch (err: any) {
      alert('Fehler: ' + err.message);
    }
  };

  const deleteProspect = async () => {
    if (!confirm(`Prospect "${prospect?.name}" wirklich löschen?`)) return;
    try {
      await fetch(`${apiUrl}/admin/sales/prospects/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      router.push('/admin/vertrieb');
    } catch (err: any) {
      alert('Fehler: ' + err.message);
    }
  };

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>;
  if (error || !prospect) return (
    <div className="p-6">
      <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
        <AlertTriangle className="w-8 h-8 text-red-400 mx-auto mb-2" />
        <p className="text-sm text-red-600 mb-3">{error || 'Prospect nicht gefunden'}</p>
        <button onClick={() => router.back()} className="text-sm text-blue-600 hover:underline">Zurück</button>
      </div>
    </div>
  );

  const stageCfg = STAGE_COLORS[prospect.stage] || STAGE_COLORS.NEW_LEAD;
  const openTasks = prospect.tasks.filter(t => !t.done);
  const doneTasks = prospect.tasks.filter(t => t.done);

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6 flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-start gap-3">
          <button onClick={() => router.back()} className="mt-1 p-1.5 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            {editMode ? (
              <input value={editForm.name || ''} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))}
                className="text-xl font-bold text-gray-900 border-b-2 border-gray-900 focus:outline-none bg-transparent" />
            ) : (
              <h1 className="text-xl font-bold text-gray-900">{prospect.name}</h1>
            )}
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              {prospect.company && <span className="flex items-center gap-1 text-sm text-gray-500"><Building2 className="w-3.5 h-3.5" />{prospect.company}</span>}
              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${stageCfg}`}>{STAGE_OPTIONS.find(s => s.key === prospect.stage)?.label}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {editMode ? (
            <>
              <button onClick={() => setEditMode(false)} className="p-1.5 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors"><X className="w-4 h-4" /></button>
              <button onClick={saveEdit} disabled={saving} className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium bg-gray-900 text-white rounded-lg hover:bg-gray-700 transition-colors">
                {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                Speichern
              </button>
            </>
          ) : (
            <>
              <button onClick={startEdit} className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors">
                <Edit2 className="w-3.5 h-3.5" />Bearbeiten
              </button>
              <button onClick={deleteProspect} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                <Trash2 className="w-4 h-4" />
              </button>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Details */}
        <div className="space-y-4">
          {/* Contact Info */}
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <h2 className="text-sm font-semibold text-gray-800 mb-3">Kontaktdaten</h2>
            <div className="space-y-2">
              {editMode ? (
                <>
                  <div><label className="text-xs text-gray-500">E-Mail</label><input value={editForm.email || ''} onChange={e => setEditForm(f => ({ ...f, email: e.target.value }))} className="w-full mt-0.5 px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900" /></div>
                  <div><label className="text-xs text-gray-500">Telefon</label><input value={editForm.phone || ''} onChange={e => setEditForm(f => ({ ...f, phone: e.target.value }))} className="w-full mt-0.5 px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900" placeholder="+43 ..." /></div>
                  <div><label className="text-xs text-gray-500">Position</label><input value={editForm.jobTitle || ''} onChange={e => setEditForm(f => ({ ...f, jobTitle: e.target.value }))} className="w-full mt-0.5 px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900" placeholder="CEO, Sales Manager, ..." /></div>
                  <div><label className="text-xs text-gray-500">Unternehmen</label><input value={editForm.company || ''} onChange={e => setEditForm(f => ({ ...f, company: e.target.value }))} className="w-full mt-0.5 px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900" /></div>
                  <div><label className="text-xs text-gray-500">Unternehmensgröße</label>
                    <select value={editForm.companySize || ''} onChange={e => setEditForm(f => ({ ...f, companySize: e.target.value }))} className="w-full mt-0.5 px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 bg-white">
                      <option value="">–</option>
                      {['1-10', '11-50', '51-200', '201-500', '500+'].map(s => <option key={s} value={s}>{s} Mitarbeiter</option>)}
                    </select>
                  </div>
                  <div><label className="text-xs text-gray-500">Website</label><input value={editForm.companyUrl || ''} onChange={e => setEditForm(f => ({ ...f, companyUrl: e.target.value }))} className="w-full mt-0.5 px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900" placeholder="https://..." /></div>
                </>
              ) : (
                <>
                  <a href={`mailto:${prospect.email}`} className="flex items-center gap-2 text-sm text-blue-600 hover:underline"><Mail className="w-3.5 h-3.5 shrink-0 text-gray-400" />{prospect.email}</a>
                  {prospect.phone && <a href={`tel:${prospect.phone}`} className="flex items-center gap-2 text-sm text-gray-700 hover:text-blue-600"><Phone className="w-3.5 h-3.5 shrink-0 text-gray-400" />{prospect.phone}</a>}
                  {prospect.jobTitle && <p className="flex items-center gap-2 text-sm text-gray-600"><User className="w-3.5 h-3.5 shrink-0 text-gray-400" />{prospect.jobTitle}</p>}
                  {prospect.company && <p className="flex items-center gap-2 text-sm text-gray-600"><Building2 className="w-3.5 h-3.5 shrink-0 text-gray-400" />{prospect.company}{prospect.companySize ? ` · ${prospect.companySize} MA` : ''}</p>}
                  {prospect.companyUrl && <a href={prospect.companyUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-blue-600 hover:underline"><Globe className="w-3.5 h-3.5 shrink-0 text-gray-400" />{prospect.companyUrl.replace(/^https?:\/\//, '')}</a>}
                </>
              )}
            </div>
          </div>

          {/* Deal Info */}
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <h2 className="text-sm font-semibold text-gray-800 mb-3">Deal</h2>
            <div className="space-y-2">
              {editMode ? (
                <>
                  <div><label className="text-xs text-gray-500">Stage</label>
                    <select value={editForm.stage || ''} onChange={e => setEditForm(f => ({ ...f, stage: e.target.value }))} className="w-full mt-0.5 px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 bg-white">
                      {STAGE_OPTIONS.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
                    </select>
                  </div>
                  <div><label className="text-xs text-gray-500">Deal-Wert (€)</label><input value={editForm.dealValue || ''} onChange={e => setEditForm(f => ({ ...f, dealValue: parseFloat(e.target.value) || undefined }))} type="number" className="w-full mt-0.5 px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900" placeholder="0" /></div>
                  <div><label className="text-xs text-gray-500">Abschlussdatum</label><input value={(editForm.expectedCloseDate as string) || ''} onChange={e => setEditForm(f => ({ ...f, expectedCloseDate: e.target.value }))} type="date" className="w-full mt-0.5 px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900" /></div>
                  <div><label className="text-xs text-gray-500">Zugewiesen an</label><input value={editForm.assignedToEmail || ''} onChange={e => setEditForm(f => ({ ...f, assignedToEmail: e.target.value }))} type="email" className="w-full mt-0.5 px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900" placeholder="mitarbeiter@immivo.ai" /></div>
                </>
              ) : (
                <>
                  <div className="flex justify-between"><span className="text-xs text-gray-500">Stage</span><span className={`text-xs font-medium px-2 py-0.5 rounded-full ${stageCfg}`}>{STAGE_OPTIONS.find(s => s.key === prospect.stage)?.label}</span></div>
                  {Number(prospect.dealValue) > 0 && <div className="flex justify-between"><span className="text-xs text-gray-500">Deal-Wert</span><span className="text-sm font-bold text-emerald-700">€{Number(prospect.dealValue).toLocaleString('de-AT')}</span></div>}
                  {prospect.expectedCloseDate && <div className="flex justify-between"><span className="text-xs text-gray-500">Abschluss</span><span className="text-sm text-gray-700">{new Date(prospect.expectedCloseDate).toLocaleDateString('de-DE')}</span></div>}
                  {prospect.assignedToEmail && <div className="flex justify-between"><span className="text-xs text-gray-500">Betreuer</span><span className="text-xs text-gray-700 truncate max-w-[120px]">{prospect.assignedToEmail}</span></div>}
                </>
              )}
            </div>

            {/* Quick Stage Change */}
            {!editMode && (
              <div className="mt-4 pt-4 border-t border-gray-100">
                <p className="text-xs text-gray-500 mb-2">Stage wechseln:</p>
                <div className="flex flex-wrap gap-1">
                  {STAGE_OPTIONS.filter(s => s.key !== prospect.stage).map(s => (
                    <button key={s.key} onClick={() => changeStage(s.key)}
                      className="px-2 py-1 text-[11px] bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors">
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Meet Link */}
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <h2 className="text-sm font-semibold text-gray-800 mb-3 flex items-center gap-2"><Video className="w-4 h-4 text-gray-500" />Video Meeting</h2>
            {prospect.meetLink ? (
              <div className="space-y-2">
                <div className="flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-lg px-3 py-2">
                  <span className="text-xs text-blue-800 truncate flex-1">{prospect.meetLink}</span>
                  <button onClick={() => navigator.clipboard.writeText(prospect.meetLink!)} className="p-1 hover:bg-blue-100 rounded shrink-0" title="Kopieren"><Copy className="w-3.5 h-3.5 text-blue-600" /></button>
                  <a href={prospect.meetLink} target="_blank" rel="noopener noreferrer" className="p-1 hover:bg-blue-100 rounded shrink-0" title="Öffnen"><ExternalLink className="w-3.5 h-3.5 text-blue-600" /></a>
                </div>
                <a href={`mailto:${prospect.email}?subject=Meeting-Link&body=Unser Meeting-Link: ${prospect.meetLink}`}
                  className="flex items-center justify-center gap-1.5 w-full py-1.5 text-xs text-blue-600 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg transition-colors">
                  <Mail className="w-3.5 h-3.5" />Link per E-Mail senden
                </a>
              </div>
            ) : (
              <button onClick={createMeet} disabled={creatingMeet}
                className="flex items-center justify-center gap-2 w-full py-2 text-sm font-medium bg-gray-900 text-white rounded-lg hover:bg-gray-700 transition-colors">
                {creatingMeet ? <Loader2 className="w-4 h-4 animate-spin" /> : <Video className="w-4 h-4" />}
                {creatingMeet ? 'Erstelle...' : 'Meeting-Raum erstellen'}
              </button>
            )}
          </div>
        </div>

        {/* Right Column: Activity Timeline + Tasks */}
        <div className="lg:col-span-2 space-y-4">
          {/* Tasks */}
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-gray-800 flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-gray-500" />Aufgaben</h2>
              <button onClick={() => setShowTaskForm(!showTaskForm)} className="flex items-center gap-1 text-xs text-gray-600 hover:text-gray-900 bg-gray-100 hover:bg-gray-200 px-2 py-1 rounded-lg transition-colors">
                <Plus className="w-3.5 h-3.5" />Neue Aufgabe
              </button>
            </div>

            {showTaskForm && (
              <div className="mb-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
                <input value={newTaskTitle} onChange={e => setNewTaskTitle(e.target.value)} placeholder="Aufgabe eingeben..."
                  className="w-full px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 mb-2" />
                <div className="flex gap-2">
                  <input value={newTaskDue} onChange={e => setNewTaskDue(e.target.value)} type="date"
                    className="flex-1 px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900" />
                  <button onClick={addTask} disabled={addingTask || !newTaskTitle.trim()}
                    className="px-3 py-1.5 text-sm font-medium bg-gray-900 text-white rounded-lg hover:bg-gray-700 transition-colors flex items-center gap-1">
                    {addingTask ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}Hinzufügen
                  </button>
                </div>
              </div>
            )}

            {openTasks.length === 0 && doneTasks.length === 0 ? (
              <p className="text-xs text-gray-400 text-center py-4">Keine Aufgaben</p>
            ) : (
              <div className="space-y-1.5">
                {openTasks.map(task => {
                  const isOverdue = task.dueDate && new Date(task.dueDate) < new Date();
                  return (
                    <div key={task.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 transition-colors group">
                      <button onClick={() => toggleTask(task.id, true)} className={`w-4 h-4 rounded border-2 shrink-0 flex items-center justify-center ${isOverdue ? 'border-red-400 hover:border-red-600' : 'border-gray-300 hover:border-gray-500'}`} />
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm ${isOverdue ? 'text-red-700 font-medium' : 'text-gray-800'}`}>{task.title}</p>
                        {task.dueDate && <p className={`text-xs ${isOverdue ? 'text-red-500 font-medium' : 'text-gray-400'}`}>fällig: {new Date(task.dueDate).toLocaleDateString('de-DE')}</p>}
                      </div>
                    </div>
                  );
                })}
                {doneTasks.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-gray-100">
                    {doneTasks.slice(0, 3).map(task => (
                      <div key={task.id} className="flex items-center gap-3 p-2 opacity-50">
                        <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
                        <p className="text-sm text-gray-500 line-through">{task.title}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Activity Timeline */}
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <h2 className="text-sm font-semibold text-gray-800 mb-4 flex items-center gap-2"><Activity className="w-4 h-4 text-gray-500" />Aktivitäten & Timeline</h2>

            {/* Add Activity */}
            <div className="mb-4 p-3 bg-gray-50 rounded-lg border border-gray-100">
              <div className="flex gap-2 mb-2 flex-wrap">
                {ACTIVITY_TYPES.map(t => (
                  <button key={t.key} onClick={() => setActivityType(t.key)}
                    className={`px-2 py-1 text-[11px] font-medium rounded-lg transition-colors ${activityType === t.key ? 'bg-gray-900 text-white' : 'bg-gray-200 text-gray-600 hover:bg-gray-300'}`}>
                    {ACTIVITY_ICONS[t.key]} {t.label}
                  </button>
                ))}
              </div>
              <textarea value={activityContent} onChange={e => setActivityContent(e.target.value)} placeholder="Aktivität hinzufügen..." rows={2}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 resize-none" />
              <div className="flex justify-end mt-2">
                <button onClick={addActivity} disabled={addingActivity || !activityContent.trim()}
                  className="px-3 py-1.5 text-xs font-medium bg-gray-900 text-white rounded-lg hover:bg-gray-700 transition-colors flex items-center gap-1">
                  {addingActivity ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                  Eintragen
                </button>
              </div>
            </div>

            {/* Timeline */}
            <div className="space-y-3">
              {prospect.activities.length === 0 ? (
                <p className="text-xs text-gray-400 text-center py-4">Noch keine Aktivitäten</p>
              ) : (
                prospect.activities.map((activity, i) => (
                  <div key={activity.id} className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-sm shrink-0">{ACTIVITY_ICONS[activity.type] || '•'}</div>
                      {i < prospect.activities.length - 1 && <div className="w-0.5 h-full bg-gray-100 mt-1" />}
                    </div>
                    <div className="flex-1 pb-3">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-medium text-gray-700">{ACTIVITY_TYPES.find(t => t.key === activity.type)?.label || activity.type}</span>
                        {activity.createdBy && activity.createdBy !== 'system' && <span className="text-[10px] text-gray-400">von {activity.createdBy}</span>}
                        <span className="text-[10px] text-gray-400 ml-auto">{new Date(activity.createdAt).toLocaleString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                      <p className="text-sm text-gray-600 whitespace-pre-wrap">{activity.content}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
