import { Inject, Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service.js';
import type { UpdateCompanyDto } from './company.dto.js';

@Injectable()
export class CompanyService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}
  get(companyId: string) { return this.prisma.company.findUniqueOrThrow({ where: { id: companyId } }); }
  update(companyId: string, dto: UpdateCompanyDto) { return this.prisma.company.update({ where: { id: companyId }, data: dto }); }
}
