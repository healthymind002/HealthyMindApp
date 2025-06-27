// === VARIABLES GLOBALES ===
let notas = JSON.parse(localStorage.getItem('notas')) || [];
const usuarioActual = 'user1';

// === INICIALIZACIÓN GENERAL ===
document.addEventListener('DOMContentLoaded', () => {
  cargarNotas(usuarioActual);
  configurarEventosPapelera();
  initThemeToggle();
});

['btn-papelera-escritorio', 'btn-papelera-movil'].forEach(id => {
  const btn = document.getElementById(id);
  if (btn) {
    btn.addEventListener('click', function (e) {
      e.preventDefault();
      cargarPapelera(usuarioActual);
    });
  }
});

// === FUNCIONES PRINCIPALES ===
function cargarNotas(usuario) {
  const contenedor = document.getElementById('notes-container');
  if (!contenedor) return;

  const visibles = notas
    .filter(n => (!n.privada || n.autor === usuario) && !n.papelera && !n.archivada)
    .sort((a, b) => {
      if (a.fijada !== b.fijada) return b.fijada - a.fijada;
      if (a.favorita !== b.favorita) return b.favorita - a.favorita;
      return 0;
    });

  contenedor.innerHTML = visibles.length
    ? visibles.map(n => generarHTMLNota(n)).join('')
    : '<p class="no-notes-message">No hay notas disponibles.</p>';

  configurarEventosBotones();
}

function generarHTMLNota(nota) {
  const privacidad = nota.privada ? '<div class="privacy-indicator">🔒</div>' : '';
  const estrellas = `${nota.fijada ? '📌' : ''} ${nota.favorita ? '⭐' : ''}`;
  return `
    <div class="note-card ${nota.color || obtenerColorAleatorio()}" data-id="${nota.id}">
      <div class="note-header">
        <h3>${nota.title} ${estrellas}</h3>
        <div class="dropdown-menu-icon solo-mobile">
<i class="fa-solid fa-ellipsis-vertical"></i>
          <ul class="dropdown-options">
            <li onclick="toggleFavorita(${nota.id})">⭐ Favorito</li>
            <li onclick="toggleFijada(${nota.id})">📌 Fijar</li>
            <li onclick="editarNota(${nota.id})">✏️ Editar</li>
            <li onclick="archivarNota(${nota.id})">📁 Archivar</li>
            <li onclick="eliminarNota(${nota.id})">🗑️ Eliminar</li>
          </ul>
        </div>
      </div>
      ${privacidad}
      <div class="note-content-preview scrollable-content ${nota.expanded ? 'expanded' : ''}" data-id="${nota.id}">${nota.content}</div>
    </div>
  `;
}

function toggleFavorita(id) {
  const nota = notas.find(n => n.id === id);
  if (nota) {
    nota.favorita = !nota.favorita;
    guardarNotas();
    cargarNotas(usuarioActual);
  }
}

function toggleFijada(id) {
  const nota = notas.find(n => n.id === id);
  if (nota) {
    nota.fijada = !nota.fijada;
    guardarNotas();
    cargarNotas(usuarioActual);
  }
}

function editarNota(id) {
  window.location.href = `escribirnota.html?id=${id}`;
}

function archivarNota(id) {
  const nota = notas.find(n => n.id === id);
  if (nota) {
    nota.archivada = true;
    guardarNotas();
    cargarNotas(usuarioActual);
  }
}

function eliminarNota(id) {
  const i = notas.findIndex(n => n.id === id);
  if (i !== -1) {
    notas[i].papelera = true;
    guardarNotas();
    cargarNotas(usuarioActual);
  }
}

function guardarNotas() {
  localStorage.setItem('notas', JSON.stringify(notas));
}

function obtenerColorAleatorio() {
  const colores = ['blue', 'black', 'purple', 'green', 'orange', 'pink', 'gray'];
  return colores[Math.floor(Math.random() * colores.length)];
}

// === PAPELERA ===
function cargarPapelera(usuario) {
  const contenedor = document.getElementById('notes-container');
  if (!contenedor) return;

  const eliminadas = notas.filter(n => n.papelera && n.autor === usuario);
  contenedor.innerHTML = eliminadas.length
    ? eliminadas.map(n => `
  <div class="note-card ${n.color || obtenerColorAleatorio()}" data-id="${n.id}">
    <h3>${n.title}</h3>
    <div class="note-content-preview scrollable-content ${n.expanded ? 'expanded' : ''}" data-id="${n.id}">${n.content}</div>
    <div class="note-actions">
      <button class="btn-restore" title="Restaurar">♻️</button>
      <button class="btn-delete-permanente" title="Eliminar definitivamente">❌</button>
    </div>
  </div>
`).join('')
    : '<p class="no-notes-message">No hay notas en la papelera.</p>';

  configurarEventosPapelera();
}

function cargarArchivadas(usuario) {
  const contenedor = document.getElementById('notes-container');
  if (!contenedor) return;

  const archivadas = notas.filter(n => n.archivada && n.autor === usuario);
  contenedor.innerHTML = archivadas.length
    ? archivadas.map(n => `
  <div class="note-card ${n.color || obtenerColorAleatorio()}" data-id="${n.id}">
    <h3>${n.title}</h3>
    <div class="note-content-preview scrollable-content ${n.expanded ? 'expanded' : ''}" data-id="${n.id}">${n.content}</div>
    <div class="note-actions">
      <button class="btn-unarchive" title="Desarchivar">📤</button>
    </div>
  </div>
`).join('')
    : '<p class="no-notes-message">No hay notas archivadas.</p>';

  configurarEventosBotones();
  configurarEventosArchivadas();
}

function configurarEventosArchivadas() {
  document.querySelectorAll('.btn-unarchive').forEach(btn =>
    btn.onclick = () => {
      const id = parseInt(btn.closest('.note-card').dataset.id);
      const nota = notas.find(n => n.id === id);
      if (nota) {
        nota.archivada = false;
        guardarNotas();
        cargarArchivadas(usuarioActual);
      }
    });
}

function configurarEventosPapelera() {
  document.querySelectorAll('.btn-restore').forEach(btn =>
    btn.onclick = () => {
      const id = parseInt(btn.closest('.note-card').dataset.id);
      const i = notas.findIndex(n => n.id === id);
      if (i !== -1) {
        notas[i].papelera = false;
        guardarNotas();
        cargarPapelera(usuarioActual);
      }
    });

  document.querySelectorAll('.btn-delete-permanente').forEach(btn =>
    btn.onclick = () => {
      const id = parseInt(btn.closest('.note-card').dataset.id);
      if (confirm('¿Eliminar permanentemente esta nota?')) {
        notas = notas.filter(n => n.id !== id);
        guardarNotas();
        cargarPapelera(usuarioActual);
      }
    });
}

function configurarEventosBotones() {
  document.querySelectorAll('.dropdown-options').forEach(menu => {
    menu.classList.remove('show');
  });

  document.querySelectorAll('.dropdown-menu-icon').forEach(icon => {
    icon.addEventListener('click', function (e) {
      e.stopPropagation();

      // Cierra todos los demás
      document.querySelectorAll('.dropdown-options.show').forEach(menu => {
        if (menu !== icon.querySelector('.dropdown-options')) {
          menu.classList.remove('show');
        }
      });

      // Abre el menú actual
      const menu = icon.querySelector('.dropdown-options');
      menu.classList.toggle('show');
    });
  });

  document.addEventListener('click', () => {
    document.querySelectorAll('.dropdown-options').forEach(menu => {
      menu.classList.remove('show');
    });
  });
}

// === MODO OSCURO ===
function initThemeToggle() {
  const body = document.body;
  const toggle = document.getElementById('toggle-theme');
  const status = document.getElementById('theme-status');

  const setTheme = isDark => {
    body.classList.toggle('dark-mode', isDark);
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
    if (status) status.textContent = isDark ? 'Oscuro' : 'Claro';
  };

  setTheme(localStorage.getItem('theme') === 'dark');
  if (toggle) toggle.onclick = () => setTheme(!body.classList.contains('dark-mode'));
}

// === BÚSQUEDA ===
document.getElementById('search-notes').addEventListener('input', function () {
  const searchValue = this.value.toLowerCase();
  const noteCards = document.querySelectorAll('.note-card');

  noteCards.forEach(card => {
    const title = card.querySelector('h3')?.textContent.toLowerCase() || '';
    const content = card.querySelector('p')?.textContent.toLowerCase() || '';
    card.style.display = (title.includes(searchValue) || content.includes(searchValue)) ? 'block' : 'none';
  });
});

function mostrarNotificacion(mensaje) {
  const noti = document.getElementById('notification');
  const texto = document.getElementById('notification-text');

  texto.textContent = mensaje;
  noti.classList.add('show');

  setTimeout(() => {
    noti.classList.remove('show');
  }, 3000); // Desaparece en 3 segundos
}

