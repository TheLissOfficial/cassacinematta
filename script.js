<!DOCTYPE html>
<html lang="it">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Cinematta POS</title>
    <link rel="stylesheet" href="style.css">
</head>
<body>

    <!-- POP-UP RESTO -->
    <div id="changeModal" class="modal" style="display: none;">
        <div class="modal-content">
            <h3>Resto da Erogare</h3>
            <div id="modalChangeAmount" class="change-amount">€0.00</div>
            <button class="btn-primary" onclick="chiudiModalResto()">Chiudi</button>
        </div>
    </div>

    <!-- POP-UP SCONTO PERCENTUALE -->
    <div id="discountModal" class="modal" style="display: none;">
        <div class="modal-content">
            <h3>Applica Sconto</h3>
            <p style="font-size: 0.85rem; color: #aaa; margin-bottom: 10px;">Inserisci la percentuale di sconto (%):</p>
            <input type="number" id="discountInputVal" min="0" max="100" value="10" class="modal-input">
            <div class="modal-buttons">
                <button class="btn-success" onclick="confermaSconto()">Conferma</button>
                <button class="btn-danger" onclick="chiudiModalSconto()">Annulla</button>
            </div>
        </div>
    </div>

    <div class="pos-container">
        
        <!-- COLONNA SINISTRA -->
        <div class="sidebar-left">
            <h2>Gestione & Barcode</h2>
            
            <div class="ticket-input-group">
                <label for="barcodeScanInput">Scansiona Barcode:</label>
                <input type="text" id="barcodeScanInput" placeholder="es. 8001 (Invio)...">
            </div>

            <div class="ticket-input-group">
                <label for="ticketPriceInput">Costo Biglietto (€):</label>
                <input type="number" id="ticketPriceInput" step="0.50" min="0" placeholder="es. 8.00">
                <button class="btn-action" onclick="aggiungiBiglietto()">+ Aggiungi Biglietto</button>
            </div>

            <div class="session-info">
                <div id="fundStatus">Fondo Cassa: €250.00</div>
                <div id="sessionTotal">Incasso Totale: €0.00</div>
                <div class="sales-stats" id="salesStatsList">
                    <small style="color: #aaa;">Nessuna vendita effettuata.</small>
                </div>
            </div>
            
            <button class="btn-danger" onclick="chiusuraCassa()">Chiusura Cassa (Reset)</button>
        </div>

        <!-- COLONNA CENTRALE -->
        <div class="main-center">
            <h2>Prodotti Bar & Snack</h2>
            <div class="product-grid" id="productGrid"></div>
        </div>

        <!-- COLONNA DESTRA -->
        <div class="sidebar-right">
            <h2>Carrello</h2>
            <div class="cart-table-wrapper">
                <table class="cart-table">
                    <thead>
                        <tr>
                            <th>Articolo</th>
                            <th>Qtà</th>
                            <th>Prezzo</th>
                            <th>Azioni</th>
                        </tr>
                    </thead>
                    <tbody id="cartTableBody"></tbody>
                </table>
            </div>

            <div class="cart-summary">
                <div class="total-row">
                    <span>Totale:</span>
                    <span id="totalDisplay">€0.00</span>
                </div>
            </div>

            <div class="payment-section">
                <div class="cash-input-group">
                    <label for="cashInput">Contanti Ricevuti (€):</label>
                    <input type="number" id="cashInput" step="0.50" placeholder="0.00">
                </div>
                <div class="payment-buttons">
                    <button class="btn-success" onclick="pagaContanti()">Paga Contanti</button>
                    <button class="btn-info" onclick="pagaPOS()">Paga POS</button>
                </div>
                <div id="errorMsg" class="error-msg"></div>
            </div>
        </div>

    </div>

    <script src="script.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.8.2/jspdf.plugin.autotable.min.js"></script>
    <script src="report.js"></script>
</body>
</html>
