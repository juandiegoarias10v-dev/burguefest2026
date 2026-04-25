/**
 * PLANADAS BURGER FEST 2026 - LOGIC ENGINE
 * Desarrollado para: Viaja por Planadas
 */

// 1. CONFIGURACIÓN FIREBASE
const firebaseConfig = {
    apiKey: "AIzaSyCwcCFXtJqWL55ExHFDti3G3Ri18mvNJuU",
    authDomain: "burguerfest.firebaseapp.com",
    projectId: "burguerfest",
    databaseURL: "https://burguerfest-default-rtdb.firebaseio.com/"
};

// Inicializar Firebase
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}
const database = firebase.database();

// 2. BASE DE DATOS LOCAL DE RESTAURANTES
const restaurantes = {
    "1": { nombre: "LA OBSESIÓN", logo: "laobcecion.png" },
    "2": { nombre: "MISTER HONGO", logo: "MISTERHONGO.png" },
    "3": { nombre: "EL BARRIL DEL FERCHO", logo: "BARRILFERCHO.png" },
    "4": { nombre: "SABOR GOURMET", logo: "SABORGOURMET.png" },
    "5": { nombre: "JAVAR", logo: "JAVAR.png" },
    "6": { nombre: "CIELITO LINDO", logo: "CIELITOLINDO.png" },
    "7": { nombre: "CAFÉ GORRIÓN", logo: "cafegorrion.png" },
    "8": { nombre: "PEDREGAL", logo: "PEDREGAL.png" }
};

// 3. VARIABLES DE ESTADO GLOBAL
const urlParams = new URLSearchParams(window.location.search);
let restID = urlParams.get('rest') || "1"; // Por defecto el 1 si no hay ID
const datosRest = restaurantes[restID] || restaurantes["1"];
let ratingActual = 0;

// 4. INICIALIZACIÓN AL CARGAR LA PÁGINA
document.addEventListener('DOMContentLoaded', () => {
    // Setea el nombre del restaurante en la UI
    const restNameElement = document.getElementById('rest-name');
    if (restNameElement) restNameElement.innerText = datosRest.nombre;

    // Escucha en tiempo real los votos de este restaurante específico
    database.ref('contadores/' + restID).on('value', (snap) => {
        const votosInfo = document.getElementById('votos-info');
        if (votosInfo) {
            votosInfo.innerText = `🔥 ${snap.val() || 0} JURADOS HAN CALIFICADO AQUÍ`;
        }
    });

    // Verificar si el usuario ya votó en este restaurante (Persistencia local)
    const votoGuardado = localStorage.getItem(`voto_${restID}`);
    if (votoGuardado) {
        const d = JSON.parse(votoGuardado);
        mostrarTicketFinal(d.nombre, d.puntos, d.jurado);
    }
});

// 5. VALIDACIÓN DEL TICKET
async function validarIngreso() {
    const codeInput = document.getElementById('code');
    const code = codeInput.value.trim().toUpperCase();
    const btn = document.getElementById('btn-validar');

    if (code.length < 4) {
        alert("Por favor ingresa un código de ticket válido.");
        return;
    }

    btn.disabled = true;
    btn.innerText = "VERIFICANDO...";

    try {
        const snap = await database.ref('codigos_validos/' + code).once('value');
        const estado = snap.val();

        if (estado === "disponible") {
            // Transición a la sección de votación
            document.getElementById('login-section').style.display = 'none';
            document.getElementById('vote-section').style.display = 'block';
            document.getElementById('p-bar').style.width = "66%";
        } else if (estado === "usado") {
            alert("Este código ya fue utilizado anteriormente.");
            btn.disabled = false;
            btn.innerText = "ENTRAR A VOTAR 🔥";
        } else {
            alert("Código no encontrado. Verifica el código de tu ticket físico.");
            btn.disabled = false;
            btn.innerText = "ENTRAR A VOTAR 🔥";
        }
    } catch (error) {
        console.error(error);
        alert("Error de conexión. Intenta de nuevo.");
        btn.disabled = false;
    }
}

// 6. SISTEMA DE CALIFICACIÓN (ESTRELLAS)
function setRating(n) {
    ratingActual = n;
    const estrellas = document.querySelectorAll('.stars span');
    estrellas.forEach((s, i) => {
        s.classList.toggle('active', i < n);
    });
    
    const label = document.getElementById('rating-label');
    const frases = ["", "¡Podría mejorar! 🤔", "¡Está buena! 👍", "¡Muy sabrosa! 🔥", "¡Excelente sabor! 🍔", "¡La mejor que he probado! 🏆"];
    label.innerText = frases[n];
    label.style.color = "#FFD700";

    document.getElementById('btn-votar').disabled = false;
}

// 7. ENVÍO DE VOTO A FIREBASE
async function enviarVoto() {
    const name = document.getElementById('username').value.trim();
    const phone = document.getElementById('phone').value.trim();
    const code = document.getElementById('code').value.trim().toUpperCase();

    if (!name || phone.length < 10) {
        alert("Por favor completa tu nombre y un celular válido.");
        return;
    }

    const btnVotar = document.getElementById('btn-votar');
    btnVotar.disabled = true;
    btnVotar.innerText = "REGISTRANDO VOTO...";

    // Verificar si el teléfono ya votó en este restaurante específico
    const checkVoto = await database.ref('votos/' + restID + '/' + phone).once('value');
    if (checkVoto.exists()) {
        alert("Ya registraste un voto para este restaurante con este número.");
        btnVotar.disabled = false;
        return;
    }

    // Proceso de votación con Transacción (Para evitar errores de conteo simultáneo)
    database.ref('contadores/' + restID).transaction((actual) => {
        return (actual || 0) + 1;
    }, async (error, committed, snapshot) => {
        if (committed) {
            const numeroJurado = snapshot.val();
            const juradoID = "PLN-" + String(numeroJurado).padStart(3, '0');

            // Guardar datos del voto
            const datosVoto = {
                nombre: name,
                celular: phone,
                puntos: ratingActual,
                jurado: juradoID,
                timestamp: firebase.database.ServerValue.TIMESTAMP
            };

            await database.ref('votos/' + restID + '/' + phone).set(datosVoto);
            
            // Marcar código como usado
            await database.ref('codigos_validos/' + code).set("usado");

            // Guardar en persistencia local
            localStorage.setItem(`voto_${restID}`, JSON.stringify(datosVoto));

            // Verificar si completó los 8 restaurantes
            verificarRutaCompleta(phone, name);

            // Mostrar el ticket final
            mostrarTicketFinal(name, ratingActual, juradoID);
        }
    });
}

// 8. VERIFICACIÓN DE RUTA DE LOS 8
async function verificarRutaCompleta(phone, name) {
    let localesVisitados = 0;
    const ids = Object.keys(restaurantes);

    for (let id of ids) {
        const v = await database.ref('votos/' + id + '/' + phone).once('value');
        if (v.exists()) localesVisitados++;
    }

    if (localesVisitados === 8) {
        alert(`🏆 ¡INCREÍBLE ${name.toUpperCase()}! 🏆\nHas completado la ruta de los 8 restaurantes del Fest. ¡Eres un catador oficial de Planadas!`);
    }
}

// 9. RENDERIZADO DEL TICKET FINAL
function mostrarTicketFinal(name, puntos, id) {
    // Animación de confeti
    confetti({
        particleCount: 150,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#FF4500', '#FFD700', '#FFFFFF']
    });

    // Mensaje para compartir
    const textoCompartir = `¡Acabo de ser jurado del Planadas Burger Fest 2026! 🍔🔥 Califiqué a ${datosRest.nombre} con ${puntos} estrellas. Mi ID de jurado es ${id}. ¡Pide la tuya y vota también!`;
    const urlWhatsApp = `https://wa.me/?text=${encodeURIComponent(textoCompartir)}`;

    const mainCard = document.getElementById('main-card');
    mainCard.innerHTML = `
        <div class="ticket-final fade-in">
            <div class="ticket-header">
                <img src="${datosRest.logo}" alt="Logo Rest" class="logo-ticket">
                <p class="ticket-status">VOTO CONFIRMADO</p>
            </div>
            
            <div class="ticket-body">
                <p class="label-ticket">JURADO CALIFICADOR</p>
                <h3 class="name-ticket">${name.toUpperCase()}</h3>
                
                <div class="score-display">
                    <p>CALIFICACIÓN</p>
                    <div class="big-score">${puntos}.0</div>
                </div>

                <div class="id-badge">${id}</div>
                <p class="rest-tag">@ ${datosRest.nombre}</p>
            </div>

            <div class="ticket-actions">
                <a href="${urlWhatsApp}" target="_blank" class="btn-share">
                    COMPARTIR EN WHATSAPP 📱
                </a>
                <button onclick="window.location.href='index.html'" class="btn-back">
                    VOLVER AL INICIO
                </button>
            </div>
            
            <footer class="ticket-footer">
                <p>VIAJA POR PLANADAS © 2026</p>
            </footer>
        </div>
    `;

    // Actualizar barra de progreso al 100%
    document.getElementById('p-bar').style.width = "100%";
}
