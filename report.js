// report.js - Genera e scarica un PDF con il resoconto della sessione di cassa.
// Va caricato DOPO script.js (vedi index.html).

const FONDO_CASSA_INIZIALE = 250.00;

let transazioni = [];   // storico delle vendite della sessione

function euro(n) {
    return `€${n.toFixed(2)}`;
}

// --- Intercetta i pagamenti per registrare i dettagli di ogni vendita ---
function avvolgiPagamento(nomeFunzione, metodo) {
    const originale = window[nomeFunzione];
    window[nomeFunzione] = function () {
        const incassoPrima = sessionRevenue;
        const righe = cart.map(item => ({ ...item }));          // copia del carrello
        const contanti = parseFloat(document.getElementById('cashInput').value);

        originale.apply(this, arguments);

        // Se l'incasso è aumentato, il pagamento è andato a buon fine
        if (sessionRevenue > incassoPrima) {
            transazioni.push({
                ora: new Date(),
                metodo: metodo,
                totale: sessionRevenue - incassoPrima,
                contanti: metodo === 'Contanti' ? contanti : null,
                righe: righe
            });
        }
    };
}

avvolgiPagamento('pagaContanti', 'Contanti');
avvolgiPagamento('pagaPOS', 'POS');

// Se la cassa viene azzerata, azzera anche lo storico
const chiusuraCassaOriginale = window.chiusuraCassa;
window.chiusuraCassa = function () {
    chiusuraCassaOriginale.apply(this, arguments);
    if (cart.length === 0 && Object.keys(salesRegistry).length === 0) {
        transazioni = [];
    }
};

// --- Generazione PDF ---
function scaricaResocontoPDF() {
    if (!window.jspdf) {
        alert("Libreria PDF non caricata. Controlla la connessione internet.");
        return;
    }
    if (transazioni.length === 0) {
        alert("Nessuna vendita da riportare nel resoconto.");
        return;
    }

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    const adesso = new Date();
    const larghezza = doc.internal.pageSize.getWidth();

    // Intestazione
    doc.setFontSize(20);
    doc.setTextColor(255, 42, 122);
    doc.text("Cinematta POS - Resoconto di Cassa", 14, 20);
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Generato il ${adesso.toLocaleDateString('it-IT')} alle ${adesso.toLocaleTimeString('it-IT')}`, 14, 27);

    // Calcoli
    const totContanti = transazioni.filter(t => t.metodo === 'Contanti').reduce((s, t) => s + t.totale, 0);
    const totPOS = transazioni.filter(t => t.metodo === 'POS').reduce((s, t) => s + t.totale, 0);
    let totScontato = 0;
    const perProdotto = {};

    transazioni.forEach(t => {
        t.righe.forEach(r => {
            const lordo = r.prezzoBase * r.qta;
            const netto = lordo * (1 - r.scontoPercentuale / 100);
            totScontato += lordo - netto;
            if (!perProdotto[r.nome]) perProdotto[r.nome] = { qta: 0, incasso: 0 };
            perProdotto[r.nome].qta += r.qta;
            perProdotto[r.nome].incasso += netto;
        });
    });

    // Riepilogo
    doc.autoTable({
        startY: 33,
        head: [['Riepilogo', 'Valore']],
        body: [
            ['Fondo cassa iniziale', euro(FONDO_CASSA_INIZIALE)],
            ['Fondo cassa attuale', euro(currentFund)],
            ['Incasso totale', euro(sessionRevenue)],
            ['   di cui Contanti', euro(totContanti)],
            ['   di cui POS', euro(totPOS)],
            ['Numero transazioni', String(transazioni.length)],
            ['Sconti concessi', euro(totScontato)]
        ],
        headStyles: { fillColor: [255, 42, 122] },
        columnStyles: { 1: { halign: 'right' } }
    });

    // Prodotti venduti
    doc.setFontSize(13);
    doc.setTextColor(0);
    doc.text("Prodotti venduti", 14, doc.lastAutoTable.finalY + 12);
    doc.autoTable({
        startY: doc.lastAutoTable.finalY + 15,
        head: [['Articolo', 'Quantità', 'Incasso']],
        body: Object.entries(perProdotto).map(([nome, d]) => [nome, d.qta, euro(d.incasso)]),
        headStyles: { fillColor: [0, 180, 181] },
        columnStyles: { 1: { halign: 'center' }, 2: { halign: 'right' } }
    });

    // Dettaglio transazioni
    doc.setFontSize(13);
    doc.text("Dettaglio transazioni", 14, doc.lastAutoTable.finalY + 12);
    doc.autoTable({
        startY: doc.lastAutoTable.finalY + 15,
        head: [['#', 'Ora', 'Metodo', 'Articoli', 'Totale']],
        body: transazioni.map((t, i) => [
            i + 1,
            t.ora.toLocaleTimeString('it-IT'),
            t.metodo,
            t.righe.map(r => `${r.qta}x ${r.nome}${r.scontoPercentuale > 0 ? ` (-${r.scontoPercentuale}%)` : ''}`).join(', '),
            euro(t.totale)
        ]),
        headStyles: { fillColor: [46, 213, 115] },
        columnStyles: { 3: { cellWidth: 80 }, 4: { halign: 'right' } }
    });

    // Numerazione pagine
    const pagine = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pagine; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(150);
        doc.text(`Pagina ${i} di ${pagine}`, larghezza - 14, doc.internal.pageSize.getHeight() - 8, { align: 'right' });
    }

    const nomeFile = `resoconto_${adesso.toISOString().slice(0, 10)}_${String(adesso.getHours()).padStart(2, '0')}${String(adesso.getMinutes()).padStart(2, '0')}.pdf`;
    doc.save(nomeFile);
}

// --- Aggiunge il pulsante nella colonna sinistra (sopra "Chiusura Cassa") ---
(function creaPulsante() {
    const btn = document.createElement('button');
    btn.className = 'btn-action';
    btn.textContent = '📄 Scarica Resoconto PDF';
    btn.onclick = scaricaResocontoPDF;

    const chiusura = document.querySelector('.sidebar-left .btn-danger');
    chiusura.parentNode.insertBefore(btn, chiusura);
})();