/**
 * ¿Esta cadena PARECE un correo?
 *
 * Deliberadamente simple: algo, una arroba, algo, un punto, un TLD de dos letras o más.
 * Las regex "completas" de RFC 5322 tienen cientos de caracteres, rechazan correos
 * válidos y aceptan basura igual — y no es este chequeo el que decide nada. Acá solo se
 * evita el viaje de red por un dedazo evidente ("juan@", "juan.com"); quién valida en
 * serio es `EmailStr` en el backend, y quién prueba que el buzón EXISTE es el código de
 * 6 dígitos que llega a él.
 */
const FORMA_DE_CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function esCorreoValido(email: string): boolean {
  return FORMA_DE_CORREO.test(email.trim());
}
