# Locker

Open-source file storage and knowledge platform. A self-hostable alternative to Dropbox and Google Drive — with built-in search, document transcription, and an AI-powered knowledge base.

## Features

- **File Explorer** — Upload, organize, rename, move, and delete files and folders with grid and list views
- **File Previews** — In-app viewers for PDFs, images, Markdown, CSV, audio, video, and plain text
- **Tags** — Organize files with color-coded, workspace-scoped tags and filter by them
- **Share Links** — Generate shareable links with optional password protection, expiration, and download limits
- **Upload Links** — Let others upload files to your storage without an account
- **Command Palette** — Cmd+K search across file names and content with keyboard navigation
- **Knowledge Base** — AI-powered wiki that ingests tagged documents, supports chat, and visualizes page relationships in an interactive graph view
- **Plugins** — Extensible plugin system with built-in plugins for search (QMD, FTS), document transcription, Google Drive sync, and knowledge base
- **Document Transcription** — AI-powered OCR/transcription for images and PDFs, making non-text files searchable
- **Notifications** — In-app notifications for workspace invites and announcements
- **Workspace Invites** — Invite users via email with token-based onboarding flow
- **Storage Provider Agnostic** — Swap between Local, AWS S3, Cloudflare R2, or Vercel Blob via a single env var
- **Storage Quotas** — Per-user storage limits with usage tracking
- **Virtual Bash Filesystem** — Traverse workspace files with `ls`, `cd`, `find`, `cat`, `grep`, etc. via `just-bash`

## Tech Stack

- **Framework**: Next.js 16 (App Router, Turbopack)
- **Monorepo**: Turborepo + pnpm workspaces
- **Database**: PostgreSQL 16 + Drizzle ORM
- **API**: tRPC 11 (end-to-end type safety)
- **Auth**: BetterAuth (email/password, Google OAuth)
- **AI**: Vercel AI SDK for transcription and knowledge base chat
- **UI**: Tailwind CSS 4, Radix UI, Geist fonts, Lucide icons
- **Email**: Resend
- **Testing**: Playwright (E2E)
- **Language**: TypeScript (strict mode)

## Project Structure

```
locker/
├── apps/web/              Next.js web app
│   ├── app/               Pages and API routes
│   ├── components/        Shared UI components
│   ├── features/          Feature modules (files, knowledge-bases)
│   ├── server/            tRPC routers, auth, and plugin system
│   └── lib/               Utilities
├── packages/
│   ├── common/            Shared types, validation, constants
│   ├── database/          Drizzle schema and database client
│   ├── email/             Email templates and sending (Resend)
│   └── storage/           Storage provider adapters
├── services/
│   ├── fts/               Full-text search microservice (SQLite FTS5)
│   └── qmd/              Semantic search microservice
├── e2e/                   Playwright end-to-end tests
├── docker-compose.yml     PostgreSQL + optional search services
└── turbo.json             Build pipeline
```

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) 20+
- [pnpm](https://pnpm.io/) 9+
- [Docker](https://www.docker.com/) (for PostgreSQL)

### 1. Install dependencies

```bash
pnpm install
```

### 2. Start PostgreSQL

```bash
docker compose up -d
```

### 3. Configure environment

```bash
cp .env.example .env
```

The defaults work out of the box for local development. Edit `.env` to change the storage provider or add OAuth credentials.

### 4. Run database migrations

```bash
pnpm db:generate
pnpm db:migrate
```

### 5. Start the dev server

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000), create an account, and start uploading files.

## Storage Providers

Set `BLOB_STORAGE_PROVIDER` in `.env`:

| Provider         | Value    | Required Env Vars                                                        |
| ---------------- | -------- | ------------------------------------------------------------------------ |
| Local filesystem | `local`  | `LOCAL_BLOB_DIR`                                                         |
| AWS S3           | `s3`     | `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_REGION`, `S3_BUCKET`  |
| Cloudflare R2    | `r2`     | `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET` |
| Vercel Blob      | `vercel` | `BLOB_READ_WRITE_TOKEN`                                                  |

## Plugins

Locker ships with a built-in plugin system. Plugins are installed per-workspace and can add search, transcription, file actions, and more.

| Plugin                  | Description                                                                 |
| ----------------------- | --------------------------------------------------------------------------- |
| **QMD Search**          | Semantic document search powered by QMD embeddings                          |
| **Full-Text Search**    | Lightweight SQLite FTS5 search — no external service required               |
| **Document Transcription** | AI-powered OCR for images and PDFs, making non-text files searchable     |
| **Google Drive Sync**   | Import files from and export files to Google Drive                          |
| **Knowledge Base**      | Build an AI-powered wiki from tagged documents with chat and graph view     |

### Optional search services

QMD and FTS run as standalone microservices. Enable them with the `search` Docker Compose profile:

```bash
docker compose --profile search up -d
```

## Scripts

| Command            | Description                      |
| ------------------ | -------------------------------- |
| `pnpm dev`         | Start all packages in dev mode   |
| `pnpm build`       | Production build                 |
| `pnpm typecheck`   | Type-check all packages          |
| `pnpm lint`        | Lint all packages                |
| `pnpm db:generate` | Generate a new Drizzle migration |
| `pnpm db:migrate`  | Apply pending migrations         |
| `pnpm db:seed`     | Seed the database                |
| `pnpm format`      | Format code with Prettier        |

## Virtual Filesystem Shell API

Locker includes a read-only virtual filesystem over workspace files/folders, powered by [`just-bash`](https://github.com/vercel-labs/just-bash).

The shell API is available on tRPC router `vfsShell`:

- `vfsShell.createSession({ cwd? })` → create a workspace-scoped shell session
- `vfsShell.exec({ sessionId, command, timeoutMs? })` → run a bash command
- `vfsShell.session({ sessionId })` → get session `cwd` + expiry
- `vfsShell.closeSession({ sessionId })` → close a session

Implementation details:

- Directory tree is bootstrapped from `folders` + `files` and cached in memory.
- File contents are fetched lazily from the configured storage provider and cached.
- All write operations (`rm`, `mv`, redirections, etc.) fail with `EROFS` (read-only filesystem).
- Access is workspace-scoped and enforced by existing workspace membership checks.

## License

MIT
