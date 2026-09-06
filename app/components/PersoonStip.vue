<script setup lang="ts">
// Kleur, bus en bandlid zijn hetzelfde ding: de zes kleuren spiegelen het
// bedrukte front van de mixer. Zo praat de band over zichzelf.
//
// Is de kleur niet bekend, dan tonen we een leeg rondje in plaats van een
// grijze stip — grijs leest als "deze persoon heeft grijs".
const props = defineProps<{ kleur: number | null }>()
const bekend = computed(() => !!props.kleur && !!MIX_COLORS[props.kleur])
</script>

<template>
  <span
    v-if="bekend"
    class="inline-block w-3 h-3 rounded-full shrink-0 border"
    :style="{ backgroundColor: colorHex(kleur), borderColor: kleur === 6 ? 'rgba(0,0,0,.35)' : 'transparent' }"
    :title="colorName(kleur)"
  />
  <span
    v-else
    class="inline-block w-3 h-3 rounded-full shrink-0 border border-dashed border-line"
    title="kleur nog niet bekend"
  />
</template>
