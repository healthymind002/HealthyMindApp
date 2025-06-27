// ====== CONFIGURACIÓN Y CONSTANTES ======
const CONFIG = {
  STORAGE_KEYS: {
    USER_DATA: "userData",
    AVATAR: "avatarSeleccionado",
  },
  DEFAULT_AVATAR: "/Imagenes/Avatares/Avatar1.jpg",
  TABS: ["publicaciones", "notas", "megusta", "respuestas"],
};

// ====== CLASE PRINCIPAL DEL PERFIL ======
class PerfilUsuario {
  constructor() {
    this.currentUser = null;
    this.elementos = {};
    this.tabs = new TabManager();
    this.modal = new ModalManager();
    this.init();
  }

  // ====== INICIALIZACIÓN ======
  async init() {
    try {
      this.obtenerElementosDOM();
      this.configurarEventListeners();
      await this.cargarDatosUsuario();
      this.actualizarInterfaz();
      console.log("✅ Perfil inicializado correctamente");
    } catch (error) {
      console.error("❌ Error al inicializar perfil:", error);
      this.mostrarError("Error al cargar el perfil");
    }
  }

  obtenerElementosDOM() {
    // Elementos principales
    this.elementos = {
      // Navegación
      btnVolver: document.getElementById("btnVolver"),
      btnEditarPerfil: document.getElementById("btnEditarPerfil"),

      // Información del usuario
      perfilAvatar: document.getElementById("perfilAvatar"),
      perfilNombre: document.getElementById("perfilNombre"),
      perfilBio: document.getElementById("perfilBio"),
      perfilFechaRegistro: document.getElementById("perfilFechaRegistro"),
      perfilStatus: document.getElementById("perfilStatus"),

      // Estadísticas
      stats: {
        publicaciones: document.getElementById("totalPublicaciones"),
        notas: document.getElementById("totalNotas"),
        meGusta: document.getElementById("totalMeGusta"),
        respuestas: document.getElementById("totalRespuestas"),
      },

      // Modal de edición
      modal: {
        container: document.getElementById("modalEditarPerfil"),
        cerrar: document.getElementById("cerrarModalEditar"),
        cancelar: document.getElementById("btnCancelarEditar"),
        formulario: document.getElementById("formularioEditar"),
        campos: {
          nombre: document.getElementById("editarNombre"),
          bio: document.getElementById("editarBio"),
        },
      },

      // Tabs
      tabBtns: document.querySelectorAll(".tab-btn"),
      tabContents: document.querySelectorAll(".tab-content"),
    };
  }

  configurarEventListeners() {
    // Navegación
    this.elementos.btnVolver?.addEventListener("click", () =>
      this.manejarVolver()
    );
    this.elementos.btnEditarPerfil?.addEventListener("click", () =>
      this.modal.abrir()
    );

    // Modal
    this.elementos.modal.cerrar?.addEventListener("click", () =>
      this.modal.cerrar()
    );
    this.elementos.modal.cancelar?.addEventListener("click", () =>
      this.modal.cerrar()
    );
    this.elementos.modal.formulario?.addEventListener("submit", (e) =>
      this.guardarCambiosPerfil(e)
    );
    this.elementos.modal.container?.addEventListener("mousedown", (e) => {
      // Solo cerrar si el mousedown es directamente en el contenedor del modal
      if (e.target === this.elementos.modal.container) {
        // Verificar que no sea parte de una selección de texto
        if (!window.getSelection().toString()) {
          this.modal.cerrar();
        }
      }
    });

    // Y agregar este evento adicional para manejar clicks después de seleccionar texto:
    this.elementos.modal.container?.addEventListener("click", (e) => {
      // Solo si el click es en el fondo del modal Y no hay texto seleccionado
      if (
        e.target === this.elementos.modal.container &&
        !window.getSelection().toString()
      ) {
        this.modal.cerrar();
      }
    });

    // Tabs
    this.tabs.init(this.elementos.tabBtns);

    // Sincronización de avatar
    this.configurarSincronizacionAvatar();
  }

  // ====== GESTIÓN DE DATOS ======
  async cargarDatosUsuario() {
    try {
      // 1. Intentar cargar desde Firebase (cuando esté implementado)
      if (
        typeof window.FirebaseAuth !== "undefined" &&
        window.FirebaseAuth.currentUser
      ) {
        this.currentUser = await this.cargarDesdeFirebase();
      }
      // 2. Fallback a localStorage para desarrollo
      else {
        this.currentUser = this.cargarDesdeLocalStorage();
      }

      // 3. Si no hay datos, crear usuario por defecto
      if (!this.currentUser) {
        this.currentUser = this.crearUsuarioDefecto();
      }

      console.log("👤 Datos de usuario cargados:", this.currentUser.nombre);
    } catch (error) {
      console.error("❌ Error cargando datos:", error);
      this.currentUser = this.crearUsuarioDefecto();
    }
  }

  // Método para Firebase (implementar cuando conectes)
  async cargarDesdeFirebase() {
    // TODO: Implementar cuando conectes Firebase
    /*
        const user = window.FirebaseAuth.currentUser;
        if (!user) return null;
        
        const userDoc = await window.Firestore.collection('users').doc(user.uid).get();
        if (!userDoc.exists) return null;
        
        return userDoc.data();
        */
    return null;
  }

  cargarDesdeLocalStorage() {
    const userData = localStorage.getItem(CONFIG.STORAGE_KEYS.USER_DATA);
    return userData ? JSON.parse(userData) : null;
  }

  crearUsuarioDefecto() {
    const fechaActual = new Date();
    const usuario = {
      uid: "local_" + Date.now(), // Temporal para desarrollo
      nombre: "Usuario",
      bio: "",
      avatar: this.obtenerAvatarGuardado(),
      fechaRegistro: fechaActual.toISOString(),
      fechaRegistroTexto: fechaActual.toLocaleDateString("es-ES", {
        year: "numeric",
        month: "long",
      }),
      estadisticas: {
        publicaciones: 0,
        notas: 0,
        meGusta: 0,
        respuestas: 0,
      },
      contenido: {
        publicaciones: [],
        notas: [],
        meGusta: [],
        respuestas: [],
      },
      configuracion: {
        perfilPublico: true,
        notificaciones: true,
        tema: "claro",
      },
    };

    // Guardar usuario por defecto
    this.guardarDatos(usuario);
    return usuario;
  }

  obtenerAvatarGuardado() {
    return (
      localStorage.getItem(CONFIG.STORAGE_KEYS.AVATAR) || CONFIG.DEFAULT_AVATAR
    );
  }

  async guardarDatos(datos = null) {
    const datosAGuardar = datos || this.currentUser;

    try {
      // 1. Guardar en Firebase (cuando esté implementado)
      if (
        typeof window.FirebaseAuth !== "undefined" &&
        window.FirebaseAuth.currentUser
      ) {
        await this.guardarEnFirebase(datosAGuardar);
      }

      // 2. Guardar en localStorage como backup
      localStorage.setItem(
        CONFIG.STORAGE_KEYS.USER_DATA,
        JSON.stringify(datosAGuardar)
      );

      console.log("💾 Datos guardados correctamente");
    } catch (error) {
      console.error("❌ Error guardando datos:", error);
      throw error;
    }
  }

  // Método para Firebase (implementar cuando conectes)
  async guardarEnFirebase(datos) {
    // TODO: Implementar cuando conectes Firebase
    /*
        const user = window.FirebaseAuth.currentUser;
        if (!user) throw new Error('Usuario no autenticado');
        
        await window.Firestore.collection('users').doc(user.uid).set(datos, { merge: true });
        */
  }

  // ====== ACTUALIZACIÓN DE INTERFAZ ======
  actualizarInterfaz() {
    if (!this.currentUser) return;

    this.actualizarInformacionBasica();
    this.actualizarEstadisticas();
    this.actualizarEstado();
    this.tabs.actualizarContenido(this.currentUser.contenido);
  }

  actualizarInformacionBasica() {
    const { nombre, fechaRegistroTexto, avatar, bio } = this.currentUser;

    this.elementos.perfilNombre.textContent = nombre;
    this.elementos.perfilFechaRegistro.textContent = `Miembro desde: ${fechaRegistroTexto}`;
    this.elementos.perfilAvatar.src = avatar;
    this.elementos.perfilBio.textContent = bio || "";
  }

  actualizarEstadisticas() {
    const stats = this.currentUser.estadisticas;

    Object.keys(stats).forEach((key) => {
      if (this.elementos.stats[key]) {
        this.elementos.stats[key].textContent = stats[key];
      }
    });
  }

  actualizarEstado() {
    const statusIndicator =
      this.elementos.perfilStatus.querySelector(".status-indicator");
    const statusText =
      this.elementos.perfilStatus.querySelector(".status-text");

    if (statusIndicator && statusText) {
      statusIndicator.className = "status-indicator online";
      statusText.textContent = "En línea";
    }
  }

  // ====== GESTIÓN DE PERFIL ======
  async guardarCambiosPerfil(event) {
    event.preventDefault();

    try {
      const formData = new FormData(event.target);
      const nombre = formData.get("nombre")?.trim();
      const bio = formData.get("bio")?.trim();

      // Validación
      if (!this.validarCamposPerfil(nombre)) return;

      // Actualizar datos
      this.currentUser.nombre = nombre;
      this.currentUser.bio = bio;

      // Guardar
      await this.guardarDatos();

      // Actualizar interfaz
      this.actualizarInterfaz();
      this.modal.cerrar();

      this.mostrarNotificacion(
        "✅ Perfil actualizado correctamente",
        "success"
      );
    } catch (error) {
      console.error("❌ Error guardando perfil:", error);
      this.mostrarError("Error al guardar los cambios");
    }
  }

  validarCamposPerfil(nombre) {
    if (!nombre) {
      this.mostrarError("Por favor completa todos los campos obligatorios");
      return false;
    }
    return true;
  }

  // ====== GESTIÓN DE CONTENIDO ======
  async agregarContenido(tipo, item) {
    try {
      if (!this.currentUser.contenido[tipo]) {
        this.currentUser.contenido[tipo] = [];
      }

      // Agregar timestamp si no existe
      if (!item.fecha) {
        item.fecha = new Date().toISOString();
        item.fechaTexto = new Date().toLocaleDateString("es-ES");
      }

      // Agregar al principio del array
      this.currentUser.contenido[tipo].unshift(item);
      this.currentUser.estadisticas[tipo]++;

      // Guardar y actualizar
      await this.guardarDatos();
      this.actualizarInterfaz();

      console.log(`➕ ${tipo} agregado:`, item);
    } catch (error) {
      console.error(`❌ Error agregando ${tipo}:`, error);
      throw error;
    }
  }

  // ====== NAVEGACIÓN ======
  manejarVolver() {
    // Implementar según tu sistema de navegación
    if (document.referrer) {
      window.history.back();
    } else {
      // Fallback a página principal
      window.location.href = "/index.html";
    }
  }

  // ====== SINCRONIZACIÓN DE AVATAR ======
  configurarSincronizacionAvatar() {
    // Escuchar cambios del avatar
    const checkAvatar = () => {
      const nuevoAvatar = localStorage.getItem(CONFIG.STORAGE_KEYS.AVATAR);
      if (nuevoAvatar && nuevoAvatar !== this.currentUser.avatar) {
        this.currentUser.avatar = nuevoAvatar;
        this.elementos.perfilAvatar.src = nuevoAvatar;
        this.guardarDatos();
      }
    };

    // Verificar cada segundo
    setInterval(checkAvatar, 1000);

    // Escuchar cambios de localStorage desde otras pestañas
    window.addEventListener("storage", (e) => {
      if (e.key === CONFIG.STORAGE_KEYS.AVATAR) {
        checkAvatar();
      }
    });
  }

  // ====== NOTIFICACIONES ======
  mostrarNotificacion(mensaje, tipo = "info") {
    const notificacion = document.createElement("div");
    notificacion.className = `notificacion notificacion-${tipo}`;
    notificacion.innerHTML = `
            <i class="bi bi-${
              tipo === "success"
                ? "check-circle-fill"
                : tipo === "error"
                ? "exclamation-triangle-fill"
                : "info-circle-fill"
            }"></i>
            <span>${mensaje}</span>
        `;

    this.aplicarEstilosNotificacion(notificacion, tipo);
    document.body.appendChild(notificacion);

    // Animaciones
    setTimeout(() => (notificacion.style.transform = "translateX(0)"), 100);
    setTimeout(() => {
      notificacion.style.transform = "translateX(100%)";
      setTimeout(() => document.body.removeChild(notificacion), 300);
    }, 3000);
  }

  aplicarEstilosNotificacion(elemento, tipo) {
    const colores = {
      success: { bg: "#d4edda", text: "#155724" },
      error: { bg: "#f8d7da", text: "#721c24" },
      info: { bg: "#d1ecf1", text: "#0c5460" },
    };

    elemento.style.cssText = `
            position: fixed; top: 20px; right: 20px; z-index: 10000;
            background: ${colores[tipo].bg}; color: ${colores[tipo].text};
            padding: 15px 20px; border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.1);
            display: flex; align-items: center; gap: 10px;
            transform: translateX(100%); transition: transform 0.3s ease;
        `;
  }

  mostrarError(mensaje) {
    this.mostrarNotificacion(`❌ ${mensaje}`, "error");
  }

  // ====== API PÚBLICA PARA FIREBASE ======
  static getAPI() {
    return {
      // Gestión de usuario
      obtenerUsuario: () => window.perfilApp?.currentUser,
      actualizarUsuario: (datos) => window.perfilApp?.guardarDatos(datos),

      // Gestión de contenido
      agregarPublicacion: (pub) =>
        window.perfilApp?.agregarContenido("publicaciones", pub),
      agregarNota: (nota) => window.perfilApp?.agregarContenido("notas", nota),
      agregarMeGusta: (item) =>
        window.perfilApp?.agregarContenido("meGusta", item),
      agregarRespuesta: (resp) =>
        window.perfilApp?.agregarContenido("respuestas", resp),

      // Utilidades
      actualizarInterfaz: () => window.perfilApp?.actualizarInterfaz(),
      mostrarNotificacion: (msg, tipo) =>
        window.perfilApp?.mostrarNotificacion(msg, tipo),
    };
  }
}

// ====== GESTIÓN DE TABS ======
class TabManager {
  constructor() {
    this.activeTab = "publicaciones";
  }

  init(tabButtons) {
    tabButtons.forEach((btn) => {
      btn.addEventListener("click", () => {
        const tabName = btn.getAttribute("data-tab");
        this.cambiarTab(tabName);
      });
    });
  }

  cambiarTab(tabName) {
    // Remover clase active
    document
      .querySelectorAll(".tab-btn")
      .forEach((btn) => btn.classList.remove("active"));
    document
      .querySelectorAll(".tab-content")
      .forEach((content) => content.classList.remove("active"));

    // Agregar clase active
    const btnActivo = document.querySelector(`[data-tab="${tabName}"]`);
    const contentActivo = document.getElementById(`tab-${tabName}`);

    if (btnActivo && contentActivo) {
      btnActivo.classList.add("active");
      contentActivo.classList.add("active");
      this.activeTab = tabName;
    }
  }

  actualizarContenido(contenido) {
    CONFIG.TABS.forEach((tab) => {
      this.actualizarTab(tab, contenido[tab] || []);
    });
  }

  actualizarTab(tipo, items) {
    const tabElement = document.getElementById(`tab-${tipo}`);
    if (!tabElement) return;

    if (items.length === 0) {
      tabElement.innerHTML = this.crearContenidoVacio(tipo);
    } else {
      tabElement.innerHTML = this.crearListaItems(tipo, items);
    }
  }

  crearContenidoVacio(tipo) {
    const iconos = {
      publicaciones: "grid-3x3-gap",
      notas: "file-earmark-text",
      megusta: "heart",
      respuestas: "chat",
    };

    const textos = {
      publicaciones: "Sin publicaciones aún",
      notas: "Sin notas aún",
      megusta: "Sin me gusta aún",
      respuestas: "Sin respuestas aún",
    };

    return `
            <div class="contenido-vacio">
                <i class="bi bi-${iconos[tipo]}"></i>
                <h3>${textos[tipo]}</h3>
                <p>Tu contenido aparecerá aquí</p>
            </div>
        `;
  }

  crearListaItems(tipo, items) {
    const itemsHTML = items
      .map((item) => this.crearItemHTML(tipo, item))
      .join("");
    return `<div class="lista-${tipo}">${itemsHTML}</div>`;
  }

  crearItemHTML(tipo, item) {
    const fecha =
      item.fechaTexto || new Date(item.fecha).toLocaleDateString("es-ES");

    switch (tipo) {
      case "publicaciones":
        return `
                    <div class="item-card">
                        <h4>${item.titulo || "Sin título"}</h4>
                        <p>${item.contenido || item.descripcion || ""}</p>
                        <small>📅 ${fecha}</small>
                    </div>
                `;
      case "notas":
        return `
                    <div class="item-card">
                        <h4>${item.titulo || "Nota sin título"}</h4>
                        <p>${item.contenido}</p>
                        <small>📝 ${fecha}</small>
                    </div>
                `;
      case "meGusta":
        return `
                    <div class="item-card">
                        <h4>${item.titulo || "Publicación"}</h4>
                        <p>${item.contenido || ""}</p>
                        <small>❤️ Te gustó el ${fecha}</small>
                    </div>
                `;
      case "respuestas":
        return `
                    <div class="item-card">
                        <p><strong>Respondiste:</strong> ${item.contenido}</p>
                        <small>💬 ${fecha} - En: "${
          item.publicacionOriginal || "Publicación"
        }"</small>
                    </div>
                `;
      default:
        return "";
    }
  }
}

// ====== GESTIÓN DE MODAL ======
class ModalManager {
  constructor() {
    this.modal = document.getElementById("modalEditarPerfil");
    this.campos = {
      nombre: document.getElementById("editarNombre"),
      bio: document.getElementById("editarBio"),
    };
  }

  abrir() {
    if (!this.modal) return;

    // Cargar datos actuales
    const usuario = window.perfilApp?.currentUser;
    if (usuario) {
      this.campos.nombre.value = usuario.nombre || "";
      this.campos.bio.value = usuario.bio || "";
    }

    this.modal.style.display = "block";
    this.campos.nombre.focus();
  }

  cerrar() {
    if (this.modal) {
      this.modal.style.display = "none";
    }
  }
}

// ====== INICIALIZACIÓN ======
document.addEventListener("DOMContentLoaded", () => {
  window.perfilApp = new PerfilUsuario();

  // API pública para integración con Firebase
  window.PerfilAPI = PerfilUsuario.getAPI();

  console.log("🚀 Sistema de perfil listo para Firebase");
});

// ====== INTEGRACIÓN CON FIREBASE (EJEMPLO) ======
/*
// Ejemplo de cómo usar cuando conectes Firebase:

// 1. Inicializar con datos de Firebase
window.addEventListener('firebase-auth-ready', async () => {
    const user = firebase.auth().currentUser;
    if (user) {
        const userData = await firebase.firestore()
            .collection('users')
            .doc(user.uid)
            .get();
        
        if (userData.exists) {
            window.PerfilAPI.actualizarUsuario(userData.data());
        }
    }
});

// 2. Agregar contenido desde otras partes de la app
window.PerfilAPI.agregarPublicacion({
    titulo: 'Mi nueva publicación',
    contenido: 'Contenido de la publicación...',
    tags: ['tag1', 'tag2']
});

// 3. Obtener datos del usuario actual
const usuario = window.PerfilAPI.obtenerUsuario();
console.log('Usuario actual:', usuario);
*/




// MODO OSCURO, PARTE CAMILO
// Cambiar el tema de la página entre claro y oscuro
document.addEventListener("DOMContentLoaded", function () {
  const body = document.body;
  const themeStatus = document.getElementById("theme-status");
  const toggleThemeBtn = document.getElementById("toggle-theme");

  function toggleDarkMode() {
      body.classList.toggle("dark-mode");
      const isDarkMode = body.classList.contains("dark-mode");
      localStorage.setItem("theme", isDarkMode ? "dark" : "light");

      if (themeStatus) {
          themeStatus.textContent = isDarkMode ? "Oscuro" : "Claro";
      }
  }

  if (localStorage.getItem("theme") === "dark") {
      body.classList.add("dark-mode");
      if (themeStatus) {
          themeStatus.textContent = "Oscuro";
      }
  } else {
      if (themeStatus) {
          themeStatus.textContent = "Claro";
      }
  }

  if (toggleThemeBtn) {
      toggleThemeBtn.addEventListener("click", toggleDarkMode);
  }
});