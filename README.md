<div align="center">

# 🖥️ MCP Central App

**Frontend SPA for [MCP Central](https://github.com/your-org/mcp-central)** — manage your MCP proxy, endpoints, API keys, and chat with any LLM from your browser.

[![Vue 3](https://img.shields.io/badge/Vue-3.x-42b883?logo=vue.js&logoColor=white)](https://vuejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-5.x-646cff?logo=vite&logoColor=white)](https://vitejs.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-v4-38bdf8?logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![Auth0](https://img.shields.io/badge/Auth0-OpenID_Connect-EB5424?logo=auth0&logoColor=white)](https://auth0.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

</div>

---

## ✨ Features

- 🏢 **Multi-tenant workspaces** — isolate environments or teams with dedicated API keys
- 🔌 **Endpoint management** — register and toggle upstream MCP servers (HTTP or stdio)
- 📊 **Real-time monitoring** — live connection status and tool availability via Socket.IO
- 🔑 **API key management** — create, revoke and audit keys scoped to a tenant
- 🔍 **Tool browser** — inspect every tool exposed by every connected server with full JSON schema
- 📋 **MCP registry** — discover curated MCP servers and add them in one click
- 🤖 **Integrated chat** — multi-provider LLM chat (Ollama, OpenAI, Anthropic, Gemini) with server-side MCP tool execution
- 🌙 **Dark mode** — system-aware, toggle in settings
- 🌐 **i18n ready** — full internationalization infrastructure (English by default)
- 👑 **Admin panel** — user management and role assignment (admin only)
- 🤝 **A2A panel** — copyable URLs to expose tenant tools to external agents via [A2A v1.0](https://google.github.io/A2A/)

---

## 🛠️ Tech Stack

| Layer      | Technology                                 |
| :--------- | :----------------------------------------- |
| Framework  | Vue 3 (Composition API, `<script setup>`)  |
| Language   | TypeScript 5.x (strict mode, ESM)          |
| Build tool | Vite 5.x                                   |
| Styling    | Tailwind CSS v4 (`@tailwindcss/vite`)      |
| State      | Pinia                                      |
| Routing    | Vue Router 4                               |
| Auth       | Auth0 (`@auth0/auth0-vue`, OpenID Connect) |
| Real-time  | Socket.IO client (multiple namespaces)     |
| Markdown   | Marked + DOMPurify + highlight.js          |
| i18n       | vue-i18n                                   |
| Utilities  | VueUse                                     |

---

## 🚀 Quick Start

### Prerequisites

- **pnpm** (package manager used in this project)
- **A running mcp-central backend** instance
- **An Auth0 Single Page Application** configured

### Installation

```bash
# Install dependencies
pnpm install

# Copy and fill in configuration
cp .env.example .env

# Start the dev server
pnpm dev
```

The app is available at `http://localhost:5173`.

---

## ⚙️ Configuration

All variables are prefixed `VITE_` and embedded at build time by Vite.

| Variable               | Description                    | Example                               |
| :--------------------- | :----------------------------- | :------------------------------------ |
| `VITE_API_BASE_URL`    | URL of the mcp-central backend | `http://localhost:3000`               |
| `VITE_AUTH0_DOMAIN`    | Auth0 tenant domain            | `dev-xxxxxxxx.eu.auth0.com`           |
| `VITE_AUTH0_CLIENT_ID` | Auth0 application client ID    | `O9Xy9uBX...`                         |
| `VITE_AUTH0_AUDIENCE`  | Auth0 API audience identifier  | `https://mcp-central.example.com/api` |

---

## 🏗️ Production Build

```bash
pnpm build
```

Output is written to `dist/`. The CI workflow packages it as `dist.tar.gz` and
publishes a rolling GitHub Release (`frontend-latest`). The `mcp-central` backend
CI pulls this artifact and embeds it in the Docker image.

```bash
# Preview the production build locally
pnpm preview
```

---

## 📁 Project Structure

```
src/
├── main.ts                  # App entry point (Auth0, Pinia, Router, i18n)
├── App.vue                  # Root component + socket initialisation
├── api/
│   ├── client.ts            # REST client (/setup/* Auth0 routes)
│   ├── socket.ts            # Socket.IO factory (all namespaces)
│   └── mcpClient.ts         # Streamable HTTP MCP client (Ollama tool calls)
├── composables/
│   ├── useChat.ts           # Unified chat dispatcher (Ollama ↔ backend)
│   ├── useChatMcpKey.ts     # Tenant API key resolver for MCP tool calls
│   ├── useDarkMode.ts       # Dark mode toggle (localStorage)
│   ├── useError.ts          # Error handling utilities
│   ├── useMarkdown.ts       # Markdown rendering (Marked + DOMPurify)
│   ├── useOllama.ts         # Ollama direct streaming integration
│   └── useRegistry.ts       # MCP registry helpers
├── components/
│   ├── layout/              # AppLayout, AppSidebar, AppHeader, TenantSwitcher,
│   │                        # MobileMenuButton
│   ├── ui/                  # Design system: AppButton, AppInput, AppModal,
│   │                        # AppSelect, AppTextarea, AppToggle, AppBadge,
│   │                        # AppAlert, AppSpinner, AppToast, ConfirmDialog,
   │                        # EmptyState, SkeletonBlock, StatusBadge, CopyField
│   ├── chat/                # ChatSessionList, ChatMessage, ChatInput,
│   │                        # ToolCallBlock, ThinkingBlock
│   ├── dashboard/           # ArchitectureDiagram, VscodeConfigButton
│   ├── endpoints/           # RegistryPickerModal
│   ├── registry/            # ServerCard
│   └── settings/            # SettingsProfile, SettingsTenants, SettingsKeys,
   │                        # SettingsAI, SettingsUsers, SettingsA2A
├── stores/
│   ├── auth.ts              # Auth0 user session + token
│   ├── chat.ts              # Chat sessions (persisted in localStorage)
│   ├── chatSettings.ts      # Provider, model, system prompt (localStorage)
│   ├── endpoints.ts         # MCP endpoint CRUD via Socket.IO
│   ├── socket.ts            # Socket.IO connection state
│   ├── status.ts            # Upstream connection status
│   ├── tenant.ts            # Tenants + active tenant session
│   ├── toast.ts             # Toast notification queue
│   ├── tools.ts             # Aggregated tool list
│   ├── users.ts             # Admin — user list + role management
│   └── aiKeys.ts            # Per-user LLM provider key management
├── data/
│   └── mcpRegistry.ts       # Local fallback MCP server catalog
├── i18n/
│   └── index.ts             # vue-i18n initialisation
├── locales/
│   └── en.ts                # English strings
├── router/
│   └── index.ts             # Route definitions + auth guards
├── types/
│   └── index.ts             # Shared TypeScript interfaces
└── views/
    ├── LandingView.vue       # Public sign-in page
    ├── DashboardView.vue     # Stats, upstream status, VS Code config snippet
    ├── EndpointsView.vue     # Create, edit, enable/disable MCP endpoints
    ├── EndpointDetailView.vue# Tools & details for a single endpoint
    ├── ToolsView.vue         # Browse all aggregated tools
    ├── ChatView.vue          # Multi-session LLM chat with tool calling
    ├── RegistryView.vue      # Discover & add community MCP servers
    └── SettingsView.vue      # Tabbed settings (Profile/Tenants/Keys/AI/Users)
```

---

## 🗺️ Pages

| Route            | View                 | Auth | Description                                             |
| :--------------- | :------------------- | :--: | :------------------------------------------------------ |
| `/`              | `LandingView`        |  No  | Sign-in page with Auth0 login button                    |
| `/dashboard`     | `DashboardView`      | Yes  | Overview, upstream status, VS Code config snippet       |
| `/endpoints`     | `EndpointsView`      | Yes  | List, create, toggle, delete MCP endpoints              |
| `/endpoints/:id` | `EndpointDetailView` | Yes  | Tools & connection details for one endpoint             |
| `/tools`         | `ToolsView`          | Yes  | Browse all tools across all endpoints                   |
| `/chat`          | `ChatView`           | Yes  | Multi-session LLM chat with MCP tool calling            |
| `/registry`      | `RegistryView`       | Yes  | Discover curated MCP servers, add in one click          |
| `/settings`      | `SettingsView`       | Yes  | Profile / Tenants / API Keys / AI / A2A / Users (admin) |

---

## 🔌 Backend Communication

### REST (Auth0 JWT)

Used only for the `/setup/*` routes on the backend (tenant creation, user profile).

```
Authorization: Bearer <auth0_access_token>
```

### Socket.IO (multiple namespaces)

All management operations go through dedicated namespaces. The Auth0 access token
is passed on handshake via `auth: { token }`:

| Namespace    | Store(s)                 | Description                           |
| :----------- | :----------------------- | :------------------------------------ |
| `/tenants`   | `tenant`                 | Tenant selection, list, delete        |
| `/endpoints` | `endpoints`, `status`    | Endpoint CRUD + push status events    |
| `/tools`     | `tools`                  | Tool list queries + `tools_changed`   |
| `/keys`      | `tenant`                 | API key CRUD                          |
| `/chat`      | `chatSettings`, `aiKeys` | Streaming LLM generation + key mgmt   |
| `/users`     | `users`                  | Admin — user list + role management   |
| `/i18n`      | _(global)_               | Error code & key translation (public) |

### MCP Streamable HTTP (`mcpClient.ts`)

Used by the Ollama chat path for executing tool calls directly against the backend
MCP proxy (`/mcp`). Maintains a long-lived session per tenant API key.

---

## 🤖 Chat

The chat feature supports two execution modes selected in **Settings → AI Settings**:

| Provider      | Execution | Tool calls                               | Key storage                |
| :------------ | :-------- | :--------------------------------------- | :------------------------- |
| **Ollama**    | Browser   | Via `mcpClient.ts` (MCP Streamable HTTP) | Ollama URL in localStorage |
| **OpenAI**    | Backend   | Via `McpProxyManager`                    | AES-256-GCM on backend     |
| **Anthropic** | Backend   | Via `McpProxyManager`                    | AES-256-GCM on backend     |
| **Gemini**    | Backend   | Via `McpProxyManager`                    | AES-256-GCM on backend     |

For OpenAI/Anthropic/Gemini the generation loop runs entirely on the backend
(`/chat` Socket.IO namespace). Tokens stream to the client via `chat:token` events.
Anthropic extended thinking is rendered via `ThinkingBlock.vue`.

Chat sessions (messages, titles) are persisted in `localStorage`.

---

## 🤝 A2A Integration

The **Settings → A2A** tab exposes the URLs needed for external agents to consume tenant tools via the [A2A v1.0](https://google.github.io/A2A/) protocol:

| URL                                     | Auth    | Description                    |
| :-------------------------------------- | :------ | :----------------------------- |
| `{base}/.well-known/agent-card.json`    | None    | Public capabilities card       |
| `{base}/a2a/extendedAgentCard?apiKey=…` | API key | Full skill list for the tenant |
| `{base}/a2a/message:send`               | API key | Blocking tool invocation       |
| `{base}/a2a/message:stream`             | API key | SSE-streamed tool invocation   |

All URLs are one-click copyable via the `CopyField` component: the clipboard icon transitions to a green ✓ with an animated "Copied!" tooltip.

A2A agents can also be registered as **upstream endpoint sources**: in the Add/Edit Endpoint form, select transport **A2A Agent (HTTP+JSON)**, provide the agent base URL and an optional API key (forwarded as `X-API-Key`).

---

## 🌐 i18n

All user-facing strings live in `src/locales/en.ts`. The `/i18n` Socket.IO
namespace provides server-side translation of backend error codes at runtime.

---

## 🚢 CI / Releases

The GitHub Actions workflow (`.github/workflows/release.yml`) runs on every push
to `main`:

1. Installs dependencies with `pnpm`.
2. Builds the Vite app (`pnpm run build`).
3. Packages `dist/` as `dist.tar.gz`.
4. Publishes it as a rolling GitHub Release tagged `frontend-latest`.

The `mcp-central` backend CI pulls this artifact and embeds it in the Docker image.

---

## 📄 License

MIT
