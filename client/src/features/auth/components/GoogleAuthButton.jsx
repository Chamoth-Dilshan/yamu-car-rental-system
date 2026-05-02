import { GoogleLogin } from '@react-oauth/google';
import { useEffect, useRef, useState } from 'react';

const GOOGLE_CLIENT_ID = String(import.meta.env.VITE_GOOGLE_CLIENT_ID || '').trim();

export default function GoogleAuthButton({
  buttonText,
  disabled = false,
  googleText = 'continue_with',
  onCredential,
  onError
}) {
  const buttonRef = useRef(null);
  const [buttonWidth, setButtonWidth] = useState(320);

  useEffect(() => {
    if (!GOOGLE_CLIENT_ID || !buttonRef.current) {
      return undefined;
    }

    const updateButtonWidth = () => {
      const nextWidth = buttonRef.current?.clientWidth || 320;
      setButtonWidth(Math.max(180, Math.min(340, Math.floor(nextWidth))));
    };

    updateButtonWidth();

    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', updateButtonWidth);
      return () => window.removeEventListener('resize', updateButtonWidth);
    }

    const observer = new ResizeObserver(updateButtonWidth);
    observer.observe(buttonRef.current);
    return () => observer.disconnect();
  }, []);

  if (!GOOGLE_CLIENT_ID) {
    return (
      <div className="google-auth-unavailable">
        <button type="button" className="btn btn-outline btn-block btn-lg" disabled>
          {buttonText}
        </button>
        <p className="auth-config-note">Google sign in is not configured.</p>
      </div>
    );
  }

  return (
    <div ref={buttonRef} className={`google-auth-button${disabled ? ' is-disabled' : ''}`}>
      <GoogleLogin
        text={googleText}
        shape="rectangular"
        width={`${buttonWidth}`}
        onSuccess={(credentialResponse) => {
          const credential = credentialResponse?.credential;

          if (!credential) {
            onError?.('Google sign in failed. Please try again.');
            return;
          }

          onCredential?.(credential);
        }}
        onError={() => onError?.('Google sign in failed. Please try again.')}
        useOneTap={false}
      />
    </div>
  );
}
