import 'dotenv/config';
import { defineConfig } from 'prisma/config';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'tsx prisma/seed.ts',
  },
  datasource: { url: process.env.DATABASE_URL ?? 'postgresql://verde_caixa:verde_caixa@localhost:5432/verde_caixa' },
});
