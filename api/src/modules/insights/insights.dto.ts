import { IsDateString, IsIn, IsOptional, IsUUID } from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class PeriodQueryDto {
  @ApiPropertyOptional({ format: "date", type: String })
  @IsOptional() @IsDateString() from?: string;
  @ApiPropertyOptional({ format: "date", type: String })
  @IsOptional() @IsDateString() to?: string;
  @ApiPropertyOptional({ format: "uuid", type: String })
  @IsOptional() @IsUUID() accountId?: string;
}

export class DashboardQueryDto {
  @ApiPropertyOptional({ format: "uuid", type: String })
  @IsOptional() @IsUUID() accountId?: string;
}

export class ExportQueryDto extends PeriodQueryDto {
  @ApiProperty({ enum: ["pdf", "csv"] })
  @IsIn(["pdf", "csv"]) format!: "pdf" | "csv";
}
