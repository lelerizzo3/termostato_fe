# Front-end: variabile di polling dei consumi

Documento di handoff per l'agente frontend. Descrive la variabile di runtime `intervallo_polling_consumi_secondi` aggiunta di recente, come leggerla e come aggiornarla tramite le API esistenti.

> **Documento superato.** Il logging dei consumi dei dispositivi Shelly e la
> variabile di polling associata sono stati rimossi dal backend, insieme
> all'endpoint `/shelly/consumi/{id}` e ai relativi parametri di configurazione.
> Lo stato dei dispositivi si legge ora con `GET /shelly/stato/{id}`.
> Riferimento corrente: `docs/modifiche-device-shelly-20260926.md`.
> Il testo seguente è conservato solo come storico.

---

## Panoramica

`intervallo_polling_consumi_secondi` è un parametro di **configurazione runtime** che indica ogni quanti secondi il backend interroga i dispositivi Shelly di tipo power monitor (PM) per registrare i log dei consumi esposti da `GET /shelly/consumi/{id}`.

- Unità: secondi
- Default: `30`
- Deve essere un intero positivo (maggiore di zero)
- È modificabile a runtime e l'aggiornamento è immediato, senza riavvio

Non va confuso con `intervallo_polling_secondi`, che invece controlla il ciclo di controllo termostato/sensore/relay.

> **Nota sul frontend**: la sezione **Monitor** (`/shelly/monitor`) legge
> l'ultima misura esposta da `GET /shelly/consumi/{id}` con un intervallo di
> aggiornamento **client-side** (campo "Aggiorna ogni X secondi", default 5).
> Quel campo NON modifica `intervallo_polling_consumi_secondi`: regola solo la
> frequenza di polling del browser verso il backend, senza `PUT /config`.

---

## Dove si legge e si modifica

La variabile fa parte di `SystemConfiguration`, quindi è già coperta da API esistenti, protette dall'header `X-API-Key`:

| Metodo | Path | Ruolo |
|--------|------|-------|
| `GET` | `/config` | Lettura della configurazione runtime corrente |
| `PUT` | `/config` | Aggiornamento e persistenza immediata |

Nel JSON il campo si chiama `intervallo_polling_consumi_secondi` (strategia Jackson `SNAKE_CASE`), e appare sia in `GET /config` che nel body di `PUT /config`.

### Esempio di `GET /config`

```json
{
  "soglia_attivazione": 0.3,
  "override_attivo": false,
  "temperatura_override": null,
  "override_fine": null,
  "intervallo_polling_secondi": 60,
  "intervallo_polling_consumi_secondi": 30,
  "max_errori_consecutivi": 3,
  "retention_log_giorni": 30,
  "ntfy_url": "https://ntfy.sh",
  "ntfy_topic": "sliverd",
  "debug_mode": false,
  "fuso_orario": "Europe/Rome",
  "ora_legale": true,
  "notifiche_errori_abilitate": true,
  "meteo_esterno_url": "https://api.open-meteo.com",
  "meteo_esterno_latitudine": 37.6167,
  "meteo_esterno_longitudine": 15.1667,
  "sensore_url": "http://sensore.local",
  "relay_url": "http://relay.local",
  "database_path": "./data/termostato.db",
  "api_keys": ["..."]
}
```

### Esempio di `PUT /config`

Il body è l'intera configurazione (stesso schema di `GET /config`). Il valore attivo può essere cambiato e la risposta `200` restituisce la configurazione aggiornata e persistita:

```json
{
  "...",
  "intervallo_polling_consumi_secondi": 60,
  "..."
}
```

---

## Regole e comportamenti per il frontend

1. **Valore positivo**: il backend rifiuta valori `<= 0` (errore `400` con body `ApiError`). Nell'UI va validato un intero con minimum 1.
2. **Default implicito**: se il campo è assente (file di configurazione creati prima dell'introduzione della variabile), il backend applica `30`. Al primo `GET /config` dopo la migrazione il valore torna valorizzato.
3. **Effetto immediato**: il valore modificato via `PUT /config` viene applicato subito dallo scheduler di polling PM (`ShellyPmPollingScheduler`); non serve riavviare.
4. **Freshness dati**: il valore determina quanto sono freschi i dati di `GET /shelly/consumi/{id}` e quanti campioni vengono prodotti nel tempo. Un valore più basso → dati più densi (ma più chiamate ai device PM); più alto → dati più radi.
5. **Navigazione tra scheduli**: non modifica `intervallo_polling_secondi` (ciclo di controllo) né `scheduler_tick_millis` (bootstrap, tick base del backend).

---

## Parametri correlati (non modificabili a runtime)

Questi restano parametri di **bootstrap** (definiti all'avvio in `application.yml`, non presenti in `PUT /config`):

| Parametro YAML | Default | Descrizione |
|----------------|---------|-------------|
| `termostato.shelly-file` | `./data/shelly.json` | Path del file JSON dei device Shelly |
| `termostato.retention-consumi-giorni` | `90` | Giorni di retention dei log consumi (pulizia automatica oraria) |

`retention_consumi_giorni` **non** va esposto/modificato via config; vale solo il valore di bootstrap.

---

## Errori di polling e notifiche

Gli errori di lettura di singoli device PM non interrompono il polling degli altri e vengono registrati in `error_log` con categoria `SHELLY_PM` (visibili tramite `GET /log/errori`). Gli errori `SHELLY_PM` **non generano notifiche ntfy**: è un servizio terzo informativo, come `READ_WEATHER`.

Il frontend non deve aspettarsi notifiche né cambi di stato UI derivanti da tali errori; al più possono comparire in `GET /log/errori`.

---

## Appunti sul profilo mock

Il profilo `mock` non simula i dispositivi Shelly: gli endpoint `/shelly/*` parlano sempre con gli IP reali dei device nella rete locale, con o senza profilo mock. Il default del polling consumi nel profilo mock è comunque `30` secondi.

---

## Riferimento completo

- Specifica OpenAPI: `docs/openapi.yaml` (schema `SystemConfiguration`, endpoint `/config`)
- Handoff Shelly generale: `docs/evolutiva-shelly-frontend.md`
- Requisiti funzionali: `docs/specifiche-funzionali.md` (sezione 3.10, RF-49)
- Specifiche tecniche: `docs/specifiche-tecniche.md`
- Implementazione: `ShellyPmPollingScheduler` e `ConfigurationService`