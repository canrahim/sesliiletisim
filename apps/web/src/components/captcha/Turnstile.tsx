import React, { useEffect, useRef } from 'react';

interface TurnstileProps {
  siteKey: string;
  onVerify: (token: string) => void;
  onError?: () => void;
  onExpire?: () => void;
  theme?: 'light' | 'dark' | 'auto';
  size?: 'normal' | 'compact';
  className?: string;
}

declare global {
  interface Window {
    turnstile?: {
      render: (element: HTMLElement | string, options: any) => string;
      remove: (widgetId: string) => void;
      reset: (widgetId: string) => void;
      getResponse: (widgetId: string) => string;
    };
    onTurnstileLoad?: () => void;
  }
}

export const Turnstile: React.FC<TurnstileProps> = ({
  siteKey,
  onVerify,
  onError,
  onExpire,
  theme = 'dark',
  size = 'normal',
  className = '',
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);

  useEffect(() => {
    // Skip if site key is not provided or CAPTCHA is disabled
    if (!siteKey || siteKey === 'disabled') {
      return;
    }

    const loadTurnstile = () => {
      if (!window.turnstile) {
        console.error('Turnstile script not loaded');
        return;
      }

      if (!containerRef.current) return;

      // Render Turnstile widget
      try {
        widgetIdRef.current = window.turnstile.render(containerRef.current, {
          sitekey: siteKey,
          theme,
          size,
          callback: (token: string) => {
            onVerify(token);
          },
          'error-callback': () => {
            console.error('Turnstile error');
            onError?.();
          },
          'expired-callback': () => {
            console.warn('Turnstile token expired');
            onExpire?.();
          },
        });
      } catch (error) {
        console.error('Failed to render Turnstile:', error);
        onError?.();
      }
    };

    if (window.turnstile) {
      loadTurnstile();
    } else {
      // Wait for script to load
      window.onTurnstileLoad = loadTurnstile;

      // Add script if not already present
      if (!document.querySelector('script[src*="challenges.cloudflare.com"]')) {
        const script = document.createElement('script');
        script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js';
        script.async = true;
        script.defer = true;
        script.onload = () => {
          window.onTurnstileLoad?.();
        };
        document.head.appendChild(script);
      }
    }

    return () => {
      // Cleanup
      if (widgetIdRef.current && window.turnstile) {
        try {
          window.turnstile.remove(widgetIdRef.current);
        } catch (error) {
          console.error('Failed to remove Turnstile widget:', error);
        }
      }
    };
  }, [siteKey, theme, size, onVerify, onError, onExpire]);

  // Don't render anything if CAPTCHA is disabled
  if (!siteKey || siteKey === 'disabled') {
    return null;
  }

  return <div ref={containerRef} className={className} />;
};

// Hook for easy CAPTCHA integration
export const useTurnstile = () => {
  const [token, setToken] = React.useState<string | null>(null);
  const [isVerified, setIsVerified] = React.useState(false);
  const [error, setError] = React.useState(false);

  const handleVerify = (token: string) => {
    setToken(token);
    setIsVerified(true);
    setError(false);
  };

  const handleError = () => {
    setToken(null);
    setIsVerified(false);
    setError(true);
  };

  const handleExpire = () => {
    setToken(null);
    setIsVerified(false);
    setError(false);
  };

  const reset = () => {
    setToken(null);
    setIsVerified(false);
    setError(false);
  };

  return {
    token,
    isVerified,
    error,
    handleVerify,
    handleError,
    handleExpire,
    reset,
  };
};


