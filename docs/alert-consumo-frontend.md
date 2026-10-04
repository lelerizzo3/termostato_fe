# Alert di consumo Shelly — 2026-10-04

Documento di handoff (backend → frontend) dell'introduzione dell'alert di consumo. Il backend
aggiunge **due nuovi parametri di configurazione** nella sezione configurazione: `alert_soglia` e
`alert_polling`.

Tutti i dettagli di contratto riportati qui sono stati verificati con chiamate reali al backend in
esecuzione; esempi e risposte sono copiati dalle risposte osservate.

---

## 1. Sommario

La nuova funzionalità somma la potenza istantanea (in watt) di **tutti i dispositivi Shelly che
effettuano misurazioni** — cioè i tipi `PM` e `PM_RELAY` — e invia un alert via ntfy quando la somma
supera una soglia configurata.

Dal punto di vista del frontend la novità è limitata a due campi: **non ci sono nuovi endpoint, non
c'è una nuova pagina e non compaiono dati nuovi nelle risposte esistenti.** Tutto il resto avviene
in background lato backend.

La funzione è **disabilitata per default** e va attivata esplicitamente dall'utente.

---

## 2. I due nuovi parametri

| Campo JSON | Chiave YAML/CLI | Tipo | Default | Significato |
|---|---|---|---|---|
| `alert_soglia` | `alert-soglia` | numero (watt), ≥ 0 | `0` | Somma di potenza superata la quale inviare l'alert |
| `alert_polling` | `alert-polling` | intero (secondi), ≥ 0 | `0` | Ogni quanti secondi effettuare il controllo della somma |

### 2.1 Regola di attivazione

La funzione è attiva **solo se entrambi i valori sono maggiori di zero**:

```
alert attivo  ⟺  alert_soglia > 0  AND  alert_polling > 0
```

Se uno dei due è `0` oppure `null` (assente) la funzione è **disabilitata**: nessun dispositivo
Shelly viene interrogato e non viene inviata alcuna notifica. Il default di fabbrica (`0`/`0`) è
quindi disabilito.

> Attenzione: `alert_soglia` da sola **non** basta. Con `alert_soglia: 2000` e `alert_polling: 0`
> non succede nulla. Entrambi i campi sono obbligatori per l'attivazione.

### 2.2 Semantica del superamento

L'alert scatta quando la somma è **strettamente maggiore** della soglia. Con somma esattamente pari
alla soglia non viene inviato nulla.

L'alert viene **reinviato a ogni giro di controllo** in cui la somma resta sopra soglia: non esiste
un blocco anti-ripetizione, quindi notifiche ripetute con cadenza `alert_polling` sono il
comportamento atteso. Il rientro sotto soglia è implicito nel fatto che l'alert smetta di arrivare.

---

## 3. Impatto su `GET /config`

I due campi sono esposti da `GET /config` come **ultimi due campi** dell'oggetto, dopo
`override_fine`. Non sono richiesti in alcun modo per la lettura.

**Response 200 (risposta reale del profilo `mock`, con alert disabilitato):**

I valori delle altre sezioni sono quelli del profilo di test: **sono rilevanti solo gli ultimi due
campi**, che mostrano l'assenza di configurazione (alert disabilitato per default).

```json
{
  "soglia_attivazione": 0.3,
  "override_attivo": true,
  "temperatura_override": 20.5,
  "intervallo_polling_secondi": 2,
  "max_errori_consecutivi": 3,
  "retention_log_giorni": 30,
  "ntfy_url": "https://ntfy.sh",
  "ntfy_topic": "sliverd",
  "debug_mode": false,
  "sensore_url": "http://localhost:8080",
  "relay_url": "http://localhost:8080",
  "database_path": "./data/mock-termostato.db",
  "api_keys": ["e2e-test-key"],
  "meteo_esterno_url": "https://api.open-meteo.com",
  "meteo_esterno_latitudine": 37.6167,
  "meteo_esterno_longitudine": 15.1667,
  "notifiche_errori_abilitate": false,
  "fuso_orario": "Europe/Rome",
  "ora_legale": true,
  "override_fine": null,
  "alert_soglia": 0,
  "alert_polling": 0
}
```

**Response 200 (configurazione con alert attivo):**

```json
{
  "...": "...",
  "alert_soglia": 1500.75,
  "alert_polling": 30
}
```

I campi sono **sempre presenti** nella risposta: un backend aggiornato li espone anche se la
configurazione su disco è precedente alla funzione (verificato: il file viene completato con `0`/`0`
e riscritto, senza perdere gli altri valori).

Il backend **non espone** alcun campo che indichi se l'ultimo controllo abbia superato la soglia,
l'ultima somma rilevata o lo stato dell'ultimo alert: non esiste uno storico. Se in futuro servisse,
va concordato come nuova evolutiva.

---

## 4. Impatto su `PUT /config`

`PUT /config` è una **sostituzione completa** della configurazione, non una patch.

### 4.1 ⚠️ I due campi devono essere sempre inviati

**Se il frontend omette `alert_soglia` e/o `alert_polling` dal payload, il backend risponde `200` e
imposta i campi mancanti a `0`, disattivando l'alert.**

Verificato:

```
PUT /config senza i campi alert  →  200, alert_soglia = 0, alert_polling = 0
```

Non viene generato alcun errore, quindi la disattivazione sarebbe silenziosa. La form deve quindi
**leggere i due valori da `GET /config` e reinviarli sempre** in ogni salvataggio, insieme a tutti
gli altri campi, esattamente come già fatto per il resto della configurazione.

### 4.2 Valori accettati

| Input | Esito |
|---|---|
| `alert_soglia: 1500.75`, `alert_polling: 30` | `200` — accettati (soglia decimale consentita) |
| `alert_soglia: 0`, `alert_polling: 0` | `200` — funzione disabilitata |
| `alert_soglia: null`, `alert_polling: null` | `200` — normalizzati a `0`/`0`, funzione disabilitata |
| `alert_soglia: -1` | `400` — rifiutato |
| `alert_polling: -5` | `400` — rifiutato |

**Response 400 (soglia negativa):**

```json
{
  "timestamp": "2026-10-04T09:30:03.501897045Z",
  "status": 400,
  "error": "Bad Request",
  "message": "JSON parse error: Cannot construct instance of `com.termostato.domain.model.SystemConfiguration`, problem: alertSoglia non può essere negativo"
}
```

**Response 400 (polling negativo):**

```json
{
  "timestamp": "2026-10-04T09:30:03.507952225Z",
  "status": 400,
  "error": "Bad Request",
  "message": "JSON parse error: Cannot construct instance of `com.termostato.domain.model.SystemConfiguration`, problem: alertPolling non può essere negativo"
}
```

Il messaggio d'errore contiene il dettaglio tecnico della validazione. **Validare lato client** con
input `min="0"`/`type="number"` per non far arrivare al backend richieste invalide, ma gestire
comunque il `400` come rete di sicurezza.

### 4.3 ⚠️ `alert_polling` deve essere un intero

Il backend **tronca** una parte decimale invece di rifiutarla. Verificato:

```
PUT /config con alert_polling: 2.5  →  200, alert_polling salvato come 2
```

Nessun errore: il valore `2.5` diventa silenziosamente `2`. Il campo va quindi inviato come intero
(`input type="number" step="1"`), senza decimali. Lo stesso vale per il salvataggio: se la form
manda `2.5`, l'utente vedrà `2` al ricaricamento e potrebbe non capire perché.

---

## 5. Azioni richieste al frontend

1. **Aggiungere i due campi alla form di configurazione**, in un gruppo dedicato (per esempio
   "Alert di consumo"), con `alert_soglia` in watt e `alert_polling` in secondi.
2. **Includere sempre entrambi i campi nel payload di `PUT /config`** (§4.1), anche quando l'utente
   non li tocca: è l'unico modo di non disattivare silenziosamente l'alert al salvataggio.
3. **Validare lato client**: `min=0` su entrambi, `step="1"` su `alert_polling` (§4.3).
4. **Rendere visibile la regola di attivazione congiunta**: spiegare che servono entrambi i valori
   maggiori di zero, e non solo la soglia (§2.1).
5. **Gestire il `400`** per valori negativi, mostrando il `message` della risposta (§4.2).
6. **Non introdurre un indicatore di stato dell'alert** nelle risposte di `GET /config`: non esiste.
   Lo stato si deduce dai due valori (entrambi `> 0` = attivo).
7. **Non aggiungere nuove chiamate API**: la somma e l'invio dell'alert avvengono in background lato
   backend, senza endpoint dedicati.

---

## 6. Cosa NON cambia per il frontend

- Nessun endpoint nuovo: `GET /config` e `PUT /config` restano gli unici punti di intervento.
- Nessun dato nuovo in `GET /stato`, `GET /shelly/*`, `GET /log` o nei log di polling.
- `debug_mode` e `notifiche_errori_abilitate` **non** controllano l'alert di consumo: le notifiche di
  superamento soglia vengono inviate comunque, indipendentemente da questi due flag (superare la
  soglia è un evento, non un messaggio informativo). Non sono quindi dipendenze della funzione alert
  e non vanno proposti come opzioni nella sua sezione.
- Il topic e l'URL ntfy restano quelli già configurati in `ntfy_url` / `ntfy_topic`.
- Nessuna migrazione del database, nessun nuovo endpoint di storico, nessuna retention.

---

## 7. Note operative

- **Il profilo mock non simula i dispositivi Shelly**: le letture verso i power meter vanno sempre
  agli IP reali nella rete locale. In un ambiente di test senza reale la somma risulterà `0` (o
  sottostimata) e l'alert non scatterà. Verificarlo su un impianto reale.
- **Dispositivo irraggiungibile**: un device che non risponde viene scartato e non annulla la somma
  degli altri, quindi il totale è **sottostimato** della quota non letta. Un alert può quindi
  mancare anche se il consumo reale è sopra soglia, se i dispositivi che lo compongono non rispondono.
- La frequenza di controllo `alert_polling` è **indipendente** da `intervallo_polling_secondi`, che
  resta dedicato al ciclo della caldaia.
- Un nuovo intervallo `alert_polling` non accorcia retroattivamente un controllo già pianificato:
  viene applicato dalla volta successiva.
- La modifica tramite `PUT /config` ha effetto immediato, senza riavvio (RNF-01).

---

## 8. Riferimenti

- Specifica OpenAPI aggiornata: `docs/openapi.yaml` (schema `SystemConfiguration`, proprietà
  `alert_soglia` e `alert_polling`)
- Requisito funzionale: `docs/specifiche-funzionali.md` §3.12 e RF-51
- Dettaglio implementativo: `docs/specifiche-tecniche.md` §6.5
- Riepilogo utente: `README.md`, sezione "Alert di consumo"
- Handoff precedente: `docs/modifiche-device-shelly-20260926.md`