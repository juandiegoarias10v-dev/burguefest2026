const firebaseConfig = {
    apiKey: "AIzaSyCwcCFXtJqWL55ExHFDti3G3Ri18mvNJuU",
    authDomain: "burguerfest.firebaseapp.com",
    projectId: "burguerfest",
    databaseURL: "https://burguerfest-default-rtdb.firebaseio.com/"
};
firebase.initializeApp(firebaseConfig);
const database = firebase.database();

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

const urlParams = new URLSearchParams(window.location.search);
let restID = urlParams.get('rest') || "1";
const datosRest = restaurantes[restID] || restaurantes["1"];
let ratingActual = 0;

document.addEventListener('DOMContentLoaded', () => {
    const restNameElement = document.getElementById('rest-name');
    const logoImg = document.getElementById('logo-rest-img');
    const logoContainer = document.getElementById('logo-rest-container');

    // Cargar Nombre y Logo Dinámico
    restNameElement.innerText = datosRest.nombre;
    logoImg.src = datosRest.logo;

    // Diferenciar al Campeón (ID 3)
    if (restID === "3") {
        logoContainer.classList.add('is-campeon-vote');
        restNameElement.classList.add('text-campeon');
        restNameElement.innerHTML = "🏆 " + datosRest.nombre + " 🏆";
    }

    // Escuchar votos en tiempo real
    database.ref('contadores/' + restID).on('value', snap => {
        document.getElementById('votos-info').innerText = `🔥 ${snap.val() || 0} JURADOS CALIFICARON AQUÍ`;
    });

    if (localStorage.getItem(`voto_${restID}`)) {
        const d = JSON.parse(localStorage.getItem(`voto_${restID}`));
        mostrarTicketFinal(d.nombre, d.puntos, d.jurado);
    }
});

async function validarIngreso() {
    const code = document.getElementById('code').value.trim().toUpperCase();
    const btn = document.getElementById('btn-validar');
    
    if(!code) return alert("Ingresa el código del ticket");

    btn.disabled = true;
    const snap = await database.ref('codigos_validos/' + code).once('value');
    
    if (snap.val() === "disponible") {
        document.getElementById('login-section').style.display = 'none';
        document.getElementById('vote-section').style.display = 'block';
        document.getElementById('p-bar').style.width = "66%";
    } else {
        alert("Código inválido o ya usado.");
        btn.disabled = false;
    }
}

function setRating(n) {
    ratingActual = n;
    document.querySelectorAll('.stars span').forEach((s, i) => s.classList.toggle('active', i < n));
    document.getElementById('btn-votar').disabled = false;
    document.getElementById('rating-label').innerText = ["", "Mala", "Regular", "Buena", "Muy Buena", "¡Increíble!"][n];
}

async function enviarVoto() {
    const name = document.getElementById('username').value.trim();
    const phone = document.getElementById('phone').value.trim();
    const code = document.getElementById('code').value.trim().toUpperCase();

    if (!name || phone.length < 10) return alert("Completa tus datos");

    database.ref('contadores/' + restID).transaction(c => (c || 0) + 1, async (err, comm, snap) => {
        if (comm) {
            const juradoID = "PLN-" + String(snap.val()).padStart(3, '0');
            const datos = { nombre: name, puntos: ratingActual, jurado: juradoID };
            
            await database.ref('votos/' + restID + '/' + phone).set(datos);
            await database.ref('codigos_validos/' + code).set("usado");
            localStorage.setItem(`voto_${restID}`, JSON.stringify(datos));
            
            mostrarTicketFinal(name, ratingActual, juradoID);
        }
    });
}

function mostrarTicketFinal(name, puntos, id) {
    confetti({ particleCount: 150, spread: 70 });
    const waMsg = encodeURIComponent(`¡Califiqué a ${datosRest.nombre} con ${puntos} estrellas en el Planadas Burger Fest! 🍔`);
    
    document.getElementById('main-card').innerHTML = `
        <div class="ticket-final fade-in">
            <h3>${name}</h3>
            <div class="big-score">${puntos}.0</div>
            <div class="id-badge">${id}</div>
            <a href="https://wa.me/?text=${waMsg}" target="_blank" class="btn-action" style="background:#25D366; text-decoration:none; display:block; margin-bottom:10px;">WHATSAPP 📱</a>
            <button onclick="window.location.href='index.html'" class="btn-action" style="background:transparent; border:1px solid #333;">INICIO</button>
        </div>`;
    document.getElementById('p-bar').style.width = "100%";
}
