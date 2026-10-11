import { describe, expect, it } from 'vitest'

import {
  activeCustomBody,
  CUSTOM_BODY_SETTING_KEY,
  deepMergeJson,
  formatCustomBody,
  hasNativeReasoningControl,
  parseCustomBody,
  readCustomBody,
  readEnableThinking,
  withEnableThinking,
} from '../customRequestBody'

const modelWith = (controllerProps: Record<string, unknown>): Model =>
  ({
    id: 'qwen3.6-35b-a3b',
    settings: {
      [CUSTOM_BODY_SETTING_KEY]: {
        key: CUSTOM_BODY_SETTING_KEY,
        title: 'Custom request JSON',
        description: '',
        controller_type: 'json',
        controller_props: controllerProps,
      },
    },
  }) as unknown as Model

describe('parseCustomBody', () => {
  it('treats blank text as no body', () => {
    expect(parseCustomBody('  \n ')).toEqual({ ok: true, value: null })
  })

  it('parses a JSON object', () => {
    expect(
      parseCustomBody('{"chat_template_kwargs": {"enable_thinking": false}}')
    ).toEqual({
      ok: true,
      value: { chat_template_kwargs: { enable_thinking: false } },
    })
  })

  it('reports text that is not JSON', () => {
    const result = parseCustomBody('{"a": ')
    expect(result.ok).toBe(false)
    expect(result.ok === false && result.error).toBe('invalid')
  })

  it.each(['[1, 2]', '"text"', '42', 'null', 'true'])(
    'rejects %s because the body must be an object',
    (text) => {
      expect(parseCustomBody(text)).toEqual({ ok: false, error: 'notObject' })
    }
  )
})

describe('readCustomBody / activeCustomBody', () => {
  it('returns nothing for a model without the setting', () => {
    const model = { id: 'm', settings: {} } as Model
    expect(readCustomBody(model)).toBeNull()
    expect(activeCustomBody(model)).toBeUndefined()
    expect(activeCustomBody(undefined)).toBeUndefined()
  })

  it('defaults to enabled when the flag is missing', () => {
    const model = modelWith({ value: { a: 1 } })
    expect(readCustomBody(model)).toEqual({ body: { a: 1 }, enabled: true })
    expect(activeCustomBody(model)).toEqual({ a: 1 })
  })

  it('sends nothing while switched off, but keeps the body', () => {
    const model = modelWith({ value: { a: 1 }, enabled: false })
    expect(readCustomBody(model)).toEqual({ body: { a: 1 }, enabled: false })
    expect(activeCustomBody(model)).toBeUndefined()
  })

  it('sends nothing for an empty object', () => {
    expect(activeCustomBody(modelWith({ value: {} }))).toBeUndefined()
  })

  it('ignores a stored value that is not an object', () => {
    expect(readCustomBody(modelWith({ value: '{"a":1}' }))).toBeNull()
  })
})

describe('deepMergeJson', () => {
  it('merges nested objects key by key', () => {
    expect(
      deepMergeJson(
        { chat_template_kwargs: { preserve_thinking: true }, stream: true },
        { chat_template_kwargs: { enable_thinking: false } }
      )
    ).toEqual({
      chat_template_kwargs: { preserve_thinking: true, enable_thinking: false },
      stream: true,
    })
  })

  it('lets arrays, primitives and null replace', () => {
    expect(
      deepMergeJson(
        { stop: ['a'], temperature: 0.7, extra: { x: 1 } },
        { stop: ['b'], temperature: 0, extra: null }
      )
    ).toEqual({ stop: ['b'], temperature: 0, extra: null })
  })

  it('does not mutate its inputs', () => {
    const target = { kwargs: { a: 1 } }
    const patch = { kwargs: { b: 2 } }
    deepMergeJson(target, patch)
    expect(target).toEqual({ kwargs: { a: 1 } })
    expect(patch).toEqual({ kwargs: { b: 2 } })
  })

  it('ignores a __proto__ key instead of swapping the prototype', () => {
    const patch = JSON.parse('{"__proto__": {"polluted": true}, "ok": 1}')
    const out = deepMergeJson({}, patch)
    expect(out).toEqual({ ok: 1 })
    expect(Object.getPrototypeOf(out)).toBe(Object.prototype)
    expect(({} as Record<string, unknown>).polluted).toBeUndefined()
  })
})

describe('withEnableThinking / readEnableThinking', () => {
  it('turns thinking off on an empty body', () => {
    const body = withEnableThinking(null, false)
    expect(body).toEqual({ chat_template_kwargs: { enable_thinking: false } })
    expect(readEnableThinking(body)).toBe(false)
  })

  it('keeps the rest of the body and the other kwargs', () => {
    expect(
      withEnableThinking(
        { top_k: 20, chat_template_kwargs: { preserve_thinking: true } },
        true
      )
    ).toEqual({
      top_k: 20,
      chat_template_kwargs: { preserve_thinking: true, enable_thinking: true },
    })
  })

  it('removes the kwarg for Default and drops an emptied kwargs object', () => {
    const body = withEnableThinking(
      { top_k: 20, chat_template_kwargs: { enable_thinking: false } },
      undefined
    )
    expect(body).toEqual({ top_k: 20 })
    expect(readEnableThinking(body)).toBeUndefined()
  })

  it('reads only a boolean enable_thinking', () => {
    expect(
      readEnableThinking({ chat_template_kwargs: { enable_thinking: 'false' } })
    ).toBeUndefined()
    expect(readEnableThinking({ chat_template_kwargs: 'x' })).toBeUndefined()
  })
})

describe('formatCustomBody', () => {
  it('pretty-prints a body and leaves an empty one blank', () => {
    expect(formatCustomBody({ a: 1 })).toBe('{\n  "a": 1\n}')
    expect(formatCustomBody({})).toBe('')
    expect(formatCustomBody(null)).toBe('')
  })
})

describe('hasNativeReasoningControl', () => {
  it('is true only for providers with their own reasoning control', () => {
    expect(hasNativeReasoningControl('llamacpp')).toBe(true)
    expect(hasNativeReasoningControl('anthropic')).toBe(true)
    expect(hasNativeReasoningControl('openrouter')).toBe(false)
    expect(hasNativeReasoningControl('my-vllm')).toBe(false)
    expect(hasNativeReasoningControl(undefined)).toBe(false)
  })
})
