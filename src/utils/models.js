// ─────────────────────────────────────────────────────────
// models.js — Model catalog + settings persistence
// Storage pattern from Whiteboard Studio
// ─────────────────────────────────────────────────────────

// ── Storage keys ─────────────────────────────────────────
const STORAGE_KEY = 'scriptlab_api_settings'

// ── Defaults ─────────────────────────────────────────────
export const DEFAULT_MODEL = 'gemini-2.5-flash'
export const DEFAULT_API_KEY = 'sk-navy-sbSd-2MuihNu3i_ieIkjAmhPKBvizma7Xs1JXTBYxV0'
export const DEFAULT_PROVIDER = 'navy'

// ── Model catalog ────────────────────────────────────────
export const MODEL_GROUPS = [
  {
    provider: 'OpenAI',
    models: [
      { id: 'gpt-5.2', cost: 3.5 },
      { id: 'gpt-5.1', cost: 2.5 },
      { id: 'gpt-5', cost: 2.5 },
      { id: 'gpt-5-mini', cost: 1.8 },
      { id: 'gpt-5-nano', cost: 1.3 },
      { id: 'gpt-4o', cost: 2.5 },
      { id: 'gpt-4o-mini', cost: 1.2 },
      { id: 'gpt-4.1', cost: 1.8 },
      { id: 'gpt-4.1-mini', cost: 1.3 },
      { id: 'gpt-4.1-nano', cost: 1.2 },
      { id: 'o4-mini', cost: 1.6 },
      { id: 'o3-mini', cost: 1.6 },
      { id: 'o3', cost: 2.5 },
    ],
  },
  {
    provider: 'Anthropic',
    models: [
      { id: 'claude-sonnet-4.6', cost: 12 },
      { id: 'claude-sonnet-4.5', cost: 12 },
      { id: 'claude-sonnet-4', cost: 12 },
      { id: 'claude-haiku-4.5', cost: 5 },
    ],
  },
  {
    provider: 'Google',
    models: [
      { id: 'gemini-2.5-pro', cost: 6 },
      { id: 'gemini-2.5-flash', cost: 1.5, default: true },
      { id: 'gemini-2.5-flash-thinking', cost: 1.5 },
      { id: 'gemini-3-flash-preview', cost: 2 },
      { id: 'gemini-3-pro-preview', cost: 8 },
    ],
  },
  {
    provider: 'DeepSeek',
    models: [
      { id: 'deepseek-chat', cost: 1 },
      { id: 'deepseek-reasoner', cost: 1.2 },
      { id: 'deepseek-v3.2', cost: 1 },
      { id: 'deepseek-r1-0528', cost: 2 },
    ],
  },
  {
    provider: 'xAI',
    models: [
      { id: 'grok-4', cost: 10 },
      { id: 'grok-3', cost: 10 },
      { id: 'grok-3-mini', cost: 1.5 },
    ],
  },
  {
    provider: 'Meta',
    models: [
      { id: 'llama-4-maverick', cost: 1 },
      { id: 'llama-4-scout', cost: 1 },
      { id: 'llama-3.3-70b-instruct', cost: 1 },
    ],
  },
  {
    provider: 'Mistral',
    models: [
      { id: 'mistral-large-latest', cost: 2 },
      { id: 'mistral-medium-latest', cost: 2.5 },
      { id: 'mistral-small-latest', cost: 1 },
      { id: 'magistral-medium-latest', cost: 6 },
    ],
  },
  {
    provider: 'Alibaba',
    models: [
      { id: 'qwen3.5-397b-a17b', cost: 3 },
      { id: 'qwen3-235b-a22b', cost: 1.2 },
      { id: 'qwen3-32b', cost: 1 },
    ],
  },
  {
    provider: 'Perplexity',
    models: [
      { id: 'sonar', cost: 1.2 },
      { id: 'sonar-pro', cost: 10 },
      { id: 'sonar-reasoning-pro', cost: 6 },
    ],
  },
  {
    provider: 'Moonshot',
    models: [
      { id: 'kimi-k2.5', cost: 2.5 },
      { id: 'kimi-k2', cost: 2 },
    ],
  },
]

// ── Provider settings (Whiteboard Studio pattern) ────────
// Returns: { provider, apiKey, model }
export function getProviderSettings() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      const parsed = JSON.parse(stored)
      return {
        provider: parsed.provider || detectProvider(parsed.apiKey) || DEFAULT_PROVIDER,
        apiKey: parsed.apiKey || DEFAULT_API_KEY,
        model: parsed.model || DEFAULT_MODEL,
      }
    }
  } catch { /* corrupted storage, fall through */ }
  return {
    provider: DEFAULT_PROVIDER,
    apiKey: DEFAULT_API_KEY,
    model: DEFAULT_MODEL,
  }
}

// Alias for backward compat
export const getSettings = getProviderSettings

export function saveSettings(settings) {
  const current = getProviderSettings()
  const merged = {
    provider: settings.provider || detectProvider(settings.apiKey) || current.provider,
    apiKey: settings.apiKey ?? current.apiKey,
    model: settings.model ?? current.model,
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(merged))
}

// ── Provider detection by key prefix ─────────────────────
export function detectProvider(apiKey) {
  if (!apiKey) return null
  if (apiKey.startsWith('sk-navy-')) return 'navy'
  if (apiKey.startsWith('sk-ant-')) return 'anthropic'
  if (apiKey.startsWith('AIza')) return 'gemini'
  if (apiKey.startsWith('sk-')) return 'openai'
  return 'navy' // default fallback for unknown prefixes
}

// ── Model helpers ────────────────────────────────────────
export function findModelInfo(modelId) {
  for (const group of MODEL_GROUPS) {
    const model = group.models.find(m => m.id === modelId)
    if (model) return { ...model, provider: group.provider }
  }
  return null
}

export function getCostColor(cost) {
  if (cost <= 2) return 'var(--color-green)'
  if (cost <= 5) return 'var(--color-yellow)'
  return 'var(--color-red)'
}
