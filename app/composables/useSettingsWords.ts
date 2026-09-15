// De instellingen leesbaar maken. `bands.settings` is één tekstkolom met JSON
// in PascalCase; de database klapt dat al uit naar (scope, idx, field, was,
// becomes). Hier vertalen we alleen waarden naar iets leesbaars.

/** Waarden tonen in de eenheid die bij het veld hoort. */
export function waardeLabel(field: string, waarde: string | null): string {
  if (waarde === null || waarde === '') return '—'
  if (field === 'GainDb' || field === 'FaderDb' || field.startsWith('send_')) return formatDbKort(Number(waarde))
  if (field === 'Mute') return waarde === 'true' ? 'stil' : 'aan'
  if (field === 'Linked') return waarde === 'true' ? 'gekoppeld' : 'los'
  if (field === 'FaderKnown') return waarde === 'true' ? 'bekend' : 'onbekend'
  if (field === 'ColorMappedValue') return colorName(Number(waarde))
  if (field === 'IconMappedValue') return 'icoon ' + waarde
  return waarde
}
