import { Inject, Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Resend } from "resend";

@Injectable()
export class MailService {
  private readonly resend: Resend;
  private readonly from: string;

  constructor(@Inject(ConfigService) config: ConfigService) {
    this.resend = new Resend(config.getOrThrow<string>("RESEND_API_KEY"));
    this.from = config.get("RESEND_FROM", "Verde Caixa <onboarding@resend.dev>");
  }

  async send(to: string, subject: string, text: string) {
    const { data, error } = await this.resend.emails.send({ from: this.from, to, subject, text });

    if (error) {
      throw new Error(`Resend: ${error.message}`);
    }

    return data;
  }
}
