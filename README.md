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

## Datenquelle

Standard ist die **inoffizielle ESPN-API** (kostenlos, kein API-Key, direkt aus dem Browser abrufbar).
Sie ist undokumentiert und kann sich jederzeit ändern – daher nur für **private Nutzung**.
Für einen öffentlichen Betrieb wird ein lizenzierter Anbieter als weiterer Adapter in
`src/providers/` ergänzt. Mit `VITE_DATA_PROVIDER=mock` läuft die App mit Demo-Daten.

- Adapter: `src/providers/espn/` (Client mit Single-Flight + Cache, Mapper, Liga-Liste)
- Neuer Wettbewerb: eine Zeile in `src/providers/espn/leagues.ts`
- Tests laufen gegen gespeicherte echte Antworten in `src/providers/espn/__fixtures__/`

### Amateur- und Jugendligen (fussball.de)

`src/providers/fussballde/withFussballDe.ts` ergänzt jeden Anbieter um Ligen aus
`public/data/fussballde.json` (IDs mit Präfix `fde-`). Die Datei wird zur Laufzeit geladen –
Aktualisieren heißt nur: Datei ersetzen und veröffentlichen. Format: `src/providers/fussballde/types.ts`.
Mit `matches` (Ergebnissen) funktionieren auch Heim/Auswärts, Hin-/Rückrunde, Fieberkurve und Kreuztabelle.

## Spielerfotos

Nur frei lizenzierte Fotos aus **Wikimedia Commons** (CC0, gemeinfrei, CC BY, CC BY-SA),
immer mit Urheber und Lizenz direkt unter dem Foto (`src/media/`). Zuordnung nur eindeutig:
über die ESPN-ID in Wikidata oder Name + Beruf Fußballspieler + exaktes Geburtsdatum.
Fotos von ESPN oder anderen Webseiten werden nicht verwendet.

## Deployment

```bash
npm run deploy
```

Testet, baut mit Base-Pfad `/fussball-app/` und veröffentlicht `dist/` auf den Branch `gh-pages`,
von dem GitHub Pages ausliefert: https://mustineci-arch.github.io/fussball-app/
