'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Authenticator } from '@aws-amplify/ui-react';
import '@aws-amplify/ui-react/styles.css';
import { Amplify } from 'aws-amplify';

// Configure Amplify globally
if (process.env.NEXT_PUBLIC_USER_POOL_ID && process.env.NEXT_PUBLIC_USER_POOL_CLIENT_ID) {
  Amplify.configure({
    Auth: {
      Cognito: {
        userPoolId: process.env.NEXT_PUBLIC_USER_POOL_ID,
        userPoolClientId: process.env.NEXT_PUBLIC_USER_POOL_CLIENT_ID,
      }
    }
  });
}

export default function Login() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900 mb-8">
          Anmelden
        </h2>
        <Authenticator>
          {({ signOut, user }) => {
            if (user) {
              router.push('/dashboard');
              return (
                <div className="text-center">
                  <p>Erfolgreich angemeldet. Weiterleitung...</p>
                </div>
              );
            }
            return <></>;
          }}
        </Authenticator>
      </div>
    </div>
  );
}
