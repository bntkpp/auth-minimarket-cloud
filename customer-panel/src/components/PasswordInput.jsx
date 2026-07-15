import { useId, useState } from 'react';

/**
 * Campo de contraseña reutilizable con botón de mostrar/ocultar.
 * Reenvía cualquier prop extra al <input> (name, minLength, autoComplete, etc.).
 */
export default function PasswordInput({ label, value, onChange, hint, ...inputProps }) {
  const [show, setShow] = useState(false);
  const id = useId();

  return (
    <label htmlFor={id}>
      {label}
      <span className="password-field">
        <input
          id={id}
          type={show ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          {...inputProps}
        />
        <button
          type="button"
          className="password-toggle"
          onClick={() => setShow((s) => !s)}
          aria-label={show ? 'Ocultar contraseña' : 'Mostrar contraseña'}
          aria-pressed={show}
        >
          {show ? '🙈' : '👁'}
        </button>
      </span>
      {hint && <small className="muted">{hint}</small>}
    </label>
  );
}
