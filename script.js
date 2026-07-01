// Inicialización de mapa
const map = L.map('map').setView([38.0, -1.1], 13);
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