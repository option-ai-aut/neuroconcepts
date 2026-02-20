'use client';

import { useState, useEffect } from 'react';
import { signIn, signUp, signOut, confirmSignUp, resetPassword, confirmResetPassword, fetchAuthSession, confirmSignIn } from 'aws-amplify/auth';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, Eye, EyeOff, Loader2 } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { syncUser, getApiUrl, getAuthHeaders } from '@/lib/api';
import { useAuthConfigured } from '@/components/AuthProvider';
import { useTranslations } from 'next-intl';

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
  const t = useTranslations('auth');
  const router = useRouter();
  const authConfigured = useAuthConfigured();

  /** Clean up Cognito error messages — strip the generic prefix, translate */
  const formatAuthError = (msg: string): string => {
    if (!msg) return t('errors.default');
    const stripped = msg.replace(/^Password does not conform to policy:\s*/i, '');
    const translations: Record<string, string> = {
      'Password must have numeric characters': t('errors.passwordNumber'),
      'Password must have uppercase characters': t('errors.passwordUppercase'),
      'Password must have lowercase characters': t('errors.passwordLowercase'),
      'Password must have symbol characters': t('errors.passwordSpecial'),
      'Password not long enough': t('errors.passwordLength'),
      'Incorrect username or password.': t('errors.wrongCredentials'),
      'User does not exist.': t('errors.userNotFound'),
      'User already exists': t('errors.userExists'),
      'Invalid verification code provided, please try again.': t('errors.invalidCode'),
      'Attempt limit exceeded, please try after some time.': t('errors.tooManyAttempts'),
      'Username/client id combination not found.': t('errors.userNotFound'),
    };
    return translations[stripped] || translations[msg] || stripped;
  };

  const countries = [
    { code: 'AT', name: t('countries.austria'), dialCode: '+43' },
    { code: 'DE', name: t('countries.germany'), dialCode: '+49' },
    { code: 'CH', name: t('countries.switzerland'), dialCode: '+41' },
    { code: 'LI', name: t('countries.liechtenstein'), dialCode: '+423' },
  ];

  const [checkingSession, setCheckingSession] = useState(true);
  const searchParams = useSearchParams();
  const [view, setView] = useState<AuthView>(searchParams.get('mode') === 'register' ? 'signUp' : 'signIn');

  // Helper: get redirect target from URL params (only allow safe relative paths)
  const getRedirectTarget = () => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const redirect = params.get('redirect');
      if (redirect && redirect.startsWith('/') && !redirect.startsWith('//') && !redirect.includes('://')) {
        return redirect;
      }
    }
    return '/dashboard';
  };

  // After login: if ?plan= is set and not 'free', start Stripe checkout
  const handlePostLoginRedirect = async () => {
    const plan = searchParams.get('plan');
    if (plan && plan !== 'free') {
      try {
        const headers = await getAuthHeaders();
        const res = await fetch(`${getApiUrl()}/billing/checkout`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...headers },
          body: JSON.stringify({ plan, billingCycle: 'monthly' }),
        });
        const data = await res.json();
        if (data.url) { window.location.href = data.url; return; }
        // BILLING_ENABLED=false or no URL → fall through to dashboard
      } catch { /* non-critical */ }
    }
    router.push(getRedirectTarget());
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
          await handlePostLoginRedirect();
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
  const [country, setCountry] = useState(t('countries.austria'));
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
        handlePostLoginRedirect();
      }
    } catch (err: any) {
      if (err.name === 'UserNotConfirmedException') {
        setView('confirmSignUp');
        setError(t('errors.confirmEmail'));
      } else {
        setError(formatAuthError(err.message) || t('errors.signInFailed'));
      }
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleNewPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!onboardingFirstName.trim() || !onboardingLastName.trim()) {
      setError(t('errors.enterName'));
      return;
    }
    
    if (newPassword !== confirmPassword) {
      setError(t('errors.passwordMismatch'));
      return;
    }
    
    if (newPassword.length < 8) {
      setError(t('errors.passwordTooShort'));
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
      
      handlePostLoginRedirect();
    } catch (err: any) {
      setError(formatAuthError(err.message) || t('errors.setPasswordFailed'));
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleOnboarding = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!onboardingFirstName.trim() || !onboardingLastName.trim()) {
      setError(t('errors.enterName'));
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
        throw new Error(t('errors.profileUpdateFailed'));
      }
      
      handlePostLoginRedirect();
    } catch (err: any) {
      setError(formatAuthError(err.message) || t('errors.saveFailed'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (password !== confirmPassword) {
      setError(t('errors.passwordMismatch'));
      return;
    }
    
    if (password.length < 8) {
      setError(t('errors.passwordTooShort'));
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
      setError(formatAuthError(err.message) || t('errors.registrationFailed'));
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
      handlePostLoginRedirect();
    } catch (err: any) {
      setError(formatAuthError(err.message) || t('errors.confirmationFailed'));
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
      setError(formatAuthError(err.message) || t('errors.resetFailed'));
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
      setError(formatAuthError(err.message) || t('errors.resetFailed'));
    } finally {
      setIsLoading(false);
    }
  };

  const inputClass = "w-full px-4 py-3 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-white";
  const labelClass = "block text-sm font-medium text-gray-700 mb-1.5";
  const buttonClass = "w-full py-3.5 px-4 bg-gray-900 text-white font-semibold rounded-xl hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed";

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
              <Image src="/logo-white.png" alt="Immivo" width={280} height={280} className="relative z-10 w-56 h-auto drop-shadow-[0_0_60px_rgba(255,255,255,0.15)]" />
            </div>
            <h2 className="text-4xl font-bold text-center">
              {view === 'signUp' || view === 'confirmSignUp' ? t('welcomeNew') : t('welcomeBack')}
            </h2>
          </div>
          
          <div className="absolute bottom-6 left-0 right-0 text-center text-sm text-gray-400">
            © 2026 Immivo AI
          </div>
        </div>
      </div>

      {/* Right Side - Form */}
      <div className="flex-1 flex flex-col py-4 sm:py-6 lg:py-8 px-4 sm:px-6 lg:px-12 xl:px-20 bg-white overflow-y-auto" style={{ animation: 'login-fade-in 0.5s ease-out' }}>
        <div className="flex-shrink-0 mb-3 sm:mb-4 lg:mb-6">
          <a 
            href="/" 
            className="group inline-flex items-center px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-medium text-gray-600 hover:text-gray-900 bg-gray-50 hover:bg-gray-100 rounded-full transition-all"
          >
            <ArrowLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1.5 sm:mr-2 group-hover:-translate-x-1 transition-transform" />
            {t('backToHome')}
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
                  <h3 className="text-2xl font-bold text-gray-900">{t('signIn.title')}</h3>
                  <p className="text-sm text-gray-500 mt-2">{t('signIn.subtitle')}</p>
                </div>

                {error && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
                    {error}
                  </div>
                )}

                <div>
                  <label className={labelClass}>{t('signIn.email')}</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value.toLowerCase())}
                    className={inputClass}
                    required
                  />
                </div>

                <div>
                  <label className={labelClass}>{t('signIn.password')}</label>
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
                    {t('signIn.forgotPassword')}
                  </button>
                </div>

                <button type="submit" disabled={isLoading} className={buttonClass}>
                  {isLoading ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : t('signIn.submit')}
                </button>

                <p className="text-center text-sm text-gray-500">
                  {t('signIn.noAccount')}{' '}
                  <button
                    type="button"
                    onClick={() => { setView('signUp'); setError(''); }}
                    className="text-blue-600 hover:text-blue-700 font-medium"
                  >
                    {t('signIn.register')}
                  </button>
                </p>
              </form>
            )}

            {/* Sign Up Form */}
            {view === 'signUp' && (
              <form onSubmit={handleSignUp} className="space-y-4">
                <div className="text-center mb-6">
                  <h3 className="text-2xl font-bold text-gray-900">{t('signUp.title')}</h3>
                  <p className="text-sm text-gray-500 mt-2">{t('signUp.subtitle')}</p>
                </div>

                {error && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
                    {error}
                  </div>
                )}

                <div>
                  <label className={labelClass}>{t('signUp.email')}</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value.toLowerCase())}
                    className={inputClass}
                    required
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className={labelClass}>{t('signUp.password')}</label>
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className={inputClass}
                      required
                    />
                  </div>
                  <div>
                    <label className={labelClass}>{t('signUp.confirmPassword')}</label>
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
                    <label className={labelClass}>{t('signUp.firstName')}</label>
                    <input
                      type="text"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      className={inputClass}
                      required
                    />
                  </div>
                  <div>
                    <label className={labelClass}>{t('signUp.lastName')}</label>
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
                  <label className={labelClass}>{t('signUp.companyName')}</label>
                  <input
                    type="text"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    className={inputClass}
                  />
                </div>

                <div>
                  <label className={labelClass}>{t('signUp.phone')}</label>
                  <div className="flex">
                    <select
                      value={dialCode}
                      onChange={(e) => setDialCode(e.target.value)}
                      className="w-[76px] pl-3 pr-0 py-3 border border-gray-200 border-r-0 rounded-l-xl bg-gray-50 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none bg-[url('data:image/svg+xml;charset=UTF-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2210%22%20height%3D%226%22%20viewBox%3D%220%200%2010%206%22%3E%3Cpath%20d%3D%22M0%200l5%206%205-6z%22%20fill%3D%22%239ca3af%22%2F%3E%3C%2Fsvg%3E')] bg-no-repeat bg-[position:right_6px_center] bg-[length:10px_6px]"
                    >
                      {countries.map((c) => (
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
                      className="flex-1 px-4 py-3 border border-gray-200 rounded-r-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>

                <div>
                  <label className={labelClass}>{t('signUp.street')}</label>
                  <input
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className={inputClass}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className={labelClass}>{t('signUp.zip')}</label>
                    <input
                      type="text"
                      value={postalCode}
                      onChange={(e) => setPostalCode(e.target.value)}
                      className={inputClass}
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className={labelClass}>{t('signUp.city')}</label>
                    <input
                      type="text"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      className={inputClass}
                    />
                  </div>
                </div>

                <div>
                  <label className={labelClass}>{t('signUp.country')}</label>
                  <select
                    value={country}
                    onChange={(e) => setCountry(e.target.value)}
                    className={inputClass}
                  >
                    {countries.map((c) => (
                      <option key={c.code} value={c.name}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <button type="submit" disabled={isLoading} className={buttonClass}>
                  {isLoading ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : t('signUp.submit')}
                </button>

                <p className="text-center text-xs text-gray-400">
                  {t('signUp.termsPrefix')}{' '}
                <Link href="/terms" className="text-blue-600 hover:underline">{t('signUp.terms')}</Link> und{' '}
                <Link href="/privacy" className="text-blue-600 hover:underline">{t('signUp.privacyPolicy')}</Link>.
                </p>

                <p className="text-center text-sm text-gray-500">
                  {t('signUp.hasAccount')}{' '}
                  <button
                    type="button"
                    onClick={() => { setView('signIn'); setError(''); }}
                    className="text-blue-600 hover:text-blue-700 font-medium"
                  >
                    {t('signUp.signIn')}
                  </button>
                </p>
              </form>
            )}

            {/* Confirm Sign Up */}
            {view === 'confirmSignUp' && (
              <form onSubmit={handleConfirmSignUp} className="space-y-5">
                <div className="text-center mb-8">
                  <h3 className="text-2xl font-bold text-gray-900">{t('confirm.title')}</h3>
                  <p className="text-sm text-gray-500 mt-2">
                    {t('confirm.codeSentTo')} <strong>{email}</strong> {t('confirm.codeSentSuffix')}
                  </p>
                </div>

                {error && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
                    {error}
                  </div>
                )}

                <div>
                  <label className={labelClass}>{t('confirm.codeLabel')}</label>
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
                  {isLoading ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : t('confirm.submit')}
                </button>

                <p className="text-center text-sm text-gray-500">
                  <button
                    type="button"
                    onClick={() => setView('signIn')}
                    className="text-blue-600 hover:text-blue-700 font-medium"
                  >
                    {t('confirm.backToSignIn')}
                  </button>
                </p>
              </form>
            )}

            {/* Forgot Password */}
            {view === 'forgotPassword' && (
              <form onSubmit={handleForgotPassword} className="space-y-5">
                <div className="text-center mb-8">
                  <h3 className="text-2xl font-bold text-gray-900">{t('resetPassword.title')}</h3>
                  <p className="text-sm text-gray-500 mt-2">{t('resetPassword.subtitle')}</p>
                </div>

                {error && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
                    {error}
                  </div>
                )}

                <div>
                  <label className={labelClass}>{t('resetPassword.email')}</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value.toLowerCase())}
                    className={inputClass}
                    required
                  />
                </div>

                <button type="submit" disabled={isLoading} className={buttonClass}>
                  {isLoading ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : t('resetPassword.sendCode')}
                </button>

                <p className="text-center text-sm text-gray-500">
                  <button
                    type="button"
                    onClick={() => setView('signIn')}
                    className="text-blue-600 hover:text-blue-700 font-medium"
                  >
                    {t('resetPassword.backToSignIn')}
                  </button>
                </p>
              </form>
            )}

            {/* Confirm Reset Password */}
            {view === 'confirmReset' && (
              <form onSubmit={handleConfirmReset} className="space-y-5">
                <div className="text-center mb-8">
                  <h3 className="text-2xl font-bold text-gray-900">{t('newPassword.title')}</h3>
                  <p className="text-sm text-gray-500 mt-2">
                    {t('newPassword.subtitle')}
                  </p>
                </div>

                {error && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
                    {error}
                  </div>
                )}

                <div>
                  <label className={labelClass}>{t('newPassword.code')}</label>
                  <input
                    type="text"
                    value={confirmationCode}
                    onChange={(e) => setConfirmationCode(e.target.value)}
                    className={inputClass}
                    required
                  />
                </div>

                <div>
                  <label className={labelClass}>{t('newPassword.password')}</label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className={inputClass}
                    required
                  />
                </div>

                <button type="submit" disabled={isLoading} className={buttonClass}>
                  {isLoading ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : t('newPassword.submit')}
                </button>

                <p className="text-center text-sm text-gray-500">
                  <button
                    type="button"
                    onClick={() => setView('signIn')}
                    className="text-blue-600 hover:text-blue-700 font-medium"
                  >
                    {t('newPassword.backToSignIn')}
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
                  <h3 className="text-2xl font-bold text-gray-900">{t('completeProfile.title')}</h3>
                  <p className="text-sm text-gray-500 mt-2">
                    {t('completeProfile.subtitleNewPassword')}
                  </p>
                </div>

                {error && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
                    {error}
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className={labelClass}>{t('completeProfile.firstName')}</label>
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
                    <label className={labelClass}>{t('completeProfile.lastName')}</label>
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
                  <label className={labelClass}>{t('completeProfile.newPassword')}</label>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder={t('completeProfile.minChars')}
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
                  <label className={labelClass}>{t('completeProfile.confirmPassword')}</label>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder={t('completeProfile.repeatPassword')}
                    className={inputClass}
                    required
                  />
                </div>

                <button type="submit" disabled={isLoading} className={buttonClass}>
                  {isLoading ? (
                    <Loader2 className="w-5 h-5 animate-spin mx-auto" />
                  ) : (
                    t('completeProfile.submitActivate')
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
                  <h3 className="text-2xl font-bold text-gray-900">{t('completeProfile.title')}</h3>
                  <p className="text-sm text-gray-500 mt-2">
                    {t('completeProfile.subtitleProfile')}
                  </p>
                </div>

                {error && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
                    {error}
                  </div>
                )}

                <div>
                  <label className={labelClass}>{t('completeProfile.firstName')}</label>
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
                  <label className={labelClass}>{t('completeProfile.lastName')}</label>
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
                    t('completeProfile.submitSave')
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
