interface PasswordRequirementsProps {
  differentFromCurrent?: boolean;
}

export function PasswordRequirements({ differentFromCurrent = false }: PasswordRequirementsProps) {
  return (
    <div className="text-sm text-ink-muted">
      <p>La contraseña debe cumplir:</p>
      <ul className="mt-1 list-disc pl-5">
        <li>Tener al menos 8 caracteres y como máximo 72.</li>
        <li>Incluir al menos una letra.</li>
        <li>Incluir al menos un número.</li>
        {differentFromCurrent ? <li>Ser distinta de tu contraseña actual.</li> : null}
      </ul>
    </div>
  );
}
