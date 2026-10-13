let catalog = {};
let cart = [];
let salesRegistry = {};
let currentFund = 250.00;
let sessionRevenue = 0.00;
let currentDiscountIndex = null; // Tiene traccia dell'articolo a cui applicare lo sconto

async function caricaProdotti() {
    try {
        const response = await fetch('prodotti.txt');
        const text = await response.text();
        const linee = text.split('\n');
        
        catalog = {};
        const grid = document.getElementById('productGrid');
        grid.innerHTML = '';

        linee.forEach(linea => {
            let parti = linea.trim().split(',');
            if (parti.length >= 4) {
                let codice = parti[0].trim();
                let nome = parti[1].trim();
                let prezzo = parseFloat(parti[2].trim());
                let categoria = parti[3].trim();
                
                if (codice && nome && !isNaN(prezzo)) {
                    catalog[codice] = { nome, prezzo, categoria };

                    let btn = document.createElement('button');
                    btn.className = 'product-btn';
                    btn.onclick = () => aggiungiAlCarrello(nome, prezzo);
                    btn.innerHTML = `
                        <span class="product-name">${nome}</span>
                        <span class="product-price">€${prezzo.toFixed(2)}</span>
                        <span class="product-category">${categoria}</span>
                    `;
                    grid.appendChild(btn);
                }
            }
        });
    } catch (error) {
        console.error("Errore nel caricamento di prodotti.txt:", error);
    }
}

// Gestione Barcode
document.getElementById('barcodeScanInput').addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
        let codice = this.value.trim();
        if (catalog[codice]) {
            aggiungiAlCarrello(catalog[codice].nome, catalog[codice].prezzo);
            this.value = '';
        } else {
            document.getElementById('errorMsg').textContent = `Codice "${codice}" non trovato!`;
        }
    }
});

function aggiungiAlCarrello(nome, prezzo) {
    let itemEsistente = cart.find(item => item.nome === nome && item.scontoPercentuale === 0);
    if (itemEsistente) {
        itemEsistente.qta += 1;
    } else {
        cart.push({ nome: nome, prezzoBase: prezzo, qta: 1, scontoPercentuale: 0 });
    }
    aggiornaCarrelloUI();
}

function aggiungiBiglietto() {
    const input = document.getElementById('ticketPriceInput');
    let prezzo = parseFloat(input.value);
    if (!isNaN(prezzo) && prezzo > 0) {
        cart.push({ nome: "Biglietto Cinema", prezzoBase: prezzo, qta: 1, scontoPercentuale: 0 });
        input.value = '';
        aggiornaCarrelloUI();
    } else {
        document.getElementById('errorMsg').textContent = "Inserisci un prezzo valido.";
    }
}

function cambiaQuantita(index, delta) {
    cart[index].qta += delta;
    if (cart[index].qta <= 0) {
        cart.splice(index, 1);
    }
    aggiornaCarrelloUI();
}

// Gestione Modale Sconto
function apriModalSconto(index) {
    currentDiscountIndex = index;
    document.getElementById('discountInputVal').value = cart[index].scontoPercentuale || 10;
    document.getElementById('discountModal').style.display = 'flex';
}

function chiudiModalSconto() {
    document.getElementById('discountModal').style.display = 'none';
    currentDiscountIndex = null;
}

function confermaSconto() {
    let scontoVal = parseFloat(document.getElementById('discountInputVal').value);
    if (!isNaN(scontoVal) && scontoVal >= 0 && scontoVal <= 100 && currentDiscountIndex !== null) {
        cart[currentDiscountIndex].scontoPercentuale = scontoVal;
        aggiornaCarrelloUI();
        chiudiModalSconto();
    } else {
        alert("Inserisci una percentuale valida tra 0 e 100.");
    }
}

function calcolaPrezzoTotaleArticolo(item) {
    let prezzoScontato = item.prezzoBase * (1 - item.scontoPercentuale / 100);
    return prezzoScontato * item.qta;
}

function aggiornaCarrelloUI() {
    const tbody = document.getElementById('cartTableBody');
    const totalDisplay = document.getElementById('totalDisplay');
    tbody.innerHTML = '';

    let totaleGenerale = 0;

    cart.forEach((item, index) => {
        let totaleArticolo = calcolaPrezzoTotaleArticolo(item);
        totaleGenerale += totaleArticolo;

        let tr = document.createElement('tr');
        tr.innerHTML = `
            <td>
                ${item.nome} ${item.scontoPercentuale > 0 ? `<br><small style="color:#f39c12">(-${item.scontoPercentuale}%)</small>` : ''}
            </td>
            <td>
                <button onclick="cambiaQuantita(${index}, -1)">-</button>
                ${item.qta}
                <button onclick="cambiaQuantita(${index}, 1)">+</button>
            </td>
            <td>€${totaleArticolo.toFixed(2)}</td>
            <td>
                <button onclick="apriModalSconto(${index})" title="Sconto" style="background:#d35400; color:white; border:none; padding:3px 6px; border-radius:3px; cursor:pointer;">%</button>
                <button onclick="cambiaQuantita(${index}, -${item.qta})" style="background:#c0392b; color:white; border:none; padding:3px 6px; border-radius:3px; cursor:pointer;" title="Elimina">X</button>
            </td>
        `;
        tbody.appendChild(tr);
    });

    totalDisplay.textContent = `€${totaleGenerale.toFixed(2)}`;
    document.getElementById('errorMsg').textContent = '';
}

function calcolaTotaleCarrello() {
    return cart.reduce((sum, item) => sum + calcolaPrezzoTotaleArticolo(item), 0);
}

function registraVendite() {
    cart.forEach(item => {
        if (!salesRegistry[item.nome]) {
            salesRegistry[item.nome] = 0;
        }
        salesRegistry[item.nome] += item.qta;
    });

    let statsHtml = "";
    for (let nome in salesRegistry) {
        statsHtml += `<div>• ${salesRegistry[nome]} di ${nome}</div>`;
    }
    document.getElementById('salesStatsList').innerHTML = statsHtml;
}

function pagaPOS() {
    if (cart.length === 0) {
        document.getElementById('errorMsg').textContent = "Il carrello è vuoto!";
        return;
    }
    let totale = calcolaTotaleCarrello();
    sessionRevenue += totale;
    
    registraVendite();
    document.getElementById('sessionTotal').textContent = `Incasso Totale: €${sessionRevenue.toFixed(2)}`;
    alert(`Pagamento POS di €${totale.toFixed(2)} approvato.`);
    
    cart = [];
    aggiornaCarrelloUI();
}

function pagaContanti() {
    const cashInput = document.getElementById('cashInput');
    const errorMsg = document.getElementById('errorMsg');
    errorMsg.textContent = '';

    if (cart.length === 0) {
        errorMsg.textContent = "Il carrello è vuoto!";
        return;
    }

    let contantiRicevuti = parseFloat(cashInput.value);
    let totale = calcolaTotaleCarrello();

    if (isNaN(contantiRicevuti) || contantiRicevuti < totale) {
        errorMsg.textContent = "Contanti insufficienti o non validi!";
        return;
    }

    let resto = contantiRicevuti - totale;

    currentFund += totale;
    sessionRevenue += totale;

    registraVendite();
    document.getElementById('fundStatus').textContent = `Fondo Cassa: €${currentFund.toFixed(2)}`;
    document.getElementById('sessionTotal').textContent = `Incasso Totale: €${sessionRevenue.toFixed(2)}`;

    document.getElementById('modalChangeAmount').textContent = `€${resto.toFixed(2)}`;
    document.getElementById('changeModal').style.display = 'flex';

    cart = [];
    cashInput.value = '';
    aggiornaCarrelloUI();
}

function chiudiModalResto() {
    document.getElementById('changeModal').style.display = 'none';
}

function chiusuraCassa() {
    if (confirm("Vuoi azzerare la sessione e riportare il fondo cassa a 250.00€?")) {
        currentFund = 250.00;
        sessionRevenue = 0.00;
        cart = [];
        salesRegistry = {};
        document.getElementById('fundStatus').textContent = `Fondo Cassa: €250.00`;
        document.getElementById('sessionTotal').textContent = `Incasso Totale: €0.00`;
        document.getElementById('salesStatsList').innerHTML = `<small style="color: #aaa;">Nessuna vendita effettuata.</small>`;
        aggiornaCarrelloUI();
    }
}

// Avvio
caricaProdotti();