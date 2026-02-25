'use client';

import { useState, useEffect, useCallback } from 'react';
import { Bug, Inbox, ChevronRight, Clock, CheckCircle, XCircle, AlertTriangle, ArrowRight, RefreshCw, Filter, Camera, Terminal, Maximize2 } from 'lucide-react';
import {
  getAdminBugReports,
  updateAdminBugReport,
  BugReport,
  BugReportStatus,
  BugReportPriority,
} from '@/lib/adminApi';

const STATUS_CONFIG: Record<BugReportStatus, { label: string; color: string; bgColor: string; icon: any }> = {
  OPEN: { label: 'Offen', color: 'text-blue-700', bgColor: 'bg-blue-50 border-blue-200', icon: Inbox },
  IN_PROGRESS: { label: 'In Bearbeitung', color: 'text-amber-700', bgColor: 'bg-amber-50 border-amber-200', icon: Clock },
  RESOLVED: { label: 'Gelöst', color: 'text-green-700', bgColor: 'bg-green-50 border-green-200', icon: CheckCircle },
  CLOSED: { label: 'Geschlossen', color: 'text-gray-700', bgColor: 'bg-gray-50 border-gray-200', icon: XCircle },
  WONT_FIX: { label: 'Wird nicht behoben', color: 'text-red-700', bgColor: 'bg-red-50 border-red-200', icon: XCircle },
};

const PRIORITY_CONFIG: Record<BugReportPriority, { label: string; color: string; dot: string }> = {
  LOW: { label: 'Niedrig', color: 'text-gray-600', dot: 'bg-gray-400' },
  MEDIUM: { label: 'Mittel', color: 'text-blue-600', dot: 'bg-blue-400' },
  HIGH: { label: 'Hoch', color: 'text-orange-600', dot: 'bg-orange-400' },
  CRITICAL: { label: 'Kritisch', color: 'text-red-600', dot: 'bg-red-500' },
};

const STATUS_FLOW: BugReportStatus[] = ['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'];

export default function SupportPage() {
  const [reports, setReports] = useState<BugReport[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [selected, setSelected] = useState<BugReport | null>(null);
  const [adminNotes, setAdminNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [screenshotFullscreen, setScreenshotFullscreen] = useState(false);
  const [logsExpanded, setLogsExpanded] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const fetchReports = useCallback(async () => {
    try {
      setLoading(true);
      setLoadError(null);
      const data = await getAdminBugReports(filterStatus);
      setReports(data.reports);
      setCounts(data.counts);
    } catch (err: any) {
      console.error('Failed to load bug reports:', err);
      setLoadError(err.message || 'Fehler beim Laden der Bug Reports');
    } finally {
      setLoading(false);
    }
  }, [filterStatus]);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  const handleStatusChange = async (report: BugReport, newStatus: BugReportStatus) => {
    setSaving(true);
    try {
      const updated = await updateAdminBugReport(report.id, { status: newStatus });
      setReports(prev => prev.map(r => r.id === updated.id ? updated : r));
      if (selected?.id === updated.id) setSelected(updated);
      // Update counts
      fetchReports();
    } catch (err) {
      console.error('Failed to update status:', err);
    } finally {
      setSaving(false);
    }
  };

  const handlePriorityChange = async (report: BugReport, newPriority: BugReportPriority) => {
    setSaving(true);
    try {
      const updated = await updateAdminBugReport(report.id, { priority: newPriority });
      setReports(prev => prev.map(r => r.id === updated.id ? updated : r));
      if (selected?.id === updated.id) setSelected(updated);
    } catch (err) {
      console.error('Failed to update priority:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveNotes = async () => {
    if (!selected) return;
    setSaving(true);
    try {
      const updated = await updateAdminBugReport(selected.id, { adminNotes });
      setReports(prev => prev.map(r => r.id === updated.id ? updated : r));
      setSelected(updated);
    } catch (err) {
      console.error('Failed to save notes:', err);
    } finally {
      setSaving(false);
    }
  };

  const openCount = (counts['OPEN'] || 0) + (counts['IN_PROGRESS'] || 0);
  const totalCount = Object.values(counts).reduce((a, b) => a + b, 0);

  return (
    <div className="p-6 max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Bug Reports</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {openCount} offen · {totalCount} gesamt
          </p>
        </div>
        <button
          onClick={fetchReports}
          className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-all"
          title="Aktualisieren"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Status Tabs / Pipeline */}
      <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-1">
        <button
          onClick={() => { setFilterStatus('ALL'); setSelected(null); }}
          className={`px-3 py-1.5 text-xs font-medium rounded-full border transition-all whitespace-nowrap ${
            filterStatus === 'ALL'
              ? 'bg-gray-900 text-white border-gray-900'
              : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
          }`}
        >
          Alle ({totalCount})
        </button>
        {STATUS_FLOW.map((status) => {
          const cfg = STATUS_CONFIG[status];
          return (
            <button
              key={status}
              onClick={() => { setFilterStatus(status); setSelected(null); }}
              className={`px-3 py-1.5 text-xs font-medium rounded-full border transition-all whitespace-nowrap flex items-center gap-1.5 ${
                filterStatus === status
                  ? `${cfg.bgColor} ${cfg.color} border-current`
                  : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
              }`}
            >
              <cfg.icon className="w-3 h-3" />
              {cfg.label} ({counts[status] || 0})
            </button>
          );
        })}
        <button
          onClick={() => { setFilterStatus('WONT_FIX'); setSelected(null); }}
          className={`px-3 py-1.5 text-xs font-medium rounded-full border transition-all whitespace-nowrap flex items-center gap-1.5 ${
            filterStatus === 'WONT_FIX'
              ? `${STATUS_CONFIG.WONT_FIX.bgColor} ${STATUS_CONFIG.WONT_FIX.color} border-current`
              : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
          }`}
        >
          <XCircle className="w-3 h-3" />
          Wird nicht behoben ({counts['WONT_FIX'] || 0})
        </button>
      </div>

      {loadError ? (
        <div className="bg-red-50 rounded-xl border border-red-200 p-16 text-center">
          <div className="w-16 h-16 bg-red-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="w-8 h-8 text-red-400" />
          </div>
          <h3 className="text-base font-semibold text-gray-900 mb-1">Fehler beim Laden</h3>
          <p className="text-sm text-red-600 max-w-sm mx-auto mb-4">{loadError}</p>
          <button onClick={fetchReports} className="text-sm text-blue-600 hover:underline">Erneut versuchen</button>
        </div>
      ) : loading && reports.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-16 text-center">
          <div className="w-8 h-8 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-sm text-gray-500">Lade Bug Reports...</p>
        </div>
      ) : reports.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-16 text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Bug className="w-8 h-8 text-gray-300" />
          </div>
          <h3 className="text-base font-semibold text-gray-900 mb-1">Keine Bug Reports</h3>
          <p className="text-sm text-gray-500 max-w-sm mx-auto">
            {filterStatus === 'ALL'
              ? 'Wenn Nutzer Bugs melden, erscheinen sie hier.'
              : `Keine Reports mit Status "${STATUS_CONFIG[filterStatus as BugReportStatus]?.label || filterStatus}".`}
          </p>
        </div>
      ) : (
        <div className="flex gap-6">
          {/* Report List */}
          <div className={`flex-1 min-w-0 space-y-2 ${selected ? 'hidden lg:block lg:max-w-[55%]' : ''}`}>
            {reports.map((report) => {
              const statusCfg = STATUS_CONFIG[report.status];
              const priorityCfg = PRIORITY_CONFIG[report.priority];
              const isSelected = selected?.id === report.id;

              return (
                <button
                  key={report.id}
                  onClick={() => { setSelected(report); setAdminNotes(report.adminNotes || ''); setLogsExpanded(false); setScreenshotFullscreen(false); }}
                  className={`w-full text-left p-4 rounded-xl border transition-all hover:shadow-sm ${
                    isSelected
                      ? 'border-blue-300 bg-blue-50/50 shadow-sm'
                      : 'border-gray-200 bg-white hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border ${statusCfg.bgColor} ${statusCfg.color}`}>
                          <statusCfg.icon className="w-2.5 h-2.5" />
                          {statusCfg.label}
                        </span>
                        <span className={`inline-flex items-center gap-1 text-[10px] font-medium ${priorityCfg.color}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${priorityCfg.dot}`} />
                          {priorityCfg.label}
                        </span>
                      </div>
                      <h3 className="text-sm font-semibold text-gray-900 truncate">{report.title}</h3>
                      <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{report.description}</p>
                      <div className="flex items-center gap-3 mt-2 text-[11px] text-gray-400">
                        <span>{report.userName || report.userEmail}</span>
                        <span>·</span>
                        <span>{report.tenantName}</span>
                        <span>·</span>
                        <span>{new Date(report.createdAt).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' })}</span>
                        {report.page && (
                          <>
                            <span>·</span>
                            <span className="truncate max-w-[140px]">{report.page}</span>
                          </>
                        )}
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-gray-300 shrink-0 mt-1" />
                  </div>
                </button>
              );
            })}
          </div>

          {/* Detail Panel */}
          {selected && (
            <div className="flex-1 min-w-0 lg:max-w-[45%]">
              <div className="bg-white rounded-xl border border-gray-200 sticky top-6">
                {/* Detail Header */}
                <div className="p-5 border-b border-gray-100">
                  <button
                    onClick={() => setSelected(null)}
                    className="text-xs text-gray-400 hover:text-gray-600 mb-2 lg:hidden"
                  >
                    ← Zurück zur Liste
                  </button>
                  <h2 className="text-base font-bold text-gray-900 mb-1">{selected.title}</h2>
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <span>{selected.userName || selected.userEmail}</span>
                    <span>·</span>
                    <span>{selected.tenantName}</span>
                    <span>·</span>
                    <span>{new Date(selected.createdAt).toLocaleDateString('de-DE', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                  {selected.page && (
                    <p className="text-xs text-gray-400 mt-1">Seite: {selected.page}</p>
                  )}
                </div>

                {/* Stage Pipeline Visual */}
                <div className="p-5 border-b border-gray-100">
                  <p className="text-xs font-medium text-gray-500 mb-3">Status-Pipeline</p>
                  <div className="flex items-center gap-1">
                    {STATUS_FLOW.map((status, i) => {
                      const cfg = STATUS_CONFIG[status];
                      const isActive = selected.status === status;
                      const isPast = STATUS_FLOW.indexOf(selected.status) > i;

                      return (
                        <div key={status} className="flex items-center gap-1 flex-1">
                          <button
                            onClick={() => handleStatusChange(selected, status)}
                            disabled={saving}
                            className={`flex-1 py-2 px-2 rounded-lg text-[11px] font-medium text-center transition-all border ${
                              isActive
                                ? `${cfg.bgColor} ${cfg.color} border-current shadow-sm`
                                : isPast
                                  ? 'bg-gray-100 text-gray-500 border-gray-200'
                                  : 'bg-white text-gray-400 border-gray-100 hover:border-gray-300 hover:text-gray-600'
                            }`}
                          >
                            {cfg.label}
                          </button>
                          {i < STATUS_FLOW.length - 1 && (
                            <ArrowRight className="w-3 h-3 text-gray-300 shrink-0" />
                          )}
                        </div>
                      );
                    })}
                  </div>
                  <button
                    onClick={() => handleStatusChange(selected, 'WONT_FIX')}
                    disabled={saving}
                    className={`mt-2 w-full py-1.5 rounded-lg text-[11px] font-medium text-center transition-all border ${
                      selected.status === 'WONT_FIX'
                        ? 'bg-red-50 text-red-700 border-red-200'
                        : 'bg-white text-gray-400 border-gray-100 hover:border-red-200 hover:text-red-500'
                    }`}
                  >
                    Wird nicht behoben
                  </button>
                </div>

                {/* Priority */}
                <div className="p-5 border-b border-gray-100">
                  <p className="text-xs font-medium text-gray-500 mb-2">Priorität</p>
                  <div className="flex gap-2">
                    {(Object.keys(PRIORITY_CONFIG) as BugReportPriority[]).map((p) => {
                      const cfg = PRIORITY_CONFIG[p];
                      const isActive = selected.priority === p;
                      return (
                        <button
                          key={p}
                          onClick={() => handlePriorityChange(selected, p)}
                          disabled={saving}
                          className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all flex items-center gap-1.5 ${
                            isActive
                              ? `${cfg.color} bg-white border-current shadow-sm`
                              : 'text-gray-400 border-gray-100 hover:border-gray-300'
                          }`}
                        >
                          <span className={`w-2 h-2 rounded-full ${cfg.dot}`} />
                          {cfg.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Description */}
                <div className="p-5 border-b border-gray-100">
                  <p className="text-xs font-medium text-gray-500 mb-2">Beschreibung</p>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{selected.description}</p>
                </div>

                {/* Screenshot */}
                {selected.screenshotUrl && (
                  <div className="p-5 border-b border-gray-100">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-xs font-medium text-gray-500 flex items-center gap-1.5">
                        <Camera className="w-3 h-3" />
                        Screenshot
                      </p>
                      <button
                        onClick={() => setScreenshotFullscreen(true)}
                        className="text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1"
                      >
                        <Maximize2 className="w-3 h-3" />
                        Vergrößern
                      </button>
                    </div>
                    <img
                      src={selected.screenshotUrl}
                      alt="Bug Screenshot"
                      className="w-full rounded-lg border border-gray-200 cursor-pointer hover:opacity-90 transition-opacity"
                      onClick={() => setScreenshotFullscreen(true)}
                    />
                  </div>
                )}

                {/* Screenshot Fullscreen Modal */}
                {screenshotFullscreen && selected.screenshotUrl && (
                  <div
                    className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center p-8"
                    onClick={() => setScreenshotFullscreen(false)}
                  >
                    <img
                      src={selected.screenshotUrl}
                      alt="Bug Screenshot"
                      className="max-w-full max-h-full rounded-lg shadow-2xl"
                    />
                    <button
                      onClick={() => setScreenshotFullscreen(false)}
                      className="absolute top-6 right-6 text-white/70 hover:text-white"
                    >
                      <XCircle className="w-8 h-8" />
                    </button>
                  </div>
                )}

                {/* Console Logs */}
                {selected.consoleLogs && (
                  <div className="p-5 border-b border-gray-100">
                    <button
                      onClick={() => setLogsExpanded(!logsExpanded)}
                      className="flex items-center justify-between w-full mb-2"
                    >
                      <p className="text-xs font-medium text-gray-500 flex items-center gap-1.5">
                        <Terminal className="w-3 h-3" />
                        Console-Logs
                        <span className="text-gray-400">
                          ({(() => { try { return JSON.parse(selected.consoleLogs!).length; } catch { return '?'; } })()})
                        </span>
                      </p>
                      <span className="text-[10px] text-gray-400">
                        {logsExpanded ? '▾ Ausblenden' : '▸ Anzeigen'}
                      </span>
                    </button>
                    {logsExpanded && (
                      <div className="bg-gray-900 rounded-lg p-3 max-h-60 overflow-y-auto">
                        {(() => {
                          try {
                            const logs = JSON.parse(selected.consoleLogs!);
                            return logs.map((log: any, i: number) => (
                              <div key={i} className={`text-[11px] font-mono leading-relaxed ${
                                log.level === 'error' ? 'text-red-400' : log.level === 'warn' ? 'text-amber-400' : 'text-gray-400'
                              }`}>
                                <span className="text-gray-600 mr-2">
                                  {new Date(log.timestamp).toLocaleTimeString('de-DE')}
                                </span>
                                <span className={`mr-1.5 ${
                                  log.level === 'error' ? 'text-red-500' : log.level === 'warn' ? 'text-amber-500' : 'text-gray-500'
                                }`}>
                                  [{log.level}]
                                </span>
                                <span className="break-all">{log.message}</span>
                              </div>
                            ));
                          } catch {
                            return <p className="text-xs text-gray-500">Logs konnten nicht gelesen werden.</p>;
                          }
                        })()}
                      </div>
                    )}
                  </div>
                )}

                {/* Admin Notes */}
                <div className="p-5">
                  <p className="text-xs font-medium text-gray-500 mb-2">Interne Notizen</p>
                  <textarea
                    rows={3}
                    value={adminNotes}
                    onChange={(e) => setAdminNotes(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                    placeholder="Notizen zum Bug (nur für Admins sichtbar)..."
                  />
                  <button
                    onClick={handleSaveNotes}
                    disabled={saving || adminNotes === (selected.adminNotes || '')}
                    className="mt-2 px-4 py-1.5 text-xs font-medium text-white bg-gray-900 rounded-lg hover:bg-gray-800 disabled:opacity-50 transition-colors"
                  >
                    {saving ? 'Speichern...' : 'Notizen speichern'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
