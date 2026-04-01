# Barcode Generator - Cavallino Matto

Applicazione per la generazione di codici a barre EAN-13 ottimizzati per la stampa su fogli A4.

## Funzionalità
- Generazione codici a barre EAN-13 con calcolo automatico del checksum.
- Layout personalizzabile (colonne, righe, dimensioni etichetta).
- Esportazione in PDF ad alta risoluzione (300 DPI).
- Modalità "Embed" per l'inserimento in backoffice aziendali (aggiungi `?embed=true` all'URL).

## Sviluppo Locale
1. Installa le dipendenze: `npm install`
2. Avvia il server di sviluppo: `npm run dev`
3. Apri `http://localhost:3000`

## Distribuzione su Vercel
L'applicazione è configurata per funzionare su Vercel come applicazione full-stack.
1. Collega il tuo repository GitHub a Vercel.
2. Vercel rileverà automaticamente la configurazione `vercel.json`.
3. Assicurati che il comando di build sia `npm run build` e la directory di output sia `dist`.

## Integrazione Iframe
Per inserire l'app in un altro sito senza header e footer:
```html
<iframe src="https://tuo-url.vercel.app?embed=true" width="100%" height="800px"></iframe>
```
