# Verde Caixa

O Verde Caixa é composto por um front-end Next.js estático e uma API NestJS com PostgreSQL e Prisma.

## Desenvolvimento

1. Copie `api/.env.example` para `api/.env` e preencha `ADMIN_PASSWORD`, `AUTH_ACCESS_SECRET` e `AUTH_REFRESH_SECRET`.
2. Inicie PostgreSQL e Mailpit, aplique a migration com `npm --prefix api run db:deploy` e carregue a demonstração com `npm --prefix api run db:seed`.
3. Inicie a API com `npm run api:dev` e o front-end com `npm run dev`.

O front usa `http://localhost:3000` e a API usa `http://localhost:3001/api/v1`. Em desenvolvimento, configure `NEXT_PUBLIC_API_BASE_URL=http://localhost:3001/api/v1`; no contêiner, a URL relativa `/api/v1` é usada automaticamente.

## Contêineres

Defina os segredos exigidos pelo `compose.yaml`, execute a migration como serviço único e abra `http://localhost:8080`. O proxy entrega o front em `/` e encaminha `/api` para o NestJS.

O seed é intencionalmente separado da inicialização de produção e exige `ADMIN_PASSWORD`. A documentação OpenAPI é gerada por `npm run api:types`.
