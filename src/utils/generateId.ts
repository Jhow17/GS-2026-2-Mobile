/**
 * Gera identificadores únicos simples: prefixo, data e trecho aleatório.
 * Suficiente para uma prova de conceito local (não é UUID criptográfico).
 */
export function generateId(prefix: string): string {
  const timePart = Date.now().toString(36);
  const randomPart = Math.random().toString(36).slice(2, 8);
  return `${prefix}_${timePart}_${randomPart}`;
}
