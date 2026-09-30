# Controllo relay Shelly — documentazione front-end

Documento di lavoro del frontend per il controllo dei relay Shelly
(`portone`, `cancello`, `terrazzo`). Descrive il contratto degli endpoint di
comando on/off a partire dalla versione 1.4.0 di `docs/openapi.yaml`, con
particolare attenzione ai campi di conferma `esito` e `stato_precedente`.

---

## Endpoint

| Metodo | Path | Scopo |
|--------|------|-------|
| `GET` | `/shelly/relay/{id}` | Stato corrente del relay (lettura live) |
| `POST` | `/shelly/relay/{id}/on` | Accende il relay |
| `POST` | `/shelly/relay/{id}/off` | Spegne il relay |

Tutte le chiamate richiedono l'header `X-API-Key`. I nomi JSON seguono
`SNAKE_CASE`. La forma degli endpoint è invariata rispetto alle versioni
precedenti: la modifica è **additiva** nella risposta.

---

## Campi di conferma del comando

`POST /shelly/relay/{id}/on|off` restituiscono lo stato riletto (`acceso`) più
due campi di conferma:

| Campo | Tipo | Descrizione |
|---|---|---|
| `esito` | `boolean` o `null` | `true` = il dispositivo ha **confermato l'esecuzione** del comando (risposta `Switch.Set` ricevuta). Solo nelle risposte a `/on` e `/off`; `null` su `GET /shelly/relay/{id}`. |
| `stato_precedente` | `boolean` o `null` | Stato del relay **prima** del comando (equivalente del campo `was_on` della API RPC Shelly). Valorizzato per i dispositivi **Gen 3** (es. `terrazzo`, `cancello`); `null` per i **Gen 1** (es. `portone`) e su `GET`. |

I nuovi campi sono **opzionali**: un client che li ignora continua a funzionare.
I campi assenti o `null` non devono mai far fallire la resa della UI.

---

## Esempi reali

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

`GET /shelly/relay/{id}` (lettura di stato) → `esito` e `stato_precedente`
restano `null`.

---

## Errori

| Codice | Body | Significato |
|--------|------|-------------|
| `400` | `ApiError` | Il dispositivo esiste ma è di tipo `PM`, non relay |
| `401` | `UnauthorizedError` | `X-API-Key` mancante o non valida |
| `404` | `ApiError` | `id` dispositivo non trovato |
| `500` | `ApiError` | Errore di comunicazione col dispositivo (timeout, risposta vuota, RPC error) |

Su errore il comando **non** ha conferma: la UI non deve mostrare alcun
messaggio di successo, solo il `message` dell'`ApiError`.

---

## Note su auto-off hardware

`portone` e `cancello` sono configurati con **autospegnimento hardware**: dopo il
comando di accensione si spengono da soli entro 1 secondo. Di conseguenza:

- `GET /shelly/relay/{id}` riletto subito dopo può restituire `acceso: false`;
- `esito: true` con `acceso: false` è un **successo**, non un errore.

Il frontend deve quindi **non usare mai `acceso` per valutare l'esito** del
comando: la conferma si basa su `esito`. Il badge/toggle dello stato può poi
essere sincronizzato con una rilettura dopo alcuni secondi, senza contraddire la
conferma già mostrata.

---

## Comportamento del frontend

1. **Conferma esplicita dell'azione**: dopo `/on` o `/off` con risposta `2xx` la
   UI mostra "Comando eseguito" quando `esito === true`, anche se `acceso` non è
   cambiato (relay già nello stato richiesto) o se `acceso` è `false` per
   auto-off hardware.
2. **Transizione**: con `stato_precedente` valorizzato si descrive la
   transizione `stato_precedente` → `acceso`:
   - "da spento ad acceso", "da acceso a spento",
   - "era già acceso" / "era già spento" quando `stato_precedente === acceso`.
   Con `null` (Gen 1 e `GET`) si mostra comunque la conferma basata su `esito`.
3. **Mai `acceso` come esito**: per portone/cancello `esito === true` con
   `acceso === false` è un successo, non un errore.
4. **Errori non-2xx**: nessuna conferma di successo; mostrare il `message` del
   body `ApiError`. Su `401` tornare al gate/login come per gli altri endpoint.
5. **Robustezza**: `esito`/`stato_precedente` possono essere assenti o `null`
   (client più vecchio): trattarli come opzionali, nessun crash.
6. **Rilettura dello stato**: rileggere `GET /shelly/relay/{id}` dopo alcuni
   secondi per i device con auto-off, così il toggle riflette lo stato reale
   senza contraddire la conferma già mostrata.

---

## Riferimenti

- `docs/openapi.yaml` — schema `ShellyRelayStatoResponse`, endpoint `/shelly/relay/{id}`, `/shelly/relay/{id}/on`, `/shelly/relay/{id}/off`.
- `docs/evolutiva-shelly-frontend.md` — handoff complessivo dell'integrazione Shelly.
- `docs/specifiche-tecniche-frontend.md` — cap. 6.9 (card relay) e FE-NF-18.