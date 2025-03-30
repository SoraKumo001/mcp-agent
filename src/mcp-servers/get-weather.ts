import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { DirectServerTransport } from "../libs/direct-transport.js";

interface Center {
  name: string;
  enName: string;
  officeName?: string;
  children?: string[];
  parent?: string;
  kana?: string;
}
interface Centers {
  [key: string]: Center;
}
interface Area {
  centers: Centers;
  offices: Centers;
  class10s: Centers;
  class15s: Centers;
  class20s: Centers;
}

interface Weather {
  publishingOffice: string;
  reportDatetime: Date;
  targetArea: string;
  headlineText: string;
  text: string;
}

const server = new McpServer({
  name: "天気予報サーバー",
  version: "1.0.0",
});

server.tool(
  "get-weather",
  `指定した都道府県の天気予報を返す`,
  {
    name: z.string({
      description: "都道府県名",
    }),
  },
  async ({ name: areaName }) => {
    const result = await fetch(
      "https://www.jma.go.jp/bosai/common/const/area.json"
    )
      .then((v) => v.json())
      .then((v: Area) => v.offices)
      .then((v: Centers) =>
        Object.entries(v).flatMap(([id, { name }]) =>
          name.includes(areaName) ? [id] : []
        )
      );
    const weathers = await Promise.all(
      result.map((id) =>
        fetch(
          `https://www.jma.go.jp/bosai/forecast/data/overview_forecast/${id}.json`
        )
          .then((v) => v.json())
          .then((v: Weather) => v.text)
      )
    );
    return {
      content: [
        {
          type: "text",
          text: weathers.join("---"),
        },
      ],
    };
  }
);

const transport = new DirectServerTransport();
await server.connect(transport);
export const mcpWeatherTransport = transport.getClientTransport();
