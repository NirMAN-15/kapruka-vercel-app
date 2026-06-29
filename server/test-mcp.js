import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js";

async function main() {
  console.log("Connecting to Kapruka MCP server...");
  const transport = new SSEClientTransport(new URL("https://mcp.kapruka.com/mcp"));
  const client = new Client({
    name: "kapruka-test-client",
    version: "1.0.0"
  }, {
    capabilities: {}
  });

  try {
    await client.connect(transport);
    console.log("Connected successfully!");

    console.log("Listing tools...");
    const response = await client.listTools();
    console.log("Tools found:", JSON.stringify(response, null, 2));

    // Let's try listing categories
    console.log("Calling kapruka_list_categories...");
    const categories = await client.callTool({
      name: "kapruka_list_categories",
      arguments: {}
    });
    console.log("Categories response:", JSON.stringify(categories, null, 2));

  } catch (error) {
    console.error("Error connected to MCP:", error);
  } finally {
    console.log("Done");
    process.exit(0);
  }
}

main();
