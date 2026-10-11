import { useEffect, useState } from 'react'

import { Button } from '@/components/ui/button'
import { ButtonGroup } from '@/components/ui/button-group'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { useModelCustomBody } from '@/hooks/useModelCustomBody'
import { useTranslation } from '@/i18n/react-i18next-compat'
import {
  formatCustomBody,
  hasNativeReasoningControl,
  parseCustomBody,
  readEnableThinking,
  withEnableThinking,
} from '@/lib/customRequestBody'

const PLACEHOLDER =
  '{\n  "chat_template_kwargs": { "enable_thinking": false }\n}'

/**
 * Editor for a model's custom request JSON. Every edit that parses is saved
 * at once; a draft that does not parse stays local and shows why.
 */
export function CustomBodyEditor({
  providerId,
  modelId,
}: {
  providerId: string | undefined
  modelId: string | undefined
}) {
  const { t } = useTranslation()
  const { customBody, setCustomBody } = useModelCustomBody(providerId, modelId)
  const storedText = formatCustomBody(customBody?.body)
  const [text, setText] = useState(storedText)

  // Follow saves made elsewhere (the thinking shortcut, the same editor in
  // another panel) without reformatting a draft that already matches them.
  useEffect(() => {
    setText((draft) => {
      const parsed = parseCustomBody(draft)
      return parsed.ok && formatCustomBody(parsed.value) === storedText
        ? draft
        : storedText
    })
  }, [storedText])

  const parsed = parseCustomBody(text)
  const enabled = customBody?.enabled ?? true
  const hasBody = !!customBody && Object.keys(customBody.body).length > 0

  const handleTextChange = (next: string) => {
    setText(next)
    const result = parseCustomBody(next)
    if (!result.ok || formatCustomBody(result.value) === storedText) return
    setCustomBody(result.value ? { body: result.value, enabled } : null)
  }

  const thinking = enabled ? readEnableThinking(customBody?.body) : undefined
  const setThinking = (value: boolean | undefined) => {
    const body = withEnableThinking(customBody?.body ?? null, value)
    if (Object.keys(body).length === 0) {
      setCustomBody(null)
      return
    }
    // Picking On/Off means "apply this now", so it switches the body on.
    setCustomBody({ body, enabled: value === undefined ? enabled : true })
  }

  const thinkingOptions: Array<{ value: boolean | undefined; label: string }> =
    [
      {
        value: undefined,
        label: t('common:modelSettings.customBody.thinkingDefault'),
      },
      { value: true, label: t('common:modelSettings.customBody.thinkingOn') },
      { value: false, label: t('common:modelSettings.customBody.thinkingOff') },
    ]

  return (
    <div className="space-y-3">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1 min-w-0">
          <div className="font-medium">
            {t('common:modelSettings.customBody.section')}
          </div>
          <p className="text-muted-foreground leading-normal text-xs">
            {t('common:modelSettings.customBody.description')}
          </p>
        </div>
        <Switch
          aria-label={t('common:modelSettings.customBody.enabled')}
          checked={hasBody && enabled}
          disabled={!hasBody}
          onCheckedChange={(v) =>
            customBody && setCustomBody({ body: customBody.body, enabled: v })
          }
        />
      </div>

      {!hasNativeReasoningControl(providerId) && (
        <div className="space-y-1">
          <div className="flex items-center justify-between gap-4">
            <span className="text-sm">
              {t('common:modelSettings.customBody.thinking')}
            </span>
            <ButtonGroup>
              {thinkingOptions.map((option) => (
                <Button
                  key={option.label}
                  variant={thinking === option.value ? 'secondary' : 'outline'}
                  size="xs"
                  aria-pressed={thinking === option.value}
                  onClick={() => setThinking(option.value)}
                >
                  {option.label}
                </Button>
              ))}
            </ButtonGroup>
          </div>
          <p className="text-muted-foreground leading-normal text-xs">
            {t('common:modelSettings.customBody.thinkingHint')}
          </p>
        </div>
      )}

      <Textarea
        value={text}
        onChange={(e) => handleTextChange(e.target.value)}
        placeholder={PLACEHOLDER}
        spellCheck={false}
        aria-invalid={!parsed.ok}
        aria-label={t('common:modelSettings.customBody.section')}
        className="font-mono text-xs md:text-xs min-h-28 max-h-64"
      />

      <div className="flex items-start justify-between gap-2">
        <p
          className="text-destructive text-xs leading-normal min-h-4"
          role={parsed.ok ? undefined : 'alert'}
        >
          {!parsed.ok &&
            (parsed.error === 'notObject'
              ? t('common:modelSettings.customBody.notObject')
              : t('common:modelSettings.customBody.invalid', {
                  detail: parsed.detail,
                }))}
        </p>
        {(hasBody || text.trim() !== '') && (
          <Button
            variant="ghost"
            size="xs"
            className="shrink-0"
            onClick={() => {
              setText('')
              setCustomBody(null)
            }}
          >
            {t('common:modelSettings.customBody.clear')}
          </Button>
        )}
      </div>
    </div>
  )
}
