import { Type } from "class-transformer";
import {
  IsDateString,
  IsEmail,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from "class-validator";
import {
  AccountType,
  CategoryKind,
  ProjectStatus,
} from "../../generated/prisma/enums.js";

export class CounterpartyDto {
  @IsString() name!: string;
  @IsOptional() @IsString() document?: string;
  @IsOptional() @IsEmail() email?: string;
  @IsOptional() @IsString() phone?: string;
}

export class CategoryDto {
  @IsString() name!: string;
  @IsEnum(CategoryKind) kind!: CategoryKind;
  @IsOptional() @IsUUID() parentId?: string;
}

export class AccountDto {
  @IsString() name!: string;
  @IsString() institution!: string;
  @IsEnum(AccountType) type!: AccountType;
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  openingBalance!: number;
}

export class ProjectDto {
  @IsString() name!: string;
  @IsOptional() @IsUUID() clientId?: string;
  @IsDateString() startsOn!: string;
  @IsOptional() @IsDateString() endsOn?: string;
  @IsOptional() @IsEnum(ProjectStatus) status?: ProjectStatus;
}
