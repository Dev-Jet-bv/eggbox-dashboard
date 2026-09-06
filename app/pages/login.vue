<script setup lang="ts">
definePageMeta({ layout: 'default' })

const client = useSupabaseClient()
const user = useSupabaseUser()

const email = ref('')
const wachtwoord = ref('')
const bezig = ref(false)
const bezigGoogle = ref(false)
const fout = ref<string | null>(null)
const gestuurd = ref(false)
const methode = ref<'wachtwoord' | 'link'>('wachtwoord')

watchEffect(() => {
  if (user.value) navigateTo('/')
})

// Een mislukte OAuth-poging komt terug op deze pagina met de reden in de URL.
onMounted(() => {
  const q = useRoute().query
  if (typeof q.error_description === 'string') fout.value = q.error_description
})

async function metGoogle() {
  bezigGoogle.value = true
  fout.value = null
  const { error } = await client.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: window.location.origin + '/confirm' },
  })
  // Lukt het, dan verlaat de browser deze pagina en komt hij niet meer hier.
  if (error) {
    fout.value = error.message
    bezigGoogle.value = false
  }
}

async function aanmelden() {
  bezig.value = true
  fout.value = null
  try {
    if (methode.value === 'wachtwoord') {
      const { error } = await client.auth.signInWithPassword({
        email: email.value.trim(),
        password: wachtwoord.value,
      })
      if (error) throw error
      await navigateTo('/')
    } else {
      const { error } = await client.auth.signInWithOtp({
        email: email.value.trim(),
        options: { emailRedirectTo: window.location.origin + '/confirm' },
      })
      if (error) throw error
      gestuurd.value = true
    }
  } catch (e: any) {
    fout.value = e?.message === 'Invalid login credentials'
      ? 'Dat e-mailadres en wachtwoord horen niet bij elkaar.'
      : e?.message || 'Aanmelden lukte niet.'
  } finally {
    bezig.value = false
  }
}
</script>

<template>
  <div class="max-w-sm mx-auto pt-10">
    <h1 class="text-2xl font-semibold tracking-tight">Repetitiebord</h1>
    <p class="mt-1 text-sm text-muted">Meld je aan om verder te gaan.</p>

    <div v-if="gestuurd" class="mt-6 rounded-2xl border border-line bg-surface p-4">
      <p class="font-medium">Kijk in je mail.</p>
      <p class="mt-1 text-sm text-muted">
        We stuurden een link naar {{ email }}. Die opent het bord meteen.
      </p>
    </div>

    <template v-else>
      <p v-if="fout" class="mt-6 -mb-2 text-sm text-bad">{{ fout }}</p>

      <button
        type="button" :disabled="bezigGoogle"
        class="mt-6 w-full flex items-center justify-center gap-3 rounded-xl bg-white text-ink font-medium py-3 disabled:opacity-50"
        @click="metGoogle"
      >
        <svg viewBox="0 0 48 48" class="w-5 h-5" aria-hidden="true">
          <path fill="#4285F4" d="M45.1 24.5c0-1.6-.1-3.2-.4-4.7H24v8.9h11.8c-.5 2.7-2 5-4.4 6.6v5.5h7.1c4.2-3.8 6.6-9.5 6.6-16.3z" />
          <path fill="#34A853" d="M24 46c6 0 11-2 14.5-5.2l-7.1-5.5c-2 1.3-4.5 2.1-7.4 2.1-5.7 0-10.6-3.9-12.3-9.1H4.3v5.7C7.8 41 15.3 46 24 46z" />
          <path fill="#FBBC05" d="M11.7 28.3c-.4-1.3-.7-2.7-.7-4.3s.3-3 .7-4.3v-5.7H4.3A22 22 0 0 0 2 24c0 3.6.9 6.9 2.3 9.9l7.4-5.6z" />
          <path fill="#EA4335" d="M24 10.7c3.2 0 6.1 1.1 8.4 3.3l6.3-6.3C34.9 4.1 30 2 24 2 15.3 2 7.8 7 4.3 14.3l7.4 5.7c1.7-5.2 6.6-9.3 12.3-9.3z" />
        </svg>
        {{ bezigGoogle ? 'Bezig…' : 'Doorgaan met Google' }}
      </button>

      <div class="my-5 flex items-center gap-3 text-xs text-muted">
        <span class="h-px flex-1 bg-line" />of met e-mail<span class="h-px flex-1 bg-line" />
      </div>

      <form class="space-y-3" @submit.prevent="aanmelden">
      <label class="block">
        <span class="text-sm text-muted">E-mailadres</span>
        <input
          v-model="email" type="email" required autocomplete="email" inputmode="email"
          class="mt-1 w-full rounded-xl bg-surface border border-line px-3 py-3 text-base outline-none focus:border-primary"
        >
      </label>

      <label v-if="methode === 'wachtwoord'" class="block">
        <span class="text-sm text-muted">Wachtwoord</span>
        <input
          v-model="wachtwoord" type="password" required autocomplete="current-password"
          class="mt-1 w-full rounded-xl bg-surface border border-line px-3 py-3 text-base outline-none focus:border-primary"
        >
      </label>

      <button
        type="submit" :disabled="bezig"
        class="w-full rounded-xl bg-primary text-white font-medium py-3 disabled:opacity-50"
      >
        {{ bezig ? 'Bezig…' : methode === 'wachtwoord' ? 'Aanmelden' : 'Stuur me een link' }}
      </button>

      <button
        type="button"
        class="w-full text-sm text-muted py-2"
        @click="methode = methode === 'wachtwoord' ? 'link' : 'wachtwoord'"
      >
        {{ methode === 'wachtwoord' ? 'Ik weet mijn wachtwoord niet' : 'Toch met een wachtwoord' }}
        </button>
      </form>
    </template>
  </div>
</template>
