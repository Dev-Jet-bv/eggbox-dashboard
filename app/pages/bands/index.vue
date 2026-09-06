<script setup lang="ts">
// C. De bandenlijst.
const sb = useAdminDb()

const rijen = ref<any[]>([])
const bezig = ref(true)
const fout = ref<string | null>(null)
const zoek = ref('')

onMounted(async () => {
  const { data, error } = await sb.from('band_overview_v').select('*')
  if (error) fout.value = error.message
  rijen.value = data || []
  bezig.value = false
})

const gefilterd = computed(() => {
  const q = zoek.value.trim().toLowerCase()
  const r = q ? rijen.value.filter(b => (b.band_name || '').toLowerCase().includes(q)) : rijen.value
  return [...r].sort((a, z) => (z.last_event_at || '').localeCompare(a.last_event_at || ''))
})
</script>

<template>
  <div class="space-y-4">
    <h1 class="text-2xl font-semibold tracking-tight">Bands</h1>

    <input
      v-model="zoek" type="search" placeholder="Zoek een band"
      class="w-full rounded-xl bg-surface border border-line px-3 py-3 text-base outline-none focus:border-primary"
    >

    <p v-if="fout" class="rounded-2xl border border-bad/40 bg-bad/10 p-4 text-sm">{{ fout }}</p>
    <div v-else-if="bezig" class="text-muted">Even kijken…</div>

    <ul v-else class="space-y-2">
      <li v-for="b in gefilterd" :key="b.band_id">
        <NuxtLink
          :to="'/bands/' + b.band_id"
          class="flex items-center gap-3 rounded-2xl border border-line bg-surface px-4 py-3.5"
        >
          <div class="min-w-0 flex-1">
            <div class="flex items-center gap-2">
              <h2 class="font-semibold truncate">{{ b.band_name }}</h2>
              <span
                v-if="Number(b.pending_join_requests) > 0"
                class="text-xs px-2 py-0.5 rounded-full bg-accent/20 text-accent shrink-0"
              >{{ b.pending_join_requests }} wacht op antwoord</span>
            </div>
            <p class="text-sm text-muted truncate">
              {{ b.members }} leden<template v-if="Number(b.members) > Number(b.members_onboarded)">,
                {{ Number(b.members) - Number(b.members_onboarded) }} nog niet ingesteld</template>
              <template v-if="b.last_event_at"> · laatst actief {{ ago(b.last_event_at) }}</template>
            </p>
          </div>
          <span v-if="Number(b.active_sessions) > 0" class="shrink-0"><StatusStip status="groen" /></span>
          <span class="text-muted shrink-0" aria-hidden="true">→</span>
        </NuxtLink>
      </li>
    </ul>
  </div>
</template>
