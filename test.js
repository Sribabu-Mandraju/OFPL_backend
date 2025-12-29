import WebSocket from "ws";

const ws = new WebSocket(
  "wss://base-sepolia.g.alchemy.com/v2/phKZlw4nyzHsPKHrOlx-jfaHvvl4zFPS"
);

ws.on("open", () => {
  console.log("✅ Connected to RPC");

  ws.send(
    JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "eth_chainId",
      params: [],
    })
  );
});

ws.on("message", (data) => {
  console.log("📩 Response:", data.toString());
  ws.close();
});

ws.on("error", (err) => {
  console.error("❌ RPC Error:", err.message);
});
