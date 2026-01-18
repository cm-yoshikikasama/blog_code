import { callTool, close, listTools } from "./mcp-client.js";

interface SearchResponse {
	content?: Array<{
		type: string;
		text?: string;
	}>;
	structuredContent?: {
		search_results?: Array<{
			rank_order: number;
			url: string;
			title: string;
			context: string;
		}>;
	};
}

interface CompactSearchResult {
	query: string;
	totalResults: number;
	topResults: Array<{
		title: string;
		url: string;
		summary: string;
	}>;
}

interface ApiResult {
	tool: string;
	success: boolean;
	result: string;
	error?: string;
}

// Destructive API operations that should never be called
const BLOCKED_PATTERNS = [
	/create/i,
	/delete/i,
	/update/i,
	/put/i,
	/terminate/i,
	/modify/i,
	/remove/i,
	/attach/i,
	/detach/i,
	/start/i,
	/stop/i,
	/reboot/i,
];

function isBlockedOperation(toolName: string): boolean {
	return BLOCKED_PATTERNS.some((pattern) => pattern.test(toolName));
}

async function searchDocs(
	query: string,
	limit = 5,
): Promise<CompactSearchResult> {
	console.error(`Searching AWS documentation for: "${query}"`);

	const result = (await callTool("aws___search_documentation", {
		search_phrase: query,
		topics: ["current_awareness"],
		limit: limit * 2,
	})) as SearchResponse;

	// Handle both structuredContent and content formats
	let searchResults: Array<{
		title: string;
		url: string;
		context: string;
	}> = [];

	if (result.structuredContent?.search_results) {
		searchResults = result.structuredContent.search_results;
	} else if (result.content) {
		// Parse from text content if structured content is not available
		const textContent = result.content.find((c) => c.type === "text")?.text;
		if (textContent) {
			try {
				const parsed = JSON.parse(textContent);
				// AWS MCP Server returns nested structure: { content: { result: [...] } }
				if (parsed.content?.result) {
					searchResults = parsed.content.result;
				} else if (parsed.result) {
					searchResults = parsed.result;
				}
			} catch {
				// Return raw text as single result
				searchResults = [
					{
						title: "Search Result",
						url: "",
						context: textContent.slice(0, 300),
					},
				];
			}
		}
	}

	const topResults = searchResults
		.filter((doc) => doc.title || doc.url)
		.slice(0, limit)
		.map((doc) => ({
			title: doc.title || "Untitled",
			url: doc.url || "",
			summary: doc.context?.slice(0, 150) || "No summary available",
		}));

	return {
		query,
		totalResults: searchResults.length,
		topResults,
	};
}

async function callApi(toolName: string, args: string): Promise<ApiResult> {
	// Safety check for destructive operations
	if (isBlockedOperation(toolName)) {
		return {
			tool: toolName,
			success: false,
			result: "",
			error: `Blocked: ${toolName} is a destructive operation. Only read-only operations are allowed.`,
		};
	}

	console.error(`Calling AWS API: ${toolName}`);

	try {
		const parsedArgs = JSON.parse(args);
		const response = (await callTool(toolName, parsedArgs)) as {
			content?: Array<{ type: string; text?: string }>;
		};

		// Extract text content - return full result without truncation
		const textContent = response.content?.find((c) => c.type === "text")?.text;
		const fullResult = textContent || JSON.stringify(response);

		return {
			tool: toolName,
			success: true,
			result: fullResult,
		};
	} catch (error) {
		return {
			tool: toolName,
			success: false,
			result: "",
			error: error instanceof Error ? error.message : String(error),
		};
	}
}

async function showTools(): Promise<void> {
	console.error("Fetching available tools from AWS MCP Server...");
	const tools = await listTools();
	console.log(JSON.stringify({ availableTools: tools }, null, 2));
}

function printUsage(): void {
	console.error("Usage:");
	console.error("  tsx index.ts search <query> [limit]");
	console.error("  tsx index.ts api <tool_name> <args_json>");
	console.error("  tsx index.ts tools");
	console.error("");
	console.error("Examples:");
	console.error('  tsx index.ts search "Lambda concurrency" 5');
	console.error("  tsx index.ts api s3_ListBuckets '{}'");
	console.error("  tsx index.ts tools");
	console.error("");
	console.error("Note: AWS credentials must be set via environment variables:");
	console.error(
		"  AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_SESSION_TOKEN",
	);
}

async function main(): Promise<void> {
	const args = process.argv.slice(2);

	if (args.length === 0) {
		printUsage();
		process.exit(1);
	}

	const command = args[0];

	try {
		switch (command) {
			case "search": {
				if (args.length < 2) {
					console.error("Error: search command requires a query");
					printUsage();
					process.exit(1);
				}
				const query = args[1];
				const limit = args[2] ? Number.parseInt(args[2], 10) : 5;
				const result = await searchDocs(query, limit);
				console.log(JSON.stringify(result, null, 2));
				break;
			}
			case "api": {
				if (args.length < 3) {
					console.error("Error: api command requires tool_name and args_json");
					printUsage();
					process.exit(1);
				}
				const toolName = args[1];
				const apiArgs = args[2];
				const result = await callApi(toolName, apiArgs);
				console.log(JSON.stringify(result, null, 2));
				break;
			}
			case "tools": {
				await showTools();
				break;
			}
			default:
				console.error(`Unknown command: ${command}`);
				printUsage();
				process.exit(1);
		}
	} finally {
		await close();
	}
}

main().catch((error) => {
	console.error("Error:", error instanceof Error ? error.message : error);
	process.exit(1);
});
