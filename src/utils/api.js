// ─────────────────────────────────────────────────────────
// api.js — Central LLM abstraction (Navy/OpenAI-compatible)
// Architecture based on Whiteboard Studio patterns
// ─────────────────────────────────────────────────────────

import { getProviderSettings } from './models'

// ── Endpoints ────────────────────────────────────────────
const ENDPOINTS = {
  navy: '/api/llm/v1/chat/completions',     // Vite proxy → api.navyai.com
}

// ── AbortController for cancellation ─────────────────────
let currentController = null

export function cancelGeneration() {
  if (currentController) {
    currentController.abort()
    currentController = null
    return true
  }
  return false
}

export function isGenerating() {
  return currentController !== null
}

// ── Streaming (OpenAI/Navy SSE format) ───────────────────
async function _streamCompletion(response, onChunk, signal) {
  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let accumulated = ''
  let buffer = ''

  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      // Check abort between reads
      if (signal?.aborted) {
        reader.cancel()
        throw new DOMException('Aborted', 'AbortError')
      }

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() || ''

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue
        const data = line.slice(6).trim()
        if (data === '[DONE]') return accumulated

        try {
          const parsed = JSON.parse(data)
          const content = parsed.choices?.[0]?.delta?.content
          if (content) {
            accumulated += content
            onChunk?.(accumulated)
          }
        } catch {
          // Skip malformed SSE events
        }
      }
    }
  } catch (err) {
    if (err.name === 'AbortError') {
      // Attach partial content so caller can use what was streamed
      err.partialContent = accumulated
      throw err
    }
    throw err
  }

  return accumulated
}

// ── Main function: generateCompletion() ──────────────────
export async function generateCompletion(systemPrompt, userMessage, options = {}) {
  const {
    model,
    maxTokens = 8000,
    temperature = 0.6,
    stream = true,
    onChunk,
    _skipTemperature = false,
    _useMaxCompletionTokens = false,
  } = options

  // 1. Create AbortController
  currentController = new AbortController()
  const signal = currentController.signal

  // 2. Get provider settings
  const settings = getProviderSettings()
  const apiKey = settings.apiKey
  const selectedModel = model || settings.model

  if (!apiKey) {
    currentController = null
    throw new Error('API Key no configurada. Ve a Ajustes para añadir tu clave.')
  }

  // 3. Build endpoint and request (Navy = OpenAI-compatible format)
  const endpoint = ENDPOINTS.navy

  const body = {
    model: selectedModel,
    stream,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userMessage },
    ],
  }

  // Handle max_tokens vs max_completion_tokens (some models differ)
  if (_useMaxCompletionTokens) {
    body.max_completion_tokens = maxTokens
  } else {
    body.max_tokens = maxTokens
  }

  // Some models don't support temperature
  if (!_skipTemperature) {
    body.temperature = temperature
  }

  try {
    // 4. Fetch
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
      signal,
    })

    if (!response.ok) {
      const errorText = await response.text()
      let errorMsg = `API error ${response.status}`

      // Try to parse structured error
      try {
        const errorJson = JSON.parse(errorText)
        errorMsg = errorJson.error?.message || errorJson.message || errorMsg
      } catch {
        if (errorText.length < 500) errorMsg += `: ${errorText}`
      }

      throw new Error(errorMsg)
    }

    // 5. Stream or plain response
    if (stream && onChunk) {
      const result = await _streamCompletion(response, onChunk, signal)
      currentController = null
      return result
    } else {
      const json = await response.json()
      currentController = null
      return json.choices?.[0]?.message?.content || ''
    }
  } catch (error) {
    currentController = null

    // Cancellation
    if (error.name === 'AbortError') {
      const cancelError = new Error('Generación cancelada por el usuario')
      cancelError.partialContent = error.partialContent || ''
      cancelError.cancelled = true
      throw cancelError
    }

    // Auto-correction: temperature not supported → retry without it
    if (!_skipTemperature && /temperature/i.test(error.message)) {
      return generateCompletion(systemPrompt, userMessage, {
        ...options,
        _skipTemperature: true,
      })
    }

    // Auto-correction: max_tokens → max_completion_tokens
    if (!_useMaxCompletionTokens && /max_tokens/i.test(error.message)) {
      return generateCompletion(systemPrompt, userMessage, {
        ...options,
        _useMaxCompletionTokens: true,
      })
    }

    // Network error
    if (error instanceof TypeError && error.message.includes('fetch')) {
      throw new Error('Error de red. Verifica tu conexión a internet.')
    }

    throw error
  }
}

// ── Retry with backoff ───────────────────────────────────
export async function generateWithRetry(systemPrompt, userMessage, options = {}) {
  const { maxRetries = 3, retryDelay = 5000, ...restOptions } = options

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await generateCompletion(systemPrompt, userMessage, restOptions)
    } catch (error) {
      // Never retry these
      if (error.cancelled) throw error
      if (error.message.includes('cancelada')) throw error
      if (error.message.includes('401')) throw error
      if (error.message.includes('API Key')) throw error

      if (attempt === maxRetries) throw error

      // Wait before retrying
      await new Promise(r => setTimeout(r, retryDelay * (attempt + 1)))
    }
  }
}
