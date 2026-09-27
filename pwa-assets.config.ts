import { defineConfig, minimal2023Preset } from '@vite-pwa/assets-generator/config'

// Erzeugt aus dem Logo alle Icon-Größen (Android, iPhone/iPad, Desktop, Favicon)
export default defineConfig({
  headLinkOptions: { preset: '2023' },
  preset: {
    ...minimal2023Preset,
    maskable: { ...minimal2023Preset.maskable, resizeOptions: { background: '#0f7a4a' } },
    apple: { ...minimal2023Preset.apple, resizeOptions: { background: '#0f7a4a' } },
  },
  images: ['public/favicon.svg'],
})
