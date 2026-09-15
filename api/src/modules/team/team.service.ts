import { BadGatewayException, BadRequestException, ConflictException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import * as argon2 from "argon2";
import { createHash, randomBytes } from "node:crypto";
import { PrismaService } from "../../database/prisma.service.js";
import { SequenceService } from "../../database/sequence.service.js";
import { MailService } from "../../services/mail.service.js";
import { offset, paginated, type ListQueryDto } from "../../common/dto.js";
import type { AcceptInvitationDto, InviteUserDto, RoleDto, UpdateUserDto } from "./team.dto.js";

const hash = (value: string) => createHash("sha256").update(value).digest("hex");
const inviteLifetime = 7 * 86_400_000;

@Injectable()
export class TeamService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(SequenceService) private readonly sequence: SequenceService,
    @Inject(MailService) private readonly mail: MailService,
    @Inject(ConfigService) private readonly config: ConfigService,
  ) {}

  async users(companyId: string, query: ListQueryDto) {
    const where = { companyId, ...(query.search ? { user: { OR: [
      { name: { contains: query.search, mode: "insensitive" as const } },
      { email: { contains: query.search, mode: "insensitive" as const } },
    ] } } : {}) };
    const [data, total] = await Promise.all([
      this.prisma.companyMembership.findMany({
        where, include: { role: true, user: true, company: true }, skip: offset(query), take: query.limit,
        orderBy: { user: { name: query.order } },
      }),
      this.prisma.companyMembership.count({ where }),
    ]);
    return paginated(data.map((membership) => this.presentMembership(membership)), total, query);
  }

  async user(companyId: string, id: string) {
    const membership = await this.prisma.companyMembership.findFirst({
      where: { id, companyId }, include: { role: true, user: true, company: true },
    });
    if (!membership) throw new NotFoundException("Usuário não encontrado");
    return this.presentMembership(membership);
  }

  async updateUser(companyId: string, id: string, dto: UpdateUserDto) {
    const membership = await this.prisma.companyMembership.findFirst({ where: { id, companyId } });
    if (!membership) throw new NotFoundException("Usuário não encontrado");
    if (membership.status === "PENDING" && dto.status === "ACTIVE") throw new BadRequestException("O usuário deve aceitar o convite para ativar o acesso");
    if (dto.roleId) {
      const role = await this.prisma.role.findFirst({ where: { id: dto.roleId, companyId, deactivatedAt: null } });
      if (!role) throw new BadRequestException("Papel de acesso inválido");
    }
    const updated = await this.prisma.$transaction(async (tx) => {
      if (dto.name) await tx.user.update({ where: { id: membership.userId }, data: { name: dto.name.trim() } });
      const row = await tx.companyMembership.update({ where: { id }, data: {
        roleId: dto.roleId,
        status: dto.status,
        activatedAt: dto.status === "ACTIVE" ? new Date() : undefined,
        deactivatedAt: dto.status === "INACTIVE" ? new Date() : dto.status === "ACTIVE" ? null : undefined,
      }, include: { role: true, user: true, company: true } });
      if (dto.status === "INACTIVE") await tx.session.updateMany({ where: { activeMembershipId: id, revokedAt: null }, data: { activeMembershipId: null } });
      return row;
    });
    return this.presentMembership(updated);
  }

  async invite(companyId: string, dto: InviteUserDto) {
    const email = dto.email.trim().toLowerCase();
    const role = await this.prisma.role.findFirst({ where: { id: dto.roleId, companyId, deactivatedAt: null } });
    if (!role) throw new BadRequestException("Papel de acesso inválido");
    const company = await this.prisma.company.findUniqueOrThrow({ where: { id: companyId } });
    const existing = await this.prisma.user.findUnique({
      where: { email }, include: { memberships: { where: { companyId }, include: { invitation: true } } },
    });
    const current = existing?.memberships[0];
    if (current) {
      if (current.status === "PENDING") return this.resend(companyId, current.id);
      throw new ConflictException("Este usuário já faz parte da empresa");
    }

    if (!existing) {
      const temporaryPassword = randomBytes(15).toString("base64url");
      const token = randomBytes(32).toString("base64url");
      const membership = await this.prisma.$transaction(async (tx) => {
        const user = await tx.user.create({ data: {
          name: dto.name?.trim() || email.split("@")[0]!, email,
          passwordHash: await argon2.hash(temporaryPassword, { type: argon2.argon2id }), mustChangePassword: true,
        } });
        const created = await tx.companyMembership.create({ data: {
          companyId, userId: user.id, roleId: role.id, status: "ACTIVE", activatedAt: new Date(),
        } });
        await tx.userInvitation.create({ data: {
          companyId, roleId: role.id, membershipId: created.id, email, name: dto.name,
          tokenHash: hash(token), expiresAt: new Date(Date.now() + inviteLifetime), acceptedAt: new Date(),
        } });
        await tx.notification.create({ data: {
          companyId, userId: user.id, type: "INVITATION", title: "Bem-vindo ao Verde Caixa",
          message: `Seu acesso à empresa ${company.name} está pronto.`,
        } });
        return created;
      }).catch(this.translateMembershipConflict);
      await this.sendTemporaryPassword(email, company.name, temporaryPassword).catch(() => {
        throw new BadGatewayException("A conta foi criada, mas o e-mail não pôde ser enviado. Use a ação de reenvio.");
      });
      return { id: membership.id, userId: membership.userId, email, status: membership.status };
    }

    const token = randomBytes(32).toString("base64url");
    const membership = await this.prisma.$transaction(async (tx) => {
      const created = await tx.companyMembership.create({ data: {
        companyId, userId: existing.id, roleId: role.id, status: "PENDING",
      } });
      await tx.userInvitation.create({ data: {
        companyId, roleId: role.id, membershipId: created.id, email, name: existing.name,
        tokenHash: hash(token), expiresAt: new Date(Date.now() + inviteLifetime),
      } });
      return created;
    }).catch(this.translateMembershipConflict);
    await this.sendAcceptance(email, company.name, token).catch(() => {
      throw new BadGatewayException("O convite foi criado, mas o e-mail não pôde ser enviado. Use a ação de reenvio.");
    });
    return { id: membership.id, userId: membership.userId, email, status: membership.status };
  }

  async accept(userId: string, email: string, sessionId: string, dto: AcceptInvitationDto) {
    const invitation = await this.prisma.userInvitation.findUnique({
      where: { tokenHash: hash(dto.token) }, include: { membership: { include: { company: true, role: true, user: true } } },
    });
    if (!invitation || !invitation.membership || invitation.acceptedAt || invitation.expiresAt <= new Date()) throw new BadRequestException("Convite inválido ou expirado");
    if (invitation.membership.userId !== userId || invitation.email.toLowerCase() !== email.toLowerCase()) throw new BadRequestException("Este convite pertence a outra conta");
    if (invitation.membership.status !== "PENDING") throw new BadRequestException("Este convite não está mais pendente");
    const membership = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.companyMembership.update({ where: { id: invitation.membership!.id }, data: { status: "ACTIVE", activatedAt: new Date(), deactivatedAt: null } });
      await tx.userInvitation.update({ where: { id: invitation.id }, data: { acceptedAt: new Date() } });
      await tx.session.update({ where: { id: sessionId }, data: { activeMembershipId: updated.id } });
      await tx.notification.create({ data: {
        companyId: updated.companyId, userId, type: "INVITATION", title: "Novo acesso liberado",
        message: `Seu acesso à empresa ${invitation.membership!.company.name} está pronto.`,
      } });
      await tx.auditLog.create({ data: {
        companyId: updated.companyId, actorId: userId, action: "ACCEPT", entityType: "invitation",
        entityId: invitation.id, summary: "Convite de acesso aceito",
      } });
      return updated;
    });
    return { id: membership.id, companyId: membership.companyId, status: membership.status };
  }

  async resend(companyId: string, id: string) {
    const membership = await this.prisma.companyMembership.findFirst({
      where: { id, companyId }, include: { user: true, company: true, invitation: true },
    });
    if (!membership || !membership.invitation) throw new NotFoundException("Convite não encontrado");
    if (membership.status === "PENDING") {
      const token = randomBytes(32).toString("base64url");
      await this.prisma.userInvitation.update({ where: { id: membership.invitation.id }, data: {
        tokenHash: hash(token), expiresAt: new Date(Date.now() + inviteLifetime), acceptedAt: null,
      } });
      await this.sendAcceptance(membership.user.email, membership.company.name, token);
      return { id, status: membership.status, message: "Convite reenviado." };
    }
    if (membership.status === "ACTIVE" && membership.user.mustChangePassword) {
      const temporaryPassword = randomBytes(15).toString("base64url");
      await this.prisma.$transaction([
        this.prisma.user.update({ where: { id: membership.userId }, data: { passwordHash: await argon2.hash(temporaryPassword, { type: argon2.argon2id }) } }),
        this.prisma.session.updateMany({ where: { userId: membership.userId, revokedAt: null }, data: { revokedAt: new Date() } }),
      ]);
      await this.sendTemporaryPassword(membership.user.email, membership.company.name, temporaryPassword);
      return { id, status: membership.status, message: "Credencial temporária reenviada." };
    }
    throw new ConflictException("Este usuário já concluiu o acesso");
  }

  async roles(companyId: string, query: ListQueryDto) {
    const where = { companyId, deactivatedAt: null, ...(query.search ? { name: { contains: query.search, mode: "insensitive" as const } } : {}) };
    const [rows, total] = await Promise.all([
      this.prisma.role.findMany({ where, include: { permissions: { include: { permission: true } }, _count: { select: { memberships: true } } }, skip: offset(query), take: query.limit, orderBy: { name: query.order } }),
      this.prisma.role.count({ where }),
    ]);
    return paginated(rows.map((role) => ({ ...role, permissions: role.permissions.map((item) => item.permission.code), users: role._count.memberships })), total, query);
  }

  async role(companyId: string, id: string) {
    const role = await this.prisma.role.findFirst({ where: { id, companyId, deactivatedAt: null }, include: {
      permissions: { include: { permission: true } }, _count: { select: { memberships: true } },
    } });
    if (!role) throw new NotFoundException("Papel não encontrado");
    return { ...role, permissions: role.permissions.map((item) => item.permission.code), users: role._count.memberships };
  }

  permissions() { return this.prisma.permission.findMany({ orderBy: { code: "asc" } }); }

  async createRole(companyId: string, dto: RoleDto) {
    const permissions = await this.validPermissions(dto.permissions);
    const publicCode = await this.sequence.next(companyId, "ROLE");
    return this.prisma.role.create({ data: { companyId, publicCode, name: dto.name, description: dto.description,
      permissions: { create: permissions.map((permission) => ({ permissionId: permission.id })) },
    }, include: { permissions: { include: { permission: true } } } });
  }

  async updateRole(companyId: string, id: string, dto: RoleDto) {
    const role = await this.prisma.role.findFirst({ where: { id, companyId, deactivatedAt: null } });
    if (!role) throw new NotFoundException("Papel não encontrado");
    const permissions = await this.validPermissions(dto.permissions);
    return this.prisma.role.update({ where: { id }, data: { name: dto.name, description: dto.description, permissions: {
      deleteMany: {}, create: permissions.map((permission) => ({ permissionId: permission.id })),
    } }, include: { permissions: { include: { permission: true } } } });
  }

  async deactivateRole(companyId: string, id: string) {
    const role = await this.prisma.role.findFirst({ where: { id, companyId, deactivatedAt: null }, include: { _count: { select: { memberships: true } } } });
    if (!role) throw new NotFoundException("Papel não encontrado");
    if (role.isSystem || role._count.memberships) throw new BadRequestException("Este papel não pode ser desativado");
    return this.prisma.role.update({ where: { id }, data: { deactivatedAt: new Date() } });
  }

  private presentMembership(membership: { id: string; companyId: string; userId: string; roleId: string; status: string; activatedAt: Date | null; deactivatedAt: Date | null; createdAt: Date; updatedAt: Date; user: { name: string; email: string; lastLoginAt: Date | null; mustChangePassword: boolean }; role: unknown; company: unknown }) {
    return { id: membership.id, userId: membership.userId, companyId: membership.companyId, roleId: membership.roleId,
      name: membership.user.name, email: membership.user.email, status: membership.status, lastLoginAt: membership.user.lastLoginAt,
      mustChangePassword: membership.user.mustChangePassword, activatedAt: membership.activatedAt, deactivatedAt: membership.deactivatedAt,
      createdAt: membership.createdAt, updatedAt: membership.updatedAt, role: membership.role, company: membership.company,
    };
  }

  private async validPermissions(codes: string[]) {
    const permissions = await this.prisma.permission.findMany({ where: { code: { in: codes } } });
    if (permissions.length !== new Set(codes).size) throw new BadRequestException("Há permissões inválidas");
    return permissions;
  }

  private sendTemporaryPassword(email: string, company: string, password: string) {
    const origin = this.config.get("APP_ORIGIN", "http://localhost:3000");
    return this.mail.send(email, `Seu acesso ao Verde Caixa — ${company}`, `Seu acesso à empresa ${company} foi criado.\n\nE-mail: ${email}\nSenha temporária: ${password}\n\nEntre em ${origin}/login e crie uma nova senha no primeiro acesso.`);
  }

  private sendAcceptance(email: string, company: string, token: string) {
    const origin = this.config.get("APP_ORIGIN", "http://localhost:3000");
    return this.mail.send(email, `Convite para ${company} — Verde Caixa`, `Você foi convidado para acessar ${company}. Entre na sua conta e aceite em ${origin}/convites/aceitar?token=${token}. O convite expira em sete dias.`);
  }

  private translateMembershipConflict(error: unknown): never {
    if (typeof error === "object" && error !== null && "code" in error && error.code === "P2002") throw new ConflictException("Este usuário já faz parte da empresa");
    throw error;
  }
}
