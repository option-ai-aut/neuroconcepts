'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { fetchAuthSession } from 'aws-amplify/auth';
import { getRuntimeConfig } from '@/components/EnvProvider';
import {
  Plus,
  Bold,
  Italic,
  Underline,
  List,
  ListOrdered,
  Loader2,
  Trash2,
  Save,
  Briefcase,
  MapPin,
  Building2,
  Users,
} from 'lucide-react';

const DEPARTMENTS = [
  'Entwicklung',
  'Design',
  'Marketing',
  'Vertrieb',
  'Kundenerfolg',
  'Sonstiges',
] as const;

const JOB_TYPES = [
  { value: 'FULL_TIME', label: 'Vollzeit' },
  { value: 'PART_TIME', label: 'Teilzeit' },
  { value: 'CONTRACT', label: 'Freelance' },
  { value: 'INTERNSHIP', label: 'Praktikum' },
] as const;

const APPLICATION_STATUSES = [
  { value: 'NEW', label: 'Neu' },
  { value: 'REVIEWING', label: 'In Prüfung' },
  { value: 'INTERVIEW', label: 'Interview' },
  { value: 'OFFER', label: 'Angebot' },
  { value: 'HIRED', label: 'Eingestellt' },
  { value: 'REJECTED', label: 'Abgelehnt' },
] as const;

interface JobPosting {
  id: string;
  title: string;
  department: string | null;
  location: string | null;
  type: string;
  remote: boolean;
  description: string;
  requirements: string | null;
  benefits: string | null;
  salary: string | null;
  published: boolean;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
  applicationCount?: number;
}

interface JobApplication {
  id: string;
  jobId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  coverLetter: string | null;
  resumeUrl: string | null;
  status: string;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '–';
  try {
    return new Date(dateStr).toLocaleDateString('de-DE', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

function RichTextEditor({
  value,
  onChange,
  placeholder,
  minHeight = 120,
}: {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  minHeight?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const execCommand = useCallback((cmd: string, val?: string) => {
    document.execCommand(cmd, false, val);
    ref.current?.focus();
  }, []);

  useEffect(() => {
    if (ref.current && ref.current.innerHTML !== value) {
      ref.current.innerHTML = value || '';
    }
  }, [value]);

  const handleInput = () => {
    onChange(ref.current?.innerHTML ?? '');
  };

  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden bg-white dark:bg-gray-900">
      <div className="flex flex-wrap gap-1 p-2 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
        <button type="button" onClick={() => execCommand('bold')} className="p-2 rounded hover:bg-gray-200 dark:hover:bg-gray-700" title="Fett">
          <Bold className="w-4 h-4" />
        </button>
        <button type="button" onClick={() => execCommand('italic')} className="p-2 rounded hover:bg-gray-200 dark:hover:bg-gray-700" title="Kursiv">
          <Italic className="w-4 h-4" />
        </button>
        <button type="button" onClick={() => execCommand('underline')} className="p-2 rounded hover:bg-gray-200 dark:hover:bg-gray-700" title="Unterstrichen">
          <Underline className="w-4 h-4" />
        </button>
        <div className="w-px h-6 bg-gray-300 dark:bg-gray-600 my-1" />
        <button type="button" onClick={() => execCommand('formatBlock', 'h2')} className="px-2 py-1 text-sm rounded hover:bg-gray-200 dark:hover:bg-gray-700" title="Überschrift 2">
          H2
        </button>
        <button type="button" onClick={() => execCommand('formatBlock', 'h3')} className="px-2 py-1 text-sm rounded hover:bg-gray-200 dark:hover:bg-gray-700" title="Überschrift 3">
          H3
        </button>
        <div className="w-px h-6 bg-gray-300 dark:bg-gray-600 my-1" />
        <button type="button" onClick={() => execCommand('insertUnorderedList')} className="p-2 rounded hover:bg-gray-200 dark:hover:bg-gray-700" title="Aufzählung">
          <List className="w-4 h-4" />
        </button>
        <button type="button" onClick={() => execCommand('insertOrderedList')} className="p-2 rounded hover:bg-gray-200 dark:hover:bg-gray-700" title="Nummerierte Liste">
          <ListOrdered className="w-4 h-4" />
        </button>
      </div>
      <div
        ref={ref}
        contentEditable
        data-placeholder={placeholder}
        onInput={handleInput}
        className="prose prose-sm dark:prose-invert max-w-none p-4 text-gray-900 dark:text-gray-100 focus:outline-none empty:before:content-[attr(data-placeholder)] empty:before:text-gray-400"
        style={{ minHeight }}
      />
    </div>
  );
}

function getApiUrl(): string {
  const config = getRuntimeConfig();
  return (config.apiUrl || process.env.NEXT_PUBLIC_API_URL || '').replace(/\/+$/, '');
}

async function getAdminToken(): Promise<string | undefined> {
  try {
    const session = await fetchAuthSession();
    return session.tokens?.idToken?.toString();
  } catch { return undefined; }
}

export default function KarriereAdminPage() {
  const [token, setToken] = useState<string | undefined>();

  useEffect(() => { getAdminToken().then(setToken); }, []);

  const [jobs, setJobs] = useState<JobPosting[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [applications, setApplications] = useState<JobApplication[]>([]);
  const [loadingApplications, setLoadingApplications] = useState(false);

  const [form, setForm] = useState({
    title: '',
    department: 'Sonstiges',
    location: 'Wien / Remote',
    type: 'FULL_TIME' as (typeof JOB_TYPES)[number]['value'],
    remote: false,
    salary: '',
    description: '',
    requirements: '',
    benefits: '',
    published: false,
  });

  const selectedJob = jobs.find((j) => j.id === selectedId);
  const isNew = selectedId === 'new';

  const fetchJobs = useCallback(async () => {
    if (!token) return;
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`${getApiUrl()}/admin/jobs`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Fehler beim Laden');
      const data = await res.json();
      setJobs(data.jobs ?? []);
      if (selectedId && selectedId !== 'new' && !data.jobs?.find((j: JobPosting) => j.id === selectedId)) {
        setSelectedId(null);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Fehler beim Laden');
      setJobs([]);
    } finally {
      setLoading(false);
    }
  }, [token, selectedId]);

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  const fetchApplications = useCallback(
    async (jobId: string) => {
      if (!token || !jobId) return;
      try {
        setLoadingApplications(true);
        const res = await fetch(`${getApiUrl()}/admin/jobs/${jobId}/applications`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error('Fehler beim Laden der Bewerbungen');
        const data = await res.json();
        setApplications(data.applications ?? []);
      } catch {
        setApplications([]);
      } finally {
        setLoadingApplications(false);
      }
    },
    [token]
  );

  useEffect(() => {
    if (selectedJob?.published && selectedJob?.id) {
      fetchApplications(selectedJob.id);
    } else {
      setApplications([]);
    }
  }, [selectedJob?.id, selectedJob?.published, fetchApplications]);

  useEffect(() => {
    if (isNew) {
      setForm({
        title: '',
        department: 'Sonstiges',
        location: 'Wien / Remote',
        type: 'FULL_TIME',
        remote: false,
        salary: '',
        description: '',
        requirements: '',
        benefits: '',
        published: false,
      });
    } else if (selectedJob) {
      setForm({
        title: selectedJob.title,
        department: selectedJob.department || 'Sonstiges',
        location: selectedJob.location || 'Wien / Remote',
        type: (selectedJob.type as (typeof JOB_TYPES)[number]['value']) || 'FULL_TIME',
        remote: selectedJob.remote,
        salary: selectedJob.salary || '',
        description: selectedJob.description || '',
        requirements: selectedJob.requirements || '',
        benefits: selectedJob.benefits || '',
        published: selectedJob.published,
      });
    }
  }, [selectedJob, isNew]);

  const handleNewJob = () => setSelectedId('new');

  const handleSelectJob = (id: string) => setSelectedId(id);

  const handleSave = async () => {
    if (!token) return;
    if (!form.title.trim()) {
      setError('Titel ist erforderlich');
      return;
    }
    if (!form.description.trim()) {
      setError('Beschreibung ist erforderlich');
      return;
    }
    const payload = {
      title: form.title.trim(),
      department: form.department || null,
      location: form.location.trim() || null,
      type: form.type,
      remote: form.remote,
      salary: form.salary.trim() || null,
      description: form.description,
      requirements: form.requirements || null,
      benefits: form.benefits || null,
      published: form.published,
    };
    try {
      setSaving(true);
      setError(null);
      if (isNew) {
        const res = await fetch(`${getApiUrl()}/admin/jobs`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error || 'Fehler beim Speichern');
        }
        const data = await res.json();
        setJobs((prev) => [{ ...data.job, applicationCount: 0 }, ...prev]);
        setSelectedId(data.job.id);
      } else if (selectedId) {
        const res = await fetch(`${getApiUrl()}/admin/jobs/${selectedId}`, {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error || 'Fehler beim Speichern');
        }
        const data = await res.json();
        setJobs((prev) =>
          prev.map((j) =>
            j.id === selectedId ? { ...data.job, applicationCount: j.applicationCount ?? 0 } : j
          )
        );
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Fehler beim Speichern');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedId || isNew || !confirm('Stelle wirklich löschen?')) return;
    if (!token) return;
    try {
      setDeleting(true);
      const res = await fetch(`${getApiUrl()}/admin/jobs/${selectedId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Fehler beim Löschen');
      setJobs((prev) => prev.filter((j) => j.id !== selectedId));
      setSelectedId(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Fehler beim Löschen');
    } finally {
      setDeleting(false);
    }
  };

  const handleApplicationStatusChange = async (appId: string, status: string) => {
    if (!token) return;
    try {
      const res = await fetch(`${getApiUrl()}/admin/jobs/applications/${appId}`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error('Fehler beim Aktualisieren');
      const data = await res.json();
      setApplications((prev) =>
        prev.map((a) => (a.id === appId ? data.application : a))
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Fehler beim Aktualisieren');
    }
  };

  return (
    <div className="h-full flex overflow-hidden bg-white dark:bg-gray-950">
      {/* Left Panel - Job List */}
      <div className="w-80 flex flex-col border-r border-gray-200 dark:border-gray-800 shrink-0">
        <div className="p-4 flex items-center justify-between shrink-0">
          <h1 className="text-lg font-semibold text-gray-900 dark:text-white">
            Stellenanzeigen
          </h1>
          <button
            onClick={handleNewJob}
            className="flex items-center gap-1.5 px-3 py-2 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 rounded-lg hover:bg-gray-800 dark:hover:bg-gray-200 text-sm font-medium transition-colors"
          >
            <Plus className="w-4 h-4" />
            Neue Stelle
          </button>
        </div>
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
            </div>
          ) : jobs.length === 0 ? (
            <div className="p-6 text-center text-sm text-gray-500 dark:text-gray-400">
              Noch keine Stellen
            </div>
          ) : (
            <ul className="p-2 space-y-1">
              {jobs.map((job) => (
                <li key={job.id}>
                  <button
                    onClick={() => handleSelectJob(job.id)}
                    className={`w-full text-left px-3 py-2.5 rounded-lg transition-colors ${
                      selectedId === job.id
                        ? 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white'
                        : 'hover:bg-gray-50 dark:hover:bg-gray-800/50 text-gray-700 dark:text-gray-300'
                    }`}
                  >
                    <div className="font-medium text-sm truncate">{job.title}</div>
                    <div className="flex items-center gap-2 mt-1 text-xs text-gray-500 dark:text-gray-400">
                      {job.department && (
                        <span className="flex items-center gap-0.5">
                          <Building2 className="w-3 h-3" />
                          {job.department}
                        </span>
                      )}
                      {job.location && (
                        <span className="flex items-center gap-0.5">
                          <MapPin className="w-3 h-3" />
                          {job.location}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center justify-between mt-1 text-xs">
                      <span
                        className={
                          job.published
                            ? 'text-green-600 dark:text-green-400'
                            : 'text-amber-600 dark:text-amber-400'
                        }
                      >
                        {job.published ? 'Veröffentlicht' : 'Entwurf'}
                      </span>
                      {typeof job.applicationCount === 'number' && (
                        <span className="flex items-center gap-0.5 text-gray-500">
                          <Users className="w-3 h-3" />
                          {job.applicationCount}
                        </span>
                      )}
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Right Panel - Job Editor */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        {(!selectedId || (selectedId !== 'new' && !selectedJob)) && !isNew ? (
          <div className="flex-1 flex items-center justify-center text-gray-500 dark:text-gray-400">
            Wähle eine Stelle oder erstelle eine neue
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {error && (
              <div className="px-4 py-3 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 text-sm">
                {error}
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                  Titel
                </label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
                  placeholder="z.B. Senior Software Engineer"
                  className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                    Abteilung
                  </label>
                  <select
                    value={form.department}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, department: e.target.value }))
                    }
                    className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    {DEPARTMENTS.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                    Standort
                  </label>
                  <input
                    type="text"
                    value={form.location}
                    onChange={(e) => setForm((p) => ({ ...p, location: e.target.value }))}
                    placeholder="Wien / Remote"
                    className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                    Anstellungsart
                  </label>
                  <select
                    value={form.type}
                    onChange={(e) =>
                      setForm((p) => ({
                        ...p,
                        type: e.target.value as (typeof JOB_TYPES)[number]['value'],
                      }))
                    }
                    className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    {JOB_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex items-center pt-6">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.remote}
                      onChange={(e) =>
                        setForm((p) => ({ ...p, remote: e.target.checked }))
                      }
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300">
                      Remote möglich
                    </span>
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                  Gehalt (optional)
                </label>
                <input
                  type="text"
                  value={form.salary}
                  onChange={(e) => setForm((p) => ({ ...p, salary: e.target.value }))}
                  placeholder="z.B. €50.000 - €70.000"
                  className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">
                  Beschreibung
                </label>
                <RichTextEditor
                  value={form.description}
                  onChange={(html) => setForm((p) => ({ ...p, description: html }))}
                  placeholder="Tätigkeitsbeschreibung..."
                  minHeight={200}
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">
                  Anforderungen
                </label>
                <RichTextEditor
                  value={form.requirements}
                  onChange={(html) => setForm((p) => ({ ...p, requirements: html }))}
                  placeholder="Anforderungen..."
                  minHeight={120}
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">
                  Benefits
                </label>
                <RichTextEditor
                  value={form.benefits}
                  onChange={(html) => setForm((p) => ({ ...p, benefits: html }))}
                  placeholder="Benefits..."
                  minHeight={120}
                />
              </div>

              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.published}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, published: e.target.checked }))
                    }
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    Veröffentlicht
                  </span>
                </label>
              </div>

              <div className="flex items-center gap-3 pt-4">
                <button
                  onClick={handleSave}
                  disabled={saving || !form.title.trim()}
                  className="flex items-center gap-2 px-4 py-2.5 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 rounded-lg hover:bg-gray-800 dark:hover:bg-gray-200 font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {saving ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  Speichern
                </button>
                {!isNew && selectedId && (
                  <button
                    onClick={handleDelete}
                    disabled={deleting}
                    className="flex items-center gap-2 px-4 py-2.5 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg font-medium disabled:opacity-50 transition-colors"
                  >
                    {deleting ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Trash2 className="w-4 h-4" />
                    )}
                    Löschen
                  </button>
                )}
              </div>
            </div>

            {/* Applications view - shown when viewing a published job */}
            {selectedJob?.published && selectedJob.id && (
              <div className="border-t border-gray-200 dark:border-gray-800 pt-6">
                <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                  <Briefcase className="w-4 h-4" />
                  Bewerbungen ({applications.length})
                </h2>
                {loadingApplications ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
                  </div>
                ) : applications.length === 0 ? (
                  <div className="text-sm text-gray-500 dark:text-gray-400 py-4">
                    Noch keine Bewerbungen
                  </div>
                ) : (
                  <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="bg-gray-50 dark:bg-gray-900/50">
                            <th className="px-4 py-3 text-left font-medium text-gray-700 dark:text-gray-300">
                              Name
                            </th>
                            <th className="px-4 py-3 text-left font-medium text-gray-700 dark:text-gray-300">
                              E-Mail
                            </th>
                            <th className="px-4 py-3 text-left font-medium text-gray-700 dark:text-gray-300">
                              Telefon
                            </th>
                            <th className="px-4 py-3 text-left font-medium text-gray-700 dark:text-gray-300">
                              Status
                            </th>
                            <th className="px-4 py-3 text-left font-medium text-gray-700 dark:text-gray-300">
                              Datum
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {applications.map((app) => (
                            <tr
                              key={app.id}
                              className="border-t border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/30"
                            >
                              <td className="px-4 py-3 text-gray-900 dark:text-white">
                                {app.firstName} {app.lastName}
                              </td>
                              <td className="px-4 py-3 text-gray-700 dark:text-gray-300">
                                <a
                                  href={`mailto:${app.email}`}
                                  className="text-blue-600 dark:text-blue-400 hover:underline"
                                >
                                  {app.email}
                                </a>
                              </td>
                              <td className="px-4 py-3 text-gray-700 dark:text-gray-300">
                                {app.phone || '–'}
                              </td>
                              <td className="px-4 py-3">
                                <select
                                  value={app.status}
                                  onChange={(e) =>
                                    handleApplicationStatusChange(app.id, e.target.value)
                                  }
                                  className="px-2 py-1.5 rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-xs focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                >
                                  {APPLICATION_STATUSES.map((s) => (
                                    <option key={s.value} value={s.value}>
                                      {s.label}
                                    </option>
                                  ))}
                                </select>
                              </td>
                              <td className="px-4 py-3 text-gray-500 dark:text-gray-400">
                                {formatDate(app.createdAt)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
