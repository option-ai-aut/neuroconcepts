'use client';

import { useState, useEffect } from 'react';
import { Globe, Check, RefreshCw, ExternalLink, Eye, EyeOff, TestTube, Building2, User, Lock } from 'lucide-react';
import { getRuntimeConfig } from '@/components/EnvProvider';
import useSWR from 'swr';
import { getMe, getAuthHeaders } from '@/lib/api';

interface Portal {
  id: string;
  name: string;
  slug: string;
  country: string;
  websiteUrl: string | null;
  connectionType: string;
  isPremium: boolean;
  defaultFtpHost: string | null;
}

interface PortalConnection {
  id: string;
  portalId: string;
  portal: Portal;
  ftpHost: string | null;
  ftpPort: number;
  ftpUsername: string | null;
  ftpPassword: string | null;
  ftpPath: string | null;
  useSftp: boolean;
  providerId: string | null;
  isEnabled: boolean;
  lastSyncAt: string | null;
  lastSyncStatus: string | null;
  autoSyncEnabled: boolean;
  autoSyncInterval: number;
  userId: string | null;
  tenantId: string | null;
  // API-specific fields
  apiKey?: string | null;
  apiSecret?: string | null;
  apiEndpoint?: string | null;
}

const COUNTRY_LABELS: Record<string, string> = {
  DE: 'Deutschland',
  AT: 'Österreich',
  CH: 'Schweiz'
};

const COUNTRY_FLAGS: Record<string, string> = {
  DE: '🇩🇪',
  AT: '🇦🇹',
  CH: '🇨🇭'
};

// Per-portal configuration: subtitle, hint, placeholders, labels, help
interface PortalConfig {
  subtitle: string;               // Shown under portal name
  hint: string;                   // Help text inside edit form
  ftpHostPlaceholder?: string;    // FTP host placeholder
  providerLabel: string;          // Label for provider ID field
  providerPlaceholder?: string;   // Placeholder for provider ID field
  helpUrl?: string;               // Link to portal docs/help
  apiKeyLabel?: string;           // Label for API key (REST_API only)
  apiKeyPlaceholder?: string;     // Placeholder for API key
  apiSecretLabel?: string;        // Label for API secret (REST_API only)
}

const PORTAL_CONFIG: Record<string, PortalConfig> = {
  // ─── Deutschland (13) ────────────────────────────────────────
  'immoscout24-de': {
    subtitle: 'Deutschlands größtes Immobilienportal',
    hint: 'Zugangsdaten findest du im ImmobilienScout24 Partner-Portal unter „Verwalten" → „Schnittstellen / API-Zugang". Es fallen ggf. Nutzungsgebühren seitens ImmoScout24 an.',
    providerLabel: 'Anbieternummer',
    providerPlaceholder: 'Deine IS24 Anbieternummer',
    helpUrl: 'https://api.immobilienscout24.de',
    apiKeyLabel: 'API Key (Consumer Key)',
    apiKeyPlaceholder: 'z.B. IhrConsumerKey12345',
    apiSecretLabel: 'API Secret (Consumer Secret)',
  },
  'immowelt': {
    subtitle: 'Eines der größten Portale in DE/AT',
    hint: 'Die FTP-Zugangsdaten erhältst du im Immowelt-Kundencenter unter „Schnittstellen". Der Standard-FTP-Host ist ftp2.immowelt.net.',
    ftpHostPlaceholder: 'ftp2.immowelt.net',
    providerLabel: 'Kundennummer',
    providerPlaceholder: 'Deine Immowelt-Kundennummer',
    helpUrl: 'https://support.immowelt.de',
  },
  'immonet': {
    subtitle: 'Teil der Immowelt-Gruppe',
    hint: 'Immonet gehört zur Immowelt-Gruppe. FTP-Host: ftp.immonet.de. Benutzername = deine AnbieterID (nicht die Immonet-Kundennummer).',
    ftpHostPlaceholder: 'ftp.immonet.de',
    providerLabel: 'AnbieterID',
    providerPlaceholder: 'Deine Immonet AnbieterID',
  },
  'kleinanzeigen': {
    subtitle: 'Ehem. eBay Kleinanzeigen — großes Publikum',
    hint: 'FTP-Zugangsdaten werden dir nach Abschluss eines gewerblichen Immobilien-Pakets per E-Mail zugesandt. Bei Fragen: Support unter „Meins" → „Kundensupport" kontaktieren.',
    ftpHostPlaceholder: 'Wird per E-Mail mitgeteilt',
    providerLabel: 'Anbieternummer',
    providerPlaceholder: 'Deine Kleinanzeigen-Anbieternummer',
    helpUrl: 'https://themen.kleinanzeigen.de/hilfe-gewerblich/immobilien/',
  },
  'kalaydo': {
    subtitle: 'Regionaler Marktplatz für Rheinland & Ruhrgebiet',
    hint: 'Zugangsdaten erhältst du nach der gewerblichen Registrierung beim Kalaydo-Kundenservice. OpenImmo-Export aus deiner Maklersoftware einrichten.',
    ftpHostPlaceholder: 'Vom Kalaydo-Kundenservice',
    providerLabel: 'Kundennummer',
    providerPlaceholder: 'Deine Kalaydo-Kundennummer',
    helpUrl: 'https://www.kalaydo.de',
  },
  'immozentral': {
    subtitle: 'Portal für den deutschsprachigen Raum',
    hint: 'Nach der Registrierung als gewerblicher Anbieter erhältst du die FTP-Zugangsdaten per E-Mail.',
    ftpHostPlaceholder: 'Wird nach Registrierung mitgeteilt',
    providerLabel: 'Anbieternummer',
    providerPlaceholder: 'Deine Immozentral-Anbieternummer',
    helpUrl: 'https://www.immozentral.com',
  },
  'immopool': {
    subtitle: 'Weitere Reichweite für deine Objekte',
    hint: 'Die FTP-Zugangsdaten erhältst du nach der gewerblichen Registrierung direkt von Immopool.',
    ftpHostPlaceholder: 'Wird nach Registrierung mitgeteilt',
    providerLabel: 'Anbieternummer',
    providerPlaceholder: 'Deine Immopool-Anbieternummer',
    helpUrl: 'https://www.immopool.de',
  },
  '1a-immobilien': {
    subtitle: 'Zusätzliche Sichtbarkeit im Netz',
    hint: 'Zugangsdaten erhältst du nach der Registrierung als gewerblicher Inserent bei 1A-Immobilienmarkt.',
    ftpHostPlaceholder: 'Wird nach Registrierung mitgeteilt',
    providerLabel: 'Anbieternummer',
    providerPlaceholder: 'Deine Anbieternummer',
    helpUrl: 'https://www.1a-immobilienmarkt.de',
  },
  'ivd24': {
    subtitle: 'Exklusiv für IVD-Mitglieder',
    hint: 'Zugang nur für Mitglieder des Immobilienverband Deutschland (IVD). Zugangsdaten über die IVD-Mitgliederverwaltung.',
    ftpHostPlaceholder: 'Über IVD-Mitgliederverwaltung',
    providerLabel: 'IVD-Mitgliedsnummer',
    providerPlaceholder: 'Deine IVD-Mitgliedsnummer',
    helpUrl: 'https://www.ivd24immobilien.de',
  },
  'neubau-kompass': {
    subtitle: 'Spezialist für Neubau-Projekte',
    hint: 'Für Bauträger und Projektentwickler. Zugangsdaten nach Registrierung über den Neubau Kompass Kundenservice.',
    ftpHostPlaceholder: 'Vom Neubau Kompass Support',
    providerLabel: 'Kundennummer',
    providerPlaceholder: 'Deine Neubau Kompass Kundennr.',
    helpUrl: 'https://www.neubaukompass.de',
  },
  'sz-immo': {
    subtitle: 'Immobilienmarkt der Süddeutschen Zeitung',
    hint: 'Premium-Reichweite über die Süddeutsche Zeitung. Zugangsdaten über den SZ-Anzeigenservice oder deine Maklersoftware.',
    ftpHostPlaceholder: 'Vom SZ-Anzeigenservice',
    providerLabel: 'Kundennummer',
    providerPlaceholder: 'Deine SZ-Kundennummer',
    helpUrl: 'https://immobilienmarkt.sueddeutsche.de',
  },
  'faz-immo': {
    subtitle: 'Immobilienmarkt der Frankfurter Allgemeinen',
    hint: 'Premium-Reichweite über die FAZ. Zugangsdaten über den FAZ-Anzeigenservice oder deine Maklersoftware.',
    ftpHostPlaceholder: 'Vom FAZ-Anzeigenservice',
    providerLabel: 'Kundennummer',
    providerPlaceholder: 'Deine FAZ-Kundennummer',
    helpUrl: 'https://fazimmo.faz.net',
  },
  'welt-immo': {
    subtitle: 'Immobilienmarkt von WELT (Axel Springer)',
    hint: 'Premium-Reichweite über WELT/Axel Springer. Zugangsdaten über den WELT-Anzeigenservice oder deine Maklersoftware.',
    ftpHostPlaceholder: 'Vom WELT-Anzeigenservice',
    providerLabel: 'Kundennummer',
    providerPlaceholder: 'Deine WELT-Kundennummer',
  },

  // ─── Österreich (5) ──────────────────────────────────────────
  'willhaben': {
    subtitle: 'Österreichs größte Anzeigenplattform',
    hint: 'FTP-Zugangsdaten erhältst du über deinen Willhaben-Kundenbetreuer. OpenImmo-Export in deiner Maklersoftware einrichten.',
    ftpHostPlaceholder: 'Vom Willhaben-Kundenbetreuer',
    providerLabel: 'Kundennummer',
    providerPlaceholder: 'Deine Willhaben-Kundennummer',
    helpUrl: 'https://www.willhaben.at',
  },
  'immoscout24-at': {
    subtitle: 'ImmobilienScout24 für Österreich',
    hint: 'FTP-Zugangsdaten erhältst du nach der gewerblichen Registrierung bei ImmoScout24 AT. Achtung: Die REST-API ist nur für die DE-Version verfügbar.',
    ftpHostPlaceholder: 'Wird nach Registrierung mitgeteilt',
    providerLabel: 'Anbieternummer',
    providerPlaceholder: 'Deine IS24-AT Anbieternummer',
    helpUrl: 'https://www.immobilienscout24.at',
  },
  'immmo-at': {
    subtitle: 'Österreichisches Immobilienportal',
    hint: 'Zugangsdaten erhältst du nach der Registrierung als gewerblicher Anbieter bei immmo.at.',
    ftpHostPlaceholder: 'Wird nach Registrierung mitgeteilt',
    providerLabel: 'Anbieternummer',
    providerPlaceholder: 'Deine immmo.at Anbieternummer',
    helpUrl: 'https://www.immmo.at',
  },
  'findmyhome': {
    subtitle: 'Premium-Immobilienportal Österreich',
    hint: 'Zugangsdaten über den FindMyHome-Kundenservice. Als gewerblicher Anbieter registrieren.',
    ftpHostPlaceholder: 'Vom FindMyHome-Kundenservice',
    providerLabel: 'Anbieternummer',
    providerPlaceholder: 'Deine FindMyHome-Anbieternummer',
    helpUrl: 'https://www.findmyhome.at',
  },
  'derstandard-immo': {
    subtitle: 'Immobilienmarkt von DerStandard.at',
    hint: 'Premium-Reichweite über DerStandard.at. Zugangsdaten über den Standard-Anzeigenservice oder deine Maklersoftware.',
    ftpHostPlaceholder: 'Vom Standard-Anzeigenservice',
    providerLabel: 'Kundennummer',
    providerPlaceholder: 'Deine Standard-Kundennummer',
    helpUrl: 'https://immobilien.derstandard.at',
  },

  // ─── Schweiz (6) ─────────────────────────────────────────────
  'homegate': {
    subtitle: 'Grösstes Immobilienportal der Schweiz',
    hint: 'Die IDX-Zugangsdaten erhältst du über deine Maklersoftware (z.B. CASAONE, Immomig, RealForce) oder direkt vom Homegate-Kundenservice.',
    ftpHostPlaceholder: 'z.B. ftp.homegate.ch',
    providerLabel: 'Kunden-ID',
    providerPlaceholder: 'Deine Homegate Kunden-ID',
    helpUrl: 'https://www.homegate.ch',
  },
  'immoscout24-ch': {
    subtitle: 'ImmoScout24 für die Schweiz',
    hint: 'Die IDX-Zugangsdaten erhältst du über deine Maklersoftware oder direkt vom ImmoScout24-CH-Kundenservice. Achtung: Die REST-API ist nur für DE verfügbar.',
    ftpHostPlaceholder: 'z.B. ftp.immoscout24.ch',
    providerLabel: 'Kunden-ID',
    providerPlaceholder: 'Deine IS24-CH Kunden-ID',
    helpUrl: 'https://www.immoscout24.ch',
  },
  'comparis': {
    subtitle: 'Vergleichsportal mit Immobilienmarkt',
    hint: 'Die IDX-Zugangsdaten erhältst du über deine Maklersoftware (z.B. CASAONE) oder direkt vom Comparis-Kundenservice.',
    ftpHostPlaceholder: 'z.B. ftp.comparis.ch',
    providerLabel: 'Kunden-ID',
    providerPlaceholder: 'Deine Comparis Kunden-ID',
    helpUrl: 'https://www.comparis.ch/immobilien',
  },
  'newhome': {
    subtitle: 'Regionales Schweizer Immobilienportal',
    hint: 'Die IDX-Zugangsdaten erhältst du über deine Maklersoftware oder direkt vom Newhome-Kundenservice.',
    ftpHostPlaceholder: 'z.B. ftp.newhome.ch',
    providerLabel: 'Kunden-ID',
    providerPlaceholder: 'Deine Newhome Kunden-ID',
    helpUrl: 'https://www.newhome.ch',
  },
  'immostreet': {
    subtitle: 'Gehört zur Homegate-Gruppe',
    hint: 'Die IDX-Zugangsdaten sind oft identisch mit deinen Homegate-Daten. Ansonsten über den ImmoStreet-Kundenservice.',
    ftpHostPlaceholder: 'z.B. ftp.immostreet.ch',
    providerLabel: 'Kunden-ID',
    providerPlaceholder: 'Deine ImmoStreet Kunden-ID',
    helpUrl: 'https://www.immostreet.ch',
  },
  'flatfox': {
    subtitle: 'Digitaler Vermietungsprozess (Schweiz)',
    hint: 'Flatfox bietet eine eigene REST-API. API-Zugangsdaten findest du in deinem Flatfox Business-Konto unter der API-Dokumentation.',
    providerLabel: 'Kunden-ID',
    providerPlaceholder: 'Deine Flatfox Kunden-ID',
    helpUrl: 'https://flatfox.ch/en/docs/',
    apiKeyLabel: 'API Key',
    apiKeyPlaceholder: 'Dein Flatfox API Key',
    apiSecretLabel: 'API Secret',
  },
};

function getPortalConfig(slug: string): PortalConfig {
  return PORTAL_CONFIG[slug] || {
    subtitle: 'Immobilienportal',
    hint: 'Die Zugangsdaten erhältst du nach der Registrierung beim jeweiligen Portal.',
    providerLabel: 'Anbieternummer',
  };
}

export default function PortalsSettingsPage() {
  const { data: user } = useSWR('/me', getMe);
  const [portals, setPortals] = useState<Portal[]>([]);
  const [tenantConnections, setTenantConnections] = useState<PortalConnection[]>([]);
  const [userConnections, setUserConnections] = useState<PortalConnection[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCountry, setSelectedCountry] = useState<string>('all');
  const [editingPortal, setEditingPortal] = useState<string | null>(null);
  const [editMode, setEditMode] = useState<'tenant' | 'user'>('user'); // Default to 'user' for seats
  const [formData, setFormData] = useState<Partial<PortalConnection>>({});
  const [showPassword, setShowPassword] = useState(false);
  const [testing, setTesting] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  const isAdmin = user?.role === 'ADMIN';
  const tenantId = user?.tenantId || 'default-tenant';
  const userId = user?.id || 'default-user';

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const config = getRuntimeConfig();
      const authHeaders = await getAuthHeaders();
      
      const [portalsRes, tenantConnectionsRes, userConnectionsRes] = await Promise.all([
        fetch(`${config.apiUrl}/portals`, { headers: authHeaders }),
        fetch(`${config.apiUrl}/portal-connections?tenantId=${tenantId}`, { headers: authHeaders }),
        fetch(`${config.apiUrl}/portal-connections?userId=${userId}`, { headers: authHeaders })
      ]);
      
      if (portalsRes.ok) {
        const portalsData = await portalsRes.json();
        setPortals(portalsData);
      }
      
      // Only load connections if authenticated (401 means not authenticated)
      if (tenantConnectionsRes.ok) {
        const data = await tenantConnectionsRes.json();
        setTenantConnections(data);
      } else if (tenantConnectionsRes.status === 401) {
        console.warn('Not authenticated - tenant connections not loaded');
      }
      
      if (userConnectionsRes.ok) {
        const data = await userConnectionsRes.json();
        setUserConnections(data);
      } else if (userConnectionsRes.status === 401) {
        console.warn('Not authenticated - user connections not loaded');
      }
      
      setLoading(false);
    } catch (error) {
      console.error('Error loading portals:', error);
      setLoading(false);
    }
  };

  const getTenantConnection = (portalId: string) => {
    return tenantConnections.find(c => c.portalId === portalId);
  };

  const getUserConnection = (portalId: string) => {
    return userConnections.find(c => c.portalId === portalId);
  };

  const getEffectiveConnection = (portalId: string) => {
    const userConn = getUserConnection(portalId);
    const tenantConn = getTenantConnection(portalId);
    return userConn || tenantConn;
  };

  const handleEdit = (portal: Portal, mode: 'tenant' | 'user') => {
    // Non-admins can only edit user connections
    if (!isAdmin && mode === 'tenant') {
      mode = 'user';
    }
    
    const connection = mode === 'tenant' ? getTenantConnection(portal.id) : getUserConnection(portal.id);
    setEditingPortal(portal.id);
    setEditMode(mode);
    
    // Different form data based on connection type
    if (portal.connectionType === 'REST_API') {
      setFormData({
        apiKey: connection?.apiKey || '',
        apiSecret: connection?.apiSecret || '',
        apiEndpoint: connection?.apiEndpoint || '',
        providerId: connection?.providerId || '',
        isEnabled: connection?.isEnabled ?? true,
        autoSyncEnabled: connection?.autoSyncEnabled || false,
        autoSyncInterval: connection?.autoSyncInterval || 24
      });
    } else if (portal.connectionType === 'IDX') {
      // Swiss IDX 3.01 standard - uses FTP with IDX files
      setFormData({
        ftpHost: connection?.ftpHost || portal.defaultFtpHost || '',
        ftpPort: connection?.ftpPort || 21,
        ftpUsername: connection?.ftpUsername || '',
        ftpPassword: connection?.ftpPassword || '',
        ftpPath: connection?.ftpPath || '/',
        useSftp: connection?.useSftp || false,
        providerId: connection?.providerId || '',
        isEnabled: connection?.isEnabled ?? true,
        autoSyncEnabled: connection?.autoSyncEnabled || false,
        autoSyncInterval: connection?.autoSyncInterval || 24
      });
    } else {
      setFormData({
        ftpHost: connection?.ftpHost || portal.defaultFtpHost || '',
        ftpPort: connection?.ftpPort || 21,
        ftpUsername: connection?.ftpUsername || '',
        ftpPassword: connection?.ftpPassword || '',
        ftpPath: connection?.ftpPath || '/',
        useSftp: connection?.useSftp || false,
        providerId: connection?.providerId || '',
        isEnabled: connection?.isEnabled ?? true,
        autoSyncEnabled: connection?.autoSyncEnabled || false,
        autoSyncInterval: connection?.autoSyncInterval || 24
      });
    }
    setTestResult(null);
  };

  const handleSave = async () => {
    if (!editingPortal) return;
    
    try {
      const config = getRuntimeConfig();
      const authHeaders = await getAuthHeaders();
      const payload = editMode === 'tenant' 
        ? { tenantId, portalId: editingPortal, ...formData }
        : { userId, portalId: editingPortal, ...formData };

      const res = await fetch(`${config.apiUrl}/portal-connections`, {
        method: 'POST',
        headers: { 
          ...authHeaders,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });
      
      if (res.ok) {
        await loadData();
        setEditingPortal(null);
        setFormData({});
      } else {
        const error = await res.json();
        alert(error.error || 'Fehler beim Speichern');
      }
    } catch (error) {
      console.error('Error saving connection:', error);
      alert('Fehler beim Speichern der Verbindung');
    }
  };

  const handleTest = async (connectionId: string) => {
    setTesting(connectionId);
    setTestResult(null);
    
    try {
      const config = getRuntimeConfig();
      const authHeaders = await getAuthHeaders();
      const res = await fetch(`${config.apiUrl}/portal-connections/${connectionId}/test`, {
        method: 'POST',
        headers: authHeaders
      });
      
      if (res.ok) {
        const result = await res.json();
        setTestResult(result);
      } else {
        const error = await res.json();
        setTestResult({ success: false, message: error.error || 'Verbindungsfehler' });
      }
    } catch (error) {
      setTestResult({ success: false, message: 'Verbindungsfehler' });
    } finally {
      setTesting(null);
    }
  };

  const handleRemoveUserConnection = async (portalId: string) => {
    try {
      const config = getRuntimeConfig();
      const authHeaders = await getAuthHeaders();
      const connection = getUserConnection(portalId);
      if (connection) {
        const res = await fetch(`${config.apiUrl}/portal-connections/${connection.id}`, {
          method: 'DELETE',
          headers: authHeaders
        });
        
        if (res.ok) {
          await loadData();
          setEditingPortal(null);
        } else {
          const error = await res.json();
          alert(error.error || 'Fehler beim Löschen');
        }
      }
    } catch (error) {
      console.error('Error removing connection:', error);
      alert('Fehler beim Löschen der Verbindung');
    }
  };

  const filteredPortals = selectedCountry === 'all' 
    ? portals 
    : portals.filter(p => p.country === selectedCountry);

  const groupedPortals = filteredPortals.reduce((acc, portal) => {
    if (!acc[portal.country]) acc[portal.country] = [];
    acc[portal.country].push(portal);
    return acc;
  }, {} as Record<string, Portal[]>);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    );
  }

  const totalConnected = portals.filter(p => {
    const effective = getEffectiveConnection(p.id);
    return effective?.isEnabled && (effective?.ftpUsername || effective?.apiKey);
  }).length;

  const totalAutoSync = [...tenantConnections, ...userConnections].filter(c => c.autoSyncEnabled).length;

  return (
    <div className="space-y-8">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-gray-50 rounded-xl p-4">
          <div className="text-3xl font-bold text-gray-900">{portals.length}</div>
          <div className="text-sm text-gray-500">Verfügbare Portale</div>
        </div>
        <div className="bg-green-50 rounded-xl p-4">
          <div className="text-3xl font-bold text-green-600">{totalConnected}</div>
          <div className="text-sm text-gray-500">Verbunden</div>
        </div>
        <div className="bg-indigo-50 rounded-xl p-4">
          <div className="text-3xl font-bold text-indigo-600">{totalAutoSync}</div>
          <div className="text-sm text-gray-500">Auto-Sync aktiv</div>
        </div>
      </div>

      {/* Filter */}
      <div className="flex gap-2">
        <button
          onClick={() => setSelectedCountry('all')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            selectedCountry === 'all' 
              ? 'bg-gray-900 text-white' 
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          Alle ({portals.length})
        </button>
        {['DE', 'AT', 'CH'].map(country => (
          <button
            key={country}
            onClick={() => setSelectedCountry(country)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              selectedCountry === country 
                ? 'bg-gray-900 text-white' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {COUNTRY_FLAGS[country]} {COUNTRY_LABELS[country]} ({portals.filter(p => p.country === country).length})
          </button>
        ))}
      </div>

      {/* Portal List */}
      {Object.entries(groupedPortals).map(([country, countryPortals]) => (
        <div key={country} className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <span>{COUNTRY_FLAGS[country]}</span>
            {COUNTRY_LABELS[country]}
          </h3>
          
          <div className="grid gap-3">
            {countryPortals.map(portal => {
              const tenantConn = getTenantConnection(portal.id);
              const userConn = getUserConnection(portal.id);
              const effectiveConn = getEffectiveConnection(portal.id);
              const isConnected = effectiveConn?.isEnabled && (effectiveConn?.ftpUsername || effectiveConn?.apiKey);
              const isEditing = editingPortal === portal.id;
              const hasUserConn = !!userConn;
              
              return (
                <div 
                  key={portal.id}
                  className={`bg-white rounded-xl border transition-all ${
                    isEditing ? 'border-indigo-300 shadow-lg' : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  {/* Portal Header */}
                  <div 
                    onClick={() => isEditing ? setEditingPortal(null) : handleEdit(portal, 'tenant')}
                    className="p-4 flex items-center justify-between cursor-pointer"
                  >
                    <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                        isConnected ? 'bg-green-100' : 'bg-gray-100'
                      }`}>
                        <Globe className={`w-5 h-5 ${isConnected ? 'text-green-600' : 'text-gray-400'}`} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-gray-900">{portal.name}</span>
                          {portal.isPremium && (
                            <span className="px-2 py-0.5 bg-amber-100 text-amber-700 text-[10px] font-medium">
                              API
                            </span>
                          )}
                          {isConnected && (
                            <>
                              <Check className="w-4 h-4 text-green-500" />
                              {hasUserConn ? (
                                <div className="flex items-center gap-1 px-2 py-0.5 bg-indigo-50 text-[10px] font-medium">
                                  <User className="w-3 h-3 text-indigo-600" />
                                  <span className="text-indigo-600">Eigener Account</span>
                                </div>
                              ) : (
                                <div className="flex items-center gap-1 px-2 py-0.5 bg-gray-100 text-[10px] font-medium">
                                  <Building2 className="w-3 h-3 text-gray-600" />
                                  <span className="text-gray-600">Firmen-Account</span>
                                </div>
                              )}
                            </>
                          )}
                        </div>
                        <div className="text-xs text-gray-500">
                          {getPortalConfig(portal.slug).subtitle}
                        </div>
                      </div>
                    </div>
                    
                    {portal.websiteUrl && (
                      <a 
                        href={portal.websiteUrl} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    )}
                  </div>
                  
                  {/* Edit Form */}
                  {isEditing && (
                    <div className="border-t border-gray-100 p-4 space-y-4 bg-gray-50/50">
                      {/* Connection Type Selector */}
                      <div className="space-y-2">
                        <button
                          onClick={() => isAdmin && setEditMode('tenant')}
                          disabled={!isAdmin}
                          className={`w-full flex items-center gap-2 p-3 bg-white rounded-lg border-2 transition-colors ${
                            !isAdmin ? 'opacity-50 cursor-not-allowed' : 
                            editMode === 'tenant' ? 'border-indigo-500' : 'border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                            editMode === 'tenant' ? 'border-indigo-500' : 'border-gray-300'
                          }`}>
                            {editMode === 'tenant' && <div className="w-2 h-2 rounded-full bg-indigo-500" />}
                          </div>
                          <Building2 className="w-4 h-4" />
                          <div className="flex-1 text-left">
                            <div className="text-sm font-medium text-gray-900 flex items-center gap-2">
                              Firmen-Account
                              {!isAdmin && <Lock className="w-3 h-3 text-gray-400" />}
                            </div>
                            <div className="text-xs text-gray-500">
                              {!isAdmin ? 'Nur für Admins' :
                               tenantConn ? 'Verbunden und aktiv' : 'Noch nicht eingerichtet'}
                            </div>
                          </div>
                        </button>
                        
                        <button
                          onClick={() => setEditMode('user')}
                          className={`w-full flex items-center gap-2 p-3 bg-white rounded-lg border-2 transition-colors ${
                            editMode === 'user' ? 'border-indigo-500' : 'border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                            editMode === 'user' ? 'border-indigo-500' : 'border-gray-300'
                          }`}>
                            {editMode === 'user' && <div className="w-2 h-2 rounded-full bg-indigo-500" />}
                          </div>
                          <User className="w-4 h-4" />
                          <div className="flex-1 text-left">
                            <div className="text-sm font-medium text-gray-900">Eigener Account</div>
                            <div className="text-xs text-gray-500">
                              {userConn ? 'Deine persönliche Verbindung' : 
                               portal.connectionType === 'REST_API' ? 'Eigene API-Zugangsdaten nutzen' :
                               portal.connectionType === 'IDX' ? 'Eigene IDX-Zugangsdaten nutzen' : 'Eigene FTP-Zugangsdaten nutzen'}
                            </div>
                          </div>
                        </button>
                      </div>
                      
                      {/* Connection Form — driven by PORTAL_CONFIG */}
                      {(() => {
                        const cfg = getPortalConfig(portal.slug);
                        return (
                          <div className="space-y-4 pt-4 border-t border-gray-200">
                            {/* Portal-specific hint */}
                            <div className="bg-blue-50 rounded-lg p-3 text-xs text-blue-800">
                              {cfg.hint}
                              {cfg.helpUrl && (
                                <> <a href={cfg.helpUrl} target="_blank" rel="noopener noreferrer" className="underline font-medium">Mehr erfahren</a></>
                              )}
                            </div>

                            {portal.connectionType === 'REST_API' ? (
                              // API Form
                              <>
                                <div>
                                  <label className="block text-xs font-medium text-gray-700 mb-1">{cfg.apiKeyLabel || 'API Key'}</label>
                                  <input
                                    type="text"
                                    value={formData.apiKey || ''}
                                    onChange={(e) => setFormData({ ...formData, apiKey: e.target.value })}
                                    placeholder={cfg.apiKeyPlaceholder || 'Dein API Key'}
                                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                  />
                                </div>
                                
                                <div>
                                  <label className="block text-xs font-medium text-gray-700 mb-1">{cfg.apiSecretLabel || 'API Secret'}</label>
                                  <div className="relative">
                                    <input
                                      type={showPassword ? 'text' : 'password'}
                                      value={formData.apiSecret || ''}
                                      onChange={(e) => setFormData({ ...formData, apiSecret: e.target.value })}
                                      placeholder="Dein API Secret"
                                      className="w-full px-3 py-2 pr-10 bg-white border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                    />
                                    <button
                                      type="button"
                                      onClick={() => setShowPassword(!showPassword)}
                                      className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                    >
                                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                    </button>
                                  </div>
                                </div>
                                
                                <div>
                                  <label className="block text-xs font-medium text-gray-700 mb-1">{cfg.providerLabel}</label>
                                  <input
                                    type="text"
                                    value={formData.providerId || ''}
                                    onChange={(e) => setFormData({ ...formData, providerId: e.target.value })}
                                    placeholder={cfg.providerPlaceholder || 'Deine Anbieternummer'}
                                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                  />
                                </div>
                              </>
                            ) : (
                              // FTP/IDX Form (both use same fields with portal-specific labels)
                              <>
                                <div className="grid grid-cols-2 gap-4">
                                  <div>
                                    <label className="block text-xs font-medium text-gray-700 mb-1">FTP Host</label>
                                    <input
                                      type="text"
                                      value={formData.ftpHost || ''}
                                      onChange={(e) => setFormData({ ...formData, ftpHost: e.target.value })}
                                      placeholder={cfg.ftpHostPlaceholder || 'ftp.portal.de'}
                                      className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-xs font-medium text-gray-700 mb-1">Port</label>
                                    <input
                                      type="number"
                                      value={formData.ftpPort || 21}
                                      onChange={(e) => setFormData({ ...formData, ftpPort: parseInt(e.target.value) })}
                                      className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                    />
                                  </div>
                                </div>
                                
                                <div className="grid grid-cols-2 gap-4">
                                  <div>
                                    <label className="block text-xs font-medium text-gray-700 mb-1">Benutzername</label>
                                    <input
                                      type="text"
                                      value={formData.ftpUsername || ''}
                                      onChange={(e) => setFormData({ ...formData, ftpUsername: e.target.value })}
                                      className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-xs font-medium text-gray-700 mb-1">Passwort</label>
                                    <div className="relative">
                                      <input
                                        type={showPassword ? 'text' : 'password'}
                                        value={formData.ftpPassword || ''}
                                        onChange={(e) => setFormData({ ...formData, ftpPassword: e.target.value })}
                                        className="w-full px-3 py-2 pr-10 bg-white border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                      />
                                      <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                      >
                                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                      </button>
                                    </div>
                                  </div>
                                </div>
                                
                                <div className="grid grid-cols-2 gap-4">
                                  <div>
                                    <label className="block text-xs font-medium text-gray-700 mb-1">Verzeichnis</label>
                                    <input
                                      type="text"
                                      value={formData.ftpPath || '/'}
                                      onChange={(e) => setFormData({ ...formData, ftpPath: e.target.value })}
                                      className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-xs font-medium text-gray-700 mb-1">{cfg.providerLabel}</label>
                                    <input
                                      type="text"
                                      value={formData.providerId || ''}
                                      onChange={(e) => setFormData({ ...formData, providerId: e.target.value })}
                                      placeholder={cfg.providerPlaceholder || 'Deine Anbieternummer'}
                                      className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                    />
                                  </div>
                                </div>
                                
                                <div className="flex items-center gap-6">
                                  <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                      type="checkbox"
                                      checked={formData.useSftp || false}
                                      onChange={(e) => setFormData({ ...formData, useSftp: e.target.checked })}
                                      className="w-4 h-4 border-gray-300 text-indigo-600 focus:ring-indigo-500"
                                    />
                                    <span className="text-sm text-gray-700">SFTP verwenden</span>
                                  </label>
                                </div>
                              </>
                            )}
                        
                            {/* Common options */}
                            <div className="flex items-center gap-6 pt-2 border-t border-gray-100">
                              <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={formData.isEnabled ?? true}
                                  onChange={(e) => setFormData({ ...formData, isEnabled: e.target.checked })}
                                  className="w-4 h-4 border-gray-300 text-indigo-600 focus:ring-indigo-500"
                                />
                                <span className="text-sm text-gray-700">Aktiviert</span>
                              </label>
                              
                              <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={formData.autoSyncEnabled || false}
                                  onChange={(e) => setFormData({ ...formData, autoSyncEnabled: e.target.checked })}
                                  className="w-4 h-4 border-gray-300 text-indigo-600 focus:ring-indigo-500"
                                />
                                <span className="text-sm text-gray-700">Auto-Sync</span>
                              </label>
                            </div>
                            
                            {/* Test Result */}
                            {testResult && (
                              <div className={`p-3 rounded-lg text-sm ${
                                testResult.success ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                              }`}>
                                {testResult.message}
                              </div>
                            )}
                            
                            {/* Actions */}
                            <div className="flex justify-between pt-2">
                              <div className="flex gap-2">
                                <button
                                  onClick={() => effectiveConn && handleTest(effectiveConn.id)}
                                  disabled={!effectiveConn || testing === effectiveConn?.id}
                                  className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-gray-700 bg-white border border-gray-200 hover:bg-gray-50 disabled:opacity-50 transition-colors"
                                >
                                  {testing === effectiveConn?.id ? (
                                    <RefreshCw className="w-4 h-4 animate-spin" />
                                  ) : (
                                    <TestTube className="w-4 h-4" />
                                  )}
                                  Testen
                                </button>
                                
                                {editMode === 'user' && userConn && (
                                  <button
                                    onClick={() => handleRemoveUserConnection(portal.id)}
                                    className="px-4 py-2 rounded-lg text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 transition-colors"
                                  >
                                    Eigene Verbindung löschen
                                  </button>
                                )}
                              </div>
                              
                              <div className="flex gap-2">
                                <button
                                  onClick={() => setEditingPortal(null)}
                                  className="px-4 py-2 rounded-lg text-sm font-medium text-gray-700 bg-white border border-gray-200 hover:bg-gray-50 transition-colors"
                                >
                                  Abbrechen
                                </button>
                                <button
                                  onClick={handleSave}
                                  className="px-4 py-2 rounded-lg text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 transition-colors"
                                >
                                  Speichern
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}
      
      {/* Info for non-admins */}
      {!isAdmin && (
        <div className="bg-amber-50 rounded-xl p-4 text-sm text-amber-800">
          <strong>Hinweis:</strong> Du kannst für jedes Portal deine eigenen Zugangsdaten hinterlegen. Die Firmen-Verbindungen werden vom Admin verwaltet.
        </div>
      )}
    </div>
  );
}
