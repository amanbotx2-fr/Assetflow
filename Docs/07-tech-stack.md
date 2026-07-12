# Backend Tech Stack

## Table of Contents

- [Selection Criteria](#selection-criteria)
- [Backend](#backend)
- [Database](#database)
- [ORM](#orm)
- [Authentication](#authentication)
- [File Handling](#file-handling)
- [QR Generation](#qr-generation)
- [Development Tools](#development-tools)
- [Summary Matrix](#summary-matrix)

## Selection Criteria

The backend stack is selected for fast delivery, team familiarity, strong TypeScript support, stable database workflows, predictable deployment, and maintainability after the hackathon.

## Backend

### Node.js

| Item | Details |
| --- | --- |
| Why selected | Provides a mature runtime for building HTTP APIs with a large package ecosystem. |
| Advantages | Fast development cycle, broad hosting support, strong tooling, shared language with TypeScript. |
| Alternatives considered | Deno, Bun, Java Spring Boot, Python FastAPI. |
| Reason alternatives were not selected | Node.js has the most familiar ecosystem for the team and integrates cleanly with Express and Prisma. |

### Express.js

| Item | Details |
| --- | --- |
| Why selected | Minimal HTTP framework suitable for REST APIs and hackathon delivery. |
| Advantages | Simple middleware model, easy route organization, wide community support, easy Postman testing. |
| Alternatives considered | Fastify, NestJS, Koa. |
| Reason alternatives were not selected | Fastify is strong but less familiar; NestJS adds structure but more setup than needed for MVP. |

### TypeScript

| Item | Details |
| --- | --- |
| Why selected | Adds static typing to backend code and improves refactoring confidence. |
| Advantages | Better editor support, clearer service contracts, fewer runtime type mistakes, stronger Prisma integration. |
| Alternatives considered | JavaScript. |
| Reason alternatives were not selected | Plain JavaScript is faster initially but increases risk as workflows and models grow. |

## Database

### PostgreSQL

| Item | Details |
| --- | --- |
| Why selected | Asset lifecycle data is relational and benefits from transactions, foreign keys, and indexes. |
| Advantages | Strong consistency, mature SQL support, reliable transactions, robust indexing, managed hosting availability. |
| Alternatives considered | MySQL, SQLite, MongoDB. |
| Reason alternatives were not selected | SQLite is limited for team and production use; MongoDB is less suitable for relational lifecycle records; MySQL is viable but PostgreSQL offers stronger advanced features. |

## ORM

### Prisma ORM

| Item | Details |
| --- | --- |
| Why selected | Provides typed database access, schema definition, migrations, and a productive developer workflow. |
| Advantages | Type-safe queries, readable schema, migration tooling, Prisma Studio, strong TypeScript support. |
| Alternatives considered | TypeORM, Sequelize, Knex, raw SQL. |
| Reason alternatives were not selected | TypeORM and Sequelize have more runtime complexity; Knex and raw SQL require more manual type handling. |

## Authentication

### JWT

| Item | Details |
| --- | --- |
| Why selected | Stateless token authentication works well for REST APIs. |
| Advantages | Easy to send through headers, simple middleware verification, scalable without server session storage. |
| Alternatives considered | Server sessions, OAuth-only authentication. |
| Reason alternatives were not selected | Sessions require server-side state; OAuth is useful later but heavier for MVP. |

### bcrypt

| Item | Details |
| --- | --- |
| Why selected | Mature password hashing library designed for secure password storage. |
| Advantages | Salted hashes, configurable cost factor, widely reviewed, production-proven. |
| Alternatives considered | argon2, scrypt, PBKDF2. |
| Reason alternatives were not selected | argon2 is strong but bcrypt is familiar, available, and sufficient for MVP. |

## File Handling

### Multer

| Item | Details |
| --- | --- |
| Why selected | Standard middleware for multipart file upload handling in Express. |
| Advantages | Simple integration, file size validation support, local storage support, flexible filtering. |
| Alternatives considered | Busboy, formidable, direct cloud upload. |
| Reason alternatives were not selected | Multer provides the fastest path for backend-managed uploads during MVP. |

## QR Generation

### qrcode

| Item | Details |
| --- | --- |
| Why selected | Generates QR code data or images for asset identity workflows. |
| Advantages | Simple API, works in Node.js, supports asset lookup values, easy storage integration. |
| Alternatives considered | qr-image, external QR service. |
| Reason alternatives were not selected | Local generation avoids external dependency and keeps asset identity generation inside backend control. |

## Development Tools

| Tool | Why Selected | Advantages | Alternatives Considered |
| --- | --- | --- | --- |
| Git | Version control. | Branching, history, collaboration. | None. |
| GitHub | Remote collaboration. | Pull requests, reviews, issues, project tracking. | GitLab, Bitbucket. |
| Docker | Optional local services and deployment packaging. | Repeatable environments, PostgreSQL container support. | Native installs only. |
| Prisma Studio | Database inspection. | Easy local browsing and data verification. | pgAdmin, DBeaver. |
| Postman | API testing. | Collections, environments, request history. | Insomnia, curl. |
| VS Code | Developer editor. | TypeScript support, extensions, integrated terminal. | WebStorm, Vim, IntelliJ. |

## Summary Matrix

| Area | Selected Technology |
| --- | --- |
| Backend Runtime | Node.js |
| API Framework | Express.js |
| Language | TypeScript |
| Database | PostgreSQL |
| ORM | Prisma ORM |
| Authentication | JWT |
| Password Hashing | bcrypt |
| File Handling | Multer |
| QR Generation | qrcode |
| Tools | Git, GitHub, Docker, Prisma Studio, Postman, VS Code |

