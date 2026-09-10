import { describe, expect, it, vi } from 'vitest';
import * as argon2 from 'argon2';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { AuthService } from './auth.service.js';
import { RegisterDto } from './auth.dto.js';

const dto = { name: 'Maria Silva', companyName: 'Minha Empresa', email: 'MARIA@example.com', password: 'senha-segura-123' };

describe('Cadastro de conta', () => {
  it('cria empresa e administrador na mesma transação com senha protegida e permissões', async () => {
    const tx = {
      company: { create: vi.fn().mockResolvedValue({ id: 'company-new' }) },
      permission: { findMany: vi.fn().mockResolvedValue([{ id: 'permission-1' }]) },
      role: { create: vi.fn().mockResolvedValue({ id: 'role-new' }) },
      sequenceCounter: { create: vi.fn() },
      user: { create: vi.fn() },
    };
    const prisma = { $transaction: vi.fn(async (callback) => callback(tx)) };
    const service = new AuthService(prisma as never, {} as never, {} as never, {} as never);
    await service.register(dto);
    expect(prisma.$transaction).toHaveBeenCalledOnce();
    expect(tx.role.create).toHaveBeenCalledWith({ data: expect.objectContaining({ companyId: 'company-new', permissions: { create: [{ permissionId: 'permission-1' }] } }) });
    const data = tx.user.create.mock.calls[0]![0].data;
    expect(data).toMatchObject({ companyId: 'company-new', roleId: 'role-new', email: 'maria@example.com' });
    expect(data.passwordHash).not.toBe(dto.password);
    expect(await argon2.verify(data.passwordHash, dto.password)).toBe(true);
    expect(tx.sequenceCounter.create).toHaveBeenCalledWith({ data: { companyId: 'company-new', entity: 'ROLE', value: 1 } });
  });

  it('retorna conflito quando o e-mail já existe', async () => {
    const prisma = { $transaction: vi.fn().mockRejectedValue({ code: 'P2002' }) };
    const service = new AuthService(prisma as never, {} as never, {} as never, {} as never);
    await expect(service.register(dto)).rejects.toMatchObject({ status: 409 });
  });

  it('rejeita nomes vazios, e-mail inválido e senha curta', async () => {
    const errors = await validate(plainToInstance(RegisterDto, { name: '   ', companyName: ' ', email: 'invalid', password: '123' }));
    expect(errors.map(error => error.property).sort()).toEqual(['companyName', 'email', 'name', 'password']);
  });
});
