# central-MCP

**A modern control plane for the Model Context Protocol.**

central-MCP is a self-hosted web dashboard that aggregates multiple MCP servers behind a single authenticated proxy. Connect your AI clients (VS Code, Claude Desktop, Cursor, …) to one endpoint and manage everything — endpoints, API keys, tenants, and tools — from a clean interface.

---

## Features

- **Multi-tenant workspaces** — isolate environments (dev, staging, prod) or teams with dedicated API keys
- **Endpoint management** — register and toggle upstream MCP servers (HTTP or stdio)
- **Real-time status monitoring** — live WebSocket updates on connection state and tool availability
- **API key management** — create, revoke and audit keys scoped to a tenant
- **Tool browser** — inspect every tool exposed by every connected server, with full JSON schema
- **MCP registry** — discover 25+ official and community servers and add them in one click
- **Integrated chat** — test your tools directly in the browser via a local Ollama model
- **Dark mode** — system-aware, toggle in settings
- **i18n ready** — internationalization infrastructure in place

---

## Architecture

```
 ┌─────────────────┐        Tenant API Key       ┌──────────────────┐
 │   AI Client     │ ──────────────────────────► │   central-MCP    │
 │  (VS Code, etc) │                             │   Proxy & Auth   │
 └─────────────────┘                             └────────┬─────────┘
                                                          │  Per-server credentials
                                          ┌───────────────┼───────────────┐
                                          ▼               ▼               ▼
                                    ┌──────────┐   ┌──────────┐   ┌──────────┐
                                    │ github   │   │ postgres │   │ memory   │
                                    │  server  │   │  server  │   │  server  │
                                    └──────────┘   └──────────┘   └──────────┘
```

Each **tenant** is an isolated workspace with its own API key and its own set of registered upstream servers. Your AI client connects once using the tenant API key; central-MCP handles routing and per-server authentication transparently.

---

## Tech stack

| Layer | Technology |
|---|---|
| Framework | Vue 3 (Composition API, `<script setup>`) |
| Language | TypeScript |
| Build tool | Vite |
| Styling | Tailwind CSS v4 |
| State | Pinia |
| Routing | Vue Router |
| Auth | Auth0 (OpenID Connect) |
| Real-time | Socket.IO |
| Markdown | Marked + DOMPurify |
| Chat backend | Ollama (local, direct) |
| i18n | vue-i18n |

---

## Prerequisites

- **Node.js** 18 or later
- **A running central-MCP backend** (the API server that this dashboard connects to)
- **An Auth0 account** with a configured Single Page Application
- **Ollama** (optional — only required for the integrated chat feature)

---

## Installation

```bash
# Clone the repository
git clone https://github.com/your-org/central-mcp-ui.git
cd central-mcp-ui

# Install dependencies
npm install
```

---

## Configuration

Copy the example environment file and fill in your values:

```bash
cp .env.example .env
```

| Variable | Description | Example |
|---|---|---|
| `VITE_API_BASE_URL` | URL of the central-MCP backend | `http://localhost:3000` |
| `VITE_AUTH0_DOMAIN` | Your Auth0 tenant domain | `your-tenant.eu.auth0.com` |
| `VITE_AUTH0_CLIENT_ID` | Auth0 application client ID | `O9Xy9uBX...` |
| `VITE_AUTH0_AUDIENCE` | Auth0 API audience | `https://your-tenant.auth0.com/api/v2/` |

> All variables are prefixed with `VITE_` and are embedded at build time by Vite.

---

## Development

```bash
npm run dev
```

The app will be available at `http://localhost:5173`.

---

## Production build

```bash
npm run build
```

Output is written to `dist/`. Serve it with any static file server (nginx, Caddy, Vercel, Cloudflare Pages, …).

```bash
# Preview the production build locally
npm run preview
```

---

## Project structure

```
src/
├── api/
│   ├── client.ts          # REST API client (setup + tenant API endpoints)
│   └── socket.ts          # Socket.IO connection helpers (dashboard & i18n)
├── composables/
│   ├── useDarkMode.ts     # Dark mode toggle (localStorage)
│   ├── useError.ts        # Error handling utilities
│   ├── useMarkdown.ts     # Markdown rendering
│   └── useOllama.ts       # Ollama streaming chat integration
├── components/
│   ├── layout/            # AppLayout, AppSidebar, AppHeader, TenantSwitcher
│   ├── ui/                # Design system: Button, Input, Modal, Toggle, Badge, …
│   ├── dashboard/         # ArchitectureDiagram, VscodeConfigButton
│   ├── chat/              # ChatSessionList, ChatMessage, ChatInput, ToolCallBlock
│   ├── endpoints/         # RegistryPickerModal
│   └── registry/          # ServerCard
├── data/
│   └── mcpRegistry.ts     # Curated list of 25+ MCP servers with metadata
├── i18n/
│   └── index.ts           # i18n initialisation
├── locales/
│   └── en.ts              # English strings
├── router/
│   └── index.ts           # Route definitions (auth guards)
├── stores/
│   ├── auth.ts            # Auth0 user session
│   ├── chat.ts            # Chat sessions (localStorage)
│   ├── chatSettings.ts    # Ollama config (localStorage)
│   ├── endpoints.ts       # MCP endpoint CRUD
│   ├── socket.ts          # WebSocket state
│   ├── status.ts          # Upstream connection status
│   ├── tenant.ts          # Tenants & API keys
│   ├── tools.ts           # Aggregated tool list
│   └── toast.ts           # Toast notification queue
├── types/
│   └── index.ts           # Shared TypeScript interfaces
└── views/
    ├── LandingView.vue    # Public login page
    ├── DashboardView.vue  # Overview & upstream status
    ├── EndpointsView.vue  # Manage upstream MCP servers
    ├── EndpointDetailView.vue
    ├── ChatView.vue       # Chat interface with tool calling
    ├── ToolsView.vue      # Browse aggregated tools
    ├── KeysView.vue       # API key management
    ├── TenantsView.vue    # Tenant management
    ├── RegistryView.vue   # MCP server registry browser
    └── SettingsView.vue   # User preferences
```

---

## Pages overview

| Page | Route | Description |
|---|---|---|
| Landing | `/` | Public sign-in page |
| Dashboard | `/dashboard` | Stats, architecture overview, upstream status table |
| Endpoints | `/endpoints` | Create, edit, enable/disable upstream MCP servers |
| Chat | `/chat` | Multi-session AI chat with tool calling via Ollama |
| Tools | `/tools` | Browse all tools exposed by connected servers |
| API Keys | `/keys` | Create and revoke tenant API keys |
| Tenants | `/tenants` | Create and switch between isolated workspaces |
| Registry | `/registry` | Discover and add community MCP servers |
| Settings | `/settings` | Dark mode, Ollama URL, model, system prompt |

---

## API integration

The frontend communicates with the backend over two channels:

**REST** — used for all CRUD operations. Two authentication modes:
- `Authorization: Bearer <auth0_token>` for setup/admin routes (`/setup/*`)
- `Authorization: Bearer <tenant_api_key>` for operational routes (`/api/*`)

**WebSocket** (Socket.IO `/dashboard` namespace) — real-time events:
- `tools_changed` — tool list updated across endpoints
- `connection_status` — upstream connection state changed
- `selectTenant` — switch active tenant

---

## Local chat with Ollama

The built-in chat connects directly to a local [Ollama](https://ollama.com) instance (no backend proxy). Configure the URL in **Settings** (default: `http://localhost:11434`). Any model pulled in Ollama will appear in the model selector.

Tool calls are forwarded through the backend API so Ollama can invoke any tool registered across your connected MCP servers.

---

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feat/my-feature`
3. Commit your changes: `git commit -m "feat: add my feature"`
4. Push and open a pull request

Please follow the existing code style — Vue 3 Composition API, TypeScript strict mode, Tailwind utility classes only.

---

## License

[MIT](LICENSE)

---

<p align="center">
  Built with Vue 3, Vite, and Tailwind CSS
</p>
