import {
  IsBoolean,
  IsEmail,
  IsInt,
  IsOptional,
  IsString,
  IsUrl,
  Max,
  Min,
} from "class-validator";

export class UpdateCompanyDto {
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsString() document?: string;
  @IsOptional() @IsEmail() financialEmail?: string;
  @IsOptional() @IsString() currency?: string;
  @IsOptional() @IsString() timezone?: string;
  @IsOptional() @IsUrl() logoUrl?: string;
  @IsOptional() @IsBoolean() reminderEnabled?: boolean;
  @IsOptional() @IsInt() @Min(0) @Max(90) reminderDaysBefore?: number;
}
