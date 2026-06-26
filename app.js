// 1. CONFIGURACIÓN DE SUPABASE
const SUPABASE_URL = "https://sfeckkggzfokbhexmoao.supabase.co";
const SUPABASE_KEY = "sb_publishable_6k_ysIBmr16TMhllsZF4mg_UEsS_zYr";
// Corrección: Inicializamos usando 'Supabase.createClient' con la "S" mayúscula
const supabase = Supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// 2. CONFIGURACIÓN GEOGRÁFICA (Región de Murcia)
const MURCIA_CENTRO = [37.9922, -1.1307];
const MURCIA_BOUNDS = L.latLngBounds(
    L.latLng(37.3, -2.2), // Suroeste
    L.latLng(38.8, -0.6)  // Noreste
);

let map;
let ID_USUARIO;

// Elementos del DOM del panel flotante
let bottomSheet, btnCloseSheet, formEvento, btnAddPin;

// 3. INICIALIZACIÓN DE LA APP
document.addEventListener("DOMContentLoaded", () => {
    // Vincular elementos de la interfaz
    bottomSheet = document.getElementById("bottom-sheet");
    btnCloseSheet = document.getElementById("btn-close-sheet");
    formEvento = document.getElementById("form-evento");
    btnAddPin = document.getElementById("btn-add-pin");

    obtenerOIdAnonimo();
    inicializarMapa();
    configurarEventosInterfaz();
    cargarEventos();
});

// Fase 6: Identificador anónimo para el navegador del usuario
function obtenerOIdAnonimo() {
    let id = localStorage.getItem("murciapin_user_id");
    if (!id) {
        // Generador alternativo ultra-compatible para entornos locales sin HTTPS
        id = 'user-' + Math.random().toString(36).substring(2, 11) + '-' + Date.now();
        localStorage.setItem("murciapin_user_id", id);
    }
    ID_USUARIO = id;
}

// Fase 2 y 3: Inicializar Leaflet centrado en Murcia
function inicializarMapa() {
    map = L.map('map', {
        maxBounds: MURCIA_BOUNDS,
        maxBoundsViscosity: 0.8
    }).setView(MURCIA_CENTRO, 14);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '© OpenStreetMap'
    }).addTo(map);

    // Intentar geolocalizar al usuario
    map.locate({ setView: true, maxZoom: 15 });

    map.on('locationerror', () => {
        map.setView(MURCIA_CENTRO, 14);
    });

    // Fase 4: Al hacer clic en el mapa, preparamos la posición para el pin
    map.on('click', (e) => {
        abrirFormularioPin(e.latlng.lat, e.latlng.lng);
    });
}

// 4. CONTROL DEL INTERFAZ (Bottom Sheet)
function configurarEventosInterfaz() {
    // Cerrar panel al darle a la "X"
    btnCloseSheet.addEventListener("click", cerrarFormularioPin);

    // Botón flotante "+" por si el usuario prefiere pinchar ahí (usa el centro del mapa)
    btnAddPin.addEventListener("click", () => {
        const centro = map.getCenter();
        abrirFormularioPin(centro.lat, centro.lng);
    });

    // Fase 4: Capturar el envío del formulario
    formEvento.addEventListener("submit", guardarEventoEnSupabase);
}

function abrirFormularioPin(lat, lng) {
    // Insertamos las coordenadas en los inputs ocultos del formulario
    document.getElementById("form-lat").value = lat;
    document.getElementById("form-lng").value = lng;
    
    // Mostramos el panel deslizando hacia arriba
    bottomSheet.classList.add("show");
}

function cerrarFormularioPin() {
    bottomSheet.classList.remove("show");
    formEvento.reset();
}

// Fase 5: Calcular horas de vida del pin según su tipo
function calcularFechaExpiracion(tipo) {
    const ahora = new Date();
    let horasDeVida = 2; // Por defecto 2 horas

    switch (tipo.toLowerCase()) {
        case 'musica': horasDeVida = 2; break;
        case 'deporte': horasDeVida = 3; break;
        case 'social': horasDeVida = 3; break;
        case 'comida': horasDeVida = 2; break;
        case 'gaming': horasDeVida = 4; break;
        case 'cultura': horasDeVida = 5; break;
        case 'aviso': horasDeVida = 2; break;
    }

    ahora.setHours(ahora.getHours() + horasDeVida);
    return ahora.toISOString();
}

// Fase 3: Leer eventos de Supabase y pintarlos
async function cargarEventos() {
    const ahora = new Date().toISOString();

    const { data: events, error } = await supabase
        .from('events')
        .select('*')
        .gt('expires_at', ahora); // Filtramos expirados automáticamente en backend

    if (error) {
        console.error("Error cargando pines:", error);
        return;
    }

    // Pintar cada marcador en el mapa
    events.forEach(evento => {
        const iconos = {
            musica: "🎵", deporte: "⚽", social: "🍻", 
            comida: "🍔", gaming: "🎮", cultura: "🎨", aviso: "🚨"
        };
        const emoji = iconos[evento.type.toLowerCase()] || "📍";

        const marcador = L.marker([evento.lat, evento.lng]).addTo(map);
        const contenidoPopup = `
            <div class="popup-evento">
                <div class="tipo">${emoji} ${evento.type}</div>
                <p><strong>${evento.comment}</strong></p>
            </div>
        `;
        marcador.bindPopup(contenidoPopup);
    });
}

// Fase 4: Enviar el Pin definitivo a Supabase
async function guardarEventoEnSupabase(e) {
    e.preventDefault(); // Evita que la página se recargue

    const lat = parseFloat(document.getElementById("form-lat").value);
    const lng = parseFloat(document.getElementById("form-lng").value);
    const type = document.getElementById("event-type").value;
    const comment = document.getElementById("event-comment").value;
    
    // Calculamos cuándo caducará automáticamente
    const expires_at = calcularFechaExpiracion(type);

    // Guardamos en Supabase
    const { error } = await supabase
        .from('events')
        .insert([
            {
                lat: lat,
                lng: lng,
                type: type,
                comment: comment,
                expires_at: expires_at,
                user_id: ID_USUARIO // Mandamos nuestro identificador anónimo
            }
        ]);

    if (error) {
        alert("¡Vaya! Algo ha fallado al soltar el pin: " + error.message);
        return;
    }

    // Si todo va bien, cerramos panel, refrescamos mapa y damos feedback
    cerrarFormularioPin();
    
    // Recarga rápida para pintar el pin recién creado
    location.reload(); 
}