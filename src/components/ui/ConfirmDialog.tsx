/**
 * ConfirmDialog — accessible confirmation modal built on Radix AlertDialog.
 *
 * Replaces all native browser confirm() calls with a styled, keyboard-navigable
 * dialog that matches the Clinical Sanctuary design language.
 */

import * as AlertDialog from '@radix-ui/react-alert-dialog'

interface ConfirmDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description: string
  confirmLabel?: string
  cancelLabel?: string
  variant?: 'default' | 'destructive'
  onConfirm: () => void
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'default',
  onConfirm,
}: ConfirmDialogProps) {
  return (
    <AlertDialog.Root open={open} onOpenChange={onOpenChange}>
      <AlertDialog.Portal>
        <AlertDialog.Overlay className="confirm-dialog-overlay fixed inset-0 z-50 bg-black/40 backdrop-blur-sm" />
        <AlertDialog.Content className="confirm-dialog-content fixed z-50 left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-sm bg-background rounded-2xl shadow-2xl p-6 focus:outline-none">
          <AlertDialog.Title className="font-display text-lg text-foreground font-light" style={{ letterSpacing: '0.02em' }}>
            {title}
          </AlertDialog.Title>
          <AlertDialog.Description className="text-sm text-muted-foreground font-body mt-2 leading-relaxed">
            {description}
          </AlertDialog.Description>
          <div className="flex justify-end gap-3 mt-6">
            <AlertDialog.Cancel asChild>
              <button className="btn-outline text-sm">
                {cancelLabel}
              </button>
            </AlertDialog.Cancel>
            <AlertDialog.Action asChild>
              <button
                className={variant === 'destructive' ? 'btn-destructive text-sm' : 'btn-primary text-sm'}
                onClick={onConfirm}
              >
                {confirmLabel}
              </button>
            </AlertDialog.Action>
          </div>
        </AlertDialog.Content>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  )
}
