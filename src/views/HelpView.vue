<template>
    <AppLayout>
        <div class="help-view">
            <div class="help-hero">
                <h1 class="help-title flex items-center gap-2">
                    <CircleHelp :size="24" :stroke-width="2" />
                    Help &amp; Documentation
                </h1>
                <p class="help-subtitle">
                    Everything you need to know about setting up and using MCP Central.
                </p>
            </div>

            <div class="help-sections">
                <!-- Quick Start -->
                <details class="help-accordion" open>
                    <summary class="help-accordion-header">
                        <Play class="help-accordion-icon" :size="18" :stroke-width="2" />
                        <span>Quick Start</span>
                        <ChevronDown class="help-accordion-chevron" :size="16" :stroke-width="2" />
                    </summary>
                    <div class="help-accordion-body">
                        <ol class="help-steps">
                            <li>
                                <strong>Create a tenant</strong> — Go to <em>Settings → Tenants</em> and click <em>New
                                    tenant</em>.
                                A tenant is an isolated workspace; all endpoints, tools, and API keys belong to a single
                                tenant.
                            </li>
                            <li>
                                <strong>Select the tenant</strong> — Use the tenant switcher in the sidebar.
                                All subsequent operations run in the context of the active tenant.
                            </li>
                            <li>
                                <strong>Add an endpoint</strong> — Go to <em>Endpoints</em> and click <em>Add
                                    endpoint</em>.
                                Choose a transport type (Streamable HTTP, Studio, or Agent Tunnel) and fill in the
                                connection details.
                            </li>
                            <li>
                                <strong>Connect a local agent</strong> — If you chose <em>Agent Tunnel</em>, download
                                and run the
                                <code>mcp-central-agent</code> CLI. It will create a persistent tunnel and register
                                itself automatically.
                            </li>
                            <li>
                                <strong>Start chatting</strong> — Open the <em>Chat</em> view, configure a model, and
                                use
                                <code>@toolname</code> to invoke an MCP tool directly, or let the AI decide.
                            </li>
                        </ol>
                    </div>
                </details>

                <!-- Endpoints & Tools -->
                <details class="help-accordion">
                    <summary class="help-accordion-header">
                        <Briefcase class="help-accordion-icon" :size="18" :stroke-width="2" />
                        <span>Endpoints &amp; Tools</span>
                        <ChevronDown class="help-accordion-chevron" :size="16" :stroke-width="2" />
                    </summary>
                    <div class="help-accordion-body">
                        <h3>Transport types</h3>
                        <table class="help-table">
                            <thead>
                                <tr>
                                    <th>Type</th>
                                    <th>Description</th>
                                    <th>Use when…</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td><code>streamable-http</code></td>
                                    <td>HTTP + SSE to a remote MCP server</td>
                                    <td>Server is reachable over the internet / LAN</td>
                                </tr>
                                <tr>
                                    <td><code>stdio</code></td>
                                    <td>Spawns a local process via stdin/stdout</td>
                                    <td>Server is a CLI tool that runs on the same machine as the agent</td>
                                </tr>
                                <tr>
                                    <td><code>agent-tunnel</code></td>
                                    <td>Reverse WebSocket tunnel via <code>mcp-central-agent</code></td>
                                    <td>Server is behind a firewall / NAT</td>
                                </tr>
                            </tbody>
                        </table>

                        <h3>Namespaces</h3>
                        <p>
                            Every tool is exposed as <code>&lt;namespace&gt;__&lt;tool_name&gt;</code> to downstream MCP
                            clients.
                            The namespace defaults to the endpoint name (lowercased, spaces replaced by underscores).
                            You can override it in the endpoint settings. Namespaces must be unique within a tenant.
                        </p>

                        <h3>Disabling tools</h3>
                        <p>
                            Individual tools can be toggled on/off from the endpoint detail page.
                            Disabled tools are hidden from connected MCP clients and cannot be called.
                            The setting is persisted in the database and survives server restarts.
                        </p>
                    </div>
                </details>

                <!-- Chat & AI modes -->
                <details class="help-accordion">
                    <summary class="help-accordion-header">
                        <MessageSquare class="help-accordion-icon" :size="18" :stroke-width="2" />
                        <span>Chat &amp; AI Modes</span>
                        <ChevronDown class="help-accordion-chevron" :size="16" :stroke-width="2" />
                    </summary>
                    <div class="help-accordion-body">
                        <table class="help-table">
                            <thead>
                                <tr>
                                    <th>Mode</th>
                                    <th>Behaviour</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td><strong>Standard</strong></td>
                                    <td>Single round-trip request/response. Tools can be called once per message.</td>
                                </tr>
                                <tr>
                                    <td><strong>Plan</strong></td>
                                    <td>
                                        The model first emits a reasoning/planning block (displayed as a collapsible
                                        <em>Thinking</em>
                                        panel), then produces a final answer. Requires a model that supports extended
                                        thinking
                                        (e.g., Claude 3.5+ or compatible Ollama model).
                                    </td>
                                </tr>
                                <tr>
                                    <td><strong>Agent</strong></td>
                                    <td>
                                        Agentic loop — the model can call tools multiple times in sequence until it
                                        decides
                                        the task is complete. Each iteration is shown as a collapsible step.
                                    </td>
                                </tr>
                            </tbody>
                        </table>

                        <h3>Model configuration</h3>
                        <p>
                            Models are configured per-conversation via the model picker in the chat toolbar.
                            The base URL, API key, and model name are stored per tenant. For Ollama, set the
                            base URL to your Ollama instance (e.g., <code>http://localhost:11434</code>) and
                            leave the API key blank.
                        </p>
                    </div>
                </details>

                <!-- API Keys & A2A -->
                <details class="help-accordion">
                    <summary class="help-accordion-header">
                        <KeyRound class="help-accordion-icon" :size="18" :stroke-width="2" />
                        <span>API Keys &amp; A2A</span>
                        <ChevronDown class="help-accordion-chevron" :size="16" :stroke-width="2" />
                    </summary>
                    <div class="help-accordion-body">
                        <h3>API Keys</h3>
                        <p>
                            API keys grant bearer-token access to the MCP Central API.
                            Keys are scoped to a single tenant and cannot cross tenant boundaries.
                            Go to <em>Settings → API Keys</em> to create or revoke keys.
                        </p>
                        <p>
                            Pass the key in the <code>Authorization</code> header:
                        </p>
                        <pre class="help-code">Authorization: Bearer &lt;your-api-key&gt;</pre>

                        <h3>A2A (Agent-to-Agent)</h3>
                        <p>
                            MCP Central implements the <strong>A2A protocol</strong>, allowing external AI agents to
                            discover
                            and call tools through a standardised interface. The agent card is available at:
                        </p>
                        <pre class="help-code">GET /.well-known/agent.json</pre>
                        <p>
                            The A2A endpoint accepts task requests at:
                        </p>
                        <pre class="help-code">POST /api/a2a</pre>
                        <p>
                            Authentication uses the same API key scheme. Include the key in the
                            <code>Authorization</code> header of every A2A request.
                        </p>
                    </div>
                </details>

                <!-- External links -->
                <details class="help-accordion">
                    <summary class="help-accordion-header">
                        <Link class="help-accordion-icon" :size="18" :stroke-width="2" />
                        <span>External Links</span>
                        <ChevronDown class="help-accordion-chevron" :size="16" :stroke-width="2" />
                    </summary>
                    <div class="help-accordion-body">
                        <ul class="help-links">
                            <li>
                                <a href="https://modelcontextprotocol.io" target="_blank" rel="noopener">
                                    MCP Specification
                                </a>
                                — Official Model Context Protocol specification
                            </li>
                            <li>
                                <a href="https://a2a-protocol.org/latest/" target="_blank" rel="noopener">
                                    A2A Protocol
                                </a>
                                — Agent-to-agent communication standard
                            </li>
                            <li>
                                <a href="/api/docs" target="_blank" rel="noopener">
                                    REST API Docs (Swagger)
                                </a>
                                — Interactive documentation for all HTTP endpoints
                            </li>
                        </ul>
                    </div>
                </details>
            </div>
        </div>
    </AppLayout>
</template>

<script setup lang="ts">
    import AppLayout from "@/components/layout/AppLayout.vue";
    import { Play, Briefcase, MessageSquare, KeyRound, Link, ChevronDown, CircleHelp } from 'lucide-vue-next';
</script>

<style scoped>
    .help-view {
        max-width: 800px;
        margin: 0 auto;
        padding: 32px 24px 64px;
    }

    .help-hero {
        margin-bottom: 32px;
    }

    .help-title {
        font-size: 1.75rem;
        font-weight: 700;
        color: var(--text-primary);
        margin: 0 0 8px;
    }

    .help-subtitle {
        font-size: 1rem;
        color: var(--text-secondary);
        margin: 0;
    }

    .help-sections {
        display: flex;
        flex-direction: column;
        gap: 8px;
    }

    /* Accordion */
    .help-accordion {
        border: 1px solid var(--border-default);
        border-radius: 8px;
        overflow: hidden;
    }

    .help-accordion-header {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 14px 16px;
        cursor: pointer;
        user-select: none;
        font-size: 0.95rem;
        font-weight: 600;
        color: var(--text-primary);
        background: var(--bg-secondary);
        list-style: none;
    }

    .help-accordion-header::-webkit-details-marker {
        display: none;
    }

    .help-accordion-icon {
        width: 18px;
        height: 18px;
        flex-shrink: 0;
        color: var(--text-accent, var(--text-secondary));
    }

    .help-accordion-header>span {
        flex: 1;
    }

    .help-accordion-chevron {
        width: 16px;
        height: 16px;
        flex-shrink: 0;
        color: var(--text-secondary);
        transition: transform 0.2s ease;
    }

    .help-accordion[open] .help-accordion-chevron {
        transform: rotate(180deg);
    }

    .help-accordion-body {
        padding: 20px;
        font-size: 0.9rem;
        color: var(--text-primary);
        line-height: 1.65;
        border-top: 1px solid var(--border-default);
    }

    .help-accordion-body h3 {
        font-size: 0.9rem;
        font-weight: 600;
        margin: 20px 0 8px;
        color: var(--text-primary);
    }

    .help-accordion-body h3:first-child {
        margin-top: 0;
    }

    .help-accordion-body p {
        margin: 0 0 10px;
    }

    /* Steps list */
    .help-steps {
        margin: 0;
        padding-left: 20px;
        display: flex;
        flex-direction: column;
        gap: 10px;
    }

    .help-steps li {
        line-height: 1.6;
    }

    /* Table */
    .help-table {
        width: 100%;
        border-collapse: collapse;
        margin: 8px 0;
        font-size: 0.875rem;
    }

    .help-table th,
    .help-table td {
        text-align: left;
        padding: 8px 10px;
        border-bottom: 1px solid var(--border-default);
        vertical-align: top;
    }

    .help-table th {
        font-weight: 600;
        color: var(--text-secondary);
        font-size: 0.8rem;
        text-transform: uppercase;
        letter-spacing: 0.04em;
    }

    .help-table tbody tr:last-child td {
        border-bottom: none;
    }

    /* Code blocks */
    code {
        font-family: ui-monospace, "Cascadia Code", Menlo, monospace;
        font-size: 0.85em;
        background: var(--bg-tertiary, rgba(128, 128, 128, 0.12));
        padding: 1px 5px;
        border-radius: 4px;
    }

    .help-code {
        font-family: ui-monospace, "Cascadia Code", Menlo, monospace;
        font-size: 0.85rem;
        background: var(--bg-tertiary, rgba(128, 128, 128, 0.12));
        border: 1px solid var(--border-default);
        border-radius: 6px;
        padding: 10px 14px;
        margin: 8px 0;
        overflow-x: auto;
        white-space: pre;
    }

    /* Links list */
    .help-links {
        margin: 0;
        padding-left: 20px;
        display: flex;
        flex-direction: column;
        gap: 8px;
    }

    .help-links a {
        color: var(--text-accent, #3b82f6);
        text-decoration: none;
        font-weight: 500;
    }

    .help-links a:hover {
        text-decoration: underline;
    }
</style>
