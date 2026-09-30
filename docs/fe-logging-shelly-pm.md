# Front-end: logging dei dispositivi Shelly PM

Documento di handoff per l'agente frontend. Descrive il parametro di configurazione runtime `logging_pm_abilitato` recentemente introdotto: come abilita/disabilita la raccolta dei consumi dei dispositivi Shelly PM, come leggerlo e come aggiornarlo tramite le API esistenti.

> **Documento superato.** Il logging dei consumi dei dispositivi Shelly e la
> variabile di polling associata sono stati rimossi dal backend, insieme
> all'endpoint `/shelly/consumi/{id}` e ai relativi parametri di configurazione.
> Lo stato dei dispositivi si legge ora con `GET /shelly/stato/{id}`.
> Riferimento corrente: `docs/modifiche-device-shelly-20260926.md`.
> Il testo seguente è conservato solo come storico.

---

## Panoramica

`logging_pm_abilitato` è un parametro **booleano** di **configurazione runtime** che abilita o disabilita la registrazione periodica dei consumi dei dispositivi Shelly di tipo power monitor (PM), cioè i dati esposti da `GET /shelly/consumi/{id}`.

- **Default di installazione: `false`** — a installazione pulita i consumi non vengono raccolti finché l'utente non abilita esplicitamente il flag.
- Valori ammessi: `true` (raccolta attiva) / `false` (raccolta disattivata).
- È modificabile a runtime e l'aggiornamento è immediato, senza riavvio.
- Configurazioni esistenti (file senza il campo) vengono migrate automaticamente a `false`: nessun dato raccolto finché non viene abilitato.

Non va confuso con `debug_mode` (notifiche informative ntfy) né con `intervallo_polling_consumi_secondi` (frequenza della raccolta, rilevante solo a logging abilitato).

---

## Dove si legge e si modifica

Il flag fa parte di `SystemConfiguration`, quindi è già coperto da API esistenti, protette dall'header `X-API-Key`:

| Metodo | Path | Ruolo |
|--------|------|-------|
| `GET` | `/config` | Lettura della configurazione runtime corrente |
| `PUT` | `/config` | Aggiornamento e persistenza immediata |

Nel JSON il campo si chiama `logging_pm_abilitato` (strategia Jackson `SNAKE_CASE`), e appare sia in `GET /config` che nel body di `PUT /config`.

### Esempio di `GET /config` (estratto)

```json
{
  "intervallo_polling_secondi": 60,
  "intervallo_polling_consumi_secondi": 30,
  "ntfy_topic": "sliverd",
  "debug_mode": false,
  "fuso_orario": "Europe/Rome",
  "ora_legale": true,
  "logging_pm_abilitato": false,
  "notifiche_errori_abilitate": true,
  "api_keys": ["..."]
}
```

### Esempio di `PUT /config`

Il body è l'intera configurazione (stesso schema di `GET /config`). Per abilitare la raccolta dei consumi si imposta `true` e la risposta `200` restituisce la configurazione aggiornata e persistita:

```json
{
  "...",
  "logging_pm_abilitato": true,
  "..."
}
```

---

## Comportamento del backend

- Con `logging_pm_abilitato = false`: lo scheduler di polling PM (`ShellyPmPollingScheduler`) **resta inattivo**. I device PM non vengono interrogati, nessun record viene scritto in `shelly_consumo_log` e non vengono generati errori di categoria `SHELLY_PM`. `GET /shelly/consumi/{id}` restituisce `misure: []` (risposta `200` con lista vuota, nessun errore).
- Con `logging_pm_abilitato = true`: il polling riprende con frequenza `intervallo_polling_consumi_secondi` (default 30 s) e `GET /shelly/consumi/{id}` torna a essere popolato. I dati raccolti finché il flag era `false` non esistono: non c'è "recupero" retroattivo.

---

## Regole e comportamenti per il frontend

1. **Toggle on/off**: nell'UI va rappresentato come switch booleano (nessuna validazione di range: è `true` o `false`).
2. **Default atteso**: al primo avvio (installazione) il campo è `false`; le vecchie installazioni migrano a `false`. Il frontend dovrebbe quindi inizializzare lo switch su "disattivato" e lasciare all'utente la decisione di abilitarlo.
3. **Effetto immediato**: il valore modificato via `PUT /config` viene applicato subito dallo scheduler di polling PM; non serve riavviare.
4. **Stato dati**: con flag `false` la sezione consumi può mostrare uno stato "raccolta disattivata" (lista misure vuota), magari con un invito ad abilitarla; con flag `true` procedere normalmente.
5. **Frequenza dipendente**: `intervallo_polling_consumi_secondi` è rilevante solo quando il flag è `true`. Disabilitare la raccolta non azzera né modifica la frequenza configurata.
6. **Nessuna cancellazione retroattiva**: disabilitare il flag ferma la raccolta ma **non cancella** i log già registrati in precedenza (la retention resta `retention_consumi_giorni`, bootstrap).

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

Quando la raccolta è abilitata, gli errori di lettura di singoli device PM non interrompono il polling degli altri e vengono registrati in `error_log` con categoria `SHELLY_PM` (visibili tramite `GET /log/errori`). Gli errori `SHELLY_PM` **non generano notifiche ntfy**: è un servizio terzo informativo, come `READ_WEATHER`. Con la raccolta disabilitata (flag `false`) questi errori non compaiono affatto, perché i device non vengono interrogati.

---

## Appunti sul profilo mock

Il profilo `mock` non simula i dispositivi Shelly: gli endpoint `/shelly/*` parlano sempre con gli IP reali dei device nella rete locale, con o senza profilo mock. Il default `logging_pm_abilitato` nel profilo mock resta `false`.

---

## Riferimento completo

- Specifica OpenAPI: `docs/openapi.yaml` (schema `SystemConfiguration`, endpoint `/config`)
- Handoff Shelly generale: `docs/evolutiva-shelly-frontend.md`
- Variabile di frequenza polling: `docs/fe-variabile-polling-consumi.md`
- Requisiti funzionali: `docs/specifiche-funzionali.md` (sezione 3.11, RF-50)
- Specifiche tecniche: `docs/specifiche-tecniche.md`
- Implementazione: `ShellyPmPollingScheduler` e `ConfigurationService`