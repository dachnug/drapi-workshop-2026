# HCL Domino REST API (DRAPI) Workshop für [DACHNUG 2026](https://dnug.de/en/dachnug/)

Dieses Reposityory enthält die Presentation und den Beispiel Code des [DRAPI workshops](https://dachnug.sched.com/event/2DTQw/domino-rest-api).

- Die Ordner `phase1` - `phase7` enhalten die selbe Single Page App (SPA) in verschiedenen Phasen der Entwicklung. Historisch interessant. Wer nur das Ergebnis sehen will braucht nur `phase7`
-  `bruno` enthält die Request Sammlung für HTTP calls mit [bruno](https://www.usebruno.com/) (Einer offline alternative zu Postman)
-  `docs` beinhalted die Presentation die mit [RevealJS](https://revealjs.com/) erstellt wurde. Reines HTML/JS/CSS/MD. ANsehbar [hier](https://dachnug.github.io/drapi-workshop-2026/)
-  `nsf` hat die Demo datenbank

## Wie nutzen?

Eine lokale installation von NodeJS ist notwendig und die demo.nsf auf einem DRAPI enabled Domino server

- Repository clonen
- phase wählen
- npm ausführen

```bash
git clone git@github.com:dachnug/drapi-workshop-2026.git
cd drapi-workshop-2026
cd phase7
npm install
npm run dev
```

## Bruno

- In Bruno `Open collection` auswählen und auf `bruno` zeigen
- Wir nutzen variablen die im Environment (oben rechts) anzupassen sind

## Fragen

- hier als [issue](https://github.com/dachnug/drapi-workshop-2026/issues) anlegen
- Auf dem [HCL Forum](https://developer.ds.hcl-software.com/) anfragen
- In [Discord stellen](https://openntf.org/discord)
