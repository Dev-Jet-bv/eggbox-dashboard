<script setup lang="ts">
// Eén gewijzigd veld, compact: kleur en naam van het kanaal op dát moment,
// dan de oude en de nieuwe waarde.
//   ● CH10  Backing vox   −5.8 dB → −10 dB (−4.25)
const props = defineProps<{
  regel: any
  stand?: { channel_name: string | null; color_value: number | null } | null
}>()

const isDb = computed(() => {
  const f = props.regel.field as string
  return f === 'GainDb' || f === 'FaderDb' || f.startsWith('send_')
})

const isKleur = computed(() => props.regel.field === 'ColorMappedValue')

const kleur = computed(() => {
  if (props.regel.scope === 'bus') return props.regel.idx as number
  return props.stand?.color_value ?? null
})

const code = computed(() => {
  if (props.regel.scope === 'main') return 'MAIN'
  if (props.regel.scope === 'bus') return 'OUT' + props.regel.idx
  return kanaalCode(props.regel.idx)
})

/** Een kanaal dat nog zijn fabrieksnaam draagt, heet al wat de code zegt. */
const naam = computed(() => {
  const n = props.stand?.channel_name
  return n && n.trim().toUpperCase() !== code.value ? n : null
})

/** Een verschil heeft alleen betekenis in dB; kleur 3 → 0 is geen "−3". */
const delta = computed(() => {
  const d = props.regel.delta
  if (d == null || !isDb.value) return null
  const n = Number(d)
  return (n > 0 ? '+' : '') + n
})

const alsGetal = (v: string | null) => (v == null || v === '' ? null : Number(v))
</script>

<template>
  <li class="flex items-center gap-2 px-3 py-1.5 text-sm">
    <PersoonStip v-if="regel.scope !== 'main'" :kleur="kleur" />
    <span class="tabular-nums text-xs text-muted shrink-0">{{ code }}</span>
    <span class="truncate flex-1 min-w-0">{{ naam }}</span>

    <span v-if="isKleur" class="flex items-center gap-1.5 shrink-0">
      <PersoonStip :kleur="alsGetal(regel.was)" />
      <span class="text-muted">→</span>
      <PersoonStip :kleur="alsGetal(regel.becomes)" />
    </span>

    <span v-else class="tabular-nums shrink-0 text-right">
      {{ waardeLabel(regel.field, regel.was) }} → {{ waardeLabel(regel.field, regel.becomes) }}
      <span v-if="delta" class="text-muted">({{ delta }})</span>
    </span>
  </li>
</template>
