# DR Maintenance

DR Maintenance ist ein kleines, Docker-basiertes Grundgeruest fuer einen Wartungsplaner. Die erste Version bringt eine Web-App, eine MariaDB-Datenbank, automatische Tabellenanlage und ein modernes Schwarz-Weiss-Dashboard mit.

## Start

```bash
cp .env.example .env
docker compose up --build
```

Danach ist die App unter `http://localhost:3000` erreichbar.

## Container

- `web`: Node.js/Express-App mit statischem Frontend und JSON API
- `db`: MariaDB 11.4 mit persistentem Docker-Volume `db_data`

## API in Version 0.1

- `GET /api/health`
- `GET /api/summary`
- `GET /api/assets`
- `POST /api/assets`
- `GET /api/work-orders`
- `POST /api/work-orders`
- `PATCH /api/work-orders/:id/status`

## Naechste sinnvolle Schritte

- Benutzerlogin und Rollen
- echte Anlagenstammdaten mit Dokumenten und Bildern
- wiederkehrende Wartungsauftraege automatisch aus Plaenen erzeugen
- Ersatzteile, Lieferanten und Kosten
- Kalenderansicht und Benachrichtigungen
