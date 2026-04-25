// CONFIGURACIÓN DE FIREBASE
const firebaseConfig = {
    apiKey: "AIzaSyCwcCFXtJqWL55ExHFDti3G3Ri18mvNJuU",
    authDomain: "burguerfest.firebaseapp.com",
    projectId: "burguerfest",
    databaseURL: "https://burguerfest-default-rtdb.firebaseio.com/"
};
firebase.initializeApp(firebaseConfig);
const database = firebase.database();

// BASE DE DATOS DE RESTAURANTES
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

// CAPTURA DE PARÁMETROS URL
const urlParams = new URLSearchParams(window.location.search);
let restID = urlParams.get('rest') || "1";
const datosRest = restaurantes[restID] || restaurantes["1"];
let ratingActual = 0;

// INICIALIZACIÓN DE LA PÁGINA
document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('rest-name').innerText = datosRest.nombre;
    document.getElementById('logo-rest-img').src = datosRest.logo;
    
    // Escuchar contador de votos en tiempo real
    database.ref('contadores/' + restID).on('value', snap => {
        const totalVotos = snap.val() || 0;
        document.getElementById('votos-info').innerText = `🔥 ${totalVotos} JURADOS HAN CALIFICADO AQUÍ`;
    });
});

// PASO 1: VALIDAR INGRESO CON CÓDIGO
async function validarIngreso() {
    const code = document.getElementById('code').value.trim().toUpperCase();
    if(!code) return alert("Ingresa tu código");
    
    try {
        const snap = await database.ref('codigos_validos/' + code).once('value');
        if (snap.val() === "disponible") {
            document.getElementById('login-section').style.display = 'none';
            document.getElementById('vote-section').style.display = 'block';
            document.getElementById('p-bar').style.width = "66%";
        } else {
            alert("Código inválido o ya usado.");
        }
    } catch(e) { 
        console.error(e);
        alert("Error de conexión: Revisa tus reglas de Firebase."); 
    }
}

// PASO 2: SELECCIÓN DE ESTRELLAS
function setRating(n) {
    ratingActual = n;
    document.querySelectorAll('.stars span').forEach((s, i) => {
        s.classList.toggle('active', i < n);
    });
    document.getElementById('btn-votar').disabled = false;
}

// PASO 3: ENVIAR VOTO Y ACTUALIZAR DB
async function enviarVoto() {
    const name = document.getElementById('username').value.trim();
    const phone = document.getElementById('phone').value.trim();
    const code = document.getElementById('code').value.trim().toUpperCase();

    if (!name || phone.length < 10) return alert("Por favor, completa tus datos correctamente.");

    const btn = document.getElementById('btn-votar');
    btn.disabled = true;
    btn.innerText = "PROCESANDO VOTO...";

    // Transacción para contador exacto
    database.ref('contadores/' + restID).transaction(c => (c || 0) + 1, (err, comm, snap) => {
        if (comm) {
            const juradoID = "PLN-" + String(snap.val()).padStart(4, '0');
            const updates = {};
            updates[`votos/${restID}/${phone}`] = { 
                nombre: name, 
                puntos: ratingActual, 
                fecha: new Date().toISOString() 
            };
            updates[`codigos_validos/${code}`] = "usado";

            database.ref().update(updates)
                .then(() => mostrarTicketFinal(name, ratingActual, juradoID))
                .catch(error => {
                    console.error("Error en update:", error);
                    alert("Error al guardar el voto. Verifica los permisos de escritura."); //
                });
        }
    });
}

// PASO 4: MOSTRAR TICKET Y REDIRECCIÓN
function mostrarTicketFinal(name, puntos, id) {
    // Animación de celebración
    confetti({ 
        particleCount: 150, 
        spread: 70, 
        origin: { y: 0.6 }, 
        colors: ['#FF4500', '#FFD700'] 
    });
    
    const ahora = new Date();
    const fecha = ahora.toLocaleDateString();
    const hora = ahora.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });

    const textoWA = `🍔 ¡Acabo de calificar la hamburguesa de *${datosRest.nombre}* en el Burger Fest 2026! \n\nMi nota como jurado: *${puntos}.0/5.0* ⭐ \n\n¡Está brutal, tienes que probarla! 🔥🤤`;
    const waLink = `https://wa.me/?text=${encodeURIComponent(textoWA)}`;

    // Reemplazo de contenido con Ticket Final
    document.getElementById('main-card').innerHTML = `
        <div class="ticket-capture fade-in" style="background:#fff; color:#000; border-radius:25px; overflow:hidden;">
            <div style="background:#000; padding:20px; text-align:center; border-bottom:3px solid #FFD700;">
                <img src="Logo.png" style="width:35px; margin-bottom:5px;"><br>
                <span style="letter-spacing:3px; font-size:10px; color:#FFD700; font-weight:900;">JURADO CALIFICADOR 2026</span>
            </div>
            <div style="padding:35px 20px; text-align:center; background-image: radial-gradient(#ddd 1.5px, transparent 1.5px); background-size: 20px 20px;">
                <img src="${datosRest.logo}" style="width:85px; height:85px; border-radius:50%; border:3px solid #000; margin-bottom:15px; object-fit:cover;">
                <h2 style="font-size:22px; font-weight:900; margin:0; text-transform:uppercase;">${datosRest.nombre}</h2>
                <p style="margin:25px 0 5px 0; font-size:9px; color:#999;">CERTIFICADO EMITIDO A:</p>
                <h2 style="margin:0 0 25px 0; font-size:26px; color:#e64a19; font-weight:900; text-transform:uppercase;">${name}</h2>
                
                <div style="background:#000; color:#fff; padding:25px; border-radius:22px; width:80%; margin:0 auto;">
                    <span style="font-size:65px; font-weight:900; color:#FFD700; line-height:1;">${puntos}.0</span>
                    <span style="font-size:35px; color:#FFD700;">★</span>
                    <p style="margin:5px 0 0 0; font-size:9px; letter-spacing:2px; font-weight:700; opacity:0.8;">PUNTUACIÓN FINAL</p>
                </div>

                <div style="display:flex; justify-content:space-between; margin-top:30px; border-top:1px dashed #bbb; padding-top:20px;">
                    <div style="text-align:left;"><small style="color:#999; display:block; font-size:8px;">ID VOTO</small><strong>#${id}</strong></div>
                    <div style="text-align:center;"><small style="color:#999; display:block; font-size:8px;">FECHA</small><strong>${fecha}</strong></div>
                    <div style="text-align:right;"><small style="color:#999; display:block; font-size:8px;">HORA</small><strong>${hora}</strong></div>
                </div>
            </div>
            <div style="height:15px; background-image: radial-gradient(circle at 10px 15px, transparent 12px, #fff 13px); background-size: 20px 15px; background-repeat: repeat-x;"></div>
        </div>

        <div style="margin-top:25px; display:flex; flex-direction:column; gap:12px;">
            <p style="color:#FFD700; font-size:11px; font-weight:700;">📸 Toma captura y comparte tu certificado</p>
            <a href="${waLink}" target="_blank" style="background:#25D366; color:white; text-decoration:none; padding:18px; border-radius:15px; font-weight:900; text-align:center;">INVITAR AMIGOS POR WHATSAPP 📱</a>
            
            <button onclick="window.location.href='index.html'" style="background:transparent; color:#666; border:1px solid #333; padding:12px; border-radius:15px; cursor:pointer;">FINALIZAR</button>
        </div>
    `;
    document.getElementById('p-bar').style.width = "100%";
}