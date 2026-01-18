import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

let client: Client | null = null;

function validateAwsCredentials(): void {
	const required = [
		"AWS_ACCESS_KEY_ID",
		"AWS_SECRET_ACCESS_KEY",
		"AWS_SESSION_TOKEN",
	];
	const missing = required.filter((key) => !process.env[key]);

	if (missing.length > 0) {
		throw new Error(
			`Missing AWS credentials: ${missing.join(", ")}. Please use MFA authentication flow from aws-operations.md`,
		);
	}
}

export async function getClient(): Promise<Client> {
	if (client) {
		return client;
	}

	validateAwsCredentials();

	// mcp-proxy-for-aws converts remote SSE + SigV4 to local stdio
	const transport = new StdioClientTransport({
		command: "uvx",
		args: [
			"mcp-proxy-for-aws@v1.1.5",
			"https://aws-mcp.us-east-1.api.aws/mcp",
			"--metadata",
			"AWS_REGION=us-east-1",
		],
		env: {
			...process.env,
			AWS_ACCESS_KEY_ID: process.env.AWS_ACCESS_KEY_ID ?? "",
			AWS_SECRET_ACCESS_KEY: process.env.AWS_SECRET_ACCESS_KEY ?? "",
			AWS_SESSION_TOKEN: process.env.AWS_SESSION_TOKEN ?? "",
		},
	});

	client = new Client(
		{
			name: "aws-mcp-server-client",
			version: "1.0.0",
		},
		{
			capabilities: {},
		},
	);

	await client.connect(transport);
	return client;
}

export async function callTool(
	toolName: string,
	args: Record<string, unknown>,
): Promise<unknown> {
	try {
		const mcpClient = await getClient();
		const result = await mcpClient.callTool({
			name: toolName,
			arguments: args,
		});
		return result;
	} catch (error) {
		if (error instanceof Error) {
			throw new Error(`AWS MCP Server call failed: ${error.message}`);
		}
		throw error;
	}
}

export async function listTools(): Promise<string[]> {
	const mcpClient = await getClient();
	const tools = await mcpClient.listTools();
	return tools.tools.map((t) => t.name);
}

export async function close(): Promise<void> {
	if (client) {
		await client.close();
		client = null;
	}
}

process.on("exit", () => {
	if (client) {
		client.close().catch(() => {});
	}
});
