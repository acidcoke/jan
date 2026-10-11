import { IconBraces } from '@tabler/icons-react'

import { Button } from '@/components/ui/button'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { CustomBodyEditor } from '@/containers/CustomBodyEditor'
import { useModelCustomBody } from '@/hooks/useModelCustomBody'
import { useTranslation } from '@/i18n/react-i18next-compat'
import { activeCustomBody } from '@/lib/customRequestBody'
import { cn, getModelDisplayName } from '@/lib/utils'

/** Composer button for the selected model's custom request JSON. */
export function CustomBodyPopover({
  providerId,
  modelId,
}: {
  providerId: string | undefined
  modelId: string | undefined
}) {
  const { t } = useTranslation()
  const { model } = useModelCustomBody(providerId, modelId)
  if (!model || model.embedding === true) return null

  const active = !!activeCustomBody(model)
  const label = active
    ? t('common:modelSettings.customBody.triggerActive')
    : t('common:modelSettings.customBody.section')

  return (
    <Popover>
      <Tooltip>
        <TooltipTrigger asChild>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              size="icon-xs"
              aria-label={label}
              className="relative"
            >
              <IconBraces
                size={18}
                className={cn(
                  'text-muted-foreground',
                  active && 'text-primary'
                )}
              />
              {active && (
                <span
                  aria-hidden
                  className="absolute top-0.5 right-0.5 size-1.5 rounded-full bg-primary"
                />
              )}
            </Button>
          </PopoverTrigger>
        </TooltipTrigger>
        <TooltipContent>
          <p>{label}</p>
        </TooltipContent>
      </Tooltip>

      <PopoverContent
        align="start"
        side="top"
        sideOffset={8}
        collisionPadding={12}
        avoidCollisions
        className="w-[380px] p-0 flex flex-col max-h-[var(--radix-popover-content-available-height)]"
      >
        <div className="px-4 pt-3 pb-2 border-b">
          <span className="text-sm font-medium truncate block" title={model.id}>
            {getModelDisplayName(model)}
          </span>
        </div>
        <div className="flex-1 min-h-0 overflow-y-auto px-4 py-3">
          <CustomBodyEditor providerId={providerId} modelId={modelId} />
        </div>
      </PopoverContent>
    </Popover>
  )
}
