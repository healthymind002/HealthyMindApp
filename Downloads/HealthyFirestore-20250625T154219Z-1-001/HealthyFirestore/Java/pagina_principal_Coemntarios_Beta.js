/* ============================
   MENÚ DE HAMBURGUESA
   ============================ */
// ... (código del menú, sin cambios) ...

// Variables globales existentes
let currentUser = null;
let verificacionTimeout = null;
let verificacionRespuestaTimeout = null;
const todosLosPosts = [];

// === CORRECCIONES PARA 'db' y 'auth' ===
// ELIMINA estas líneas, ya que 'db' y 'auth' ya están declaradas en firebase-config.js
// let db = null;   
// let auth = null; 


/*============================
   INICIALIZACIÓN DE FIREBASE
   ============================ */
function inicializarFirebase() {
    console.log("Iniciando configuración de Firebase...");
    
    // Verifica que la SDK de Firebase esté cargada antes de intentar usarla
    // Y que las referencias 'db' y 'auth' ya estén disponibles (desde firebase-config.js)
    if (typeof firebase === 'undefined' || typeof firebase.firestore === 'undefined' || 
        typeof firebase.auth === 'undefined' || typeof db === 'undefined' || typeof auth === 'undefined') {
        console.error("SDK de Firebase o sus referencias (db/auth) no están disponibles. Reintentando en 1 segundo...");
        setTimeout(inicializarFirebase, 1000); // Reintenta si no está listo
        return;
    }

    // SI YA ESTÁN INICIALIZADAS EN firebase-config.js, NO NECESITAS REASIGNARLAS AQUÍ.
    // Solo si db y auth fueran null o indefinidas después de la carga de firebase-config.js,
    // lo cual no debería pasar si firebase-config.js las declara globalmente.
    // Elimina o comenta las siguientes dos líneas si db y auth ya están disponibles globalmente:
    // db = firebase.firestore(); // <-- ¡ELIMINA O COMENTA ESTA LÍNEA!
    // auth = firebase.auth();    // <-- ¡ELIMINA O COMENTA ESTA LÍNEA!
    
    console.log("Firebase (Firestore y Auth) inicializado correctamente y referencias disponibles.");
    

    // Llama a la función que maneja el estado de autenticación (onAuthStateChanged)
    // Esto es crucial para saber si el usuario está logueado o no
    setupAuthStateListener(); 
}

/*============================
   LISTENER DE ESTADO DE AUTENTICACIÓN
   ============================ */
// ... (el resto de tu código, incluyendo setupAuthStateListener, cargarComentarios, añadirComentario) ...
// === LA DEFINICIÓN COMPLETA DE setupAuthStateListener DEBE IR AQUÍ O ANTES ===
function setupAuthStateListener() {
    // ... todo el código de tu función setupAuthStateListener ...
}

// Asegúrate de que esta llamada a inicializarFirebase() se haga cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    inicializarFirebase();
    // Otras inicializaciones de tu UI aquí
});

/* ============================
   FUNCIONES DE FIRESTORE
   ============================ */

async function guardarComentario(texto) {
    // Verificar que el usuario esté autenticado
    if (!auth || !auth.currentUser) {
        console.error("Usuario no autenticado para guardar comentario");
        mostrarVentanaEmergente("Debes iniciar sesión para comentar.");
        return null;
    }
    
    if (!db) {
        console.error("Firestore no está disponible");
        mostrarVentanaEmergente("Error de conexión. Inténtalo de nuevo.");
        return null;
    }
    
    try {
        // OBTENER DATOS DEL USUARIO INCLUYENDO AVATAR
        const userDoc = await db.collection('usuarios').doc(auth.currentUser.uid).get();
        const userData = userDoc.exists ? userDoc.data() : {};
        const avatar = userData.perfil?.avatar || AVATARES_PREDEFINIDOS.default;
        const nombreUsuario = userData.nombre || auth.currentUser.displayName || auth.currentUser.email.split('@')[0];
        
        const comentarioData = {
            uid: auth.currentUser.uid,
            usuario: nombreUsuario, // NOMBRE ACTUALIZADO
            avatar: avatar, // NUEVA PROPIEDAD
            texto: texto,
            timestamp: firebase.firestore.FieldValue.serverTimestamp(),
            fechaCreacion: new Date().toISOString(),
            hora: obtenerHoraFormateada(),
            reacciones: {
                "❤️": { count: 0, usuarios: [] },
                "😂": { count: 0, usuarios: [] },
                "😮": { count: 0, usuarios: [] },
                "😢": { count: 0, usuarios: [] }
            },
            activo: true
        };
        
        const docRef = await db.collection('comentarios').add(comentarioData);
        console.log("Comentario guardado con ID:", docRef.id);
        return { id: docRef.id, ...comentarioData };
    } catch (error) {
        console.error("Error al guardar comentario:", error);
        mostrarVentanaEmergente("Error al publicar el comentario. Inténtalo de nuevo.");
        return null;
    }
}

async function guardarRespuesta(comentarioId, texto) {
    // Verificar que el usuario esté autenticado
    if (!auth || !auth.currentUser) {
        console.error("Usuario no autenticado para guardar respuesta");
        mostrarVentanaEmergente("Debes iniciar sesión para responder.");
        return null;
    }
    
    if (!db) {
        console.error("Firestore no está disponible");
        mostrarVentanaEmergente("Error de conexión. Inténtalo de nuevo.");
        return null;
    }
    
    try {
        // OBTENER DATOS DEL USUARIO INCLUYENDO AVATAR
        const userDoc = await db.collection('usuarios').doc(auth.currentUser.uid).get();
        const userData = userDoc.exists ? userDoc.data() : {};
        const avatar = userData.perfil?.avatar || AVATARES_PREDEFINIDOS.default;
        const nombreUsuario = userData.nombre || auth.currentUser.displayName || auth.currentUser.email.split('@')[0];
        
        const respuestaData = {
            uid: auth.currentUser.uid,
            usuario: nombreUsuario, // NOMBRE ACTUALIZADO
            avatar: avatar, // NUEVA PROPIEDAD
            comentarioId: comentarioId,
            texto: texto,
            timestamp: firebase.firestore.FieldValue.serverTimestamp(),
            fechaCreacion: new Date().toISOString(),
            hora: obtenerHoraFormateada(),
            reacciones: {
                "❤️": { count: 0, usuarios: [] },
                "😂": { count: 0, usuarios: [] },
                "😮": { count: 0, usuarios: [] },
                "😢": { count: 0, usuarios: [] }
            },
            activo: true
        };
        
        const docRef = await db.collection('respuestas').add(respuestaData);
        console.log("Respuesta guardada con ID:", docRef.id);
        return { id: docRef.id, ...respuestaData };
    } catch (error) {
        console.error("Error al guardar respuesta:", error);
        mostrarVentanaEmergente("Error al publicar la respuesta. Inténtalo de nuevo.");
        return null;
    }
}

async function cargarComentarios() {
    if (!auth || !auth.currentUser) {
        console.log("Esperando autenticación para cargar comentarios...");
        return;
    }
    
    if (!db) {
        console.error("Firestore no disponible");
        return;
    }
    
    try {
        const listaComentarios = document.getElementById("lista_comentarios");
        if (!listaComentarios) return;
        
        console.log("Cargando comentarios para usuario autenticado:", auth.currentUser.uid);
        
        // Limpiar comentarios existentes
        listaComentarios.innerHTML = "";
        
        const snapshot = await db.collection('comentarios')
            .where('activo', '==', true)
            .orderBy('timestamp', 'desc')
            .get();
        
        for (const doc of snapshot.docs) {
            const comentario = { id: doc.id, ...doc.data() };
            const elementoComentario = await crearElementoEntrada(comentario, "comentario", 0);
            listaComentarios.appendChild(elementoComentario);
        }
        
        console.log(`${snapshot.docs.length} comentarios cargados`);
    } catch (error) {
        console.error("Error al cargar comentarios:", error);
        mostrarVentanaEmergente("Error al cargar comentarios. Recarga la página.");
    }
}
// Cargar respuestas de un comentario específico
async function cargarRespuestas(comentarioId, contenedorRespuestas) {
    if (!db) return;
    
    try {
        const snapshot = await db.collection('respuestas')
            .where('comentarioId', '==', comentarioId)
            .where('activo', '==', true)
            .orderBy('timestamp', 'asc')
            .get();
        
        // Limpiar respuestas existentes
        contenedorRespuestas.innerHTML = "";
        
        for (const doc of snapshot.docs) {
            const respuesta = { id: doc.id, ...doc.data() };
            const elementoRespuesta = await crearElementoEntrada(respuesta, "respuesta");
            contenedorRespuestas.appendChild(elementoRespuesta);
        }
        
        console.log(`${snapshot.docs.length} respuestas cargadas para comentario ${comentarioId}`);
    } catch (error) {
        console.error("Error al cargar respuestas:", error);
    }
}

// Actualizar reacción en Firestore
async function actualizarReaccion(docId, coleccion, emoji, accion) {
    if (!db || !auth.currentUser) return;
    
    try {
        const docRef = db.collection(coleccion).doc(docId);
        const userId = auth.currentUser.uid;
        
        const doc = await docRef.get();
        if (!doc.exists) return;
        
        const data = doc.data();
        const reacciones = data.reacciones || {};
        
        // Limpiar reacciones previas del usuario
        Object.keys(reacciones).forEach(e => {
            if (reacciones[e].usuarios && reacciones[e].usuarios.includes(userId)) {
                reacciones[e].usuarios = reacciones[e].usuarios.filter(id => id !== userId);
                reacciones[e].count = Math.max(0, reacciones[e].count - 1);
            }
        });
        
        // Agregar nueva reacción si es necesario
        if (accion === 'agregar') {
            if (!reacciones[emoji]) {
                reacciones[emoji] = { count: 0, usuarios: [] };
            }
            if (!reacciones[emoji].usuarios.includes(userId)) {
                reacciones[emoji].usuarios.push(userId);
                reacciones[emoji].count += 1;
            }
        }
        
        await docRef.update({ reacciones });
        console.log("Reacción actualizada");
    } catch (error) {
        console.error("Error al actualizar reacción:", error);
    }
}

/* ============================
   Funciones de Validación
   ============================ */
function contieneURL(texto) {
    const patronURL = /(https?:\/\/[^\s]+)|(www\.[^\s]+)/gi;
    return patronURL.test(texto);
}

function contieneNumeros(texto) {
    const patronNumeros = /\d/;
    return patronNumeros.test(texto);
}

function validarTexto(texto) {
    if (contieneURL(texto)) {
        mostrarVentanaEmergente("⚠️ Por seguridad, no se permiten URLs en los comentarios o respuestas.");
        return false;
    }
    if (contieneNumeros(texto)) {
        mostrarVentanaEmergente("⚠️ No se permiten números en los comentarios o respuestas.");
        return false;
    }
    return true;
}

/* ============================
   Ventana Emergente
   ============================ */
function mostrarVentanaEmergente(mensaje) {
    document.querySelectorAll('.fondo-modal').forEach(el => el.remove());

    const fondoModal = document.createElement('div');
    fondoModal.classList.add('fondo-modal');

    const modal = document.createElement('div');
    modal.classList.add('modal');

    const mensajeP = document.createElement('p');
    mensajeP.textContent = mensaje;

    const botonCerrar = document.createElement('button');
    botonCerrar.textContent = 'Cerrar';
    botonCerrar.classList.add('boton-cerrar');
    botonCerrar.onclick = () => fondoModal.remove();

    modal.appendChild(mensajeP);
    modal.appendChild(botonCerrar);
    fondoModal.appendChild(modal);
    document.body.appendChild(fondoModal);
}

/* ============================
   Formato de Tiempo
   ============================ */
function obtenerHoraFormateada() {
    const ahora = new Date();
    const horas = ahora.getHours().toString().padStart(2, '0');
    const minutos = ahora.getMinutes().toString().padStart(2, '0');
    return `${horas}:${minutos}`;
}

/* ============================
   VERIFICACIÓN CON GEMINI API
   ============================ */
async function verificarComentario(texto) {
    console.log("Función verificarComentario llamada con texto:", texto);
    
    const btnPublicar = document.getElementById('btnPublicar');
    const statusIndicator = document.getElementById('statusIndicator');
    const statusIcon = document.getElementById('statusIcon');
    const statusText = document.getElementById('statusText');
    
    // Verificar que todos los elementos existen
    if (!btnPublicar || !statusIndicator || !statusIcon || !statusText) {
        console.error('Elementos del DOM no encontrados para verificación de comentario');
        return;
    }
         
    // Si el texto está vacío, deshabilitar el botón y ocultar el indicador
    if (!texto.trim()) {
        btnPublicar.disabled = true;
        statusIndicator.classList.add('hidden');
        statusText.textContent = '';
        statusIcon.textContent = '';
        return;
    }
         
    // Limpiamos cualquier timeout previo para evitar verificaciones múltiples
    clearTimeout(verificacionTimeout);
         
    // Esperamos 500ms para verificar (evita llamadas a la API en cada tecla)
    verificacionTimeout = setTimeout(async () => {
        console.log("Iniciando verificación de comentario con API");
        
        // Mostrar indicador de carga
        statusIndicator.classList.remove('hidden');
        statusIndicator.className = 'status-indicator status-loading';
        statusIcon.textContent = '⏳';
        statusText.innerHTML = '<span class="loader"></span>Verificando contenido...';
             
        try {
    console.log("Enviando petición a API:", texto);
    const response = await fetch('https://mente-saludable-3f3jcxqo2-mente-saludable.vercel.app/api/moderar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contenido: texto })
    });
            
            console.log("Respuesta de la API recibida:", response.status);
            const resultado = await response.json();
            console.log("Resultado de moderación:", resultado);
                 
            // Actualizar UI según el resultado
            if (resultado.clasificacion === 'aprobado') {
                btnPublicar.disabled = false;
                statusIndicator.className = 'status-indicator status-approved';
                statusIcon.textContent = '✅';
                statusText.textContent = 'Contenido apropiado. Puedes publicar tu comentario.';
                console.log("Comentario aprobado");
            } else {
                btnPublicar.disabled = true;
                statusIndicator.className = 'status-indicator status-rejected';
                statusIcon.textContent = '❌';
                statusText.textContent = `Contenido inapropiado: ${resultado.explicacion}`;
                console.log("Comentario rechazado:", resultado.explicacion);
            }
        } catch (error) {
            console.error('Error al verificar contenido:', error);
            statusIndicator.className = 'status-indicator status-rejected';
            statusIcon.textContent = '⚠️';
            statusText.textContent = 'Error al verificar el contenido. Inténtalo de nuevo.';
            btnPublicar.disabled = true;
        }
    }, 500);
}

async function verificarRespuesta(texto, boton, indicador, icono, textoIndicador) {
    // Verificar que todos los elementos existen
    if (!boton || !indicador || !icono || !textoIndicador) {
        console.error('Elementos del DOM no encontrados para verificación de respuesta');
        return;
    }
    
    // Si el texto está vacío, deshabilitar el botón y ocultar el indicador
    if (!texto.trim()) {
        boton.disabled = true;
        indicador.classList.add('hidden');
        textoIndicador.textContent = '';
        icono.textContent = '';
        return;
    }
    
    // Limpiamos cualquier timeout previo para evitar verificaciones múltiples
    clearTimeout(verificacionRespuestaTimeout);
    
    // Esperamos 500ms para verificar (evita llamadas a la API en cada tecla)
    verificacionRespuestaTimeout = setTimeout(async () => {
        // Primera verificación básica
        if (!validarTexto(texto)) {
            boton.disabled = true;
            return;
        }
        
        // Mostrar indicador de carga
        indicador.classList.remove('hidden');
        indicador.className = 'status-indicator status-loading';
        icono.textContent = '⏳';
        textoIndicador.innerHTML = '<span class="loader"></span>Verificando contenido...';
        
        try {
            const response = await fetch('https://mente-saludable-3f3jcxqo2-mente-saludable.vercel.app/api/moderar', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contenido: texto })
            });
            
            const resultado = await response.json();
            
            // Actualizar UI según el resultado
            if (resultado.clasificacion === 'aprobado') {
                boton.disabled = false;
                indicador.className = 'status-indicator status-approved';
                icono.textContent = '✅';
                textoIndicador.textContent = 'Contenido apropiado. Puedes publicar tu respuesta.';
            } else {
                boton.disabled = true;
                indicador.className = 'status-indicator status-rejected';
                icono.textContent = '❌';
                textoIndicador.textContent = `Contenido inapropiado: ${resultado.explicacion}`;
            }
        } catch (error) {
            console.error('Error al verificar contenido:', error);
            indicador.className = 'status-indicator status-rejected';
            icono.textContent = '⚠️';
            textoIndicador.textContent = 'Error al verificar el contenido. Inténtalo de nuevo.';
            boton.disabled = true;
        }
    }, 500);
}

/* ============================
   Creación de Comentarios y Respuestas
   ============================ */
async function crearElementoEntrada(data, tipo, profundidad = 0) {
    const contenedor = document.createElement("div");
    contenedor.classList.add(tipo);
    contenedor.dataset.id = data.id;
    
    // Agregar clase de profundidad para estilos
    if (profundidad > 0) {
        contenedor.classList.add(`profundidad-${Math.min(profundidad, 5)}`);
    }

    const cabeceraDiv = document.createElement("div");
    cabeceraDiv.classList.add("cabecera-entrada");

    // CREAR ELEMENTO AVATAR
    const avatarImg = document.createElement("img");
avatarImg.classList.add("avatar-comentario");
avatarImg.src = data.avatar || AVATARES_PREDEFINIDOS.default;
avatarImg.alt = "Avatar de " + (data.usuario || "Usuario");
avatarImg.style.width = "32px";
avatarImg.style.height = "32px";
avatarImg.style.borderRadius = "50%";
avatarImg.style.marginRight = "8px";
avatarImg.style.objectFit = "cover";
avatarImg.style.cursor = "pointer"; // AÑADIR ESTA LÍNEA
avatarImg.title = "Ver perfil de " + (data.usuario || "Usuario"); // AÑADIR ESTA LÍNEA


avatarImg.onclick = function() {
    window.location.href = "/contenido_de_la_pagina/Mi_perfil/Mi_perfil.html";
};

cabeceraDiv.appendChild(avatarImg);

    const usuarioSpan = document.createElement("span");
    usuarioSpan.classList.add("nombre-usuario");
    usuarioSpan.textContent = data.usuario || "Usuario";
    cabeceraDiv.appendChild(usuarioSpan);

    const horaSpan = document.createElement("span");
    horaSpan.classList.add("tiempo-publicacion");
    horaSpan.textContent = data.hora || obtenerHoraFormateada();
    cabeceraDiv.appendChild(horaSpan);

    contenedor.appendChild(cabeceraDiv);

    const textoP = document.createElement("p");
    textoP.innerHTML = data.texto;
    contenedor.appendChild(textoP);

    // Sistema de reacciones (mantener igual)
    const reaccionesDiv = document.createElement("div");
    reaccionesDiv.classList.add("reacciones");
    const reacciones = data.reacciones || {
        "❤️": { count: 0, usuarios: [] },
        "😂": { count: 0, usuarios: [] },
        "😮": { count: 0, usuarios: [] },
        "😢": { count: 0, usuarios: [] }
    };

    let seleccionado = null;
    if (auth && auth.currentUser) {
        Object.keys(reacciones).forEach(emoji => {
            if (reacciones[emoji].usuarios && reacciones[emoji].usuarios.includes(auth.currentUser.uid)) {
                seleccionado = emoji;
            }
        });
    }

    Object.keys(reacciones).forEach(emoji => {
        const span = document.createElement("span");
        span.classList.add("reaccion");
        span.dataset.emoji = emoji;
        span.innerHTML = `${emoji} <span class="like-contador">${reacciones[emoji].count || 0}</span>`;

        if (seleccionado === emoji) {
            span.classList.add("seleccionado");
        }

        span.onclick = () => {
            if (!auth || !auth.currentUser) {
                mostrarVentanaEmergente("Debes iniciar sesión para reaccionar.");
                return;
            }

            const esSeleccionado = seleccionado === emoji;
            const accion = esSeleccionado ? 'quitar' : 'agregar';
            const coleccion = tipo === 'comentario' ? 'comentarios' : 'respuestas';

            if (esSeleccionado) {
                reacciones[emoji].count = Math.max(0, reacciones[emoji].count - 1);
                seleccionado = null;
                span.classList.remove("seleccionado");
            } else {
                if (seleccionado) {
                    const prevSpan = reaccionesDiv.querySelector(`span[data-emoji="${seleccionado}"]`);
                    if (prevSpan) {
                        reacciones[seleccionado].count = Math.max(0, reacciones[seleccionado].count - 1);
                        prevSpan.querySelector(".like-contador").textContent = reacciones[seleccionado].count;
                        prevSpan.classList.remove("seleccionado");
                    }
                }
                reacciones[emoji].count += 1;
                seleccionado = emoji;
                span.classList.add("seleccionado");
            }

            span.querySelector(".like-contador").textContent = reacciones[emoji].count;
            actualizarReaccion(data.id, coleccion, emoji, accion);
        };

        reaccionesDiv.appendChild(span);
    });

    contenedor.appendChild(reaccionesDiv);

  // SISTEMA DE RESPUESTAS MEJORADO con más profundidad
    const PROFUNDIDAD_MAXIMA = 5; // Incrementado de 2 a 5
    
    if (profundidad < PROFUNDIDAD_MAXIMA) {
        const inputRespuesta = document.createElement("input");
        inputRespuesta.type = "text";
        inputRespuesta.placeholder = profundidad === 0 ? "Escribe una respuesta..." : "Responder...";
        inputRespuesta.classList.add("input-respuesta");

        const respuestaStatusIndicator = document.createElement('div');
        respuestaStatusIndicator.className = 'status-indicator hidden';
        
        const respuestaStatusIcon = document.createElement('span');
        respuestaStatusIcon.className = 'status-icon';
        
        const respuestaStatusText = document.createElement('span');
        respuestaStatusText.className = 'status-text';
        
        respuestaStatusIndicator.appendChild(respuestaStatusIcon);
        respuestaStatusIndicator.appendChild(respuestaStatusText);

        const botonRespuesta = document.createElement("button");
        botonRespuesta.textContent = "Responder";
        botonRespuesta.classList.add("boton-responder");
        botonRespuesta.disabled = true;

        // NUEVO: Contenedor de info de respuestas y toggle
        const infoRespuestasDiv = document.createElement("div");
        infoRespuestasDiv.classList.add("info-respuestas");
        
        const toggleRespuestasBtn = document.createElement("span");
        toggleRespuestasBtn.classList.add("toggle-respuestas");
        toggleRespuestasBtn.style.cursor = "pointer";
        toggleRespuestasBtn.title = "Mostrar/Ocultar respuestas";
        
        const contadorRespuestas = document.createElement("span");
        contadorRespuestas.classList.add("contador-respuestas");
        
        infoRespuestasDiv.appendChild(toggleRespuestasBtn);
        infoRespuestasDiv.appendChild(contadorRespuestas);

        const contenedorRespuestas = document.createElement("div");
        contenedorRespuestas.classList.add("respuestas");
        contenedorRespuestas.style.display = "none"; // OCULTO POR DEFECTO

        // Contar y cargar respuestas
        const numRespuestas = await contarRespuestas(data.id);
        actualizarInfoRespuestas(toggleRespuestasBtn, contadorRespuestas, numRespuestas, false);

        toggleRespuestasBtn.onclick = async () => {
    const visible = contenedorRespuestas.style.display === "block";
    
    if (!visible) {
        // Cargar respuestas solo cuando se van a mostrar
        await cargarRespuestasConProfundidad(data.id, contenedorRespuestas, profundidad + 1);
        contenedorRespuestas.style.display = "block";
    } else {
        // Solo ocultar las respuestas, NO tocar el toggle
        contenedorRespuestas.style.display = "none";
    }
    
    // OBTENER EL CONTEO ACTUALIZADO CADA VEZ
    const numRespuestasActual = await contarRespuestas(data.id);
    console.log("Conteo actualizado de respuestas:", numRespuestasActual);
    
    // Actualizar info con el conteo correcto
    actualizarInfoRespuestas(toggleRespuestasBtn, contadorRespuestas, numRespuestasActual, !visible);
};

        inputRespuesta.addEventListener('input', function() {
            verificarRespuesta(this.value, botonRespuesta, respuestaStatusIndicator, respuestaStatusIcon, respuestaStatusText);
        });

        botonRespuesta.onclick = async () => {
    const resp = inputRespuesta.value.trim();
    if (resp && auth && auth.currentUser) { 
        const comentarioIdParaGuardar = obtenerComentarioIdRaiz(data, tipo);
        const respuestaGuardada = await guardarRespuesta(comentarioIdParaGuardar, resp);
        
        if (respuestaGuardada) {
            const nueva = await crearElementoEntrada(respuestaGuardada, "respuesta", profundidad + 1);
            contenedorRespuestas.appendChild(nueva);
            inputRespuesta.value = "";
            
            // OBTENER CONTEO ACTUALIZADO
            const nuevoNumRespuestas = await contarRespuestas(data.id);
            console.log("Nuevo número de respuestas:", nuevoNumRespuestas);
            
            // Asegurar que el contenedor esté visible
            contenedorRespuestas.style.display = "block";
            
            // Actualizar info con el conteo correcto Y visible=true
            actualizarInfoRespuestas(toggleRespuestasBtn, contadorRespuestas, nuevoNumRespuestas, true);
            
            // Asegurar que el toggle esté visible
            toggleRespuestasBtn.style.display = "inline-block";
            toggleRespuestasBtn.style.visibility = "visible";
            
            respuestaStatusIndicator.classList.add('hidden');
            respuestaStatusIcon.textContent = '';
            respuestaStatusText.textContent = '';
            botonRespuesta.disabled = true;
        }
    } else if (!auth || !auth.currentUser) {
        mostrarVentanaEmergente("Debes iniciar sesión para responder.");
    }
};

        contenedor.appendChild(infoRespuestasDiv);
        contenedor.appendChild(inputRespuesta);
        contenedor.appendChild(respuestaStatusIndicator);
        contenedor.appendChild(botonRespuesta);
        contenedor.appendChild(contenedorRespuestas);
    }

    return contenedor;
}

async function contarRespuestas(comentarioId) {
    if (!db) return 0;
    
    try {
        const snapshot = await db.collection('respuestas')
            .where('comentarioId', '==', comentarioId)
            .where('activo', '==', true)
            .get();
        
        return snapshot.size;
    } catch (error) {
        console.error("Error al contar respuestas:", error);
        return 0;
    }
}

// 3. NUEVA FUNCIÓN para actualizar info de respuestas
function actualizarInfoRespuestas(toggleBtn, contadorSpan, numRespuestas, visible) {
    console.log("actualizarInfoRespuestas llamada:", { numRespuestas, visible });
    
    // Actualizar el icono del toggle
    toggleBtn.innerHTML = visible ? "&#9660;" : "&#9654;";
    
    if (numRespuestas === 0) {
        // Si no hay respuestas, ocultar contador pero NO el toggle
        contadorSpan.textContent = "";
        toggleBtn.style.display = "none";
    } else {
        // Si hay respuestas, SIEMPRE mostrar el toggle
        toggleBtn.style.display = "inline-block";
        toggleBtn.style.visibility = "visible"; // AÑADIR ESTA LÍNEA
        
        // Mostrar contador solo cuando esté colapsado
        if (visible) {
            contadorSpan.textContent = ""; // Ocultar contador cuando está expandido
        } else {
            const texto = numRespuestas === 1 ? "1 respuesta" : `${numRespuestas} respuestas`;
            contadorSpan.textContent = texto; // Mostrar contador cuando está colapsado
        }
    }
}
function obtenerComentarioIdRaiz(data, tipo) {
    if (tipo === 'comentario') {
        return data.id;
    } else {
        // Para respuestas, usar el comentarioId que ya tienen
        return data.comentarioId || data.id;
    }
}
async function cargarRespuestasConProfundidad(comentarioId, contenedorRespuestas, profundidad) {
    if (!db) return;
    
    try {
        const snapshot = await db.collection('respuestas')
            .where('comentarioId', '==', comentarioId)
            .where('activo', '==', true)
            .orderBy('timestamp', 'asc')
            .get();
        
        // Limpiar respuestas existentes
        contenedorRespuestas.innerHTML = "";
        
        for (const doc of snapshot.docs) {
            const respuesta = { id: doc.id, ...doc.data() };
            const elementoRespuesta = await crearElementoEntrada(respuesta, "respuesta", profundidad);
            contenedorRespuestas.appendChild(elementoRespuesta);
        }
        
        console.log(`${snapshot.docs.length} respuestas cargadas para comentario ${comentarioId} con profundidad ${profundidad}`);
    } catch (error) {
        console.error("Error al cargar respuestas:", error);
    }
}

/* ============================
   ÚLTIMOS POSTS
   ============================ */
function actualizarUltimosPosts() {
    const contenedor = document.getElementById("ultimosPostsContainer");
    if (!contenedor) {
        console.error('Contenedor de últimos posts no encontrado');
        return;
    }
    
    contenedor.innerHTML = "";

    const ultimos = todosLosPosts.slice(-3).reverse();

    ultimos.forEach(post => {
        const postElement = document.createElement("div");
        postElement.className = "post";

        const header = document.createElement("div");
        header.className = "post-header";

        // MODIFICAR AVATAR PARA MOSTRAR IMAGEN REAL
        const avatar = document.createElement("img");
        avatar.className = "avatar";
        avatar.src = post.avatar || AVATARES_PREDEFINIDOS.default;
        avatar.alt = "Avatar de " + post.usuario;
        avatar.style.width = "40px";
        avatar.style.height = "40px";
        avatar.style.borderRadius = "50%";
        avatar.style.objectFit = "cover";

        const nombre = document.createElement("span");
        nombre.className = "nombre";
        nombre.textContent = post.usuario;

        const hora = document.createElement("span");
        hora.className = "tiempo-publicacion";
        hora.textContent = post.hora || obtenerHoraFormateada();

        header.appendChild(avatar);
        header.appendChild(nombre);
        header.appendChild(hora);

        // ... resto del código permanece igual ...
        const texto = document.createElement("p");
        texto.textContent = post.texto;

        const boton = document.createElement("button");
        boton.className = "ver-mas";
        boton.textContent = "Ver más";
        // ... resto del código del botón permanece igual ...

        postElement.appendChild(header);
        postElement.appendChild(texto);
        postElement.appendChild(boton);
        contenedor.appendChild(postElement);
    });
}

async function publicarComentario() {
    const textoElement = document.getElementById("comentario");
    const btnPublicar = document.getElementById('btnPublicar');
    
    if (!textoElement || !btnPublicar) {
        console.error('Elementos necesarios no encontrados');
        return;
    }
    
    // PREVENIR MÚLTIPLES CLICS
    if (btnPublicar.disabled || btnPublicar.dataset.publicando === 'true') {
        console.log("Publicación ya en proceso, ignorando...");
        return;
    }
    
    const texto = textoElement.value.trim();

    if (!texto || !validarTexto(texto)) return;

    // Verificar autenticación
    if (!auth || !auth.currentUser) {
        console.error("Usuario no autenticado al intentar publicar");
        mostrarVentanaEmergente("Debes iniciar sesión para comentar.");
        return;
    }

    // MARCAR COMO EN PROCESO
    btnPublicar.dataset.publicando = 'true';
    btnPublicar.disabled = true;
    btnPublicar.textContent = 'Publicando...';

    console.log("Publicando comentario para usuario:", auth.currentUser.uid);

    try {
        // Guardar comentario en Firebase
        const comentarioGuardado = await guardarComentario(texto);
        
        if (comentarioGuardado) {
            const listaComentarios = document.getElementById("lista_comentarios");
            if (listaComentarios) {
                const nuevo = await crearElementoEntrada(comentarioGuardado, "comentario");
                listaComentarios.prepend(nuevo);
            }
            
            textoElement.value = "";
            
            // Ocultar el indicador de estado
            const statusIndicator = document.getElementById('statusIndicator');
            const statusIcon = document.getElementById('statusIcon');
            const statusText = document.getElementById('statusText');
            
            if (statusIndicator) statusIndicator.classList.add('hidden');
            if (statusIcon) statusIcon.textContent = '';
            if (statusText) statusText.textContent = '';

            // ACTUALIZAR últimos posts CON AVATAR
            const hora = obtenerHoraFormateada();
            const userDoc = await db.collection('usuarios').doc(auth.currentUser.uid).get();
            const userData = userDoc.exists ? userDoc.data() : {};
            const nombreUsuario = userData.nombre || auth.currentUser.displayName || auth.currentUser.email.split('@')[0];
            const avatar = userData.perfil?.avatar || AVATARES_PREDEFINIDOS.default;
            
            todosLosPosts.push({ 
                usuario: nombreUsuario, 
                texto, 
                hora,
                avatar: avatar // NUEVA PROPIEDAD
            });
            actualizarUltimosPosts();
            
            console.log("Comentario publicado exitosamente");
        }
    } catch (error) {
        console.error("Error al publicar comentario:", error);
        mostrarVentanaEmergente("Error al publicar comentario. Inténtalo de nuevo.");
    } finally {
        // RESTAURAR BOTÓN
        btnPublicar.dataset.publicando = 'false';
        btnPublicar.textContent = 'Publicar';
        // El botón permanecerá deshabilitado hasta que se escriba nuevo contenido válido
    }
}
/* ============================
   INICIALIZACIÓN SIMPLE
   ============================ */
document.addEventListener('DOMContentLoaded', function () {
    console.log("DOM cargado");
    
    // 1. PRIMERO: Configurar el sistema de verificación SIN esperar Firebase
    configurarSistemaVerificacion();
    
    // 2. SEGUNDO: Inicializar Firebase después (sin bloquear)
    setTimeout(() => {
        inicializarFirebase();
    }, 100);
});

function configurarSistemaVerificacion() {
    const cajaComentarios = document.querySelector(".caja_comentarios");
    const textarea = document.getElementById('comentario');
    const botonPublicar = document.querySelector(".caja_comentarios > button");
    
    if (!cajaComentarios || !textarea || !botonPublicar) {
        setTimeout(configurarSistemaVerificacion, 200);
        return;
    }
    
    // Crear indicador de estado
    let statusIndicator = document.getElementById('statusIndicator');
    if (!statusIndicator) {
        statusIndicator = document.createElement('div');
        statusIndicator.id = 'statusIndicator';
        statusIndicator.className = 'status-indicator hidden';
        
        const statusIcon = document.createElement('span');
        statusIcon.id = 'statusIcon';
        statusIcon.className = 'status-icon';
        
        const statusText = document.createElement('span');
        statusText.id = 'statusText';
        statusText.className = 'status-text';
        
        statusIndicator.appendChild(statusIcon);
        statusIndicator.appendChild(statusText);
        textarea.parentNode.insertBefore(statusIndicator, textarea.nextSibling);
    }
    
    // Configurar botón
    botonPublicar.id = 'btnPublicar';
    botonPublicar.disabled = true;
    
    // VERIFICAR SI YA ESTÁN CONFIGURADOS LOS EVENT LISTENERS
    if (textarea.dataset.configured === 'true' && botonPublicar.dataset.configured === 'true') {
        console.log("Event listeners ya configurados, saltando...");
        return;
    }
    
    // Limpiar event listeners existentes solo si no están marcados como configurados
    if (textarea.dataset.configured !== 'true') {
        const nuevoTextarea = textarea.cloneNode(true);
        textarea.parentNode.replaceChild(nuevoTextarea, textarea);
        nuevoTextarea.dataset.configured = 'true';
        
        nuevoTextarea.addEventListener('input', function(e) {
            verificarComentario(e.target.value);
        });
    }
    
    if (botonPublicar.dataset.configured !== 'true') {
        const nuevoBoton = botonPublicar.cloneNode(true);
        botonPublicar.parentNode.replaceChild(nuevoBoton, botonPublicar);
        nuevoBoton.dataset.configured = 'true';
        nuevoBoton.id = 'btnPublicar';
        nuevoBoton.disabled = true;
        
        nuevoBoton.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            publicarComentario();
        });
    }
    
    // Configurar título
    const titulo = document.querySelector(".post-amigos h3");
    if (titulo) {
        titulo.textContent = "Últimos posts";
    }
    
    console.log("Sistema de verificación configurado");
    
    // Cargar comentarios después de configurar
    esperarYCargarComentarios();
}

// 2. NUEVA FUNCIÓN para esperar autenticación y cargar comentarios
function esperarYCargarComentarios() {
    console.log("Esperando autenticación para cargar comentarios...");
    
    // Verificar si auth está disponible
    if (!auth) {
        console.log("Auth no disponible, reintentando...");
        setTimeout(esperarYCargarComentarios, 500);
        return;
    }
    
    // Configurar listener de autenticación
    auth.onAuthStateChanged(async (user) => {
        if (user) {
            console.log("✅ Usuario autenticado, cargando comentarios...");
            
            // Establecer currentUser
            window.currentUser = user.displayName || user.email || "Usuario";
            
            // Cargar comentarios
            await cargarComentarios();
            
        } else {
            console.log("❌ Usuario no autenticado");
            
            // Limpiar comentarios si no hay usuario
            const listaComentarios = document.getElementById("lista_comentarios");
            if (listaComentarios) {
                listaComentarios.innerHTML = '<div class="sin-auth">Debes iniciar sesión para ver los comentarios</div>';
            }
        }
    });
}

// 3. MODIFICAR cargarComentarios para mejor manejo de errores
async function cargarComentarios() {
    if (!db) {
        console.error("Firestore no disponible");
        return;
    }
    
    try {
        const listaComentarios = document.getElementById("lista_comentarios");
        if (!listaComentarios) {
            console.error("Elemento lista_comentarios no encontrado");
            return;
        }
        
        console.log("🔄 Cargando comentarios desde Firestore...");
        
        // Mostrar indicador de carga
        listaComentarios.innerHTML = '<div class="cargando">⏳ Cargando comentarios...</div>';
        
        // Obtener comentarios ACTIVOS ordenados por fecha
        const snapshot = await db.collection('comentarios')
            .where('activo', '==', true)
            .orderBy('timestamp', 'desc')
            .get();
        
        // Limpiar indicador de carga
        listaComentarios.innerHTML = "";
        
        if (snapshot.empty) {
            listaComentarios.innerHTML = '<div class="sin-comentarios">📝 No hay comentarios aún. ¡Sé el primero en comentar!</div>';
            console.log("No se encontraron comentarios en la base de datos");
            return;
        }
        
        console.log(`📊 Encontrados ${snapshot.docs.length} comentarios en la base de datos`);
        
        // Crear elementos para cada comentario
        let comentariosCargados = 0;
        for (const doc of snapshot.docs) {
            const comentario = { id: doc.id, ...doc.data() };
            
            try {
                const elementoComentario = await crearElementoEntrada(comentario, "comentario", 0);
                listaComentarios.appendChild(elementoComentario);
                comentariosCargados++;
                
                console.log(`✅ Comentario cargado: ${comentario.id} - "${comentario.texto?.substring(0, 30)}..."`);
                
            } catch (error) {
                console.error(`❌ Error al crear elemento para comentario ${doc.id}:`, error);
            }
        }
        
        console.log(`🎉 ${comentariosCargados} comentarios cargados exitosamente en la interfaz`);
        
    } catch (error) {
        console.error("💥 Error al cargar comentarios:", error);
        
        const listaComentarios = document.getElementById("lista_comentarios");
        if (listaComentarios) {
            listaComentarios.innerHTML = `
                <div class="error-carga">
                    ⚠️ Error al cargar comentarios: ${error.message}
                    <br>
                    <button onclick="cargarComentarios()" style="margin-top: 10px;">🔄 Reintentar</button>
                </div>
            `;
        }
        
        // Mostrar error específico según el tipo
        if (error.code === 'permission-denied') {
            console.error("🚫 Error de permisos - Verifica las reglas de Firestore");
            mostrarVentanaEmergente("Error de permisos. Verifica las reglas de Firestore.");
        } else if (error.code === 'unavailable') {
            console.error("🌐 Error de conexión - Verifica tu conexión a internet");
            mostrarVentanaEmergente("Error de conexión. Verifica tu conexión a internet.");
        }
    }
}

// 4. MODIFICAR la inicialización para ser más clara
document.addEventListener('DOMContentLoaded', function () {
    console.log("🚀 DOM cargado - Iniciando aplicación de comentarios");
    
    // 1. Configurar sistema de verificación (esto también cargará comentarios)
    configurarSistemaVerificacion();
    
    // 2. Agregar función de debugging disponible globalmente
    window.cargarComentarios = cargarComentarios;
    window.verificarComentarios = () => {
        console.log("=== VERIFICACIÓN DE COMENTARIOS ===");
        console.log("Auth disponible:", !!auth);
        console.log("DB disponible:", !!db);
        console.log("Usuario actual:", auth?.currentUser?.email || "No autenticado");
        console.log("Elemento lista_comentarios:", !!document.getElementById("lista_comentarios"));
        
        if (auth?.currentUser) {
            console.log("🔄 Intentando cargar comentarios...");
            cargarComentarios();
        } else {
            console.log("❌ No se puede cargar comentarios sin autenticación");
        }
    };
    
    console.log("✅ Aplicación de comentarios iniciada");
});

// 5. AGREGAR función para debugging manual
function mostrarEstadoFirestore() {
    console.log("=== ESTADO DE FIRESTORE ===");
    
    if (!db) {
        console.log("❌ DB no disponible");
        return;
    }
    
    // Verificar conexión a Firestore
    db.collection('comentarios').limit(1).get()
        .then(snapshot => {
            console.log("✅ Conexión a Firestore exitosa");
            console.log("Documentos disponibles:", snapshot.size);
            
            if (snapshot.size > 0) {
                const doc = snapshot.docs[0];
                console.log("Ejemplo de documento:", doc.id, doc.data());
            }
        })
        .catch(error => {
            console.log("❌ Error de conexión a Firestore:", error);
        });
}

// Hacer función disponible globalmente
window.mostrarEstadoFirestore = mostrarEstadoFirestore;


// SISTEMA DE AVATAR CON FIREBASE - PARTE CAMILO
// Configuración de avatares predefinidos
const AVATARES_PREDEFINIDOS = {
    default: 'Imagenes/Avatares/Avatar1.jpg', // Cambia por tu ruta
};

// MODO OSCURO 
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
// SISTEMA DE AVATAR CON FIREBASE - OPTIMIZADO Y CON NOMBRE DE USUARIO
class AvatarManager {
    constructor() {
        this.currentUser = null;
        this.avatarElements = {
            navbar: document.getElementById("avatarSeleccionado"),
            profile: document.getElementById("profileAvatarDisplay")
        };
        this.init();
    }

    init() {
        firebase.auth().onAuthStateChanged((user) => {
            this.currentUser = user;
            if (user) {
                this.cargarAvatarUsuario();
                this.cargarNombreUsuario(); // NUEVA LÍNEA AGREGADA
                this.setupEventListeners();
            }
        });
    }

    async cargarAvatarUsuario() {
        if (!this.currentUser) return;

        try {
            const userDoc = await db.collection('usuarios').doc(this.currentUser.uid).get();
            if (userDoc.exists) {
                const userData = userDoc.data();
                const avatarUrl = userData.perfil?.avatar || AVATARES_PREDEFINIDOS.default;
                this.actualizarAvatarDOM(avatarUrl);
                
                if (!userData.perfil?.avatar) {
                    await this.guardarAvatarEnFirestore(AVATARES_PREDEFINIDOS.default);
                }
            }
        } catch (error) {
            console.error("Error al cargar avatar del usuario:", error);
            this.actualizarAvatarDOM(AVATARES_PREDEFINIDOS.default);
        }
    }

    // NUEVO MÉTODO AGREGADO
    async cargarNombreUsuario() {
        if (!this.currentUser) return;

        try {
            const userDoc = await db.collection('usuarios').doc(this.currentUser.uid).get();
            const possibleElements = [
                document.querySelector('.profile-username'),
                document.getElementById('profile-username'),
                document.getElementById('nombre-usuario'),
                document.querySelector('[data-username]'),
                document.querySelector('.username-display')
            ];

            if (userDoc.exists) {
                const userData = userDoc.data();
                const displayName = userData.nombre || this.currentUser.displayName || this.currentUser.email.split('@')[0];
                
                console.log("Nombre a mostrar:", displayName);
                
                possibleElements.forEach(element => {
                    if (element) {
                        element.textContent = displayName;
                        console.log("Nombre actualizado en elemento:", element);
                    }
                });
            } else {
                // Si no existe el documento, usar displayName o email
                const fallbackName = this.currentUser.displayName || this.currentUser.email.split('@')[0];
                
                possibleElements.forEach(element => {
                    if (element) {
                        element.textContent = fallbackName;
                    }
                });
            }
        } catch (error) {
            console.error("Error al cargar nombre del usuario:", error);
            
            // Fallback: usar al menos el email
            const fallbackName = this.currentUser.email ? this.currentUser.email.split('@')[0] : 'Usuario';
            const possibleElements = [
                document.querySelector('.profile-username'),
                document.getElementById('profile-username'),
                document.getElementById('nombre-usuario')
            ];
            
            possibleElements.forEach(element => {
                if (element) {
                    element.textContent = fallbackName;
                }
            });
        }
    }

    actualizarAvatarDOM(avatarUrl) {
        Object.values(this.avatarElements).forEach(element => {
            if (element) element.src = avatarUrl;
        });
    }

    async guardarAvatarEnFirestore(avatarUrl) {
        if (!this.currentUser) return false;

        try {
            await db.collection('usuarios').doc(this.currentUser.uid).update({
                'perfil.avatar': avatarUrl,
                'estadisticas.ultimaActividad': firebase.firestore.FieldValue.serverTimestamp()
            });
            console.log("Avatar guardado exitosamente en Firestore");
            return true;
        } catch (error) {
            console.error("Error al guardar avatar:", error);
            return false;
        }
    }

    async cambiarAvatar(nuevaUrl) {
        this.actualizarAvatarDOM(nuevaUrl);
        const exito = await this.guardarAvatarEnFirestore(nuevaUrl);
        
        if (!exito) {
            this.cargarAvatarUsuario();
            alert("Error al cambiar avatar. Inténtalo de nuevo.");
        }
        return exito;
    }

    setupEventListeners() {}
}

class ProfileMenu {
    constructor(avatarManager) {
        this.avatarManager = avatarManager;
        this.profileMenu = document.getElementById("profileMenu");
        this.btnAbrirModal = document.getElementById("abrirModalAvatar");
        this.btnCerrarProfile = document.getElementById("cerrarProfile");
        this.profileUsername = document.querySelector('.profile-username');
        this.init();
        
        // NUEVA LÍNEA: Llamar inmediatamente si ya hay un usuario autenticado
        if (firebase.auth().currentUser) {
            this.cargarDatosUsuario();
        }
    }

    init() {
        this.setupEventListeners();
        this.cargarDatosUsuario();
    }

    // MÉTODO ACTUALIZADO COMPLETAMENTE
    async cargarDatosUsuario() {
        const user = firebase.auth().currentUser;
        if (!user) return;

        try {
            // Buscar múltiples posibles elementos donde mostrar el nombre
            const possibleElements = [
                document.querySelector('.profile-username'),
                document.getElementById('profile-username'),
                document.getElementById('nombre-usuario'),
                document.querySelector('[data-username]'),
                document.querySelector('.username-display')
            ];

            const userDoc = await db.collection('usuarios').doc(user.uid).get();
            
            if (userDoc.exists) {
                const userData = userDoc.data();
                // Prioridad: nombre de Firestore > displayName > email
                const displayName = userData.nombre || user.displayName || user.email.split('@')[0];
                
                console.log("Nombre a mostrar:", displayName);
                
                // Actualizar todos los elementos encontrados
                possibleElements.forEach(element => {
                    if (element) {
                        element.textContent = displayName;
                        console.log("Nombre actualizado en elemento:", element);
                    }
                });
            } else {
                // Si no existe el documento, usar displayName o email
                const fallbackName = user.displayName || user.email.split('@')[0];
                
                possibleElements.forEach(element => {
                    if (element) {
                        element.textContent = fallbackName;
                    }
                });
            }
        } catch (error) {
            console.error("Error al cargar datos del usuario:", error);
            
            // Fallback: usar al menos el email
            const fallbackName = user.email ? user.email.split('@')[0] : 'Usuario';
            const possibleElements = [
                document.querySelector('.profile-username'),
                document.getElementById('profile-username'),
                document.getElementById('nombre-usuario')
            ];
            
            possibleElements.forEach(element => {
                if (element) {
                    element.textContent = fallbackName;
                }
            });
        }
    }

    setupEventListeners() {
        if (this.btnAbrirModal) {
            this.btnAbrirModal.addEventListener("click", (e) => {
                e.preventDefault();
                this.profileMenu.style.display = "flex";
            });
        }

        if (this.btnCerrarProfile) {
            this.btnCerrarProfile.addEventListener("click", () => {
                this.profileMenu.style.display = "none";
            });
        }

        const navegarA = (selector, url) => {
            const btn = document.getElementById(selector);
            if (btn) {
                btn.addEventListener("click", (e) => {
                    e.preventDefault();
                    this.profileMenu.style.display = "none";
                    window.location.href = url;
                });
            }
        };

        navegarA("btnMiPerfil", "/contenido_de_la_pagina/Mi_perfil/Mi_perfil.html");
        navegarA("btnConfiguracion", "/contenido_de_la_pagina/Ajustes/Configuracion.html");

        const btnCerrarSesion = document.getElementById("btnCerrarSesion");
        if (btnCerrarSesion) {
            btnCerrarSesion.addEventListener("click", (e) => {
                e.preventDefault();
                this.cerrarSesion();
            });
        }

        window.addEventListener("click", (e) => {
            if (e.target === this.profileMenu) {
                this.profileMenu.style.display = "none";
            }
        });

        const profileMenuContenido = document.querySelector(".profile-menu-contenido");
        if (profileMenuContenido) {
            profileMenuContenido.addEventListener("click", (e) => e.stopPropagation());
        }

        document.addEventListener("keydown", (e) => {
            if (e.key === "Escape" && this.profileMenu.style.display === "flex") {
                this.profileMenu.style.display = "none";
            }
        });
    }

    async cerrarSesion() {
        if (confirm('¿Estás seguro de que quieres cerrar sesión?')) {
            try {
                await firebase.auth().signOut();
                console.log("Sesión cerrada correctamente");
                const theme = localStorage.getItem("theme");
                localStorage.clear();
                if (theme) localStorage.setItem("theme", theme);
                sessionStorage.clear();
                window.location.href = "/contenido_de_la_pagina/Inicio_de_sesion/Inicio_de_sesion.html";
            } catch (error) {
                console.error("Error al cerrar sesión:", error);
                alert("Error al cerrar sesión. Por favor, inténtalo de nuevo.");
            }
        }
        this.profileMenu.style.display = "none";
    }
}

class AvatarModal {
    constructor(avatarManager) {
        this.avatarManager = avatarManager;
        this.modalAvatar = document.getElementById("modalAvatar");
        this.btnCambiarAvatar = document.getElementById("btnCambiarAvatar");
        this.btnCerrarModal = document.getElementById("cerrarModalAvatar");
        this.avatarOpciones = document.querySelectorAll(".avatar-img");
        this.init();
    }

    init() {
        this.setupEventListeners();
    }

    setupEventListeners() {
        if (this.btnCambiarAvatar) {
            this.btnCambiarAvatar.addEventListener("click", (e) => {
                e.preventDefault();
                this.modalAvatar.style.display = "block";
            });
        }

        if (this.btnCerrarModal) {
            this.btnCerrarModal.addEventListener("click", () => {
                this.modalAvatar.style.display = "none";
            });
        }

        this.avatarOpciones.forEach(avatar => {
            avatar.addEventListener("click", async () => {
                avatar.style.opacity = "0.5";
                const exito = await this.avatarManager.cambiarAvatar(avatar.src);
                avatar.style.opacity = "1";
                
                if (exito) this.modalAvatar.style.display = "none";
            });
        });

        window.addEventListener("click", (e) => {
            if (e.target === this.modalAvatar) {
                this.modalAvatar.style.display = "none";
            }
        });
    }
}

document.addEventListener("DOMContentLoaded", function () {
    const avatarManager = new AvatarManager();
    const profileMenu = new ProfileMenu(avatarManager);
    const avatarModal = new AvatarModal(avatarManager);
    
    window.avatarSystem = { avatarManager, profileMenu, avatarModal };
});