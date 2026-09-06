// Gebeurtenissen omzetten naar één leesbare zin.
//
// Regel: er staat geen vrije gebruikerstekst in de events, en dat houden we zo.
// Kanaalnamen kunnen persoonsnamen zijn, dus uit `props` lezen we uitsluitend
// de expliciet genoemde numerieke en enum-velden. Nooit een prop tonen op basis
// van wat er toevallig in staat.

type Props = Record<string, unknown> | null | undefined

const num = (p: Props, k: string): number | null => {
  const v = p?.[k]
  if (typeof v === 'number') return v
  if (typeof v === 'string' && v !== '' && isFinite(Number(v))) return Number(v)
  return null
}

const bool = (p: Props, k: string) => p?.[k] === true

/** Alleen enum-achtige waarden: korte, vaste codes uit de app zelf. */
const enumStr = (p: Props, k: string, allowed: string[]): string | null => {
  const v = p?.[k]
  return typeof v === 'string' && allowed.includes(v) ? v : null
}

const FASES: Record<string, string> = {
  Idle: 'nog niet verbonden',
  Scanning: 'aan het zoeken naar de mixer',
  Connecting: 'aan het verbinden',
  ConnectedInitializing: 'aan het opstarten',
  Ready: 'klaar',
  Reconnecting: 'opnieuw aan het verbinden',
  Disconnected: 'de verbinding kwijt',
}

export const faseText = (phase?: string | null) => (phase && FASES[phase]) || 'onbekend'

/** Eén regel van de tijdlijn, in gewone taal. */
export function describeEvent(name: string, props: Props, who?: string | null): string {
  const wie = who || 'iemand'
  const i = num(props, 'index')

  switch (name) {
    // -- wat er met het geluid gebeurde --------------------------------
    case 'mixer.gain_changed': {
      const to = num(props, 'to_db')
      const d = num(props, 'delta_db')
      const richting = d != null && d < 0 ? 'stiller' : 'luider'
      return wie + ' zette ' + channelLabel(i) + ' ' + richting + (to != null ? ' (nu ' + formatDb(to) + ')' : '')
    }
    case 'mixer.fader_changed': {
      const target = enumStr(props, 'target', ['main', 'bus', 'channel'])
      const to = num(props, 'to_db')
      const wat = target === 'main'
        ? 'het hoofdvolume'
        : target === 'bus'
          ? busLabel(num(props, 'output') ?? i)
          : channelLabel(i) + ' in de mix'
      return wie + ' verschoof ' + wat + (to != null ? ' naar ' + formatDb(to) : '')
    }
    case 'mixer.mute_toggled':
      return wie + ' zette ' + channelLabel(i) + (bool(props, 'muted') ? ' op stil' : ' weer aan')
    case 'mixer.value_changed_remotely':
      return 'er veranderde iets op de mixer zonder dat deze telefoon dat deed'
    case 'mixer.settings_applied': {
      const n = num(props, 'channels')
      return 'de opgeslagen instellingen werden naar de mixer gestuurd' + (n != null ? ' (' + n + ' kanalen)' : '')
    }
    case 'mixer.channels_swapped':
      return wie + ' wisselde twee kanalen van plaats'
    case 'mixer.reset_to_default':
      return wie + ' zette de mixer terug op de standaardinstellingen'
    case 'mixer.output_selected':
      return wie + ' keek naar ' + busLabel(num(props, 'output') ?? i)
    case 'mixer.channel_renamed':
      return wie + ' gaf ' + channelLabel(i) + ' een andere naam'
    case 'mixer.channel_color_set':
      return wie + ' gaf ' + channelLabel(i) + ' de kleur ' + colorName(num(props, 'color'))
    case 'mixer.channel_icon_set':
      return wie + ' koos een ander icoontje voor ' + channelLabel(i)
    case 'mixer.lowcut_toggled':
      return wie + ' zette de lage-tonenfilter op ' + channelLabel(i) + (bool(props, 'on') ? ' aan' : ' uit')
    case 'mixer.link_toggled':
      return wie + ' koppelde ' + channelLabel(i) + ' aan het buurkanaal'

    // -- verbinding ----------------------------------------------------
    case 'connection.phase_changed': {
      const to = typeof props?.to === 'string' ? (props.to as string) : null
      return 'de telefoon van ' + wie + ' is ' + faseText(to)
    }
    case 'connection.mixer_unreachable': {
      const s = num(props, 'last_rx_age_s')
      return 'de telefoon van ' + wie + ' kreeg geen antwoord meer van de mixer' + (s != null ? ' (' + s + ' sec stil)' : '')
    }
    case 'connection.mixer_recovered': {
      const s = num(props, 'down_for_s')
      return 'de mixer antwoordde weer' + (s != null ? ', na ' + Math.max(1, Math.round(s / 60)) + ' min' : '')
    }
    case 'connection.init_timeout':
      return 'het opstarten van de verbinding liep vast'
    case 'connection.init_completed':
      return 'de verbinding met de mixer staat'
    case 'connection.scan_no_mixers':
      return wie + ' vond geen enkele mixer op het netwerk'
    case 'connection.scan_started':
      return wie + ' zoekt naar de mixer'
    case 'connection.scan_completed':
      return 'het zoeken naar mixers is klaar'
    case 'connection.connect_started':
      return wie + ' maakt verbinding met de mixer'
    case 'connection.reconnect_started':
      return 'de telefoon probeert opnieuw te verbinden'
    case 'connection.reconnect_failed':
      return 'opnieuw verbinden lukte niet'

    // -- sessie en app -------------------------------------------------
    case 'session.started': return wie + ' begon een repetitie'
    case 'session.ended': return 'de repetitie werd afgesloten'
    case 'session.blocked_by_active': return wie + ' kon er niet in: iemand anders was al bezig'
    case 'session.takeover_requested': return wie + ' vroeg om over te nemen'
    case 'session.takeover_forced': return wie + ' nam de mixer over'
    case 'session.takeover_cancelled': return 'de overname werd afgeblazen'
    case 'session.heartbeat':
      return bool(props, 'mixer_reachable') ? 'alles loopt' : 'de mixer is even niet bereikbaar'
    case 'app.launched': return wie + ' opende de app'
    case 'app.foregrounded': return wie + ' kwam terug in de app'
    case 'app.backgrounded': return wie + ' legde de telefoon weg'
    case 'app.spool_loaded': return 'de app stuurde bewaarde gegevens alsnog door'
    case 'app.telemetry_dropped': return 'er gingen gegevens verloren'

    // -- band en instellingen ------------------------------------------
    case 'band.settings_saved': return wie + ' sloeg de instellingen op'
    case 'band.settings_restored': return wie + ' zette oude instellingen terug'
    case 'band.created': return wie + ' maakte een nieuwe band aan'
    case 'band.renamed': return wie + ' hernoemde de band'
    case 'band.deleted': return wie + ' verwijderde een band'
    case 'band.selected': return wie + ' koos deze band'
    case 'band.join_requested': return wie + ' vroeg om bij de band te mogen'
    case 'band.join_request_approved': return wie + ' liet iemand toe tot de band'
    case 'band.join_request_denied': return wie + ' weigerde een aanvraag'

    // -- instellen ------------------------------------------------------
    case 'onboarding.started': return wie + ' begon met instellen'
    case 'onboarding.color_claimed': return wie + ' koos de kleur ' + colorName(num(props, 'color'))
    case 'onboarding.channel_assigned': return wie + ' zette zichzelf op ' + channelLabel(i)
    case 'onboarding.preset_chosen': return wie + ' koos een startopstelling'
    case 'onboarding.socket_cleared': return wie + ' maakte een plek weer vrij'
    case 'onboarding.back_navigated': return wie + ' ging een stap terug tijdens het instellen'
    case 'onboarding.completed': return wie + ' was klaar met instellen'
    case 'onboarding.skipped': return wie + ' sloeg het instellen over'

    // -- opnemen --------------------------------------------------------
    case 'record.started': return wie + ' startte een opname'
    case 'record.stopped': return wie + ' stopte de opname'
    case 'record.usb_missing': return 'er zat geen usb-stick in de mixer'
    case 'record.playback_started': return wie + ' speelde een opname af'
    case 'record.renamed': return wie + ' hernoemde een opname'
    case 'record.deleted': return wie + ' verwijderde een opname'
    case 'record.refresh_result': return 'de lijst met opnames werd opgehaald'

    // -- fouten en de rest ----------------------------------------------
    case 'error.repository_failed': return 'de app kon de server even niet bereiken'
    case 'error.osc_send_dropped': return 'een opdracht bereikte de mixer niet'
    case 'error.unhandled': return 'er ging iets onverwachts mis in de app'
    case 'error.shown_to_user': return wie + ' kreeg een foutmelding te zien'
    case 'auth.signed_out': return wie + ' logde uit'
    case 'auth.sign_in_succeeded': return wie + ' logde in'
    case 'auth.sign_in_failed': return 'inloggen mislukte'
    case 'auth.session_restored': return 'de app herkende ' + wie + ' meteen'
    case 'nav.page_viewed': return wie + ' bekeek een ander scherm'
    case 'settings.sync_conflict_shown': return wie + ' kreeg de vraag welke instellingen moesten winnen'
    case 'settings.sync_resolved': return 'het instellingenconflict is opgelost'
    case 'settings.theme_changed': return wie + ' wisselde tussen licht en donker'
    default:
      return 'er gebeurde iets'
  }
}

/** Regels die een niet-technische lezer niets zeggen. Standaard verborgen. */
export const isNoise = (name: string) =>
  name === 'session.heartbeat' ||
  name === 'nav.page_viewed' ||
  name === 'app.foregrounded' ||
  name === 'app.backgrounded' ||
  name === 'record.refresh_result'

/**
 * Dezelfde gebeurtenis die zich blijft herhalen is één mededeling, geen
 * honderden regels. Een telefoon die de server niet bereikt probeert het
 * onvermoeibaar opnieuw; ongegroepeerd verdwijnt de rest van de avond daarin.
 */
export function groepeerHerhalingen<T extends { name: string; at: string; who?: string | null }>(
  rijen: T[],
): (T & { aantal: number; tot: string })[] {
  const uit: (T & { aantal: number; tot: string })[] = []
  for (const r of rijen) {
    const vorige = uit[uit.length - 1]
    if (vorige && vorige.name === r.name && (vorige.who ?? null) === (r.who ?? null)) {
      vorige.aantal++
      vorige.tot = r.at
      continue
    }
    uit.push({ ...r, aantal: 1, tot: r.at })
  }
  return uit
}

export interface FlagRow {
  flag: string
  occurred_at: string
  band_name: string | null
  user_label: string | null
  param: string | null
  idx: number | null
  from_db: number | null
  to_db: number | null
  ms_since_phase_change: number | null
  settings_apply_source: string | null
  app_session_id: string
}

const isMainFader = (param?: string | null) =>
  param === 'main' || param === 'main_fader' || param === 'main_level'

/** De melding: één zin met tijdstip, band en kanaal. Geen event-namen. */
export function describeFlag(f: FlagRow): string {
  const band = f.band_name ? 'Bij ' + f.band_name : 'Bij een band'
  const wanneer = dayLabel(f.occurred_at) + ' om ' + clock(f.occurred_at)

  if (f.flag === 'fader_dropped') {
    const wat = isMainFader(f.param) ? 'het hoofdvolume' : busLabel(f.idx)
    return band + ' viel ' + wat + ' ' + wanneer + ' vanzelf helemaal weg. Niemand raakte het aan.'
  }

  if (f.flag === 'gain_jumped') {
    const richting = f.from_db != null && f.to_db != null && f.to_db < f.from_db ? 'omlaag' : 'omhoog'
    const waarden = f.from_db != null && f.to_db != null
      ? ' van ' + formatDb(f.from_db) + ' naar ' + formatDb(f.to_db)
      : ''
    return band + ' sprong het volume van ' + channelLabel(f.idx) + ' ' + wanneer +
      ' vanzelf ' + richting + waarden + '. Niemand raakte het aan.'
  }

  return band + ' gebeurde ' + wanneer + ' iets onverwachts met het geluid.'
}

/** Korte variant, voor op de bandkaart zelf. */
export const flagShort = (f: FlagRow) =>
  f.flag === 'fader_dropped'
    ? (isMainFader(f.param) ? 'Hoofdvolume' : 'Monitormix') + ' viel weg om ' + clock(f.occurred_at)
    : 'Volume van ' + channelLabel(f.idx) + ' sprong om ' + clock(f.occurred_at)
