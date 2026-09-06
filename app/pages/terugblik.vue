<script setup lang="ts">
// D. De terugblik. Kies een band en een avond, krijg de tijdlijn van alle
// leden door elkaar. Dit open je als iemand belt.
const route = useRoute()
const sb = useAdminDb()
const pub = usePublicDb()

const bands = ref<any[]>([])
const bandId = ref<string>((route.query.band as string) || '')
const datum = ref(new Date().toISOString().slice(0, 10))
const rijen = ref<any[]>([])
const bezig = ref(false)
const fout = ref<string | null>(null)
const alles = ref(false)

onMounted(async () => {
  const { data } = await pub.from('bands').select('id,name').order('name')
  bands.value = data || []
  if (bandId.value) laden()
})

/** Een repetitie loopt door na middernacht: van 12:00 tot 06:00 de dag erna. */
function venster() {
  const van = new Date(datum.value + 'T12:00:00')
  const tot = new Date(van.getTime() + 18 * 3600 * 1000)
  return { van: van.toISOString(), tot: tot.toISOString() }
}

async function laden() {
  if (!bandId.value) return
  bezig.value = true
  fout.value = null
  try {
    const { van, tot } = venster()
    const { data, error } = await sb.rpc('band_timeline', {
      p_band_id: bandId.value, p_from: van, p_to: tot,
    })
    if (error) throw error
    rijen.value = data || []
  } catch (e: any) {
    fout.value = e?.message || 'Kon de avond niet ophalen'
  } finally {
    bezig.value = false
  }
}

watch([bandId, datum], laden)

const zichtbaar = computed(() =>
  groepeerHerhalingen(alles.value ? rijen.value : rijen.value.filter(r => !isNoise(r.name))))

const verschuif = (dagen: number) => {
  const d = new Date(datum.value + 'T12:00:00')
  d.setDate(d.getDate() + dagen)
  datum.value = d.toISOString().slice(0, 10)
}

const bandNaam = computed(() => bands.value.find(b => b.id === bandId.value)?.name || '')
</script>

<template>
  <div class="space-y-4">
    <h1 class="text-2xl font-semibold tracking-tight">Terugblik</h1>
    <p class="text-sm text-muted">Kies een band en een avond.</p>

    <div class="space-y-2">
      <select
        v-model="bandId"
        class="w-full rounded-xl bg-surface border border-line px-3 py-3 text-base outline-none focus:border-primary"
      >
        <option value="">Kies een band…</option>
        <option v-for="b in bands" :key="b.id" :value="b.id">{{ b.name }}</option>
      </select>

      <div class="flex items-center gap-2">
        <button class="px-3 py-3 rounded-xl border border-line text-muted" @click="verschuif(-1)">←</button>
        <input
          v-model="datum" type="date"
          class="flex-1 rounded-xl bg-surface border border-line px-3 py-3 text-base outline-none focus:border-primary"
        >
        <button class="px-3 py-3 rounded-xl border border-line text-muted" @click="verschuif(1)">→</button>
      </div>
      <p class="text-xs text-muted px-1">Van 12:00 tot 06:00 de ochtend erna.</p>
    </div>

    <p v-if="fout" class="rounded-2xl border border-bad/40 bg-bad/10 p-4 text-sm">{{ fout }}</p>
    <div v-else-if="bezig" class="text-muted">Even kijken…</div>

    <template v-else-if="bandId">
      <div class="flex items-center gap-3">
        <p class="text-sm text-muted">
          {{ zichtbaar.reduce((n, r) => n + r.aantal, 0) }} gebeurtenissen bij {{ bandNaam }}
        </p>
        <label class="ml-auto flex items-center gap-2 text-sm text-muted">
          <input v-model="alles" type="checkbox" class="accent-primary w-4 h-4"> alles tonen
        </label>
      </div>

      <ol v-if="zichtbaar.length" class="rounded-2xl border border-line bg-surface divide-y divide-line/60">
        <li v-for="(r, i) in zichtbaar" :key="i" class="flex gap-3 px-4 py-3">
          <span class="tabular-nums text-sm text-muted w-12 shrink-0">{{ clock(r.at) }}</span>
          <PersoonStip :kleur="r.color" class="mt-1.5" />
          <span class="min-w-0 flex-1 text-[15px] leading-snug">
            {{ describeEvent(r.name, r.detail, r.who) }}
            <span v-if="r.aantal > 1" class="text-sm text-muted">
              — {{ r.aantal }}× tot {{ clock(r.tot) }}
            </span>
          </span>
        </li>
      </ol>

      <p v-else class="rounded-2xl border border-line bg-surface p-6 text-muted">
        Op deze avond is er niets gebeurd bij {{ bandNaam }}.
      </p>
    </template>
  </div>
</template>
