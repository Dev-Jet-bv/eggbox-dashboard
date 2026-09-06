<script setup lang="ts">
// Eén stuk dat stukloopt mag de rest van de pagina niet meenemen. De lezer
// staat hiermee in een repetitieruimte en heeft niets aan een technische
// melding over het hele scherm, wel aan de blokken die het nog wél doen.
//
// Werkt alleen voor echte componenten in de slot: hun ouder in de boom is dit
// blok, dus onErrorCaptured hieronder vangt hun renderfouten af.
const props = defineProps<{ wat: string }>()

const stuk = ref(false)
const detail = ref('')

onErrorCaptured((e) => {
  stuk.value = true
  detail.value = (e as Error)?.message || String(e)
  console.error('[' + props.wat + ']', e)
  return false
})
</script>

<template>
  <div v-if="stuk" class="rounded-2xl border border-line bg-surface p-4">
    <p class="font-medium">Dit deel van de pagina kon niet worden getoond.</p>
    <p class="mt-1 text-sm text-muted">{{ wat }} — de rest werkt gewoon.</p>
    <details class="mt-2">
      <summary class="text-xs text-muted cursor-pointer">Technische reden</summary>
      <p class="mt-1 text-xs text-muted break-words">{{ detail }}</p>
    </details>
  </div>
  <slot v-else />
</template>
