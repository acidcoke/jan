import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'

import { CustomBodyEditor } from '../CustomBodyEditor'
import { useModelProvider } from '@/hooks/useModelProvider'
import {
  activeCustomBody,
  CUSTOM_BODY_SETTING_KEY,
  readCustomBody,
} from '@/lib/customRequestBody'

vi.mock('@/lib/backendStorage', () => ({
  backendStorage: {
    getItem: vi.fn().mockResolvedValue(null),
    setItem: vi.fn().mockResolvedValue(undefined),
    removeItem: vi.fn().mockResolvedValue(undefined),
  },
}))

const MODEL_ID = 'qwen3.6-35b-a3b'

function seed(providerName: string) {
  const model: Model = { id: MODEL_ID, settings: {} }
  useModelProvider.setState({
    providers: [
      { provider: providerName, active: true, settings: [], models: [model] },
    ],
    selectedProvider: providerName,
    selectedModel: model,
  })
}

const storedModel = (providerName = 'my-vllm') =>
  useModelProvider
    .getState()
    .getProviderByName(providerName)
    ?.models.find((m) => m.id === MODEL_ID)

const editor = () => screen.getByRole('textbox')

// Tests run without translations loaded, so `t` returns the key.
const key = (name: string) => `common:modelSettings.customBody.${name}`

describe('CustomBodyEditor', () => {
  beforeEach(() => seed('my-vllm'))

  it('turns thinking off with one click and shows the resulting JSON', () => {
    render(<CustomBodyEditor providerId="my-vllm" modelId={MODEL_ID} />)

    fireEvent.click(screen.getByRole('button', { name: key('thinkingOff') }))

    expect(readCustomBody(storedModel())).toEqual({
      body: { chat_template_kwargs: { enable_thinking: false } },
      enabled: true,
    })
    // The chat transport reads the selected model at send time.
    expect(activeCustomBody(useModelProvider.getState().selectedModel)).toEqual(
      { chat_template_kwargs: { enable_thinking: false } }
    )
    expect(JSON.parse((editor() as HTMLTextAreaElement).value)).toEqual({
      chat_template_kwargs: { enable_thinking: false },
    })
    expect(
      screen.getByRole('button', { name: key('thinkingOff') })
    ).toHaveAttribute('aria-pressed', 'true')
  })

  it('saves typed JSON and keeps the other kwargs when thinking is set', () => {
    render(<CustomBodyEditor providerId="my-vllm" modelId={MODEL_ID} />)

    fireEvent.change(editor(), {
      target: { value: '{"top_k": 20, "chat_template_kwargs": {"x": 1}}' },
    })
    fireEvent.click(screen.getByRole('button', { name: key('thinkingOn') }))

    expect(readCustomBody(storedModel())?.body).toEqual({
      top_k: 20,
      chat_template_kwargs: { x: 1, enable_thinking: true },
    })
  })

  it('keeps an invalid draft local and says why', () => {
    render(<CustomBodyEditor providerId="my-vllm" modelId={MODEL_ID} />)
    fireEvent.change(editor(), { target: { value: '{"a": 1}' } })

    fireEvent.change(editor(), { target: { value: '{"a": ' } })

    expect(screen.getByRole('alert')).toHaveTextContent(key('invalid'))
    expect(readCustomBody(storedModel())?.body).toEqual({ a: 1 })
    expect(editor()).toHaveValue('{"a": ')
  })

  it('rejects JSON that is not an object', () => {
    render(<CustomBodyEditor providerId="my-vllm" modelId={MODEL_ID} />)

    fireEvent.change(editor(), { target: { value: '[1, 2]' } })

    expect(screen.getByRole('alert')).toBeInTheDocument()
    expect(readCustomBody(storedModel())).toBeNull()
  })

  it('switches the body off without losing it, and clears it', () => {
    render(<CustomBodyEditor providerId="my-vllm" modelId={MODEL_ID} />)
    fireEvent.change(editor(), { target: { value: '{"a": 1}' } })

    fireEvent.click(screen.getByRole('switch'))
    expect(readCustomBody(storedModel())).toEqual({
      body: { a: 1 },
      enabled: false,
    })
    expect(activeCustomBody(storedModel())).toBeUndefined()

    fireEvent.click(screen.getByRole('button', { name: key('clear') }))
    expect(storedModel()?.settings).not.toHaveProperty(CUSTOM_BODY_SETTING_KEY)
    expect(editor()).toHaveValue('')
    expect(screen.getByRole('switch')).toBeDisabled()
  })

  it('leaves the thinking shortcut to the composer for llama.cpp', () => {
    seed('llamacpp')
    render(<CustomBodyEditor providerId="llamacpp" modelId={MODEL_ID} />)

    expect(
      screen.queryByRole('button', { name: key('thinkingOff') })
    ).not.toBeInTheDocument()
    expect(editor()).toBeInTheDocument()
  })
})
