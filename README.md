<div align="center">

[![LinkedIn](https://img.shields.io/badge/LinkedIn-Alan_Stefanov-blue?style=flat-square&logo=linkedin)](https://www.linkedin.com/in/alanstefanov/)
[![Email](https://img.shields.io/badge/Email-alan.emanuel.stefanov@gmail.com-red?style=flat-square&logo=gmail)](mailto:alan.emanuel.stefanov@gmail.com)
[![GitHub](https://img.shields.io/badge/GitHub-AlanStefanov-black?style=flat-square&logo=github)](https://github.com/AlanStefanov)
[![CI](https://github.com/AlanStefanov/financiera-stefanov/actions/workflows/ci.yml/badge.svg)](https://github.com/AlanStefanov/financiera-stefanov/actions/workflows/ci.yml)

**Alan Stefanov** — Engineering Manager · DevOps Engineer · Software Developer · _La Plata, Argentina_

---

</div>

# Microcreditos Stefanov - Sistema de Gestión

Sistema integral de gestión de préstamos y clientes para Microcreditos Stefanov.

## Características

- **Gestión de Clientes**: CRUD completo con información de contacto, dirección y fotos DNI
- **Gestión de Préstamos**: Control de préstamos con estados (orden → aprobado → finalizado)
- **Seguimiento de Pagos**: Cuotas parciales y completas, con cálculo automático de intereses
- **Roles de Usuario**: Administrador y Operador con permisos diferenciados
- **Notificaciones**: Envío automático de notificaciones por WhatsApp al aprobar préstamos
- **Dashboard**: Estadísticas en tiempo real (total prestado, cobrado, faltante)
- **Diseño Responsivo**: Interfaz moderna y adaptativa

## Stack Tecnológico

- **Frontend**: Next.js 14 (App Router), React, TypeScript
- **Backend**: API Routes de Next.js
- **Base de Datos**: SQLite (better-sqlite3)
- **Autenticación**: JWT
- **Estilos**: CSS Variables con diseño personalizado

## Estructura del Proyecto

```
src/
├── app/
│   ├── api/              # Endpoints de la API
│   │   ├── auth/         # Autenticación
│   │   ├── clients/      # Gestión de clientes
│   │   ├── loans/        # Gestión de préstamos
│   │   ├── loan-types/  # Tipos de préstamo
│   │   ├── loan-payments/# Pagos de cuotas
│   │   └── geocode/      # Geocodificación de direcciones
│   ├── dashboard/        # Panel principal
│   │   ├── clients/      # Clientes
│   │   ├── loans/       # Préstamos
│   │   ├── loan-types/  # Configuración de préstamos
│   │   ├── users/       # Gestión de usuarios
│   │   └── page.tsx     # Dashboard principal
│   ├── globals.css      # Estilos globales
│   ├── layout.tsx       # Layout principal
│   └── page.tsx         # Página de login
└── lib/
    └── db.ts            # Configuración de SQLite
```

## Instalación

```bash
# Instalar dependencias
npm install

# Ejecutar en desarrollo
npm run dev
```

## Variables de Entorno

Crea un archivo `.env.local` en la raíz del proyecto:

```env
# No es necesario configurar JWT_SECRET localmente, se usa el valor por defecto de la aplicación.
```

## Roles de Usuario

| Rol | Permisos |
|-----|-----------|
| Admin | Ver todos los préstamos, gestionar usuarios, activar/desactivar clientes |
| Operator | Crear/editar clientes, gestionar préstamos propios, registrar pagos |

## Estados de Préstamo

- **Orden**: Préstamo creado, pendiente de aprobación
- **Aprobado**: Préstamo activo, en proceso de cobro
- **Finalizado**: Todas las cuotas pagadas

## Licencia

MIT