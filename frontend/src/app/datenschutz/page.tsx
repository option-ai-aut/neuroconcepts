'use client';

import PublicNavigation from '@/components/PublicNavigation';
import PublicFooter from '@/components/PublicFooter';
import Link from 'next/link';

export default function DatenschutzPage() {
  return (
    <div className="min-h-screen bg-white">
      <PublicNavigation currentPage="datenschutz" />

      <section className="pt-24 sm:pt-32 pb-16 sm:pb-24">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <header className="mb-10 sm:mb-12">
            <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900 tracking-tight">
              Datenschutzerklärung
            </h1>
            <p className="mt-2 text-sm text-gray-500">
              Stand: Februar 2026
            </p>
          </header>

          <div className="space-y-10">
            {/* 1. Verantwortlicher */}
            <section>
              <h2 className="text-xl font-bold text-gray-900 mb-4">
                1. Verantwortlicher
              </h2>
              <p className="text-gray-600 leading-relaxed">
                Verantwortlich für die Datenverarbeitung im Sinne der Datenschutz-Grundverordnung (DSGVO) ist:
              </p>
              <address className="mt-3 not-italic text-gray-600 leading-relaxed">
                <strong>Dynamo Lab Technologies GmbH</strong> <span className="px-2 py-0.5 bg-amber-100 text-amber-800 text-xs font-medium rounded not-italic">In Gründung</span><br />
                Sterngasse 3<br />
                1010 Wien, Österreich<br />
                E-Mail:{' '}
                <a href="mailto:office@immivo.ai" className="text-blue-600 hover:text-blue-700 hover:underline">
                  office@immivo.ai
                </a>
              </address>
              <p className="mt-3 text-gray-600 leading-relaxed">
                Geschäftsführer: Josef Leutgeb
              </p>
            </section>

            {/* 2. Erhebung und Verarbeitung personenbezogener Daten */}
            <section>
              <h2 className="text-xl font-bold text-gray-900 mb-4">
                2. Erhebung und Verarbeitung personenbezogener Daten
              </h2>
              <p className="text-gray-600 leading-relaxed mb-4">
                Wir erheben und verarbeiten personenbezogene Daten ausschließlich auf Grundlage der gesetzlichen Bestimmungen der DSGVO. Folgende Datenkategorien werden von uns verarbeitet:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-gray-600">
                <li><strong>Stammdaten:</strong> Name, E-Mail-Adresse, Telefonnummer, Firmenname</li>
                <li><strong>Immobiliendaten:</strong> Objektdaten, Exposé-Inhalte, Adressen und technische Details zu Immobilien</li>
                <li><strong>Bilddaten:</strong> Hochgeladene Immobilienfotos für virtuelle Einrichtung (Staging) und Bildbearbeitung</li>
                <li><strong>Kommunikationsdaten:</strong> E-Mail-Verläufe, Chat-Nachrichten, Annotations und Korrespondenz mit Leads</li>
                <li><strong>Nutzungsdaten:</strong> Logins, Nutzungszeiten, Feature-Nutzung und technische Protokolldaten</li>
              </ul>
            </section>

            {/* 3. Rechtsgrundlagen */}
            <section>
              <h2 className="text-xl font-bold text-gray-900 mb-4">
                3. Rechtsgrundlagen
              </h2>
              <p className="text-gray-600 leading-relaxed mb-4">
                Die Verarbeitung Ihrer personenbezogenen Daten erfolgt auf folgenden Rechtsgrundlagen gemäß Art. 6 DSGVO:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-gray-600">
                <li><strong>Art. 6 Abs. 1 lit. b DSGVO</strong> – Erfüllung eines Vertrags bzw. Durchführung vorvertraglicher Maßnahmen (z. B. Registrierung, Nutzung unserer SaaS-Plattform)</li>
                <li><strong>Art. 6 Abs. 1 lit. f DSGVO</strong> – Berechtigtes Interesse an der Verbesserung unserer Dienste, IT-Sicherheit und Kundenservice</li>
                <li><strong>Art. 6 Abs. 1 lit. a DSGVO</strong> – Ihre ausdrückliche Einwilligung (z. B. für Marketing-E-Mails oder optionale KI-Funktionen)</li>
              </ul>
            </section>

            {/* 4. Zwecke der Verarbeitung */}
            <section>
              <h2 className="text-xl font-bold text-gray-900 mb-4">
                4. Zwecke der Verarbeitung
              </h2>
              <p className="text-gray-600 leading-relaxed mb-4">
                Ihre Daten werden für folgende Zwecke verarbeitet:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-gray-600">
                <li>CRM und Lead-Management</li>
                <li>E-Mail-Kommunikation und Terminverwaltung</li>
                <li>Immobilienmanagement, Exposé-Erstellung und -Bearbeitung</li>
                <li>KI-gestützte Datenverarbeitung (z. B. E-Mail-Klassifizierung, Lead-Qualifizierung, Bildbearbeitung)</li>
              </ul>
            </section>

            {/* 5. KI und automatisierte Verarbeitung */}
            <section>
              <h2 className="text-xl font-bold text-gray-900 mb-4">
                5. Künstliche Intelligenz und automatisierte Verarbeitung
              </h2>
              <p className="text-gray-600 leading-relaxed mb-4">
                Unsere Plattform nutzt KI-Systeme zur Unterstützung Ihrer Arbeit. Wir informieren Sie hier transparent über die eingesetzten Dienste und Ihre Rechte.
              </p>

              <h3 className="text-lg font-semibold text-gray-900 mt-6 mb-2">
                5.1 OpenAI ({'\u201E'}Jarvis{'\u201C'})
              </h3>
              <p className="text-gray-600 leading-relaxed mb-2">
                Wir setzen <strong>OpenAI (GPT-5 und GPT-5-mini)</strong> für unseren KI-Assistenten {'\u201E'}Jarvis{'\u201C'} ein. Dieser verarbeitet insbesondere:
              </p>
              <ul className="list-disc pl-6 space-y-1 text-gray-600 mb-4">
                <li>E-Mail-Texte zur Klassifizierung und Kategorisierung (GPT-5-mini)</li>
                <li>Lead-Qualifizierung, priorisierte Auflistungen und CRM-Aktionen (GPT-5)</li>
                <li>Terminvorschläge und -formulierungen</li>
                <li>Exposé-Erstellung und -Bearbeitung</li>
                <li>Gesprächszusammenfassungen und Kontextspeicherung</li>
                <li>E-Mail-Signatur-Generierung</li>
              </ul>

              <h3 className="text-lg font-semibold text-gray-900 mt-6 mb-2">
                5.2 Google Gemini (Bildbearbeitung)
              </h3>
              <p className="text-gray-600 leading-relaxed mb-4">
                Für die Funktion {'\u201E'}Virtuelle Einrichtung{'\u201C'} (Virtual Staging) verwenden wir <strong>Google Gemini</strong>. Dabei werden von Ihnen hochgeladene Immobilienfotos an Google übermittelt und zur Bildbearbeitung verarbeitet.
              </p>

              <h3 className="text-lg font-semibold text-gray-900 mt-6 mb-2">
                5.3 Drittlandtransfers (USA)
              </h3>
              <p className="text-gray-600 leading-relaxed mb-4">
                Daten können an Diensteanbieter in den USA übermittelt werden (OpenAI, Google). Wir stellen angemessene Garantien sicher:
              </p>
              <ul className="list-disc pl-6 space-y-1 text-gray-600 mb-4">
                <li>Teilnahme am EU-US Data Privacy Framework (soweit von den Anbietern unterstützt)</li>
                <li>EU-Standardvertragsklauseln (SCC) gemäß Art. 46 Abs. 2 lit. c DSGVO</li>
              </ul>

              <h3 className="text-lg font-semibold text-gray-900 mt-6 mb-2">
                5.4 Automatisierte Entscheidungen
              </h3>
              <p className="text-gray-600 leading-relaxed mb-4">
                Jarvis klassifiziert E-Mails und qualifiziert Leads automatisiert. Eine rein automatisierte Entscheidung mit rechtlicher oder ähnlich erheblicher Wirkung findet <strong>nicht</strong> statt – finale Entscheidungen treffen stets Sie als Nutzer. Sie können sich jederzeit bei uns melden, um einen menschlichen Überblick zu verlangen.
              </p>

              <h3 className="text-lg font-semibold text-gray-900 mt-6 mb-2">
                5.5 Opt-out
              </h3>
              <p className="text-gray-600 leading-relaxed mb-4">
                Sie können die KI-Verarbeitung in den Einstellungen deaktivieren. In diesem Fall werden keine Texte oder Bilder an OpenAI oder Google übermittelt. Bestimmte Funktionen (z. B. Jarvis oder virtuelle Einrichtung) stehen dann nicht mehr zur Verfügung.
              </p>

              <h3 className="text-lg font-semibold text-gray-900 mt-6 mb-2">
                5.6 KI-Nutzungsprotokollierung
              </h3>
              <p className="text-gray-600 leading-relaxed mb-4">
                Zur Kostentransparenz und Qualitätssicherung protokollieren wir anonymisiert die Nutzung der KI-Dienste. Dabei werden folgende Metadaten erfasst:
              </p>
              <ul className="list-disc pl-6 space-y-1 text-gray-600 mb-4">
                <li>Verwendeter KI-Anbieter und Modell (z. B. GPT-5, Gemini)</li>
                <li>Art der Anfrage (z. B. Chat, E-Mail-Parsing, Bildbearbeitung)</li>
                <li>Anzahl der verarbeiteten Tokens (Ein-/Ausgabe)</li>
                <li>Dauer der Verarbeitung</li>
              </ul>
              <p className="text-gray-600 leading-relaxed mb-4">
                <strong>Keine Speicherung von Inhalten:</strong> Es werden ausschließlich Metadaten protokolliert – die tatsächlichen Inhalte Ihrer Anfragen oder KI-Antworten werden nicht gespeichert. Die Protokolldaten dienen der internen Kostenüberwachung und werden nicht an Dritte weitergegeben.
              </p>

              <h3 className="text-lg font-semibold text-gray-900 mt-6 mb-2">
                5.7 Echtzeitbenachrichtigungen
              </h3>
              <p className="text-gray-600 leading-relaxed">
                Unsere Plattform nutzt Server-Sent Events (SSE) für Echtzeitbenachrichtigungen (z. B. neue Leads, Objektzuweisungen). Dabei werden kurzlebige Ereignisdaten (Typ und zugehörige IDs) temporär gespeichert und nach Zustellung automatisch verarbeitet. Es werden keine personenbezogenen Inhalte über diesen Kanal übertragen.
              </p>
            </section>

            {/* 6. Hosting und Cloud-Dienste */}
            <section>
              <h2 className="text-xl font-bold text-gray-900 mb-4">
                6. Hosting und Cloud-Dienste
              </h2>
              <p className="text-gray-600 leading-relaxed mb-4">
                Unsere Plattform wird auf <strong>Amazon Web Services (AWS)</strong> betrieben:
              </p>
              <ul className="list-disc pl-6 space-y-1 text-gray-600">
                <li>Region: Frankfurt (eu-central-1), EU</li>
                <li>Verschlüsselung: Daten ruhen verschlüsselt (AES-256); Übertragung per TLS/HTTPS</li>
              </ul>
            </section>

            {/* 7. E-Mail-Dienste */}
            <section>
              <h2 className="text-xl font-bold text-gray-900 mb-4">
                7. E-Mail-Dienste
              </h2>
              <p className="text-gray-600 leading-relaxed">
                Für transaktionale E-Mails (z. B. Registrierung, Passwort-Reset, Benachrichtigungen) setzen wir <strong>Resend</strong> sowie <strong>Amazon SES</strong> ein. E-Mail-Inhalte werden ausschließlich zur Zustellung verarbeitet und nicht für werbliche Zwecke ausgewertet.
              </p>
            </section>

            {/* 8. Authentifizierung */}
            <section>
              <h2 className="text-xl font-bold text-gray-900 mb-4">
                8. Authentifizierung
              </h2>
              <p className="text-gray-600 leading-relaxed">
                Die Anmeldung und Authentifizierung erfolgt über <strong>AWS Cognito</strong>. Passwörter werden ausschließlich als Hash gespeichert. Cognito betreiben wir in der EU-Region.
              </p>
            </section>

            {/* 9. Zahlungsabwicklung */}
            <section>
              <h2 className="text-xl font-bold text-gray-900 mb-4">
                9. Zahlungsabwicklung
              </h2>
              <p className="text-gray-600 leading-relaxed">
                Für die Abrechnung und Zahlungsabwicklung nutzen wir <strong>Stripe</strong>. Kreditkarten- und Zahlungsdaten werden direkt bei Stripe verarbeitet. Stripe ist DSGVO-konform und unterhält Datenverarbeitungsverträge.
              </p>
            </section>

            {/* 10. Cookies und Tracking */}
            <section>
              <h2 className="text-xl font-bold text-gray-900 mb-4">
                10. Cookies und Tracking
              </h2>
              <p className="text-gray-600 leading-relaxed mb-4">
                Wir setzen ausschließlich technisch notwendige Cookies ein, die für den Betrieb der Plattform erforderlich sind (z. B. Session-Management, Authentifizierung). Auf Marketing- oder Analyse-Cookies von Drittanbietern verzichten wir; es findet kein Third-Party-Tracking statt. Ihre Einwilligung wird im Rahmen unseres Cookie-Consent-Banners eingeholt, soweit gesetzlich vorgesehen.
              </p>
            </section>

            {/* 11. Drittanbieter und Auftragsverarbeiter */}
            <section>
              <h2 className="text-xl font-bold text-gray-900 mb-4">
                11. Drittanbieter und Auftragsverarbeiter
              </h2>
              <p className="text-gray-600 leading-relaxed mb-4">
                Wir arbeiten mit folgenden Auftragsverarbeitern (Auftragsverarbeitungsverträge gemäß Art. 28 DSGVO):
              </p>
              <ul className="list-disc pl-6 space-y-1 text-gray-600">
                <li><strong>OpenAI, Inc.</strong> (USA) – KI-Assistent Jarvis (GPT-5, GPT-5-mini)</li>
                <li><strong>Google Cloud / Google LLC</strong> (USA/EU) – Bildbearbeitung (Gemini)</li>
                <li><strong>Amazon Web Services</strong> (EU) – Hosting, Speicherung, E-Mail (SES, WorkMail), Cognito</li>
                <li><strong>Resend</strong> (USA) – Transaktionale E-Mails</li>
                <li><strong>Stripe, Inc.</strong> (USA/EU) – Zahlungsabwicklung</li>
              </ul>
            </section>

            {/* 12. Datensicherheit */}
            <section>
              <h2 className="text-xl font-bold text-gray-900 mb-4">
                12. Datensicherheit
              </h2>
              <p className="text-gray-600 leading-relaxed mb-4">
                Wir wenden technische und organisatorische Maßnahmen zum Schutz Ihrer Daten an:
              </p>
              <ul className="list-disc pl-6 space-y-1 text-gray-600">
                <li>SSL/TLS-Verschlüsselung für alle Verbindungen</li>
                <li>Verschlüsselung ruhender Daten (AES-256)</li>
                <li>Zugriffskontrolle, Rollen und Berechtigungen</li>
                <li>Mandantentrennung (Tenant-Isolation) – jeder Kunde hat Zugriff ausschließlich auf seine eigenen Daten</li>
                <li>Regelmäßige Sicherheitsüberprüfungen und Updates</li>
              </ul>
            </section>

            {/* 13. Speicherdauer */}
            <section>
              <h2 className="text-xl font-bold text-gray-900 mb-4">
                13. Speicherdauer
              </h2>
              <p className="text-gray-600 leading-relaxed">
                Ihre personenbezogenen Daten speichern wir, solange Ihr Konto aktiv ist und zur Vertragserfüllung erforderlich. Nach Kündigung oder Löschung Ihres Kontos werden die Daten innerhalb von <strong>30 Tagen</strong> gelöscht, sofern keine gesetzlichen Aufbewahrungspflichten entgegenstehen.
              </p>
            </section>

            {/* 14. Ihre Rechte */}
            <section>
              <h2 className="text-xl font-bold text-gray-900 mb-4">
                14. Ihre Rechte
              </h2>
              <p className="text-gray-600 leading-relaxed mb-4">
                Ihnen stehen die folgenden Rechte gemäß DSGVO zu:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-gray-600">
                <li><strong>Auskunft</strong> (Art. 15 DSGVO) – Recht auf Auskunft über Ihre bei uns gespeicherten Daten</li>
                <li><strong>Berichtigung</strong> (Art. 16 DSGVO) – Recht auf Berichtigung unrichtiger Daten</li>
                <li><strong>Löschung</strong> (Art. 17 DSGVO) – Recht auf Löschung ({'\u201E'}Recht auf Vergessenwerden{'\u201C'})</li>
                <li><strong>Einschränkung</strong> (Art. 18 DSGVO) – Recht auf Einschränkung der Verarbeitung</li>
                <li><strong>Datenübertragbarkeit</strong> (Art. 20 DSGVO) – Recht auf Übermittlung Ihrer Daten in einem strukturierten, gängigen Format</li>
                <li><strong>Widerspruch</strong> (Art. 21 DSGVO) – Recht, der Verarbeitung zu widersprechen</li>
              </ul>
              <p className="mt-4 text-gray-600 leading-relaxed">
                Zur Geltendmachung Ihrer Rechte wenden Sie sich an:{' '}
                <a href="mailto:office@immivo.ai" className="text-blue-600 hover:text-blue-700 hover:underline">
                  office@immivo.ai
                </a>
              </p>
            </section>

            {/* 15. Beschwerderecht */}
            <section>
              <h2 className="text-xl font-bold text-gray-900 mb-4">
                15. Beschwerderecht
              </h2>
              <p className="text-gray-600 leading-relaxed mb-4">
                Sie haben das Recht, bei einer Aufsichtsbehörde Beschwerde einzulegen. Zuständig ist die österreichische Datenschutzbehörde:
              </p>
              <address className="not-italic text-gray-600">
                <strong>Österreichische Datenschutzbehörde</strong><br />
                Barichgasse 40-42<br />
                1030 Wien, Österreich<br />
                Web:{' '}
                <Link
                  href="https://www.dsb.gv.at"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:text-blue-700 hover:underline"
                >
                  www.dsb.gv.at
                </Link>
              </address>
            </section>

            {/* 16. Aenderungen */}
            <section>
              <h2 className="text-xl font-bold text-gray-900 mb-4">
                16. Änderungen dieser Datenschutzerklärung
              </h2>
              <p className="text-gray-600 leading-relaxed">
                Wir behalten uns vor, diese Datenschutzerklärung anzupassen, um sie an Änderungen der Rechtslage oder unserer Dienste anzupassen. Die jeweils aktuelle Fassung ist auf dieser Seite abrufbar. Stand der letzten Aktualisierung: Februar 2026.
              </p>
            </section>
          </div>
        </div>
      </section>

      <PublicFooter />
    </div>
  );
}
