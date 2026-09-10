import { IsDateString, IsIn, IsOptional } from "class-validator";

export class PeriodQueryDto {
  @IsOptional() @IsDateString() from?: string;
  @IsOptional() @IsDateString() to?: string;
}

export class ExportQueryDto extends PeriodQueryDto {
  @IsIn(["pdf", "csv"]) format!: "pdf" | "csv";
}
