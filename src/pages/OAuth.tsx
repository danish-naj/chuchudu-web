import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../config/firebase';

type Status = 'processing' | 'success' | 'error' | 'no_token';

export default function OAuthCallback() {
  const [status, setStatus] = useState<Status>('processing');
  const [errorMsg, setErrorMsg] = useState('');
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const handleOAuth = async () => {
      try {
        // Google returns the token in the URL hash fragment: #access_token=...&state=uid
        const hash = window.location.hash.replace('#', '');
        const params = new URLSearchParams(hash);
        const accessToken = params.get('access_token');
        const uid = params.get('state') || searchParams.get('state');

        if (!accessToken) {
          setStatus('no_token');
          return;
        }

        if (!uid) {
          setErrorMsg('Missing user state. Please try connecting again from the desktop app.');
          setStatus('error');
          return;
        }

        // Fetch the user's Google profile to get their email
        const userInfoRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
          headers: { Authorization: `Bearer ${accessToken}` }
        });
        const userInfo = await userInfoRes.json();

        // Write the token to Firestore so the desktop app can pick it up
        await setDoc(doc(db, `users/${uid}/oauth/drive_token`), {
          access_token: accessToken,
          email: userInfo.email || '',
          granted_at: new Date().toISOString(),
        });

        setStatus('success');

        // Auto-close the tab after 3 seconds if opened from the desktop app
        setTimeout(() => {
          try { window.close(); } catch {}
        }, 3000);

      } catch (e) {
        console.error('OAuth callback error:', e);
        setErrorMsg(String(e));
        setStatus('error');
      }
    };

    handleOAuth();
  }, []);

  return (
    <div className="min-h-screen bg-background text-on-background flex items-center justify-center px-4 font-body-md">
      <div className="w-full max-w-md flex flex-col items-center gap-8">

        {/* Logo */}
        <div className="transform -rotate-2">
          <div className="bg-primary-container border-4 border-on-background px-6 py-3 brutal-shadow">
            <span className="font-headline-lg text-headline-md font-black text-on-background uppercase tracking-tight">
              CHUCHUDU
            </span>
          </div>
        </div>

        {/* Status Card */}
        <div className="w-full border-4 border-on-background brutal-shadow-lg bg-surface-container-lowest p-8 flex flex-col items-center gap-6 text-center">
          {status === 'processing' && (
            <>
              <span className="material-symbols-outlined text-6xl text-primary animate-spin">
                progress_activity
              </span>
              <div>
                <h1 className="font-headline-md text-headline-md uppercase mb-2">Connecting Google Drive</h1>
                <p className="text-on-surface-variant font-body-md text-sm">Securely linking your account...</p>
              </div>
            </>
          )}

          {status === 'success' && (
            <>
              <div className="w-20 h-20 bg-primary-container border-4 border-on-background brutal-shadow flex items-center justify-center">
                <span className="material-symbols-outlined text-5xl text-on-primary-container" style={{ fontVariationSettings: "'FILL' 1" }}>
                  cloud_done
                </span>
              </div>
              <div>
                <h1 className="font-headline-md text-headline-md uppercase mb-2">Google Drive Connected!</h1>
                <p className="text-on-surface-variant font-body-md text-sm leading-relaxed">
                  Your desktop agent is now linked. This window will close automatically in 3 seconds.
                </p>
              </div>
              <div className="bg-primary-container border-2 border-on-background p-4 w-full brutal-shadow text-sm text-on-primary-container font-body-md">
                ✓ Files uploaded from your phone will now buffer in Google Drive when your laptop is offline.
              </div>
              <button
                onClick={() => window.close()}
                className="w-full bg-on-background text-background border-2 border-on-background py-3 font-black text-sm uppercase brutal-shadow brutal-hover"
              >
                Close this window
              </button>
            </>
          )}

          {status === 'no_token' && (
            <>
              <span className="material-symbols-outlined text-6xl text-on-surface-variant">link_off</span>
              <div>
                <h1 className="font-headline-md text-headline-md uppercase mb-2">No Token Received</h1>
                <p className="text-on-surface-variant text-sm leading-relaxed">
                  Google didn't return an access token. You may have cancelled the sign-in, or it may have expired.
                </p>
              </div>
              <p className="text-sm text-on-surface-variant">
                Go back to the desktop app and click <strong>"Connect Google Drive"</strong> again.
              </p>
              <Link to="/" className="text-primary underline text-sm font-bold">← Return to Home</Link>
            </>
          )}

          {status === 'error' && (
            <>
              <span className="material-symbols-outlined text-6xl text-error" style={{ fontVariationSettings: "'FILL' 1" }}>error</span>
              <div>
                <h1 className="font-headline-md text-headline-md uppercase mb-2">Connection Failed</h1>
                <p className="text-on-surface-variant text-sm leading-relaxed">{errorMsg || 'An unexpected error occurred.'}</p>
              </div>
              <Link to="/" className="text-primary underline text-sm font-bold">← Return to Home</Link>
            </>
          )}
        </div>

        <p className="text-xs text-on-surface-variant text-center uppercase tracking-widest">
          Chuchudu Encrypted Systems — Zero Knowledge File Vault
        </p>
      </div>
    </div>
  );
}
