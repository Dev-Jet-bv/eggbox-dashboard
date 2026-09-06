<script setup lang="ts">
// De stand zoals die nu bewaard is. Namen komen letterlijk uit de instellingen,
// ook als ze nog CH01 of BUS01 heten — dat is de waarheid van het blob.
//
// Op kanalen is de kleur het echte signaal: die zegt welk lid het kanaal bezit.
// De naam bij die kleur staat in de busnaam, dus die zetten we erbij zodra het
// een echte naam is en geen fabrieksnaam.
const props = defineProps<{ band: any; bussen: any[]; kanalen: any[] }>()

const naamPerKleur = computed(() => {
  const m = new Map<number, string>()
  for (const b of props.bussen) {
    if (!isVrijeBus(b.bus_name)) m.set(b.bus, b.bus_name)
  }
  return m
})

/** Alles wat onder een kanaal past, als één regel. */
function onderregel(c: any): string {
  const delen: string[] = []
  const eigenaar = c.color_value ? naamPerKleur.value.get(c.color_value) : null
  if (eigenaar) delen.push(eigenaar)
  if (c.main_send_db != null) delen.push('naar de hoofdmix ' + formatDb(c.main_send_db))
  if (c.linked) delen.push('gekoppeld')
  return delen.join(' · ')
}
</script>

<template>
  <div class="space-y-4">
    <div v-if="!kanalen.length && !bussen.length" class="rounded-2xl border border-line bg-surface p-6">
      <p class="font-medium">Deze band heeft nog geen instellingen opgeslagen.</p>
      <p class="mt-1 text-sm text-muted">
        Zodra iemand de mixer instelt en opslaat, staan de kanalen en de outputs hier.
      </p>
    </div>

    <template v-else>
      <p class="text-sm text-muted">
        De stand zoals die nu bewaard is<template v-if="band.settings_updated_at">, opgeslagen {{ ago(band.settings_updated_at) }}</template>.
      </p>

      <section class="rounded-2xl border border-line bg-surface">
        <h2 class="px-4 pt-3 pb-2 text-sm text-muted">Outputs</h2>
        <ul class="divide-y divide-line/60">
          <li v-for="b in bussen" :key="b.bus" class="flex items-center gap-3 px-4 py-2.5">
            <PersoonStip :kleur="b.bus" />
            <span class="truncate">{{ b.bus_name }}</span>
            <span class="ml-auto text-sm shrink-0" :class="b.mute ? 'text-warn' : 'text-muted'">
              {{ b.mute ? 'stil' : b.fader_known === false ? 'volume onbekend' : formatDb(b.fader_db) }}
            </span>
          </li>
        </ul>
      </section>

      <section class="rounded-2xl border border-line bg-surface">
        <h2 class="px-4 pt-3 pb-2 text-sm text-muted">Kanalen</h2>
        <ul class="divide-y divide-line/60">
          <li v-for="c in kanalen" :key="c.channel" class="px-4 py-2.5">
            <div class="flex items-center gap-3">
              <PersoonStip :kleur="c.color_value" />
              <span class="tabular-nums text-muted text-sm w-6 shrink-0">{{ c.channel }}</span>
              <span class="truncate">{{ c.channel_name }}</span>
              <span class="ml-auto text-sm shrink-0" :class="c.mute ? 'text-warn' : 'text-muted'">
                <template v-if="c.mute">stil</template>
                <template v-else><span class="text-muted">gain</span> {{ formatDb(c.gain_db) }}</template>
              </span>
            </div>
            <p v-if="onderregel(c)" class="mt-1 pl-12 text-xs text-muted">{{ onderregel(c) }}</p>
          </li>
        </ul>
      </section>
    </template>
  </div>
</template>
