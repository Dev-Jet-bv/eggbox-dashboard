<script setup lang="ts">
// A. Het bord. Eén verticale lijst van bands die vandaag actief waren.
const { bands, meldingen, storingen, bezig, fout, bijgewerkt, nieuwsteGebeurtenis, refresh } = useBoard()

onMounted(refresh)
usePolling(refresh, 20000)

// Meldingen die niet aan een band hangen, vallen anders van het bord af.
const losseMeldingen = computed(() => meldingen.value.filter(m => !m.band_name))

const stilte = computed(() => {
  if (!nieuwsteGebeurtenis.value) return null
  const min = (Date.now() - new Date(nieuwsteGebeurtenis.value).getTime()) / 60000
  return min > 30 ? nieuwsteGebeurtenis.value : null
})
</script>

<template>
  <div class="space-y-4">
    <div class="flex items-baseline gap-3">
      <h1 class="text-2xl font-semibold tracking-tight">Vandaag</h1>
      <span v-if="bijgewerkt" class="ml-auto text-xs text-muted">
        bijgewerkt {{ clockSec(bijgewerkt.toISOString()) }}
      </span>
    </div>

    <p v-if="fout" class="rounded-2xl border border-bad/40 bg-bad/10 p-4 text-sm">
      Het bord kon de gegevens niet ophalen. {{ fout }}
    </p>

    <div v-else-if="bezig" class="rounded-2xl border border-line bg-surface p-6 text-muted">
      Even kijken…
    </div>

    <template v-else>
      <VeiligBlok wat="De meldingen">
        <MeldingKaart v-for="(m, i) in losseMeldingen" :key="'los' + i" :melding="m" />
      </VeiligBlok>

      <VeiligBlok wat="De storingen">
        <StoringKaart v-for="s in storingen" :key="s.name" :storing="s" />
      </VeiligBlok>

      <div v-if="!bands.length" class="rounded-2xl border border-line bg-surface p-6">
        <p class="font-medium">Vandaag is er nog niemand bezig geweest.</p>
        <p class="mt-1 text-sm text-muted">
          Zodra iemand de app opent tijdens een repetitie, verschijnt de band hier.
        </p>
        <NuxtLink to="/terugblik" class="mt-3 inline-block text-sm text-accent">
          Terugblik op een eerdere avond →
        </NuxtLink>
      </div>

      <VeiligBlok v-for="b in bands" :key="b.band_id || b.naam" :wat="'De regel voor ' + b.naam">
        <BandKaart :band="b" />
      </VeiligBlok>

      <p v-if="stilte" class="text-xs text-muted px-1">
        De laatste gegevens kwamen {{ ago(stilte) }} binnen. Telefoons die aan de wifi van de
        mixer hangen zonder internet sturen hun gegevens pas later door.
      </p>
    </template>
  </div>
</template>
