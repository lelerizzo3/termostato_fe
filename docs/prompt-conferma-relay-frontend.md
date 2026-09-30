# Prompt: conferma esito accensione/spegnimento relay nel front-end

## Ruolo e obiettivo

Sei uno sviluppatore front-end. Devi adeguare l'interfaccia del termostato intelligente per
mostrare una **conferma esplicita** dell'esito delle azioni di accensione/spegnimento dei relay
Shelly (`portone`, `cancello`, `terrazzo`), basandoti sui nuovi campi `esito` e
`stato_precedente` restituiti dal backend.
Il backend è già stato modificato e testato; il tuo compito riguarda **solo il front-end**.

Non modificare il backend. Basa l'integrazione sul contratto descritto qui sotto e sulla
specifica OpenAPI aggiornata in `docs/openapi.yaml` (versione 1.4.0).

## Contesto funzionale

La UI espone comandi di accensione/spegnimento per i relay Shelly tramite gli endpoint
`/shelly/relay/{id}/on` e `/shelly/relay/{id}/off`.

Fino ad oggi l'unica conferma disponibile era lo stato riletto `acceso`. Questo è
inaffidabile per due motivi:

1. **Device con auto-spegnimento hardware** (`portone`, `cancello`): dopo il comando si
   riaccendono/spengono da soli dopo 1 secondo, quindi `acceso` riletto subito dopo può non
   corrispondere all'esito del comando.
2. **Relay già nello stato richiesto**: se l'utente preme "accendi" su un relay già acceso,
   `acceso` non cambia e il client non può distinguere "comando eseguito" da "niente da fare".

La novità: il backend ora restituisce in più l'esito esplicito del comando (`esito`) e lo
stato precedente del relay (`stato_precedente`), per dare al client una conferma reale
dell'azione.

## Cosa è cambiato nel backend

### Forma degli endpoint: INVARIATA

Nessun cambiamento di metodo, path o parametri. Da usare esattamente come prima:

| Metodo | Path | Scopo |
|--------|------|-------|
| `GET` | `/shelly/relay/{id}` | Stato corrente del relay |
| `POST` | `/shelly/relay/{id}/on` | Accende il relay |
| `POST` | `/shelly/relay/{id}/off` | Spegne il relay |

La modifica al protocollo Shelly Gen 3 (`Switch.Get` → `Switch.GetStatus`, comando via GET)
è interna al backend e **invisibile** al front-end.

### Risposta relay: arricchita (additiva, retrocompatibile)

Lo schema `ShellyRelayStatoResponse` ha due nuovi campi opzionali:

| Campo | Tipo | Descrizione |
|---|---|---|
| `esito` | `boolean` o `null` | `true` = il dispositivo ha **confermato l'esecuzione** del comando (risposta `Switch.Set` ricevuta). Presente solo nelle risposte a `/on` e `/off`; `null` su `GET /shelly/relay/{id}`. |
| `stato_precedente` | `boolean` o `null` | Stato del relay **prima** del comando (equivalente del campo `was_on` della API RPC Shelly). Valorizzato per i dispositivi **Gen 3** (es. `terrazzo`, `cancello`); `null` per i **Gen 1** (es. `portone`) e su `GET`. |

I client esistenti che ignorano i campi sconosciuti continuano a funzionare: l'adeguamento è
**opzionale ma raccomandato** per una corretta conferma delle azioni.

## Contratto API di riferimento

Tutte le chiamate richiedono l'header `X-API-Key`. I nomi JSON seguono `SNAKE_CASE`.

`POST /shelly/relay/terrazzo/off` (il relay era acceso) → `200`:

```json
{
  "id": "terrazzo",
  "nome": "Terrazzo",
  "ip": "192.168.1.10",
  "modello": "S3SW-001X8EU",
  "generazione": 3,
  "tipo": "RELAY",
  "acceso": false,
  "esito": true,
  "stato_precedente": true
}
```

`POST /shelly/relay/terrazzo/on` (il relay era spento) → `200`:

```json
{
  "id": "terrazzo",
  "nome": "Terrazzo",
  "ip": "192.168.1.10",
  "modello": "S3SW-001X8EU",
  "generazione": 3,
  "tipo": "RELAY",
  "acceso": true,
  "esito": true,
  "stato_precedente": false
}
```

`GET /shelly/relay/{id}` (lettura di stato) → `esito` e `stato_precedente` restano `null`.

Errori:

| Codice | Body | Significato |
|--------|------|-------------|
| `400` | `ApiError` | Il dispositivo esiste ma è di tipo `PM`, non relay |
| `401` | `UnauthorizedError` | `X-API-Key` mancante o non valida |
| `404` | `ApiError` | `id` dispositivo non trovato |
| `500` | `ApiError` | Errore di comunicazione col dispositivo (timeout, risposta vuota, RPC error) |

Su errore il comando **non** ha conferma: non impostare alcun messaggio di successo.

## Requisiti per il front-end

1. **Conferma esplicita dell'azione.** Dopo `POST /shelly/relay/{id}/on` o `/off`, mostra
   all'utente una conferma visiva ("Comando eseguito"/toast) quando `esito === true`, anche se
   `acceso` non è cambiato (relay già nello stato richiesto) e anche quando `acceso` resta
   `false` per un device con auto-spegnimento hardware (portone/cancello).

2. **Indicazione della transizione.** Se `stato_precedente` è valorizzato, usa
   `stato_precedente` + `acceso` per descrivere la transizione (es. "da spento ad acceso",
   "da acceso a spento", oppure "era già acceso"/"era già spento"). Gestisci i `null` senza
   errori (Gen 1 e `GET` stato): in assenza del dato, mostra comunque la conferma basata
   su `esito`.

3. **Non usare `acceso` come esito.** Distingui sempre "comando eseguito" (`esito`) da
   "stato attuale" (`acceso`). In particolare, per portone/cancello con auto-off da 1s,
   `esito === true` con `acceso === false` è **un successo**, non un errore.

4. **Gestione errori.** Su risposta non-2xx non mostrare conferme di successo: mostra il
   `message` del body `ApiError`. Su `401` (chiave scaduta/invalida) gestisci il ritorno al
   login/autorizzazione secondo le convenzioni della UI.

5. **Robustezza / retrocompatibilità.** I campi `esito` e `stato_precedente` possono essere
   assenti (client più vecchio) o `null`. Trattali come valori opzionali; non far mai fallire
   la resa della UI in loro assenza.

6. **Rilettura dello stato (raccomandato).** Se la UI mostra lo stato "live" del relay
   (interruttore/toggle), considera una rilettura `GET /shelly/relay/{id}` dopo alcuni secondi
   per i device con auto-off, così il toggle riflette lo stato reale senza contraddire la
   conferma già mostrata.

## Criteri di accettazione

- Dopo `POST .../on` o `.../off` con risposta `200`, la UI mostra una conferma esplicita
  dell'esecuzione del comando.
- Quando `stato_precedente` è valorizzato, la UI mostra la transizione corretta
  (o "era già acceso/spento"); con valore `null` non si verificano errori.
- Su `terrazzo` (Gen 3) il flusso on→off→on mostra: conferma, transizione e stato finale
  coerenti con i valori di `esito`/`stato_precedente`/`acceso`.
- Su `portone`/`cancello` (auto-off hardware), premendo "accendi" la UI mostra il successo
  (`esito = true`) senza segnare errore, anche se `acceso` riletto torna `false` entro 1s.
- Le risposte di errore non-2xx non producono messaggi di successo; il `message`
  dell'`ApiError` viene mostrato all'utente.
- La UI non si rompe se `esito`/`stato_precedente` mancano o sono `null`.

## Riferimenti

- Specifica OpenAPI aggiornata: `docs/openapi.yaml` (versione 1.4.0, schema
  `ShellyRelayStatoResponse`, endpoint `/shelly/relay/{id}`, `/shelly/relay/{id}/on`,
  `/shelly/relay/{id}/off`).
- Documento front-end sul controllo relay: `docs/fe-controllo-relay-shelly.md` (campi,
  esempi, note su auto-off).
- Evolutiva Shelly (handoff generale): `docs/evolutiva-shelly-frontend.md`.