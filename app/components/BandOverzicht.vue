<script setup lang="ts">
// Wie doet mee, met welke kleur en welk instrument. De kleur komt uit het
// instellingen-blob: bus 1 t/m 6 zijn de zes kleuren, en de busnaam is de naam
// die het lid bij het instellen intypte.
const props = defineProps<{
  band: any
  bussen: any[]
  kanalen: any[]
  aanvragen: any[]
  opnames: any[]
  bandId: string
}>()

const plekken = computed(() => props.bussen.map(b => ({
  kleur: b.bus as number,
  naam: b.bus_name as string,
  vrij: isVrijeBus(b.bus_name),
  instrumenten: props.kanalen.filter(c => c.color_value === b.bus),
})))

const leden = computed(() => plekken.value.filter(p => !p.vrij))
const vrijeKleuren = computed(() => plekken.value.filter(p => p.vrij))

/** Kanalen die aan niemand toebehoren — de PA, een gastmicro, of vergeten. */
const gedeeldeKanalen = computed(() =>
  props.kanalen.filter(c => !c.color_value || !props.bussen.some(b => b.bus === c.color_value)))
</script>

<template>
  <div class="space-y-4">
    <section class="rounded-2xl border border-line bg-surface">
      <h2 class="px-4 pt-3 pb-2 text-sm text-muted">Wie doet mee</h2>
      <ul class="divide-y divide-line/60">
        <li v-for="l in leden" :key="l.kleur" class="px-4 py-3">
          <div class="flex items-center gap-3">
            <PersoonStip :kleur="l.kleur" />
            <span class="font-medium truncate">{{ l.naam }}</span>
            <span class="ml-auto text-sm text-muted shrink-0">{{ colorName(l.kleur) }}</span>
          </div>
          <p class="mt-1 pl-6 text-sm text-muted">
            {{ l.instrumenten.length
              ? l.instrumenten.map((c: any) => c.channel_name).join(', ')
              : 'nog geen kanalen toegewezen' }}
          </p>
        </li>
        <li v-if="!leden.length" class="px-4 py-3 text-muted text-sm">
          Nog niemand heeft een kleur gekozen bij het instellen.
        </li>
      </ul>
      <p v-if="vrijeKleuren.length && leden.length" class="px-4 pb-3 text-xs text-muted">
        Nog vrij: {{ vrijeKleuren.map(p => colorName(p.kleur)).join(', ') }}
      </p>
    </section>

    <section v-if="gedeeldeKanalen.length" class="rounded-2xl border border-line bg-surface">
      <h2 class="px-4 pt-3 pb-2 text-sm text-muted">Van niemand in het bijzonder</h2>
      <p class="px-4 pb-3 text-sm">
        {{ gedeeldeKanalen.map((c: any) => c.channel_name).join(', ') }}
      </p>
    </section>

    <section v-if="aanvragen.length" class="rounded-2xl border border-accent/40 bg-accent/10 p-4">
      <h2 class="font-medium">Wacht op antwoord</h2>
      <ul class="mt-2 space-y-1 text-sm">
        <li v-for="(a, i) in aanvragen" :key="i">
          {{ a.user_name || a.user_email }} vroeg {{ ago(a.created_at) }} om mee te doen
        </li>
      </ul>
    </section>

    <section class="grid grid-cols-2 gap-2">
      <div class="rounded-2xl border border-line bg-surface p-4">
        <p class="text-sm text-muted">Mixers</p>
        <p class="mt-1 font-medium break-words">{{ band.mixers || 'geen' }}</p>
      </div>
      <div class="rounded-2xl border border-line bg-surface p-4">
        <p class="text-sm text-muted">Opnames</p>
        <p class="mt-1 font-medium">{{ band.recordings }}</p>
      </div>
      <div class="rounded-2xl border border-line bg-surface p-4">
        <p class="text-sm text-muted">Accounts</p>
        <p class="mt-1 font-medium">{{ band.members }}</p>
      </div>
      <div class="rounded-2xl border border-line bg-surface p-4">
        <p class="text-sm text-muted">Fouten (30 dagen)</p>
        <p class="mt-1 font-medium" :class="Number(band.errors_30d) > 0 ? 'text-warn' : ''">{{ band.errors_30d }}</p>
      </div>
    </section>

    <section v-if="opnames.length" class="rounded-2xl border border-line bg-surface">
      <h2 class="px-4 pt-3 pb-2 text-sm text-muted">Laatste opnames</h2>
      <ul class="divide-y divide-line/60">
        <li v-for="(o, i) in opnames" :key="i" class="flex items-center gap-3 px-4 py-2.5">
          <span class="truncate">{{ o.display_name || o.filename }}</span>
          <span class="ml-auto text-sm text-muted shrink-0">
            {{ dayLabel(o.created_at) }}<template v-if="o.duration_seconds"> · {{ duration(o.duration_seconds) }}</template>
          </span>
        </li>
      </ul>
    </section>

    <NuxtLink
      :to="'/terugblik?band=' + bandId"
      class="block rounded-2xl border border-line bg-surface px-4 py-3.5"
    >Terugblik op een avond van deze band →</NuxtLink>
  </div>
</template>
