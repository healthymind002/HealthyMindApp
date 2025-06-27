// functions/index.js
// Importa las librerías necesarias para Firebase Cloud Functions y tu API
const functions = require('firebase-functions');
const express = require('express');
const cors = require('cors');
// La librería de Google Generative AI para interactuar con Gemini
const { GoogleGenerativeAI } = require('@google/generative-ai');

// NO SE USAN EN CLOUD FUNCTIONS:
// const path = require('path');
// require('dotenv').config(); // Las variables de entorno se gestionan diferente en Cloud Functions

// Inicializa la aplicación Express
const app = express();
app.use(express.json()); // Middleware para parsear JSON en el cuerpo de las solicitudes

// Configuración de CORS. 'origin: true' permite cualquier origen, lo cual es útil si tu frontend
// está en el mismo dominio de Firebase Hosting. Si necesitas más especificidad,
// puedes configurarlo con dominios permitidos.
app.use(cors({ origin: true }));

// --- Configuración e inicialización de la IA de Google Generative ---
// IMPORTANTE: La API Key debe obtenerse de la configuración de las funciones de Firebase,
// NO directamente de process.env. Se asume que has configurado una variable
// de entorno en Firebase llamada 'gemini.api_key'.
const genAI = new GoogleGenerativeAI(functions.config().gemini.api_key);
const model = genAI.getGenerativeModel({ model: 'models/gemini-1.5-flash-8b' }, { apiVersion: 'v1beta' });

// --- Instrucción específica para el modelo Gemini (moderación) ---
const INSTRUCCION_MODERACION = `
Tu tarea es actuar como un moderador de contenido automático. Analiza el comentario proporcionado y determina si es apropiado para ser publicado o si contiene elementos inapropiados como:

1. Lenguaje ofensivo, insultos o groserías
2. Discurso de odio o discriminación
3. Acoso, amenazas o intimidación
4. Contenido sexual explícito
5. Violencia gráfica o excesiva
6. Promoción de actividades ilegales
7. Spam o contenido comercial no solicitado
8. Información personal identificable (sin consentimiento)
9. Desinformación peligrosa

Responde en formato JSON con estos campos EXACTOS:
- clasificacion: "aprobado" (si el contenido es apropiado) o "rechazado" (si contiene elementos inapropiados)
- explicacion: Si es rechazado, explica muy pero muy brevemente por qué. Si es aprobado, simplemente indica "Contenido apropiado".

Responde SOLO con el JSON, sin texto adicional.
`;

// --- Función para moderar contenido utilizando Gemini ---
async function moderarContenido(contenido) {
  try {
    const result = await model.generateContent(
      `${INSTRUCCION_MODERACION}
      
      Comentario: "${contenido}"`
    );
    
    const response = await result.response;
    const text = response.text().trim();
    
    // Intenta parsear la respuesta como JSON
    try {
      // Elimina cualquier texto que no sea JSON
      const jsonMatch = text.match(/\{.*\}/s);
      if (jsonMatch) {
        const jsonText = jsonMatch[0];
        return JSON.parse(jsonText);
      } else {
        // Respuesta por defecto si no se detecta JSON o está incompleto
        return {
          clasificacion: "rechazado",
          explicacion: "No se pudo analizar correctamente el contenido por el modelo. Por precaución, el comentario no será publicado."
        };
      }
    } catch (parseError) {
      console.error("Error al parsear JSON de respuesta de Gemini:", parseError);
      return {
        clasificacion: "rechazado",
        explicacion: "Error en el sistema de moderación. Por precaución, el comentario no será publicado."
      };
    }
  } catch (error) {
    console.error("Error al generar respuesta de moderación con Gemini:", error);
    // Para errores de API, es mejor devolver un resultado "rechazado" o un error específico
    // en lugar de lanzar el error directamente, para que el frontend pueda manejarlo
    return {
      clasificacion: "rechazado",
      explicacion: `Error de conexión o API. Comentario no publicado. (${error.message})`
    };
  }
}

// --- Endpoint para moderar contenido ---
// Este endpoint será accesible vía /api/moderar debido a la configuración de 'rewrites' en firebase.json
app.post('/moderar', async (req, res) => {
  try {
    const { contenido } = req.body;
    
    if (!contenido || typeof contenido !== 'string' || contenido.trim() === '') {
      return res.status(400).json({ 
        clasificacion: "rechazado",
        explicacion: "El comentario está vacío o no es un formato válido."
      });
    }
    
    const resultado = await moderarContenido(contenido);
    res.json(resultado);
  } catch (error) {
    console.error("Error en endpoint de moderación:", error);
    res.status(500).json({ 
      clasificacion: "rechazado",
      explicacion: "Error interno del servidor de moderación." 
    });
  }
});

// --- Mantener el endpoint original /preguntar (modificado para ser más claro) ---
// Este endpoint también será accesible vía /api/preguntar
app.post('/preguntar', (req, res) => {
  // El código original marcaba este endpoint como deprecado.
  // Es bueno mantenerlo para no romper cosas si se usaba antes,
  // pero el mensaje indica que se debe usar /moderar.
  res.json({ 
    respuesta: "Este endpoint ha sido deprecado. Por favor usa /moderar para el sistema de moderación de contenido." 
  });
});

// --- NO SE SIRVEN ARCHIVOS HTML DESDE LAS FUNCIONES ---
// app.get('/', (req, res) => {
//   res.sendFile(path.join(__dirname, 'pagina_principal_Coemntarios_Beta.js'));
// });
// Los archivos estáticos como HTML son servidos por Firebase Hosting.
// Elimina esta ruta en Cloud Functions.

// --- NO SE USA app.listen EN CLOUD FUNCTIONS ---
// const PORT = 5000;
// app.listen(PORT, () => {
//   console.log(`Servidor de moderación automática corriendo en el puerto ${PORT}`);
//   console.log(`Accede al sistema en http://localhost:${PORT}`);
// });
// Cloud Functions no 'escuchan' en un puerto; son invocadas por HTTP requests.

// --- Exporta la aplicación Express como una función HTTP de Firebase ---
// El nombre 'api' aquí debe coincidir con el valor de "function" en firebase.json
// en la sección de "rewrites".
exports.api = functions.https.onRequest(app);

