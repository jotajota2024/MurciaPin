// 1. CONFIGURACIÓN DE SUPABASE
const SUPABASE_URL = "https://sfeckkggzfokbhexmoao.supabase.co";
const SUPABASE_KEY = "sb_publishable_6k_ysIBmr16TMhllsZF4mg_UEsS_zYr";

// Inicialización correcta usando la destructuración de la librería
const { createClient } = supabase;
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// 2. CONFIGURACIÓN GEOGRÁFICA
const MURCIA_CENTRO = [37.9922, -1.1307];
const MURCIA_BOUNDS = L.latLngBounds(
    L.latLng(37.3, -2.2), 
    L.latLng(38.8, -0.6)
);

let map;
let ID_USUARIO;

// Elementos del DOM
let bottomSheet, btnCloseSheet, formEvento, btnAddPin;

// 3. INICIALIZACIÓN
document.addEventListener("DOMContentLoaded", () => {
    bottomSheet = document.getElementById("bottom-sheet");
    btnCloseSheet = document.getElementById("btn-close-sheet");
    formEvento = document.getElementById("form-evento");
    btnAddPin = document.getElementById("btn-add-pin");

    obtenerOIdAnonimo();
    inicializarMapa();
    configurarEventosInterfaz();
    cargarEventos();
});

function obtenerOIdAnonimo() {
    // Generamos un ID amigable para la base de datos (tipo TEXT)
    let id = localStorage.getItem("murciapin_user_id");
    if (!id) {
        id = 'user-' + Math.random().toString(36).substring(2, 11);
        localStorage.setItem("murciapin_user_id", id);
    }
    ID_USUARIO = id;
}

function inicializarMapa() {
    map = L.map('map', {
        maxBounds: MURCIA_BOUNDS,
        maxBoundsViscosity: 0.8
    }).setView(MURCIA_CENTRO, 14);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '© OpenStreetMap'
    }).addTo(map);

    map.locate({ setView: true, maxZoom: 15 });
    map.on('locationerror', () => map.setView(MURCIA_CENTRO, 14));

    map.on('click', (e) => abrirFormularioPin(e.latlng.lat, e.latlng.lng));
}

function configurarEventosInterfaz() {
    btnCloseSheet.addEventListener("click", cerrarFormularioPin);
    btnAddPin.addEventListener("click", () => {
        const centro = map.getCenter();
        abrirFormularioPin(centro.lat, centro.lng);
    });
    formEvento.addEventListener("submit", guardarEventoEnSupabase);
}

function abrirFormularioPin(lat, lng) {
    document.getElementById("form-lat").value = lat;
    document.getElementById("form-lng").value = lng;
    bottomSheet.classList.add("show");
}

function cerrarFormularioPin() {
    bottomSheet.classList.remove("show");
    formEvento.reset();
}

async function cargarEventos() {
    const ahora = new Date().toISOString();
    const { data: events, error } = await supabase
        .from('events')
        .select('*')
        .gt('expires_at', ahora);

    if (error) return;

    events.forEach(evento => {
        const iconos = { musica: "🎵", deporte: "⚽", social: "🍻", comida: "🍔", gaming: "🎮", cultura: "🎨", aviso: "🚨" };
        const emoji = iconos[evento.type.toLowerCase()] || "📍";
        L.marker([evento.lat, evento.lng]).addTo(map).bindPopup(`
            <div class="popup-evento">
                <div class="tipo">${emoji} ${evento.type}</div>
                <p><strong>${evento.comment}</strong></p>
            </div>
        `);
    });
}

async function guardarEventoEnSupabase(e) {
    e.preventDefault();

    const { error } = await supabase.from('events').insert([{
        lat: parseFloat(document.getElementById("form-lat").value),
        lng: parseFloat(document.getElementById("form-lng").value),
        type: document.getElementById("event-type").value,
        comment: document.getElementById("event-comment").value,
        expires_at: new Date(new Date().getTime() + 2 * 60 * 60 * 1000).toISOString(),
        user_id: ID_USUARIO
    }]);

    if (error) {
        alert("Error: " + error.message);
    } else {
        location.reload();
    }
}
