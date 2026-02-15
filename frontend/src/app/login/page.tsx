'use client';

import { useState, useEffect } from 'react';
import { signIn, signUp, signOut, confirmSignUp, resetPassword, confirmResetPassword, fetchAuthSession, confirmSignIn } from 'aws-amplify/auth';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, Eye, EyeOff, Loader2 } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { syncUser } from '@/lib/api';
import { useAuthConfigured } from '@/components/AuthProvider';

// Countries with dial codes
const COUNTRIES = [
  { code: 'AT', name: 'Österreich', dialCode: '+43' },
  { code: 'DE', name: 'Deutschland', dialCode: '+49' },
  { code: 'CH', name: 'Schweiz', dialCode: '+41' },
  { code: 'LI', name: 'Liechtenstein', dialCode: '+423' },
];

type AuthView = 'signIn' | 'signUp' | 'confirmSignUp' | 'forgotPassword' | 'confirmReset' | 'onboarding' | 'newPasswordRequired';

/** Clear all Cognito tokens from localStorage to prevent stale token 400 errors */
function clearCognitoStorage() {
  try {
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (
        key.startsWith('CognitoIdentityServiceProvider.') ||
        key.startsWith('amplify-') ||
        key.includes('cognito') ||
        key.includes('Cognito')
      )) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach(k => localStorage.removeItem(k));
  } catch {}
}

export default function LoginPage() {
  const router = useRouter();
  const authConfigured = useAuthConfigured();

  const [checkingSession, setCheckingSession] = useState(true);
  const searchParams = useSearchParams();
  const [view, setView] = useState<AuthView>(searchParams.get('mode') === 'register' ? 'signUp' : 'signIn');

  // Helper: get redirect target from URL params
  const getRedirectTarget = () => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      return params.get('redirect') || '/dashboard';
    }
    return '/dashboard';
  };
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // Single auth check: wait for Amplify config, then verify session is truly valid
  useEffect(() => {
    if (!authConfigured) return;

    const checkExisting = async () => {
      try {
        // CRITICAL: forceRefresh=true forces Cognito to validate the refresh token.
        // Without this, Amplify returns cached tokens that may be revoked (after
        // password reset or global sign-out), and later API calls fail with 400.
        const session = await fetchAuthSession({ forceRefresh: true });
        if (session.tokens?.idToken) {
          router.replace(getRedirectTarget());
          return;
        }
      } catch {
        // Refresh failed → tokens are revoked/invalid → clear everything
        clearCognitoStorage();
        try { await signOut(); } catch {}
      }
      setCheckingSession(false);
    };
    checkExisting();
  }, [authConfigured, router]);

  const [showPassword, setShowPassword] = useState(false);
  
  // Form fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [dialCode, setDialCode] = useState('+43');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [address, setAddress] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [city, setCity] = useState('');
  const [country, setCountry] = useState('Österreich');
  const [confirmationCode, setConfirmationCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  
  // Onboarding fields
  const [onboardingFirstName, setOnboardingFirstName] = useState('');
  const [onboardingLastName, setOnboardingLastName] = useState('');


  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    
    try {
      // Clear any stale auth state before attempting sign-in
      // This prevents "There is already a signed in user" errors
      clearCognitoStorage();
      try { await signOut(); } catch {}

      const signInResult = await signIn({ username: email, password });
      
      // Check if new password is required (invited user first login)
      if (signInResult.nextStep?.signInStep === 'CONFIRM_SIGN_IN_WITH_NEW_PASSWORD_REQUIRED') {
        setView('newPasswordRequired');
        setIsLoading(false);
        return;
      }
      
      const syncResult = await syncUser();
      
      // Check if user needs onboarding (invited user first login)
      if (syncResult.needsOnboarding) {
        setView('onboarding');
      } else {
        router.push(getRedirectTarget());
      }
    } catch (err: any) {
      if (err.name === 'UserNotConfirmedException') {
        setView('confirmSignUp');
        setError('Bitte bestätige zuerst deine E-Mail-Adresse.');
      } else {
        setError(err.message || 'Anmeldung fehlgeschlagen');
      }
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleNewPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!onboardingFirstName.trim() || !onboardingLastName.trim()) {
      setError('Bitte gib deinen Vor- und Nachnamen ein');
      return;
    }
    
    if (newPassword !== confirmPassword) {
      setError('Passwörter stimmen nicht überein');
      return;
    }
    
    if (newPassword.length < 8) {
      setError('Passwort muss mindestens 8 Zeichen lang sein');
      return;
    }
    
    setIsLoading(true);
    
    try {
      // Confirm sign in with new password and required attributes
      await confirmSignIn({ 
        challengeResponse: newPassword,
        options: {
          userAttributes: {
            given_name: onboardingFirstName.trim(),
            family_name: onboardingLastName.trim()
          }
        }
      });
      
      // Sync user to backend (will update name in DB)
      const syncResult = await syncUser();
      
      // Update user profile with name in backend
      const { getAuthHeaders } = await import('@/lib/api');
      const { getRuntimeConfig } = await import('@/components/EnvProvider');
      const headers = await getAuthHeaders();
      const apiConfig = getRuntimeConfig();
      
      await fetch(`${apiConfig.apiUrl}/me`, {
        method: 'PATCH',
        headers: {
          ...headers,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          firstName: onboardingFirstName.trim(),
          lastName: onboardingLastName.trim()
        })
      });
      
      router.push(getRedirectTarget());
    } catch (err: any) {
      setError(err.message || 'Fehler beim Setzen des Passworts');
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleOnboarding = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!onboardingFirstName.trim() || !onboardingLastName.trim()) {
      setError('Bitte gib deinen Vor- und Nachnamen ein.');
      return;
    }
    
    setIsLoading(true);
    
    try {
      const { getAuthHeaders } = await import('@/lib/api');
      const { getRuntimeConfig } = await import('@/components/EnvProvider');
      const headers = await getAuthHeaders();
      const apiConfig = getRuntimeConfig();
      
      // Update user profile with name
      const res = await fetch(`${apiConfig.apiUrl}/me`, {
        method: 'PATCH',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: onboardingFirstName.trim(),
          lastName: onboardingLastName.trim(),
        }),
      });
      
      if (!res.ok) {
        throw new Error('Profil konnte nicht aktualisiert werden');
      }
      
      router.push(getRedirectTarget());
    } catch (err: any) {
      setError(err.message || 'Fehler beim Speichern');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (password !== confirmPassword) {
      setError('Passwörter stimmen nicht überein');
      return;
    }
    
    if (password.length < 8) {
      setError('Passwort muss mindestens 8 Zeichen lang sein');
      return;
    }
    
    setIsLoading(true);
    
    try {
      const fullPhone = phoneNumber ? `${dialCode}${phoneNumber.replace(/^0+/, '')}` : undefined;
      
      await signUp({
        username: email,
        password,
        options: {
          userAttributes: {
            email,
            given_name: firstName,
            family_name: lastName,
            'custom:company_name': companyName || undefined,
            phone_number: fullPhone,
            address: address || undefined,
            'custom:postal_code': postalCode || undefined,
            'custom:city': city || undefined,
            'custom:country': country || undefined,
          }
        }
      });
      
      setView('confirmSignUp');
    } catch (err: any) {
      setError(err.message || 'Registrierung fehlgeschlagen');
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirmSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    
    try {
      await confirmSignUp({ username: email, confirmationCode });
      // Auto sign in after confirmation
      await signIn({ username: email, password });
      await syncUser();
      router.push(getRedirectTarget());
    } catch (err: any) {
      setError(err.message || 'Bestätigung fehlgeschlagen');
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    
    try {
      await resetPassword({ username: email });
      setView('confirmReset');
    } catch (err: any) {
      setError(err.message || 'Fehler beim Zurücksetzen');
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirmReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    
    try {
      await confirmResetPassword({ username: email, confirmationCode, newPassword });
      setView('signIn');
      setPassword('');
      setError('');
    } catch (err: any) {
      setError(err.message || 'Fehler beim Zurücksetzen');
    } finally {
      setIsLoading(false);
    }
  };

  const inputClass = "w-full px-4 py-3 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all";
  const labelClass = "block text-sm font-medium text-gray-700 mb-1.5";
  const buttonClass = "w-full py-3 px-4 bg-gray-900 text-white font-semibold rounded-lg hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed";

  // Show nothing while checking existing session (prevents login page flash)
  if (checkingSession) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <Loader2 className="w-8 h-8 animate-spin text-gray-900" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-white">
      {/* Left Side - Image/Brand */}
      <div className="hidden lg:flex lg:w-1/2 relative bg-black overflow-hidden">
        <div className="absolute inset-0 bg-black z-10" />
        
        <style jsx>{`
          @keyframes login-particle {
            0% { transform: translate(-50%, -50%) rotate(var(--angle)) translateX(0px); opacity: 0; }
            10% { opacity: 0.5; }
            50% { opacity: 0.2; }
            100% { transform: translate(-50%, -50%) rotate(var(--angle)) translateX(var(--dist)); opacity: 0; }
          }
        `}</style>
        <div className="relative z-20 flex flex-col justify-between h-full p-12 text-white">
          <div />
          
          <div className="flex flex-col items-center justify-center">
            <div className="relative mb-10">
              {/* Particles */}
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
              <Image src="/logo-icon-only.png" alt="Immivo" width={240} height={240} className="relative z-10 drop-shadow-[0_0_60px_rgba(255,255,255,0.15)]" />
            </div>
            <h2 className="text-4xl font-bold text-center">
              {view === 'signUp' || view === 'confirmSignUp' ? 'Willkommen.' : 'Willkommen zurück.'}
            </h2>
          </div>
          
          <div className="text-sm text-gray-400">
            © 2026 Immivo AI
          </div>
        </div>
      </div>

      {/* Right Side - Form */}
      <div className="flex-1 flex flex-col py-4 sm:py-6 lg:py-8 px-4 sm:px-6 lg:px-12 xl:px-20 bg-white overflow-y-auto">
        <div className="flex-shrink-0 mb-3 sm:mb-4 lg:mb-6">
          <a 
            href="https://immivo.ai" 
            className="group inline-flex items-center px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-medium text-gray-600 hover:text-gray-900 bg-gray-50 hover:bg-gray-100 rounded-full transition-all"
          >
            <ArrowLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1.5 sm:mr-2 group-hover:-translate-x-1 transition-transform" />
            Zurück zur Startseite
          </a>
        </div>

        <div className="flex-1 flex flex-col pt-2 sm:pt-4 lg:pt-8">
          {/* Mobile Logo */}
          <div className="mb-4 sm:mb-6 lg:hidden flex justify-center">
            <Image src="/logo-black.png" alt="Immivo" width={140} height={38} className="h-9 w-auto" />
          </div>

          <div className="mx-auto w-full max-w-md">
            {/* Sign In Form */}
            {view === 'signIn' && (
              <form onSubmit={handleSignIn} className="space-y-5">
                <div className="text-center mb-8">
                  <h3 className="text-2xl font-bold text-gray-900">Anmelden</h3>
                  <p className="text-sm text-gray-500 mt-2">Zugang zu deinem Dashboard</p>
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
                    onChange={(e) => setEmail(e.target.value)}
                    className={inputClass}
                    required
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

                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => setView('forgotPassword')}
                    className="text-sm text-blue-600 hover:text-blue-700"
                  >
                    Passwort vergessen?
                  </button>
                </div>

                <button type="submit" disabled={isLoading} className={buttonClass}>
                  {isLoading ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : 'Anmelden'}
                </button>

                <p className="text-center text-sm text-gray-500">
                  Noch kein Konto?{' '}
                  <button
                    type="button"
                    onClick={() => { setView('signUp'); setError(''); }}
                    className="text-blue-600 hover:text-blue-700 font-medium"
                  >
                    Jetzt registrieren
                  </button>
                </p>
              </form>
            )}

            {/* Sign Up Form */}
            {view === 'signUp' && (
              <form onSubmit={handleSignUp} className="space-y-4">
                <div className="text-center mb-6">
                  <h3 className="text-2xl font-bold text-gray-900">Konto erstellen</h3>
                  <p className="text-sm text-gray-500 mt-2">Starte deine 14-tägige Testphase</p>
                </div>

                {error && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
                    {error}
                  </div>
                )}

                <div>
                  <label className={labelClass}>E-Mail *</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className={inputClass}
                    required
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className={labelClass}>Passwort *</label>
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className={inputClass}
                      required
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Bestätigen *</label>
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className={inputClass}
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className={labelClass}>Vorname *</label>
                    <input
                      type="text"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      className={inputClass}
                      required
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Nachname *</label>
                    <input
                      type="text"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      className={inputClass}
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className={labelClass}>Firmenname</label>
                  <input
                    type="text"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    className={inputClass}
                  />
                </div>

                <div>
                  <label className={labelClass}>Telefon</label>
                  <div className="flex">
                    <select
                      value={dialCode}
                      onChange={(e) => setDialCode(e.target.value)}
                      className="w-[76px] pl-3 pr-0 py-3 border border-gray-300 border-r-0 rounded-l-lg bg-gray-50 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none bg-[url('data:image/svg+xml;charset=UTF-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2210%22%20height%3D%226%22%20viewBox%3D%220%200%2010%206%22%3E%3Cpath%20d%3D%22M0%200l5%206%205-6z%22%20fill%3D%22%239ca3af%22%2F%3E%3C%2Fsvg%3E')] bg-no-repeat bg-[position:right_6px_center] bg-[length:10px_6px]"
                    >
                      {COUNTRIES.map((c) => (
                        <option key={c.code} value={c.dialCode}>
                          {c.dialCode}
                        </option>
                      ))}
                    </select>
                    <input
                      type="tel"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value.replace(/[^\d]/g, ''))}
                      placeholder="6701234567"
                      className="flex-1 px-4 py-3 border border-gray-300 rounded-r-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>

                <div>
                  <label className={labelClass}>Straße & Hausnummer</label>
                  <input
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className={inputClass}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className={labelClass}>PLZ</label>
                    <input
                      type="text"
                      value={postalCode}
                      onChange={(e) => setPostalCode(e.target.value)}
                      className={inputClass}
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className={labelClass}>Ort</label>
                    <input
                      type="text"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      className={inputClass}
                    />
                  </div>
                </div>

                <div>
                  <label className={labelClass}>Land</label>
                  <select
                    value={country}
                    onChange={(e) => setCountry(e.target.value)}
                    className={inputClass}
                  >
                    {COUNTRIES.map((c) => (
                      <option key={c.code} value={c.name}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <button type="submit" disabled={isLoading} className={buttonClass}>
                  {isLoading ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : 'Konto erstellen'}
                </button>

                <p className="text-center text-xs text-gray-400">
                  Mit der Registrierung akzeptierst du unsere{' '}
                <Link href="/agb" className="text-blue-600 hover:underline">AGB</Link> und{' '}
                <Link href="/datenschutz" className="text-blue-600 hover:underline">Datenschutzerklärung</Link>.
                </p>

                <p className="text-center text-sm text-gray-500">
                  Bereits ein Konto?{' '}
                  <button
                    type="button"
                    onClick={() => { setView('signIn'); setError(''); }}
                    className="text-blue-600 hover:text-blue-700 font-medium"
                  >
                    Anmelden
                  </button>
                </p>
              </form>
            )}

            {/* Confirm Sign Up */}
            {view === 'confirmSignUp' && (
              <form onSubmit={handleConfirmSignUp} className="space-y-5">
                <div className="text-center mb-8">
                  <h3 className="text-2xl font-bold text-gray-900">E-Mail bestätigen</h3>
                  <p className="text-sm text-gray-500 mt-2">
                    Wir haben einen Code an <strong>{email}</strong> gesendet
                  </p>
                </div>

                {error && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
                    {error}
                  </div>
                )}

                <div>
                  <label className={labelClass}>Bestätigungscode</label>
                  <input
                    type="text"
                    value={confirmationCode}
                    onChange={(e) => setConfirmationCode(e.target.value)}
                    placeholder="123456"
                    className={`${inputClass} text-center text-2xl tracking-widest`}
                    required
                  />
                </div>

                <button type="submit" disabled={isLoading} className={buttonClass}>
                  {isLoading ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : 'Bestätigen'}
                </button>

                <p className="text-center text-sm text-gray-500">
                  <button
                    type="button"
                    onClick={() => setView('signIn')}
                    className="text-blue-600 hover:text-blue-700 font-medium"
                  >
                    Zurück zur Anmeldung
                  </button>
                </p>
              </form>
            )}

            {/* Forgot Password */}
            {view === 'forgotPassword' && (
              <form onSubmit={handleForgotPassword} className="space-y-5">
                <div className="text-center mb-8">
                  <h3 className="text-2xl font-bold text-gray-900">Passwort zurücksetzen</h3>
                  <p className="text-sm text-gray-500 mt-2">Gib deine E-Mail-Adresse ein</p>
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
                    onChange={(e) => setEmail(e.target.value)}
                    className={inputClass}
                    required
                  />
                </div>

                <button type="submit" disabled={isLoading} className={buttonClass}>
                  {isLoading ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : 'Code senden'}
                </button>

                <p className="text-center text-sm text-gray-500">
                  <button
                    type="button"
                    onClick={() => setView('signIn')}
                    className="text-blue-600 hover:text-blue-700 font-medium"
                  >
                    Zurück zur Anmeldung
                  </button>
                </p>
              </form>
            )}

            {/* Confirm Reset Password */}
            {view === 'confirmReset' && (
              <form onSubmit={handleConfirmReset} className="space-y-5">
                <div className="text-center mb-8">
                  <h3 className="text-2xl font-bold text-gray-900">Neues Passwort</h3>
                  <p className="text-sm text-gray-500 mt-2">
                    Gib den Code und dein neues Passwort ein
                  </p>
                </div>

                {error && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
                    {error}
                  </div>
                )}

                <div>
                  <label className={labelClass}>Bestätigungscode</label>
                  <input
                    type="text"
                    value={confirmationCode}
                    onChange={(e) => setConfirmationCode(e.target.value)}
                    className={inputClass}
                    required
                  />
                </div>

                <div>
                  <label className={labelClass}>Neues Passwort</label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className={inputClass}
                    required
                  />
                </div>

                <button type="submit" disabled={isLoading} className={buttonClass}>
                  {isLoading ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : 'Passwort ändern'}
                </button>

                <p className="text-center text-sm text-gray-500">
                  <button
                    type="button"
                    onClick={() => setView('signIn')}
                    className="text-blue-600 hover:text-blue-700 font-medium"
                  >
                    Zurück zur Anmeldung
                  </button>
                </p>
              </form>
            )}

            {/* New Password Required - Invited User First Login */}
            {view === 'newPasswordRequired' && (
              <form onSubmit={handleNewPassword} className="space-y-5">
                <div className="text-center mb-8">
                  <div className="w-16 h-16 bg-gray-900 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                    <span className="text-3xl">👋</span>
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900">Willkommen bei Immivo!</h3>
                  <p className="text-sm text-gray-500 mt-2">
                    Vervollständige dein Profil und setze ein neues Passwort.
                  </p>
                </div>

                {error && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
                    {error}
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className={labelClass}>Vorname *</label>
                    <input
                      type="text"
                      value={onboardingFirstName}
                      onChange={(e) => setOnboardingFirstName(e.target.value)}
                      placeholder="Max"
                      className={inputClass}
                      required
                      autoFocus
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Nachname *</label>
                    <input
                      type="text"
                      value={onboardingLastName}
                      onChange={(e) => setOnboardingLastName(e.target.value)}
                      placeholder="Mustermann"
                      className={inputClass}
                      required
                    />
                  </div>
                </div>

                <div className="relative">
                  <label className={labelClass}>Neues Passwort *</label>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Mindestens 8 Zeichen"
                    className={inputClass}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-9 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>

                <div className="relative">
                  <label className={labelClass}>Passwort bestätigen *</label>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Passwort wiederholen"
                    className={inputClass}
                    required
                  />
                </div>

                <button type="submit" disabled={isLoading} className={buttonClass}>
                  {isLoading ? (
                    <Loader2 className="w-5 h-5 animate-spin mx-auto" />
                  ) : (
                    'Konto aktivieren'
                  )}
                </button>
              </form>
            )}

            {/* Onboarding - Complete Profile */}
            {view === 'onboarding' && (
              <form onSubmit={handleOnboarding} className="space-y-5">
                <div className="text-center mb-8">
                  <div className="w-16 h-16 bg-gray-900 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                    <span className="text-3xl">👋</span>
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900">Willkommen bei Immivo!</h3>
                  <p className="text-sm text-gray-500 mt-2">
                    Bitte vervollständige dein Profil, um loszulegen.
                  </p>
                </div>

                {error && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
                    {error}
                  </div>
                )}

                <div>
                  <label className={labelClass}>Vorname *</label>
                  <input
                    type="text"
                    value={onboardingFirstName}
                    onChange={(e) => setOnboardingFirstName(e.target.value)}
                    placeholder="Max"
                    className={inputClass}
                    required
                    autoFocus
                  />
                </div>

                <div>
                  <label className={labelClass}>Nachname *</label>
                  <input
                    type="text"
                    value={onboardingLastName}
                    onChange={(e) => setOnboardingLastName(e.target.value)}
                    placeholder="Mustermann"
                    className={inputClass}
                    required
                  />
                </div>

                <button type="submit" disabled={isLoading} className={buttonClass}>
                  {isLoading ? (
                    <Loader2 className="w-5 h-5 animate-spin mx-auto" />
                  ) : (
                    'Profil speichern & loslegen'
                  )}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
