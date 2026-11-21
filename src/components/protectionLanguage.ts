export function protectionLanguage(value: string): string {
  return value
    .replace(/\bcontainment\b/gi, (match) => match[0] === match[0].toUpperCase() ? "Protection" : "protection")
    .replace(/\bcontained\b/gi, (match) => match[0] === match[0].toUpperCase() ? "Protected" : "protected");
}
