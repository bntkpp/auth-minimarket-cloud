/**
 * Configuración leída de variables de entorno. Falla al arrancar si falta el
 * secreto para firmar los JWT.
 */
if (!process.env.JWT_SECRET) {
  throw new Error('Falta la variable de entorno JWT_SECRET');
}

export const config = {
  port: Number(process.env.PORT) || 8080,
  jwtSecret: process.env.JWT_SECRET,
  // Vida del access token en segundos. Ponlo bajo (ej. 10) para demostrar la
  // expiración del token en /auth/validate.
  accessTtl: Number(process.env.ACCESS_TOKEN_TTL) || 3600,
  isProd: process.env.NODE_ENV === 'production',
};
