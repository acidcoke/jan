import { useCallback } from 'react'

import { useModelProvider } from '@/hooks/useModelProvider'
import {
  CUSTOM_BODY_SETTING_KEY,
  readCustomBody,
  type CustomBody,
} from '@/lib/customRequestBody'

/**
 * Read and write a model's custom request JSON. Writes go to the provider
 * store only: the body is a per-request concern, like `reasoning`, so no
 * preset regeneration or engine restart is involved.
 */
export function useModelCustomBody(
  providerName: string | undefined,
  modelId: string | undefined
) {
  const model = useModelProvider((s) =>
    s.providers
      .find((p) => p.provider === providerName)
      ?.models.find((m) => m.id === modelId)
  )

  const setCustomBody = useCallback(
    (next: CustomBody | null) => {
      if (!providerName || !modelId) return
      const { getProviderByName, updateProvider } = useModelProvider.getState()
      const provider = getProviderByName(providerName)
      const index = provider?.models.findIndex((m) => m.id === modelId) ?? -1
      if (!provider || index === -1) return
      const current = provider.models[index]
      const settings = { ...(current.settings ?? {}) }
      if (next) {
        settings[CUSTOM_BODY_SETTING_KEY] = {
          key: CUSTOM_BODY_SETTING_KEY,
          title: 'Custom request JSON',
          description: '',
          controller_type: 'json',
          controller_props: { value: next.body, enabled: next.enabled },
        } as unknown as ProviderSetting
      } else {
        delete settings[CUSTOM_BODY_SETTING_KEY]
      }
      const models = [...provider.models]
      models[index] = { ...current, settings }
      // updateProvider also refreshes `selectedModel`, which is what the chat
      // transport reads at send time.
      updateProvider(providerName, { models })
    },
    [providerName, modelId]
  )

  return { model, customBody: readCustomBody(model), setCustomBody }
}
