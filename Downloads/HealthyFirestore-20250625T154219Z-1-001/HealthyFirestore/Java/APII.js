const express = require('express');
const cors = require('cors');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const path = require('path');
require('dotenv').config();

const app = express();
app.use(express.json());
app.use(cors());

// Servir archivos estáticos desde la carpeta actual
app.use(express.static(path.join(__dirname, '')));

// Instanciamos la IA de Google Generative
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
const model = genAI.getGenerativeModel({ model: 'models/gemini-1.5-flash-8b' }, { apiVersion: 'v1beta' });

// Instrucciones específicas para verificar contenido apropiado
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

// Función para moderar contenido
async function moderarContenido(contenido) {
  try {
    // Instrucción optimizada para respuestas rápidas y precisas
    const result = await model.generateContent(
      `${INSTRUCCION_MODERACION}
      
      Comentario: "${contenido}"`
    );
    
    const response = await result.response;
    const text = response.text().trim();
    
    // Intentar parsear la respuesta como JSON
    try {
      // Eliminar cualquier texto que no sea JSON
      const jsonMatch = text.match(/\{.*\}/s);
      if (jsonMatch) {
        const jsonText = jsonMatch[0];
        return JSON.parse(jsonText);
      } else {
        // Respuesta por defecto si no se detecta JSON
        return {
          clasificacion: "rechazado",
          explicacion: "No se pudo analizar correctamente el contenido. Por precaución, el comentario no será publicado."
        };
      }
    } catch (parseError) {
      console.error("Error al parsear JSON de respuesta:", parseError);
      return {
        clasificacion: "rechazado",
        explicacion: "Error en el sistema de moderación. Por precaución, el comentario no será publicado."
      };
    }
  } catch (error) {
    console.error("Error al generar respuesta de moderación:", error);
    throw error;
  }
}

// Endpoint para moderar contenido
app.post('/moderar', async (req, res) => {
  try {
    const { contenido } = req.body;
    
    if (!contenido || contenido.trim() === '') {
      return res.status(400).json({ 
        clasificacion: "rechazado",
        explicacion: "El comentario está vacío"
      });
    }
    
    const resultado = await moderarContenido(contenido);
    res.json(resultado);
  } catch (error) {
    console.error("Error en endpoint de moderación:", error);
    res.status(500).json({ 
      clasificacion: "rechazado",
      explicacion: "Error en el servidor de moderación" 
    });
  }
});

// Mantener el endpoint original para compatibilidad
app.post('/preguntar', async (req, res) => {
  const { pregunta } = req.body;
  res.json({ 
    respuesta: "Este endpoint ha sido deprecado. Por favor usa /moderar para el sistema de moderación de contenido." 
  });
});

// Ruta para servir la página HTML
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'pagina_principal_Coemntarios_Beta.js'));
});

const PORT = 5000;

app.listen(PORT, () => {
  console.log(`Servidor de moderación automática corriendo en el puerto ${PORT}`);
  console.log(`Accede al sistema en http://localhost:${PORT}`);
});