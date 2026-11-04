import i18n from '.'

const formats = new Map<string, Intl.NumberFormat>()

/** A number with exactly `digits` decimals, written the current language's way ("1,25" in German, "١٫٢٥" in Arabic). */
export function num(value: number, digits: number) {
  const key = `${i18n.resolvedLanguage}:${digits}`
  let format = formats.get(key)
  if (!format) formats.set(key, (format = new Intl.NumberFormat(i18n.resolvedLanguage, { minimumFractionDigits: digits, maximumFractionDigits: digits })))
  return format.format(value)
}
