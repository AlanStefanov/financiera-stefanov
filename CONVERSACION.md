# Conversación - Microcreditos Stefanov

## Historial del Proyecto

### Objetivos
- Sistema de gestión de préstamos y clientes para Microcreditos Stefanov
- Desplegado en Vercel con base de datos Turso (LibSQL)

### Stack Tecnológico
- Next.js 14 (App Router)
- TypeScript
- Turso (LibSQL) - Base de datos serverless
- JWT para autenticación

### Estado Actual
- Proyecto desplegado en Vercel
- Base de datos conectada a Turso
- Build funcionando correctamente

### Variables de Entorno en Vercel
- `TURSO_URL`: libsql://stefanovmicrocredits-alanstefanov.aws-us-east-2.turso.io
- `TURSO_AUTH_TOKEN`: (secret)
- `JWT_SECRET`: (secret)

### Credenciales
- Usuario admin: `admin`
- Password: `Dr@wssap1234k`

### Features Implementados
- Login con JWT
- Dashboard con estadísticas financieras
- Gestión de clientes (CRUD, soft delete)
- Gestión de préstamos (estados: orden → aprobado → finalizado)
- Seguimiento de pagos
- Resumen de préstamo antes de crear orden
- Notificaciones WhatsApp al aprobar préstamos

### Problemas Resueltos
1. Build en Node 10 fallaba - se configuró Node 22
2. API de geocodificación Nominatim rate limiting - se cambió a Photon
3. Migración de SQLite local a Turso para Vercel
4. Build fail por variables de entorno en tiempo de build - lazy initialization

### Commits Recientes
- `5cc7b8a` - feat: migrate to Turso (LibSQL) for Vercel deployment
- `df45b58` - fix: use environment variables for Turso credentials
- `111d5a7` - fix: auto-initialize database on startup
- `c8e9eab` - fix: lazy initialization of Turso client

### Repo
https://github.com/AlanStefanov/financiera-stefanov

## Fecha: 6 de Abril 2026