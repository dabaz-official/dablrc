import { Button } from "@/components/ui/button";
import type { Summary } from "@/lib/dmll/model";

interface SummaryBarProps {
  summary: Summary;
  hasAudio: boolean;
  canUndo: boolean;
  onEdit: () => void;
  onEstimate: () => void;
  onUndo: () => void;
  onClear: () => void;
}

export function SummaryBar({ summary, hasAudio, canUndo, onEdit, onEstimate, onUndo, onClear }: SummaryBarProps) {
  const warnings: string[] = [];
  if (summary.partial > 0) warnings.push(`${summary.partial} partly timed, exported with line timing only`);
  if (summary.orphans > 0) warnings.push(`${summary.orphans} ad-lib without a timed line above, exported as text`);

  return (
    <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3 text-sm text-text-secondary">
      <span>{summary.lyrics} lines</span>
      {summary.adlibs > 0 && (
        <span>
          {summary.adlibs} ad-lib{summary.adlibs === 1 ? "" : "s"}
        </span>
      )}
      <span>{summary.wordSynced} word-synced</span>
      {!hasAudio && <span className="text-text-tertiary">Open an audio file to start syncing</span>}
      {warnings.map((text) => (
        <span key={text} className="text-warning">
          {text}
        </span>
      ))}

      <div className="ml-auto flex items-center gap-2">
        {summary.lineOnly > 0 && (
          <Button size="sm" onClick={onEstimate} title="Spread each timed line's words across its span">
            Estimate {summary.lineOnly} lines
          </Button>
        )}
        <Button size="sm" variant="ghost" disabled={!canUndo} onClick={onUndo}>
          Undo
        </Button>
        <Button size="sm" onClick={onEdit}>
          Edit lyrics
        </Button>
        <Button size="sm" variant="ghost" onClick={onClear}>
          Clear
        </Button>
      </div>
    </div>
  );
}
