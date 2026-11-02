import { Button } from "@/components/ui/button";

interface LyricsInputProps {
  value: string;
  /** Whether the text carries timestamps, which the panel reports back to the user. */
  timed: boolean;
  canCancel: boolean;
  onChange: (value: string) => void;
  onApply: () => void;
  onCancel: () => void;
}

export function LyricsInput({ value, timed, canCancel, onChange, onApply, onCancel }: LyricsInputProps) {
  return (
    <section className="mx-auto max-w-5xl px-4 pt-6">
      <div className="rounded-lg border border-border bg-surface p-4">
        <label htmlFor="lyrics-source" className="mb-2 block text-sm font-medium text-text-primary">
          Lyrics
        </label>
        <textarea
          id="lyrics-source"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          rows={12}
          spellCheck={false}
          placeholder="Paste your lyrics here, one line per row. Paste an existing .lrc or .dmll as it is to keep its timing. Blank rows become section breaks."
          className="w-full resize-y rounded-md border border-border bg-background p-3 font-mono text-sm leading-relaxed text-text-primary placeholder:text-text-tertiary"
        />
        <div className="mt-3 flex items-center justify-between gap-3">
          <p className="text-xs text-text-tertiary">
            {timed
              ? "LRC / DMLL timing detected. A timestamp stays with its line, so edit the words freely."
              : "Lines whose text did not change keep the timing they carry. Start a line with [mm:ss.xx] to set its time."}
          </p>
          <div className="flex shrink-0 gap-2">
            {canCancel && (
              <Button variant="ghost" onClick={onCancel}>
                Cancel
              </Button>
            )}
            <Button variant="primary" onClick={onApply}>
              Use lyrics
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
