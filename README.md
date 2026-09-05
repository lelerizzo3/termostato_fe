# Termostato frontend

Web-app mobile-first per gestione e monitoraggio del termostato intelligente.
Il progetto produce un bundle statico React/TypeScript servibile da Apache2 sotto
`/termostato/`.

## Prerequisiti

- Node.js LTS e npm
- Backend Termostato raggiungibile tramite Apache reverse proxy
- Browser moderno; target principale Safari su iPhone

## Comandi

```bash
npm install
npm run generate:api
npm run dev
```

Il server Vite usa la base `/termostato/`; in sviluppo aprire:
`http://localhost:5173/termostato/`.

Verifica qualità e produzione:

```bash
npm run lint
npm test
npm run build
npm run preview
```

`npm run build` crea `dist/`, con gli asset statici, il manifest PWA e il service
worker. Node.js non è richiesto sul server di produzione.

## API-key

Al primo accesso viene richiesto `X-API-Key`. La chiave viene verificata tramite
`GET /actuator/health` e salvata nel `localStorage` del browser. Non viene
inclusa nel bundle e non viene scritta nei log. Una risposta `401` cancella la
chiave e riporta al gate di autenticazione.

Il client usa di default `/termostato/api` come base URL. È possibile
sovrascriverlo in sviluppo con `VITE_API_BASE_URL`.

## Schermate

- `/stato`: dashboard read-only con `GET /stato`, temperatura e umidità interne,
  target, relay, temperatura e umidità esterne e refresh automatico ogni 60 secondi.
- `/config`: configurazione completa (`GET`/`PUT /config`), inclusi il flag
  `notifiche_errori_abilitate` e i parametri del meteo esterno, raggiungibile da
  Impostazioni.
- `/calendario`: editor accordion dei sette giorni con conversione ora locale ↔ UTC.
- `/log`: grafico Recharts e tabella dettaglio virtualizzata.
- `/errori`: log errori filtrabili per intervallo UTC.
- `/settings`: gestione API-key e collegamento alla configurazione.

## Deploy Apache sotto `/termostato`

Eseguire la build e copiare `dist/` sul server, ad esempio in
`/var/www/termostato-fe`. Nel VirtualHost HTTPS già esistente aggiungere i moduli
`proxy`, `proxy_http`, `headers`, `rewrite` e una configurazione equivalente:

```apache
Alias /termostato /var/www/termostato-fe

<Directory /var/www/termostato-fe>
    Options -Indexes
    AllowOverride None
    Require all granted
    RewriteEngine On
    RewriteBase /termostato/
    RewriteCond %{REQUEST_FILENAME} !-f
    RewriteCond %{REQUEST_FILENAME} !-d
    RewriteRule . /termostato/index.html [L]
</Directory>

<Location /termostato/api/>
    ProxyPass        http://127.0.0.1:8080/
    ProxyPassReverse http://127.0.0.1:8080/
</Location>
```

Il proxy non inietta la API-key: inoltra quella fornita dal browser nell'header
`X-API-Key`. Verificare dopo il deploy con una richiesta autenticata a
`https://sliverd.ddns.net/termostato/api/actuator/health`.

## Struttura documentale

- `docs/specifiche-funzionali.md`: requisiti funzionali backend.
- `docs/openapi.yaml`: contratto REST.
- `docs/specifiche-tecniche-frontend.md`: decisioni e specifiche UI/deploy.
- `docs/mockups/`: anteprime PNG e sorgente HTML.
