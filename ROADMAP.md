# Anstoß – Projektstand & nächste Schritte

Stand: 27.09.2026 · Live: https://mustineci-arch.github.io/fussball-app/

## Auf dem iPhone / iPad installieren

1. In **Safari** die Adresse oben öffnen
2. **Teilen** (Quadrat mit Pfeil) → **„Zum Home-Bildschirm“** → **Hinzufügen**

Die installierte App hat einen eigenen Speicher – Favoriten dort neu setzen.
Updates kommen automatisch („Aktualisieren“-Hinweis), kein App Store nötig.

## Fertig

- Spiele nach Datum, Filter, Live-Stände (Aktualisierung alle 20 s bei laufenden Spielen)
- Match Center: Übersicht, Aufstellung auf dem Spielfeld, Statistik, Ereignisse, Tabelle
- Wettbewerbe (12), Tabellen mit Zonen, Teams, Kader, Spielerprofile, Suche
- Echte Daten über ESPN (inoffiziell, kostenlos) – Adapter austauschbar
- Korrekte Schreibweise (türkische Buchstaben, deutsche Vereinsnamen), Korrekturliste für Quellfehler
- Favoriten (lokal), „Meine Spiele“ oben auf der Startseite
- PWA: installierbar, offline nutzbar, Update-Hinweis
- Deutsch / Englisch, Dark Mode (Hell/Dunkel/System)
- Spielerfotos aus Wikimedia Commons (nur freie Lizenzen, mit Fotonachweis) in Profil, Kader, Aufstellung
- TV & Stream: Rechteinhaber 2026/27 für Deutschland und Türkei, kostenlos/Abo gekennzeichnet

## Ideen für später (Reihenfolge = Vorschlag)

1. **Feinschliff Match Center** – Spieltag/Runde anzeigen, Head-to-Head, Formkurve in der Tabelle
2. **Mehr Wettbewerbe** – z. B. Türkischer Pokal, DFB-Pokal, 2. Bundesliga (je eine Zeile in `src/providers/espn/leagues.ts`)
3. **Push-Benachrichtigungen** (Tore, Aufstellungen) – braucht einen kleinen Server; auf dem iPhone nur für installierte App
4. **E2E-Tests** mit Playwright (iPhone-, iPad-, Desktop-Ansicht)
5. **Konto & Sync** der Favoriten zwischen Geräten
6. **Projektordner aus OneDrive verschieben** (z. B. `C:\dev\fussball-app`) – `node_modules` belastet die Synchronisierung

## Regelmäßig pflegen

- **TV-Rechte**: zur Saison 2027/28 aktualisieren (`src/tv/broadcasts.ts`) – neue Rechte u. a. Champions League (DE) und Süper Lig (TR, Ausschreibung Jan. 2027)
- **Datenfehler / Namen**: gemeldete Fehler in `src/providers/espn/nameFixes.ts` eintragen
  (`PLAYER_CORRECTIONS`, `TEAM_NAMES`, türkisches Namenswörterbuch)
- **Süper-Lig-Teams** nach Auf-/Abstieg in `TURKISH_TEAM_IDS` ergänzen

## Wichtig bei einer Veröffentlichung für andere

- ESPN-Schnittstelle ist inoffiziell → lizenzierten Datenanbieter als neuen Adapter anbinden
- Rechtliche Prüfung: Logos, Spielerfotos (Persönlichkeitsrecht), Impressum/Datenschutz

## Entwickeln & veröffentlichen

```bash
npm install
npm run dev      # lokal: http://localhost:5173
npm test
npm run deploy   # testet, baut und veröffentlicht auf GitHub Pages
```
