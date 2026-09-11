'use client';

import * as Dialog from '@radix-ui/react-alert-dialog';
import { useState, type ReactElement } from 'react';

export function ConfirmDialog({ title, description, trigger, onConfirm, destructive = false, confirmLabel = 'Confirmar' }: {
  title: string;
  description: string;
  trigger: ReactElement;
  destructive?: boolean;
  confirmLabel?: string;
  onConfirm: () => void | Promise<unknown>;
}) {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');

  async function confirm() {
    if (pending) return;
    setPending(true);
    setError('');
    try {
      await onConfirm();
      setOpen(false);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível concluir a operação.');
    } finally {
      setPending(false);
    }
  }

  return <Dialog.Root open={open} onOpenChange={(value) => { if (!pending) { setOpen(value); setError(''); } }}>
    <Dialog.Trigger asChild>{trigger}</Dialog.Trigger>
    <Dialog.Portal>
      <Dialog.Overlay className="fixed inset-0 z-50 bg-[#1F2A1E]/40" />
      <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-white p-6 shadow-xl">
        <Dialog.Title className="text-lg font-semibold">{title}</Dialog.Title>
        <Dialog.Description className="mt-2 text-sm text-[#60705E]">{description}</Dialog.Description>
        {error && <p role="alert" className="mt-3 text-sm text-red-700">{error}</p>}
        <div className="mt-6 flex justify-end gap-3">
          <Dialog.Cancel asChild><button disabled={pending} className="rounded-xl border border-[#DCE6D6] px-4 py-2 text-sm">Cancelar</button></Dialog.Cancel>
          <Dialog.Action asChild><button disabled={pending} onClick={(event) => { event.preventDefault(); void confirm(); }} className={`rounded-xl px-4 py-2 text-sm font-semibold text-white disabled:opacity-60 ${destructive ? 'bg-red-700' : 'bg-[#3E5A3C]'}`}>{pending ? 'Confirmando…' : confirmLabel}</button></Dialog.Action>
        </div>
      </Dialog.Content>
    </Dialog.Portal>
  </Dialog.Root>;
}
