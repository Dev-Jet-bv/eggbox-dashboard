<script setup lang="ts">
// De stand zoals die nu bewaard is. Kies een output — Main of een van de zes
// gekleurde — en zie per kanaal hoe luid het daarnaartoe gaat, met de gain
// ernaast. Namen komen letterlijk uit de instellingen.
const props = defineProps<{ band: any; bussen: any[]; kanalen: any[] }>()

const route = useRoute()
const router = useRouter()

interface Output { key: string; label: string; kleur: number | null; bus: any | null }

const outputs = computed<Output[]>(() => [
  { key: 'main', label: 'Main', kleur: null, bus: null },
  ...props.bussen.map(b => ({ key: String(b.bus), label: b.bus_name, kleur: b.bus as number, bus: b })),
])

// In de URL, net als het tabblad: deelbaar, en de terugknop werkt.
const gekozen = computed<Output>({
  get: () => outputs.value.find(o => o.key === route.query.out) ?? outputs.value[0]!,
  set: (o) => router.replace({ query: { ...route.query, out: o.key } }),
})

/** sends: "0" is Main, "1" t/m "6" zijn de outputs. */
function niveau(c: any): number | null {
  const sleutel = gekozen.value.key === 'main' ? '0' : gekozen.value.key
  const v = c.sends?.[sleutel]
  if (v != null) return Number(v)
  return gekozen.value.key === 'main' && c.main_send_db != null ? Number(c.main_send_db) : null
}

/** De naam bij de kleur van een kanaal, als het lid er een echte naam aan gaf. */
const eigenaarPerKleur = computed(() => {
  const m = new Map<number, string>()
  for (const b of props.bussen) if (!isVrijeBus(b.bus_name)) m.set(b.bus, b.bus_name)
  return m
})
</script>

<template>
  <div class="space-y-3">
    <div v-if="!kanalen.length && !bussen.length" class="rounded-2xl border border-line bg-surface p-6">
      <p class="font-medium">Deze band heeft nog geen instellingen opgeslagen.</p>
      <p class="mt-1 text-sm text-muted">
        Zodra iemand de mixer instelt en opslaat, staan de kanalen en de outputs hier.
      </p>
    </div>

    <template v-else>
      <p class="text-xs text-muted">
        Opgeslagen stand<template v-if="band.settings_updated_at">, {{ ago(band.settings_updated_at) }}</template>.
      </p>

      <!-- Outputkeuze: horizontaal scrollen op een telefoon, geen wrap -->
      <div class="-mx-4 px-4 overflow-x-auto">
        <div class="flex gap-2 w-max">
          <button
            v-for="o in outputs" :key="o.key"
            class="flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm whitespace-nowrap"
            :class="gekozen.key === o.key ? 'border-primary bg-surface-2 text-text' : 'border-line text-muted'"
            @click="gekozen = o"
          >
            <PersoonStip v-if="o.kleur" :kleur="o.kleur" />
            {{ o.label }}
          </button>
        </div>
      </div>

      <p v-if="gekozen.bus" class="text-xs text-muted px-1">
        Output-niveau:
        <span :class="gekozen.bus.mute ? 'text-warn' : ''">
          {{ gekozen.bus.mute ? 'stil' : gekozen.bus.fader_known === false ? 'onbekend' : formatDbKort(gekozen.bus.fader_db) }}
        </span>
      </p>

      <section class="rounded-2xl border border-line bg-surface">
        <div class="flex items-center gap-2 px-3 pt-2.5 pb-1.5 text-xs text-muted">
          <span class="flex-1">Kanaal</span>
          <span class="w-[4.5rem] text-right">gain</span>
          <span class="w-[4.5rem] text-right">naar {{ gekozen.label }}</span>
        </div>
        <ul class="divide-y divide-line/60">
          <li v-for="c in kanalen" :key="c.channel" class="flex items-center gap-2 px-3 py-1.5 text-sm">
            <PersoonStip :kleur="c.color_value" />
            <span class="tabular-nums text-muted w-5 shrink-0 text-xs">{{ c.channel }}</span>
            <span class="truncate flex-1 min-w-0">
              {{ c.channel_name }}<span
                v-if="c.color_value && eigenaarPerKleur.get(c.color_value)"
                class="text-muted"
              > · {{ eigenaarPerKleur.get(c.color_value) }}</span>
            </span>
            <span class="w-[4.5rem] text-right tabular-nums text-xs text-muted shrink-0">
              {{ formatDbKort(c.gain_db) }}
            </span>
            <span
              class="w-[4.5rem] text-right tabular-nums shrink-0"
              :class="c.mute ? 'text-warn' : ''"
            >{{ c.mute ? 'stil' : formatDbKort(niveau(c)) }}</span>
          </li>
        </ul>
      </section>
    </template>
  </div>
</template>
