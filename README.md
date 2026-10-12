# Number Place

Eine minimalistische, deutschsprachige Zahlenrätsel-PWA mit TypeScript und SCSS. Keine Sounds, kein Konto, keine externen Laufzeitdienste.

## Entwicklung

Node.js 22.12+ oder 24 und npm erforderlich.

```sh
npm ci
npm run dev
```

```sh
npm test
npm run build
npm run preview
```

## Funktionen

- 4×4 (2×2-Blöcke), 6×6 (2×3-Blöcke), 9×9 (3×3-Blöcke)
- Leicht, Mittel, Schwer: weniger Vorgaben mit steigender Schwierigkeit; keine Bewertung nach Lösungsstrategien. 4×4 ist generell für kurze, einfache Runden gedacht.
- Neue Rätsel entstehen lokal in einem Web Worker. Jede entfernte Vorgabe wird auf eine eindeutige Lösung geprüft.
- Zahlen, Notizen, Rückgängig, Löschen und optionale Markierung doppelter Zahlen
- „Neues Spiel“ als Neustart-Icon neben dem Zahnrad; Größe und Schwierigkeit wählen und ausdrücklich bestätigen. Abbrechen behält den Spielstand.
- Hilfsangebot über ein Dropdown: Aus, 30s, 1min oder 2min. Erst ein Klick löst ein Feld auf. Ist das gewählte Feld bereits richtig, wird das erste ungelöste Feld verwendet.
- Hervorhebung von Block, Zeile und Spalte separat ein- und ausschaltbar; das gewählte Feld bleibt markiert.
- Dezent angezeigte aktive Spielzeit, Pause, automatische Pause bei versteckter App oder offenem Dialog
- Automatische lokale Speicherung, vollständig sichtbare Darstellung ohne Scrollen in Hoch- und Querformat, Tastaturbedienung. Das Spielfeld passt sich an die verfügbare Höhe an, auch bei Hilfsangeboten und Abschlussmeldung.
- Mobil bleibt die Werkzeugleiste am unteren Bildschirmrand. Reservierter Platz und zusätzlicher Safe-Area-Abstand verhindern Überlappung mit dem Home-Indikator und dem Spielfeld.
- Installierbare PWA mit vollständigem Offline-Modus nach dem ersten erfolgreichen Laden

## Name und GitHub Pages

Nikoli bezeichnet „Sudoku“ als eingetragene Marke in Japan ([Quelle](https://www.nikoli.co.jp/en/puzzles/sudoku/)). Der sichtbare App-Name lautet deshalb **Number Place**, der von Nikoli erwähnte alternative Gattungsname. Repository-Pfad und Speicherschlüssel bleiben für vorhandene Links und Spielstände erhalten.

Ziel: https://github.com/paranerd/sudoku

1. Projekt auf den Branch `main` pushen.
2. Im Repository unter **Settings → Pages → Build and deployment** als Source **GitHub Actions** auswählen.
3. Der enthaltene Workflow prüft, baut und veröffentlicht die App. Erwartete URL: https://paranerd.github.io/sudoku/

Der Workflow setzt den Repository-Unterpfad automatisch. Für einen lokalen Test desselben Pfads:

```sh
BASE_PATH=/sudoku/ npm run build
BASE_PATH=/sudoku/ npm run preview
```

Bei Hosting auf der Root-Domain `BASE_PATH=/` verwenden. Bei geändertem Pfad muss die App einmal unter der neuen URL online geladen werden.

## Offline und Datenschutz

Der Build erstellt einen versionierten Service Worker und cached HTML, CSS, JavaScript, den Rätselgenerator, Manifest und Icons vollständig. Es gibt keine externen Fonts, Analyse, Werbung oder Netzwerk-API für Rätsel. Der Entwicklungsserver aktiviert absichtlich keinen Service Worker; Offline-Funktion mit dem Produktions-Build testen.

Ein neues Update wartet, bis es in den Einstellungen mit **Update laden** aktiviert wird. Der Spielstand bleibt dabei gespeichert. Auf iPhone/iPad über **Teilen → Zum Home-Bildschirm** installieren, bei kompatiblen Browsern über **App installieren** in den Einstellungen.

Browserdaten löschen entfernt auch den Spielstand. Ist lokales Speichern blockiert, bleibt das aktuelle Spiel im Arbeitsspeicher; die App meldet die Einschränkung.

## Tests

```sh
npm test
npx playwright install chromium
npm run test:e2e
```

Die Logiktests prüfen gültige, eindeutige Rätsel für alle neun Kombinationen, Schwierigkeitsabstufungen, Konflikte und wiederherstellbare Spielstände. Die Browsertests prüfen Eingaben, Notizen, Rückgängig, Pause, Hilfsangebote, alle Feldgrößen, Hoch-/Querformat, Speicherung und echten Offline-Neustart einschließlich neuer Rätsel.
