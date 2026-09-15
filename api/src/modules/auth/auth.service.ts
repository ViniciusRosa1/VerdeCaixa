import { ConflictException, Inject, Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import * as argon2 from "argon2";
import { createHash, randomBytes } from "node:crypto";
import { PrismaService } from "../../database/prisma.service.js";
import { MailService } from "../../services/mail.service.js";
import type { ChangeInitialPasswordDto, ForgotPasswordDto, LoginDto, RegisterDto, ResetPasswordDto, SelectCompanyDto } from "./auth.dto.js";

const hashToken = (value: string) => createHash("sha256").update(value).digest("hex");
const sessionLifetime = 7 * 86_400_000;

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
          companyId: company.id, publicCode: "ROL-001", name: "Administrador", isSystem: true,
          description: "Acesso total", permissions: { create: permissions.map(({ id }) => ({ permissionId: id })) },
        } });
        await tx.sequenceCounter.create({ data: { companyId: company.id, entity: "ROLE", value: 1 } });
        const user = await tx.user.create({ data: { name: dto.name.trim(), email, passwordHash } });
        await tx.companyMembership.create({ data: {
          companyId: company.id, userId: user.id, roleId: role.id, status: "ACTIVE", activatedAt: new Date(),
        } });
      });
    } catch (error) {
      if (typeof error === "object" && error !== null && "code" in error && error.code === "P2002") {
        throw new ConflictException("Este e-mail já está cadastrado. Entre na sua conta.");
      }
      throw error;
    }
    return { message: "Conta criada com sucesso. Entre para começar." };
  }

  async login(dto: LoginDto, userAgent?: string, ipAddress?: string) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email.trim().toLowerCase() },
      include: { memberships: { where: { status: "ACTIVE", deactivatedAt: null }, include: { company: true, role: true } } },
    });
    if (!user || user.status !== "ACTIVE" || user.deactivatedAt || !(await argon2.verify(user.passwordHash, dto.password))) {
      throw new UnauthorizedException("E-mail ou senha inválidos");
    }
    const activeMembershipId = !user.mustChangePassword && user.memberships.length === 1 ? user.memberships[0]!.id : null;
    const secret = randomBytes(32).toString("base64url");
    const session = await this.prisma.session.create({ data: {
      userId: user.id, activeMembershipId, refreshTokenHash: hashToken(secret), userAgent, ipAddress,
      expiresAt: new Date(Date.now() + sessionLifetime),
    } });
    await this.prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
    return this.result(user, session.id, secret, activeMembershipId);
  }

  async refresh(value?: string) {
    const { session } = await this.validSession(value);
    const nextSecret = randomBytes(32).toString("base64url");
    let activeMembershipId = session.activeMembershipId;
    const memberships = session.user.memberships;
    if (activeMembershipId && !memberships.some((item) => item.id === activeMembershipId)) activeMembershipId = null;
    if (!session.user.mustChangePassword && !activeMembershipId && memberships.length === 1) activeMembershipId = memberships[0]!.id;
    await this.prisma.session.update({ where: { id: session.id }, data: {
      activeMembershipId, refreshTokenHash: hashToken(nextSecret), expiresAt: new Date(Date.now() + sessionLifetime),
    } });
    return this.result(session.user, session.id, nextSecret, activeMembershipId);
  }

  async logout(value?: string) {
    const sessionId = value?.split(".")[0];
    if (sessionId) await this.prisma.session.updateMany({ where: { id: sessionId }, data: { revokedAt: new Date() } });
  }

  async me(userId: string, sessionId: string) {
    const user = await this.userState(userId);
    const session = await this.prisma.session.findFirst({ where: { id: sessionId, userId, revokedAt: null } });
    if (!session) throw new UnauthorizedException("Sessão expirada");
    return this.presentState(user, session.activeMembershipId);
  }

  async companies(userId: string) {
    const user = await this.userState(userId);
    return user.memberships.map((membership) => this.presentMembership(membership));
  }

  async selectCompany(userId: string, sessionId: string, dto: SelectCompanyDto) {
    const membership = await this.prisma.companyMembership.findFirst({
      where: { id: dto.membershipId, userId, status: "ACTIVE", deactivatedAt: null },
    });
    if (!membership) throw new UnauthorizedException("Empresa não disponível para este usuário");
    const secret = randomBytes(32).toString("base64url");
    await this.prisma.session.update({ where: { id: sessionId }, data: {
      activeMembershipId: membership.id, refreshTokenHash: hashToken(secret), expiresAt: new Date(Date.now() + sessionLifetime),
    } });
    const user = await this.userState(userId);
    return this.result(user, sessionId, secret, membership.id);
  }

  async changeInitialPassword(userId: string, sessionId: string, dto: ChangeInitialPasswordDto) {
    const user = await this.userState(userId);
    if (!user.mustChangePassword) throw new ConflictException("A troca inicial de senha já foi concluída");
    const activeMembershipId = user.memberships.length === 1 ? user.memberships[0]!.id : null;
    const secret = randomBytes(32).toString("base64url");
    await this.prisma.$transaction([
      this.prisma.user.update({ where: { id: userId }, data: {
        passwordHash: await argon2.hash(dto.password, { type: argon2.argon2id }), mustChangePassword: false,
      } }),
      this.prisma.session.updateMany({ where: { userId, id: { not: sessionId }, revokedAt: null }, data: { revokedAt: new Date() } }),
      this.prisma.session.update({ where: { id: sessionId }, data: {
        activeMembershipId, refreshTokenHash: hashToken(secret), expiresAt: new Date(Date.now() + sessionLifetime),
      } }),
    ]);
    return this.result(await this.userState(userId), sessionId, secret, activeMembershipId);
  }

  async forgotPassword(dto: ForgotPasswordDto) {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email.toLowerCase() } });
    if (user) {
      const token = randomBytes(32).toString("base64url");
      await this.prisma.passwordResetToken.create({ data: { userId: user.id, tokenHash: hashToken(token), expiresAt: new Date(Date.now() + 3_600_000) } });
      const origin = this.config.get("APP_ORIGIN", "http://localhost:3000");
      await this.mail.send(user.email, "Redefinição de senha — Verde Caixa", `Acesse ${origin}/login?reset=${token} para criar uma nova senha. O link expira em uma hora.`);
    }
    return { message: "Se o e-mail estiver cadastrado, as instruções serão enviadas." };
  }

  async resetPassword(dto: ResetPasswordDto) {
    const record = await this.prisma.passwordResetToken.findUnique({ where: { tokenHash: hashToken(dto.token) } });
    if (!record || record.usedAt || record.expiresAt <= new Date()) throw new UnauthorizedException("Link inválido ou expirado");
    await this.prisma.$transaction([
      this.prisma.user.update({ where: { id: record.userId }, data: { passwordHash: await argon2.hash(dto.password, { type: argon2.argon2id }), mustChangePassword: false } }),
      this.prisma.passwordResetToken.update({ where: { id: record.id }, data: { usedAt: new Date() } }),
      this.prisma.session.updateMany({ where: { userId: record.userId, revokedAt: null }, data: { revokedAt: new Date() } }),
    ]);
    return { message: "Senha alterada com sucesso." };
  }

  private async validSession(value?: string) {
    if (!value) throw new UnauthorizedException("Sessão não encontrada");
    const [sessionId, secret] = value.split(".");
    const session = sessionId ? await this.prisma.session.findUnique({
      where: { id: sessionId },
      include: { user: { include: { memberships: { where: { status: "ACTIVE", deactivatedAt: null }, include: { company: true, role: true } } } } },
    }) : null;
    if (!session || !secret || session.revokedAt || session.expiresAt <= new Date() || session.user.status !== "ACTIVE" || session.user.deactivatedAt || session.refreshTokenHash !== hashToken(secret)) {
      throw new UnauthorizedException("Sessão expirada");
    }
    return { session };
  }

  private userState(userId: string) {
    return this.prisma.user.findUniqueOrThrow({ where: { id: userId }, include: {
      memberships: { where: { status: "ACTIVE", deactivatedAt: null }, include: { company: true, role: true }, orderBy: { company: { name: "asc" } } },
    } });
  }

  private async result(user: Awaited<ReturnType<AuthService["userState"]>>, sessionId: string, secret: string, activeMembershipId: string | null) {
    return { user: this.presentState(user, activeMembershipId), access: await this.accessToken(user.id, sessionId), refresh: `${sessionId}.${secret}` };
  }

  private presentState(user: Awaited<ReturnType<AuthService["userState"]>>, activeMembershipId: string | null) {
    const active = user.memberships.find((item) => item.id === activeMembershipId);
    return {
      id: user.id, name: user.name, email: user.email, status: user.status, mustChangePassword: user.mustChangePassword,
      membershipId: active?.id, roleId: active?.roleId, role: active?.role.name, company: active?.company,
      companies: user.memberships.map((membership) => this.presentMembership(membership)),
      nextStep: user.mustChangePassword ? "CHANGE_PASSWORD" : active ? "READY" : "SELECT_COMPANY",
    };
  }

  private presentMembership(membership: Awaited<ReturnType<AuthService["userState"]>>["memberships"][number]) {
    return { id: membership.id, companyId: membership.companyId, company: membership.company, roleId: membership.roleId, role: membership.role.name };
  }

  private accessToken(userId: string, sessionId: string) {
    return this.jwt.signAsync({ sub: userId, sid: sessionId }, { secret: this.config.getOrThrow("AUTH_ACCESS_SECRET"), expiresIn: "15m" });
  }
}
