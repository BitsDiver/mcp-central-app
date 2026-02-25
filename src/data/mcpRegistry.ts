/**
 * Type definitions for the MCP server registry.
 *
 * The actual registry data is served by the backend at GET /registry/servers.
 * Use the `useRegistry()` composable to access it from any component.
 */

export interface RegistryEnvVar {
  key: string;
  description: string;
  required: boolean;
  placeholder?: string;
}

export interface RegistryServer {
  id: string;
  name: string;
  description: string;
  category: string;
  transport: "streamable-http" | "stdio" | "sse";
  command?: string;
  args?: string[];
  envVars?: RegistryEnvVar[];
  url?: string;
  namespace: string;
  color: string;
  iconLetters: string;
  githubUrl?: string;
  tags?: string[];
  official?: boolean;
}
