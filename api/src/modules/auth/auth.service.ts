import { ConflictException, Inject, Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import * as argon2 from "argon2";
import { createHash, randomBytes } from "node:crypto";
import { PrismaService } from "../../database/prisma.service.js";
import { MailService } from "../../services/mail.service.js";
import type {
  ForgotPasswordDto,
  LoginDto,
  RegisterDto,
  ResetPasswordDto,
} from "./auth.dto.js";

const hashToken = (value: string) =>
  createHash("sha256").update(value).digest("hex");

@Injectable()
export class AuthService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(JwtService) private readonly jwt: JwtService,
    @Inject(ConfigService) private readonly config: ConfigService,
    @Inject(MailService) private readonly mail: MailService,
  ) {}

  async register(dto: RegisterDto) {
    const email = dto.email.trim().toLowerCase();
    const passwordHash = await argon2.hash(dto.password, { type: argon2.argon2id });
    try {
      await this.prisma.$transaction(async (tx) => {
        const company = await tx.company.create({ data: { name: dto.companyName.trim(), financialEmail: email } });
        const permissions = await tx.permission.findMany();
        const role = await tx.role.create({ data: {
          companyId: company.id, publicCode: 'ROL-001', name: 'Administrador', isSystem: true,
          description: 'Acesso total', permissions: { create: permissions.map(({ id }) => ({ permissionId: id })) },
        } });
        await tx.sequenceCounter.create({ data: { companyId: company.id, entity: 'ROLE', value: 1 } });
        await tx.user.create({ data: { companyId: company.id, roleId: role.id, name: dto.name.trim(), email, passwordHash } });
      });
    } catch (error) {
      if (typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2002') {
        throw new ConflictException('Este e-mail já está cadastrado. Entre na sua conta.');
      }
      throw error;
    }
    return { message: 'Conta criada com sucesso. Entre para começar.' };
  }

  async login(dto: LoginDto, userAgent?: string, ipAddress?: string) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
      include: { role: true },
    });
    if (
      !user ||
      user.status !== "ACTIVE" ||
      !(await argon2.verify(user.passwordHash, dto.password))
    ) {
      throw new UnauthorizedException("E-mail ou senha inválidos");
    }
    const secret = randomBytes(32).toString("base64url");
    const session = await this.prisma.session.create({
      data: {
        userId: user.id,
        refreshTokenHash: hashToken(secret),
        userAgent,
        ipAddress,
        expiresAt: new Date(Date.now() + 7 * 86_400_000),
      },
    });
    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });
    return {
      user: this.presentUser(user),
      access: await this.accessToken(user.id),
      refresh: `${session.id}.${secret}`,
    };
  }

  async refresh(value?: string) {
    if (!value) throw new UnauthorizedException("Sessão não encontrada");
    const [sessionId, secret] = value.split(".");
    const session = sessionId
      ? await this.prisma.session.findUnique({
          where: { id: sessionId },
          include: { user: { include: { role: true } } },
        })
      : null;
    if (
      !session ||
      !secret ||
      session.revokedAt ||
      session.expiresAt <= new Date() ||
      session.refreshTokenHash !== hashToken(secret)
    ) {
      throw new UnauthorizedException("Sessão expirada");
    }
    const nextSecret = randomBytes(32).toString("base64url");
    await this.prisma.session.update({
      where: { id: session.id },
      data: {
        refreshTokenHash: hashToken(nextSecret),
        expiresAt: new Date(Date.now() + 7 * 86_400_000),
      },
    });
    return {
      user: this.presentUser(session.user),
      access: await this.accessToken(session.user.id),
      refresh: `${session.id}.${nextSecret}`,
    };
  }

  async logout(value?: string) {
    const sessionId = value?.split(".")[0];
    if (sessionId)
      await this.prisma.session.updateMany({
        where: { id: sessionId },
        data: { revokedAt: new Date() },
      });
  }

  async me(userId: string) {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      include: { role: true, company: true },
    });
    return { ...this.presentUser(user), company: user.company };
  }

  async forgotPassword(dto: ForgotPasswordDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
    });
    if (user) {
      const token = randomBytes(32).toString("base64url");
      await this.prisma.passwordResetToken.create({
        data: {
          userId: user.id,
          tokenHash: hashToken(token),
          expiresAt: new Date(Date.now() + 3_600_000),
        },
      });
      const origin = this.config.get("APP_ORIGIN", "http://localhost:3000");
      await this.mail.send(
        user.email,
        "Redefinição de senha — Verde Caixa",
        `Acesse ${origin}/login?reset=${token} para criar uma nova senha. O link expira em uma hora.`,
      );
    }
    return {
      message: "Se o e-mail estiver cadastrado, as instruções serão enviadas.",
    };
  }

  async resetPassword(dto: ResetPasswordDto) {
    const record = await this.prisma.passwordResetToken.findUnique({
      where: { tokenHash: hashToken(dto.token) },
    });
    if (!record || record.usedAt || record.expiresAt <= new Date())
      throw new UnauthorizedException("Link inválido ou expirado");
    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: record.userId },
        data: {
          passwordHash: await argon2.hash(dto.password, {
            type: argon2.argon2id,
          }),
        },
      }),
      this.prisma.passwordResetToken.update({
        where: { id: record.id },
        data: { usedAt: new Date() },
      }),
      this.prisma.session.updateMany({
        where: { userId: record.userId, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
    ]);
    return { message: "Senha alterada com sucesso." };
  }

  private accessToken(userId: string) {
    return this.jwt.signAsync(
      { sub: userId },
      {
        secret: this.config.getOrThrow("AUTH_ACCESS_SECRET"),
        expiresIn: "15m",
      },
    );
  }

  private presentUser(user: {
    id: string;
    name: string;
    email: string;
    roleId: string;
    role: { name: string };
  }) {
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      roleId: user.roleId,
      role: user.role.name,
    };
  }
}
