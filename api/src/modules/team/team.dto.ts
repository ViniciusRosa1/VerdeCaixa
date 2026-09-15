import {
  IsArray,
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from "class-validator";
import { Transform } from "class-transformer";
import { UserStatus } from "../../generated/prisma/enums.js";

export class RoleDto {
  @IsString() name!: string;
  @IsOptional() @IsString() description?: string;
  @IsArray() @IsString({ each: true }) permissions!: string[];
}

export class InviteUserDto {
  @Transform(({ value }) => typeof value === "string" ? value.trim().toLowerCase() : value)
  @IsEmail() @MaxLength(254) email!: string;
  @IsOptional() @IsString() @MaxLength(120) name?: string;
  @IsUUID() roleId!: string;
}

export class UpdateUserDto {
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsUUID() roleId?: string;
  @IsOptional() @IsEnum(UserStatus) status?: UserStatus;
}

export class AcceptInvitationDto {
  @IsString() token!: string;
}
