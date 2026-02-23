/**
 * English translations — single source of truth.
 *
 * Keys follow the pattern: `<namespace>.<IDENTIFIER>`
 * Error codes are in the `errors` namespace.
 */
export const en: Record<string, Record<string, string>> = {
  // ── Error codes (machine-readable → human-readable) ──────
  errors: {
    // Auth — Auth0 JWT
    ERR_AUTH_TOKEN_REQUIRED:
      "Authentication required. Please provide a valid access token.",
    ERR_AUTH_TOKEN_INVALID: "Invalid or expired access token.",
    ERR_AUTH_SUB_MISSING: "Access token is missing the subject claim.",

    // Auth — API key
    ERR_AUTH_KEY_REQUIRED:
      "API key required. Use the Authorization header, X-Api-Key header, or api_key query parameter.",
    ERR_AUTH_KEY_INVALID: "Invalid API key.",
    ERR_AUTH_ERROR: "An authentication error occurred.",

    // Authorization
    ERR_AUTH_FORBIDDEN: "You do not have permission to access this resource.",

    // Tenants
    ERR_TENANT_NAME_REQUIRED: "Tenant name is required.",
    ERR_TENANT_CREATE_FAILED: "Failed to create tenant. Please try again.",
    ERR_TENANT_NOT_SELECTED:
      "No tenant selected. Please select a tenant first.",

    // Endpoints
    ERR_ENDPOINT_FIELDS_REQUIRED:
      "Both 'name' and 'namespace' fields are required.",
    ERR_ENDPOINT_CREATE_FAILED: "Failed to add the MCP endpoint.",
    ERR_ENDPOINT_NOT_FOUND: "MCP endpoint not found.",

    // API keys
    ERR_KEY_NOT_FOUND: "API key not found.",

    // Users
    ERR_USER_NOT_FOUND: "User not found.",

    // Generic
    ERR_INTERNAL: "An unexpected error occurred. Please try again later.",
    ERR_UNKNOWN_CODE: "Unknown error.",
  },

  // ── Common UI strings ────────────────────────────────────
  common: {
    save: "Save",
    cancel: "Cancel",
    delete: "Delete",
    confirm: "Confirm",
    loading: "Loading…",
    success: "Operation completed successfully.",
    created: "Created successfully.",
    deleted: "Deleted successfully.",
    updated: "Updated successfully.",
  },

  // ── Tenants ──────────────────────────────────────────────
  tenants: {
    title: "Tenants",
    create: "Create Tenant",
    name_label: "Tenant Name",
    name_placeholder: "e.g. My Organization",
    empty_state: "No tenants yet. Create your first one to get started.",
    api_key_note: "Save this key! It will not be shown again.",
  },

  // ── Endpoints ────────────────────────────────────────────
  endpoints: {
    title: "MCP Endpoints",
    add: "Add Endpoint",
    name_label: "Name",
    namespace_label: "Namespace",
    transport_label: "Transport",
    url_label: "URL",
    command_label: "Command",
    args_label: "Arguments",
    env_label: "Environment Variables",
    headers_label: "Headers",
    "status.connected": "Connected",
    "status.connecting": "Connecting",
    "status.disconnected": "Disconnected",
    "status.error": "Error",
    empty_state: "No endpoints configured. Add your first MCP server.",
  },

  // ── API keys ─────────────────────────────────────────────
  keys: {
    title: "API Keys",
    create: "Create API Key",
    label_input: "Label (optional)",
    created_modal_title: "API Key Created",
    created_modal_body:
      "Copy and save this key now. It will not be shown again.",
    copy_button: "Copy to Clipboard",
    revoke_confirm: "Are you sure you want to revoke this API key?",
    empty_state: "No API keys. Create one to connect MCP clients.",
  },

  // ── Dashboard ────────────────────────────────────────────
  dashboard: {
    title: "Dashboard",
    total_tools: "Total Tools",
    connected_upstreams: "Connected Upstreams",
    tools_changed: "Tool list updated.",
    connection_changed: "Connection status changed.",
  },

  // ── User profile ─────────────────────────────────────────
  profile: {
    title: "Profile",
    email: "Email",
    name: "Name",
    role: "Role",
    created_at: "Member since",
  },
};
