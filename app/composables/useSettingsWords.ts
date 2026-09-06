// De instellingen leesbaar maken. `bands.settings` is één tekstkolom met JSON
// in PascalCase; de database klapt dat al uit naar (scope, idx, field, was,
// becomes). Hier vertalen we alleen de veldnamen.

/** send_0 is de hoofdmix, send_1 t/m send_6 zijn de zes gekleurde monitormixen. */
export function veldLabel(scope: string, field: string, idx: number | null): string {
  if (field.startsWith('send_')) {
    const n = Number(field.slice(5))
    return n === 0 ? 'naar de hoofdmix' : 'naar de ' + colorName(n).toLowerCase() + 'e mix'
  }
  switch (field) {
    case 'GainDb': return 'ingangsvolume'
    case 'FaderDb': return scope === 'main' ? 'hoofdvolume' : 'volume'
    case 'FaderKnown': return 'volume bekend'
    case 'Mute': return 'stilgezet'
    case 'Name': return 'naam'
    case 'ColorMappedValue': return 'kleur'
    case 'IconMappedValue': return 'icoontje'
    case 'Linked': return 'gekoppeld aan buurkanaal'
    default: return field
  }
}

export function scopeLabel(scope: string, idx: number | null): string {
  if (scope === 'main') return 'Hoofdmix'
  if (scope === 'bus') return 'Monitormix ' + colorName(idx).toLowerCase()
  if (scope === 'channel') return 'Kanaal ' + (idx ?? '?')
  return scope
}

/** Waarden tonen in de eenheid die bij het veld hoort. */
export function waardeLabel(field: string, waarde: string | null): string {
  if (waarde === null || waarde === '') return 'niets'
  if (field === 'GainDb' || field === 'FaderDb' || field.startsWith('send_')) return formatDb(Number(waarde))
  if (field === 'Mute') return waarde === 'true' ? 'stil' : 'aan'
  if (field === 'Linked') return waarde === 'true' ? 'gekoppeld' : 'los'
  if (field === 'FaderKnown') return waarde === 'true' ? 'bekend' : 'onbekend'
  if (field === 'ColorMappedValue') return colorName(Number(waarde))
  return waarde
}

/** Waar mensen hun mix mee opsloegen. */
export function bronLabel(source?: string | null): string {
  if (!source) return 'onbekend'
  const m: Record<string, string> = {
    current: 'huidige stand',
    history: 'eerder opgeslagen',
    manual: 'handmatig opgeslagen',
    onboarding: 'tijdens het instellen',
    apply: 'bij het terugzetten naar de mixer',
  }
  return m[source] || source
}
