"use client";

import Link from "next/link";
import { ArrowRight, Check, Eye, EyeOff, Leaf } from "lucide-react";
import { useState } from "react";
import { api } from "@/lib/api/client";

export function RegisterPage() {
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [created, setCreated] = useState(false);
  async function submit(event: React.SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const form = new FormData(event.currentTarget);
    const name = String(form.get("name") ?? "").trim();
    const companyName = String(form.get("companyName") ?? "").trim();
    const email = String(form.get("email") ?? "").trim();
    const password = String(form.get("password") ?? "");
    setError("");
    if (name.length < 2 || companyName.length < 2) {
      setError(
        "Informe seu nome e o nome da empresa com pelo menos 2 caracteres.",
      );
      return;
    }
    if (password !== form.get("confirmPassword")) {
      setError("As senhas não coincidem.");
      return;
    }
    setBusy(true);
    try {
      await api("/auth/register", {
        method: "POST",
        body: JSON.stringify({ name, companyName, email, password }),
      });
      setCreated(true);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Não foi possível criar sua conta. Tente novamente.",
      );
    } finally {
      setBusy(false);
    }
  }
  const inputClass =
    "mt-1.5 h-12 w-full rounded-xl border bg-white px-3 text-sm";
  return (
    <main className="grid min-h-screen bg-[#F6FAF3] lg:grid-cols-[minmax(0,1.05fr)_minmax(440px,.95fr)]">
      <section className="hidden flex-col bg-[#1F2A1E] p-12 text-white lg:flex">
        <div className="flex items-center gap-3">
          <span className="grid size-11 place-items-center rounded-xl bg-[#8AAE6D] text-[#1F2A1E]">
            <Leaf className="size-5" />
          </span>
          <div>
            <p className="font-semibold">Verde Caixa</p>
            <p className="text-xs text-white/50">Finanças claras</p>
          </div>
        </div>
        <div className="my-auto max-w-lg">
          <p className="text-xs font-semibold uppercase tracking-[.15em] text-[#AFCB98]">
            Um novo começo para seu caixa
          </p>
          <h1 className="mt-4 text-4xl font-semibold leading-tight">
            Sua empresa organizada, desde o primeiro passo.
          </h1>
          <p className="mt-5 text-sm leading-7 text-white/60">
            Reúna suas contas, acompanhe vencimentos e tenha mais clareza para
            cuidar das finanças.
          </p>
        </div>
      </section>
      <section className="flex items-center justify-center px-6 py-10">
        <div className="w-full max-w-[410px]">
          <p className="text-xs font-semibold uppercase tracking-[.14em] text-[#8AAE6D]">
            Comece por aqui
          </p>
          <h2 className="mt-2 text-3xl font-semibold">Crie sua conta</h2>
          <p className="mt-2 text-sm text-[#60705E]">
            Cadastre sua empresa e seja seu primeiro administrador.
          </p>
          {created ? (
            <div role="status" className="mt-8 rounded-xl border bg-white p-5">
              <Check className="size-6 text-[#3E5A3C]" />
              <h3 className="mt-3 font-semibold">Conta criada com sucesso!</h3>
              <p className="mt-2 text-sm text-[#60705E]">
                Entre com seu e-mail e senha para começar.
              </p>
              <Link
                href="/login"
                className="mt-5 inline-flex font-semibold text-[#3E5A3C] underline"
              >
                Ir para o login
              </Link>
            </div>
          ) : (
            <>
              {error && (
                <div
                  role="alert"
                  className="mt-5 rounded-xl bg-[#F7EDEA] px-4 py-3 text-sm text-[#A14E42]"
                >
                  {error}
                </div>
              )}
              <form
                className="mt-7 space-y-4"
                onSubmit={submit}
                aria-busy={busy}
              >
                <label className="block text-xs font-semibold">
                  Seu nome
                  <input
                    name="name"
                    autoComplete="name"
                    required
                    minLength={2}
                    maxLength={120}
                    className={inputClass}
                  />
                </label>
                <label className="block text-xs font-semibold">
                  Nome da empresa
                  <input
                    name="companyName"
                    autoComplete="organization"
                    required
                    minLength={2}
                    maxLength={160}
                    className={inputClass}
                  />
                </label>
                <label className="block text-xs font-semibold">
                  E-mail
                  <input
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    maxLength={254}
                    className={inputClass}
                  />
                </label>
                <label className="block text-xs font-semibold">
                  Senha
                  <span className="relative block">
                    <input
                      name="password"
                      type={show ? "text" : "password"}
                      autoComplete="new-password"
                      required
                      minLength={8}
                      maxLength={128}
                      aria-describedby="password-hint"
                      className={`${inputClass} pr-12`}
                    />
                    <button
                      type="button"
                      onClick={() => setShow(!show)}
                      aria-label={show ? "Ocultar senhas" : "Mostrar senhas"}
                      aria-pressed={show}
                      className="absolute bottom-1.5 right-1.5 grid size-9 place-items-center"
                    >
                      {show ? (
                        <EyeOff className="size-4" />
                      ) : (
                        <Eye className="size-4" />
                      )}
                    </button>
                  </span>
                </label>
                <p id="password-hint" className="text-xs text-[#60705E]">
                  Use pelo menos 8 caracteres.
                </p>
                <label className="block text-xs font-semibold">
                  Confirmar senha
                  <input
                    name="confirmPassword"
                    type={show ? "text" : "password"}
                    autoComplete="new-password"
                    required
                    minLength={8}
                    maxLength={128}
                    className={inputClass}
                  />
                </label>
                <button
                  disabled={busy}
                  className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#3E5A3C] text-sm font-semibold text-white disabled:opacity-60"
                >
                  {busy ? "Criando conta…" : "Criar conta"}
                  <ArrowRight className="size-4" />
                </button>
              </form>
              <p className="mt-6 text-center text-sm text-[#60705E]">
                Já tem uma conta?{" "}
                <Link
                  href="/login"
                  className="font-semibold text-[#3E5A3C] underline underline-offset-4"
                >
                  Entrar
                </Link>
              </p>
            </>
          )}
        </div>
      </section>
    </main>
  );
}
