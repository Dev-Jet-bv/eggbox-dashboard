<script setup lang="ts">
// Landingspagina na een aanmeldlink of na Google. @nuxtjs/supabase wisselt de
// code hier om voor een sessie; wij wachten tot dat rond is.
const user = useSupabaseUser()
const route = useRoute()

const fout = ref<string | null>(null)

watchEffect(() => {
  if (user.value) navigateTo('/')
})

onMounted(() => {
  // Een geweigerde aanmelding komt terug met de reden in de URL — in de query
  // of, bij de impliciete flow, achter het hekje.
  const uitHash = new URLSearchParams((window.location.hash || '').replace(/^#/, ''))
  const reden = route.query.error_description || uitHash.get('error_description')
  if (typeof reden === 'string') {
    fout.value = reden
    return
  }
  // Blijft het stil, dan is er geen sessie uit de link gekomen.
  setTimeout(() => {
    if (!user.value && !fout.value) fout.value = 'Het aanmelden is niet afgerond.'
  }, 8000)
})
</script>

<template>
  <div class="pt-16 text-center">
    <template v-if="fout">
      <p class="text-sm text-bad">{{ fout }}</p>
      <NuxtLink to="/login" class="mt-4 inline-block text-sm text-accent">Opnieuw proberen</NuxtLink>
    </template>
    <p v-else class="text-muted">Even geduld…</p>
  </div>
</template>
