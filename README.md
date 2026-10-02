# AS&C Checklist Generator

Applicazione Next.js per generare checklist di audit e aggiornare il modello Excel
senza dover modificare o pubblicare nuovamente il codice.

## Funzioni principali

- accesso protetto da password con sessione firmata e scadenza dopo 8 ore;
- generazione della checklist Word a partire dagli standard selezionati;
- area riservata `/gestione-checklist` per scaricare il file Excel corrente;
- caricamento di file `.xlsx` e `.xlsm`, validazione e aggiornamento immediato;
- checklist salvata in Redis Upstash, quindi persistente anche dopo un nuovo deploy;
- rate limiting sui tentativi di accesso.

## Configurazione

Copia `.env.example` in `.env.local` e configura:

- `APP_PASSWORD`: password di accesso;
- `APP_SESSION_SECRET`: segreto casuale usato per firmare le sessioni. È consigliato
  impostarlo separatamente dalla password;
- `UPSTASH_REDIS_REST_URL` e `UPSTASH_REDIS_REST_TOKEN`: credenziali Redis usate
  sia per il rate limiting sia per conservare la checklist.

Le stesse variabili devono essere configurate nell'ambiente di produzione. Senza
Redis, in sviluppo è possibile accedere e leggere la checklist inclusa nel progetto,
ma non salvare una nuova versione. In produzione Redis è obbligatorio.

## Avvio locale

```bash
npm install
npm run dev
```

Apri [http://localhost:3000](http://localhost:3000). Dopo l'accesso, il pulsante
“Gestisci checklist” porta alla pagina di download e sostituzione del file.

## Formato Excel

Il caricamento accetta file fino a 3 MB con estensione `.xlsx` o `.xlsm`. Ogni
foglio viene trattato come un capitolo e deve usare le intestazioni:

- `Standard`
- `Req.` oppure `Req`
- `Domanda` (obbligatoria per creare una riga)

Le righe con `Standard` uguale a `Evidenze` vengono ignorate, come nella conversione
originaria. Il file caricato viene conservato senza modifiche per il download; i dati
utilizzati dal generatore vengono estratti al momento del caricamento.
