<script setup lang="ts">
import type { BandStatus } from '~/composables/useBoard'

const props = defineProps<{ band: BandStatus }>()

const toelichting = computed(() => {
  const b = props.band
  if (b.status === 'rood') return 'Er ging zonet iets mis'
  if (b.status === 'groen') return b.mixer ? 'Aan het spelen op ' + b.mixer : 'Aan het spelen'
  if (b.status === 'geel') return 'Al even stil'
  return b.laatstGezien ? 'Was bezig tot ' + clock(b.laatstGezien) : 'Vandaag bezig geweest'
})

function persoonUitleg(p: BandStatus['mensen'][number]) {
  if (!p.live) return 'gestopt · ' + ago(p.laatstGezien)
  if (!p.online) return 'geen contact met de mixer'
  if ((p.stilSeconden ?? 0) > 300) return 'al ' + duration(p.stilSeconden) + ' stil'
  return faseText(p.fase)
}
</script>

<template>
  <section class="rounded-2xl border border-line bg-surface overflow-hidden">
    <component
      :is="band.band_id ? 'NuxtLink' : 'div'"
      :to="band.band_id ? '/bands/' + band.band_id : undefined"
      class="flex items-center gap-3 px-4 py-3.5"
    >
      <StatusStip :status="band.status" groot />
      <div class="min-w-0 flex-1">
        <h2 class="font-semibold truncate">{{ band.naam }}</h2>
        <p class="text-sm text-muted truncate">{{ toelichting }}</p>
      </div>
      <span v-if="band.band_id" class="text-muted shrink-0" aria-hidden="true">→</span>
    </component>

    <ul v-if="band.mensen.length" class="border-t border-line divide-y divide-line/60">
      <li v-for="p in band.mensen" :key="p.key" class="flex items-center gap-3 px-4 py-2.5">
        <PersoonStip :kleur="p.kleur" />
        <span class="truncate" :class="p.live ? '' : 'text-muted'">{{ p.naam }}</span>
        <span class="ml-auto text-sm text-muted text-right shrink-0">{{ persoonUitleg(p) }}</span>
      </li>
    </ul>

    <div v-if="band.meldingen.length" class="border-t border-line p-3 space-y-2">
      <MeldingKaart v-for="(m, i) in band.meldingen" :key="i" :melding="m" />
    </div>
  </section>
</template>
