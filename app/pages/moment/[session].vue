<script setup lang="ts">
// B, vervolg: wat er direct omheen gebeurde. De tijdlijn van één telefoon,
// gecentreerd op het moment van de melding.
const route = useRoute()
const sb = useAdminDb()

const sessie = route.params.session as string
const om = typeof route.query.om === 'string' ? route.query.om : null

const rijen = ref<any[]>([])
const bezig = ref(true)
const fout = ref<string | null>(null)
const alles = ref(false)
const venster = ref(10) // minuten voor en na

async function laden() {
  bezig.value = true
  try {
    const { data, error } = await sb.rpc('timeline', { p_app_session_id: sessie })
    if (error) throw error
    rijen.value = data || []
  } catch (e: any) {
    fout.value = e?.message || 'Kon de tijdlijn niet ophalen'
  } finally {
    bezig.value = false
  }
}
onMounted(laden)

const zichtbaar = computed(() => {
  let r = rijen.value
  if (om) {
    // Volgorde binnen een sessie loopt op seq, niet op tijd: telefoonklokken
    // springen. Voor het venster is de tijd wel het enige dat we hebben.
    const t = new Date(om).getTime()
    const marge = venster.value * 60000
    r = r.filter(x => Math.abs(new Date(x.at).getTime() - t) <= marge)
  }
  if (!alles.value) r = r.filter(x => !isNoise(x.name))
  return groepeerHerhalingen(r)
})

const isMoment = (r: any) => om != null && Math.abs(new Date(r.at).getTime() - new Date(om).getTime()) < 1500

const band = computed(() => rijen.value.find(r => r.band)?.band || null)
</script>

<template>
  <div class="space-y-4">
    <NuxtLink to="/" class="text-sm text-muted">← Terug naar het bord</NuxtLink>

    <div>
      <h1 class="text-2xl font-semibold tracking-tight">Wat er toen gebeurde</h1>
      <p class="text-sm text-muted">
        <template v-if="band">{{ band }} · </template>
        <template v-if="om">rond {{ dayAndClock(om) }}</template>
        <template v-else>de hele sessie</template>
      </p>
    </div>

    <p v-if="fout" class="rounded-2xl border border-bad/40 bg-bad/10 p-4 text-sm">{{ fout }}</p>
    <div v-else-if="bezig" class="text-muted">Even kijken…</div>

    <template v-else>
      <div class="flex flex-wrap items-center gap-2 text-sm">
        <button
          v-for="m in [2, 10, 60]" :key="m"
          class="px-3 py-1.5 rounded-full border"
          :class="venster === m ? 'border-primary text-text' : 'border-line text-muted'"
          @click="venster = m"
        >± {{ m }} min</button>
        <label class="ml-auto flex items-center gap-2 text-muted">
          <input v-model="alles" type="checkbox" class="accent-primary w-4 h-4"> alles tonen
        </label>
      </div>

      <ol v-if="zichtbaar.length" class="rounded-2xl border border-line bg-surface divide-y divide-line/60">
        <li
          v-for="(r, i) in zichtbaar" :key="i"
          class="flex gap-3 px-4 py-3"
          :class="isMoment(r) ? 'bg-bad/10' : ''"
        >
          <span class="tabular-nums text-sm text-muted w-14 shrink-0">{{ clockSec(r.at) }}</span>
          <span class="min-w-0 flex-1">
            <span class="text-[15px] leading-snug">{{ describeEvent(r.name, r.detail, r.who) }}</span>
            <span v-if="r.aantal > 1" class="ml-2 text-sm text-muted">
              {{ r.aantal }}× tot {{ clockSec(r.tot) }}
            </span>
            <span v-if="r.online === false" class="ml-2 text-xs text-warn">geen internet</span>
          </span>
        </li>
      </ol>

      <p v-else class="rounded-2xl border border-line bg-surface p-6 text-muted">
        In dit tijdvak staat niets. Probeer een ruimer venster.
      </p>
    </template>
  </div>
</template>
