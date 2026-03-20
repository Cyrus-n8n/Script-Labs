// ─────────────────────────────────────────────────────────
// llm.js — YouTube analysis domain logic
// Uses api.js for LLM calls (no direct fetch)
// ─────────────────────────────────────────────────────────

import { generateCompletion, cancelGeneration } from './api'

// Re-export cancellation for LlmPanel
export { cancelGeneration }

// ── System prompt ────────────────────────────────────────
const SYSTEM_PROMPT = `Eres un analista experto en retención de audiencia en YouTube, especializado en el nicho de romance/audiolibros. Tu experiencia cubre:

- Estructura dramática y ritmo narrativo aplicado a retención de vídeo.
- Mecánica de ganchos (hooks): apertura, ganchos internos (re-hooks), y cliffhangers.
- Patrones de caída de audiencia: qué estructuras textuales provocan abandonos.
- Correlación entre métricas (CTR, retención, ADV, duración) y decisiones de guión.

REGLAS ESTRICTAS:
1. Todo el análisis en ESPAÑOL (España).
2. Cada afirmación debe referenciar datos concretos: título del vídeo, métrica específica, fragmento exacto del guión.
3. No des consejos genéricos de YouTube. Solo patrones derivados de los datos proporcionados.
4. Cuando identifiques un problema de retención, señala el PUNTO EXACTO del guión (citando el texto) y explica el mecanismo de pérdida.
5. Cuando identifiques un acierto, haz lo mismo: texto exacto + mecanismo de retención.

FORMATO DE RESPUESTA:
Devuelve el análisis en Markdown estructurado con las siguientes secciones:

## DIAGNÓSTICO GENERAL DEL CANAL
Resumen de 3-5 líneas con el estado del canal basado en los datos.

## PATRONES DE RETENCIÓN DETECTADOS
### Lo que funciona (retención alta)
Para cada patrón: ejemplo con título + fragmento de guión + métrica + mecanismo.

### Lo que falla (retención baja)
Para cada patrón: ejemplo con título + fragmento de guión + métrica + mecanismo de pérdida.

## ANÁLISIS POR VÍDEO
Para cada vídeo con transcripción:
### [Título] — Retención: X% | ADV: X | CTR: X%
- **Gancho (0-30s):** Evaluación del arranque con cita textual.
- **Puntos de caída probables:** Señalar momentos del guión donde la audiencia abandona, con cita y razón.
- **Ganchos internos:** Evaluar si existen y su efectividad.
- **Estructura narrativa:** Diagnóstico del arco dramático.
- **Veredicto:** Una línea con la causa raíz del rendimiento.

## CORRELACIONES MÉTRICAS
Relaciones observadas entre duración/retención, CTR/retención, tipo de gancho/ADV, etc.

## RECOMENDACIONES ESTRUCTURALES
Reglas concretas extraídas del análisis. Formato: SI [condición observada] → [resultado observado] → [acción recomendada].

## ANOTACIONES PARA GRÁFICAS
Devuelve un bloque JSON (dentro de un code block \`\`\`json) con anotaciones para superponer en las gráficas. Formato:
[
  {
    "videoId": "xxx",
    "type": "positive|negative|neutral",
    "label": "Texto corto para la gráfica (máx 60 chars)",
    "detail": "Explicación completa"
  }
]
Incluye anotaciones para los 5 mejores y 5 peores vídeos como mínimo.`

// ── Build user message with metrics + transcripts ────────
function buildUserMessage(videos) {
  let msg = '## Métricas del canal\n\n'
  msg += '| Título | Views | ADV | Retención % | CTR % | Duración (s) | RPM | Impresiones | Ingresos |\n'
  msg += '|--------|-------|-----|-------------|-------|-------------|-----|-------------|----------|\n'

  for (const v of videos) {
    msg += `| ${v.title} | ${Math.round(v.views)} | ${v.adv.toFixed(1)} | ${v.retention.toFixed(1)} | ${v.ctr.toFixed(1)} | ${v.duration} | ${v.rpm.toFixed(2)} | ${Math.round(v.impressions)} | $${v.revenue.toFixed(2)} |\n`
  }

  const withTranscript = videos.filter(v => v.transcript)
  if (withTranscript.length > 0) {
    msg += '\n## Transcripciones\n\n'
    for (const v of withTranscript) {
      const text = v.transcript.length > 4000
        ? v.transcript.slice(0, 4000) + '... [truncado]'
        : v.transcript
      msg += `### ${v.title}\n\`\`\`\n${text}\n\`\`\`\n\n`
    }
  }

  return msg
}

// ── Extract JSON annotations from markdown report ────────
export function extractAnnotations(markdown) {
  const match = markdown.match(/```json\s*\n([\s\S]*?)\n```/)
  if (!match) return []
  try {
    return JSON.parse(match[1])
  } catch {
    return []
  }
}

// ── Main analysis function ───────────────────────────────
// Delegates to api.js generateCompletion()
// onChunk(accumulatedText) — called with full accumulated text on each chunk
export async function analyzeWithLLM(videos, onChunk) {
  const userMessage = buildUserMessage(videos)

  return generateCompletion(SYSTEM_PROMPT, userMessage, {
    maxTokens: 8000,
    temperature: 0.6,
    stream: true,
    onChunk,
  })
}
