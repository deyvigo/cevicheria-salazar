import { useState, type FormEvent } from 'react';
import { SearchIcon } from '@/components/icons/search-icon';

const MAX_LENGTH = 100;

interface ProductSearchProps {
  initialValue: string;
  onSearch: (term: string) => void;
}

export function ProductSearch({ initialValue, onSearch }: ProductSearchProps) {
  const [value, setValue] = useState(initialValue);

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    onSearch(value.trim());
  }

  return (
    <form role="search" onSubmit={handleSubmit} className="relative flex w-full max-w-md items-center">
      <input
        type="search"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        maxLength={MAX_LENGTH}
        placeholder="Buscar platos"
        aria-label="Buscar platos"
        className="h-12 w-full rounded-md border border-border-strong pr-12 pl-4 text-base text-ink placeholder:text-ink-subtle focus:border-focus-ring focus:outline-none"
      />
      <button
        type="submit"
        aria-label="Buscar"
        className="absolute right-1 flex h-10 w-10 items-center justify-center rounded-md text-ink-muted hover:text-ink focus-visible:shadow-focus focus-visible:outline-none"
      >
        <SearchIcon />
      </button>
    </form>
  );
}
