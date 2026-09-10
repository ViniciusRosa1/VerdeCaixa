import { ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsIn, IsInt, IsOptional, IsString, Max, Min } from "class-validator";

export class ListQueryDto {
  @ApiPropertyOptional({ default: 1, minimum: 1, type: Number }) @Type(() => Number) @IsOptional() @IsInt() @Min(1) page: number = 1;
  @ApiPropertyOptional({ default: 20, minimum: 1, maximum: 100, type: Number })
  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  limit: number = 20;
  @ApiPropertyOptional() @IsOptional() @IsString() search?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() status?: string;
  @ApiPropertyOptional({ enum: ["asc", "desc"] })
  @IsOptional()
  @IsIn(["asc", "desc"])
  order: "asc" | "desc" = "desc";
}

export function paginated<T>(data: T[], total: number, query: ListQueryDto) {
  return {
    data,
    meta: {
      page: query.page,
      limit: query.limit,
      total,
      pages: Math.ceil(total / query.limit),
    },
  };
}

export const offset = (query: ListQueryDto) => (query.page - 1) * query.limit;
