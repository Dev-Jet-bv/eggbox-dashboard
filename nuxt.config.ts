import tailwindcss from '@tailwindcss/vite'

export default defineNuxtConfig({
  // Alles zit achter een login: er valt niets te renderen voor een bezoeker
  // zonder sessie. Als SPA is dit ook gewoon statisch te hosten op admin.eggbox.be.
  ssr: false,
  compatibilityDate: '2025-09-01',
  devtools: { enabled: false },

  modules: ['@nuxtjs/supabase'],
  css: ['~/assets/css/main.css'],
  vite: { plugins: [tailwindcss()] },

  supabase: {
    redirect: true,
    redirectOptions: {
      login: '/login',
      callback: '/confirm',
      exclude: ['/login', '/confirm'],
    },
  },

  app: {
    head: {
      title: 'Eggbox repetitiebord',
      htmlAttrs: { lang: 'nl' },
      meta: [
        { name: 'viewport', content: 'width=device-width, initial-scale=1, viewport-fit=cover' },
        { name: 'theme-color', content: '#12100f' },
        { name: 'color-scheme', content: 'dark' },
      ],
      link: [{ rel: 'icon', href: '/favicon.svg' }],
    },
  },
})
