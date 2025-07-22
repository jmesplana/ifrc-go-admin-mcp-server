# Model Context Protocol

[Model Context Protocol](https://modelcontextprotocol.io/) (MCP) is a standard interface that lets large language models (LLMs) communicate with external tools and data sources. It allows developers and tool providers to integrate once and interoperate with any MCP-compatible system.

*   [Get started with using MCP on Vercel](#get-started-with-mcp)
*   [Efficient MCP server](#deploy-mcp-servers-efficiently-on-vercel) deployment on Vercel

## [Connecting LLMs to external systems](#connecting-llms-to-external-systems)

LLMs don't have access to real-time or external data by default. To provide relevant context—such as current financial data, pricing, or user-specific data—developers must connect LLMs to external systems.

Each tool or service has its own API, schema, and authentication. Managing these differences becomes difficult and error-prone as the number of integrations grows.

## [Standardizing LLM interaction with MCP](#standardizing-llm-interaction-with-mcp)

MCP standardizes the way LLMs interact with tools and data sources. Developers implement a single integration with MCP, and use it to manage communication with any compatible service.

Tool and data providers only need to expose an MCP interface once. After that, their system can be accessed by any MCP-enabled application.

MCP is like the USB-C standard: instead of needing different connectors for every device, you use one port to handle many types of connections.

## [MCP servers, hosts and clients](#mcp-servers-hosts-and-clients)

MCP uses a client-server architecture for the AI model to external system communication. The user connects to the AI application, referred to as the MCP host, such as IDEs like Cursor, AI chat apps like ChatGPT or AI agents. To connect to external services, the host creates one connection, referred to as the MCP client, to one external service, referred to as the MCP server. Therefore, to connect to multiple MCP servers, one host needs to open and manage multiple MCP clients.

## [Get started with MCP](#get-started-with-mcp)

You can deploy your first MCP server to Vercel with a single file. Then, you can connect to the server through popular MCP hosts like Claude or Cursor.

### [Deploy an MCP server on Vercel](#deploy-an-mcp-server-on-vercel)

Use the `mcp-handler` package and create the following API route to host an MCP server that provides a single tool that rolls a dice.

```
import { z } from 'zod';
import { createMcpHandler } from 'mcp-handler';
 
const handler = createMcpHandler(
  (server) => {
    server.tool(
      'roll_dice',
      'Rolls an N-sided die',
      { sides: z.number().int().min(2) },
      async ({ sides }) => {
        const value = 1 + Math.floor(Math.random() * sides);
        return {
          content: [{ type: 'text', text: `🎲 You rolled a ${value}!` }],
        };
      },
    );
  },
  {},
  { basePath: '/api' },
);
 
export { handler as GET, handler as POST, handler as DELETE };
```

#### [Test the MCP server locally](#test-the-mcp-server-locally)

This assumes that your MCP server application, with the above-mentioned API route, runs locally at `http://localhost:3000`.

1.  Run the MCP inspector:

```
npx @modelcontextprotocol/inspector@latest http://localhost:3000
```

2.  Open the inspector interface:
    *   Browse to `http://127.0.0.1:6274` where the inspector runs by default
3.  Connect to your MCP server:
    *   Select Streamable HTTP in the drop-down on the left
    *   In the URL field, use `http://localhost:3000/api/mcp`
    *   Expand Configuration
    *   In the Proxy Session Token field, paste the token from the terminal where your MCP server is running
    *   Click Connect
4.  Test the tools:
    *   Click List Tools under Tools
    *   Click on the `roll_dice` tool
    *   Test it through the available options on the right of the tools section

When you deploy your application on Vercel, you will get a URL such as `https://my-mcp-server.vercel.app`.

### [Configure an MCP host](#configure-an-mcp-host)

Using [Cursor](https://www.cursor.com/), add the URL of your MCP server to the [configuration file](https://docs.cursor.com/context/model-context-protocol#configuring-mcp-servers) in [Streamable HTTP transport format](https://modelcontextprotocol.io/docs/concepts/transports#streamable-http).

```
{
  "mcpServers": {
    "server-name": {
      "url": "https://my-mcp-server.vercel.app/api/mcp"
    }
  }
}
```

You can now use your MCP roll dice tool in [Cursor's AI chat](https://docs.cursor.com/context/model-context-protocol#using-mcp-in-chat) or any other MCP client.

## [Enabling authorization](#enabling-authorization)

The `mcp-handler` provides built-in OAuth support to secure your MCP server. This ensures that only authorized clients with valid tokens can access your tools.

### [Secure your server with OAuth](#secure-your-server-with-oauth)

To add OAuth authorization to your MCP server:

1.  Use the `withMcpAuth` function to wrap your MCP handler
2.  Implement token verification logic
3.  Configure required scopes and metadata path

```
import { createMcpHandler, withMcpAuth } from 'mcp-handler';
import { z } from 'zod';
import { AuthInfo } from '@modelcontextprotocol/sdk/server/auth/types.js';
 
const handler = createMcpHandler(
  (server) => {
    server.tool(
      'roll_dice',
      'Rolls an N-sided die',
      { sides: z.number().int().min(2) },
      async ({ sides }) => {
        const value = 1 + Math.floor(Math.random() * sides);
        return {
          content: [{ type: 'text', text: `🎲 You rolled a ${value}!` }],
        };
      },
    );
  },
  {},
  {},
);
 
const verifyToken = async (
  req: Request,
  bearerToken?: string,
): Promise<AuthInfo | undefined> => {
  if (!bearerToken) return undefined;
 
  // Add your token verification logic here
  // For example, verify JWT signature, check expiration, etc.
  const isValid = bearerToken === '123';
  if (!isValid) return undefined;
 
  return {
    token: bearerToken,
    scopes: ['read:stuff'], // Add relevant scopes
    clientId: 'user123', // Add user/client identifier
    extra: {
      // Optional extra information
      userId: '123',
    },
  };
};
 
// Make authorization required
const authHandler = withMcpAuth(handler, verifyToken, {
  required: true, // Make auth required for all requests
  requiredScopes: ['read:stuff'], // Optional: Require specific scopes
  resourceMetadataPath: '/.well-known/oauth-protected-resource', // Optional: Custom metadata path
});
 
// Export the handler for both GET (SSE) and POST requests
export { authHandler as GET, authHandler as POST };
```

### [Expose OAuth metadata endpoint](#expose-oauth-metadata-endpoint)

To comply with the MCP specification, your server must expose a metadata endpoint that provides OAuth configuration details. This endpoint allows MCP clients to discover:

*   How to authorize with your server
*   Which authorization servers can issue valid tokens
*   What scopes are supported
*   Where to find documentation

#### [How to add OAuth metadata endpoint](#how-to-add-oauth-metadata-endpoint)

1.  In your `app/` directory, create a `.well-known` folder.
2.  Inside this directory, create a subdirectory called `oauth-protected-resource`.
3.  In this subdirectory, create a `route.ts` file with the following code for that specific route.
4.  Replace the `https://example-authorization-server-issuer.com` URL with your own [Authorization Server (AS) Issuer URL](https://datatracker.ietf.org/doc/html/rfc9728#name-protected-resource-metadata).

```
import {
  protectedResourceHandler,
  metadataCorsOptionsRequestHandler,
} from 'mcp-handler';
 
const handler = protectedResourceHandler({
  authServerUrls: ['https://example-authorization-server-issuer.com'],
});
 
export { handler as GET, metadataCorsOptionsRequestHandler as OPTIONS };
```

To view the full list of values available to be returned in the OAuth Protected Resource Metadata JSON, see the protected resource metadata [RFC](https://datatracker.ietf.org/doc/html/rfc9728#name-protected-resource-metadata).

MCP clients that are compliant with the latest version of the MCP spec can now securely connect and invoke tools defined in your MCP server, when provided with a valid OAuth token.

## [Deploy MCP servers efficiently on Vercel](#deploy-mcp-servers-efficiently-on-vercel)

By using Vercel to deploy your MCP server, you take advantage of [Vercel Functions](/docs/functions) with [Fluid compute](/docs/fluid-compute) to optimize your cost and usage. MCP servers often experience irregular usage patterns with a combination of long idle times, quick succession of messages and heavy AI workloads.

With Fluid compute's [optimized concurrency](/docs/fundamentals/what-is-compute#optimized-concurrency) and [dynamic scaling](/docs/fundamentals/what-is-compute#dynamic-scaling), you only pay for the compute resources you actually use with the minimum amount of idle time. If your MCP server function needs to process AI heavy workloads, Fluid compute's ability to [share instances](/docs/fundamentals/what-is-compute#compute-instance-sharing) increases performance efficiently.

## [More resources](#more-resources)

Learn how to deploy MCP servers on Vercel, connect to them using the AI SDK, and explore curated lists of public MCP servers.

*   [Deploy an MCP server with Next.js on Vercel](https://vercel.com/templates/ai/model-context-protocol-mcp-with-next-js)
*   [Deploy an MCP server with Vercel Functions](https://vercel.com/templates/other/model-context-protocol-mcp-with-vercel-functions)
*   [Learn about MCP server support on Vercel](https://vercel.com/changelog/mcp-server-support-on-vercel)
*   [Use the AI SDK to initialize an MCP client on your MCP host to connect to an MCP server](https://ai-sdk.dev/docs/ai-sdk-core/tools-and-tool-calling#initializing-an-mcp-client)
*   [Use the AI SDK to call tools that an MCP server provides](https://ai-sdk.dev/docs/ai-sdk-core/tools-and-tool-calling#using-mcp-tools)
*   [Explore the list from MCP servers repository](https://github.com/modelcontextprotocol/servers)
*   [Explore the list from awesome MCP servers](https://github.com/punkpeye/awesome-mcp-servers)

Last updated on July 3, 2025