<script setup lang="ts">
import type { FlagRow } from '~/composables/useSentences'

// De melding. Eén zin in gewone taal. Aantikken opent wat er direct omheen
// gebeurde.
const props = defineProps<{ melding: FlagRow }>()

const link = computed(() =>
  '/moment/' + props.melding.app_session_id + '?om=' + encodeURIComponent(props.melding.occurred_at))
</script>

<template>
  <NuxtLink
    :to="link"
    class="block rounded-2xl p-4 border border-bad/40 bg-bad/10 active:bg-bad/20 transition-colors"
  >
    <p class="text-[15px] leading-snug text-text">{{ describeFlag(melding) }}</p>
    <p class="mt-2 text-sm text-muted flex items-center gap-1">
      Bekijk wat er toen gebeurde
      <span aria-hidden="true">→</span>
    </p>
  </NuxtLink>
</template>
