<script setup lang="ts">
// Laatste vangnet. Losse blokken vangen hun eigen fouten op in VeiligBlok;
// dit is voor wat daar doorheen komt. Geen stacktrace op het scherm: wie hier
// belandt staat in een repetitieruimte, niet achter een toetsenbord.
const renderfout = ref<string | null>(null)

onErrorCaptured((e) => {
  renderfout.value = (e as Error)?.message || String(e)
  console.error(e)
  return false
})
</script>

<template>
  <div>
    <div v-if="renderfout" class="m-4 rounded-2xl border border-line bg-surface p-4">
      <p class="font-medium">Dit scherm kon niet worden getoond.</p>
      <p class="mt-1 text-sm text-muted">Opnieuw laden helpt meestal.</p>
      <button
        class="mt-3 rounded-xl bg-primary text-white text-sm font-medium px-4 py-2"
        @click="reloadNuxtApp()"
      >Opnieuw laden</button>
      <details class="mt-3">
        <summary class="text-xs text-muted cursor-pointer">Technische reden</summary>
        <p class="mt-1 text-xs text-muted break-words">{{ renderfout }}</p>
      </details>
    </div>

    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
  </div>
</template>
