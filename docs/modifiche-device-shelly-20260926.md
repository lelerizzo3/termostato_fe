# Modifiche dispositivi Shelly — 2026-09-26

Documento di handoff (backend → frontend) dell'evolutiva del 2026-09-26. Descrive le modifiche effettuate, il nuovo contratto REST e le azioni richieste al frontend.

---

## 1. Sommario

L'evolutiva ha due obiettivi distinti:

1. **Rimozione del logging dei dispositivi Shelly.** Il backend non registra più né espone uno storico delle misure degli Shelly. Non esistono più tabella SQLite, scheduler di polling, retention, endpoint con filtri temporali né parametri di configurazione dedicati.
2. **Supporto agli Shelly 1PM (relè + power meter).** Aggiunto il tipo `PM_RELAY` e un endpoint unico di stato che legge dal dispositivo, in tempo reale, sia il relè sia le misure elettriche.

Supportate entrambe le generazioni hardware: **Gen 1 e Gen 3**.

---

## 2. Cosa è stato rimosso

### 2.1 Persistenza

| Rimosso | Note |
|---|---|
| `shelly_consumo_log` (tabella) | Nessuna migrazione `DROP TABLE`: il sistema supporta il solo scenario di installazione pulita, il database viene creato da zero. |
| `V3__create_shelly_consumo_log.sql` | La migrazione non esiste più. |
| `ShellyConsumoLogRecord`, `ShellyConsumoLogRepository` | Package `com.termostato.shelly.pm` rimosso. |
| `ShellyPmPollingScheduler` | Nessun campionamento in background dei dispositivi. |
| `LocalDateTimeCodec` | Era usato solo per il `data_ora` locale dei consumi. |

### 2.2 API

| Rimosso | Sostituito da |
|---|---|
| `GET /shelly/consumi/{id}?da=&a=` | `GET /shelly/stato/{id}` (vedi §3.1) |

### 2.3 Configurazione

| Rimosso | Dove |
|---|---|
| `intervallo_polling_consumi_secondi` | `SystemConfiguration`, `BootstrapProperties`, `ConfigurationService`, `application.yml` |
| `logging_pm_abilitato` | idem |
| `retention_consumi_giorni` | `BootstrapProperties`, `application.yml` |
| Categoria errore `SHELLY_PM` | `ErrorCategory` |

`LogRetentionScheduler` ora opera solo su `polling_log` ed `error_log`.

**Attenzione frontend:** `GET /config` e `PUT /config` non contengono più questi tre campi. Un frontend che li inviasse in un `PUT /config` deve rimuoverli dalla form, altrimenti la validazione li rifiuta.

---

## 3. Nuovo contratto REST

Tutti gli endpoint richiedono l'header `X-API-Key`. Naming convention: `SNAKE_CASE` (configurazione globale Jackson).

### 3.1 `GET /shelly/stato/{id}` — nuovo

Stato completo in tempo reale del dispositivo: il relè se presente, le misure elettriche se presente, entrambe per gli Shelly 1PM. Nessuna persistenza: ogni chiamata interroga il dispositivo.

**Response 200 (Shelly 1PM, `PM_RELAY`):**
```json
{
  "id": "shelly1pm",
  "nome": "Shelly 1PM",
  "ip": "192.168.1.20",
  "modello": "SHSW-PM",
  "generazione": 1,
  "tipo": "PM_RELAY",
  "acceso": true,
  "potenza_w": 45.2,
  "tensione_v": 229.8,
  "corrente_a": 0.197
}
```

**Response 200 (power monitor senza relè, `PM`):** `acceso` è `null`.
**Response 200 (relè senza misure, `RELAY`):** `potenza_w`, `tensione_v`, `corrente_a` sono `null`.

I campi sono **sempre presenti** nella risposta; quelli non applicabili al tipo del dispositivo valgono `null`:

| Campo | Tipo | `RELAY` | `PM` | `PM_RELAY` |
|-------|------|---------|------|------------|
| `acceso` | boolean | valore | `null` | valore |
| `potenza_w` | number | `null` | valore | valore |
| `tensione_v` | number | `null` | valore | valore |
| `corrente_a` | number | `null` | valore | valore |

**Errori:** `404` se l'id non esiste; `500` se il dispositivo è irraggiungibile o la risposta non è interpretabile.

### 3.2 `POST /shelly/relay/{id}/on` e `/off`

Inviano il comando al relè, poi rileggono lo stato e restituiscono la conferma dell'esito. Accettano sia `RELAY` sia `PM_RELAY`; rispondono `400` per i tipi `PM` (nessun relè).

La risposta mantiene i campi `esito` e `stato_precedente` (quest'ultimo valorizzato solo per i dispositivi Gen 3, per i quali è disponibile `was_on` nella risposta RPC).

---

## 4. Modello dei dispositivi

Ogni dispositivo in `data/shelly.json` è descritto da `id`, `nome`, `ip`, `modello`, `generazione` (1 o 3) e `tipo`. Il file è di sola lettura a runtime: per aggiungere o modificare un dispositivo si edita il file e si riavvia il backend.

### 4.1 Tipi

| `tipo` | Relè comandabile | Misure elettriche | Generazioni supportate | Note |
|--------|------------------|-------------------|-----------------------|------|
| `RELAY` | sì | no | 1, 3 | solo relè |
| `PM` | no | sì | 3 | solo power monitor |
| `PM_RELAY` | sì | sì | 1, 3 | **Shelly 1PM**: relè *e* power meter |

`PM_RELAY` è il nuovo tipo introdotto per supportare gli Shelly 1PM.

### 4.2 Dispositivi di default

Aggiunto `shelly1pm` (Gen 1, `PM_RELAY`) all'elenco di default, che conta ora 10 dispositivi.

---

## 5. Azioni richieste al frontend

1. **Rimuovere** ogni riferimento a `GET /shelly/consumi/{id}` e alle query temporali sugli Shelly: l'endpoint non esiste più e restituisce `404`.
2. **Rimuovere** dalla form di configurazione i campi relativi al logging dei consumi Shelly (`intervallo_polling_consumi_secondi`, `logging_pm_abilitato`, `retention_consumi_giorni`): non sono più accettati da `PUT /config`.
3. **Rimuovere** eventuali viste di storico/consumo dei dispositivi Shelly. Se serve mostrare le misure, usare `GET /shelly/stato/{id}` e fare polling lato frontend.
4. **Aggiungere** la gestione del tipo `PM_RELAY` nella logica di rendering: il dispositivo ha sia il controllo del relè sia i valori di misura.
5. **Gestire i `null`** in `GET /shelly/stato/{id}`: i campi non applicabili al tipo sono `null`, non assenti e non `0`. Non mostrare zeri per `potenza_w`/`tensione_v`/`corrente_a` su un dispositivo senza power meter.
6. **Usare `GET /shelly/stato/{id}`** come vista unica per uno stato completo, invece di chiamare `/shelly/relay/{id}` e, se disponibile, un endpoint di misure.
7. **Gestire `400`** sulla chiamata a `/shelly/relay/{id}` (e sui comandi `on`/`off`) per un dispositivo di tipo `PM`: disabilitare i controlli del relè in UI.

---

## 6. File principali coinvolti

### Aggiunti
- `src/main/java/com/termostato/shelly/state/ShellyStatoService.java`
- `src/main/java/com/termostato/shelly/web/ShellyStatoResponse.java`
- `src/main/java/com/termostato/shelly/external/ShellyGen1PmClient.java`
- `src/main/java/com/termostato/shelly/external/ShellyGen1PmHttpApi.java`
- `src/main/java/com/termostato/shelly/external/ShellyGen1PmResponse.java`
- `src/test/java/com/termostato/shelly/state/ShellyStatoServiceTest.java`
- `src/test/java/com/termostato/shelly/external/ShellyGen1PmClientTest.java`
- `scripts/curl-stato-device-shelly.sh`

### Modificati
- `src/main/java/com/termostato/shelly/config/ShellyTipo.java` — aggiunto `PM_RELAY` e i metodi `hasRelay()` / `hasPowerMeter()`
- `src/main/java/com/termostato/shelly/config/ShellyDeviceLoader.java` — aggiunto il default `shelly1pm`
- `src/main/java/com/termostato/shelly/external/ShellyClientFactory.java` — selezione del client per generazione e capacità
- `src/main/java/com/termostato/shelly/relay/ShellyRelayService.java` — accetta qualsiasi device con relè
- `src/main/java/com/termostato/shelly/web/ShellyController.java` — nuovo endpoint `GET /shelly/stato/{id}`
- `src/main/java/com/termostato/scheduling/LogRetentionScheduler.java` — rimosso il ramo consumi Shelly
- `src/main/java/com/termostato/config/BootstrapProperties.java`, `ConfigurationService.java`, `domain/model/SystemConfiguration.java`, `resources/application.yml` — rimossa la configurazione di logging
- `src/main/java/com/termostato/domain/control/ErrorCategory.java` — rimossa la categoria `SHELLY_PM`
- `docs/openapi.yaml` — specifica aggiornata
- `README.md`, `docs/specifiche-funzionali.md`, `docs/specifiche-tecniche.md`, `docs/evolutiva-shelly-frontend.md` — documentazione allineata

### Rimossi
- `src/main/java/com/termostato/shelly/pm/` (intero package)
- `src/main/java/com/termostato/shelly/web/ShellyConsumiController.java`, `ShellyConsumiResponse.java`
- `src/main/resources/db/migration/V3__create_shelly_consumo_log.sql`
- relativi test (`ShellyConsumoLogRepositoryTest`, `ShellyPmPollingSchedulerTest`, `ShellyConsumiControllerTest`)

---

## 7. Esempi di chiamata

Lo script `scripts/curl-stato-device-shelly.sh` contiene esempi pronti all'uso per l'endpoint di stato e per i comandi del relè.

```bash
API_KEY="la-tua-chiave"
BASE="http://localhost:8080"

# Stato completo di uno Shelly 1PM (relè + misure)
curl -s -H "X-API-Key: $API_KEY" "$BASE/shelly/stato/shelly1pm"

# Stato di un power monitor
curl -s -H "X-API-Key: $API_KEY" "$BASE/shelly/stato/frigo-e-forno"

# Stato di un relè
curl -s -H "X-API-Key: $API_KEY" "$BASE/shelly/stato/portone"

# Comandi del relè
curl -s -X POST -H "X-API-Key: $API_KEY" "$BASE/shelly/relay/shelly1pm/on"
curl -s -X POST -H "X-API-Key: $API_KEY" "$BASE/shelly/relay/shelly1pm/off"
```

---

## 8. Riferimenti

- Specifica OpenAPI: `docs/openapi.yaml`
- Contratto di riferimento (stato corrente): `docs/evolutiva-shelly-frontend.md`
- Esempi `curl`: `scripts/curl-stato-device-shelly.sh`
