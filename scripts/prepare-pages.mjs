// Bereitet dist/ für GitHub Pages vor:
// 404.html = index.html (SPA-Fallback für Direktaufrufe wie /match/123), .nojekyll (keine Jekyll-Verarbeitung)
import { copyFileSync, writeFileSync } from 'node:fs'

copyFileSync('dist/index.html', 'dist/404.html')
writeFileSync('dist/.nojekyll', '')
console.log('dist/ für GitHub Pages vorbereitet')
