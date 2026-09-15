"use client";

import * as CheckboxPrimitive from "@radix-ui/react-checkbox";
import * as LabelPrimitive from "@radix-ui/react-label";
import * as SelectPrimitive from "@radix-ui/react-select";
import * as SlotPrimitive from "@radix-ui/react-slot";
import * as SwitchPrimitive from "@radix-ui/react-switch";
import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import { Check, ChevronDown } from "lucide-react";
import { useState, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode, type TextareaHTMLAttributes } from "react";
import { formatMobilePhone } from "@/lib/phone";

const join = (...values: Array<string | false | undefined>) => values.filter(Boolean).join(" ");
export const inputClass = "mt-1.5 h-11 w-full rounded-xl border border-border bg-white px-3 text-sm text-ink outline-none focus:border-accent";

export function Button({ asChild, variant = "primary", className, ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { asChild?: boolean; variant?: "primary" | "secondary" | "danger" }) {
  const Component = asChild ? SlotPrimitive.Slot : "button";
  return <Component className={join("inline-flex h-11 items-center justify-center rounded-xl px-5 text-sm font-semibold transition disabled:opacity-60", variant === "primary" && "bg-brand text-white hover:bg-brand-dark", variant === "secondary" && "border border-border bg-white text-ink hover:bg-surface", variant === "danger" && "bg-danger text-white", className)} {...props} />;
}

export function Field({ label, htmlFor, children, hint }: { label: string; htmlFor: string; children: ReactNode; hint?: string }) {
  return <div><LabelPrimitive.Root htmlFor={htmlFor} className="text-xs font-semibold text-muted">{label}</LabelPrimitive.Root>{children}{hint && <p className="mt-1 text-xs text-muted">{hint}</p>}</div>;
}

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={join(inputClass, props.className)} />;
}

type PhoneInputProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "defaultValue" | "inputMode" | "maxLength" | "onChange" | "pattern" | "type" | "value"
> & {
  defaultValue?: string | null;
};

export function PhoneInput({ defaultValue, ...props }: PhoneInputProps) {
  const [value, setValue] = useState(() => formatMobilePhone(defaultValue));

  return (
    <Input
      {...props}
      type="tel"
      inputMode="numeric"
      autoComplete="tel-national"
      placeholder="(00) 00000-0000"
      maxLength={15}
      pattern="[(][0-9]{2}[)] [0-9]{5}-[0-9]{4}"
      title="Informe um celular com DDD no formato (00) 00000-0000"
      value={value}
      onChange={(event) => setValue(formatMobilePhone(event.target.value))}
    />
  );
}

export function Textarea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={join(inputClass, "min-h-24 py-3", props.className)} />;
}

export function Select({ name, defaultValue, value, onValueChange, placeholder = "Selecione", children, required }: { name: string; defaultValue?: string; value?: string; onValueChange?: (value: string) => void; placeholder?: string; children: ReactNode; required?: boolean }) {
  return <SelectPrimitive.Root name={name} defaultValue={defaultValue} value={value} onValueChange={onValueChange} required={required}>
    <SelectPrimitive.Trigger id={name} className={`${inputClass} flex items-center justify-between`}><SelectPrimitive.Value placeholder={placeholder} /><SelectPrimitive.Icon><ChevronDown className="size-4" /></SelectPrimitive.Icon></SelectPrimitive.Trigger>
    <SelectPrimitive.Portal><SelectPrimitive.Content position="popper" sideOffset={4} className="z-50 min-w-[var(--radix-select-trigger-width)] overflow-hidden rounded-xl border border-border bg-white p-1 shadow-xl"><SelectPrimitive.Viewport>{children}</SelectPrimitive.Viewport></SelectPrimitive.Content></SelectPrimitive.Portal>
  </SelectPrimitive.Root>;
}

export function SelectItem({ value, children, disabled }: { value: string; children: ReactNode; disabled?: boolean }) {
  return <SelectPrimitive.Item value={value} disabled={disabled} className="relative flex h-9 select-none items-center rounded-lg pl-8 pr-3 text-sm outline-none data-[disabled]:opacity-50 data-[highlighted]:bg-surface"><SelectPrimitive.ItemIndicator className="absolute left-2"><Check className="size-4" /></SelectPrimitive.ItemIndicator><SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText></SelectPrimitive.Item>;
}

export function Checkbox({ name, value, defaultChecked, label }: { name: string; value: string; defaultChecked?: boolean; label: string }) {
  return <label className="flex items-start gap-2 rounded-xl border border-border p-3 text-xs"><CheckboxPrimitive.Root name={name} value={value} defaultChecked={defaultChecked} className="grid size-4 shrink-0 place-items-center rounded border border-border bg-white data-[state=checked]:bg-brand data-[state=checked]:text-white"><CheckboxPrimitive.Indicator><Check className="size-3" /></CheckboxPrimitive.Indicator></CheckboxPrimitive.Root><span>{label}</span></label>;
}

export function Switch({ name, defaultChecked, label }: { name: string; defaultChecked?: boolean; label: string }) {
  return <label className="flex items-center justify-between gap-4"><span className="text-sm font-medium">{label}</span><SwitchPrimitive.Root name={name} defaultChecked={defaultChecked} className="relative h-6 w-11 rounded-full bg-border data-[state=checked]:bg-brand"><SwitchPrimitive.Thumb className="block size-5 translate-x-0.5 rounded-full bg-white shadow transition-transform data-[state=checked]:translate-x-5" /></SwitchPrimitive.Root></label>;
}

export function Tooltip({ label, children }: { label: string; children: ReactNode }) {
  return <TooltipPrimitive.Provider><TooltipPrimitive.Root><TooltipPrimitive.Trigger asChild>{children}</TooltipPrimitive.Trigger><TooltipPrimitive.Portal><TooltipPrimitive.Content sideOffset={6} className="z-50 rounded-lg bg-ink px-2 py-1 text-xs text-white shadow">{label}<TooltipPrimitive.Arrow className="fill-ink" /></TooltipPrimitive.Content></TooltipPrimitive.Portal></TooltipPrimitive.Root></TooltipPrimitive.Provider>;
}
