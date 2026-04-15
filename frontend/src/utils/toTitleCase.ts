// Utility to convert a string to Title Case (capitalize first letter of each word)
export function toTitleCase(str: string | undefined | null): string {
  if (typeof str !== 'string' || !str) return '';
  return str.replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.slice(1).toLowerCase());
}
