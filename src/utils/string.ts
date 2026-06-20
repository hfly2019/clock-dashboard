export function extractSimplifiedChinese(text: string): string {
  if (!text) return text
  const parts = text.split(';')
  if (parts.length > 1) {
    return parts[0].trim()
  }
  return text
}

export function cleanDisplayName(displayName: string): string {
  if (!displayName) return displayName
  return displayName
    .split(',')
    .map(part => extractSimplifiedChinese(part))
    .join(', ')
}
