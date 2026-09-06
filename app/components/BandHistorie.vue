<script setup lang="ts">
// Wat er tussen twee opslagmomenten veranderde, één regel per gewijzigd veld.
const props = defineProps<{ wijzigingen: any[] }>()

const versies = computed(() => {
  const per = new Map<string, any>()
  for (const w of props.wijzigingen) {
    let v = per.get(w.saved_at)
    if (!v) {
      v = { saved_at: w.saved_at, door: w.saved_by_label, bron: w.source, regels: [] as any[] }
      per.set(w.saved_at, v)
    }
    v.regels.push(w)
  }
  return [...per.values()]
})

const gainSprongen = computed(() =>
  props.wijzigingen.filter(w => w.field === 'GainDb' && w.delta != null && Math.abs(Number(w.delta)) > 3))
</script>

<template>
  <div class="space-y-4">
    <p class="text-sm text-muted">
      Wat er tussen twee opslagmomenten veranderde. Alles van de laatste 48 uur,
      daarvóór de laatste versie van elke dag.
    </p>

    <section v-if="gainSprongen.length" class="rounded-2xl border border-warn/40 bg-warn/10 p-4">
      <h2 class="font-medium">Ingangsvolume sprong meer dan 3 dB</h2>
      <ul class="mt-2 space-y-1 text-sm">
        <li v-for="(g, i) in gainSprongen.slice(0, 8)" :key="i">
          Kanaal {{ g.idx }}: {{ waardeLabel('GainDb', g.was) }} → {{ waardeLabel('GainDb', g.becomes) }}
          ({{ Number(g.delta) > 0 ? '+' : '' }}{{ g.delta }} dB), {{ dayAndClock(g.saved_at) }}
        </li>
      </ul>
    </section>

    <div v-if="!versies.length" class="rounded-2xl border border-line bg-surface p-6 text-muted">
      Er is nog niets veranderd sinds de eerste opslag.
    </div>

    <section v-for="v in versies" :key="v.saved_at" class="rounded-2xl border border-line bg-surface">
      <header class="px-4 pt-3 pb-2">
        <p class="font-medium">{{ dayAndClock(v.saved_at) }}</p>
        <p class="text-sm text-muted">opgeslagen door {{ v.door }} · {{ bronLabel(v.bron) }}</p>
      </header>
      <ul class="border-t border-line divide-y divide-line/60">
        <li v-for="(r, i) in v.regels" :key="i" class="px-4 py-2.5 text-sm">
          <span class="text-muted">{{ scopeLabel(r.scope, r.idx) }}</span>
          <span class="mx-1">·</span>
          <span>{{ veldLabel(r.scope, r.field, r.idx) }}</span>
          <span class="block sm:inline sm:ml-2">
            {{ waardeLabel(r.field, r.was) }} → {{ waardeLabel(r.field, r.becomes) }}
            <span v-if="r.delta != null" class="text-muted">
              ({{ Number(r.delta) > 0 ? '+' : '' }}{{ r.delta }})
            </span>
          </span>
        </li>
      </ul>
    </section>
  </div>
</template>
