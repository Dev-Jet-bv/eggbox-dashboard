<script setup lang="ts">
import type { Storing } from '~/composables/useBoard'

// Honderden identieke mislukte pogingen zijn één storing. Wat telt is: wat
// ging er mis, hoe lang, en hoeveel toestellen hadden er last van.
const props = defineProps<{ storing: Storing }>()

const zin = computed(() => {
  const s = describeEvent(props.storing.name, null, null)
  return s.charAt(0).toUpperCase() + s.slice(1)
})

const link = computed(() =>
  props.storing.voorbeeld
    ? '/moment/' + props.storing.voorbeeld + '?om=' + encodeURIComponent(props.storing.van)
    : null)

const wanneer = computed(() => {
  const van = clock(props.storing.van)
  const tot = clock(props.storing.tot)
  return van === tot ? 'om ' + van : 'tussen ' + van + ' en ' + tot
})
</script>

<template>
  <component
    :is="link ? 'NuxtLink' : 'div'" :to="link || undefined"
    class="block rounded-2xl p-4 border border-warn/40 bg-warn/10"
  >
    <p class="text-[15px] leading-snug">{{ zin }}</p>
    <p class="mt-1 text-sm text-muted">
      {{ storing.keer }} keer {{ wanneer }}<template v-if="storing.toestellen > 1"> · {{ storing.toestellen }} telefoons</template>
    </p>
    <p v-if="link" class="mt-2 text-sm text-muted">Bekijk wat er toen gebeurde →</p>
  </component>
</template>
