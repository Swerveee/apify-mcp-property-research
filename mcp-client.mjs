#!/usr/bin/env node

/**
 * Minimal Streamable HTTP client used to verify the article's Apify MCP flow.
 *
 * Usage:
 *   APIFY_TOKEN=... node mcp-client.mjs tools/list
 *   APIFY_TOKEN=... node mcp-client.mjs tools/call '<tool-name>' '<json-arguments>'
 *
 * The script intentionally uses fetch instead of an MCP SDK so the HTTP
 * handshake and every tool call remain visible in the article's sample code.
 */

const serverUrl = process.env.APIFY_MCP_URL
  ?? 'https://mcp.apify.com?tools=Swerve/yad2-scraper,Swerve/nadlan-deals';
const token = process.env.APIFY_TOKEN;

if (!token) {
  console.error('Set APIFY_TOKEN before running this script.');
  process.exit(1);
}

let requestId = 0;
let sessionId;
let negotiatedProtocolVersion;

function parseResponse(contentType, body) {
  if (contentType.includes('application/json')) return JSON.parse(body);

  // Streamable HTTP servers may return one or more JSON-RPC messages as SSE.
  const events = body
    .split(/\r?\n\r?\n/)
    .flatMap((event) => event.split(/\r?\n/))
    .filter((line) => line.startsWith('data:'))
    .map((line) => line.slice(5).trim())
    .filter(Boolean)
    .map(JSON.parse);

  if (events.length === 0) {
    throw new Error(`MCP server returned no JSON-RPC event: ${body.slice(0, 300)}`);
  }
  return events.at(-1);
}

async function post(message) {
  const headers = {
    Accept: 'application/json, text/event-stream',
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
  if (sessionId) headers['MCP-Session-Id'] = sessionId;
  if (negotiatedProtocolVersion) {
    headers['MCP-Protocol-Version'] = negotiatedProtocolVersion;
  }

  const response = await fetch(serverUrl, {
    method: 'POST',
    headers,
    body: JSON.stringify(message),
  });

  sessionId ??= response.headers.get('mcp-session-id') ?? undefined;
  const body = await response.text();
  if (!response.ok) {
    throw new Error(`MCP HTTP ${response.status}: ${body.slice(0, 500)}`);
  }
  if (response.status === 202 || body.length === 0) return undefined;
  return parseResponse(response.headers.get('content-type') ?? '', body);
}

async function rpc(method, params = {}) {
  const response = await post({
    jsonrpc: '2.0',
    id: ++requestId,
    method,
    params,
  });
  if (response?.error) {
    throw new Error(`${response.error.code}: ${response.error.message}`);
  }
  return response?.result;
}

const initialization = await rpc('initialize', {
  protocolVersion: '2025-06-18',
  capabilities: {},
  clientInfo: { name: 'apify-content-program-demo', version: '1.0.0' },
});
negotiatedProtocolVersion = initialization.protocolVersion;
await post({ jsonrpc: '2.0', method: 'notifications/initialized' });

const [command = 'tools/list', toolName, rawArguments = '{}'] = process.argv.slice(2);
let result;

if (command === 'tools/list') {
  result = await rpc('tools/list');
} else if (command === 'tools/call') {
  if (!toolName) throw new Error('tools/call requires a tool name');
  result = await rpc('tools/call', {
    name: toolName,
    arguments: JSON.parse(rawArguments),
  });
} else {
  throw new Error(`Unsupported command: ${command}`);
}

console.log(JSON.stringify(result, null, 2));
