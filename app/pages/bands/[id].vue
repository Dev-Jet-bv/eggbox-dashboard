<script setup lang="ts">
// C. Het banddetail. Deze pagina haalt op en verdeelt; het tekenen gebeurt in
// drie losse componenten, elk in een eigen VeiligBlok. Loopt er één stuk, dan
// blijft de rest van de pagina staan.
const route = useRoute()
const router = useRouter()
const sb = useAdminDb()
const pub = usePublicDb()

const id = route.params.id as string
const TABS = ['overzicht', 'instellingen', 'historie'] as const
type Tab = typeof TABS[number]

const band = ref<any>(null)
const aanvragen = ref<any[]>([])
const opnames = ref<any[]>([])
const kanalen = ref<any[]>([])
const bussen = ref<any[]>([])
const wijzigingen = ref<any[]>([])
const bezig = ref(true)
const fout = ref<string | null>(null)

// In de URL, zodat een tabblad deelbaar is en de terugknop doet wat je verwacht.
const tab = computed<Tab>({
  get: () => TABS.includes(route.query.tab as Tab) ? route.query.tab as Tab : 'overzicht',
  set: (v) => router.replace({ query: { ...route.query, tab: v } }),
})

onMounted(async () => {
  try {
    const [o, j, r, k, b, w] = await Promise.all([
      sb.from('band_overview_v').select('*').eq('band_id', id).maybeSingle(),
      pub.from('join_requests').select('user_name,user_email,status,created_at').eq('band_id', id).eq('status', 'pending'),
      pub.from('recordings').select('display_name,filename,created_at,duration_seconds').eq('band_id', id).order('created_at', { ascending: false }).limit(25),
      sb.from('band_channels_v').select('*').eq('band_id', id).order('channel'),
      sb.from('band_buses_v').select('*').eq('band_id', id).order('bus'),
      sb.from('settings_changes_v').select('*').eq('band_id', id).order('saved_at', { ascending: false }).limit(400),
    ])

    const eersteFout = [o, j, r, k, b, w].find((x: any) => x?.error)
    if (eersteFout) throw (eersteFout as any).error

    band.value = o.data
    aanvragen.value = j.data || []
    opnames.value = r.data || []
    kanalen.value = k.data || []
    bussen.value = b.data || []
    wijzigingen.value = w.data || []
  } catch (e: any) {
    fout.value = e?.message || 'Kon de band niet ophalen'
  } finally {
    bezig.value = false
  }
})
</script>

<template>
  <div class="space-y-4">
    <NuxtLink to="/bands" class="text-sm text-muted">← Alle bands</NuxtLink>

    <p v-if="fout" class="rounded-2xl border border-bad/40 bg-bad/10 p-4 text-sm">{{ fout }}</p>
    <div v-else-if="bezig" class="text-muted">Even kijken…</div>

    <template v-else-if="band">
      <div>
        <h1 class="text-2xl font-semibold tracking-tight">{{ band.band_name }}</h1>
        <p class="text-sm text-muted">
          van {{ band.owner_name || 'onbekend' }}
          <template v-if="band.last_event_at"> · laatst actief {{ ago(band.last_event_at) }}</template>
        </p>
      </div>

      <div class="flex gap-1 text-sm">
        <button
          v-for="t in TABS" :key="t"
          class="px-3 py-2 rounded-lg capitalize"
          :class="tab === t ? 'bg-surface-2 text-text' : 'text-muted'"
          @click="tab = t"
        >{{ t }}</button>
      </div>

      <VeiligBlok v-if="tab === 'overzicht'" wat="De leden">
        <BandOverzicht
          :band="band" :bussen="bussen" :kanalen="kanalen"
          :aanvragen="aanvragen" :opnames="opnames" :band-id="id"
        />
      </VeiligBlok>

      <VeiligBlok v-else-if="tab === 'instellingen'" wat="De instellingen">
        <BandInstellingen :band="band" :bussen="bussen" :kanalen="kanalen" />
      </VeiligBlok>

      <VeiligBlok v-else wat="De historie">
        <BandHistorie :wijzigingen="wijzigingen" />
      </VeiligBlok>
    </template>

    <p v-else class="text-muted">Deze band bestaat niet meer.</p>
  </div>
</template>
