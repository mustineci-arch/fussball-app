# Anstoß – Projektstand & nächste Schritte

Stand: 27.09.2026 · Live: https://mustineci-arch.github.io/fussball-app/

## Auf dem iPhone / iPad installieren

1. In **Safari** die Adresse oben öffnen
2. **Teilen** (Quadrat mit Pfeil) → **„Zum Home-Bildschirm“** → **Hinzufügen**

Die installierte App hat einen eigenen Speicher – Favoriten dort neu setzen.
Updates kommen automatisch („Aktualisieren“-Hinweis), kein App Store nötig.

## Fertig

- Spiele nach Datum, Filter, Live-Stände (Aktualisierung alle 2 s bei laufenden Spielen und rund um den Anpfiff; Spielstand/Minute direkt aus dem ESPN-Scoreboard, Ereignisse/Aufstellung liefert ESPN mit ca. 10–15 s Verzögerung)
- Match Center: Übersicht, Aufstellung auf dem Spielfeld, Statistik, Ereignisse, Tabelle
- Wettbewerbe (15 inkl. 2. Bundesliga, DFB-Pokal und türkischem Pokal, dazu Testspiele), Tabellen mit Zonen, Teams, Kader, Spielerprofile, Suche
- Echte Daten über ESPN (inoffiziell, kostenlos) – Adapter austauschbar
- Korrekte Schreibweise (türkische Buchstaben, deutsche Vereinsnamen), Korrekturliste für Quellfehler
- Favoriten (lokal), „Meine Spiele“ oben auf der Startseite
- PWA: installierbar, offline nutzbar, Update-Hinweis
- Deutsch / Englisch, Dark Mode (Hell/Dunkel/System)
- Spielerfotos aus Wikimedia Commons (nur freie Lizenzen, mit Fotonachweis) in Profil, Kader, Aufstellung
- TV & Stream weltweit: Sender pro Spiel aus FotMob (für jedes Land, ca. 10 Tage im Voraus) und ESPN, sonst recherchierte Rechteliste; „Mein Land“ frei wählbar (alle Länder, automatisch vom Gerät erkannt); Heimatländer der beiden Teams werden direkt danach gezeigt; Rechteinhaber 2026/27 für Deutschland, Österreich, Schweiz, Türkei, Großbritannien, USA, Spanien, Italien, Frankreich und Niederlande (mit Quellen) plus die Sender, die ESPN pro Spiel meldet; kostenlos/Abo gekennzeichnet, Links zu den offiziellen Angeboten; Filter „Live im TV“ zeigt alle laufenden Spiele mit allen Sendern
- Testspiele: Vereins-Testspiele (z. B. HSV – FC Kopenhagen) und Länderspiel-Tests in der Spielliste (nicht unter Wettbewerbe)
- Türkischer Pokal (FotMob): Spielplan, Gruppen, K.-o.-Runden, Match Center mit Aufstellung/Noten/Statistik, Pokalspiele auf den Seiten türkischer Teams
- Ausfälle (FotMob): verletzte/gesperrte Spieler mit Art der Verletzung (35 Arten übersetzt), Meldedatum und voraussichtlicher Rückkehr – je Team (Tab „Ausfälle“, Markierung im Kader, Spielerprofil) und pro Spiel in der Übersicht
- Spielernoten (FotMob): Tab „Noten“ im Match Center, Noten auf Spielfeld und Bank, Saisonnote im Kader und Profil; ohne FotMob-Daten eigene Berechnung aus ESPN-Einzelwerten

## Ideen für später (Reihenfolge = Vorschlag)

1. **Feinschliff Match Center** – Spieltag/Runde anzeigen, Head-to-Head, Formkurve in der Tabelle
2. **Mehr Wettbewerbe** – ESPN-Wettbewerbe je eine Zeile in `src/providers/espn/leagues.ts`; Wettbewerbe, die nur FotMob hat, wie der türkische Pokal in `src/providers/CombinedProvider.ts`
3. **Push-Benachrichtigungen** (Anpfiff und Tore der Favoriten-Teams) – Plan: Cloudflare Worker (kostenlos) prüft jede Minute die Spielstände und verschickt Web-Push (VAPID); Favoriten werden beim Abonnieren an den Worker übertragen. Braucht ein Cloudflare-Konto; auf dem iPhone nur für die installierte App, Verzögerung ca. 1 Minute
4. **E2E-Tests** mit Playwright (iPhone-, iPad-, Desktop-Ansicht)
5. **Konto & Sync** der Favoriten zwischen Geräten
6. **Projektordner aus OneDrive verschieben** (z. B. `C:\dev\fussball-app`) – `node_modules` belastet die Synchronisierung

## Regelmäßig pflegen

- **TV-Rechte**: zur Saison 2027/28 aktualisieren (`src/tv/broadcasts.ts`, alle zehn Länder) – neue Rechte u. a. Champions League (DE) und Süper Lig (TR, Ausschreibung Jan. 2027)
- **FotMob-Zuordnung**: findet die App ein Team nicht bei FotMob, ESPN-ID → FotMob-ID in `TEAM_OVERRIDES` (`src/providers/fotmob/fotmob.ts`) eintragen
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
