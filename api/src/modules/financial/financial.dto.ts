import { Type } from "class-transformer";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
} from "class-validator";
import { EntryKind, PaymentPlan } from "../../generated/prisma/enums.js";
import { ListQueryDto } from "../../common/dto.js";

export class FinancialListQueryDto extends ListQueryDto {
  @ApiPropertyOptional({ enum: EntryKind })
  @IsOptional() @IsEnum(EntryKind) kind?: EntryKind;
  @ApiPropertyOptional({ format: "date", type: String })
  @IsOptional() @IsDateString() from?: string;
  @ApiPropertyOptional({ format: "date", type: String })
  @IsOptional() @IsDateString() to?: string;
}

export class CreateFinancialEntryDto {
  @ApiProperty({ enum: EntryKind })
  @IsEnum(EntryKind) kind!: EntryKind;
  @ApiProperty({ enum: PaymentPlan })
  @IsEnum(PaymentPlan) plan!: PaymentPlan;
  @ApiProperty({ type: String })
  @IsString() description!: string;
  @ApiProperty({ format: "uuid", type: String })
  @IsUUID() counterpartyId!: string;
  @ApiProperty({ format: "uuid", type: String })
  @IsUUID() categoryId!: string;
  @ApiProperty({ format: "uuid", type: String })
  @IsUUID() accountId!: string;
  @ApiPropertyOptional({ format: "uuid", type: String })
  @IsOptional() @IsUUID() projectId?: string;
  @ApiProperty({ minimum: 0.01, type: Number })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  totalAmount!: number;
  @ApiProperty({ format: "date", type: String })
  @IsDateString() dueDate!: string;
  @ApiPropertyOptional({ maximum: 120, minimum: 2, type: Number })
  @IsOptional() @IsInt() @Min(2) @Max(120) installmentCount?: number;
  @ApiPropertyOptional({ format: "date", type: String })
  @IsOptional() @IsDateString() recurrenceEndsOn?: string;
  @ApiPropertyOptional({ type: String })
  @IsOptional() @IsString() notes?: string;
}

export class UpdateFinancialEntryDto {
  @ApiPropertyOptional({ type: String })
  @IsOptional() @IsString() description?: string;
  @ApiPropertyOptional({ format: "uuid", type: String })
  @IsOptional() @IsUUID() counterpartyId?: string;
  @ApiPropertyOptional({ format: "uuid", type: String })
  @IsOptional() @IsUUID() categoryId?: string;
  @ApiPropertyOptional({ format: "uuid", type: String })
  @IsOptional() @IsUUID() accountId?: string;
  @ApiPropertyOptional({ format: "uuid", type: String })
  @IsOptional() @IsUUID() projectId?: string;
  @ApiPropertyOptional({ minimum: 0.01, type: Number })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  totalAmount?: number;
  @ApiPropertyOptional({ format: "date", type: String })
  @IsOptional() @IsDateString() dueDate?: string;
  @ApiPropertyOptional({ type: String })
  @IsOptional() @IsString() notes?: string;
}

export class SettleDto {
  @ApiProperty({ format: "uuid", type: String })
  @IsUUID() accountId!: string;
  @ApiPropertyOptional({ format: "date-time", type: String })
  @IsOptional() @IsDateString() settledAt?: string;
  @ApiPropertyOptional({ type: String })
  @IsOptional() @IsString() notes?: string;
}
