'use client';

import { useState, useEffect } from 'react';
import { ClipboardList, Search, AlertTriangle, Loader2, ChevronLeft, ChevronRight, Shield, Filter } from 'lucide-react';
import { getAdminAuditLogs, AuditLogEntry, AuditLogResponse } from '@/lib/adminApi';

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export default function AuditPage() {
  const [data, setData] = useState<AuditLogResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [flaggedOnly, setFlaggedOnly] = useState(false);
  const [selectedLog, setSelectedLog] = useState<AuditLogEntry | null>(null);

  const loadLogs = (p: number, flagged: boolean) => {
    setLoading(true);
    getAdminAuditLogs(p, flagged)
      .then(setData)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadLogs(page, flaggedOnly); }, [page, flaggedOnly]);

  return (
    <div className="p-6 max-w-[1600px] mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Audit Log</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {data ? `${data.total} Einträge` : 'KI-Interaktionen & Sicherheits-Events'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => { setFlaggedOnly(!flaggedOnly); setPage(1); }}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
              flaggedOnly ? 'bg-red-50 text-red-700 border-red-200' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
            }`}
          >
            <Shield className="w-3.5 h-3.5" />
            {flaggedOnly ? 'Nur Flagged' : 'Alle Logs'}
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">{error}</div>
      )}

      {loading && !data ? (
        <div className="flex items-center justify-center h-48">
          <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
        </div>
      ) : data && data.logs.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <ClipboardList className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-sm text-gray-500">Noch keine Audit-Logs vorhanden</p>
          <p className="text-xs text-gray-400 mt-1">Logs werden automatisch bei KI-Interaktionen erstellt</p>
        </div>
      ) : data ? (
        <>
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left px-4 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Zeitpunkt</th>
                  <th className="text-left px-4 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">User</th>
                  <th className="text-left px-4 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Tenant</th>
                  <th className="text-left px-4 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Endpoint</th>
                  <th className="text-left px-4 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Nachricht</th>
                  <th className="text-center px-4 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Flag</th>
                </tr>
              </thead>
              <tbody>
                {data.logs.map((log) => (
                  <tr 
                    key={log.id} 
                    onClick={() => setSelectedLog(selectedLog?.id === log.id ? null : log)}
                    className={`border-b border-gray-50 last:border-0 hover:bg-gray-50/50 transition-colors cursor-pointer ${log.flagged ? 'bg-red-50/30' : ''}`}
                  >
                    <td className="px-4 py-3">
                      <span className="text-xs text-gray-500 font-mono">{formatDate(log.createdAt)}</span>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-xs text-gray-700">{log.userName || log.userEmail}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs text-gray-500">{log.tenantName}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-[10px] font-mono text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">{log.endpoint}</span>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-xs text-gray-600 truncate max-w-xs">{log.message}</p>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {log.flagged && (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-medium bg-red-100 text-red-700 rounded">
                          <AlertTriangle className="w-3 h-3" />
                          {log.flagReason || 'flagged'}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
              </table>
            </div>
          </div>

          {/* Detail Panel */}
          {selectedLog && (
            <div className="mt-4 bg-white rounded-xl border border-gray-200 p-4">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Log Detail</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                <div>
                  <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">User</p>
                  <p className="text-xs text-gray-700">{selectedLog.userEmail}</p>
                </div>
                <div>
                  <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">Endpoint</p>
                  <p className="text-xs font-mono text-gray-700">{selectedLog.endpoint}</p>
                </div>
              </div>
              <div className="mb-3">
                <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">Nachricht</p>
                <p className="text-xs text-gray-700 bg-gray-50 rounded-lg p-3 whitespace-pre-wrap">{selectedLog.message}</p>
              </div>
              {selectedLog.response && (
                <div>
                  <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">Antwort</p>
                  <p className="text-xs text-gray-700 bg-gray-50 rounded-lg p-3 whitespace-pre-wrap">{selectedLog.response}</p>
                </div>
              )}
            </div>
          )}

          {/* Pagination */}
          {data.pages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <p className="text-xs text-gray-500">Seite {data.page} von {data.pages}</p>
              <div className="flex gap-1">
                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1} className="p-1.5 rounded-md border border-gray-200 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed">
                  <ChevronLeft className="w-4 h-4 text-gray-600" />
                </button>
                <button onClick={() => setPage(p => Math.min(data.pages, p + 1))} disabled={page >= data.pages} className="p-1.5 rounded-md border border-gray-200 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed">
                  <ChevronRight className="w-4 h-4 text-gray-600" />
                </button>
              </div>
            </div>
          )}
        </>
      ) : null}
    </div>
  );
}
