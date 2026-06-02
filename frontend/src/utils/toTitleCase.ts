/**
 * Converts a string to Title Case (capitalizes the first letter of each word).
 *
 * @param str - The input string, which can be null or undefined.
 * @returns The capitalized title-cased string, or an empty string if the input is invalid or empty.
 */
export function toTitleCase(str: string | undefined | null): string {
  if (typeof str !== 'string' || !str) return ''
  return str.replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.slice(1).toLowerCase())
}
