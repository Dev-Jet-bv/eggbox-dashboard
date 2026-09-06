<script setup lang="ts">
const client = useSupabaseClient()
const user = useSupabaseUser()

async function uitloggen() {
  await client.auth.signOut()
  await navigateTo('/login')
}
</script>

<template>
  <div class="max-w-sm mx-auto pt-16 text-center">
    <h1 class="text-xl font-semibold">Dit bord is niet voor dit account</h1>
    <p class="mt-2 text-sm text-muted">
      {{ user?.email }} heeft geen toegang tot de repetitiegegevens.
    </p>
    <button class="mt-6 text-sm text-accent" @click="uitloggen">Met een ander account aanmelden</button>
  </div>
</template>
