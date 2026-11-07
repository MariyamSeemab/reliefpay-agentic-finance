import React, { useMemo, useRef, useState } from 'react';
import { AgStudioAiModule, enableStudioDevValidations } from 'ag-studio';
import { AgStudio, AgStudioProvider } from 'ag-studio-react';
import { buildAi } from './studio/ai';
import { buildStudioData } from './studio/data';
import { REPORT_PAGES, reliefPayReport } from './studio/initialReport';
import { reliefPayStudioTheme } from './studio/theme';

if (import.meta.env.DEV) enableStudioDevValidations();

// One AG Studio instance over the /api/analytics data. AG Studio leaves page
// navigation to the host, so the page tabs here switch selectedPageId through
// the Studio API.
function StudioInstance({ data, aiModels, token, mode }) {
  const apiRef = useRef(null);
  const [selectedPageId, setSelectedPageId] = useState(reliefPayReport.selectedPageId);
  const studioData = useMemo(() => buildStudioData(data), [data]);
  // `ai` is read once, when Studio is created.
  const [ai] = useState(() => (aiModels?.length ? buildAi(aiModels, token) : undefined));

  const selectPage = (pageId) => {
    const api = apiRef.current;
    if (!api) return;
    api.setState({ ...api.getState(), selectedPageId: pageId });
    setSelectedPageId(pageId);
  };

  // Pages added in edit mode have no title, so they are numbered.
  const [pageIds, setPageIds] = useState(REPORT_PAGES.map((p) => p.id));
  const pageTitle = (id, i) => REPORT_PAGES.find((p) => p.id === id)?.title ?? `Page ${i + 1}`;

  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-wrap gap-2 pb-3" role="tablist" aria-label="Report pages">
        {pageIds.map((id, i) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={selectedPageId === id}
            onClick={() => selectPage(id)}
            className={`rounded-full px-4 py-1.5 text-sm font-semibold transition ${
              selectedPageId === id
                ? 'bg-[#087E83] text-white'
                : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
            }`}
          >
            {pageTitle(id, i)}
          </button>
        ))}
      </div>
      <div className="min-h-0 flex-1">
        <AgStudioProvider licenseKey={data.studio.licenseKey || undefined} modules={ai ? [AgStudioAiModule] : undefined}>
          <AgStudio
            style={{ height: '100%', width: '100%' }}
            theme={reliefPayStudioTheme}
            layout={{ widgetBorderEnabled: true }}
            data={studioData}
            ai={ai}
            initialState={reliefPayReport}
            mode={mode}
            onApiReady={(event) => {
              apiRef.current = event.api;
            }}
            onStateUpdated={(event) => {
              setSelectedPageId(event.state.selectedPageId);
              const ids = event.state.pages.map((p) => p.id);
              setPageIds((current) => (current.join() === ids.join() ? current : ids));
            }}
          />
        </AgStudioProvider>
      </div>
    </div>
  );
}

// A new asOf (data reload) remounts Studio with fresh data.
export default function ReliefPayStudio(props) {
  return <StudioInstance key={props.data.asOf} {...props} />;
}
