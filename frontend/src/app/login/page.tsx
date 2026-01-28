'use client';

import { Authenticator, useAuthenticator } from '@aws-amplify/ui-react';
import '@aws-amplify/ui-react/styles.css';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function LoginPage() {
  const { user, authStatus } = useAuthenticator((context) => [context.user, context.authStatus]);
  const router = useRouter();

  useEffect(() => {
    if (authStatus === 'authenticated') {
      router.push('/dashboard');
    }
  }, [authStatus, router]);

  return (
    <div className="min-h-screen flex bg-white">
      {/* Left Side - Image/Brand */}
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
              Jarvis hat heute bereits 12 Anfragen beantwortet und 3 Termine für dich gebucht. Logge dich ein, um den Status zu prüfen.
            </p>
          </div>
          
          <div className="text-sm text-gray-400">
            © 2026 NeuroConcepts AI
          </div>
        </div>
      </div>

      {/* Right Side - Login Form */}
      <div className="flex-1 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-20 xl:px-24">
        <div className="mx-auto w-full max-w-sm lg:w-96">
          <div className="mb-8 lg:hidden">
            <div className="flex items-center justify-center">
              <div className="w-10 h-10 bg-indigo-600 rounded-lg flex items-center justify-center shadow-lg">
                <span className="text-white font-bold text-xl">N</span>
              </div>
            </div>
            <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
              NeuroConcepts
            </h2>
          </div>

          <div className="mb-6">
            <Link href="/" className="flex items-center text-sm text-gray-500 hover:text-gray-900 transition-colors">
              <ArrowLeft className="w-4 h-4 mr-1" />
              Zurück zur Startseite
            </Link>
          </div>

          <div className="bg-white">
            <Authenticator 
              initialState="signIn"
              components={{
                Header: () => (
                  <div className="text-center mb-6">
                    <h3 className="text-xl font-bold text-gray-900">Anmelden</h3>
                    <p className="text-sm text-gray-500 mt-1">Zugang zu deinem Dashboard</p>
                  </div>
                )
              }}
              formFields={{
                signIn: {
                  username: {
                    placeholder: 'E-Mail Adresse',
                    label: 'E-Mail'
                  },
                  password: {
                    placeholder: 'Passwort',
                    label: 'Passwort'
                  }
                },
                signUp: {
                  email: {
                    label: 'E-Mail',
                    placeholder: 'E-Mail Adresse',
                    order: 1
                  },
                  password: {
                    label: 'Passwort',
                    placeholder: 'Passwort erstellen',
                    order: 2
                  },
                  confirmPassword: {
                    label: 'Passwort bestätigen',
                    placeholder: 'Passwort wiederholen',
                    order: 3
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
  );
}
