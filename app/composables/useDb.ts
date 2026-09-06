// Toegang tot het leesschema. Er is geen eigen backend: de database bewaakt
// zichzelf met RLS en is_admin(), dus de anon-sleutel plus een ingelogde admin
// volstaat. Alles hieronder is leesbaar; schrijven kan de client niet.

export const useAdminDb = () => (useSupabaseClient() as any).schema('admin')
export const usePublicDb = () => useSupabaseClient() as any

/** Begin van de huidige dag, lokaal. */
export const startOfToday = () => {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d
}

export const isoAgo = (ms: number) => new Date(Date.now() - ms).toISOString()

/**
 * Ververst elke `everyMs` zolang het tabblad zichtbaar is. Op een telefoon in
 * een repetitieruimte scheelt dat batterij, en bij terugkeren is het scherm
 * meteen weer actueel.
 */
export function usePolling(fn: () => unknown | Promise<unknown>, everyMs = 20000) {
  const timer = ref<ReturnType<typeof setInterval> | null>(null)

  const tick = () => {
    if (typeof document !== 'undefined' && document.visibilityState !== 'visible') return
    fn()
  }
  const onVisible = () => {
    if (document.visibilityState === 'visible') fn()
  }

  onMounted(() => {
    timer.value = setInterval(tick, everyMs)
    document.addEventListener('visibilitychange', onVisible)
  })
  onBeforeUnmount(() => {
    if (timer.value) clearInterval(timer.value)
    document.removeEventListener('visibilitychange', onVisible)
  })
}
