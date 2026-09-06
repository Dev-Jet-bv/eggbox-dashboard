<script setup lang="ts">
const user = useSupabaseUser()
const client = useSupabaseClient()
const route = useRoute()

// Terugblik staat bewust niet in de navigatie: je komt er via een band, en dat
// is ook de enige volgorde waarin het zin heeft (eerst wie, dan wanneer).
const items = [
  { pad: '/', label: 'Vandaag' },
  { pad: '/bands', label: 'Bands' },
]

const actief = (pad: string) =>
  pad === '/' ? route.path === '/' : route.path.startsWith(pad)

async function uitloggen() {
  await client.auth.signOut()
  await navigateTo('/login')
}
</script>

<template>
  <div class="min-h-dvh flex flex-col">
    <header class="sticky top-0 z-20 bg-bg/95 backdrop-blur border-b border-line">
      <div class="mx-auto w-full max-w-5xl px-4 py-3 flex items-center gap-3">
        <NuxtLink to="/" class="flex items-center gap-2 min-w-0">
          <span class="w-2.5 h-3.5 rounded-full bg-primary shrink-0" />
          <span class="font-semibold tracking-tight truncate">Eggbox</span>
        </NuxtLink>

        <nav v-if="user" class="ml-auto flex items-center gap-1">
          <NuxtLink
            v-for="i in items" :key="i.pad" :to="i.pad"
            class="px-3 py-2 rounded-lg text-sm transition-colors"
            :class="actief(i.pad) ? 'bg-surface-2 text-text' : 'text-muted'"
          >{{ i.label }}</NuxtLink>
          <button class="ml-1 px-3 py-2 rounded-lg text-sm text-muted" @click="uitloggen">Uitloggen</button>
        </nav>
      </div>
    </header>

    <main class="flex-1 mx-auto w-full max-w-5xl px-4 py-4 safe-bottom">
      <slot />
    </main>
  </div>
</template>
