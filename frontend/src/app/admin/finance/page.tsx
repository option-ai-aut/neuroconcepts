'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  DollarSign, Cpu, Cloud, Users, TrendingDown, Loader2, RefreshCw,
  AlertTriangle, Zap, Brain, Server, ArrowDownRight, ArrowUpRight, BarChart3
} from 'lucide-react';
import {
  getFinanceSummary, getAiCosts, getAwsCosts, getCostPerLead, getAiPricing,
  FinanceSummary, AiCostByModel, AiCostByDay, AiCostByEndpoint, AwsCostData, CostPerLead
} from '@/lib/adminApi';

// Recharts (lazy to avoid SSR issues)
import dynamic from 'next/dynamic';
const ResponsiveContainer = dynamic(() => import('recharts').then(m => m.ResponsiveContainer), { ssr: false });
const AreaChart = dynamic(() => import('recharts').then(m => m.AreaChart), { ssr: false });
const Area = dynamic(() => import('recharts').then(m => m.Area), { ssr: false });
const BarChart = dynamic(() => import('recharts').then(m => m.BarChart), { ssr: false });
const Bar = dynamic(() => import('recharts').then(m => m.Bar), { ssr: false });
const XAxis = dynamic(() => import('recharts').then(m => m.XAxis), { ssr: false });
const YAxis = dynamic(() => import('recharts').then(m => m.YAxis), { ssr: false });
const CartesianGrid = dynamic(() => import('recharts').then(m => m.CartesianGrid), { ssr: false });
const Tooltip = dynamic(() => import('recharts').then(m => m.Tooltip), { ssr: false });
const Legend = dynamic(() => import('recharts').then(m => m.Legend), { ssr: false });

// AWS Service friendly names
const AWS_SERVICE_LABELS: Record<string, string> = {
  'AWS Lambda': 'Lambda',
  'Amazon API Gateway': 'API Gateway',
  'Amazon Simple Storage Service': 'S3',
  'Amazon Relational Database Service': 'RDS/Aurora',
  'Amazon Cognito': 'Cognito',
  'Amazon Virtual Private Cloud': 'VPC/NAT',
  'AWS Secrets Manager': 'Secrets Manager',
  'Amazon Simple Email Service': 'SES',
  'Amazon CloudWatch': 'CloudWatch',
  'AWS Key Management Service': 'KMS',
  'Amazon EventBridge': 'EventBridge',
  'Amazon Route 53': 'Route 53',
  'AWS Certificate Manager': 'ACM',
};

function formatCents(cents: number): string {
  if (cents >= 100) return `$${(cents / 100).toFixed(2)}`;
  if (cents >= 1) return `${cents.toFixed(1)}¢`;
  if (cents >= 0.01) return `${cents.toFixed(2)}¢`;
  return `${cents.toFixed(3)}¢`;
}

function formatUsd(usd: number): string {
  if (usd >= 1) return `$${usd.toFixed(2)}`;
  return `${(usd * 100).toFixed(2)}¢`;
}

function formatTokens(tokens: number): string {
  if (tokens >= 1_000_000) return `${(tokens / 1_000_000).toFixed(1)}M`;
  if (tokens >= 1_000) return `${(tokens / 1_000).toFixed(1)}K`;
  return String(tokens);
}

// Endpoint labels
const ENDPOINT_LABELS: Record<string, string> = {
  'chat': 'Jarvis Chat',
  'chat-stream': 'Jarvis Chat (Stream)',
  'email-parse': 'Email Parsing',
  'email-response': 'Email Analyse',
  'memory': 'Gesprächs-Gedächtnis',
  'expose': 'Exposé Chat',
  'virtual-staging': 'Virtual Staging',
  'signature': 'E-Mail Signatur',
  'team-chat': 'Team Chat',
};

type Tab = 'overview' | 'ai' | 'aws' | 'leads';

export default function FinancePage() {
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [summary, setSummary] = useState<FinanceSummary | null>(null);
  const [aiByModel, setAiByModel] = useState<AiCostByModel[]>([]);
  const [aiByDay, setAiByDay] = useState<AiCostByDay[]>([]);
  const [aiByEndpoint, setAiByEndpoint] = useState<AiCostByEndpoint[]>([]);
  const [awsCosts, setAwsCosts] = useState<AwsCostData | null>(null);
  const [costPerLead, setCostPerLead] = useState<CostPerLead | null>(null);
  const [pricing, setPricing] = useState<Record<string, { input: number; output: number }>>({});
  const [error, setError] = useState<string | null>(null);

  // Date range: current month
  const now = new Date();
  const fromStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
  const toDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  const toStr = `${toDate.getFullYear()}-${String(toDate.getMonth() + 1).padStart(2, '0')}-${String(toDate.getDate()).padStart(2, '0')}`;

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [summaryRes, modelRes, dayRes, endpointRes, awsRes, leadRes, pricingRes] = await Promise.allSettled([
        getFinanceSummary(fromStr, toStr),
        getAiCosts('model', fromStr, toStr),
        getAiCosts('day', fromStr, toStr),
        getAiCosts('endpoint', fromStr, toStr),
        getAwsCosts('DAILY', fromStr, toStr),
        getCostPerLead(fromStr, toStr),
        getAiPricing(),
      ]);

      if (summaryRes.status === 'fulfilled') setSummary(summaryRes.value);
      if (modelRes.status === 'fulfilled') setAiByModel(modelRes.value.data as AiCostByModel[]);
      if (dayRes.status === 'fulfilled') setAiByDay(dayRes.value.data as AiCostByDay[]);
      if (endpointRes.status === 'fulfilled') setAiByEndpoint(endpointRes.value.data as AiCostByEndpoint[]);
      if (awsRes.status === 'fulfilled') setAwsCosts(awsRes.value);
      if (leadRes.status === 'fulfilled') setCostPerLead(leadRes.value);
      if (pricingRes.status === 'fulfilled') setPricing(pricingRes.value.pricing);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  // Aggregate daily AI costs for chart
  const dailyChartData = useMemo(() => {
    const byDate: Record<string, { date: string; openai: number; gemini: number; total: number }> = {};
    for (const d of aiByDay) {
      if (!byDate[d.date]) byDate[d.date] = { date: d.date, openai: 0, gemini: 0, total: 0 };
      const cents = d.totalCostCents;
      if (d.provider === 'openai') byDate[d.date].openai += cents;
      else byDate[d.date].gemini += cents;
      byDate[d.date].total += cents;
    }
    return Object.values(byDate).sort((a, b) => a.date.localeCompare(b.date));
  }, [aiByDay]);

  // AWS service breakdown for chart
  const awsServiceData = useMemo(() => {
    if (!awsCosts?.serviceBreakdown) return [];
    return Object.entries(awsCosts.serviceBreakdown)
      .filter(([, v]) => v > 0.5) // Only show services costing > 0.5 cents
      .sort(([, a], [, b]) => b - a)
      .map(([name, cents]) => ({
        name: AWS_SERVICE_LABELS[name] || name.replace('Amazon ', '').replace('AWS ', ''),
        cents,
      }));
  }, [awsCosts]);

  if (loading) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>;
  }

  const tabs: { id: Tab; label: string; icon: any }[] = [
    { id: 'overview', label: 'Übersicht', icon: BarChart3 },
    { id: 'ai', label: 'KI-Kosten', icon: Brain },
    { id: 'aws', label: 'AWS-Kosten', icon: Cloud },
    { id: 'leads', label: 'Kosten/Lead', icon: TrendingDown },
  ];

  return (
    <div className="p-6 max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Technische Kosten</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            AWS + KI-Kosten in Echtzeit — {new Date(fromStr).toLocaleDateString('de-DE', { month: 'long', year: 'numeric' })}
          </p>
        </div>
        <button
          onClick={loadData}
          className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Aktualisieren
        </button>
      </div>

      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4" />
          {error}
        </div>
      )}

      {/* Tab Navigation */}
      <div className="flex gap-1 mb-6 bg-gray-100 rounded-lg p-1">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              activeTab === tab.id
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <tab.icon className="w-3.5 h-3.5" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* =========== OVERVIEW TAB =========== */}
      {activeTab === 'overview' && summary && (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <KpiCard
              label="Gesamtkosten"
              value={formatUsd(summary.totalCostUsd)}
              desc="AWS + KI diesen Monat"
              icon={DollarSign}
              trend={null}
            />
            <KpiCard
              label="AWS-Kosten"
              value={formatUsd(summary.aws.totalCents / 100)}
              desc={summary.aws.error ? '24h Verzögerung' : `${Object.keys(summary.aws.byService).length} Services`}
              icon={Cloud}
              trend={null}
            />
            <KpiCard
              label="KI-Kosten"
              value={formatUsd(summary.ai.totalCostUsd)}
              desc={`${summary.ai.totalCalls.toLocaleString('de-DE')} API-Aufrufe`}
              icon={Brain}
              trend={null}
            />
            <KpiCard
              label="Kosten/Lead"
              value={summary.leads.total > 0 ? formatCents(summary.leads.costPerLeadCents) : '—'}
              desc={`${summary.leads.total} Leads diesen Monat`}
              icon={TrendingDown}
              trend={null}
            />
          </div>

          {/* Daily Cost Trend Chart */}
          {dailyChartData.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6">
              <h2 className="text-sm font-semibold text-gray-900 mb-3">Tägliche KI-Kosten</h2>
              <div className="h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={dailyChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis 
                      dataKey="date" 
                      tick={{ fontSize: 10, fill: '#9ca3af' }}
                      tickFormatter={(v: string) => new Date(v).getDate().toString()}
                    />
                    <YAxis 
                      tick={{ fontSize: 10, fill: '#9ca3af' }}
                      tickFormatter={(v: number) => formatCents(v)}
                    />
                    <Tooltip 
                      formatter={(value: any, name: any) => [formatCents(Number(value)), name === 'openai' ? 'OpenAI' : name === 'gemini' ? 'Gemini' : 'Gesamt']}
                      labelFormatter={(label: any) => new Date(String(label)).toLocaleDateString('de-DE')}
                    />
                    <Area type="monotone" dataKey="openai" stackId="1" stroke="#6366f1" fill="#6366f1" fillOpacity={0.3} name="openai" />
                    <Area type="monotone" dataKey="gemini" stackId="1" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.3} name="gemini" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Provider Split */}
          {summary.ai.byProvider.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              {summary.ai.byProvider.map(p => (
                <div key={p.provider} className="bg-white rounded-xl border border-gray-200 p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div className={`w-2.5 h-2.5 rounded-full ${p.provider === 'openai' ? 'bg-indigo-500' : 'bg-amber-500'}`} />
                    <span className="text-sm font-medium text-gray-900">{p.provider === 'openai' ? 'OpenAI' : 'Google Gemini'}</span>
                  </div>
                  <p className="text-2xl font-bold text-gray-900">{formatCents(p.costCents)}</p>
                  <p className="text-xs text-gray-500 mt-1">{p.calls.toLocaleString('de-DE')} Aufrufe</p>
                </div>
              ))}
            </div>
          )}

          {/* No data state */}
          {!summary.ai.totalCalls && !summary.aws.totalCents && (
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-8 text-center">
              <Zap className="w-8 h-8 text-gray-300 mx-auto mb-3" />
              <p className="text-sm text-gray-500">Noch keine Kostendaten vorhanden.</p>
              <p className="text-xs text-gray-400 mt-1">Sobald KI-Aufrufe oder AWS-Services genutzt werden, erscheinen hier die Kosten.</p>
            </div>
          )}
        </>
      )}

      {/* =========== AI COSTS TAB =========== */}
      {activeTab === 'ai' && (
        <>
          {/* By Model */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden mb-6">
            <div className="px-4 py-3 border-b border-gray-100">
              <h2 className="text-sm font-semibold text-gray-900">Kosten nach Modell</h2>
            </div>
            {aiByModel.length === 0 ? (
              <div className="p-8 text-center text-gray-400 text-sm">Keine Daten</div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left px-4 py-2.5 text-[11px] font-semibold text-gray-500 uppercase">Modell</th>
                    <th className="text-left px-4 py-2.5 text-[11px] font-semibold text-gray-500 uppercase">Provider</th>
                    <th className="text-right px-4 py-2.5 text-[11px] font-semibold text-gray-500 uppercase">Kosten</th>
                    <th className="text-right px-4 py-2.5 text-[11px] font-semibold text-gray-500 uppercase">Aufrufe</th>
                    <th className="text-right px-4 py-2.5 text-[11px] font-semibold text-gray-500 uppercase">Input Tokens</th>
                    <th className="text-right px-4 py-2.5 text-[11px] font-semibold text-gray-500 uppercase">Output Tokens</th>
                    <th className="text-right px-4 py-2.5 text-[11px] font-semibold text-gray-500 uppercase">Ø/Aufruf</th>
                  </tr>
                </thead>
                <tbody>
                  {aiByModel.map((m, i) => (
                    <tr key={i} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50">
                      <td className="px-4 py-3">
                        <span className="text-sm font-medium text-gray-900 font-mono">{m.model}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-medium px-2 py-0.5 rounded ${
                          m.provider === 'openai' ? 'bg-indigo-50 text-indigo-700' : 'bg-amber-50 text-amber-700'
                        }`}>
                          {m.provider === 'openai' ? 'OpenAI' : 'Gemini'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right text-sm font-semibold text-gray-900">{formatCents(m.totalCostCents)}</td>
                      <td className="px-4 py-3 text-right text-xs text-gray-600">{m.totalCalls.toLocaleString('de-DE')}</td>
                      <td className="px-4 py-3 text-right text-xs text-gray-600 font-mono">{formatTokens(m.totalInputTokens)}</td>
                      <td className="px-4 py-3 text-right text-xs text-gray-600 font-mono">{formatTokens(m.totalOutputTokens)}</td>
                      <td className="px-4 py-3 text-right text-xs text-gray-500">{formatCents(m.avgCostPerCall)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* By Endpoint */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden mb-6">
            <div className="px-4 py-3 border-b border-gray-100">
              <h2 className="text-sm font-semibold text-gray-900">Kosten nach Funktion</h2>
            </div>
            {aiByEndpoint.length === 0 ? (
              <div className="p-8 text-center text-gray-400 text-sm">Keine Daten</div>
            ) : (
              <div className="divide-y divide-gray-50">
                {aiByEndpoint.map((e, i) => (
                  <div key={i} className="flex items-center justify-between px-4 py-3 hover:bg-gray-50/50">
                    <div className="flex items-center gap-3">
                      <Zap className="w-4 h-4 text-gray-400" />
                      <div>
                        <p className="text-sm font-medium text-gray-900">{ENDPOINT_LABELS[e.endpoint] || e.endpoint}</p>
                        <p className="text-[10px] text-gray-400">{e.totalCalls} Aufrufe · Ø {formatCents(e.avgCostPerCall)}/Aufruf</p>
                      </div>
                    </div>
                    <p className="text-sm font-semibold text-gray-900">{formatCents(e.totalCostCents)}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Pricing Table */}
          {Object.keys(pricing).length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-100">
                <h2 className="text-sm font-semibold text-gray-900">Aktuelle Preistabelle</h2>
                <p className="text-[10px] text-gray-400 mt-0.5">Preise pro 1M Tokens in USD</p>
              </div>
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left px-4 py-2 text-[11px] font-semibold text-gray-500 uppercase">Modell</th>
                    <th className="text-right px-4 py-2 text-[11px] font-semibold text-gray-500 uppercase">Input/1M</th>
                    <th className="text-right px-4 py-2 text-[11px] font-semibold text-gray-500 uppercase">Output/1M</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(pricing).map(([model, p]) => (
                    <tr key={model} className="border-b border-gray-50 last:border-0">
                      <td className="px-4 py-2 text-sm font-mono text-gray-700">{model}</td>
                      <td className="px-4 py-2 text-right text-xs text-gray-600">${p.input.toFixed(2)}</td>
                      <td className="px-4 py-2 text-right text-xs text-gray-600">${p.output.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* =========== AWS COSTS TAB =========== */}
      {activeTab === 'aws' && (
        <>
          {(awsCosts as any)?.error || !awsCosts ? (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3 mb-6">
              <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-medium text-amber-800">AWS Cost Explorer</p>
                <p className="text-[10px] text-amber-600 mt-0.5">
                  {(awsCosts as any)?.error || 'Daten werden nach dem Deployment mit IAM-Berechtigung verfügbar sein (24h Verzögerung).'}
                </p>
              </div>
            </div>
          ) : (
            <>
              <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6">
                <div className="flex items-center justify-between mb-1">
                  <h2 className="text-sm font-semibold text-gray-900">AWS Gesamtkosten</h2>
                  <span className="text-[10px] text-gray-400">Daten mit ~24h Verzögerung</span>
                </div>
                <p className="text-3xl font-bold text-gray-900">{formatUsd(awsCosts.totalCostUsd)}</p>
              </div>

              {/* Service Breakdown */}
              {awsServiceData.length > 0 && (
                <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6">
                  <h2 className="text-sm font-semibold text-gray-900 mb-3">Kosten nach Service</h2>
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={awsServiceData} layout="vertical" margin={{ left: 80 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis type="number" tick={{ fontSize: 10, fill: '#9ca3af' }} tickFormatter={(v: number) => formatCents(v)} />
                        <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: '#6b7280' }} width={80} />
                        <Tooltip formatter={(value: any) => [formatCents(Number(value)), 'Kosten']} />
                        <Bar dataKey="cents" fill="#6366f1" radius={[0, 4, 4, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}

              {/* Service Table */}
              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-100">
                  <h2 className="text-sm font-semibold text-gray-900">Alle Services</h2>
                </div>
                <div className="divide-y divide-gray-50">
                  {awsServiceData.map((s, i) => (
                    <div key={i} className="flex items-center justify-between px-4 py-3 hover:bg-gray-50/50">
                      <div className="flex items-center gap-3">
                        <Server className="w-4 h-4 text-gray-400" />
                        <span className="text-sm text-gray-700">{s.name}</span>
                      </div>
                      <span className="text-sm font-semibold text-gray-900">{formatCents(s.cents)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </>
      )}

      {/* =========== COST PER LEAD TAB =========== */}
      {activeTab === 'leads' && (
        <>
          {costPerLead && (
            <>
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                <KpiCard
                  label="KI-Kosten/Lead"
                  value={costPerLead.totalLeads > 0 ? formatCents(costPerLead.costPerLeadCents) : '—'}
                  desc={`${costPerLead.totalLeads} Leads · ${formatCents(costPerLead.aiCostCents)} KI-Kosten`}
                  icon={TrendingDown}
                  trend={null}
                />
                <KpiCard
                  label="Leads diesen Monat"
                  value={costPerLead.totalLeads.toString()}
                  desc="Aus allen Quellen"
                  icon={Users}
                  trend={null}
                />
                <KpiCard
                  label="KI-Kosten gesamt"
                  value={formatCents(costPerLead.aiCostCents)}
                  desc="Nur KI (AWS separat)"
                  icon={Brain}
                  trend={null}
                />
              </div>

              {/* Daily Trend */}
              {costPerLead.dailyTrend.length > 0 && (
                <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6">
                  <h2 className="text-sm font-semibold text-gray-900 mb-1">Kosten pro Lead — Tagestrend</h2>
                  <p className="text-[10px] text-gray-400 mb-3">Je mehr Leads, desto guenstiger wird jeder einzelne (Fixkosten verteilen sich)</p>
                  <div className="h-[250px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={costPerLead.dailyTrend.filter(d => d.leads > 0)}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis
                          dataKey="date"
                          tick={{ fontSize: 10, fill: '#9ca3af' }}
                          tickFormatter={(v: string) => new Date(v).getDate().toString()}
                        />
                        <YAxis
                          tick={{ fontSize: 10, fill: '#9ca3af' }}
                          tickFormatter={(v: number) => formatCents(v)}
                        />
                        <Tooltip
                          formatter={(value: any, name: any) => [
                            name === 'costPerLeadCents' ? formatCents(Number(value)) : value,
                            name === 'costPerLeadCents' ? 'Kosten/Lead' : name === 'leads' ? 'Leads' : name
                          ]}
                          labelFormatter={(label: any) => new Date(String(label)).toLocaleDateString('de-DE')}
                        />
                        <Area type="monotone" dataKey="costPerLeadCents" stroke="#10b981" fill="#10b981" fillOpacity={0.2} name="costPerLeadCents" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}

              {/* Info Box */}
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-start gap-3">
                <TrendingDown className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-medium text-blue-800">Kosten pro Lead sinken ueber die Zeit</p>
                  <p className="text-[10px] text-blue-600 mt-0.5">
                    AWS-Fixkosten (RDS, NAT Gateway, etc.) verteilen sich auf mehr Leads. Die KI-Kosten pro Lead bleiben relativ konstant (pro Email-Parsing + Jarvis-Interaktion), aber der AWS-Anteil sinkt mit jedem neuen Lead.
                  </p>
                </div>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}

function KpiCard({ label, value, desc, icon: Icon, trend }: {
  label: string;
  value: string;
  desc: string;
  icon: any;
  trend: 'up' | 'down' | null;
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <div className="flex items-center justify-between mb-2">
        <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">
          <Icon className="w-4 h-4 text-gray-500" />
        </div>
        {trend && (
          <div className={`flex items-center gap-0.5 text-[10px] font-medium ${
            trend === 'down' ? 'text-emerald-600' : 'text-red-600'
          }`}>
            {trend === 'down' ? <ArrowDownRight className="w-3 h-3" /> : <ArrowUpRight className="w-3 h-3" />}
          </div>
        )}
      </div>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      <p className="text-xs text-gray-500 mt-0.5">{label}</p>
      <p className="text-[10px] text-gray-400 mt-1">{desc}</p>
    </div>
  );
}
