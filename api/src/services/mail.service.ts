import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import nodemailer from 'nodemailer';

@Injectable()
export class MailService {
  private readonly transporter;
  private readonly from: string;

  constructor(@Inject(ConfigService) config: ConfigService) {
    this.from = config.get('SMTP_FROM', 'Verde Caixa <no-reply@verdecaixa.local>');
    this.transporter = nodemailer.createTransport({
      host: config.get('SMTP_HOST', 'localhost'),
      port: Number(config.get('SMTP_PORT', 1025)),
      secure: config.get('SMTP_SECURE', 'false') === 'true',
      auth: config.get('SMTP_USER') ? { user: config.get('SMTP_USER'), pass: config.get('SMTP_PASSWORD') } : undefined,
    });
  }

  send(to: string, subject: string, text: string) {
    return this.transporter.sendMail({ from: this.from, to, subject, text });
  }
}
