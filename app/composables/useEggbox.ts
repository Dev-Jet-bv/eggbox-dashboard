// De vertaallaag tussen de database en gewone taal.
//
// Op het bord staan geen begrippen uit de codebase: geen "app-sessie", geen
// "bus", geen "fader-gebaar", geen "flag". Alles wat een gebruiker leest komt
// hier vandaan.

/** De zes kleuren liggen vast en spiegelen het bedrukte front van de mixer.
 *  color_value 1 t/m 6 is meteen het busnummer. (Models/Color.cs) */
export const MIX_COLORS: Record<number, { name: string; hex: string }> = {
  1: { name: 'Rood', hex: '#ff6464' },
  2: { name: 'Groen', hex: '#2dc75c' },
  3: { name: 'Geel', hex: '#ffdc4a' },
  4: { name: 'Blauw', hex: '#659df2' },
  5: { name: 'Magenta', hex: '#8f7fee' },
  6: { name: 'Wit', hex: '#ffffff' },
}

export const colorHex = (v?: number | null) =>
  (v && MIX_COLORS[v]?.hex) || '#6b5f5f'

export const colorName = (v?: number | null) =>
  (v && MIX_COLORS[v]?.name) || 'geen kleur'

/** Kanaal- en busnummers uit de app zijn 1-based (Services/Mixer.cs:469). */
export const channelLabel = (idx?: number | null) =>
  idx == null ? 'een kanaal' : `kanaal ${idx}`

export const busLabel = (idx?: number | null) =>
  idx == null ? 'een monitormix' : `de ${colorName(idx).toLowerCase()}e monitormix`

// -- tijd ---------------------------------------------------------------

export const clock = (iso?: string | null) =>
  iso ? new Date(iso).toLocaleTimeString('nl-BE', { hour: '2-digit', minute: '2-digit' }) : ''

export const clockSec = (iso?: string | null) =>
  iso ? new Date(iso).toLocaleTimeString('nl-BE', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : ''

export const dayLabel = (iso?: string | null) => {
  if (!iso) return ''
  const d = new Date(iso)
  const vandaag = new Date()
  const isSameDay = (a: Date, b: Date) => a.toDateString() === b.toDateString()
  const gisteren = new Date(vandaag.getTime() - 864e5)
  if (isSameDay(d, vandaag)) return 'vandaag'
  if (isSameDay(d, gisteren)) return 'gisteren'
  return d.toLocaleDateString('nl-BE', { weekday: 'long', day: 'numeric', month: 'long' })
}

export const dayAndClock = (iso?: string | null) =>
  iso ? `${dayLabel(iso)} om ${clock(iso)}` : ''

/** "net nu", "3 min geleden", "gisteren om 21:14" */
export const ago = (iso?: string | null) => {
  if (!iso) return 'nooit'
  const s = (Date.now() - new Date(iso).getTime()) / 1000
  if (s < 45) return 'net nu'
  if (s < 90) return 'een minuut geleden'
  if (s < 3600) return `${Math.round(s / 60)} min geleden`
  if (s < 5 * 3600) {
    const u = Math.floor(s / 3600)
    return `${u} uur geleden`
  }
  return dayAndClock(iso)
}

/** Postgres interval komt binnen als "HH:MM:SS" of als object. */
export const intervalToSeconds = (iv: unknown): number | null => {
  if (iv == null) return null
  if (typeof iv === 'number') return iv
  if (typeof iv === 'string') {
    const m = iv.match(/^(-?)(\d+):(\d{2}):(\d{2}(?:\.\d+)?)$/)
    if (m) {
      const sign = m[1] === '-' ? -1 : 1
      return sign * (Number(m[2]) * 3600 + Number(m[3]) * 60 + Number(m[4]))
    }
    const d = iv.match(/(\d+)\s+day/)
    if (d) return Number(d[1]) * 86400
  }
  return null
}

export const duration = (iv: unknown) => {
  const s = intervalToSeconds(iv)
  if (s == null) return '—'
  if (s < 60) return `${Math.round(s)} sec`
  if (s < 3600) return `${Math.round(s / 60)} min`
  const u = Math.floor(s / 3600)
  const m = Math.round((s % 3600) / 60)
  return m ? `${u} u ${m} min` : `${u} uur`
}

// -- geluid -------------------------------------------------------------

/** −∞ is in de app 0 op de fader; in dB-kolommen komt het als heel laag terug. */
export const formatDb = (v?: number | string | null) => {
  if (v == null || v === '') return '—'
  const n = typeof v === 'string' ? Number(v) : v
  if (!isFinite(n) || n <= -90) return 'helemaal dicht'
  return `${n > 0 ? '+' : ''}${Math.round(n * 10) / 10} dB`
}

export const louder = (delta?: number | null) =>
  delta == null ? 'veranderde' : delta > 0 ? 'ging omhoog' : 'ging omlaag'

/** Een bus die nog zijn fabrieksnaam draagt ("BUS03") heeft niemand geclaimd. */
export const isVrijeBus = (naam?: string | null) =>
  !naam || /^bus\s*0*\d+$/i.test(naam.trim())
