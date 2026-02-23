'use client';

import { useState, useEffect } from 'react';
import { signIn, signOut, fetchAuthSession, confirmSignIn } from 'aws-amplify/auth';
import { Amplify } from 'aws-amplify';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, Loader2, Shield } from 'lucide-react';
import Image from 'next/image';
import { useRuntimeConfig } from '@/components/RuntimeConfigProvider';

/** Clean up Cognito error messages */
function formatAuthError(msg: string): string {
  if (!msg) return 'Ein Fehler ist aufgetreten';
  const stripped = msg.replace(/^Password does not conform to policy:\s*/i, '');
  const t: Record<string, string> = {
    'Password must have numeric characters': 'Passwort muss mindestens eine Zahl enthalten.',
    'Password must have uppercase characters': 'Passwort muss mindestens einen Großbuchstaben enthalten.',
    'Password must have lowercase characters': 'Passwort muss mindestens einen Kleinbuchstaben enthalten.',
    'Password must have symbol characters': 'Passwort muss mindestens ein Sonderzeichen enthalten.',
    'Password not long enough': 'Passwort muss mindestens 12 Zeichen lang sein.',
    'Incorrect username or password.': 'E-Mail oder Passwort ist falsch.',
    'User does not exist.': 'Kein Admin-Konto mit dieser E-Mail gefunden.',
    'Attempt limit exceeded, please try after some time.': 'Zu viele Versuche. Bitte warte einen Moment.',
  };
  return t[stripped] || t[msg] || stripped;
}

export default function AdminLoginPage() {
  const router = useRouter();
  const config = useRuntimeConfig();

  // Configure Amplify with ADMIN User Pool — clear any regular user pool tokens first
  useEffect(() => {
    if (config.adminUserPoolId && config.adminUserPoolClientId) {
      try {
        const keysToRemove: string[] = [];
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && key.startsWith('CognitoIdentityServiceProvider.') && !key.includes(config.adminUserPoolClientId)) {
            keysToRemove.push(key);
          }
        }
        keysToRemove.forEach(k => localStorage.removeItem(k));
      } catch {}

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
        try {
          const keysToRemove: string[] = [];
          for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && (key.startsWith('CognitoIdentityServiceProvider.') || key.startsWith('amplify-') || key.includes('cognito') || key.includes('Cognito'))) {
              keysToRemove.push(key);
            }
          }
          keysToRemove.forEach(k => localStorage.removeItem(k));
          try { await signOut(); } catch {}
        } catch {}
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
      try { await signOut(); } catch {}
      const result = await signIn({ username: email, password });
      if (result.nextStep?.signInStep === 'CONFIRM_SIGN_IN_WITH_NEW_PASSWORD_REQUIRED') {
        setView('newPasswordRequired');
        setIsLoading(false);
        return;
      }
      router.push('/admin');
    } catch (err: any) {
      setError(formatAuthError(err.message) || 'Anmeldung fehlgeschlagen');
    } finally {
      setIsLoading(false);
    }
  };

  const handleNewPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (newPassword !== confirmPassword) {
      setError('Passwörter stimmen nicht überein');
      return;
    }
    if (newPassword.length < 12) {
      setError('Passwort muss mindestens 12 Zeichen lang sein');
      return;
    }
    setIsLoading(true);
    try {
      await confirmSignIn({ challengeResponse: newPassword });
      router.push('/admin');
    } catch (err: any) {
      setError(formatAuthError(err.message) || 'Fehler beim Setzen des Passworts');
    } finally {
      setIsLoading(false);
    }
  };

  const inputClass = "w-full px-4 py-3 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-white";
  const labelClass = "block text-sm font-medium text-gray-700 mb-1.5";
  const buttonClass = "w-full py-3.5 px-4 bg-gray-900 text-white font-semibold rounded-xl hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed";

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-white">
      {/* Left Side — same as normal login but "ADMIN" */}
      <div className="hidden lg:flex lg:w-1/2 sticky top-0 h-screen bg-black overflow-hidden">
        <div className="absolute inset-0 bg-black z-10" />

        <style jsx>{`
          @keyframes login-particle {
            0% { transform: translate(-50%, -50%) rotate(var(--angle)) translateX(0px); opacity: 0; }
            10% { opacity: 0.5; }
            50% { opacity: 0.2; }
            100% { transform: translate(-50%, -50%) rotate(var(--angle)) translateX(var(--dist)); opacity: 0; }
          }
          @keyframes login-fade-in {
            from { opacity: 0; transform: translateY(10px); }
            to { opacity: 1; transform: translateY(0); }
          }
        `}</style>

        <div className="relative z-20 flex flex-col items-center justify-center h-full w-full p-12 text-white">
          <div className="flex flex-col items-center justify-center">
            <div className="relative mb-10">
              {Array.from({ length: 16 }).map((_, i) => (
                <div
                  key={i}
                  className="absolute rounded-full bg-white"
                  style={{
                    width: `${2 + (i % 3)}px`,
                    height: `${2 + (i % 3)}px`,
                    left: '50%',
                    top: '50%',
                    opacity: 0,
                    ['--angle' as string]: `${(i / 16) * 360}deg`,
                    ['--dist' as string]: `${120 + (i % 4) * 30}px`,
                    animation: `login-particle ${3 + (i % 5) * 0.6}s ease-out ${i * 0.35}s infinite`,
                  }}
                />
              ))}
              <Image
                src="/logo-white.png"
                alt="Immivo"
                width={280}
                height={280}
                className="relative z-10 w-56 h-auto drop-shadow-[0_0_60px_rgba(255,255,255,0.15)]"
              />
            </div>
            <h2 className="text-4xl font-bold text-center tracking-tight">ADMIN</h2>
          </div>

          <div className="absolute bottom-6 left-0 right-0 text-center text-sm text-gray-400">
            © 2026 Immivo AI
          </div>
        </div>
      </div>

      {/* Right Side — Form */}
      <div
        className="flex-1 flex flex-col py-4 sm:py-6 lg:py-8 px-4 sm:px-6 lg:px-12 xl:px-20 bg-white overflow-y-auto"
        style={{ animation: 'login-fade-in 0.5s ease-out' }}
      >
        {/* Mobile Logo */}
        <div className="mb-6 lg:hidden flex justify-center">
          <Image src="/logo-black.png" alt="Immivo" width={140} height={38} className="h-9 w-auto" />
        </div>

        <div className="flex-1 flex flex-col justify-center">
          <div className="mx-auto w-full max-w-md">

            {/* Sign In */}
            {view === 'signIn' && (
              <form onSubmit={handleSignIn} className="space-y-5">
                <div className="text-center mb-8">
                  <div className="inline-flex items-center justify-center w-12 h-12 bg-gray-100 rounded-2xl mb-4">
                    <Shield className="w-6 h-6 text-gray-700" />
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900">Admin-Anmeldung</h3>
                  <p className="text-sm text-gray-500 mt-2">Nur für autorisierte Administratoren</p>
                </div>

                {error && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
                    {error}
                  </div>
                )}

                <div>
                  <label className={labelClass}>E-Mail</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value.toLowerCase())}
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
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
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
              <form onSubmit={handleNewPassword} className="space-y-5">
                <div className="text-center mb-8">
                  <div className="w-16 h-16 bg-gray-900 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                    <Shield className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900">Neues Passwort setzen</h3>
                  <p className="text-sm text-gray-500 mt-2">Bitte setze ein neues sicheres Passwort.</p>
                </div>

                {error && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
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
                      placeholder="Min. 12 Zeichen, Groß/Klein, Zahl, Symbol"
                      required
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className={labelClass}>Passwort bestätigen</label>
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

          </div>
        </div>
      </div>
    </div>
  );
}
