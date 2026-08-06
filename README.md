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

Der initiale Adminbenutzer wird beim ersten Start aus den `ADMIN_*` Variablen angelegt. Er ist ein Systembenutzer und kann in der App nicht verändert oder gelöscht werden. Wenn du die `ADMIN_*` Werte später änderst, wird ein bereits vorhandener Systemadmin nicht überschrieben.

Ohne Login wird nur die Anmeldeseite ausgeliefert. Mit dem Haken `Angemeldet bleiben` setzt die App ein HTTP-only Cookie für 60 Tage. Ohne Haken ist es eine normale Browser-Session mit serverseitigem Ablauf.

## Container

- `web`: Node.js/Express-App mit statischem Frontend und JSON API
- `db`: MariaDB 11.4 mit persistentem Docker-Volume `db_data`

## API in Version 0.1

- `GET /api/health`
- `GET /api/version`
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/auth/me`
- `GET /api/summary`
- `GET /api/calendar`
- `GET /api/properties`
- `POST /api/buildings`
- `DELETE /api/buildings/:id`
- `POST /api/apartments`
- `DELETE /api/apartments/:id`
- `GET /api/maintenance-targets`
- `POST /api/maintenance-plans`
- `DELETE /api/maintenance-plans/:id`
- `GET /api/assets`
- `POST /api/assets`
- `PATCH /api/assets/:id`
- `DELETE /api/assets/:id`
- `GET /api/users`
- `POST /api/users`
- `PATCH /api/users/:id`
- `DELETE /api/users/:id`
- `GET /api/work-orders`
- `POST /api/work-orders`
- `PATCH /api/work-orders/:id/status`

## Versionierung

Die App-Version steht im Format `yyyy.mm.dd.xx`, zum Beispiel `2026.08.06.13`. Der letzte Block ist der Tageszähler und wird bei jeder Änderung am selben Tag um 1 erhöht. Bei einem neuen Datum startet der Zähler wieder bei `01`.

## Nächste sinnvolle Schritte

- Benutzerlogin und Rollen
- Detailseiten für Gebäude, Appartments und Wartungsobjekte
- wiederkehrende Wartungsaufträge automatisch aus Plänen erzeugen
- Ersatzteile, Lieferanten und Kosten
- Benachrichtigungen
