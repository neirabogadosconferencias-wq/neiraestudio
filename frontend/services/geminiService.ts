
import { GoogleGenAI } from "@google/genai";
import { LawCase } from "../types";

// Fix: Corrected property names in analysis prompt to match LawCase interface (Spanish)
export const analyzeCase = async (lawCase: LawCase): Promise<string> => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const prompt = `
      Eres un asistente legal experto. Analiza el siguiente caso y proporciona un resumen ejecutivo, 
      posibles riesgos y sugerencias de próximos pasos legales.
      
      Título: ${lawCase.caratula}
      Expediente: ${lawCase.nro_expediente}
      Juzgado: ${lawCase.juzgado}
      Cliente: ${lawCase.cliente_nombre}
      Fuero: ${lawCase.fuero}
      Estado: ${lawCase.estado}
      Notas actuales: ${lawCase.notas.map(n => n.contenido).join('; ')}
      Alertas pendientes: ${lawCase.alertas.filter(a => !a.cumplida).map(a => a.titulo).join(', ')}
      
      Responde en español, de forma profesional y concisa.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });

    return response.text || "No se pudo generar el análisis en este momento.";
  } catch (error) {
    console.error("Gemini Error:", error);
    return "Error al conectar con la IA. Verifica tu conexión o configuración.";
  }
};
