// === VARIABLES GLOBALES ===
let notas = JSON.parse(localStorage.getItem('notas')) || [];
const usuarioActual = 'user1';

// === INICIALIZACIÓN ===
document.addEventListener('DOMContentLoaded', () => {
  initEditor();
  bindBotonPublicar();
  initThemeToggle();
});

function bindBotonPublicar() {
  const btn = document.getElementById('publish-btn');
  if (!btn) return;

  const id = new URLSearchParams(window.location.search).get('id');
  if (id) {
    cargarNotaParaEdicion(id);
    btn.textContent = 'Actualizar';
    btn.onclick = () => actualizarNota(id);
  } else {
    btn.onclick = () => publicarNota(usuarioActual);
  }
}

function publicarNota(usuario) {
  const title = document.getElementById('note-title').value.trim();
  const content = document.getElementById('note-content').innerHTML.trim();
  const privada = document.getElementById('note-private').checked;

  if (!title || !content) {
    alert('Completa el título y el contenido.');
    return;
  }

  notas.push({
    id: Date.now(),
    title, content, privada,
    autor: usuario,
    color: obtenerColorAleatorio(),
    expanded: false,
    fijada: false,
    favorita: false,
    archivada: false,
    papelera: false
  });

  localStorage.setItem('notas', JSON.stringify(notas));

  // ✅ Mostrar notificación visible y retrasar redirección
  mostrarNotificacion("✔️ Nota publicada correctamente");

  // Espera a que se muestre la notificación antes de redirigir
  setTimeout(() => {
    window.location.href = 'notas.html';
  }, 1500);
}

function cargarNotaParaEdicion(id) {
  const nota = notas.find(n => n.id == id);
  if (!nota) return alert('No encontrada');

  document.getElementById('note-title').value = nota.title;
  document.getElementById('note-content').innerHTML = nota.content;
  document.getElementById('note-private').checked = nota.privada;
}

function actualizarNota(id) {
  const title = document.getElementById('note-title').value.trim();
  const content = document.getElementById('note-content').innerHTML.trim();
  const privada = document.getElementById('note-private').checked;

  if (!title || !content) return alert('Completa el título y el contenido.');

  const index = notas.findIndex(n => n.id == id);
  if (index !== -1) {
    notas[index] = { ...notas[index], title, content, privada };
    localStorage.setItem('notas', JSON.stringify(notas));
    alert('Nota actualizada');
    window.location.href = 'notas.html';
  }
}

// === FORMATO DE TEXTO ===
function initEditor() {
  document.querySelectorAll('.format-btn').forEach(btn => {
    btn.onclick = () => {
      if (btn.title.includes('Alinear') || btn.title.includes('Centrar')) {
        document.querySelectorAll('.format-btn[title*="Alinear"], .format-btn[title="Centrar"]')
          .forEach(b => b.classList.remove('active'));
      }
      btn.classList.toggle('active');
      formatText(btn.getAttribute('onclick').match(/'(.+?)'/)[1]);
    };
  });

  const content = document.getElementById('note-content');
  if (content) {
    ['focus', 'blur'].forEach(evt =>
      content.addEventListener(evt, () => {
        if (content.innerHTML.trim() === '') content.innerHTML = '';
      })
    );
  }
}

function formatText(command) {
  document.execCommand(command, false, null);
  document.getElementById('note-content').focus();
}

function obtenerColorAleatorio() {
  const colores = ['blue', 'black', 'purple', 'green', 'orange', 'pink', 'gray'];
  return colores[Math.floor(Math.random() * colores.length)];
}

// Limpia campos
document.getElementById("note-title").value = "";
document.getElementById("note-content").innerHTML = "";
document.getElementById("note-private").checked = false;

// Llama a la función para mostrar en el historial
renderNotes();

function renderNotes() {
  const container = document.getElementById("notes-container");
  if (!container) return;
  container.innerHTML = "";
  const notes = JSON.parse(localStorage.getItem("notas") || "[]");

  notes.forEach(note => {
    const div = document.createElement("div");
    div.className = "note-card";
    div.innerHTML = `
      <h3>${note.title}</h3>
      <p class="note-content-preview">${note.content}</p>
    `;
    container.appendChild(div);
  });
}

// Búsqueda de notas
const buscador = document.getElementById('search-notes');
if (buscador) {
  buscador.addEventListener('input', () => {
    const termino = buscador.value.toLowerCase();
    const notasFiltradas = notas.filter(n =>
      (n.title && n.title.toLowerCase().includes(termino)) ||
      (n.content && n.content.toLowerCase().includes(termino))
    );
    mostrarNotasFiltradas(notasFiltradas);
  });
}

function mostrarNotasFiltradas(lista) {
  const contenedor = document.getElementById('notes-container');
  contenedor.innerHTML = lista.length
    ? lista.map(n => `
        <div class="note-card ${n.color || 'default'}">
          <h3>${n.title}</h3>
          <div class="note-content-preview">${n.content}</div>
        </div>
      `).join('')
    : '<p class="no-notes-message">No se encontraron coincidencias.</p>';
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

  const currentTheme = localStorage.getItem('theme') || 'light';
  setTheme(currentTheme === 'dark');

  if (toggle) {
    toggle.onclick = () => setTheme(!body.classList.contains('dark-mode'));
  }
}



