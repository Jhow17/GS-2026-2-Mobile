/**
 * Conversões de temperatura usadas pelo heatIndexService.
 */

/** Converte Celsius para Fahrenheit. */
export function celsiusToFahrenheit(celsius: number): number {
  return (celsius * 9) / 5 + 32;
}

/** Converte Fahrenheit para Celsius. */
export function fahrenheitToCelsius(fahrenheit: number): number {
  return ((fahrenheit - 32) * 5) / 9;
}

/** Arredonda para uma casa decimal. */
export function roundToOneDecimal(value: number): number {
  return Math.round(value * 10) / 10;
}
