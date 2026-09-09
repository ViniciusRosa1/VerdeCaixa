import { Type } from 'class-transformer';
import { IsDateString, IsEnum, IsInt, IsNumber, IsOptional, IsString, IsUUID, Max, Min } from 'class-validator';
import { EntryKind, PaymentPlan } from '../../generated/prisma/enums.js';
import { ListQueryDto } from '../../common/dto.js';

export class FinancialListQueryDto extends ListQueryDto {
  @IsOptional() @IsEnum(EntryKind) kind?: EntryKind;
  @IsOptional() @IsDateString() from?: string;
  @IsOptional() @IsDateString() to?: string;
}

export class CreateFinancialEntryDto {
  @IsEnum(EntryKind) kind!: EntryKind;
  @IsEnum(PaymentPlan) plan!: PaymentPlan;
  @IsString() description!: string;
  @IsUUID() counterpartyId!: string;
  @IsUUID() categoryId!: string;
  @IsOptional() @IsUUID() projectId?: string;
  @Type(() => Number) @IsNumber({ maxDecimalPlaces: 2 }) @Min(0.01) totalAmount!: number;
  @IsDateString() dueDate!: string;
  @IsOptional() @IsInt() @Min(2) @Max(120) installmentCount?: number;
  @IsOptional() @IsDateString() recurrenceEndsOn?: string;
  @IsOptional() @IsString() notes?: string;
}

export class UpdateFinancialEntryDto {
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsUUID() counterpartyId?: string;
  @IsOptional() @IsUUID() categoryId?: string;
  @IsOptional() @IsUUID() projectId?: string;
  @IsOptional() @IsString() notes?: string;
}

export class SettleDto {
  @IsUUID() accountId!: string;
  @IsOptional() @IsDateString() settledAt?: string;
  @IsOptional() @IsString() notes?: string;
}
