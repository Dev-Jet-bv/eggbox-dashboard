<script setup lang="ts">
// Wat er tussen twee opslagmomenten veranderde, compact. Per regel het kanaal
// zoals het op dát moment heette en gekleurd was — niet zoals het nu heet.
const props = defineProps<{ wijzigingen: any[]; kanaalStanden: any[] }>()

const standen = computed(() => {
  const m = new Map<string, any>()
  for (const s of props.kanaalStanden) m.set(s.saved_at + '|' + s.channel, s)
  return m
})

const standVoor = (r: any) =>
  r.scope === 'channel' ? standen.value.get(r.saved_at + '|' + r.idx) ?? null : null

const versies = computed(() => {
  const per = new Map<string, { saved_at: string; door: string | null; regels: any[] }>()
  for (const w of props.wijzigingen) {
    let v = per.get(w.saved_at)
    if (!v) per.set(w.saved_at, v = { saved_at: w.saved_at, door: w.saved_by_label ?? null, regels: [] })
    v.regels.push(w)
  }
  return [...per.values()]
})

const gainSprongen = computed(() =>
  props.wijzigingen.filter(w => w.field === 'GainDb' && w.delta != null && Math.abs(Number(w.delta)) > 3))
</script>

<template>
  <div class="space-y-3">
    <section v-if="gainSprongen.length" class="rounded-2xl border border-warn/40 bg-warn/10">
      <h2 class="px-3 pt-2.5 pb-1 text-sm font-medium">Gain sprong meer dan 3 dB</h2>
      <ul class="divide-y divide-warn/20">
        <WijzigingRegel
          v-for="(g, i) in gainSprongen.slice(0, 8)" :key="i"
          :regel="g" :stand="standVoor(g)"
        />
      </ul>
    </section>

    <div v-if="!versies.length" class="rounded-2xl border border-line bg-surface p-6 text-muted">
      Er is nog niets veranderd sinds de eerste opslag.
    </div>

    <section v-for="v in versies" :key="v.saved_at" class="rounded-2xl border border-line bg-surface">
      <h2 class="px-3 pt-2.5 pb-1 text-xs text-muted">
        {{ dayAndClock(v.saved_at) }}<template v-if="v.door"> · <span class="text-text">{{ v.door }}</span></template>
      </h2>
      <ul class="divide-y divide-line/60">
        <WijzigingRegel v-for="(r, i) in v.regels" :key="i" :regel="r" :stand="standVoor(r)" />
      </ul>
    </section>
  </div>
</template>
