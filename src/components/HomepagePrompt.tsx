'use client';

import { useEffect, useMemo, useState } from 'react';
import { Home, X } from 'lucide-react';

const DISMISS_KEY = 'kvb_homepage_prompt_dismissed';
const ACCEPT_KEY = 'kvb_homepage_prompt_accepted';

function getBrowserSteps(homepageUrl: string): string[] {
  if (typeof navigator === 'undefined') {
    return [];
  }

  const ua = navigator.userAgent.toLowerCase();

  if (ua.includes('firefox')) {
    return [
      'Abre la configuracion de Firefox.',
      'Ve a Inicio.',
      `En "Pagina de inicio y nuevas ventanas", pega ${homepageUrl}.`,
    ];
  }

  if (ua.includes('safari') && !ua.includes('chrome')) {
    return [
      'Abre Safari y entra a Configuracion > General.',
      `En "Pagina de inicio", pega ${homepageUrl}.`,
      'Abre una nueva pestana para verificar el cambio.',
    ];
  }

  return [
    'Abre la configuracion del navegador.',
    'Busca la seccion "Al iniciar" o "Pagina de inicio".',
    `Agrega ${homepageUrl} como pagina principal.`,
  ];
}

export function HomepagePrompt() {
  const [showPrompt, setShowPrompt] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const [homepageUrl, setHomepageUrl] = useState('https://www.kodingvibes.com');

  const steps = useMemo(() => getBrowserSteps(homepageUrl), [homepageUrl]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const wasDismissed = window.localStorage.getItem(DISMISS_KEY) === '1';
    const wasAccepted = window.localStorage.getItem(ACCEPT_KEY) === '1';
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches;

    if (wasDismissed || wasAccepted || isStandalone) {
      return;
    }

    const pathParts = window.location.pathname.split('/').filter(Boolean);
    const firstSegment = pathParts[0];
    const knownLocales = new Set(['es', 'en', 'de', 'fr', 'it', 'pt', 'ru', 'zh', 'ja']);

    if (firstSegment && knownLocales.has(firstSegment)) {
      setHomepageUrl(`${window.location.origin}/${firstSegment}`);
    } else {
      setHomepageUrl(window.location.origin);
    }

    const timer = window.setTimeout(() => {
      setShowPrompt(true);
    }, 3500);

    return () => {
      window.clearTimeout(timer);
    };
  }, []);

  const handleDismiss = () => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(DISMISS_KEY, '1');
    }

    setShowPrompt(false);
    setShowGuide(false);
  };

  const handleOpenGuide = () => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(ACCEPT_KEY, '1');
    }

    setShowPrompt(false);
    setShowGuide(true);
  };

  if (!showPrompt && !showGuide) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 w-[calc(100vw-2rem)] sm:w-96 rounded-xl border bg-card p-4 shadow-2xl">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="flex items-start gap-2">
          <div className="rounded-lg bg-primary/10 p-2">
            <Home className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground">Pagina de inicio</h3>
            <p className="text-xs text-muted-foreground">
              {showGuide
                ? 'Tu navegador no permite hacerlo automaticamente, pero aqui tienes los pasos.'
                : 'Quieres dejar KodingVibes como pagina de inicio?'}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={handleDismiss}
          className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          aria-label="Cerrar sugerencia"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {showGuide ? (
        <>
          <ol className="mb-4 list-decimal space-y-1 pl-4 text-xs text-muted-foreground">
            {steps.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={handleDismiss}
              className="rounded-lg border px-3 py-2 text-xs font-medium transition-colors hover:bg-muted"
            >
              Entendido
            </button>
          </div>
        </>
      ) : (
        <div className="flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={handleDismiss}
            className="rounded-lg border px-3 py-2 text-xs font-medium transition-colors hover:bg-muted"
          >
            Ahora no
          </button>
          <button
            type="button"
            onClick={handleOpenGuide}
            className="rounded-lg bg-primary px-3 py-2 text-xs font-medium text-primary-foreground transition-opacity hover:opacity-90"
          >
            Si, mostrar pasos
          </button>
        </div>
      )}
    </div>
  );
}
