// use native fetch

async function testSession() {
  // 1. Get a session ID from HEAD request
  const headRes = await fetch("https://mcp.kapruka.com/mcp", { method: "HEAD" });
  const sessionId = headRes.headers.get("mcp-session-id");
  console.log("Retrieved mcp-session-id:", sessionId);

  if (!sessionId) {
    console.error("Could not retrieve session ID from headers.");
    return;
  }

  // 2. Test different methods of passing the session ID
  const tests = [
    { name: "Query sessionId", url: `https://mcp.kapruka.com/mcp?sessionId=${sessionId}`, headers: {} },
    { name: "Query session_id", url: `https://mcp.kapruka.com/mcp?session_id=${sessionId}`, headers: {} },
    { name: "Query mcp-session-id", url: `https://mcp.kapruka.com/mcp?mcp-session-id=${sessionId}`, headers: {} },
    { name: "Query session", url: `https://mcp.kapruka.com/mcp?session=${sessionId}`, headers: {} },
    { name: "Header mcp-session-id", url: "https://mcp.kapruka.com/mcp", headers: { "mcp-session-id": sessionId } },
    { name: "Header session-id", url: "https://mcp.kapruka.com/mcp", headers: { "session-id": sessionId } },
    { name: "Header x-session-id", url: "https://mcp.kapruka.com/mcp", headers: { "x-session-id": sessionId } },
    { name: "Cookie mcp-session-id", url: "https://mcp.kapruka.com/mcp", headers: { "Cookie": `mcp-session-id=${sessionId}` } },
    { name: "Cookie session_id", url: "https://mcp.kapruka.com/mcp", headers: { "Cookie": `session_id=${sessionId}` } },
  ];

  for (const t of tests) {
    try {
      const res = await fetch(t.url, {
        method: "GET",
        headers: {
          "Accept": "text/event-stream",
          ...t.headers
        }
      });
      const text = await res.text();
      console.log(`Test: ${t.name}`);
      console.log(`  Status: ${res.status}`);
      console.log(`  Content-Type: ${res.headers.get("content-type")}`);
      console.log(`  Body length: ${text.length}`);
      console.log(`  Body snippet: ${text.slice(0, 200)}`);
      console.log("-----------------------------------------");
    } catch (err) {
      console.error(`Test ${t.name} failed:`, err.message);
    }
  }
}

testSession();
