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

L'app è divisa in due aree, selezionabili con i tabs nell'header (**Termostato** /
**Dispositivi**); la bottom navigation cambia in base all'area.

**Area Termostato**

- `/stato`: dashboard read-only con `GET /stato`, temperatura e umidità interne,
  target, relay, temperatura e umidità esterne e refresh automatico ogni 60 secondi.
- `/config`: configurazione completa (`GET`/`PUT /config`), inclusi il flag
  `notifiche_errori_abilitate`, `fuso_orario`, `ora_legale`, i parametri del
  meteo esterno e la sezione "Alert di consumo" (`alert_soglia` in watt e
  `alert_polling` in secondi, entrambi `0` = disabilitato; l'alert scatta solo se
  i due valori sono entrambi maggiori di zero), raggiungibile da Impostazioni.
- `/calendario`: editor accordion dei sette giorni con orari nel fuso configurato dal backend, senza conversione UTC.
- `/log`: grafico Recharts e tabella dettaglio virtualizzata, con filtri nel fuso configurato.
- `/errori`: log errori filtrabili per intervallo di date nel fuso configurato.
- `/settings`: gestione API-key e collegamento alla configurazione.

**Area Dispositivi** (gli endpoint `/shelly/*` sono reali anche in profilo mock)

Le misure sono lette in tempo reale dai dispositivi: il backend non registra
uno storico, quindi non esistono pagine di consultazione dei consumi.

- `/shelly`: elenco dispositivi configurati (`GET /shelly/dispositivi`) con lo
  stato letto da `GET /shelly/stato/{id}`: relè comandabili (`RELAY` e
  `PM_RELAY`, con `POST /shelly/relay/{id}/on|off` e conferma esplicita
  `esito`/`stato_precedente` del comando) e misure di potenza, tensione e
  corrente per i power monitor (`PM` e `PM_RELAY`). I valori non disponibili
  sono mostrati come `—`.
- `/shelly/monitor`: totale e monitor del consumo istantaneo dei power meter con
  UI domotica: riquadro del totale con anello e barra sulla scala fissa
  0–3000 W, il controllo dell'intervallo di aggiornamento in secondi e una riga a
  barra colorata per dispositivo (verde < 100 W → arancione → rosso ≥ 3000 W)
  con watt, tensione, corrente e quota sul totale.

## Layout orizzontale (tablet 7")

Il layout verticale resta quello di riferimento per gli smartphone. Quando il
dispositivo è in orizzontale con almeno 900 px di larghezza e 500 px di altezza
(es. Nexus 7, 1280×800) l'app passa a un layout a due colonne sfruttando tutta
la larghezza:

- la bottom navigation fissa diventa un **rail laterale a sinistra** di 80 px,
  così l'altezza verticale resta libera per i dati;
- il contenuto si estende fino a 1440 px invece dei 768 px della colonna
  verticale;
- la pagina Monitor usa due colonne: a sinistra il riquadro del totale con anello,
  barra, legenda, nota di lettura e intervallo di aggiornamento, a destra
  l'elenco dei dispositivi con una **barra orizzontale colorata** per riga
  (nome e watt sopra, tensione·corrente e quota sotto). Le due colonne restano
  bilanciate e l'insieme entra nei 600 px di altezza del Nexus 7 senza
  scorrimento.

La versione orizzontale dell'iPhone non rientra nei vincoli di altezza minima e
continua a usare il layout verticale.

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

- `docs/specifiche-funzionali.md`: requisiti funzionali backend (incl. dispositivi Shelly, sez. 7.5).
- `docs/openapi.yaml`: contratto REST (v1.6.0 con endpoint `/shelly/*`,
  stato unificato `/shelly/stato/{id}`, conferma esito relay
  `esito`/`stato_precedente` e i campi `alert_soglia`/`alert_polling`).
- `docs/alert-consumo-frontend.md`: handoff backend→frontend dell'alert di consumo
  (`alert_soglia`, `alert_polling`): regola di attivazione congiunta, reinvio
  obbligatorio dei due campi nella `PUT /config` e troncamento del polling.
- `docs/modifiche-device-shelly-20260926.md`: handoff delle modifiche backend
  che hanno rimosso lo storico consumi Shelly e introdotto
  `GET /shelly/stato/{id}`.
- `docs/evolutiva-shelly-frontend.md`: handoff dell'evolutiva Shelly per il frontend (superato).
- `docs/fe-controllo-relay-shelly.md`: contratto e comportamento frontend per il
  controllo relay (campi `esito`/`stato_precedente`, auto-off, gestione errori).
- `docs/specifiche-tecniche-frontend.md`: decisioni e specifiche UI/deploy.
- `docs/mockups/`: anteprime PNG e sorgente HTML.
