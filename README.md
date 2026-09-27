# Anstoß – Fußball-Live-PWA

Responsive Web-App (später installierbare PWA) für Spiele, Live-Stände, Match Center, Tabellen, Teams und Spieler.

## Entwicklung

```bash
npm install
npm run dev        # http://localhost:5173
npm test           # Unit-Tests
npm run build      # Produktions-Build nach dist/
```

## Architektur

```
src/
  domain/      internes Datenmodell + reine Logik (Status, Datum, Text) – anbieterunabhängig
  providers/   FootballProvider-Interface + Adapter (mock/, später espn/)
  data/        TanStack-Query-Hooks inkl. Cache-/Polling-Strategie
  components/  UI-Bausteine (layout/, ui/, media/)
  features/    fachliche Komponenten (matches/, match-center/, competitions/)
  pages/       Seiten (per Code-Splitting geladen)
  app/         Router, Fehlerbehandlung
```

Die UI spricht ausschließlich mit `FootballProvider`. Der Anbieter wird in `src/providers/index.ts`
über `VITE_DATA_PROVIDER` gewählt – ein Wechsel erfordert keine Änderungen an Seiten oder Komponenten.

## Deployment

```bash
npm run deploy
```

Testet, baut mit Base-Pfad `/fussball-app/` und veröffentlicht `dist/` auf den Branch `gh-pages`,
von dem GitHub Pages ausliefert: https://mustineci-arch.github.io/fussball-app/
