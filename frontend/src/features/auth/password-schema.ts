import { z } from 'zod';

export const passwordSchema = z
  .string()
  .min(1, 'La contraseña es obligatoria.')
  .regex(/^(?=.*[A-Za-z])(?=.*\d).{8,}$/, 'La contraseña debe tener al menos 8 caracteres, con letras y números.');
