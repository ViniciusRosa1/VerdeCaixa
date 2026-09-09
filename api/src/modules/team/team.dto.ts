import { IsArray, IsEmail, IsEnum, IsOptional, IsString, IsUUID, MinLength } from 'class-validator';
import { UserStatus } from '../../generated/prisma/enums.js';

export class RoleDto {
  @IsString() name!: string;
  @IsOptional() @IsString() description?: string;
  @IsArray() @IsString({ each: true }) permissions!: string[];
}

export class InviteUserDto {
  @IsEmail() email!: string;
  @IsOptional() @IsString() name?: string;
  @IsUUID() roleId!: string;
}

export class UpdateUserDto {
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsUUID() roleId?: string;
  @IsOptional() @IsEnum(UserStatus) status?: UserStatus;
}

export class AcceptInvitationDto {
  @IsString() token!: string;
  @IsString() name!: string;
  @IsString() @MinLength(8) password!: string;
}
