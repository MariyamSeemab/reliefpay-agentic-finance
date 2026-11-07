import React, { useCallback, useEffect, useState } from 'react';
import { BarChart3, Eye, Info, Pencil } from 'lucide-react';
import { BackButton } from '../components/common/BackButton';
import { DonationRefundsPanel } from '../components/admin/DonationRefundsPanel';
import ReliefPayStudio from '../components/analytics/ReliefPayStudio';
import { hasData } from '../components/analytics/studio/data';
import { apiFetch, getToken } from '../lib/api';

// Admin analytics built with AG Studio over GET /api/analytics. Lazy-loaded from
// App.jsx so AG Studio stays out of the main bundle.
export default function AnalyticsPage() {
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [mode, setMode] = useState('view');

  const load = useCallback(async () => {
    try {
      setData(await apiFetch('/analytics'));
      setLoadError('');
    } catch (err) {
      setLoadError(err.message || 'Could not load analytics');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const toggleClass = (active) =>
    `flex items-center gap-2 px-4 py-2 text-sm font-semibold transition ${
      active ? 'bg-[#087E83] text-white' : 'bg-white text-slate-700 hover:bg-slate-50'
    }`;

  return (
    <div className="min-h-screen bg-[#F6F8F9] p-6">
      <div className="mx-auto max-w-[1600px]">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <BackButton to="/dashboard" label="Back to Dashboard" />
            <h1 className="flex items-center gap-2 text-3xl font-bold text-[#123B4A]">
              <BarChart3 className="h-8 w-8 text-[#087E83]" />
              Analytics
            </h1>
            <p className="mt-1 text-slate-600">Built with AG Studio</p>
          </div>
          {data && hasData(data) && (
            <div className="flex overflow-hidden rounded-lg border border-slate-200" role="group" aria-label="Report mode">
              <button type="button" className={toggleClass(mode === 'view')} onClick={() => setMode('view')} aria-pressed={mode === 'view'}>
                <Eye className="h-4 w-4" /> View
              </button>
              <button type="button" className={toggleClass(mode === 'edit')} onClick={() => setMode('edit')} aria-pressed={mode === 'edit'}>
                <Pencil className="h-4 w-4" /> Edit
              </button>
            </div>
          )}
        </div>

        {isLoading && (
          <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center text-slate-600">Loading analytics…</div>
        )}

        {!isLoading && loadError && (
          <div className="rounded-2xl border border-red-200 bg-white p-12 text-center">
            <p className="mb-4 text-[#B54747]">{loadError}</p>
            <button
              type="button"
              onClick={() => { setIsLoading(true); load(); }}
              className="rounded-lg bg-[#087E83] px-6 py-3 font-semibold text-white transition hover:opacity-90"
            >
              Retry
            </button>
          </div>
        )}

        {!isLoading && !loadError && data && (
          <div className="space-y-6">
            {(!data.studio.licenseKey || !data.studio.aiEnabled) && (
              <div className="space-y-1 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-[#7a4f12]">
                {!data.studio.licenseKey && (
                  <p className="flex items-start gap-2">
                    <Info className="mt-0.5 h-4 w-4 shrink-0" />
                    AG Studio is running without a licence key: a watermark is shown. Set AG_STUDIO_LICENSE to remove it.
                  </p>
                )}
                {!data.studio.aiEnabled && (
                  <p className="flex items-start gap-2">
                    <Info className="mt-0.5 h-4 w-4 shrink-0" />
                    The AG Studio AI assistant is off. Set AG_STUDIO_AI=on (with GROQ_API_KEY) on a Groq tier with more than
                    8,000 tokens per minute: each assistant turn sends about 5,000 tokens.
                  </p>
                )}
              </div>
            )}

            {hasData(data) ? (
              <div style={{ height: 'calc(100vh - 220px)', minHeight: 720 }}>
                <ReliefPayStudio
                  data={data}
                  aiModels={data.studio.aiEnabled ? data.studio.aiModels : undefined}
                  token={getToken()}
                  mode={mode}
                />
              </div>
            ) : (
              <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center text-slate-600">
                No campaigns yet, so there is nothing to report on.
              </div>
            )}

            <DonationRefundsPanel onRefunded={load} />
          </div>
        )}
      </div>
    </div>
  );
}
