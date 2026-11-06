# IP Lab

Palestra interattiva in italiano per una quarta superiore di informatica. Il sito contiene le 17 tipologie dell’eserciziario del docente e 7 sezioni aggiuntive su CIDR, maschere, intervalli host, confronto delle sottoreti, dimensionamento, FLSM e VLSM.

## Per il docente

Apri Allenamento e seleziona gli argomenti con le caselle delle schede. Puoi avviare Endless o la sfida a 3 vite, oppure entrare in Gara in classe per generare un codice con 5–100 esercizi. Condividi il codice o il link con gli studenti: tutti riceveranno gli stessi esercizi nello stesso ordine. Il docente non deve mantenere aperta la pagina. La gara non usa vite e termina al numero stabilito.

Il primo errore dà un indizio e un secondo tentativo. La soluzione completa arriva dopo il secondo tentativo o su richiesta. Ogni esercizio assegna fino a 100 punti base, suddivisi tra i campi; le risposte recuperate valgono il 60% della relativa quota. Una serie di risposte completamente corrette al primo tentativo assegna un bonus crescente, fino a 50 punti aggiuntivi per esercizio. Non ci sono bonus di velocità. La pagina Come funziona descrive tutte le regole.

Il risultato finale è visibile solo sul dispositivo dello studente. Non sono previsti account, classifica condivisa o storico. Ricaricare o chiudere la scheda cancella la sessione. I risultati non sono certificati e non sono destinati a verifiche sorvegliate.

## Note didattiche

Le sezioni 1–17 usano le classi storiche A/B/C come il documento originale. Le sezioni 18–24 usano il prefisso CIDR esplicito. I problemi LAN si fermano a /30; /31 punto a punto e /32 sono spiegati come casi speciali nella guida. FLSM include la sottorete zero. VLSM impone ordine decrescente delle richieste e primo blocco libero allineato, così la risposta attesa è univoca. I problemi di assegnabilità per classi considerano net-id/host-id, senza simulare tutte le restrizioni amministrative di Internet.

Le domande vengono generate da parametri casuali. Le regole teoriche e alcuni indirizzi speciali hanno necessariamente un insieme finito di risposte e possono ricomparire. Il codice gara incorpora versione, argomenti, lunghezza e seme, con controllo degli errori di copia. I codici IP1 devono continuare a usare gli algoritmi della versione 1: future modifiche incompatibili richiedono una nuova versione del codice.

## Sviluppo e pubblicazione

Non servono dipendenze npm. Con Node.js 22 o successivo:

```sh
npm test
npm run dev
npm run build
```

L’anteprima è su http://127.0.0.1:4173. Il comando build prepara `dist/`. I percorsi relativi funzionano anche quando GitHub Pages pubblica sotto il nome del repository.

Il workflow `.github/workflows/pages.yml` esegue i test e pubblica `dist/` a ogni aggiornamento di `main`. In Settings → Pages occorre selezionare GitHub Actions come origine della pubblicazione. Il documento Word originale resta nella cartella materiali del computer e non viene incluso nel sito o nel repository pubblico.

Il sito non usa backend o librerie applicative esterne. I caratteri DM Sans e Manrope sono caricati da Google Fonts, con caratteri di sistema come alternativa.

## Riferimenti

- [RFC 791 — IPv4 e classi storiche](https://www.rfc-editor.org/rfc/rfc791)
- [RFC 1918 — Indirizzi privati](https://www.rfc-editor.org/rfc/rfc1918)
- [RFC 4632 — CIDR](https://www.rfc-editor.org/rfc/rfc4632)
- [RFC 3021 — Collegamenti punto a punto /31](https://www.rfc-editor.org/rfc/rfc3021)
- [IANA — Indirizzi IPv4 speciali](https://www.iana.org/assignments/iana-ipv4-special-registry/)
