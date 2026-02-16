'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Mail, MapPin, Lock } from 'lucide-react';
import { useTranslations } from 'next-intl';
import LanguageSwitcher from '@/components/LanguageSwitcher';

export default function PublicFooter() {
  const t = useTranslations('footer');
  const nav = useTranslations('publicNav');

  return (
    <footer className="bg-gray-900 text-white py-12 md:py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-8 md:gap-12 mb-8 md:mb-12">
          <div className="col-span-2">
            <Link href="/" className="inline-block mb-4 md:mb-6">
              <Image src="/logo-white.png" alt="Immivo" width={160} height={160} className="w-28 sm:w-36 h-auto" />
            </Link>
            <p className="text-gray-400 text-sm leading-relaxed mb-4">
              {t('brandDescription')}
            </p>
            <div className="space-y-2 text-sm text-gray-400">
              <a href="mailto:office@immivo.ai" className="flex items-center gap-2 hover:text-white transition-colors">
                <Mail className="w-4 h-4 flex-shrink-0" />
                office@immivo.ai
              </a>
              <div className="flex items-start gap-2">
                <MapPin className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>Dynamo Lab Technologies GmbH<br />Sterngasse 3, 1010 Wien</span>
              </div>
            </div>
          </div>

          <div>
            <h4 className="font-semibold mb-4">{t('product')}</h4>
            <ul className="space-y-3 text-gray-400 text-sm">
              <li><Link href="/#jarvis" className="hover:text-white transition-colors">{nav('jarvisAi')}</Link></li>
              <li><Link href="/#features" className="hover:text-white transition-colors">{nav('features')}</Link></li>
              <li><Link href="/#bildbearbeitung" className="hover:text-white transition-colors">{nav('aiImageEditing')}</Link></li>
              <li><Link href="/preise" className="hover:text-white transition-colors">{nav('pricing')}</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-4">{t('company')}</h4>
            <ul className="space-y-3 text-gray-400 text-sm">
              <li><Link href="/ueber-uns" className="hover:text-white transition-colors">{nav('aboutUs')}</Link></li>
              <li><Link href="/blog" className="hover:text-white transition-colors">{nav('blog')}</Link></li>
              <li><Link href="/karriere" className="hover:text-white transition-colors">{nav('careers')}</Link></li>
              <li><Link href="/kontakt" className="hover:text-white transition-colors">{nav('contact')}</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-4">{t('legal')}</h4>
            <ul className="space-y-3 text-gray-400 text-sm">
              <li><Link href="/datenschutz" className="hover:text-white transition-colors">{t('privacy')}</Link></li>
              <li><Link href="/agb" className="hover:text-white transition-colors">{t('terms')}</Link></li>
              <li><Link href="/impressum" className="hover:text-white transition-colors">{t('imprint')}</Link></li>
            </ul>
          </div>
        </div>

        <div className="pt-8 border-t border-gray-800 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-sm text-gray-500 text-center md:text-left">{t('copyright')}</p>
          <div className="flex items-center gap-4">
            <LanguageSwitcher variant="footer" />
            <div className="flex items-center gap-1.5 text-sm text-gray-500">
              <Lock className="w-3.5 h-3.5" />
              {t('securePayment')}
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <span className="flex w-2 h-2 bg-green-500 rounded-full"></span>
              {t('systemsOperational')}
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
