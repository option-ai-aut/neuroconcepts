'use client';

import { useState, useEffect } from 'react';
import { signIn, fetchAuthSession, confirmSignIn } from 'aws-amplify/auth';
import { Amplify } from 'aws-amplify';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, Loader2, Shield } from 'lucide-react';
import Image from 'next/image';
import { useRuntimeConfig } from '@/components/RuntimeConfigProvider';

export default function AdminLoginPage() {
  const router = useRouter();
  const config = useRuntimeConfig();

  // Configure Amplify with ADMIN User Pool
  useEffect(() => {
    if (config.adminUserPoolId && config.adminUserPoolClientId) {
      Amplify.configure({
        Auth: {
          Cognito: {
            userPoolId: config.adminUserPoolId,
            userPoolClientId: config.adminUserPoolClientId,
          }
        }
      });
    }
  }, [config]);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [view, setView] = useState<'signIn' | 'newPasswordRequired'>('signIn');

  // Check if already authenticated as admin
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const session = await fetchAuthSession();
        if (session.tokens) {
          router.push('/admin');
        }
      } catch {
        // Not authenticated
      }
    };
    if (config.adminUserPoolId) {
      checkAuth();
    }
  }, [router, config]);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const result = await signIn({ username: email, password });

      if (result.nextStep?.signInStep === 'CONFIRM_SIGN_IN_WITH_NEW_PASSWORD_REQUIRED') {
        setView('newPasswordRequired');
        setIsLoading(false);
        return;
      }

      router.push('/admin');
    } catch (err: any) {
      setError(err.message || 'Anmeldung fehlgeschlagen');
    } finally {
      setIsLoading(false);
    }
  };

  const handleNewPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (newPassword !== confirmPassword) {
      setError('Passwoerter stimmen nicht ueberein');
      return;
    }

    if (newPassword.length < 12) {
      setError('Passwort muss mindestens 12 Zeichen lang sein');
      return;
    }

    setIsLoading(true);

    try {
      await confirmSignIn({
        challengeResponse: newPassword,
      });
      router.push('/admin');
    } catch (err: any) {
      setError(err.message || 'Fehler beim Setzen des Passworts');
    } finally {
      setIsLoading(false);
    }
  };

  const inputClass = "w-full px-4 py-3 border border-gray-600 bg-gray-800 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all";
  const labelClass = "block text-sm font-medium text-gray-300 mb-1.5";
  const buttonClass = "w-full py-3 px-4 bg-gray-800 text-white font-semibold rounded-lg hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-900 transition-all disabled:opacity-50 disabled:cursor-not-allowed border border-gray-600";

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900 px-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <Image src="/logo-icon-only.png" alt="Immivo" width={56} height={56} className="mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-white">Admin Konsole</h1>
          <p className="text-sm text-gray-400 mt-2">Immivo Plattform-Administration</p>
        </div>

        {/* Sign In Form */}
        {view === 'signIn' && (
          <form onSubmit={handleSignIn} className="space-y-5 bg-gray-800/50 border border-gray-700 rounded-xl p-6">
            {error && (
              <div className="p-3 bg-red-900/30 border border-red-500/30 rounded-lg text-red-400 text-sm">
                {error}
              </div>
            )}

            <div>
              <label className={labelClass}>E-Mail</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={inputClass}
                placeholder="admin@immivo.ai"
                required
                autoFocus
              />
            </div>

            <div>
              <label className={labelClass}>Passwort</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={inputClass}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-200"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <button type="submit" disabled={isLoading} className={buttonClass}>
              {isLoading ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : 'Anmelden'}
            </button>
          </form>
        )}

        {/* New Password Required (first admin login) */}
        {view === 'newPasswordRequired' && (
          <form onSubmit={handleNewPassword} className="space-y-5 bg-gray-800/50 border border-gray-700 rounded-xl p-6">
            <div className="text-center mb-4">
              <h3 className="text-lg font-bold text-white">Neues Passwort setzen</h3>
              <p className="text-sm text-gray-400 mt-1">Bitte setze ein neues sicheres Passwort.</p>
            </div>

            {error && (
              <div className="p-3 bg-red-900/30 border border-red-500/30 rounded-lg text-red-400 text-sm">
                {error}
              </div>
            )}

            <div>
              <label className={labelClass}>Neues Passwort</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className={inputClass}
                  placeholder="Min. 12 Zeichen, Gross/Klein, Zahl, Symbol"
                  required
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-200"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <div>
              <label className={labelClass}>Passwort bestaetigen</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className={inputClass}
                required
              />
            </div>

            <button type="submit" disabled={isLoading} className={buttonClass}>
              {isLoading ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : 'Passwort setzen'}
            </button>
          </form>
        )}

        {/* Footer */}
        <p className="text-center text-xs text-gray-500 mt-6">
          Nur fuer autorisierte Administratoren.
        </p>
      </div>
    </div>
  );
}
