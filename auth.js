// auth.js - Autenticazione per Cinematta POS
// Le credenziali stanno in utenti.txt, cifrate con AES-256-GCM.
// La chiave viene derivata dalla password con PBKDF2 (SHA-256, 310.000 iterazioni, salt casuale per utente).
// Nel file NON c'è né la password né il suo hash: solo un blocco cifrato che si apre
// esclusivamente con la password giusta (se è sbagliata, l'autenticazione GCM fallisce).
//
// Formato di ogni riga di utenti.txt:  username;salt;iv;datiCifrati   (tutto in base64)

const AUTH_FILE = 'utenti.txt';
const PBKDF2_ITERAZIONI = 310000;
const MAX_TENTATIVI = 5;
const BLOCCO_SECONDI = 30;

const _enc = new TextEncoder();
const _dec = new TextDecoder();

function bytesToB64(bytes) {
    let s = '';
    new Uint8Array(bytes).forEach(b => s += String.fromCharCode(b));
    return btoa(s);
}

function b64ToBytes(b64) {
    return Uint8Array.from(atob(b64), c => c.charCodeAt(0));
}

async function derivaChiave(password, salt) {
    const materiale = await crypto.subtle.importKey(
        'raw', _enc.encode(password), 'PBKDF2', false, ['deriveKey']
    );
    return crypto.subtle.deriveKey(
        { name: 'PBKDF2', salt, iterations: PBKDF2_ITERAZIONI, hash: 'SHA-256' },
        materiale,
        { name: 'AES-GCM', length: 256 },
        false,
        ['encrypt', 'decrypt']
    );
}

// Crea la riga da incollare in utenti.txt
async function creaRigaUtente(username, password, ruolo) {
    username = username.trim().toLowerCase();
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const chiave = await derivaChiave(password, salt);
    const dati = _enc.encode(JSON.stringify({ u: username, ruolo: ruolo }));
    const cifrato = await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv, additionalData: _enc.encode(username) }, chiave, dati
    );
    return [username, bytesToB64(salt), bytesToB64(iv), bytesToB64(cifrato)].join(';');
}

// Restituisce {u, ruolo} se le credenziali sono corrette, altrimenti null
async function verificaCredenziali(testoFile, username, password) {
    username = username.trim().toLowerCase();
    const righe = testoFile.split('\n').map(r => r.trim()).filter(r => r && !r.startsWith('#'));
    const riga = righe.map(r => r.split(';')).find(p => p.length === 4 && p[0] === username);

    // Se l'utente non esiste facciamo comunque una derivazione, per non rivelare
    // (con i tempi di risposta) quali utenti esistono.
    if (!riga) {
        await derivaChiave(password, new Uint8Array(16));
        return null;
    }
    try {
        const [, salt, iv, cifrato] = riga;
        const chiave = await derivaChiave(password, b64ToBytes(salt));
        const chiaro = await crypto.subtle.decrypt(
            { name: 'AES-GCM', iv: b64ToBytes(iv), additionalData: _enc.encode(username) },
            chiave, b64ToBytes(cifrato)
        );
        const dati = JSON.parse(_dec.decode(chiaro));
        return dati.u === username ? dati : null;
    } catch (e) {
        return null; // password errata o file manomesso
    }
}

// ----------------------------------------------------------------------------
// Interfaccia di login (solo nella pagina del POS)
// ----------------------------------------------------------------------------
let utenteCorrente = null;

function avviaLogin() {
    const posContainer = document.querySelector('.pos-container');
    posContainer.style.display = 'none';

    const sessione = sessionStorage.getItem('cinematta_utente');
    if (sessione) {
        try {
            utenteCorrente = JSON.parse(sessione);
            posContainer.style.display = 'flex';
            aggiungiBarraUtente();
            return;
        } catch (e) { sessionStorage.removeItem('cinematta_utente'); }
    }

    const overlay = document.createElement('div');
    overlay.id = 'loginOverlay';
    overlay.className = 'modal';
    overlay.innerHTML = `
        <div class="modal-content" style="border-color:#ff2a7a;">
            <h3 style="color:#ff2a7a;">Cinematta POS - Accesso</h3>
            <input type="text" id="loginUser" class="modal-input" placeholder="Utente" autocomplete="username" style="margin-bottom:10px;">
            <input type="password" id="loginPass" class="modal-input" placeholder="Password" autocomplete="current-password">
            <button class="btn-action" id="loginBtn" style="width:100%; padding:10px;">Accedi</button>
            <div id="loginErr" class="error-msg" style="margin-top:10px;"></div>
        </div>`;
    document.body.appendChild(overlay);

    const userInput = document.getElementById('loginUser');
    const passInput = document.getElementById('loginPass');
    const btn = document.getElementById('loginBtn');
    const err = document.getElementById('loginErr');
    let tentativi = 0;

    async function tentaLogin() {
        if (btn.disabled) return;
        err.textContent = '';
        if (!userInput.value.trim() || !passInput.value) {
            err.textContent = 'Inserisci utente e password.';
            return;
        }
        btn.disabled = true;
        btn.textContent = 'Verifica...';

        let esito = null;
        try {
            const risposta = await fetch(AUTH_FILE, { cache: 'no-store' });
            if (!risposta.ok) throw new Error('file non trovato');
            esito = await verificaCredenziali(await risposta.text(), userInput.value, passInput.value);
        } catch (e) {
            err.textContent = 'Impossibile leggere ' + AUTH_FILE + ' (serve un server locale?).';
            btn.disabled = false;
            btn.textContent = 'Accedi';
            return;
        }

        if (esito) {
            utenteCorrente = esito;
            sessionStorage.setItem('cinematta_utente', JSON.stringify(esito));
            overlay.remove();
            posContainer.style.display = 'flex';
            aggiungiBarraUtente();
            return;
        }

        tentativi++;
        passInput.value = '';
        if (tentativi >= MAX_TENTATIVI) {
            tentativi = 0;
            let resta = BLOCCO_SECONDI;
            const timer = setInterval(() => {
                err.textContent = `Troppi tentativi. Riprova tra ${resta}s.`;
                if (resta-- <= 0) {
                    clearInterval(timer);
                    err.textContent = '';
                    btn.disabled = false;
                    btn.textContent = 'Accedi';
                }
            }, 1000);
            return;
        }
        err.textContent = `Credenziali errate (${tentativi}/${MAX_TENTATIVI}).`;
        btn.disabled = false;
        btn.textContent = 'Accedi';
    }

    btn.onclick = tentaLogin;
    [userInput, passInput].forEach(i => i.addEventListener('keypress', e => { if (e.key === 'Enter') tentaLogin(); }));
    userInput.focus();
}

function aggiungiBarraUtente() {
    const sidebar = document.querySelector('.sidebar-left');
    const barra = document.createElement('div');
    barra.className = 'session-info';
    barra.innerHTML = `<div>👤 <b>${utenteCorrente.u}</b> (${utenteCorrente.ruolo})</div>`;
    const esci = document.createElement('button');
    esci.className = 'btn-danger';
    esci.textContent = 'Esci';
    esci.onclick = () => {
        sessionStorage.removeItem('cinematta_utente');
        location.reload();
    };
    barra.appendChild(esci);
    sidebar.insertBefore(barra, sidebar.children[1]);

    // Solo l'admin può azzerare la cassa
    const chiusuraOriginale = window.chiusuraCassa;
    window.chiusuraCassa = function () {
        if (utenteCorrente.ruolo !== 'admin') {
            alert('Solo un amministratore può eseguire la chiusura cassa.');
            return;
        }
        chiusuraOriginale.apply(this, arguments);
    };
}

if (typeof document !== 'undefined' && document.querySelector('.pos-container')) {
    avviaLogin();
}
