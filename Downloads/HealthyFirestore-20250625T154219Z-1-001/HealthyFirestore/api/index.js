// api/index.js (adaptado para Vercel)
// Importa las librerías necesarias para tu API
const express = require('express');
const cors = require('cors'); // <-- Esta línea se mantiene así, es la importación.
// La librería de Google Generative AI para interactuar con Gemini
const { GoogleGenerativeAI } = require('@google/generative-ai');

// Inicializa la aplicación Express
const app = express();
app.use(express.json()); // Middleware para parsear JSON en el cuerpo de las solicitudes

// --- Configuración de CORS con tu origen específico de Vercel ---
// Esta es la línea que debes modificar:
app.use(cors({ origin: true }));

// --- Configuración e inicialización de la IA de Google Generative ---
// IMPORTANTE: En Vercel, la API Key se obtiene de las variables de entorno configuradas
// en el dashboard de Vercel (process.env.GOOGLE_API_KEY).
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
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
    return {
      clasificacion: "rechazado",
      explicacion: `Error de conexión o API. Comentario no publicado. (${error.message})`
    };
  }
}

// --- Endpoint para moderar contenido ---
// En Vercel, si este archivo está en api/index.js, esta ruta será /api/moderar
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
// En Vercel, si este archivo está en api/index.js, esta ruta será /api/preguntar
app.post('/preguntar', (req, res) => {
  res.json({ 
    respuesta: "Este endpoint ha sido deprecado. Por favor usa /moderar para el sistema de moderación de contenido." 
  });
});

// --- Exporta la aplicación Express para que Vercel la ejecute como una Serverless Function ---
module.exports = app;
