import { describe, expect, it, vi } from 'vitest'

import { createCustomFetch } from '../model-factory'
import { CUSTOM_BODY_PARAM_KEY } from '../customRequestBody'

vi.mock('@tauri-apps/plugin-http', () => ({ fetch: vi.fn() }))

/** Run one POST through the wrapper and return the body that hit the wire. */
async function sentBody(
  parameters: Record<string, unknown>,
  requestBody: Record<string, unknown>,
  keepLlamacppOnly = false
): Promise<Record<string, unknown>> {
  let captured: Record<string, unknown> = {}
  const baseFetch = (async (_input: RequestInfo | URL, init?: RequestInit) => {
    captured = JSON.parse(init!.body as string)
    return new Response('{}', { status: 200 })
  }) as typeof globalThis.fetch
  const wrapped = createCustomFetch(baseFetch, parameters, keepLlamacppOnly)
  await wrapped('http://localhost/v1/chat/completions', {
    method: 'POST',
    body: JSON.stringify(requestBody),
  })
  return captured
}

describe('createCustomFetch — custom request JSON', () => {
  it('merges the custom body into the request without its carrier key', async () => {
    const body = await sentBody(
      {
        temperature: 0.6,
        [CUSTOM_BODY_PARAM_KEY]: {
          chat_template_kwargs: { enable_thinking: false },
        },
      },
      { model: 'qwen3.6-35b-a3b', messages: [], stream: true }
    )
    expect(body).toEqual({
      model: 'qwen3.6-35b-a3b',
      messages: [],
      stream: true,
      temperature: 0.6,
      chat_template_kwargs: { enable_thinking: false },
    })
    expect(body).not.toHaveProperty(CUSTOM_BODY_PARAM_KEY)
  })

  it('deep-merges with the kwargs Jan sends and wins on conflict', async () => {
    const body = await sentBody(
      {
        chat_template_kwargs: {
          preserve_thinking: true,
          enable_thinking: true,
        },
        [CUSTOM_BODY_PARAM_KEY]: {
          chat_template_kwargs: { enable_thinking: false },
        },
      },
      { messages: [] },
      true
    )
    expect(body.chat_template_kwargs).toEqual({
      preserve_thinking: true,
      enable_thinking: false,
    })
  })

  it('overrides values Jan forces for llama.cpp', async () => {
    const body = await sentBody(
      { [CUSTOM_BODY_PARAM_KEY]: { cache_prompt: false } },
      { messages: [] },
      true
    )
    expect(body.cache_prompt).toBe(false)
  })

  it('sends keys verbatim that the sampler filters would strip', async () => {
    const body = await sentBody(
      { [CUSTOM_BODY_PARAM_KEY]: { min_p: 0, ctx_len: 4096 } },
      { messages: [] }
    )
    expect(body.min_p).toBe(0)
    expect(body.ctx_len).toBe(4096)
  })

  it('leaves the request alone when no custom body is set', async () => {
    const body = await sentBody({}, { messages: [], stream: false })
    expect(body).toEqual({ messages: [], stream: false })
  })
})
