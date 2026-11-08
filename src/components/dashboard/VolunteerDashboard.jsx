import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  MapPin, Clock, CheckCircle, AlertCircle, MessageCircle, Phone, Camera, Upload, FileText, X, ChevronDown, ChevronUp,
} from 'lucide-react';
import { INITIAL_VOLUNTEER_TASKS } from '../../data/mockData';

// Field tasks are demo data (there is no volunteer API yet). Progress, notes and
// evidence file names are saved in this browser's localStorage per volunteer, so
// they survive a reload. Files themselves are not uploaded anywhere.
const COORDINATOR_EMAIL = 'dineshrajdhanapathy@gmail.com';
const MAX_FILE_BYTES = 10 * 1024 * 1024;
const ACCEPTED = 'image/*,application/pdf';

function storageKey(user) {
  return `reliefpay.volunteerTasks.${user?.id || user?.email || 'demo'}`;
}

function loadTasks(user) {
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey(user)) || 'null');
    if (Array.isArray(saved)) {
      // Keep saved progress, and pick up any new demo tasks.
      const byId = new Map(saved.map((t) => [t.id, t]));
      return INITIAL_VOLUNTEER_TASKS.map((t) => ({ evidence: [], fieldNotes: '', ...t, ...byId.get(t.id) }));
    }
  } catch {
    // Corrupt storage: fall back to the demo tasks.
  }
  return INITIAL_VOLUNTEER_TASKS.map((t) => ({ ...t, evidence: [], fieldNotes: '' }));
}

export function useVolunteerTasks(user) {
  const [tasks, setTasks] = useState(() => loadTasks(user));
  useEffect(() => {
    localStorage.setItem(storageKey(user), JSON.stringify(tasks));
  }, [tasks, user]);
  const updateTask = useCallback((id, patch) => {
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, ...(typeof patch === 'function' ? patch(t) : patch) } : t)));
  }, []);
  return [tasks, updateTask];
}

function formatSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function readFiles(fileList) {
  const accepted = [];
  const rejected = [];
  for (const f of Array.from(fileList || [])) {
    const okType = f.type.startsWith('image/') || f.type === 'application/pdf';
    if (!okType) rejected.push(`${f.name}: only images or PDF`);
    else if (f.size > MAX_FILE_BYTES) rejected.push(`${f.name}: larger than 10 MB`);
    else accepted.push({ name: f.name, size: f.size, type: f.type, addedAt: new Date().toISOString() });
  }
  return { accepted, rejected };
}

// Shared file picker + drop zone that attaches evidence to one task.
function EvidenceDropZone({ onFiles, compact = false }) {
  const inputRef = useRef(null);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState('');

  const handle = (fileList) => {
    const { accepted, rejected } = readFiles(fileList);
    setError(rejected.join('; '));
    if (accepted.length) onFiles(accepted);
  };

  return (
    <div>
      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => { e.preventDefault(); setDragging(false); handle(e.dataTransfer.files); }}
        className={`border-2 border-dashed rounded-lg text-center transition ${compact ? 'p-4' : 'p-10'} ${dragging ? 'border-[#087E83] bg-emerald-50' : 'border-slate-300'}`}
      >
        <Upload className="w-6 h-6 text-slate-400 mx-auto mb-2" />
        <p className="text-sm text-slate-600 mb-3">Drag photos or a PDF here, or</p>
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="bg-[#087E83] hover:bg-[#123B4A] text-white font-semibold px-5 py-2 rounded-lg text-sm transition"
        >
          Choose Files
        </button>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept={ACCEPTED}
          className="hidden"
          onChange={(e) => { handle(e.target.files); e.target.value = ''; }}
        />
        <p className="text-xs text-slate-400 mt-2">Images or PDF, up to 10 MB each</p>
      </div>
      {error && <p className="text-xs text-red-600 mt-2">{error}</p>}
    </div>
  );
}

function EvidenceList({ files, onRemove }) {
  if (!files?.length) return <p className="text-sm text-slate-500">No evidence yet.</p>;
  return (
    <ul className="space-y-2">
      {files.map((f, i) => (
        <li key={`${f.name}-${f.addedAt}`} className="flex items-center justify-between gap-3 bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm">
          <span className="flex items-center gap-2 min-w-0">
            {f.type === 'application/pdf' ? <FileText className="w-4 h-4 text-slate-500 shrink-0" /> : <Camera className="w-4 h-4 text-slate-500 shrink-0" />}
            <span className="truncate text-slate-800">{f.name}</span>
            <span className="text-xs text-slate-400 shrink-0">{formatSize(f.size)}</span>
          </span>
          {onRemove && (
            <button type="button" onClick={() => onRemove(i)} aria-label={`Remove ${f.name}`} className="text-slate-400 hover:text-red-600">
              <X className="w-4 h-4" />
            </button>
          )}
        </li>
      ))}
    </ul>
  );
}

function contactHref(task, user) {
  const subject = `Field task ${task.id}: ${task.beneficiaryName}`;
  const body = `Hello,\n\nI am ${user?.name || 'a ReliefPay volunteer'} working on field task ${task.id} for ${task.beneficiaryName} (${task.area}, application ${task.beneficiaryId}).\n\n`;
  return `mailto:${COORDINATOR_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

const STATUS_STYLE = {
  COMPLETED: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  IN_PROGRESS: 'bg-blue-50 text-blue-700 border-blue-200',
  ASSIGNED: 'bg-yellow-50 text-yellow-700 border-yellow-200',
};

function StatusBadge({ status }) {
  const Icon = status === 'COMPLETED' ? CheckCircle : status === 'IN_PROGRESS' ? Clock : AlertCircle;
  return (
    <div className={`flex items-center gap-2 px-3 py-1 rounded-lg border ${STATUS_STYLE[status] || 'bg-slate-50 text-slate-700 border-slate-200'}`}>
      <Icon className="w-5 h-5" />
      <span className="font-semibold text-sm">{status.replace('_', ' ')}</span>
    </div>
  );
}

function ActiveTaskCard({ task, user, updateTask }) {
  const [panel, setPanel] = useState(null); // 'evidence' | 'notes' | null
  const [draft, setDraft] = useState(task.fieldNotes || '');
  const [saved, setSaved] = useState(false);
  const toggle = (name) => setPanel((p) => (p === name ? null : name));

  const addFiles = (files) => updateTask(task.id, (t) => ({ evidence: [...(t.evidence || []), ...files] }));
  const removeFile = (i) => updateTask(task.id, (t) => ({ evidence: t.evidence.filter((_, idx) => idx !== i) }));
  const saveNotes = () => {
    updateTask(task.id, { fieldNotes: draft.trim() });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };
  const evidenceCount = task.evidence?.length || 0;
  const canComplete = task.status === 'IN_PROGRESS' && evidenceCount > 0;

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden hover:shadow-md transition">
      <div className="p-6 border-b border-slate-200">
        <div className="flex items-start justify-between mb-4">
          <div>
            <p className="text-sm text-slate-500 mb-1">Task ID</p>
            <p className="font-bold text-slate-900">{task.id}</p>
          </div>
          <StatusBadge status={task.status} />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <p className="text-xs text-slate-500">Beneficiary</p>
            <p className="font-bold text-slate-900">{task.beneficiaryName}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500">Location</p>
            <p className="font-bold text-slate-900">{task.area}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500">Due Date</p>
            <p className="font-bold text-slate-900">{task.dueDate}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500">Evidence</p>
            <p className="font-bold text-slate-900">{evidenceCount} file{evidenceCount === 1 ? '' : 's'}</p>
          </div>
        </div>
      </div>

      <div className="px-6 py-4 bg-slate-50 border-b border-slate-200">
        <div className="flex items-start gap-3">
          <MapPin className="w-4 h-4 text-slate-500 mt-1 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-slate-900 mb-1">Assessment Notes</p>
            <p className="text-sm text-slate-600">{task.notes}</p>
            {task.fieldNotes && (
              <p className="text-sm text-slate-800 mt-2"><span className="font-semibold">Your field notes:</span> {task.fieldNotes}</p>
            )}
          </div>
        </div>
      </div>

      {panel === 'evidence' && (
        <div className="px-6 py-4 border-b border-slate-200 space-y-3">
          <EvidenceDropZone compact onFiles={addFiles} />
          <EvidenceList files={task.evidence} onRemove={removeFile} />
        </div>
      )}

      {panel === 'notes' && (
        <div className="px-6 py-4 border-b border-slate-200 space-y-3">
          <label htmlFor={`notes-${task.id}`} className="text-sm font-semibold text-slate-900">Field notes</label>
          <textarea
            id={`notes-${task.id}`}
            rows={3}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="What did you see on site? Damage, documents checked, household size..."
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-[#087E83] outline-none"
          />
          <div className="flex items-center gap-3">
            <button type="button" onClick={saveNotes} className="bg-slate-900 hover:bg-slate-800 text-white font-semibold px-4 py-2 rounded-lg text-sm transition">
              Save notes
            </button>
            {saved && <span className="text-sm text-emerald-600">Saved</span>}
          </div>
        </div>
      )}

      <div className="px-6 py-4 flex flex-wrap gap-3">
        {task.status === 'ASSIGNED' && (
          <button
            type="button"
            onClick={() => updateTask(task.id, { status: 'IN_PROGRESS', startedAt: new Date().toISOString() })}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 rounded-lg text-sm flex items-center justify-center gap-2 transition"
          >
            <Clock className="w-4 h-4" />
            Start Task
          </button>
        )}
        {task.status === 'IN_PROGRESS' && (
          <button
            type="button"
            onClick={() => updateTask(task.id, { status: 'COMPLETED', completedAt: new Date().toISOString() })}
            disabled={!canComplete}
            title={canComplete ? 'Mark this field check as done' : 'Upload at least one evidence file first'}
            className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-2.5 rounded-lg text-sm flex items-center justify-center gap-2 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <CheckCircle className="w-4 h-4" />
            Mark Complete
          </button>
        )}
        <button
          type="button"
          onClick={() => toggle('evidence')}
          aria-expanded={panel === 'evidence'}
          className={`flex-1 font-semibold py-2.5 rounded-lg text-sm flex items-center justify-center gap-2 transition ${panel === 'evidence' ? 'bg-slate-700 text-white' : 'bg-slate-900 hover:bg-slate-800 text-white'}`}
        >
          <Camera className="w-4 h-4" />
          Upload Evidence
        </button>
        <button
          type="button"
          onClick={() => toggle('notes')}
          aria-expanded={panel === 'notes'}
          className={`flex-1 border font-semibold py-2.5 rounded-lg text-sm flex items-center justify-center gap-2 transition ${panel === 'notes' ? 'border-slate-900 bg-slate-100 text-slate-900' : 'border-slate-300 text-slate-900 hover:bg-slate-50'}`}
        >
          <MessageCircle className="w-4 h-4" />
          Notes
        </button>
        <a
          href={contactHref(task, user)}
          title="Email the relief coordinator about this task"
          className="px-4 border border-slate-300 text-slate-900 hover:bg-slate-50 font-semibold py-2.5 rounded-lg text-sm flex items-center justify-center gap-2 transition"
        >
          <Phone className="w-4 h-4" />
          Contact
        </a>
      </div>
      {task.status === 'IN_PROGRESS' && evidenceCount === 0 && (
        <p className="px-6 pb-4 -mt-2 text-xs text-slate-500">Upload at least one photo or document to mark this task complete.</p>
      )}
    </div>
  );
}

function CompletedTaskRow({ task, updateTask }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="bg-emerald-50 rounded-xl border border-emerald-200">
      <div className="p-4 flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <CheckCircle className="w-6 h-6 text-emerald-600 flex-shrink-0" />
          <div>
            <p className="font-semibold text-slate-900">{task.beneficiaryName}</p>
            <p className="text-xs text-slate-600">
              {task.id} • {task.area}
              {task.completedAt && ` • completed ${new Date(task.completedAt).toLocaleString()}`}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          className="text-emerald-700 hover:text-emerald-800 font-semibold text-sm flex items-center gap-1"
        >
          {open ? 'Hide Details' : 'View Details'}
          {open ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
      </div>
      {open && (
        <div className="px-4 pb-4 space-y-3 border-t border-emerald-200 pt-3">
          <p className="text-sm text-slate-700"><span className="font-semibold">Assessment:</span> {task.notes}</p>
          <p className="text-sm text-slate-700"><span className="font-semibold">Your field notes:</span> {task.fieldNotes || 'None'}</p>
          <div>
            <p className="text-sm font-semibold text-slate-900 mb-2">Evidence</p>
            <EvidenceList files={task.evidence} />
          </div>
          <button
            type="button"
            onClick={() => updateTask(task.id, { status: 'IN_PROGRESS', completedAt: null })}
            className="text-sm text-slate-600 hover:text-slate-900 underline"
          >
            Reopen task
          </button>
        </div>
      )}
    </div>
  );
}

export const VolunteerDashboard = ({ currentUser }) => {
  const [tasks, updateTask] = useVolunteerTasks(currentUser);

  const inProgressCount = tasks.filter((t) => t.status === 'IN_PROGRESS').length;
  const completedCount = tasks.filter((t) => t.status === 'COMPLETED').length;
  const completionRate = tasks.length ? Math.round((completedCount / tasks.length) * 100) : 0;
  const active = tasks.filter((t) => t.status !== 'COMPLETED');
  const completed = tasks.filter((t) => t.status === 'COMPLETED');

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-amber-600 to-amber-700 rounded-2xl p-8 text-white">
        <h1 className="text-3xl font-bold mb-2">Field Assessment Tasks</h1>
        <p className="text-amber-100">Verify beneficiaries and assess relief needs in the field</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
          <p className="text-xs text-slate-600 mb-2 font-semibold">Total Tasks</p>
          <p className="text-2xl font-bold text-slate-900">{tasks.length}</p>
          <p className="text-xs text-slate-500 mt-2">Assigned to you</p>
        </div>
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
          <p className="text-xs text-slate-600 mb-2 font-semibold">In Progress</p>
          <p className="text-2xl font-bold text-blue-600">{inProgressCount}</p>
          <p className="text-xs text-blue-600 mt-2">Currently active</p>
        </div>
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
          <p className="text-xs text-slate-600 mb-2 font-semibold">Completed</p>
          <p className="text-2xl font-bold text-emerald-600">{completedCount}</p>
          <p className="text-xs text-emerald-600 mt-2">Successfully verified</p>
        </div>
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
          <p className="text-xs text-slate-600 mb-2 font-semibold">Completion Rate</p>
          <p className="text-2xl font-bold text-slate-900">{completionRate}%</p>
          <div className="w-full h-1.5 bg-slate-200 rounded-full mt-3 overflow-hidden">
            <div className="h-full bg-emerald-500 transition-all" style={{ width: `${completionRate}%` }}></div>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <h2 className="text-lg font-bold text-slate-900">Active Tasks</h2>
        {active.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center text-slate-600">All your field tasks are complete.</div>
        ) : (
          <div className="space-y-4">
            {active.map((task) => (
              <ActiveTaskCard key={task.id} task={task} user={currentUser} updateTask={updateTask} />
            ))}
          </div>
        )}
      </div>

      {completed.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-lg font-bold text-slate-900">Completed Tasks</h2>
          <div className="space-y-3">
            {completed.map((task) => (
              <CompletedTaskRow key={task.id} task={task} updateTask={updateTask} />
            ))}
          </div>
        </div>
      )}

      <p className="text-xs text-slate-500">
        Field tasks are demo data. Progress, notes and evidence file names are saved in this browser only; files are not uploaded to a server.
      </p>
    </div>
  );
};

// Sidebar "Upload Evidence" section: pick a task, attach files to it.
export const VolunteerEvidenceUpload = ({ currentUser }) => {
  const [tasks, updateTask] = useVolunteerTasks(currentUser);
  const open = tasks.filter((t) => t.status !== 'COMPLETED');
  const [taskId, setTaskId] = useState(open[0]?.id || tasks[0]?.id || '');
  const task = tasks.find((t) => t.id === taskId);

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-8 space-y-5">
      <div>
        <label htmlFor="evidence-task" className="block text-sm font-semibold text-slate-900 mb-2">Task</label>
        <select
          id="evidence-task"
          value={taskId}
          onChange={(e) => setTaskId(e.target.value)}
          className="w-full md:w-96 px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-[#087E83] outline-none"
        >
          {tasks.map((t) => (
            <option key={t.id} value={t.id}>
              {t.id} - {t.beneficiaryName} ({t.area}) - {t.status.replace('_', ' ')}
            </option>
          ))}
        </select>
      </div>
      {task && (
        <>
          <EvidenceDropZone onFiles={(files) => updateTask(task.id, (t) => ({ evidence: [...(t.evidence || []), ...files] }))} />
          <div>
            <p className="text-sm font-semibold text-slate-900 mb-2">Evidence for {task.id}</p>
            <EvidenceList
              files={task.evidence}
              onRemove={(i) => updateTask(task.id, (t) => ({ evidence: t.evidence.filter((_, idx) => idx !== i) }))}
            />
          </div>
        </>
      )}
      <p className="text-xs text-slate-500">File names are saved in this browser only; files are not uploaded to a server.</p>
    </div>
  );
};
