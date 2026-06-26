// 1. CONFIGURACIÓN DE SUPABASE
const SUPABASE_URL = "https://sfeckkggzfokbhexmoao.supabase.co";
const SUPABASE_KEY = "sb_publishable_6k_ysIBmr16TMhllsZF4mg_UEsS_zYr";

// INICIALIZACIÓN SEGURA: Usamos la librería cargada globalmente por el CDN
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// 2. CONFIGURACIÓN GEOGRÁFICA
const MURCIA_CENTRO = [37.9922, -1.1307];
const MURCIA_BOUNDS = L.latLngBounds(L.latLng(37.3, -2.2), L.latLng(38.8, -0.6));

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
    let id = localStorage.getItem("murciapin_user_id");
    if (!id) {
        id = 'user-' + Math.random().toString(36).substring(2, 11) + '-' + Date.now();
        localStorage.setItem("murciapin_user_id", id);
    }
    ID_USUARIO = id;
}

function inicializarMapa() {
    map = L.map('map', { maxBounds: MURCIA_BOUNDS, maxBoundsViscosity: 0.8 }).setView(MURCIA_CENTRO, 14);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '© OpenStreetMap'
    }).addTo(map);
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

function calcularFechaExpiracion(tipo) {
    const ahora = new Date();
    const duraciones = { 'musica': 2, 'deporte': 3, 'social': 3, 'comida': 2, 'gaming': 4, 'cultura': 5, 'aviso': 2 };
    ahora.setHours(ahora.getHours() + (duraciones[tipo.toLowerCase()] || 2));
    return ahora.toISOString();
}

async function cargarEventos() {
    const { data: events, error } = await supabase
        .from('events')
        .select('*')
        .gt('expires_at', new Date().toISOString());

    if (error) return;

    events.forEach(evento => {
        const iconos = { musica: "🎵", deporte: "⚽", social: "🍻", comida: "🍔", gaming: "🎮", cultura: "🎨", aviso: "🚨" };
        L.marker([evento.lat, evento.lng])
            .addTo(map)
            .bindPopup(`${iconos[evento.type.toLowerCase()] || "📍"} <b>${evento.type}</b><br>${evento.comment}`);
    });
}

async function guardarEventoEnSupabase(e) {
    e.preventDefault();
    
    // MODO ADMINISTRADOR: Si activas esto, enviamos 'admin' y el trigger de SQL
