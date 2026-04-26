'use client';

import { useEffect, useMemo, useState } from 'react';
import { Check, Copy, Home, X } from 'lucide-react';

const DISMISS_KEY = 'kvb_homepage_prompt_dismissed';
const ACCEPT_KEY = 'kvb_homepage_prompt_accepted';
const KNOWN_LOCALES = new Set(['es', 'en', 'de', 'fr', 'it', 'pt', 'ru', 'zh', 'ja']);

type BrowserKey = 'chrome' | 'edge' | 'firefox' | 'safari' | 'other';

type BrowserGuide = {
  browserName: string;
  steps: string[];
};

function detectBrowser(): BrowserKey {
  if (typeof navigator === 'undefined') {
    return 'other';
  }

  const ua = navigator.userAgent.toLowerCase();

  if (ua.includes('edg/')) {
    return 'edge';
  }

  if (ua.includes('firefox')) {
    return 'firefox';
  }

  if (ua.includes('safari') && !ua.includes('chrome')) {
    return 'safari';
  }

  if (ua.includes('chrome') && !ua.includes('opr/')) {
    return 'chrome';
  }

  return 'other';
}

function getBrowserGuide(homepageUrl: string): BrowserGuide {
  const browser = detectBrowser();

  if (browser === 'edge') {
    return {
      browserName: 'Microsoft Edge',
      steps: [
        'Abre Configuracion en Edge.',
        'Ve a Inicio, pagina principal y nuevas pestanas.',
        'En "Al iniciar Edge", selecciona "Abrir estas paginas".',
        `Agrega ${homepageUrl}.`,
      ],
    };
  }

  if (browser === 'firefox') {
    return {
      browserName: 'Firefox',
      steps: [
        'Abre Configuracion en Firefox.',
        'Ve a la seccion Inicio.',
        'En "Pagina de inicio y nuevas ventanas", selecciona "URL personalizada".',
        `Pega ${homepageUrl}.`,
      ],
    };
  }

  if (browser === 'safari') {
    return {
      browserName: 'Safari',
      steps: [
        'Abre Safari y entra a Configuracion > General.',
        'En "Pagina de inicio", pega la URL.',
        `Usa ${homepageUrl}.`,
        'Abre una nueva pestana para verificar el cambio.',
      ],
    };
  }

  if (browser === 'chrome') {
    return {
      browserName: 'Google Chrome',
      steps: [
        'Abre Configuracion en Chrome.',
        'Ve a la seccion "Al iniciar".',
        'Selecciona "Abrir una pagina especifica o un conjunto de paginas".',
        `Agrega ${homepageUrl}.`,
      ],
    };
  }

  return {
    browserName: 'Tu navegador',
    steps: [
      'Abre la configuracion del navegador.',
      'Busca la seccion "Al iniciar" o "Pagina de inicio".',
      `Agrega ${homepageUrl} como pagina principal.`,
    ],
  };
}

async function copyToClipboard(text: string): Promise<boolean> {
  if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // fallback below
    }
  }

  if (typeof document === 'undefined') {
    return false;
  }

  try {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.setAttribute('readonly', '');
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    const copied = document.execCommand('copy');
    document.body.removeChild(textarea);
    return copied;
  } catch {
    return false;
  }
}

export function HomepagePrompt() {
  const [showPrompt, setShowPrompt] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const [homepageUrl, setHomepageUrl] = useState('https://www.kodingvibes.com');
  const [copyStatus, setCopyStatus] = useState<'idle' | 'copied' | 'error'>('idle');

  const guide = useMemo(() => getBrowserGuide(homepageUrl), [homepageUrl]);

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

    if (firstSegment && KNOWN_LOCALES.has(firstSegment)) {
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

  const handleCopyUrl = async () => {
    const copied = await copyToClipboard(homepageUrl);
    setCopyStatus(copied ? 'copied' : 'error');

    window.setTimeout(() => {
      setCopyStatus('idle');
    }, 1800);
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
          <div className="mb-3 rounded-lg border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
            Navegador detectado: <span className="font-medium text-foreground">{guide.browserName}</span>
          </div>

          <div className="mb-3 rounded-lg border bg-muted/20 p-3">
            <p className="mb-2 text-[11px] font-medium text-muted-foreground">URL recomendada</p>
            <div className="flex items-center gap-2">
              <code className="flex-1 break-all rounded bg-background px-2 py-1 text-[11px] text-foreground">{homepageUrl}</code>
              <button
                type="button"
                onClick={handleCopyUrl}
                className="inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-[11px] font-medium transition-colors hover:bg-muted"
              >
                {copyStatus === 'copied' ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                {copyStatus === 'copied' ? 'Copiado' : 'Copiar'}
              </button>
            </div>
            {copyStatus === 'error' && (
              <p className="mt-2 text-[11px] text-red-500">No se pudo copiar automaticamente. Copiala manualmente.</p>
            )}
          </div>

          <ol className="mb-4 list-decimal space-y-1 pl-4 text-xs text-muted-foreground">
            {guide.steps.map((step) => (
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
