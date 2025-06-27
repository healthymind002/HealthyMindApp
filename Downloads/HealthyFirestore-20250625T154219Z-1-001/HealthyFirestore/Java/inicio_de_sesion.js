document.addEventListener('DOMContentLoaded', function() {
    // Llamado de documentos
    const signUp = document.getElementById('signUp');
    const signIn = document.getElementById('signIn');
    const nombreBox = document.getElementById('nombre');
    const termsBox = document.getElementById('terms-box');
    const title = document.getElementById('titulo');
    const submitBtn = document.getElementById('submit-btn');
    const loginForm = document.getElementById('loginForm');
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    const nombreInput = document.querySelector('#nombre input');
    const rememberCheck = document.getElementById('remember');

    // Términos y condiciones
    const termsLink = document.getElementById('terms-open');
    const termsModal = document.getElementById('terms-modal');
    const modalClose = document.getElementById('modal-close');
    const acceptTerms = document.getElementById('accept-terms');
    const termsCheck = document.getElementById('terms');

    // Estado inicial - Inicio de sesión
    let isRegistrationMode = false;

    function setLoginMode() {
        isRegistrationMode = false;
        title.textContent = 'Iniciar Sesión';
        submitBtn.textContent = 'Iniciar sesión';
        nombreBox.classList.add('hidden');
        termsBox.classList.add('hidden');
        signUp.classList.remove('disable');
        signIn.classList.add('disable');
        if (termsCheck) termsCheck.removeAttribute('required');
        if (nombreInput) nombreInput.removeAttribute('required');
    }

    function setRegistrationMode() {
        isRegistrationMode = true;
        title.textContent = 'Registro';
        submitBtn.textContent = 'Registrarme';
        nombreBox.classList.remove('hidden');
        termsBox.classList.remove('hidden');
        signUp.classList.add('disable');
        signIn.classList.remove('disable');
        if (termsCheck) termsCheck.setAttribute('required', 'required');
        if (nombreInput) nombreInput.setAttribute('required', 'required');
    }

    setLoginMode();

    signUp.onclick = function() {
        if (isRegistrationMode) return;
        setRegistrationMode();
    }

    signIn.onclick = function() {
        if (!isRegistrationMode) return;
        setLoginMode();
    }

    function showMessage(message, isError = false) {
        let messageElement = document.getElementById('message-container');
        if (!messageElement) {
            messageElement = document.createElement('div');
            messageElement.id = 'message-container';
            messageElement.style.padding = '10px';
            messageElement.style.margin = '10px 0';
            messageElement.style.borderRadius = '5px';
            messageElement.style.textAlign = 'center';
            messageElement.style.fontWeight = 'bold';
            loginForm.insertBefore(messageElement, submitBtn);
        }
        messageElement.textContent = message;
        messageElement.style.backgroundColor = isError ? 'rgba(255, 100, 100, 0.7)' : 'rgba(100, 255, 100, 0.7)';
        messageElement.style.color = isError ? 'white' : 'black';
        setTimeout(() => {
            messageElement.textContent = '';
            messageElement.style.backgroundColor = 'transparent';
        }, 5000);
    }

    loginForm.addEventListener('submit', function(event) {
        event.preventDefault();

        const email = emailInput.value;
        const password = passwordInput.value;

        if (!email || !password) {
            showMessage('Por favor completa todos los campos', true);
            return;
        }

        if (password.length < 6) {
            showMessage('La contraseña debe tener al menos 6 caracteres', true);
            return;
        }

        submitBtn.disabled = true;
        submitBtn.textContent = 'Procesando...';

        if (isRegistrationMode) {
            // ========================================
            // MODO REGISTRO
            // ========================================
            const nombre = nombreInput ? nombreInput.value.trim() : '';
            if (!nombre) {
                showMessage('Por favor ingresa tu nombre', true);
                submitBtn.disabled = false;
                submitBtn.textContent = 'Registrarme';
                return;
            }
            if (!termsCheck || !termsCheck.checked) {
                showMessage('Debes aceptar los términos y condiciones', true);
                submitBtn.disabled = false;
                submitBtn.textContent = 'Registrarme';
                return;
            }

            // 🔥 REGISTRO con Authentication y Firestore
            firebase.auth().createUserWithEmailAndPassword(email, password)
                .then((userCredential) => {
                    const user = userCredential.user;
                    return user.updateProfile({ displayName: nombre })
                        .then(() => {
                            // Guardar datos en Firestore usando el UID del usuario
                            return db.collection('usuarios').doc(user.uid).set({
                                uid: user.uid,
                                nombre: nombre,
                                email: email,
                                emailVerificado: user.emailVerified,
                                fechaRegistro: firebase.firestore.FieldValue.serverTimestamp(),
                                aceptoTerminos: true,
                                activo: true,
                                tipoUsuario: 'usuario',
                                configuracion: {
                                    notificaciones: true,
                                    temaOscuro: localStorage.getItem("theme") === "dark",
                                    idioma: 'es'
                                },
                                perfil: {
                                    edad: null,
                                    genero: null,
                                    telefono: null,
                                    ubicacion: null,
                                    biografia: null,
                                    avatar: null
                                },
                                estadisticas: {
                                    sesionesChat: 0,
                                    tiempoEnApp: 0,
                                    ultimaActividad: firebase.firestore.FieldValue.serverTimestamp()
                                }
                            });
                        });
                })
                .then(() => {
                    showMessage('¡Registro exitoso! Revisa tu correo para verificar tu cuenta.');
                    submitBtn.disabled = false;
                    submitBtn.textContent = 'Registrarme';
                    setTimeout(() => {
                        window.location.href = "/index.html"; // Redirigir al inicio
                    }, 3000);
                })
                .catch((error) => {
                    console.error("Error en registro:", error);
                    let errorMessage;
                    switch (error.code) {
                        case 'auth/email-already-in-use':
                            errorMessage = 'Este correo ya está registrado';
                            break;
                        case 'auth/invalid-email':
                            errorMessage = 'Correo electrónico inválido';
                            break;
                        case 'auth/weak-password':
                            errorMessage = 'La contraseña es demasiado débil (mínimo 6 caracteres)';
                            break;
                        default:
                            errorMessage = 'Error al registrar: ' + (error.message || 'Error desconocido');
                    }
                    showMessage(errorMessage, true);
                    submitBtn.disabled = false;
                    submitBtn.textContent = 'Registrarme';
                });

        } else {
            // ========================================
            // MODO INICIO DE SESIÓN
            // ========================================
            firebase.auth().signInWithEmailAndPassword(email, password)
                .then((userCredential) => {
                    const user = userCredential.user;
                    console.log("Inicio de sesión exitoso:", user.email);
                    
                    // Actualizar última actividad en Firestore
                    db.collection('usuarios').doc(user.uid).update({
                        'estadisticas.ultimaActividad': firebase.firestore.FieldValue.serverTimestamp()
                    }).catch((error) => {
                        console.log("Error al actualizar última actividad:", error);
                        // No es crítico, continúa con el inicio de sesión
                    });

                    showMessage('¡Inicio de sesión exitoso!');
                    
                    // Guardar opción "Recordarme" si está marcada
                    if (rememberCheck && rememberCheck.checked) {
                        localStorage.setItem('rememberLogin', 'true');
                    } else {
                        localStorage.removeItem('rememberLogin');
                    }
                    
                    submitBtn.disabled = false;
                    submitBtn.textContent = 'Iniciar sesión';
                    
                    setTimeout(() => {
                        window.location.href = "/index.html"; // Redirigir al inicio
                    }, 2000);
                })
                .catch((error) => {
                    console.error("Error en inicio de sesión:", error);
                    let errorMessage;
                    switch (error.code) {
                        case 'auth/user-not-found':
                            errorMessage = 'No existe una cuenta con este correo electrónico';
                            break;
                        case 'auth/wrong-password':
                            errorMessage = 'Contraseña incorrecta';
                            break;
                        case 'auth/invalid-email':
                            errorMessage = 'Correo electrónico inválido';
                            break;
                        case 'auth/user-disabled':
                            errorMessage = 'Esta cuenta ha sido deshabilitada';
                            break;
                        case 'auth/too-many-requests':
                            errorMessage = 'Demasiados intentos fallidos. Intenta más tarde';
                            break;
                        case 'auth/network-request-failed':
                            errorMessage = 'Error de conexión. Verifica tu internet';
                            break;
                        default:
                            errorMessage = 'Error al iniciar sesión: ' + (error.message || 'Error desconocido');
                    }
                    showMessage(errorMessage, true);
                    submitBtn.disabled = false;
                    submitBtn.textContent = 'Iniciar sesión';
                });
        }
    });

    // Modal de términos y condiciones
    if (termsLink) {
        termsLink.addEventListener('click', function(e) {
            e.preventDefault();
            termsModal.classList.add('active');
            document.body.style.overflow = 'hidden';
        });
    }

    if (modalClose) {
        modalClose.addEventListener('click', function(){
            termsModal.classList.remove('active');
            document.body.style.overflow = '';
        });
    }

    if (termsModal) {
        termsModal.addEventListener('click', function(e){
            if (e.target === termsModal) {
                termsModal.classList.remove('active');
                document.body.style.overflow = '';
            }
        });
    }

    if (acceptTerms) {
        acceptTerms.addEventListener('click', function(){
            if (termsCheck) termsCheck.checked = true;
            termsModal.classList.remove('active');
            document.body.style.overflow = '';
        });
    }
});

// Modo Oscuro
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