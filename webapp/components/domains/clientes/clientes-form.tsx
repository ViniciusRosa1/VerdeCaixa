"use client";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { FormPage, valueOf } from "../common";
import { CardContent } from "@/components/ui/card";
import { Field, Input, PhoneInput } from "@/components/ui/controls";
import { useClient, useSaveClient } from "@/lib/api/entity-hooks";
import { phoneDigits } from "@/lib/phone";
export function ClientesForm({ id }: { id?: string }) {
  const router = useRouter();
  const detail = useClient(id);
  const save = useSaveClient(id);
  const [message, setMessage] = useState("");
  if (id && detail.isLoading) return <p>Carregando cliente…</p>;
  const current = detail.data;
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    try {
      await save.mutateAsync({
        name: valueOf(form, "name"),
        document: valueOf(form, "document") || undefined,
        email: valueOf(form, "email") || undefined,
        phone: phoneDigits(valueOf(form, "phone")) || undefined,
      });
      router.push("/clientes");
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Não foi possível salvar.",
      );
    }
  }
  return (
    <FormPage
      title={`${id ? "Editar" : "Novo"} cliente`}
      backHref="/clientes"
      message={message}
      pending={save.isPending}
      onSubmit={submit}
    >
      <CardContent className="grid gap-5 sm:grid-cols-2">
        <Field label="Nome" htmlFor="name">
          <Input id="name" name="name" required defaultValue={current?.name} />
        </Field>
        <Field label="CPF ou CNPJ" htmlFor="document">
          <Input
            id="document"
            name="document"
            defaultValue={current?.document}
          />
        </Field>
        <Field label="E-mail" htmlFor="email">
          <Input
            id="email"
            name="email"
            type="email"
            defaultValue={current?.email}
          />
        </Field>
        <Field label="Telefone" htmlFor="phone">
          <PhoneInput id="phone" name="phone" defaultValue={current?.phone} />
        </Field>
      </CardContent>
    </FormPage>
  );
}
