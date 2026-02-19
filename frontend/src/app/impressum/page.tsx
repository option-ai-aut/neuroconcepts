'use client';

import PublicNavigation from '@/components/PublicNavigation';
import PublicFooter from '@/components/PublicFooter';

export default function ImpressumPage() {
  return (
    <div className="min-h-screen bg-white">
      <PublicNavigation currentPage="impressum" />

      <section className="pt-24 sm:pt-32 pb-16 sm:pb-24">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 animate-fade-in">
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-12">Impressum</h1>

          <div className="space-y-10">
            {/* § 5 ECG */}
            <section>
              <h2 className="text-lg font-semibold text-gray-900 mb-4 border-l-2 border-blue-600 pl-3">Angaben gemäß § 5 ECG</h2>
              <div className="text-gray-600 space-y-1 text-sm leading-relaxed">
                <p><strong>Leutgeb Holding &amp; Management GmbH</strong></p>
                <p>Sterngasse 3</p>
                <p>1010 Wien</p>
                <p>Österreich</p>
                <p className="pt-2">Firmenbuchnummer: FN 499420 t</p>
                <p>Firmenbuchgericht: Handelsgericht Wien</p>
                <p>UID-Nummer: ATU73967718</p>
                <p className="pt-2">Geschäftsführer: Josef Leutgeb</p>
                <p>Aufsichtsbehörde: Magistratisches Bezirksamt des I. Bezirks</p>
              </div>
            </section>

            {/* Kontakt */}
            <section>
              <h2 className="text-lg font-semibold text-gray-900 mb-4 border-l-2 border-blue-600 pl-3">Kontakt</h2>
              <div className="text-gray-600 space-y-1 text-sm leading-relaxed">
                <p>E-Mail: <a href="mailto:office@immivo.ai" className="text-gray-900 hover:underline">office@immivo.ai</a></p>
              </div>
            </section>

            {/* EU-Streitschlichtung */}
            <section>
              <h2 className="text-lg font-semibold text-gray-900 mb-4 border-l-2 border-blue-600 pl-3">EU-Streitschlichtung</h2>
              <p className="text-gray-600 text-sm leading-relaxed">
                Die Europäische Kommission stellt eine Plattform zur Online-Streitbeilegung (OS) bereit:{' '}
                <a
                  href="https://ec.europa.eu/consumers/odr"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-900 hover:underline break-all"
                >
                  https://ec.europa.eu/consumers/odr
                </a>
              </p>
              <p className="text-gray-600 text-sm leading-relaxed mt-3">
                Wir sind nicht bereit oder verpflichtet, an Streitbeilegungsverfahren vor einer Verbraucherschlichtungsstelle teilzunehmen.
              </p>
            </section>

            {/* Haftung für Inhalte */}
            <section>
              <h2 className="text-lg font-semibold text-gray-900 mb-4 border-l-2 border-blue-600 pl-3">Haftung für Inhalte</h2>
              <p className="text-gray-600 text-sm leading-relaxed">
                Als Diensteanbieter sind wir gemäß § 7 Abs. 1 ECG für eigene Inhalte auf diesen Seiten nach den allgemeinen Gesetzen verantwortlich. Nach §§ 8 bis 10 ECG sind wir als Diensteanbieter jedoch nicht verpflichtet, übermittelte oder gespeicherte fremde Informationen zu überwachen oder nach Umständen zu forschen, die auf eine rechtswidrige Tätigkeit hinweisen.
              </p>
              <p className="text-gray-600 text-sm leading-relaxed mt-3">
                Verpflichtungen zur Entfernung oder Sperrung der Nutzung von Informationen nach den allgemeinen Gesetzen bleiben hiervon unberührt. Eine diesbezügliche Haftung ist jedoch erst ab dem Zeitpunkt der Kenntnis einer konkreten Rechtsverletzung möglich. Bei Bekanntwerden von entsprechenden Rechtsverletzungen werden wir diese Inhalte umgehend entfernen.
              </p>
            </section>

            {/* Haftung für Links */}
            <section>
              <h2 className="text-lg font-semibold text-gray-900 mb-4 border-l-2 border-blue-600 pl-3">Haftung für Links</h2>
              <p className="text-gray-600 text-sm leading-relaxed">
                Unser Angebot enthält Links zu externen Websites Dritter, auf deren Inhalte wir keinen Einfluss haben. Deshalb können wir für diese fremden Inhalte auch keine Gewähr übernehmen. Für die Inhalte der verlinkten Seiten ist stets der jeweilige Anbieter oder Betreiber der Seiten verantwortlich. Die verlinkten Seiten wurden zum Zeitpunkt der Verlinkung auf mögliche Rechtsverstöße überprüft. Rechtswidrige Inhalte waren zum Zeitpunkt der Verlinkung nicht erkennbar.
              </p>
              <p className="text-gray-600 text-sm leading-relaxed mt-3">
                Eine permanente inhaltliche Kontrolle der verlinkten Seiten ist jedoch ohne konkrete Anhaltspunkte einer Rechtsverletzung nicht zumutbar. Bei Bekanntwerden von Rechtsverletzungen werden wir derartige Links umgehend entfernen.
              </p>
            </section>

            {/* Urheberrecht */}
            <section>
              <h2 className="text-lg font-semibold text-gray-900 mb-4 border-l-2 border-blue-600 pl-3">Urheberrecht</h2>
              <p className="text-gray-600 text-sm leading-relaxed">
                Die durch die Seitenbetreiber erstellten Inhalte und Werke auf diesen Seiten unterliegen dem österreichischen Urheberrecht. Die Vervielfältigung, Bearbeitung, Verbreitung und jede Art der Verwertung außerhalb der Grenzen des Urheberrechtes bedürfen der schriftlichen Zustimmung des jeweiligen Autors bzw. Erstellers. Downloads und Kopien dieser Seite sind nur für den privaten, nicht kommerziellen Gebrauch gestattet.
              </p>
              <p className="text-gray-600 text-sm leading-relaxed mt-3">
                Soweit die Inhalte auf dieser Seite nicht vom Betreiber erstellt wurden, werden die Urheberrechte Dritter beachtet. Insbesondere werden Inhalte Dritter als solche gekennzeichnet. Sollten Sie trotzdem auf eine Urheberrechtsverletzung aufmerksam werden, bitten wir um einen entsprechenden Hinweis. Bei Bekanntwerden von Rechtsverletzungen werden wir derartige Inhalte umgehend entfernen.
              </p>
            </section>

            {/* Medieninhaber § 25 MedienG */}
            <section>
              <h2 className="text-lg font-semibold text-gray-900 mb-4 border-l-2 border-blue-600 pl-3">Medieninhaber gemäß § 25 MedienG</h2>
              <div className="text-gray-600 space-y-2 text-sm leading-relaxed">
                <p><strong>Leutgeb Holding &amp; Management GmbH</strong></p>
                <p>Sterngasse 3, 1010 Wien, Österreich</p>
                <p className="pt-2">Unternehmensgegenstand: Entwicklung und Vertrieb von KI-gestützter Software für die Immobilienbranche</p>
              </div>
            </section>

            {/* Verantwortlich für den Inhalt */}
            <section>
              <h2 className="text-lg font-semibold text-gray-900 mb-4 border-l-2 border-blue-600 pl-3">Verantwortlich für den Inhalt</h2>
              <p className="text-gray-600 text-sm leading-relaxed">
                Josef Leutgeb
              </p>
            </section>
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
