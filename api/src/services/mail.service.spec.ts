import { describe, expect, it, vi } from "vitest";
import { Resend } from "resend";
import { MailService } from "./mail.service.js";

const { sendEmail } = vi.hoisted(() => ({ sendEmail: vi.fn() }));

vi.mock("resend", () => ({
  Resend: vi.fn(() => ({ emails: { send: sendEmail } })),
}));

function config(values: Record<string, string>) {
  return {
    get: vi.fn((key: string, fallback?: string) => values[key] ?? fallback),
    getOrThrow: vi.fn((key: string) => {
      if (!values[key]) throw new Error(`Missing ${key}`);
      return values[key];
    }),
  };
}

describe("MailService", () => {
  it("envia mensagens pela API do Resend", async () => {
    sendEmail.mockResolvedValueOnce({ data: { id: "email-id" }, error: null });
    const service = new MailService(config({
      RESEND_API_KEY: "re_test",
      RESEND_FROM: "Verde Caixa <contato@example.com>",
    }) as never);

    await expect(service.send("maria@example.com", "Convite", "Olá, Maria")).resolves.toEqual({ id: "email-id" });
    expect(Resend).toHaveBeenCalledWith("re_test");
    expect(sendEmail).toHaveBeenCalledWith({
      from: "Verde Caixa <contato@example.com>",
      to: "maria@example.com",
      subject: "Convite",
      text: "Olá, Maria",
    });
  });

  it("propaga erros retornados pelo Resend", async () => {
    sendEmail.mockResolvedValueOnce({ data: null, error: { message: "domínio não verificado" } });
    const service = new MailService(config({ RESEND_API_KEY: "re_test" }) as never);

    await expect(service.send("maria@example.com", "Convite", "Olá")).rejects.toThrow(
      "Resend: domínio não verificado",
    );
  });
});
