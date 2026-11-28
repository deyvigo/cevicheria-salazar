import { useId, useRef, type ClipboardEvent, type KeyboardEvent } from 'react';

interface CodeInputProps {
  label: string;
  length: number;
  value: string;
  onChange: (value: string) => void;
  error?: string;
}

export function CodeInput({ label, length, value, onChange, error }: CodeInputProps) {
  const labelId = useId();
  const refs = useRef<(HTMLInputElement | null)[]>([]);
  const digits = Array.from({ length }, (_, index) => value[index] ?? '');

  function focus(index: number) {
    refs.current[Math.min(Math.max(index, 0), length - 1)]?.focus();
  }

  function setDigit(index: number, digit: string) {
    const next = digits.slice();
    next[index] = digit;
    onChange(next.join(''));
  }

  function onInput(index: number, raw: string) {
    const typed = raw.replace(/\D/g, '');
    if (typed === '') {
      setDigit(index, '');
      return;
    }
    // The last typed digit wins, so typing over a filled box replaces it
    setDigit(index, typed[typed.length - 1]);
    focus(index + 1);
  }

  function onKeyDown(index: number, event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Backspace' && digits[index] === '') {
      event.preventDefault();
      setDigit(Math.max(index - 1, 0), '');
      focus(index - 1);
    } else if (event.key === 'ArrowLeft') {
      focus(index - 1);
    } else if (event.key === 'ArrowRight') {
      focus(index + 1);
    }
  }

  function onPaste(event: ClipboardEvent<HTMLInputElement>) {
    const pasted = event.clipboardData.getData('text').replace(/\D/g, '').slice(0, length);
    if (pasted === '') return;
    event.preventDefault();
    onChange(pasted);
    focus(pasted.length);
  }

  return (
    <div role="group" aria-labelledby={labelId} className="flex flex-col items-center gap-2">
      <span id={labelId} className="text-label text-ink">
        {label}
      </span>
      <div className="flex justify-center gap-3">
        {digits.map((digit, index) => (
          <input
            key={index}
            ref={(element) => {
              refs.current[index] = element;
            }}
            value={digit}
            onChange={(event) => onInput(index, event.target.value)}
            onKeyDown={(event) => onKeyDown(index, event)}
            onPaste={onPaste}
            onFocus={(event) => event.target.select()}
            inputMode="numeric"
            autoComplete="off"
            aria-label={`Dígito ${index + 1} de ${length}`}
            aria-invalid={error ? true : undefined}
            className={`h-14 w-14 rounded-md border text-center text-title-md font-bold text-ink focus:outline-none ${
              error ? 'border-coral-800' : 'border-border-strong focus:border-focus-ring'
            }`}
          />
        ))}
      </div>
      {error ? <p className="text-body-sm font-bold text-error-text">{error}</p> : null}
    </div>
  );
}
