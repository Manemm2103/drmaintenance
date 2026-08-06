# DR Maintenance

DR Maintenance ist ein kleines, Docker-basiertes Grundgeruest fuer einen Wartungsplaner. Die App bringt eine Web-Oberflaeche, eine MariaDB-Datenbank, automatische Tabellenanlage und ein modernes Schwarz-Weiss-Dashboard mit.

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

Die Web-App ist danach ueber `http://<server-ip>:3000` erreichbar.

Der initiale Adminbenutzer wird beim ersten Start aus den `ADMIN_*` Variablen angelegt. Er ist ein Systembenutzer und kann in der App nicht veraendert oder geloescht werden. Wenn du die `ADMIN_*` Werte spaeter aenderst, wird ein bereits vorhandener Systemadmin nicht ueberschrieben.

## Container

- `web`: Node.js/Express-App mit statischem Frontend und JSON API
- `db`: MariaDB 11.4 mit persistentem Docker-Volume `db_data`

## API in Version 0.1

- `GET /api/health`
- `GET /api/summary`
- `GET /api/calendar`
- `GET /api/properties`
- `POST /api/buildings`
- `POST /api/apartments`
- `GET /api/maintenance-targets`
- `POST /api/maintenance-plans`
- `GET /api/assets`
- `POST /api/assets`
- `GET /api/users`
- `POST /api/users`
- `PATCH /api/users/:id`
- `DELETE /api/users/:id`
- `GET /api/work-orders`
- `POST /api/work-orders`
- `PATCH /api/work-orders/:id/status`

## Naechste sinnvolle Schritte

- Benutzerlogin und Rollen
- Detailseiten fuer Gebaeude, Appartments und Anlagen
- wiederkehrende Wartungsauftraege automatisch aus Plaenen erzeugen
- Ersatzteile, Lieferanten und Kosten
- Kalenderansicht und Benachrichtigungen
