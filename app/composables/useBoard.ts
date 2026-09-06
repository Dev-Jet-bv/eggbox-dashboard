import type { FlagRow } from './useSentences'

// Het bord: één verticale lijst van bands die vandaag actief waren.
// Per band wie meedoet, in welke kleur, en of hun telefoon nog contact heeft
// met de mixer. Verder niets.

export type Status = 'rood' | 'groen' | 'geel' | 'stil'

export interface Person {
  key: string
  naam: string
  kleur: number | null
  live: boolean
  online: boolean
  fase: string | null
  laatstGezien: string | null
  stilSeconden: number | null
}

export interface Storing {
  name: string
  keer: number
  toestellen: number
  bands: number
  van: string
  tot: string
  voorbeeld: string | null
}

export interface BandStatus {
  band_id: string | null
  naam: string
  mixer: string | null
  mensen: Person[]
  meldingen: FlagRow[]
  laatstGezien: string | null
  fouten: number
  status: Status
}

const STIL_NA_SECONDEN = 5 * 60

export function useBoard() {
  const sb = useAdminDb()
  const pub = usePublicDb()

  const bands = ref<BandStatus[]>([])
  const meldingen = ref<FlagRow[]>([])
  const storingen = ref<Storing[]>([])
  const bezig = ref(true)
  const fout = ref<string | null>(null)
  const bijgewerkt = ref<Date | null>(null)
  const nieuwsteGebeurtenis = ref<string | null>(null)

  async function refresh() {
    fout.value = null
    try {
      const sinds = startOfToday().toISOString()

      const dag = isoAgo(24 * 3600 * 1000)

      const [actief, sessies, flags, bandLijst, labels, plekken, storingRijen, laatste] = await Promise.all([
        sb.from('active_now_v').select('*'),
        sb.from('app_sessions_v').select('*').gte('last_event_at', sinds).order('last_event_at', { ascending: false }).limit(200),
        sb.from('flag_unexplained').select('*').gte('occurred_at', dag).limit(50),
        pub.from('bands').select('id,name'),
        sb.from('user_labels_v').select('id,label'),
        // De kleur van een lid staat in het instellingen-blob: bus 1 t/m 6 zijn
        // de zes kleuren, en de busnaam is de naam die het lid zelf intypte.
        sb.from('band_buses_v').select('band_id,bus,bus_name'),
        sb.from('error_summary_v').select('*').gte('last_seen', dag),
        sb.from('event_log_v').select('occurred_at').order('occurred_at', { ascending: false }).limit(1),
      ])

      const eersteFout = [actief, sessies, flags, bandLijst, labels, plekken, storingRijen, laatste].find((r: any) => r?.error)
      if (eersteFout) throw (eersteFout as any).error

      const naamPerBandId = new Map<string, string>()
      const idPerBandNaam = new Map<string, string>()
      for (const b of bandLijst.data || []) {
        naamPerBandId.set(b.id, b.name)
        idPerBandNaam.set(b.name, b.id)
      }

      const labelPerUser = new Map<string, string>()
      for (const u of labels.data || []) labelPerUser.set(u.id, u.label)

      // Naam zoals ingetypt bij het instellen -> kleur. Een bus die nog zijn
      // fabrieksnaam draagt ("BUS03") heeft niemand geclaimd.
      const isVrij = (naam?: string | null) => !naam || /^bus\s*0*\d+$/i.test(naam.trim())
      const kleurPerPersoon = new Map<string, number>()
      for (const p of plekken.data || []) {
        if (!isVrij(p.bus_name)) kleurPerPersoon.set(p.band_id + '|' + p.bus_name.trim().toLowerCase(), p.bus)
      }
      /** De ingetypte naam is zelden identiek aan de accountnaam: meestal alleen
       *  een voornaam tegenover een volledige naam. Een voornaam die overeenkomt
       *  is genoeg. */
      const kleurVoor = (bandId: string | null, naam: string): number | null => {
        if (!bandId || !naam) return null
        const heel = naam.trim().toLowerCase()
        const voornaam = heel.split(/\s+/)[0]
        return kleurPerPersoon.get(bandId + '|' + heel)
          ?? kleurPerPersoon.get(bandId + '|' + voornaam)
          ?? null
      }

      meldingen.value = (flags.data || []) as FlagRow[]
      nieuwsteGebeurtenis.value = laatste.data?.[0]?.occurred_at ?? null

      // Foutenclusters: 556 keer dezelfde mislukte poging is één storing.
      const perNaam = new Map<string, Storing>()
      for (const e of storingRijen.data || []) {
        const s = perNaam.get(e.name)
        const keer = Number(e.occurrences || 0)
        if (!s) {
          perNaam.set(e.name, {
            name: e.name, keer, toestellen: Number(e.devices || 0), bands: Number(e.bands || 0),
            van: e.first_seen, tot: e.last_seen, voorbeeld: e.example_session ?? null,
          })
        } else {
          s.keer += keer
          s.toestellen = Math.max(s.toestellen, Number(e.devices || 0))
          s.bands = Math.max(s.bands, Number(e.bands || 0))
          if (e.first_seen < s.van) s.van = e.first_seen
          if (e.last_seen > s.tot) s.tot = e.last_seen
          if (!s.voorbeeld) s.voorbeeld = e.example_session ?? null
        }
      }
      storingen.value = [...perNaam.values()].sort((a, z) => z.keer - a.keer)

      const perBand = new Map<string, BandStatus>()
      const zorg = (id: string | null, naam: string): BandStatus => {
        const sleutel = id || naam
        let b = perBand.get(sleutel)
        if (!b) {
          b = {
            band_id: id, naam, mixer: null, mensen: [], meldingen: [],
            laatstGezien: null, fouten: 0, status: 'stil',
          }
          perBand.set(sleutel, b)
        }
        return b
      }

      // 1. Wie is nu bezig (kijkt 15 minuten terug)
      for (const r of actief.data || []) {
        const id = r.band_name ? idPerBandNaam.get(r.band_name) ?? null : null
        const b = zorg(id, r.band_name || 'Zonder band')
        if (r.mixer_name) b.mixer = r.mixer_name
        b.mensen.push({
          key: r.app_session_id,
          naam: r.user_label || 'iemand',
          kleur: r.color_value ?? kleurVoor(id, r.user_label),
          live: true,
          online: r.is_online === true,
          fase: r.phase ?? null,
          laatstGezien: r.last_seen ?? null,
          stilSeconden: intervalToSeconds(r.idle_for),
        })
        if (!b.laatstGezien || (r.last_seen && r.last_seen > b.laatstGezien)) b.laatstGezien = r.last_seen
      }

      // 2. Wie vandaag eerder bezig was maar nu stil is
      for (const s of sessies.data || []) {
        const naam = s.band_id ? naamPerBandId.get(s.band_id) || 'Zonder band' : 'Zonder band'
        const b = zorg(s.band_id ?? null, naam)
        b.fouten += Number(s.error_count || 0)
        if (!b.laatstGezien || (s.last_event_at && s.last_event_at > b.laatstGezien)) b.laatstGezien = s.last_event_at
        if (b.mensen.some(p => p.key === s.app_session_id)) continue

        const wie = s.user_id ? labelPerUser.get(s.user_id) || 'iemand' : 'iemand'
        // Iemand die live al in de lijst staat, niet nog eens als "stil" tonen.
        if (b.mensen.some(p => p.live && p.naam === wie)) continue

        b.mensen.push({
          key: s.app_session_id,
          naam: wie,
          kleur: kleurVoor(s.band_id ?? null, wie),
          live: false,
          online: false,
          fase: s.last_phase ?? null,
          laatstGezien: s.last_event_at ?? null,
          stilSeconden: s.last_event_at ? (Date.now() - new Date(s.last_event_at).getTime()) / 1000 : null,
        })
      }

      // 3. Meldingen bij de juiste band leggen
      for (const f of meldingen.value) {
        if (!f.band_name) continue
        const b = zorg(idPerBandNaam.get(f.band_name) ?? null, f.band_name)
        b.meldingen.push(f)
      }

      // 4. Kleur van de band bepalen
      for (const b of perBand.values()) {
        b.mensen.sort((a, z) => Number(z.live) - Number(a.live) || a.naam.localeCompare(z.naam))
        if (b.meldingen.length) b.status = 'rood'
        else if (b.mensen.some(p => p.live && p.online && (p.stilSeconden ?? 0) < STIL_NA_SECONDEN)) b.status = 'groen'
        else if (b.mensen.some(p => p.live)) b.status = 'geel'
        else b.status = 'stil'
      }

      const volgorde: Record<Status, number> = { rood: 0, groen: 1, geel: 2, stil: 3 }
      bands.value = [...perBand.values()].sort(
        (a, z) => volgorde[a.status] - volgorde[z.status] ||
          (z.laatstGezien || '').localeCompare(a.laatstGezien || ''),
      )
      bijgewerkt.value = new Date()
    } catch (e: any) {
      fout.value = e?.message || 'Onbekende fout'
    } finally {
      bezig.value = false
    }
  }

  return { bands, meldingen, storingen, bezig, fout, bijgewerkt, nieuwsteGebeurtenis, refresh }
}
