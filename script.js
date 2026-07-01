// Inicialización de mapa
// Busca esta línea y actualízala así:
const map = L.map('map').setView([38.0075, -1.1710], 16);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);

// Cargar actualizaciones de Firebase
db.collection("actualizaciones").onSnapshot((snapshot) => {
    const tablon = document.getElementById('tablon');
    tablon.innerHTML = ''; // Limpiar
    snapshot.forEach((doc) => {
        const post = doc.data();
        tablon.innerHTML += `<div class="card"><h4>${post.titulo}</h4><p>${post.texto}</p></div>`;
    });
});

// Cargar incidencias en el mapa
db.collection("incidencias").onSnapshot((snapshot) => {
    snapshot.forEach((doc) => {
        const {lat, lng, msg} = doc.data();
        L.marker([lat, lng]).addTo(map).bindPopup(msg);
    });
});