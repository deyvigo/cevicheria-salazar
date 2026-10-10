import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';

const MAX_LENGTH = 100;

export function SearchBox({ initialValue = '' }: { initialValue?: string }) {
  const navigate = useNavigate();
  const [value, setValue] = useState(initialValue);

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const term = value.trim();
    navigate(term ? `/?${new URLSearchParams({ q: term }).toString()}` : '/');
  }

  return (
    <form role="search" onSubmit={handleSubmit} className="relative flex w-full items-center">
      <input
        type="search"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        maxLength={MAX_LENGTH}
        placeholder="Buscar platos"
        aria-label="Buscar platos"
        className="h-12 w-full rounded-md border border-border-strong pr-12 pl-4 text-base text-ink placeholder:text-ink-subtle focus:border-focus-ring focus:ring-2 focus:ring-celeste-200 focus:outline-none"
      />
      <button
        type="submit"
        aria-label="Buscar"
        className="absolute right-1 flex h-10 w-10 items-center justify-center rounded-md text-ink-muted hover:text-ink focus-visible:shadow-focus focus-visible:outline-none"
      >
        <svg
          viewBox="0 0 24 24"
          width="20"
          height="20"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-3.5-3.5" />
        </svg>
      </button>
    </form>
  );
}
