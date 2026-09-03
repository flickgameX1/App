import { useEffect, useRef, useState } from 'react';
import Sheet from './Sheet';
import { PALETTES } from '../lib/palettes';
import { storageState, type StorageState } from '../lib/persistence';
import {
  backupFilename,
  buildBackup,
  parseBackup,
  restoreBackup,
  summarise,
  type Backup,
} from '../lib/backup';

function PaletteChoice({
  active,
  onChoose,
}: {
  active: string;
  onChoose: (id: string) => void;
}) {
  return (
    <ul className="space-y-2">
      {PALETTES.map((palette) => {
        const on = palette.id === active;
        return (
          <li key={palette.id}>
            <button
              type="button"
              onClick={() => onChoose(palette.id)}
              aria-pressed={on}
              className={`flex w-full items-center gap-3 rounded-xl border p-3 text-left ${
                on ? 'border-accent' : 'border-line'
              }`}
            >
              {/* A live sample rather than a name alone: these swatches are the
                  palette's own tokens, scoped by the data attribute. */}
              <span
                data-palette={palette.id}
                className="flex shrink-0 gap-1 rounded-lg border border-line bg-bg p-2"
              >
                {['bg-accent', 'bg-reward', 'bg-p1', 'bg-p2', 'bg-p3'].map((token) => (
                  <span key={token} className={`h-4 w-4 rounded-full ${token}`} />
                ))}
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-medium">{palette.name}</span>
                <span className="block text-xs text-dim">
                  {palette.scheme === 'light' ? 'Light' : 'Dark'}
                  {on ? ' · in use' : ''}
                </span>
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}

/**
 * Theme and backup. Backup matters more than it looks: there is no account and
 * no server, so a file you keep is the only safety net and the only way to carry
 * your history to another device.
 */
export default function SettingsSheet({
  open,
  activePalette,
  onClose,
  onChoosePalette,
}: {
  open: boolean;
  activePalette: string;
  onClose: () => void;
  onChoosePalette: (id: string) => void;
}) {
  const [storage, setStorage] = useState<StorageState>('unknown');
  const [pending, setPending] = useState<Backup | null>(null);
  const [exported, setExported] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) void storageState().then(setStorage);
  }, [open]);

  const exportNow = async () => {
    setMessage(null);
    setExported(JSON.stringify(await buildBackup(), null, 2));
  };

  /**
   * Saving a file is blocked in some embedded contexts, so the text is always on
   * screen to copy as well. A button that silently does nothing is worse than no
   * button.
   */
  const downloadExport = () => {
    if (!exported) return;
    const url = URL.createObjectURL(new Blob([exported], { type: 'application/json' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = backupFilename();
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  const copyExport = async () => {
    if (!exported) return;
    try {
      await navigator.clipboard.writeText(exported);
      setMessage('Copied.');
    } catch {
      setMessage('Copying was blocked — select the text below instead.');
    }
  };

  const chooseFile = async (file: File) => {
    setMessage(null);
    try {
      setPending(parseBackup(await file.text()));
    } catch (error) {
      setPending(null);
      setMessage(error instanceof Error ? error.message : 'That file could not be read.');
    }
  };

  const confirmRestore = async () => {
    if (!pending) return;
    await restoreBackup(pending);
    setPending(null);
    setMessage('Restored.');
  };

  return (
    <Sheet open={open} onClose={onClose} title="Settings">
      <h3 className="mb-2 text-sm text-muted">Theme</h3>
      <PaletteChoice active={activePalette} onChoose={onChoosePalette} />

      <h3 className="mt-6 mb-1 text-sm text-muted">Backup</h3>
      <p className="mb-3 text-xs text-dim">
        Everything is stored in this browser only. A backup file is how you keep it safe and how you
        move it to another device.
      </p>

      {exported ? (
        <div className="rounded-xl border border-line p-3">
          <p className="text-sm">Your backup, {(exported.length / 1024).toFixed(0)} KB.</p>
          <div className="mt-2 flex gap-2">
            <button
              type="button"
              onClick={downloadExport}
              className="flex-1 rounded-lg border border-line py-2.5 text-sm"
            >
              Save as a file
            </button>
            <button
              type="button"
              onClick={copyExport}
              className="flex-1 rounded-lg border border-line py-2.5 text-sm"
            >
              Copy the text
            </button>
          </div>
          <textarea
            readOnly
            value={exported}
            aria-label="Backup contents"
            onFocus={(e) => e.currentTarget.select()}
            className="mt-2 h-24 w-full resize-none rounded-lg border border-line bg-bg p-2 font-mono text-[10px] text-muted"
          />
          <p className="mt-1 text-xs text-dim">
            If saving does nothing, this app is embedded somewhere that blocks downloads — copy the text
            and keep it in a note instead.
          </p>
          <button
            type="button"
            onClick={() => setExported(null)}
            className="mt-2 w-full py-2 text-sm text-dim"
          >
            Done
          </button>
        </div>
      ) : pending ? (
        <div className="rounded-xl border border-warn p-3">
          <p className="text-sm">
            {(() => {
              const { tasks, sprints, days } = summarise(pending);
              const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;
              return `This file holds ${plural(tasks, 'task')}, ${plural(sprints, 'sprint')} and ${plural(days, 'day')} of history.`;
            })()}
          </p>
          <p className="mt-1 text-xs text-warn">Restoring replaces everything currently in the app.</p>
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={confirmRestore}
              className="flex-1 rounded-lg border border-line py-2.5 text-sm"
            >
              Replace everything
            </button>
            <button
              type="button"
              onClick={() => setPending(null)}
              className="flex-1 rounded-lg border border-line py-2.5 text-sm text-muted"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div className="flex gap-2">
          <button
            type="button"
            onClick={exportNow}
            className="flex-1 rounded-lg border border-line py-2.5 text-sm"
          >
            Export a copy
          </button>
          <button
            type="button"
            onClick={() => fileInput.current?.click()}
            className="flex-1 rounded-lg border border-line py-2.5 text-sm"
          >
            Restore a copy
          </button>
        </div>
      )}
      <input
        ref={fileInput}
        type="file"
        accept="application/json,.json"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = '';
          if (file) void chooseFile(file);
        }}
      />
      {message && <p className="mt-2 text-xs text-muted">{message}</p>}

      <p className="mt-4 text-xs text-dim">
        {storage === 'persistent'
          ? 'Storage: kept. The browser has agreed not to clear this app’s data.'
          : storage === 'best-effort'
            ? 'Storage: best-effort. Add the app to your home screen so the browser keeps its data.'
            : 'Storage: this browser doesn’t report whether it will keep the data.'}
      </p>
    </Sheet>
  );
}
