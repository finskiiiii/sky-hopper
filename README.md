# Sky Hopper 🐤

Ein vollständig kostenloses kleines Browser-Spiel, das du als **Web-App auf dem iPhone** installieren kannst. Keine Apple-Developer-Lizenz notwendig.

## Inhalt

- `index.html` – Startseite / App
- `style.css` – Design
- `game.js` – Spiellogik und Touch-Steuerung
- `manifest.webmanifest` – Informationen für die Installation
- `sw.js` – Offline-Unterstützung
- `icons/` – App-Symbole
- `.nojekyll` – GitHub Pages bereitstellen ohne Jekyll

## Erst am Computer ausprobieren

Öffne `index.html` per Doppelklick in deinem Browser. Starte das Spiel mit Klick oder Leertaste. (Die Offline-Installation funktioniert erst über HTTPS, beispielsweise auf GitHub Pages.)

## Kostenlos veröffentlichen auf GitHub Pages

1. Öffne https://github.com und erstelle ein kostenloses Konto, falls du noch keines hast.
2. Klicke auf **New repository**. Name: `sky-hopper`, Sichtbarkeit: **Public**; Repository anlegen.
3. Im Repository: **Add file → Upload files**. Lade **den Inhalt des entpackten Ordners** hoch, nicht die ZIP-Datei. Achte darauf, dass `index.html`, `game.js`, `style.css`, `manifest.webmanifest`, `sw.js`, `.nojekyll` und der Ordner `icons` in der obersten Ebene stehen. Bestätige mit **Commit changes**.
   Hinweis: Unter Windows ist `.nojekyll` eine versteckte/ungewöhnliche Datei. Für dieses Projekt funktioniert GitHub Pages auch ohne sie.
4. Gehe auf **Settings → Pages**. Bei **Build and deployment → Source** wähle **Deploy from a branch**. Bei **Branch** wähle `main` und `/ (root)` und drücke **Save**.
5. Sobald GitHub Pages veröffentlicht wurde, steht das Spiel unter `https://DEIN-GITHUB-NAME.github.io/sky-hopper/` zur Verfügung.

WICHTIG: Beim kostenlosen GitHub-Account ist das Repository öffentlich. Der Link muss nicht im App Store eingetragen werden, ist aber für andere mit Link zugänglich. Veröffentliche keine privaten Daten oder Passwörter im Code.

## Auf dem iPhone installieren

1. Öffne die URL **in Safari** (nicht in einem integrierten App-Browser).
2. Tippe auf **Teilen** (bei Bedarf zuerst auf das Seitenmenü).
3. Wähle **Zum Home-Bildschirm hinzufügen**.
4. Schalte **Als Web-App öffnen** ein und tippe auf **Hinzufügen**.

Das Symbol erscheint auf dem Home-Bildschirm. Deine Freunde können dasselbe mit deinem Link machen. Nach dem ersten erfolgreichen Laden lässt sich das Spiel meist auch offline starten, solange die iPhone-Daten für die Web-App gespeichert bleiben.

## Ideen zum Anpassen

- **Geschwindigkeit**: Suche in `game.js` nach `const speed = 172`.
- **Schwerkraft**: Suche nach `1320 * dt`.
- **Sprunghöhe**: Suche nach `bird.vy =`.
- **Freunde als Spielfigur**: Lege Fotos in den Ordner `friends` und benenne sie `friend-1.jpg`, `friend-2.jpg`, `friend-3.jpg` usw. In `game.js` steht bei `FRIEND_IMAGE_PATHS`, welche Dateinamen geladen werden. Pro Runde wird zufällig ein Bild ausgewählt.
- **Farben**: Suche in `style.css` oder `game.js` nach den Hex-Farben (`#...`).
- **App-Name**: In `index.html` und `manifest.webmanifest` ändern.

Der Highscore ist **lokal auf jedem einzelnen Gerät** gespeichert. Für eine gemeinsame Online-Bestenliste bräuchtest du zusätzlich einen Online-Dienst/eine Datenbank.

## Änderungen auf iPhones bringen

Dateien auf GitHub ersetzen und committen. Bei größeren Updates in `sw.js` den Cache-Namen z. B. von `sky-hopper-v1` auf `sky-hopper-v2` ändern, damit die Web-App neue Dateien offline speichern kann. Bereits geöffnete Web-Apps ggf. schließen und neu öffnen.
