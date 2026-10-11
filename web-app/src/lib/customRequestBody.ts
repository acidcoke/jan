/**
 * Per-model custom request JSON: an arbitrary JSON object the user attaches
 * to a model, deep-merged into every chat request body sent for it. It is the
 * escape hatch for server-specific options Jan has no control for, e.g.
 * `{"chat_template_kwargs": {"enable_thinking": false}}` to switch Qwen3
 * thinking off on vLLM, SGLang, LM Studio or a remote llama-server.
 *
 * Stored in the model's settings under `custom_body`, with the object in
 * `controller_props.value` (like `chat_template_kwargs`) and an `enabled`
 * flag so it can be switched off without losing what was typed.
 */

export const CUSTOM_BODY_SETTING_KEY = 'custom_body'

/**
 * Key the custom body rides under in the inference parameters, from the chat
 * transport to the fetch wrapper (createCustomFetch), which unwraps it. It
 * never reaches the wire under this name.
 */
export const CUSTOM_BODY_PARAM_KEY = '__jan_custom_body'

export type JsonObject = Record<string, unknown>

export type CustomBody = { body: JsonObject; enabled: boolean }

export function isJsonObject(value: unknown): value is JsonObject {
  return !!value && typeof value === 'object' && !Array.isArray(value)
}

export function readCustomBody(
  model: Model | null | undefined
): CustomBody | null {
  const props = model?.settings?.[CUSTOM_BODY_SETTING_KEY]?.controller_props as
    | { value?: unknown; enabled?: unknown }
    | undefined
  if (!props || !isJsonObject(props.value)) return null
  return { body: props.value, enabled: props.enabled !== false }
}

/** The body to send for `model`, or undefined when unset, empty or off. */
export function activeCustomBody(
  model: Model | null | undefined
): JsonObject | undefined {
  const custom = readCustomBody(model)
  if (!custom?.enabled || Object.keys(custom.body).length === 0)
    return undefined
  return custom.body
}

export type CustomBodyParseResult =
  | { ok: true; value: JsonObject | null }
  | { ok: false; error: 'invalid'; detail: string }
  | { ok: false; error: 'notObject' }

/** Parse editor text. Blank text is valid and means "no custom body". */
export function parseCustomBody(text: string): CustomBodyParseResult {
  const trimmed = text.trim()
  if (trimmed === '') return { ok: true, value: null }
  let parsed: unknown
  try {
    parsed = JSON.parse(trimmed)
  } catch (e) {
    return {
      ok: false,
      error: 'invalid',
      detail: e instanceof Error ? e.message : String(e),
    }
  }
  if (!isJsonObject(parsed)) return { ok: false, error: 'notObject' }
  return { ok: true, value: parsed }
}

export function formatCustomBody(body: JsonObject | null | undefined): string {
  return body && Object.keys(body).length > 0
    ? JSON.stringify(body, null, 2)
    : ''
}

/**
 * Merge `patch` into `target`: nested objects merge key by key, so
 * `{"chat_template_kwargs": {"enable_thinking": false}}` keeps the other
 * kwargs Jan sends; arrays, primitives and null replace. Returns a new
 * object and mutates neither input.
 */
export function deepMergeJson(
  target: JsonObject,
  patch: JsonObject
): JsonObject {
  const out: JsonObject = { ...target }
  for (const [key, value] of Object.entries(patch)) {
    // An own "__proto__" key from JSON.parse would swap out's prototype on
    // assignment instead of adding a field.
    if (key === '__proto__') continue
    const existing = out[key]
    out[key] =
      isJsonObject(existing) && isJsonObject(value)
        ? deepMergeJson(existing, value)
        : value
  }
  return out
}

/**
 * Providers whose composer already has a reasoning control, which maps to
 * their own API (see ChatInput / reasoningProviderOptions). Only the others
 * get the `enable_thinking` shortcut in the custom JSON editor.
 */
const NATIVE_REASONING_PROVIDERS = new Set([
  'llamacpp',
  'google',
  'gemini',
  'anthropic',
  'openai',
])

export function hasNativeReasoningControl(
  providerId: string | null | undefined
): boolean {
  return !!providerId && NATIVE_REASONING_PROVIDERS.has(providerId)
}

/**
 * Set or, with `undefined`, remove the `enable_thinking` chat-template kwarg
 * that Qwen3, DeepSeek-V3.1, GLM-4.5 and other hybrid-thinking templates
 * read, as served by llama.cpp, vLLM, SGLang and LM Studio. An emptied
 * `chat_template_kwargs` is dropped.
 */
export function withEnableThinking(
  body: JsonObject | null,
  enabled: boolean | undefined
): JsonObject {
  const out: JsonObject = { ...(body ?? {}) }
  const kwargs: JsonObject = isJsonObject(out.chat_template_kwargs)
    ? { ...out.chat_template_kwargs }
    : {}
  if (enabled === undefined) delete kwargs.enable_thinking
  else kwargs.enable_thinking = enabled
  if (Object.keys(kwargs).length > 0) out.chat_template_kwargs = kwargs
  else delete out.chat_template_kwargs
  return out
}

/** Current `chat_template_kwargs.enable_thinking`, if the body sets it. */
export function readEnableThinking(
  body: JsonObject | null | undefined
): boolean | undefined {
  const kwargs = body?.chat_template_kwargs
  if (!isJsonObject(kwargs)) return undefined
  const value = kwargs.enable_thinking
  return typeof value === 'boolean' ? value : undefined
}
