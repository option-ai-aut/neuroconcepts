'use client';

import Link from 'next/link';
import PublicNavigation from '@/components/PublicNavigation';
import PublicFooter from '@/components/PublicFooter';

export default function DatenschutzPage() {
  return (
    <div className="min-h-screen bg-white">
      <PublicNavigation currentPage="datenschutz" />

      {/* Content */}
      <section className="pt-24 sm:pt-32 pb-12 sm:pb-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900 mb-6 sm:mb-8">Datenschutzerklärung</h1>
          
          <div className="prose prose-sm sm:prose-lg max-w-none text-gray-600">
            <p className="text-xs sm:text-sm text-gray-500 mb-6 sm:mb-8">Stand: Januar 2026</p>

            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mt-6 sm:mt-8 mb-3 sm:mb-4">1. Verantwortlicher</h2>
            <p className="text-sm sm:text-base">
              Immivo AI GmbH<br />
              Musterstraße 123<br />
              1010 Wien, Österreich<br />
              E-Mail: <a href="mailto:datenschutz@immivo.ai" className="text-indigo-600 hover:underline">datenschutz@immivo.ai</a>
            </p>

            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mt-6 sm:mt-8 mb-3 sm:mb-4">2. Erhebung und Verarbeitung personenbezogener Daten</h2>
            <p className="text-sm sm:text-base">
              Wir erheben personenbezogene Daten nur, wenn Sie uns diese freiwillig mitteilen, 
              z.B. bei der Registrierung, beim Ausfüllen von Formularen oder beim Versenden von E-Mails.
              Verarbeitete Kategorien umfassen: Kontaktdaten (Name, E-Mail, Telefon), Adressdaten, 
              Immobiliendaten, Kommunikationsverläufe und Nutzungsdaten der Plattform.
            </p>

            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mt-6 sm:mt-8 mb-3 sm:mb-4">3. Nutzung und Weitergabe personenbezogener Daten</h2>
            <p className="text-sm sm:text-base">
              Ihre personenbezogenen Daten werden nur zur Beantwortung Ihrer Anfragen, 
              zur Abwicklung von Verträgen und für die technische Administration verwendet.
            </p>
            <p className="text-sm sm:text-base">
              Eine Weitergabe an Dritte erfolgt nur, wenn dies zur Vertragsabwicklung erforderlich ist 
              oder Sie ausdrücklich eingewilligt haben.
            </p>

            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mt-6 sm:mt-8 mb-3 sm:mb-4">4. Einsatz von Künstlicher Intelligenz (KI)</h2>
            <p className="text-sm sm:text-base">
              Unsere Plattform nutzt KI-gestützte Funktionen (Jarvis) zur Unterstützung bei 
              der Lead-Verwaltung, E-Mail-Kommunikation, Exposé-Erstellung und weiteren Aufgaben. 
              Dabei werden Daten an folgende Drittanbieter übermittelt:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-sm sm:text-base">
              <li><strong>OpenAI (USA)</strong> — Verarbeitung von Texteingaben und -ausgaben 
                für den KI-Assistenten Jarvis. Rechtsgrundlage: Art. 6 Abs. 1 lit. b DSGVO 
                (Vertragserfüllung). Datentransfer in die USA erfolgt auf Basis von 
                EU-Standardvertragsklauseln (SCCs).</li>
              <li><strong>Google APIs (USA)</strong> — Kalender-Integration (Google Calendar) 
                für die Terminverwaltung. Rechtsgrundlage: Art. 6 Abs. 1 lit. a DSGVO 
                (Einwilligung bei der Verbindung).</li>
            </ul>
            <p className="text-sm sm:text-base">
              KI-generierte Inhalte (z.B. E-Mail-Entwürfe, Exposé-Texte) werden als solche 
              gekennzeichnet. Automatisierte Entscheidungen im Sinne von Art. 22 DSGVO werden 
              nicht ohne menschliche Überprüfung getroffen.
            </p>

            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mt-6 sm:mt-8 mb-3 sm:mb-4">5. Drittanbieter und Auftragsverarbeiter</h2>
            <p className="text-sm sm:text-base">
              Zur Bereitstellung unserer Dienste setzen wir folgende Auftragsverarbeiter ein:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-sm sm:text-base">
              <li><strong>Amazon Web Services (AWS), Frankfurt/EU</strong> — Hosting, 
                Datenbanken, E-Mail-Versand (SES), Dateispeicher (S3). Datenverarbeitung 
                innerhalb der EU (Region eu-central-1).</li>
              <li><strong>OpenAI, Inc. (USA)</strong> — KI-Textverarbeitung für den 
                Assistenten Jarvis. Abgesichert durch EU-Standardvertragsklauseln.</li>
              <li><strong>Google LLC (USA)</strong> — Kalender-Integration (optional). 
                Abgesichert durch EU-Standardvertragsklauseln.</li>
            </ul>
            <p className="text-sm sm:text-base">
              Mit allen Auftragsverarbeitern bestehen Auftragsverarbeitungsverträge (AVV) 
              gemäß Art. 28 DSGVO.
            </p>

            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mt-6 sm:mt-8 mb-3 sm:mb-4">6. Cookies</h2>
            <p className="text-sm sm:text-base">
              Unsere Website verwendet essenzielle Cookies, die für den Betrieb der Plattform 
              notwendig sind (z.B. Authentifizierung, Session-Verwaltung). Optionale Cookies 
              werden nur mit Ihrer ausdrücklichen Einwilligung gesetzt (Cookie-Consent-Banner).
              Sie können Ihre Cookie-Einstellungen jederzeit ändern oder widerrufen.
            </p>

            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mt-6 sm:mt-8 mb-3 sm:mb-4">7. Hosting</h2>
            <p className="text-sm sm:text-base">
              Unsere Dienste werden auf Amazon Web Services (AWS) in Frankfurt, Deutschland 
              (Region eu-central-1) gehostet. Damit ist die Einhaltung der DSGVO-Anforderungen 
              gewährleistet. Server-Logs werden maximal 30 Tage gespeichert.
            </p>

            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mt-6 sm:mt-8 mb-3 sm:mb-4">8. Datensicherheit</h2>
            <p className="text-sm sm:text-base">
              Wir setzen technische und organisatorische Maßnahmen ein, um Ihre Daten zu schützen:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-sm sm:text-base">
              <li>Verschlüsselte Übertragung (TLS/HTTPS)</li>
              <li>Verschlüsselte Speicherung sensibler Daten (AES-256)</li>
              <li>Zugriffskontrolle und Multi-Tenancy-Isolation</li>
              <li>KI-Sicherheitsfilter gegen Prompt-Injection und Datenlecks</li>
              <li>Audit-Logging aller KI-Interaktionen</li>
            </ul>

            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mt-6 sm:mt-8 mb-3 sm:mb-4">9. Ihre Rechte</h2>
            <p className="text-sm sm:text-base">
              Nach der DSGVO stehen Ihnen folgende Rechte zu:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-sm sm:text-base">
              <li><strong>Auskunft</strong> (Art. 15 DSGVO) — Recht auf Auskunft über Ihre gespeicherten Daten</li>
              <li><strong>Berichtigung</strong> (Art. 16 DSGVO) — Recht auf Korrektur unrichtiger Daten</li>
              <li><strong>Löschung</strong> (Art. 17 DSGVO) — Recht auf Löschung Ihrer Daten 
                (verfügbar in Ihrem Profil unter &quot;Konto &amp; Daten löschen&quot;)</li>
              <li><strong>Einschränkung</strong> (Art. 18 DSGVO) — Recht auf Einschränkung der Verarbeitung</li>
              <li><strong>Datenübertragbarkeit</strong> (Art. 20 DSGVO) — Recht auf Export Ihrer Daten 
                in einem maschinenlesbaren Format (verfügbar in Ihrem Profil unter &quot;Daten exportieren&quot;)</li>
              <li><strong>Widerspruch</strong> (Art. 21 DSGVO) — Recht auf Widerspruch gegen die Verarbeitung</li>
            </ul>

            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mt-6 sm:mt-8 mb-3 sm:mb-4">10. Speicherdauer</h2>
            <p className="text-sm sm:text-base">
              Personenbezogene Daten werden nur so lange gespeichert, wie es für die Zwecke der 
              Verarbeitung erforderlich ist oder gesetzliche Aufbewahrungsfristen bestehen. 
              KI-Audit-Logs werden nach 12 Monaten automatisch gelöscht. Sie können Ihr Konto 
              und alle damit verbundenen Daten jederzeit in den Profileinstellungen löschen.
            </p>

            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mt-6 sm:mt-8 mb-3 sm:mb-4">11. Beschwerderecht</h2>
            <p className="text-sm sm:text-base">
              Sie haben das Recht, eine Beschwerde bei der zuständigen Aufsichtsbehörde einzureichen:
            </p>
            <p className="text-sm sm:text-base">
              Österreichische Datenschutzbehörde<br />
              Barichgasse 40-42, 1030 Wien<br />
              <a href="https://www.dsb.gv.at" target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline">www.dsb.gv.at</a>
            </p>

            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mt-6 sm:mt-8 mb-3 sm:mb-4">12. Kontakt</h2>
            <p className="text-sm sm:text-base">
              Bei Fragen zum Datenschutz kontaktieren Sie uns bitte unter:{' '}
              <a href="mailto:datenschutz@immivo.ai" className="text-indigo-600 hover:underline">
                datenschutz@immivo.ai
              </a>
            </p>
          </div>
        </div>
      </section>

      <PublicFooter />
    </div>
  );
}
