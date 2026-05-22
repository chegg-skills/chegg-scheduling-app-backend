export const GROUP_COLOR_SWATCHES = [
  '#E87100', // Chegg Orange
  '#3b82f6', // blue
  '#10b981', // emerald
  '#f59e0b', // amber
  '#ef4444', // red
  '#8b5cf6', // violet
  '#ec4899', // pink
  '#14b8a6', // teal
  '#6366f1', // indigo
  '#4b5563', // charcoal
] as const

/**
 * Converts HSL color values to a standard hexadecimal color string.
 */
export function hslToHex(h: number, s: number, l: number): string {
  const lNorm = l / 100
  const a = (s * Math.min(lNorm, 1 - lNorm)) / 100
  const f = (n: number) => {
    const k = (n + h / 30) % 12
    const colorVal = lNorm - a * Math.max(Math.min(k - 3, 9 - k, 1), -1)
    return Math.round(255 * colorVal)
      .toString(16)
      .padStart(2, '0')
  }
  return `#${f(0)}${f(8)}${f(4)}`
}

/**
 * Generates a vibrant, premium-looking modern dashboard color as a hex string.
 */
export function generateBeautifulRandomColor(): string {
  const h = Math.floor(Math.random() * 360)
  const s = Math.floor(Math.random() * 20) + 65 // 65% - 85% for solid saturation
  const l = Math.floor(Math.random() * 10) + 45 // 45% - 55% for legible contrast
  return hslToHex(h, s, l)
}
