import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import * as argon2 from "argon2";
import { createHash, randomBytes } from "node:crypto";
import { PrismaService } from "../../database/prisma.service.js";
import { SequenceService } from "../../database/sequence.service.js";
import { MailService } from "../../services/mail.service.js";
import { offset, paginated, type ListQueryDto } from "../../common/dto.js";
import type {
  AcceptInvitationDto,
  InviteUserDto,
  RoleDto,
  UpdateUserDto,
} from "./team.dto.js";

const hash = (value: string) =>
  createHash("sha256").update(value).digest("hex");

@Injectable()
export class TeamService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(SequenceService) private readonly sequence: SequenceService,
    @Inject(MailService) private readonly mail: MailService,
    @Inject(ConfigService) private readonly config: ConfigService,
  ) {}

  async users(companyId: string, query: ListQueryDto) {
    const where = {
      companyId,
      ...(query.search
        ? {
            OR: [
              {
                name: { contains: query.search, mode: "insensitive" as const },
              },
              {
                email: { contains: query.search, mode: "insensitive" as const },
              },
            ],
          }
        : {}),
    };
    const [data, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        include: { role: true },
        skip: offset(query),
        take: query.limit,
        orderBy: { name: query.order },
      }),
      this.prisma.user.count({ where }),
    ]);
    return paginated(
      data.map((user) => ({
        id: user.id,
        companyId: user.companyId,
        roleId: user.roleId,
        name: user.name,
        email: user.email,
        status: user.status,
        lastLoginAt: user.lastLoginAt,
        deactivatedAt: user.deactivatedAt,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        role: user.role,
      })),
      total,
      query,
    );
  }

  async updateUser(companyId: string, id: string, dto: UpdateUserDto) {
    const user = await this.prisma.user.findFirst({ where: { id, companyId } });
    if (!user) throw new NotFoundException("Usuário não encontrado");
    const { passwordHash: _, ...updated } = await this.prisma.user.update({
      where: { id },
      data: {
        ...dto,
        deactivatedAt:
          dto.status === "INACTIVE"
            ? new Date()
            : dto.status === "ACTIVE"
              ? null
              : undefined,
      },
    });
    return updated;
  }

  async invite(companyId: string, dto: InviteUserDto) {
    if (
      await this.prisma.user.findUnique({
        where: { email: dto.email.toLowerCase() },
      })
    )
      throw new BadRequestException("Este e-mail já está cadastrado");
    const role = await this.prisma.role.findFirst({
      where: { id: dto.roleId, companyId, deactivatedAt: null },
    });
    if (!role) throw new BadRequestException("Papel de acesso inválido");
    const token = randomBytes(32).toString("base64url");
    const invitation = await this.prisma.userInvitation.create({
      data: {
        companyId,
        roleId: dto.roleId,
        email: dto.email.toLowerCase(),
        name: dto.name,
        tokenHash: hash(token),
        expiresAt: new Date(Date.now() + 7 * 86_400_000),
      },
    });
    const origin = this.config.get("APP_ORIGIN", "http://localhost:3000");
    await this.mail.send(
      dto.email,
      "Convite para o Verde Caixa",
      `Acesse ${origin}/login?invite=${token} para aceitar o convite. Ele expira em sete dias.`,
    );
    return {
      id: invitation.id,
      email: invitation.email,
      expiresAt: invitation.expiresAt,
    };
  }

  async accept(dto: AcceptInvitationDto) {
    const invitation = await this.prisma.userInvitation.findUnique({
      where: { tokenHash: hash(dto.token) },
    });
    if (
      !invitation ||
      invitation.acceptedAt ||
      invitation.expiresAt <= new Date()
    )
      throw new BadRequestException("Convite inválido ou expirado");
    const publicCode = await this.sequence.next(invitation.companyId, "USER");
    const user = await this.prisma.$transaction(async (tx) => {
      const created = await tx.user.create({
        data: {
          companyId: invitation.companyId,
          roleId: invitation.roleId,
          name: dto.name,
          email: invitation.email,
          passwordHash: await argon2.hash(dto.password, {
            type: argon2.argon2id,
          }),
          status: "ACTIVE",
        },
      });
      await tx.userInvitation.update({
        where: { id: invitation.id },
        data: { acceptedAt: new Date() },
      });
      await tx.notification.create({
        data: {
          companyId: invitation.companyId,
          userId: created.id,
          type: "INVITATION",
          title: "Bem-vindo ao Verde Caixa",
          message: `Seu acesso ${publicCode} está pronto.`,
        },
      });
      return created;
    });
    return { id: user.id, name: user.name, email: user.email };
  }

  async roles(companyId: string, query: ListQueryDto) {
    const where = {
      companyId,
      deactivatedAt: null,
      ...(query.search
        ? { name: { contains: query.search, mode: "insensitive" as const } }
        : {}),
    };
    const [rows, total] = await Promise.all([
      this.prisma.role.findMany({
        where,
        include: {
          permissions: { include: { permission: true } },
          _count: { select: { users: true } },
        },
        skip: offset(query),
        take: query.limit,
        orderBy: { name: query.order },
      }),
      this.prisma.role.count({ where }),
    ]);
    return paginated(
      rows.map((role) => ({
        ...role,
        permissions: role.permissions.map((item) => item.permission.code),
        users: role._count.users,
      })),
      total,
      query,
    );
  }

  permissions() {
    return this.prisma.permission.findMany({ orderBy: { code: "asc" } });
  }

  async createRole(companyId: string, dto: RoleDto) {
    const permissions = await this.validPermissions(dto.permissions);
    const publicCode = await this.sequence.next(companyId, "ROLE");
    return this.prisma.role.create({
      data: {
        companyId,
        publicCode,
        name: dto.name,
        description: dto.description,
        permissions: {
          create: permissions.map((permission) => ({
            permissionId: permission.id,
          })),
        },
      },
      include: { permissions: { include: { permission: true } } },
    });
  }

  async updateRole(companyId: string, id: string, dto: RoleDto) {
    const role = await this.prisma.role.findFirst({
      where: { id, companyId, deactivatedAt: null },
    });
    if (!role) throw new NotFoundException("Papel não encontrado");
    const permissions = await this.validPermissions(dto.permissions);
    return this.prisma.role.update({
      where: { id },
      data: {
        name: dto.name,
        description: dto.description,
        permissions: {
          deleteMany: {},
          create: permissions.map((permission) => ({
            permissionId: permission.id,
          })),
        },
      },
      include: { permissions: { include: { permission: true } } },
    });
  }

  async deactivateRole(companyId: string, id: string) {
    const role = await this.prisma.role.findFirst({
      where: { id, companyId, deactivatedAt: null },
      include: { _count: { select: { users: true } } },
    });
    if (!role) throw new NotFoundException("Papel não encontrado");
    if (role.isSystem || role._count.users)
      throw new BadRequestException("Este papel não pode ser desativado");
    return this.prisma.role.update({
      where: { id },
      data: { deactivatedAt: new Date() },
    });
  }

  private async validPermissions(codes: string[]) {
    const permissions = await this.prisma.permission.findMany({
      where: { code: { in: codes } },
    });
    if (permissions.length !== new Set(codes).size)
      throw new BadRequestException("Há permissões inválidas");
    return permissions;
  }
}
