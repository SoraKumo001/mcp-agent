import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import OpenAI from "openai";
import { mcpGetCurrentTimeTransport } from "./mcp-servers/get-current-time.js";
import { mcpWeatherTransport } from "./mcp-servers/get-weather.js";
import type { Transport } from "@modelcontextprotocol/sdk/shared/transport.js";
import type {
  ChatCompletionMessageParam,
  ChatCompletionTool,
} from "openai/resources.mjs";

const model = "qwen2.5-coder:7b";
// const model = "llama3.1:latest";

const openai = new OpenAI({
  baseURL: "http://localhost:11434/v1",
  apiKey: "ollama",
});

const getMcpTools = async (transports: Transport[]) => {
  const tools: ChatCompletionTool[] = [];
  const functionMap: Record<string, Client> = {};
  const clients: Client[] = [];
  for (const transport of transports) {
    const mcpClient = new Client({
      name: "mcp-client-cli",
      version: "1.0.0",
    });
    await mcpClient.connect(transport);
    clients.push(mcpClient);
    const toolsResult = await mcpClient.listTools();
    tools.push(
      ...toolsResult.tools.map((tool): ChatCompletionTool => {
        functionMap[tool.name] = mcpClient;
        return {
          type: "function",
          function: {
            name: tool.name,
            description: tool.description,
            parameters: tool.inputSchema,
          },
        };
      })
    );
  }
  const close = () => {
    return Promise.all(
      clients.map(async (v) => {
        await v.close();
      })
    );
  };
  return { tools, functionMap, close };
};

const query = async (
  openai: OpenAI,
  mcpTools: Awaited<ReturnType<typeof getMcpTools>>,
  query: string
) => {
  console.log(`[question] ${query}`);
  const messages: ChatCompletionMessageParam[] = [
    {
      role: "user",
      content: query,
    },
  ];

  const response = await openai.chat.completions.create({
    model,
    messages: messages,
    tools: mcpTools.tools,
    max_completion_tokens: 2048,
  });

  for (const content of response.choices) {
    if (content.finish_reason === "stop") {
      console.log(content.message.content);
    } else if (
      content.finish_reason === "tool_calls" &&
      content.message.tool_calls
    ) {
      for (const toolCall of content.message.tool_calls) {
        const toolName = toolCall.function.name;
        const toolArgs = toolCall.function.arguments;
        const mcp = mcpTools.functionMap[toolName];
        console.log(`[tool] ${toolName}`);
        if (!mcp) {
          throw new Error(`Tool ${toolName} not found`);
        }

        const toolResult = await mcp.callTool({
          name: toolName,
          arguments: JSON.parse(toolArgs),
        });
        messages.push({
          role: "tool",
          tool_call_id: toolCall.id,
          content: JSON.stringify(toolResult.content) as string,
        });
      }

      const response = await openai.chat.completions.create({
        model,
        messages,
        max_completion_tokens: 2048,
        stream: true,
      });
      for await (const message of response) {
        process.stdout.write(message.choices[0].delta.content!);
      }
      console.log();
    }
  }
};

async function main() {
  const mcpTools = await getMcpTools([
    mcpWeatherTransport,
    mcpGetCurrentTimeTransport,
  ]);
  await query(openai, mcpTools, "今日の日時と東京の天気は？");
  await mcpTools.close();
}

main();
