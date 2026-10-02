import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Loader2 } from 'lucide-react';

/**
 * Where the embedded ReportCard Studio build lives.
 *
 * Defaults to the same-origin static sub-app shipped in `public/reportcard`
 * (built with `npm run build:embed`). Set `VITE_REPORTCARD_URL` to point the
 * embed at a separately hosted deployment instead — useful while developing the
 * Studio on its own `vite dev` server.
 */
const REPORT_CARD_URL = (() => {
  const configured = (import.meta.env.VITE_REPORTCARD_URL as string | undefined)?.trim();
  if (configured) return configured;
  return '/reportcard/';
})();

/**
 * Dedicated, full-width view for ReportCard Studio.
 *
 * The Studio is a standalone SPA with its own router and compiled styles, so it
 * is rendered in an iframe rather than imported into Ishmaverse's React tree.
 * That keeps its internal routes (`/dashboard`, `/import`, …) fully isolated —
 * no route collision with Ishmaverse, no missing Tailwind classes, and no blank
 * screen — while still sitting inside the Ishmaverse chrome.
 */
export const ReportCardStudio: React.FC = () => {
  const [loaded, setLoaded] = useState(false);

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-bg-dark-start to-bg-dark-end">
      {/* Ishmaverse chrome around the embedded tool */}
      <header className="shrink-0 border-b border-neon-purple/25 bg-bg-dark-end/80 backdrop-blur">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center gap-3">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Back to mall</span>
          </Link>

          <div className="flex items-center gap-2 min-w-0 ml-2">
            <span className="text-xl">📊</span>
            <div className="min-w-0">
              <h1 className="text-sm font-bold text-white leading-tight truncate">
                ReportCard Studio
              </h1>
              <p className="text-[11px] text-gray-400 leading-tight truncate">
                Excel in. Professional report cards out.
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* The embedded Studio. Fixed height so its own sticky header + bottom tab
          bar behave exactly as they do standalone. */}
      <div className="relative flex-1 min-h-[calc(100dvh-3.5rem)]">
        {!loaded && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-bg-dark-start">
            <Loader2 className="w-8 h-8 text-neon-purple animate-spin" />
            <p className="text-sm text-gray-400">Loading ReportCard Studio…</p>
          </div>
        )}

        <iframe
          src={REPORT_CARD_URL}
          title="ReportCard Studio"
          onLoad={() => setLoaded(true)}
          allow="clipboard-write; downloads"
          className="absolute inset-0 w-full h-full border-0 bg-white"
        />
      </div>

    </div>
  );
};
