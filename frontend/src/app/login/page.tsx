'use client';

import { Authenticator, useAuthenticator } from '@aws-amplify/ui-react';
import '@aws-amplify/ui-react/styles.css';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { syncUser } from '@/lib/api';

export default function LoginPage() {
  const { user, authStatus } = useAuthenticator((context) => [context.user, context.authStatus]);
  const router = useRouter();

  useEffect(() => {
    if (authStatus === 'authenticated') {
      // Sync user with backend
      syncUser().then(() => {
        router.push('/dashboard');
      }).catch(err => {
        console.error('Sync failed', err);
        // Still redirect to dashboard, maybe show error there?
        router.push('/dashboard');
      });
    }
  }, [authStatus, router]);

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-white">
      {/* Left Side - Image/Brand (Hidden on Mobile) */}
      <div className="hidden lg:flex lg:w-1/2 relative bg-gray-900 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-600/20 to-blue-600/20 z-10" />
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?q=80&w=2070&auto=format&fit=crop')] bg-cover bg-center opacity-40" />
        
        <div className="relative z-20 flex flex-col justify-between h-full p-12 text-white">
          <div className="flex items-center">
            <div className="w-8 h-8 bg-white/10 backdrop-blur-md rounded-lg flex items-center justify-center mr-3 border border-white/20">
              <span className="font-bold text-lg">N</span>
            </div>
            <span className="font-bold text-xl tracking-tight">NeuroConcepts</span>
          </div>
          
          <div className="max-w-md">
            <h2 className="text-4xl font-bold mb-6">Willkommen zurück.</h2>
            <p className="text-lg text-gray-300 leading-relaxed">
              Dein intelligenter Assistent für Immobilienvertrieb. Automatisiere Kommunikation, Termine und Exposés, damit du dich auf das Wesentliche konzentrieren kannst.
            </p>
          </div>
          
          <div className="text-sm text-gray-400">
            © 2026 NeuroConcepts AI
          </div>
        </div>
      </div>

      {/* Right Side - Login Form */}
      <div className="flex-1 flex flex-col py-6 lg:py-8 px-4 sm:px-6 lg:px-12 xl:px-20 relative bg-white overflow-y-auto">
        {/* Back Button - Fixed at top */}
        <div className="flex-shrink-0 mb-4 lg:mb-6">
          <Link 
            href="/" 
            className="group inline-flex items-center px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 bg-gray-50 hover:bg-gray-100 rounded-full transition-all"
          >
            <ArrowLeft className="w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform" />
            Zurück zur Startseite
          </Link>
        </div>

        {/* Centered Content */}
        <div className="flex-1 flex flex-col justify-center">
          {/* Mobile Logo */}
          <div className="mb-6 lg:hidden text-center">
          <div className="flex items-center justify-center">
            <div className="w-12 h-12 bg-gradient-to-br from-indigo-600 to-violet-600 rounded-xl flex items-center justify-center shadow-lg">
              <span className="text-white font-bold text-2xl">N</span>
            </div>
          </div>
          <h2 className="mt-4 text-2xl font-extrabold text-gray-900">
            NeuroConcepts
          </h2>
        </div>

        <div className="mx-auto w-full max-w-md">
          <div className="bg-white">
            <style jsx global>{`
              [data-amplify-authenticator] {
                --amplify-colors-background-primary: white;
                --amplify-components-authenticator-router-box-shadow: none;
                --amplify-components-authenticator-router-border-width: 0;
                --amplify-components-button-primary-background-color: #4f46e5;
                --amplify-components-button-primary-hover-background-color: #4338ca;
                --amplify-components-tabs-item-active-border-color: #4f46e5;
                --amplify-components-tabs-item-color: #6b7280;
                --amplify-components-tabs-item-active-color: #4f46e5;
                --amplify-components-fieldcontrol-border-color: #e5e7eb;
                --amplify-components-fieldcontrol-focus-border-color: #4f46e5;
                --amplify-radii-small: 8px;
                --amplify-radii-medium: 12px;
              }
              [data-amplify-authenticator] [data-amplify-router] {
                border: none;
                box-shadow: none;
              }
              .amplify-input {
                border-radius: 8px !important;
              }
              .amplify-button--primary {
                border-radius: 8px !important;
              }
              .amplify-tabs__item {
                font-weight: 500;
              }
            `}</style>
            <Authenticator 
              initialState="signIn"
              components={{
                Header: () => null,
                SignIn: {
                  Header: () => (
                    <div className="text-center mb-6">
                      <h3 className="text-2xl font-bold text-gray-900">Anmelden</h3>
                      <p className="text-sm text-gray-500 mt-2">Zugang zu deinem Dashboard</p>
                    </div>
                  )
                },
                SignUp: {
                  Header: () => (
                    <div className="text-center mb-6">
                      <h3 className="text-2xl font-bold text-gray-900">Konto erstellen</h3>
                      <p className="text-sm text-gray-500 mt-2">Starte deine 14-tägige Testphase</p>
                    </div>
                  ),
                  Footer: () => (
                    <div className="text-center mt-4">
                      <p className="text-xs text-gray-400">
                        Mit der Registrierung akzeptierst du unsere{' '}
                        <Link href="/agb" className="text-indigo-600 hover:underline">AGB</Link> und{' '}
                        <Link href="/datenschutz" className="text-indigo-600 hover:underline">Datenschutzerklärung</Link>.
                      </p>
                    </div>
                  )
                }
              }}
              formFields={{
                signIn: {
                  username: {
                    placeholder: '',
                    label: 'E-Mail'
                  },
                  password: {
                    placeholder: '',
                    label: 'Passwort'
                  }
                },
                signUp: {
                  username: {
                    order: 1,
                    label: 'E-Mail',
                    placeholder: ''
                  },
                  password: {
                    label: 'Passwort',
                    placeholder: '',
                    order: 2
                  },
                  confirm_password: {
                    label: 'Passwort bestätigen',
                    placeholder: '',
                    order: 3
                  },
                  given_name: {
                    label: 'Vorname',
                    placeholder: '',
                    order: 4,
                    isRequired: true
                  },
                  family_name: {
                    label: 'Nachname',
                    placeholder: '',
                    order: 5,
                    isRequired: true
                  },
                  'custom:company_name': {
                    label: 'Firmenname',
                    placeholder: '',
                    order: 6,
                    isRequired: false
                  },
                  phone_number: {
                    label: 'Telefon (mit Vorwahl)',
                    placeholder: '+43',
                    order: 7,
                    isRequired: false
                  },
                  address: {
                    label: 'Straße & Hausnummer',
                    placeholder: '',
                    order: 8,
                    isRequired: false
                  },
                  'custom:postal_code': {
                    label: 'PLZ',
                    placeholder: '',
                    order: 9,
                    isRequired: false
                  },
                  'custom:city': {
                    label: 'Ort',
                    placeholder: '',
                    order: 10,
                    isRequired: false
                  },
                  'custom:country': {
                    label: 'Land',
                    placeholder: 'Österreich',
                    order: 11,
                    isRequired: false
                  }
                }
              }}
            >
              {({ signOut, user }) => (
                <div className="text-center">
                  <p>Erfolgreich angemeldet!</p>
                  <button onClick={signOut}>Abmelden</button>
                </div>
              )}
            </Authenticator>
          </div>
        </div>
        </div>
      </div>
    </div>
  );
}
