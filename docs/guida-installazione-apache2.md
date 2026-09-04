# Guida installazione frontend Termostato su Apache2

Questa guida descrive il deploy della web-app frontend Termostato sul dominio già
esistente:

```text
https://sliverd.ddns.net/termostato/
```

Il frontend è una SPA React compilata come bundle statico. Sul server Apache2 non
è necessario installare Node.js: Node.js e npm servono solo sulla macchina di
sviluppo o nella pipeline di build.

## 1. Prerequisiti

Sul server Linux devono essere già disponibili:

- Apache2 con VirtualHost HTTPS funzionante per `sliverd.ddns.net`;
- backend Termostato in esecuzione su `127.0.0.1:8080`;
- almeno una API-key configurata nel backend (`api_keys` non vuoto);
- accesso SSH con privilegi `sudo`;
- moduli Apache `proxy`, `proxy_http`, `headers` e `rewrite`.

Il backend deve rispondere direttamente, dal server, a una richiesta simile:

```bash
curl -i \\
  -H "X-API-Key: LA_TUA_API_KEY" \\
  http://127.0.0.1:8080/actuator/health
```

La risposta attesa è HTTP `200` con stato applicativo `UP`.

## 2. Creazione della build frontend

Eseguire i comandi nella directory del progetto frontend:

```bash
npm ci
npm run generate:api
npm run build
```

La build viene creata nella directory `dist/` e contiene:

```text
dist/
├── index.html
├── assets/
├── manifest.webmanifest
├── sw.js
├── pwa-192.png
└── pwa-512.png
```

Il progetto è già configurato con la base Vite:

```text
/termostato/
```

Non modificare `base: '/termostato/'` in `vite.config.ts` quando la destinazione
è il dominio `sliverd.ddns.net`.

È possibile eseguire i controlli prima del trasferimento:

```bash
npm run lint
npm test
npm run build
```

## 3. Trasferimento dei file sul server

### 3.1 Trasferimento con WinSCP

Copiare **il contenuto** di `dist/` in una directory temporanea del server, per
esempio:

```text
/tmp/termostato-dist/
```

Non copiare `node_modules/` e non copiare il progetto sorgente: in produzione
serve solo il contenuto di `dist/`.

### 3.2 Trasferimento con rsync

Da Linux o WSL:

```bash
rsync -av --delete dist/ \\
  utente@sliverd.ddns.net:/tmp/termostato-dist/
```

Sostituire `utente` con l'utente SSH del server.

## 4. Installazione dei file statici

Sul server:

```bash
sudo mkdir -p /var/www/termostato-fe
sudo rsync -av --delete \\
  /tmp/termostato-dist/ \\
  /var/www/termostato-fe/
```

`--delete` rimuove dalla destinazione eventuali asset obsoleti. Usarlo solo
sulla directory `/var/www/termostato-fe` e, se necessario, creare prima un backup:

```bash
sudo cp -a /var/www/termostato-fe \\
  "/var/www/termostato-fe.backup-$(date +%Y%m%d-%H%M%S)"
```

Impostare permessi leggibili da Apache:

```bash
sudo chown -R root:root /var/www/termostato-fe
sudo find /var/www/termostato-fe -type d -exec chmod 755 {} \\\;
sudo find /var/www/termostato-fe -type f -exec chmod 644 {} \\\;
```

## 5. Abilitazione moduli Apache

Su Debian/Ubuntu:

```bash
sudo a2enmod proxy proxy_http headers rewrite
```

Il modulo SSL è già necessario per il VirtualHost HTTPS esistente. Se non fosse
attivo:

```bash
sudo a2enmod ssl
```

## 6. Configurazione del VirtualHost HTTPS

Individuare il file che gestisce `sliverd.ddns.net`:

```bash
sudo apache2ctl -S
sudo grep -R "ServerName sliverd.ddns.net" \\
  /etc/apache2/sites-available \\
  /etc/apache2/sites-enabled
```

Aprire il VirtualHost HTTPS già esistente, normalmente un file sotto
`/etc/apache2/sites-available/`, e aggiungere i blocchi seguenti **dentro**
`<VirtualHost *:443>`.

Non modificare il `DocumentRoot` della home già pubblicata.

```apache
# ============================================================
# Frontend Termostato sotto /termostato
# ============================================================

# Deve precedere l'Alias statico.
# /termostato/api/stato viene inoltrato al backend come /stato.
ProxyPass        /termostato/api/ http://127.0.0.1:8080/
ProxyPassReverse /termostato/api/ http://127.0.0.1:8080/

# Directory dei file statici compilati
Alias /termostato/ /var/www/termostato-fe/

<Directory /var/www/termostato-fe/>
    Options -Indexes
    AllowOverride None
    Require all granted
    DirectoryIndex index.html

    # Fallback SPA per le route React:
    # /termostato/stato
    # /termostato/calendario
    # /termostato/log
    # /termostato/errori
    # /termostato/settings
    RewriteEngine On
    RewriteBase /termostato/

    # Le chiamate API sono gestite dal ProxyPass.
    RewriteCond %{REQUEST_URI} !^/termostato/api/

    # I file e le directory reali vengono serviti normalmente.
    RewriteCond %{REQUEST_FILENAME} !-f
    RewriteCond %{REQUEST_FILENAME} !-d

    RewriteRule . /termostato/index.html [L]
</Directory>

# Normalizza l'URL senza slash finale.
RedirectMatch 301 ^/termostato$ /termostato/

# Header di sicurezza limitati alla web-app.
<Location /termostato>
    Header always set X-Content-Type-Options "nosniff"
    Header always set Referrer-Policy "no-referrer"
</Location>

# index, manifest e service worker non devono restare cachati a lungo.
<LocationMatch "^/termostato/(index\\.html|sw\\.js|manifest\\.webmanifest)$">
    Header always set Cache-Control "no-cache"
</LocationMatch>
```

### API-key e reverse proxy

Non aggiungere questa direttiva:

```apache
RequestHeader set X-API-Key "..."
```

La soluzione adottata dal frontend è:

1. l'utente inserisce la API-key nel browser;
2. il frontend la salva nel `localStorage`;
3. il frontend invia `X-API-Key` a ogni richiesta;
4. Apache inoltra l'header al backend senza modificarlo.

Il browser e il backend condividono lo stesso origin pubblico, quindi non è
necessaria una configurazione CORS aggiuntiva:

```text
Frontend: https://sliverd.ddns.net/termostato/
API:      https://sliverd.ddns.net/termostato/api/
```

## 7. Verifica e reload di Apache

Controllare la sintassi:

```bash
sudo apache2ctl configtest
```

La risposta attesa è:

```text
Syntax OK
```

Ricaricare Apache senza interrompere le connessioni attive:

```bash
sudo systemctl reload apache2
```

## 8. Verifiche post-deploy

### 8.1 Frontend statico

```bash
curl -I https://sliverd.ddns.net/termostato/
```

Atteso: HTTP `200`.

Verificare anche una route React:

```bash
curl -I https://sliverd.ddns.net/termostato/stato
```

Anche questa richiesta deve restituire HTTP `200`, servendo `index.html` tramite
il fallback SPA.

### 8.2 API senza chiave

```bash
curl -i \\
  https://sliverd.ddns.net/termostato/api/actuator/health
```

Atteso: HTTP `401 Unauthorized`.

### 8.3 API con chiave valida

```bash
curl -i \\
  -H "X-API-Key: LA_TUA_API_KEY" \\
  https://sliverd.ddns.net/termostato/api/actuator/health
```

Atteso: HTTP `200` e risposta simile a:

```json
{
  "status": "UP"
}
```

### 8.4 Stato corrente

```bash
curl -i \\
  -H "X-API-Key: LA_TUA_API_KEY" \\
  https://sliverd.ddns.net/termostato/api/stato
```

Esempio di risposta:

```json
{
  "temperatura": 19.0,
  "temperatura_target": 20.5,
  "relay_acceso": false
}
```

### 8.5 Test dal browser

Aprire Safari su iPhone e visitare:

```text
https://sliverd.ddns.net/termostato/
```

1. Inserire la API-key autorizzata.
2. Verificare la dashboard **Stato**.
3. Aprire Calendario, Log, Errori e Impostazioni.
4. Da Safari usare **Condividi → Aggiungi alla schermata Home** per installare
   la PWA.

## 9. Problemi comuni

### `/termostato/` restituisce 404

Controllare:

- che `Alias /termostato/` punti a `/var/www/termostato-fe/`;
- che `index.html` esista nella directory;
- che il blocco `<Directory>` conceda `Require all granted`;
- che Apache sia stato ricaricato dopo la modifica.

### `/termostato/stato` restituisce 404 dopo un refresh

Manca o non viene applicato il fallback SPA. Verificare `RewriteEngine` e le
regole `RewriteCond`/`RewriteRule` del blocco `<Directory>`.

### `/termostato/api/stato` restituisce HTML

La richiesta viene intercettata dall'Alias/fallback invece che dal proxy.
Verificare che questi blocchi siano presenti nel VirtualHost:

```apache
ProxyPass        /termostato/api/ http://127.0.0.1:8080/
ProxyPassReverse /termostato/api/ http://127.0.0.1:8080/
```

Verificare inoltre che il backend sia in ascolto su `127.0.0.1:8080`.

### La API restituisce sempre 401

Verificare che:

- la chiave sia presente in `api_keys` del backend;
- il backend sia stato riavviato dopo la configurazione iniziale della chiave,
  se richiesto dalla sua configurazione;
- il browser stia inviando `X-API-Key`;
- Apache non stia rimuovendo l'header.

### La PWA mostra una versione vecchia

Il service worker usa aggiornamento automatico. Dopo un deploy:

1. chiudere e riaprire la PWA;
2. ricaricare Safari;
3. se necessario, rimuovere la PWA dalla schermata Home e reinstallarla.

`index.html` e `sw.js` sono configurati con `Cache-Control: no-cache` nella
configurazione Apache sopra riportata.

## 10. Riferimenti del progetto

- `README.md`: comandi e configurazione rapida;
- `docs/specifiche-funzionali.md`: requisiti del backend;
- `docs/openapi.yaml`: contratto REST;
- `docs/specifiche-tecniche-frontend.md`: architettura, UI e decisioni di deploy;
- `vite.config.ts`: base path `/termostato/`, manifest e service worker.
