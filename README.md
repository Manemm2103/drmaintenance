# DR Maintenance

DR Maintenance ist ein kleines, Docker-basiertes Grundgerüst für einen Wartungsplaner. Die App bringt eine Web-Oberfläche, eine MariaDB-Datenbank, automatische Tabellenanlage und ein modernes Schwarz-Weiß-Dashboard mit.

## Start

```bash
cp .env.example .env
docker compose up --build
```

Danach ist die App unter `http://localhost:3000` erreichbar.

## Portainer

In Portainer am besten einen Stack aus dem Git-Repository anlegen:

- Repository URL: `https://github.com/Manemm2103/drmaintenance.git`
- Compose path: `docker-compose.portainer.yml`
- Environment:
  - `WEB_PORT=3000`
  - `DB_PORT_EXTERN=3306`
  - `DB_NAME=drmaintenance`
- `DB_USER=drmaintenance`
- `DB_PASSWORD=<sicheres-passwort>`
- `DB_ROOT_PASSWORD=<sicheres-root-passwort>`
- `ADMIN_USERNAME=admin`
- `ADMIN_PASSWORD=<sicheres-admin-passwort>`
- `ADMIN_DISPLAY_NAME=System Administrator`
- `ADMIN_EMAIL=admin@drmaintenance.local`
- `COOKIE_SECURE=false`

Die Web-App ist danach über `http://<server-ip>:3000` erreichbar.
Die Datenbank ist danach über `<server-ip>:3306` erreichbar, wenn `DB_PORT_EXTERN=3306` gesetzt ist. Für einen anderen externen Port kannst du z.B. `DB_PORT_EXTERN=3307` verwenden; intern bleibt MariaDB im Stack immer auf Port `3306`.

Der initiale Adminbenutzer wird beim ersten Start aus den `ADMIN_*` Variablen angelegt. Er ist ein Systembenutzer und kann in der App nicht verändert oder gelöscht werden. Wenn du die `ADMIN_*` Werte später änderst, wird ein bereits vorhandener Systemadmin nicht überschrieben.

Ohne Login wird nur die Anmeldeseite ausgeliefert. Mit dem Haken `Angemeldet bleiben` setzt die App ein HTTP-only Cookie für 60 Tage. Ohne Haken ist es eine normale Browser-Session mit serverseitigem Ablauf.

## Stammdaten-Workflow

Der Stammdatenbereich ist in die Bereiche Einstellungen, Mitarbeiter sowie Benutzer & Rollen gegliedert. Gebäudetypen werden dort nicht mehr gepflegt, weil Geräte bzw. Wartungsobjekte im aktuellen Workflow direkt Kunden zugeordnet werden.

Der Workflow startet bei einem Kunden. Beim Anlegen vergibt DR Maintenance automatisch die nächste Kundennummer im Format `C0000154`, `C0000155` usw.; die Nummer kann in den Stammdaten geändert werden. Vorname und Name werden getrennt gepflegt, ebenso Straße, Hausnummer, PLZ, Ort und Land. Wenn die Rechnungsadresse abweicht, können RE-Empfänger, RE-Straße, RE-Hausnummer, RE-PLZ, RE-Ort und RE-Land separat erfasst werden. Danach werden Geräte bzw. Wartungsobjekte wie Klimaanlage oder Dampfbad direkt einem Kunden zugeordnet. Aus der Kundenübersicht kann direkt ein neues Objekt für den geöffneten Kunden vorbereitet werden; beim Speichern neuer Objekte bleibt der Kunde für die nächste Erfassung ausgewählt. Am Gerät werden Intervall in Tagen und nächste Wartung gepflegt; daraus hält DR Maintenance automatisch den zugehörigen Wartungsplan für Kalender und Aufträge aktuell.

Verknüpfte Felder wie Kunde, Geräteauswahl, Mitarbeiter und Wartungsobjekt sind als durchsuchbare Auswahlfelder umgesetzt. Der Kundenfilter bei Wartungsobjekten ist ebenfalls als Live-Suche umgesetzt. Auch Länderfelder sind als vorbefüllte Dropdowns mit Live-Suche umgesetzt, z.B. kann `Österreich` vorgetippt und direkt ausgewählt werden. Beim Tippen wird die Ergebnisliste live eingeschränkt; gespeichert wird weiterhin die eindeutige interne ID bzw. beim Land der Ländername.

Kunden, Wartungsobjekte und Wartungspläne werden jeweils unter den Formularen gelistet und können gefiltert werden. Ein Klick auf einen Kunden lädt seine Daten in das Formular und zeigt darunter direkt alle verknüpften Wartungsobjekte, anstehenden Wartungen, offenen Aufträge und abgeschlossenen Wartungen. Die Wartungsobjekt-Liste zeigt nur Geräte. Wartungsobjekte können mit einem QR-Code verknüpft werden, haben einen eigenen HTML-Arbeitstext mit Bildern und verwalten eigene Prüfpunkt-Vorlagen wie `Filter wechseln` oder `Klimaanlage auf Funktion testen`. Prüfpunkte können direkt beim Anlegen oder Bearbeiten eines Wartungsobjekts vorbereitet werden. Bilder können im Objekt-Arbeitstext direkt aus der Zwischenablage eingefügt werden. Diese Prüfpunkte werden in offene Aufträge übernommen und dort abgehakt. Wartungspläne werden ausschließlich auf ein Wartungsobjekt gelegt; Gebäude und Wohnungen/Appartments können dort nicht direkt ausgewählt werden. Wartungspläne können bearbeitet werden, stehen untereinander unter dem Formular und lassen sich nach Suche, Mitarbeiter und Fälligkeit filtern. Der Kalender zeigt aus einem Wartungsplan nicht nur die nächste Fälligkeit, sondern auch die folgenden rechnerischen Termine im sichtbaren Zeitraum anhand des hinterlegten Intervalls. Wenn Termine auf gesperrte Wochentage, bereits belegte Tage oder direkt benachbarte Wartungstage fallen, werden sie auf den nächsten erlaubten freien Tag verschoben.

In den Stammdaten kann ein ausgehender CalDAV-Sync aktiviert werden. Hinterlegt werden Kalender-URL, Benutzername, Passwort und ein Sync-Intervall in Minuten. DR Maintenance schreibt die sichtbaren Wartungstermine der nächsten 365 Tage als CalDAV/iCalendar-Einträge in den externen Kalender; externe Kalenderänderungen werden noch nicht zurück importiert.

Aufträge sind die Arbeitsliste für fällige Wartungen. Aus aktiven Wartungsplänen wird automatisch je ein offener Wartungsauftrag erzeugt; beim Erledigen rückt der Wartungsplan anhand seines Intervalls auf den nächsten Termin weiter. Standardmäßig werden offene Aufträge angezeigt; über den Filter können überfällige, erledigte oder alle Aufträge geladen werden. Ein Klick auf einen Auftrag öffnet die Bearbeitung, damit Status, Fälligkeit, Beschreibung und die enthaltenen Prüfpunkte abgearbeitet werden können. Die alte Schnell-Erfassung im Dashboard wurde entfernt.

Mitarbeiternummern werden automatisch fortlaufend im Format `M0001`, `M0002` usw. vergeben und können bei Bedarf geändert werden. Mitarbeiterfunktionen werden in den Stammdaten gepflegt und anschließend Mitarbeitern zugewiesen. Benutzer und Benutzerrollen werden ebenfalls in den Stammdaten gepflegt; die Systemrollen `admin` und `customer`/`Kunde` werden initial angelegt und können nicht gelöscht werden.

## Container

- `web`: Node.js/Express-App mit statischem Frontend und JSON API
- `db`: MariaDB 11.4 mit persistentem Docker-Volume `db_data` und optional veröffentlichtem externem Port über `DB_PORT_EXTERN`

## API in Version 0.1

- `GET /api/health`
- `GET /api/version`
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/auth/me`
- `GET /api/settings`
- `PATCH /api/settings`
- `GET /api/summary`
- `GET /api/calendar`
- `GET /api/customers`
- `POST /api/customers`
- `PATCH /api/customers/:id`
- `DELETE /api/customers/:id`
- `GET /api/employees`
- `POST /api/employees`
- `PATCH /api/employees/:id`
- `DELETE /api/employees/:id`
- `GET /api/employee-functions`
- `POST /api/employee-functions`
- `PATCH /api/employee-functions/:id`
- `DELETE /api/employee-functions/:id`
- `GET /api/building-types`
- `POST /api/building-types`
- `PATCH /api/building-types/:typeKey`
- `DELETE /api/building-types/:typeKey`
- `GET /api/properties`
- `POST /api/buildings`
- `PATCH /api/buildings/:id`
- `DELETE /api/buildings/:id`
- `POST /api/apartments`
- `PATCH /api/apartments/:id`
- `DELETE /api/apartments/:id`
- `GET /api/maintenance-targets`
- `POST /api/maintenance-plans`
- `PATCH /api/maintenance-plans/:id`
- `DELETE /api/maintenance-plans/:id`
- `GET /api/assets`
- `GET /api/assets/by-qr/:qrCode`
- `GET /api/assets/:id/details`
- `POST /api/assets`
- `PATCH /api/assets/:id`
- `DELETE /api/assets/:id`
- `POST /api/assets/:id/checks`
- `DELETE /api/asset-checks/:id`
- `GET /api/users`
- `POST /api/users`
- `PATCH /api/users/:id`
- `DELETE /api/users/:id`
- `GET /api/user-roles`
- `POST /api/user-roles`
- `PATCH /api/user-roles/:roleKey`
- `DELETE /api/user-roles/:roleKey`
- `GET /api/work-orders`
- `GET /api/work-orders/:id`
- `POST /api/work-orders`
- `PATCH /api/work-orders/:id`
- `PATCH /api/work-orders/:id/checks/:checkId`
- `PATCH /api/work-orders/:id/status`

## Versionierung

Die App-Version steht im Format `yyyy.mm.dd.xx`, zum Beispiel `2026.08.11.02`. Der letzte Block ist der Tageszähler und wird bei jeder Änderung am selben Tag um 1 erhöht. Bei einem neuen Datum startet der Zähler wieder bei `01`.

## Nächste sinnvolle Schritte

- Berechtigungen je Benutzerrolle
- Detailseiten für Gebäude, Appartments und Wartungsobjekte
- Ersatzteile, Lieferanten und Kosten
- Benachrichtigungen
