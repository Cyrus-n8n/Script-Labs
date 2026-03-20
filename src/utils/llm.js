// ─────────────────────────────────────────────────────────
// llm.js — YouTube analysis domain logic
// Uses api.js for LLM calls (no direct fetch)
// ─────────────────────────────────────────────────────────

import { generateCompletion, cancelGeneration } from './api'

// Re-export cancellation for LlmPanel
export { cancelGeneration }

export const MIN_TRANSCRIPTS = 5

// ── Content type definitions (exported for UI) ───────────
export const CONTENT_TYPES = [
  {
    value: 'auto',
    label: 'Detección Automática',
    description: 'El LLM detecta el tipo de contenido a partir de los títulos y transcripciones.',
  },
  {
    value: 'fiction',
    label: 'Ficción Narrativa / Audiolibro',
    description: 'Historias, romance, drama, thriller. Evalúa ganchos narrativos, ritmo, promesa del título vs ejecución.',
  },
  {
    value: 'documentary',
    label: 'Documental / Educativo',
    description: 'Historia, ciencia, biografías, explicaciones. Evalúa estructura informativa, claridad, engagement por segmento.',
  },
  {
    value: 'compilation',
    label: 'Compilación / Listado',
    description: 'Top 10, rankings, curiosidades, recopilaciones. Evalúa ritmo entre items, fatiga de formato, hooks de transición.',
  },
]

// ── System prompt builder ────────────────────────────────

const PROMPT_BASE = `Eres un analista senior de retención de audiencia en YouTube. Tu trabajo es diagnosticar por qué los espectadores abandonan los vídeos y qué cambios estructurales mejorarían la retención.

Recibirás una tabla con métricas de vídeos de un canal de YouTube y, cuando estén disponibles, las transcripciones de los vídeos. Tu análisis debe ser específico, accionable y basado en evidencia.

REGLAS ESTRICTAS:
1. Todo el análisis en ESPAÑOL (España).
2. Cada afirmación debe referenciar datos concretos: título del vídeo, métrica específica, fragmento exacto de la transcripción cuando esté disponible.
3. No des consejos genéricos de YouTube. Solo patrones derivados de los datos proporcionados.
4. Cuando identifiques un problema de retención, señala el PUNTO EXACTO (citando el texto si hay transcripción) y explica el mecanismo de pérdida.
5. Cuando identifiques un acierto, haz lo mismo: texto exacto + mecanismo de retención.

MÉTRICAS DISPONIBLES:
- Retención (%): porcentaje medio del vídeo que la audiencia ve
- ADV (Average Duration Viewed): duración media de visualización en segundos
- CTR (%): porcentaje de clics sobre impresiones
- Duración: duración total del vídeo en segundos
- Views: visualizaciones totales
- RPM ($): ingresos por mil visualizaciones

FORMATO DE OUTPUT OBLIGATORIO:
Devuelve el análisis en Markdown estructurado con las siguientes secciones:

## DIAGNÓSTICO GENERAL DEL CANAL
Resumen de 3-5 líneas con el estado del canal basado en los datos.

## PATRONES DE RETENCIÓN DETECTADOS
### Lo que funciona (retención alta)
Para cada patrón: ejemplo con título + fragmento de transcripción + métrica + mecanismo.

### Lo que falla (retención baja)
Para cada patrón: ejemplo con título + fragmento de transcripción + métrica + mecanismo de pérdida.

## ANÁLISIS POR VÍDEO
Para cada vídeo con transcripción:
### [Título] — Retención: X% | ADV: X | CTR: X%
- **Gancho (0-30s):** Evaluación del arranque con cita textual.
- **Puntos de caída probables:** Señalar momentos donde la audiencia abandona, con cita y razón.
- **Ganchos internos:** Evaluar si existen y su efectividad.
- **Estructura:** Diagnóstico de la estructura del contenido.
- **Veredicto:** Una línea con la causa raíz del rendimiento. Al final del veredicto, OBLIGATORIO incluir etiquetas de fallo en formato: \`FALLOS: [ETIQUETA1, ETIQUETA2]\` o \`FALLOS: Ninguno\`.

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
Incluye anotaciones para los 5 mejores y 5 peores vídeos como mínimo.

## DASHBOARD DE FALLOS

Después de todos los análisis individuales, genera una tabla resumen con el conteo total de cada tipo de fallo detectado en el dataset:

| Tipo de Fallo | Frecuencia | % del catálogo | Ret. media CON fallo | Ret. media SIN fallo | Impacto estimado |
|---|---|---|---|---|---|
| FALLO-DESCRIPCIÓN | X | X% | X% | X% | -X puntos |

Ordenar de mayor a menor frecuencia. Solo incluir fallos que aparecen al menos 1 vez. La columna "Impacto estimado" es la diferencia entre la retención media de vídeos CON ese fallo y la retención media de vídeos SIN ese fallo.

## REGLAS ANTI-FALLO PARA PRÓXIMO CONTENIDO

Genera un bloque de texto formateado como instrucciones directas, listo para copiar y pegar en un brief de dirección narrativa. Basado en los 3 fallos más frecuentes y los 3 patrones de mayor retención detectados.

El bloque DEBE estar envuelto en un bloque de código Markdown (triple backtick) para facilitar la copia:

\`\`\`
REGLAS ANTI-FALLO DERIVADAS DEL ANÁLISIS DE RETENCIÓN DEL CANAL:

[Regla 1: prohibición basada en el fallo más frecuente, con dato de impacto]
[Regla 2: prohibición basada en el segundo fallo más frecuente]
[Regla 3: prohibición basada en el tercer fallo más frecuente]
[Regla 4: instrucción positiva basada en el patrón de mayor retención]
[Regla 5: instrucción positiva basada en el segundo patrón]
DURACIÓN MÁXIMA RECOMENDADA: [X palabras / X segundos, basado en correlación duración-retención]
ENTREGA DE PROMESA DEL TÍTULO: antes de la palabra [número, basado en los vídeos con mejor retención]
\`\`\`

Máximo 8 reglas. Cada regla DEBE ser una instrucción ejecutable con dato de soporte. "PROHIBIDO flashback en los primeros 1.000 palabras (impacto: -8 puntos de retención)" es ejecutable. "Los flashbacks parecen afectar la retención" NO es ejecutable.

## BENCHMARKS POR CATEGORÍA DE TÍTULO

Agrupa los vídeos del dataset por el tipo de premisa/título que comparten. Detecta las categorías automáticamente a partir de patrones en los títulos. Categorías típicas: "humillación pública + elección", "identidad oculta", "confrontación con diálogo directo", "confinamiento forzado", "error accidental", "protección sobrenatural", "reencuentro", etc.

| Categoría | Nº Vídeos | Retención media | CTR medio | ADV medio | Mejor vídeo | Peor vídeo |
|---|---|---|---|---|---|---|

Después de la tabla, UNA línea de observación: cuál es la categoría con mejor rendimiento y por qué, y cuál con peor y por qué.

Incluir una línea de observación después de la tabla: cuál es la categoría con mejor rendimiento y cuál con peor, y por qué (una frase por cada una).`

// ── Content-type specific blocks ─────────────────────────

const PROMPT_FICTION = `

TIPO DE CONTENIDO: FICCIÓN NARRATIVA / AUDIOLIBRO

Este canal produce contenido de ficción narrada (historias, romance, drama, audiolibros). El análisis debe evaluar:

GANCHO DE APERTURA (primeros 30 segundos / primeras 200 palabras de transcripción):
- ¿La primera frase establece una situación de tensión, conflicto o intriga?
- ¿Hay acción, diálogo o situación concreta, o es descripción de ambiente/backstory?
- ¿La promesa del título se cumple en los primeros 5 minutos estimados?

RITMO NARRATIVO:
- ¿Hay bloques descriptivos de más de 3 frases sin acción ni diálogo?
- ¿Hay deliberaciones internas que la audiencia ya resolvió?
- ¿Hay flashbacks que interrumpen tensión activa?
- ¿El ritmo alterna entre tensión y alivio, o es plano?

PROMESA DEL TÍTULO:
- Descomponer el título en promesas literales
- Verificar si cada promesa aparece en la transcripción (cuando disponible)
- Estimar en qué minuto se cumple cada promesa

TAXONOMÍA DE FALLOS (asignar 0-3 etiquetas por vídeo):
- FALLO-FLASHBACK: Abre con acción y retrocede a backstory antes de resolver la tensión
- FALLO-DESCRIPCIÓN: Bloque descriptivo >3 frases sin acción ni diálogo interrumpe momentum
- FALLO-PROMESA-DIFERIDA: El momento prometido por el título no aparece en los primeros 5 minutos (~750 palabras)
- FALLO-DELIBERACIÓN: Personaje debate internamente algo que la audiencia ya resolvió
- FALLO-DUPLICACIÓN: Concepto nuclear idéntico a otro vídeo del dataset
- FALLO-DURACIÓN: Vídeo >2500s con retención <27%

Para cada vídeo con transcripción, incluir CITAS TEXTUALES del fragmento que causa el fallo y del fragmento que funciona como mejor gancho interno.`

const PROMPT_DOCUMENTARY = `

TIPO DE CONTENIDO: DOCUMENTAL / EDUCATIVO

Este canal produce contenido informativo (documentales, educación, biografías, explicaciones). El análisis debe evaluar:

GANCHO DE APERTURA (primeros 30 segundos):
- ¿Se establece una pregunta, misterio o dato sorprendente?
- ¿La audiencia entiende por qué debería seguir viendo en los primeros 15 segundos?
- ¿Hay una tesis clara o promesa de revelación?

ESTRUCTURA INFORMATIVA:
- ¿La información se presenta en orden de interés decreciente o creciente?
- ¿Hay segmentos de más de 3 minutos sin nueva información o sin cambio de ángulo?
- ¿Los datos se anclan en historias concretas o son abstractos?
- ¿Hay transiciones claras entre secciones temáticas?

ENGAGEMENT POR SEGMENTO:
- ¿Cada segmento del vídeo aporta información nueva o repite lo ya dicho?
- ¿Hay "valles informativos" donde el narrador rellena con generalidades?
- ¿Los ejemplos son concretos y visualizables o abstractos?

TAXONOMÍA DE FALLOS (asignar 0-3 etiquetas por vídeo):
- FALLO-TESIS-AUSENTE: El vídeo no establece una pregunta o tesis clara en los primeros 60 segundos
- FALLO-VALLE-INFORMATIVO: Segmento de >2 minutos sin información nueva o ángulo diferente
- FALLO-ABSTRACCIÓN: La información se presenta como datos abstractos sin anclaje en historias o ejemplos concretos
- FALLO-REPETICIÓN: El mismo punto se hace más de una vez con diferentes palabras
- FALLO-TRANSICIÓN: Cambio de tema sin señalización clara para la audiencia
- FALLO-DURACIÓN: Vídeo demasiado largo para la densidad informativa que contiene`

const PROMPT_COMPILATION = `

TIPO DE CONTENIDO: COMPILACIÓN / LISTADO

Este canal produce contenido de formato lista (Top 10, rankings, curiosidades, recopilaciones). El análisis debe evaluar:

GANCHO DE APERTURA:
- ¿El primer item de la lista es lo suficientemente fuerte para retener?
- ¿Se establece la premisa del listado de forma que genere curiosidad?
- ¿Hay una promesa de "el mejor item está al final" que motive ver completo?

RITMO ENTRE ITEMS:
- ¿Cada item tiene suficiente desarrollo o son demasiado breves/extensos?
- ¿Hay variación en el ritmo o todos los items tienen la misma estructura?
- ¿Las transiciones entre items son limpias o hay relleno?

FATIGA DE FORMATO:
- ¿En qué punto del listado se estima que la audiencia abandona?
- ¿Hay escalación de interés hacia el final o el interés es plano?
- ¿Los items finales son más fuertes que los iniciales?

TAXONOMÍA DE FALLOS (asignar 0-3 etiquetas por vídeo):
- FALLO-PRIMER-ITEM-DÉBIL: El primer item no es lo suficientemente llamativo para retener
- FALLO-ITEMS-UNIFORMES: Todos los items tienen la misma estructura y duración, causando monotonía
- FALLO-RELLENO: Hay texto entre items que no añade valor (transiciones vacías, recaps)
- FALLO-ESCALACIÓN-AUSENTE: Los items más fuertes están al principio y los débiles al final
- FALLO-ITEM-LARGO: Un item individual excede los 3 minutos sin justificación
- FALLO-DURACIÓN: Demasiados items para la duración total del vídeo`

const PROMPT_AUTO = `

DETECCIÓN DE TIPO DE CONTENIDO:

Antes de comenzar el análisis, examina los títulos de los vídeos y las transcripciones disponibles. Determina el tipo predominante del canal:

- Si los títulos contienen elementos narrativos (personajes, situaciones, diálogos, conflictos), clasifica como FICCIÓN NARRATIVA y aplica los criterios de ficción: evalúa ganchos narrativos, ritmo entre acción/descripción, promesa del título, flashbacks, deliberaciones. Taxonomía de fallos: FALLO-FLASHBACK, FALLO-DESCRIPCIÓN, FALLO-PROMESA-DIFERIDA, FALLO-DELIBERACIÓN, FALLO-DUPLICACIÓN, FALLO-DURACIÓN.
- Si los títulos contienen temas informativos (fechas, lugares, conceptos, preguntas), clasifica como DOCUMENTAL y aplica los criterios documentales: evalúa estructura informativa, tesis, valles informativos, abstracción, transiciones. Taxonomía de fallos: FALLO-TESIS-AUSENTE, FALLO-VALLE-INFORMATIVO, FALLO-ABSTRACCIÓN, FALLO-REPETICIÓN, FALLO-TRANSICIÓN, FALLO-DURACIÓN.
- Si los títulos contienen estructuras de lista (números, "Top X", "mejores", "peores"), clasifica como COMPILACIÓN y aplica los criterios de compilación: evalúa primer item, ritmo entre items, fatiga de formato, escalación. Taxonomía de fallos: FALLO-PRIMER-ITEM-DÉBIL, FALLO-ITEMS-UNIFORMES, FALLO-RELLENO, FALLO-ESCALACIÓN-AUSENTE, FALLO-ITEM-LARGO, FALLO-DURACIÓN.
- Si el canal mezcla tipos, indica el tipo de cada vídeo individualmente y aplica la taxonomía correspondiente.

Declara el tipo detectado al inicio del DIAGNÓSTICO GENERAL: "Tipo de contenido detectado: [tipo]"

Luego aplica la taxonomía de fallos correspondiente al tipo detectado.`

function buildAnalysisSystemPrompt(contentType) {
  let prompt = PROMPT_BASE

  switch (contentType) {
    case 'fiction':
      prompt += PROMPT_FICTION
      break
    case 'documentary':
      prompt += PROMPT_DOCUMENTARY
      break
    case 'compilation':
      prompt += PROMPT_COMPILATION
      break
    case 'auto':
    default:
      prompt += PROMPT_AUTO
      break
  }

  return prompt
}

// ── Build user message — only videos with transcript ─────
function buildUserMessage(videos) {
  const withTranscript = videos.filter(v => v.transcript && v.transcript.trim())
  const withoutTranscript = videos.length - withTranscript.length

  let msg = `Analizando ${withTranscript.length} vídeos con transcripción de un catálogo total de ${videos.length} vídeos. Los ${withoutTranscript} vídeos sin transcripción no se incluyen en este análisis.\n\n`

  msg += '## Métricas del canal\n\n'
  msg += '| Título | Views | ADV | Retención % | CTR % | Duración (s) | RPM | Impresiones | Ingresos |\n'
  msg += '|--------|-------|-----|-------------|-------|-------------|-----|-------------|----------|\n'

  for (const v of withTranscript) {
    msg += `| ${v.title} | ${Math.round(v.views)} | ${v.adv.toFixed(1)} | ${v.retention.toFixed(1)} | ${v.ctr.toFixed(1)} | ${v.duration} | ${v.rpm.toFixed(2)} | ${Math.round(v.impressions)} | $${v.revenue.toFixed(2)} |\n`
  }

  msg += '\n## Transcripciones\n\n'
  for (const v of withTranscript) {
    const text = v.transcript.length > 4000
      ? v.transcript.slice(0, 4000) + '... [truncado]'
      : v.transcript
    msg += `### ${v.title}\n\`\`\`\n${text}\n\`\`\`\n\n`
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

// ── Extract fault dashboard table as structured data ─────
// Handles both 4-column (legacy) and 6-column (new) table formats
export function extractFaultDashboard(markdown) {
  const sectionMatch = markdown.match(/## DASHBOARD DE FALLOS\s*\n([\s\S]*?)(?=\n## |$)/)
  if (!sectionMatch) return []

  const section = sectionMatch[1]
  const lines = section.split('\n').filter(l => l.trim().startsWith('|'))
  if (lines.length < 3) return []

  const dataRows = lines.slice(2)

  return dataRows.map(row => {
    const cells = row.split('|').map(c => c.trim()).filter(c => c.length > 0)
    if (cells.length < 4) return null

    const type = cells[0] || ''
    const frequency = parseInt(cells[1]) || 0
    const percentage = parseFloat(cells[2]) || 0

    // 6-column format: Type | Freq | % | Ret WITH | Ret WITHOUT | Impact
    if (cells.length >= 6) {
      const avgRetentionWith = cells[3] || ''
      const avgRetentionWithout = cells[4] || ''
      const impactMatch = (cells[5] || '').match(/-?([\d.]+)/)
      const retentionImpact = impactMatch ? -Math.abs(parseFloat(impactMatch[1])) : 0
      return { type, frequency, percentage, avgRetentionWith, avgRetentionWithout, retentionImpact }
    }

    // 4-column fallback: Type | Freq | % | Impact
    const impactMatch = (cells[3] || '').match(/-?([\d.]+)/)
    const retentionImpact = impactMatch ? -Math.abs(parseFloat(impactMatch[1])) : 0
    return { type, frequency, percentage, avgRetentionWith: '', avgRetentionWithout: '', retentionImpact }
  }).filter(Boolean)
}

// ── Extract anti-fault rules block ───────────────────────
export function extractAntiFaultRules(markdown) {
  const sectionMatch = markdown.match(/## REGLAS ANTI-FALLO PARA PRÓXIMO (?:GUION|CONTENIDO)\s*\n([\s\S]*?)(?=\n## |$)/)
  if (!sectionMatch) return null

  const section = sectionMatch[1]
  const codeMatch = section.match(/```\s*\n([\s\S]*?)\n```/)
  if (!codeMatch) return null

  return codeMatch[1].trim()
}

// ── Main analysis function ───────────────────────────────
// Delegates to api.js generateCompletion()
// onChunk(accumulatedText) — called with full accumulated text on each chunk
export async function analyzeWithLLM(videos, onChunk, contentType = 'auto') {
  const systemPrompt = buildAnalysisSystemPrompt(contentType)
  const userMessage = buildUserMessage(videos)

  return generateCompletion(systemPrompt, userMessage, {
    maxTokens: 16000,
    temperature: 0.6,
    stream: true,
    onChunk,
  })
}
