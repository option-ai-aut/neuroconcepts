'use client';

import Link from 'next/link';
import PublicNavigation from '@/components/PublicNavigation';
import PublicFooter from '@/components/PublicFooter';

export default function AGBPage() {
  return (
    <div className="min-h-screen bg-white">
      <PublicNavigation currentPage="terms" />

      <section className="pt-24 sm:pt-32 pb-16 sm:pb-24">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 animate-fade-in">
          <header className="mb-10 sm:mb-12">
            <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900 tracking-tight">
              Allgemeine Geschäftsbedingungen
            </h1>
            <p className="mt-2 text-sm text-gray-500">
              Stand: Februar 2026
            </p>
          </header>

          <div className="space-y-10">
            {/* Anbieter */}
            <section className="rounded-xl bg-gray-50 p-6 border border-gray-100">
              <h2 className="text-lg font-semibold text-gray-900 mb-3 border-l-2 border-blue-600 pl-3">
                Anbieter
              </h2>
              <address className="not-italic text-gray-600 leading-relaxed">
                <strong>Leutgeb Holding &amp; Management GmbH</strong><br />
                Sterngasse 3<br />
                1010 Wien, Österreich<br />
                E-Mail:{' '}
                <a href="mailto:office@immivo.ai" className="text-blue-600 hover:text-blue-700 hover:underline">
                  office@immivo.ai
                </a>
              </address>
            </section>

            {/* § 1 */}
            <section>
              <h2 className="text-xl font-bold text-gray-900 mb-4 border-l-2 border-blue-600 pl-3">
                § 1 Geltungsbereich
              </h2>
              <p className="text-gray-600 leading-relaxed">
                Diese Allgemeinen Geschäftsbedingungen (AGB) gelten für alle Leistungen, die die Leutgeb Holding & Management GmbH
                über die Plattform immivo.ai sowie app.immivo.ai erbringt. Abweichende oder ergänzende
                Bedingungen des Kunden werden nur dann und insoweit Vertragsbestandteil, als die Leutgeb Holding & Management GmbH
                ihrer Geltung ausdrücklich schriftlich zugestimmt hat.
              </p>
            </section>

            {/* § 2 */}
            <section>
              <h2 className="text-xl font-bold text-gray-900 mb-4 border-l-2 border-blue-600 pl-3">
                § 2 Vertragsgegenstand
              </h2>
              <p className="text-gray-600 leading-relaxed mb-4">
                Die Leutgeb Holding & Management GmbH betreibt eine Software-as-a-Service (SaaS) Plattform für Immobilienmakler
                und Immobilienvermittler. Der Vertragsgegenstand umfasst insbesondere folgende Leistungen:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-gray-600">
                <li><strong>CRM und Lead-Management:</strong> Verwalten von Kontakten, Leads und Objekten</li>
                <li><strong>KI-Assistent „Jarvis“:</strong> Unterstützung bei E-Mail-Klassifizierung, Lead-Qualifizierung und Formulierungen</li>
                <li><strong>KI-Bildbearbeitung (Virtual Staging):</strong> Virtuelle Einrichtung und Bildoptimierung von Immobilienfotos</li>
                <li><strong>Exposé-Editor:</strong> Erstellung und Bearbeitung von Exposés</li>
                <li><strong>E-Mail-Automatisierung:</strong> Automatisierte E-Mail-Kommunikation und Templates</li>
                <li><strong>Kalenderintegration:</strong> Anbindung von Kalendersystemen zur Terminverwaltung</li>
                <li><strong>Portal-Integrationen:</strong> Anbindung an bis zu 24 Immobilienportale für Veröffentlichung</li>
              </ul>
            </section>

            {/* § 3 */}
            <section>
              <h2 className="text-xl font-bold text-gray-900 mb-4 border-l-2 border-blue-600 pl-3">
                § 3 Vertragsschluss und Registrierung
              </h2>
              <p className="text-gray-600 leading-relaxed mb-4">
                Der Vertrag kommt durch die Registrierung auf der Plattform sowie die ausdrückliche
                Annahme dieser AGB beim Erstellen eines Nutzerkontos zustande. Mit der Registrierung
                bestätigt der Kunde, dass er diese AGB gelesen, verstanden und akzeptiert hat.
              </p>
              <p className="text-gray-600 leading-relaxed mb-4">
                Die Dienste richten sich ausschließlich an <strong>gewerbliche Kunden (B2B)</strong>.
                Die Nutzung erfolgt im Rahmen der beruflichen oder gewerblichen Tätigkeit des Kunden.
              </p>
              <p className="text-gray-600 leading-relaxed">
                Der Nutzer muss das 18. Lebensjahr vollendet haben. Mit der Registrierung bestätigt
                der Nutzer, dass er die erforderliche Berechtigung besitzt, Verträge für die angegebene
                Organisation abzuschließen.
              </p>
            </section>

            {/* § 4 */}
            <section>
              <h2 className="text-xl font-bold text-gray-900 mb-4 border-l-2 border-blue-600 pl-3">
                § 4 Kostenlose Testphase
              </h2>
              <p className="text-gray-600 leading-relaxed mb-4">
                Neukunden erhalten eine <strong>kostenlose Testphase von einer Woche</strong>. Während
                dieser Zeit stehen die Leistungen mit folgenden Einschränkungen zur Verfügung:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-gray-600 mb-4">
                <li>Jarvis KI-Assistent: maximal 20 Eingaben</li>
                <li>Bildstudio (Virtual Staging): maximal 3 Bildgenerierungen</li>
                <li>Kein Portal-Push (Veröffentlichung auf Immobilienportalen)</li>
              </ul>
              <p className="text-gray-600 leading-relaxed mb-4">
                Die Testphase endet automatisch nach Ablauf von sieben Tagen. Es erfolgt <strong>keine
                automatische Umstellung</strong> auf einen kostenpflichtigen Tarif. Der Kunde muss
                nach Ablauf der Testphase eigenständig einen Bezahlplan auswählen, um die Leistungen
                weiterhin nutzen zu können.
              </p>
              <p className="text-gray-600 leading-relaxed">
                Nach Ende der Testphase steht der Zugang ohne aktives Abonnement nicht mehr zur Verfügung.
              </p>
            </section>

            {/* § 5 */}
            <section>
              <h2 className="text-xl font-bold text-gray-900 mb-4 border-l-2 border-blue-600 pl-3">
                § 5 Leistungsumfang und Tarife
              </h2>
              <p className="text-gray-600 leading-relaxed mb-4">
                Die Leutgeb Holding & Management GmbH bietet folgende Tarife mit jeweils vollem Funktionszugang an:
              </p>
              <ul className="space-y-3 text-gray-600 mb-4">
                <li className="flex flex-wrap gap-2 items-baseline">
                  <strong className="text-gray-900">Solo:</strong>
                  <span>149 €/Monat, 1 Nutzer (Seat)</span>
                </li>
                <li className="flex flex-wrap gap-2 items-baseline">
                  <strong className="text-gray-900">Team:</strong>
                  <span>699 €/Monat, 5 Nutzer (Seats)</span>
                </li>
                <li className="flex flex-wrap gap-2 items-baseline">
                  <strong className="text-gray-900">Enterprise:</strong>
                  <span>Individuell, ab 6 Nutzer (Seats), auf Anfrage</span>
                </li>
              </ul>
              <p className="text-gray-600 leading-relaxed">
                Bei jährlicher Abrechnung gewährt die Leutgeb Holding & Management GmbH einen <strong>Rabatt von 10 %</strong> auf
                die Jahressumme. Alle Tarife beinhalten den vollen Zugang zu den in § 2 genannten
                Leistungen innerhalb der jeweiligen Nutzerobergrenze.
              </p>
            </section>

            {/* § 6 */}
            <section>
              <h2 className="text-xl font-bold text-gray-900 mb-4 border-l-2 border-blue-600 pl-3">
                § 6 Preise und Zahlung
              </h2>
              <p className="text-gray-600 leading-relaxed mb-4">
                Alle Preise verstehen sich in Euro (EUR) zuzüglich der gesetzlich vorgeschriebenen
                Mehrwertsteuer. Die Abrechnung erfolgt monatlich oder jährlich im Voraus je nach
                gewähltem Abrechnungszyklus.
              </p>
              <p className="text-gray-600 leading-relaxed mb-4">
                Als Zahlungsmethoden werden Kreditkarte und SEPA-Lastschrift akzeptiert. Der Kunde
                stellt sicher, dass die hinterlegten Zahlungsdaten gültig sind und ausreichende
                Deckung besteht.
              </p>
              <p className="text-gray-600 leading-relaxed">
                Rechnungen werden per E-Mail an die vom Kunden angegebene Adresse versandt. Die
                Zahlung ist innerhalb von 14 Tagen nach Rechnungsdatum fällig, sofern nichts
                Abweichendes vereinbart wurde.
              </p>
            </section>

            {/* § 7 */}
            <section>
              <h2 className="text-xl font-bold text-gray-900 mb-4 border-l-2 border-blue-600 pl-3">
                § 7 Kündigung
              </h2>
              <p className="text-gray-600 leading-relaxed mb-4">
                <strong>Monatliche Verträge:</strong> Der Kunde kann jederzeit zum Ende des aktuellen
                Abrechnungszeitraums kündigen. Die Kündigung wird mit Wirkung zum Ende des laufenden
                Monats wirksam.
              </p>
              <p className="text-gray-600 leading-relaxed mb-4">
                <strong>Jährliche Verträge:</strong> Der Kunde kann jederzeit zum Ende des
                Abrechnungsjahres kündigen. Die Kündigung wird mit Wirkung zum Ende der gebuchten
                Jahreslaufzeit wirksam.
              </p>
              <p className="text-gray-600 leading-relaxed mb-4">
                Die Kündigung kann über die Kontoeinstellungen in der Plattform oder per E-Mail an
                office@immivo.ai erfolgen.
              </p>
              <p className="text-gray-600 leading-relaxed">
                Eine Rückerstattung bereits gezahlter Beträge für teilweise genutzte Abrechnungszeiträume
                erfolgt nicht. Bei vorzeitiger Kündigung verbleibt die Berechtigung zur Nutzung bis
                zum Ende der bereits bezahlten Laufzeit.
              </p>
            </section>

            {/* § 8 - KI */}
            <section className="rounded-xl border-2 border-amber-100 bg-amber-50/50 p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4 border-l-2 border-blue-600 pl-3">
                § 8 KI-Dienste und Haftung
              </h2>
              <p className="text-gray-600 leading-relaxed mb-4">
                Die Plattform umfasst KI-gestützte Dienste (insbesondere den KI-Assistenten Jarvis,
                Bildbearbeitung/Virtual Staging und Exposé-Erstellung).
                Diese Dienste dienen ausschließlich als <strong>unterstützende Hilfsmittel</strong> und
                ersetzen nicht die eigenverantwortliche fachliche Beurteilung des Nutzers.
              </p>
              <ul className="list-disc pl-6 space-y-2 text-gray-600 mb-4">
                <li>Es wird keine Garantie für die Richtigkeit, Vollständigkeit oder Eignung der von der KI generierten Ausgaben übernommen.</li>
                <li>Der Nutzer ist verpflichtet, alle von der KI erzeugten Inhalte vor deren Verwendung zu prüfen und eigenverantwortlich freizugeben.</li>
                <li>KI-generierte Bilder können die Realität nicht perfekt abbilden und dienen ausschließlich als Darstellungs- oder Verkaufsunterstützung.</li>
                <li>Die Leutgeb Holding & Management GmbH haftet nicht für Entscheidungen, Schäden oder Folgen, die der Nutzer oder Dritte auf Grundlage von KI-Empfehlungen oder KI-generierten Inhalten treffen oder erleiden.</li>
              </ul>
              <p className="text-gray-600 leading-relaxed">
                Der Nutzer trägt die Verantwortung für die rechtmäßige Verwendung aller aus der Plattform
                stammenden Inhalte, einschließlich derer, die mithilfe von KI erstellt wurden.
              </p>
            </section>

            {/* § 9 */}
            <section>
              <h2 className="text-xl font-bold text-gray-900 mb-4 border-l-2 border-blue-600 pl-3">
                § 9 Nutzungsrechte und Pflichten
              </h2>
              <p className="text-gray-600 leading-relaxed mb-4">
                Der Nutzer behält das Eigentum an allen von ihm hochgeladenen Daten und Inhalten.
                Die Leutgeb Holding & Management GmbH erhält eine zeitlich und räumlich beschränkte, nicht-exklusive,
                übertragbare Lizenz zur Verarbeitung dieser Daten ausschließlich zum Zweck der
                Erbringung der vertraglichen Leistungen.
              </p>
              <p className="text-gray-600 leading-relaxed mb-4">
                Der Nutzer stellt sicher, dass er keine rechtswidrigen, beleidigenden oder
                urheberrechtlich geschützten Inhalte Dritter ohne erforderliche Berechtigung
                hochlädt. Die Leutgeb Holding & Management GmbH behält sich vor, solche Inhalte zu entfernen und den
                Zugang bei wiederholten Verstößen zu sperren.
              </p>
              <p className="text-gray-600 leading-relaxed">
                Der Nutzer ist für die Wahrung der Vertraulichkeit seiner Zugangsdaten
                verantwortlich. Bei bekanntgewordenem Missbrauch oder unbefugtem Zugriff hat er
                die Leutgeb Holding & Management GmbH unverzüglich zu informieren.
              </p>
            </section>

            {/* § 10 */}
            <section>
              <h2 className="text-xl font-bold text-gray-900 mb-4 border-l-2 border-blue-600 pl-3">
                § 10 Datenschutz
              </h2>
              <p className="text-gray-600 leading-relaxed">
                Die Verarbeitung personenbezogener Daten erfolgt gemäß der geltenden
                Datenschutz-Grundverordnung (DSGVO) und unserer{' '}
                <Link href="/privacy" className="text-blue-600 hover:text-blue-700 hover:underline font-medium">
                  Datenschutzerklärung
                </Link>
                , die unter /privacy abrufbar ist. Durch die Nutzung der Plattform
                erkennt der Nutzer die Datenschutzerklärung an.
              </p>
            </section>

            {/* § 11 */}
            <section>
              <h2 className="text-xl font-bold text-gray-900 mb-4 border-l-2 border-blue-600 pl-3">
                § 11 Verfügbarkeit
              </h2>
              <p className="text-gray-600 leading-relaxed mb-4">
                Die Leutgeb Holding & Management GmbH bemüht sich um eine monatliche Verfügbarkeit der Plattform von
                <strong> 99,5 %</strong>. Geplante Wartungsarbeiten bleiben von dieser Zielvorgabe
                ausgenommen und werden dem Nutzer nach Möglichkeit rechtzeitig angekündigt.
              </p>
              <p className="text-gray-600 leading-relaxed">
                Für Ausfälle aufgrund höherer Gewalt (z. B. Naturkatastrophen, Kriege, Pandemien,
                behördliche Maßnahmen, schwerwiegende Störungen bei Infrastruktur- oder
                Rechenzentrumsanbietern) übernimmt die Leutgeb Holding & Management GmbH keine Haftung.
              </p>
            </section>

            {/* § 12 */}
            <section>
              <h2 className="text-xl font-bold text-gray-900 mb-4 border-l-2 border-blue-600 pl-3">
                § 12 Haftungsbeschränkung
              </h2>
              <p className="text-gray-600 leading-relaxed mb-4">
                Die Haftung der Leutgeb Holding & Management GmbH ist auf Schäden begrenzt, die in unmittelbarem
                Zusammenhang mit der Erbringung der vertraglichen Leistung stehen und vorhersehbar
                sowie vertragstypisch sind. Die Ersatzpflicht ist auf die in den letzten zwölf
                Monaten vom Nutzer gezahlten Abonnementgebühren begrenzt.
              </p>
              <p className="text-gray-600 leading-relaxed mb-4">
                Von dieser Begrenzung ausgenommen ist die Haftung für vorsätzlich oder grob
                fahrlässig verursachte Schäden, für Personenschäden sowie für Schäden aus der
                Verletzung wesentlicher Vertragspflichten.
              </p>
              <p className="text-gray-600 leading-relaxed">
                Eine Haftung für mittelbare Schäden, entgangenen Gewinn, Folgeschäden oder
                Datenverluste, soweit diese nicht durch vorsätzliches oder grob fahrlässiges
                Verhalten verursacht wurden, wird ausgeschlossen. Es gilt österreichisches Recht.
              </p>
            </section>

            {/* § 13 */}
            <section>
              <h2 className="text-xl font-bold text-gray-900 mb-4 border-l-2 border-blue-600 pl-3">
                § 13 Gewährleistung
              </h2>
              <p className="text-gray-600 leading-relaxed mb-4">
                Die Software wird im Rahmen eines SaaS-Modells grundsätzlich „wie besehen“
                („as is“) zur Verfügung gestellt. Die Leutgeb Holding & Management GmbH bemüht sich um einen
                zuverlässigen Betrieb und die Behebung von Mängeln.
              </p>
              <p className="text-gray-600 leading-relaxed">
                Für KI-Funktionen wird nur auf <strong>Best-Effort-Basis</strong> eine
                bestmögliche Qualität angestrebt. Eine rechtliche Garantie für die
                Ergebnisqualität von KI-generierten Inhalten wird nicht übernommen.
              </p>
            </section>

            {/* § 14 */}
            <section>
              <h2 className="text-xl font-bold text-gray-900 mb-4 border-l-2 border-blue-600 pl-3">
                § 14 Änderungen der AGB
              </h2>
              <p className="text-gray-600 leading-relaxed mb-4">
                Die Leutgeb Holding & Management GmbH ist berechtigt, diese AGB unter Einhaltung einer
                <strong> Ankündigungsfrist von 30 Tagen</strong> zu ändern. Die Änderungen
                werden dem Nutzer per E-Mail oder über eine Mitteilung in der Plattform
                mitgeteilt.
              </p>
              <p className="text-gray-600 leading-relaxed">
                Widerspricht der Nutzer der Änderung nicht innerhalb von 14 Tagen nach Zugang
                der Mitteilung oder nutzt er die Plattform nach Ablauf der Ankündigungsfrist
                weiter, gilt die Änderung als angenommen. Auf das Widerspruchsrecht wird in
                der Änderungsmitteilung hingewiesen.
              </p>
            </section>

            {/* § 15 */}
            <section>
              <h2 className="text-xl font-bold text-gray-900 mb-4 border-l-2 border-blue-600 pl-3">
                § 15 Schlussbestimmungen
              </h2>
              <ul className="list-disc pl-6 space-y-2 text-gray-600">
                <li><strong>Anwendbares Recht:</strong> Es gilt das Recht der Republik Österreich unter Ausschluss des UN-Kaufrechts.</li>
                <li><strong>Gerichtsstand:</strong> Für alle Streitigkeiten aus oder im Zusammenhang mit diesem Vertrag ist ausschließlich das sachlich zuständige Gericht am Sitz der Leutgeb Holding & Management GmbH (Wien) zuständig.</li>
                <li><strong>Salvatorische Klausel:</strong> Sollten einzelne Bestimmungen dieser AGB unwirksam oder undurchführbar sein oder werden, bleibt die Wirksamkeit der übrigen Bestimmungen unberührt.</li>
                <li><strong>Schriftform:</strong> Änderungen und Ergänzungen dieses Vertrages bedürfen zu ihrer Wirksamkeit der Schriftform. Dies gilt auch für die Aufhebung des Schriftformerfordernisses.</li>
              </ul>
            </section>

            <p className="text-sm text-gray-500 pt-6 border-t border-gray-200">
              Letzte Aktualisierung: Februar 2026
            </p>
          </div>
        </div>
      </section>

      <style jsx global>{`
        @keyframes fade-in {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fade-in {
          animation: fade-in 0.6s ease-out forwards;
        }
      `}</style>

      <PublicFooter />
    </div>
  );
}
