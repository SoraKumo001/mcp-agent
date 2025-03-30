import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { DirectServerTransport } from "../libs/direct-transport.js";

const server = new McpServer({
  name: "時間表示サーバー",
  version: "1.0.0",
});

server.tool("get-current-time", "現在の時刻を返す", async () => {
  return {
    content: [
      {
        type: "text",
        text:
          "現在の日時:" +
          new Date().toLocaleString("ja-JP", {
            year: "numeric",
            month: "long",
            day: "numeric",
            weekday: "long",
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
          }),
      },
    ],
  };
});

const transport = new DirectServerTransport();
await server.connect(transport);
export const mcpGetCurrentTimeTransport = transport.getClientTransport();
