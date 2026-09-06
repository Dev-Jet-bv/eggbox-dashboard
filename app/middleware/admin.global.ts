// Wie geen admin is, ziet in de database nul rijen — het bord zou dan gewoon
// leeg zijn. Dat is verwarrend, dus zeggen we het met zoveel woorden.
// De echte bewaking gebeurt niet hier maar in Postgres.

export default defineNuxtRouteMiddleware(async (to) => {
  const open = ['/login', '/confirm', '/geen-toegang']
  if (open.includes(to.path)) return

  const user = useSupabaseUser()
  if (!user.value) return // @nuxtjs/supabase stuurt zelf door naar /login

  const isAdmin = useState<boolean | null>('is-admin', () => null)
  if (isAdmin.value === null) {
    const { data, error } = await (useSupabaseClient() as any).rpc('is_admin')
    isAdmin.value = error ? false : data === true
  }
  if (!isAdmin.value) return navigateTo('/geen-toegang')
})
