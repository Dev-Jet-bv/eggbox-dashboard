<script setup lang="ts">
import type { Status } from '~/composables/useBoard'

const props = defineProps<{ status: Status; groot?: boolean }>()

const kleur = computed(() => ({
  rood: 'var(--color-bad)',
  groen: 'var(--color-ok)',
  geel: 'var(--color-warn)',
  stil: '#6b5f5f',
}[props.status]))
</script>

<template>
  <span
    class="inline-block rounded-full shrink-0"
    :class="groot ? 'w-3.5 h-3.5' : 'w-2.5 h-2.5'"
    :style="{ backgroundColor: kleur, boxShadow: status === 'groen' ? '0 0 0 4px color-mix(in srgb, var(--color-ok) 18%, transparent)' : undefined }"
  />
</template>
