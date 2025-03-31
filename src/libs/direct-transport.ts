import type { Transport } from "@modelcontextprotocol/sdk/shared/transport.js";
import type { JSONRPCMessage } from "@modelcontextprotocol/sdk/types.js";

class DirectClientTransport implements Transport {
  onclose?: () => void;
  onmessage?: (message: JSONRPCMessage) => void;
  constructor(private serverTransport: Transport) {}
  async start() {}
  async close() {}
  async send(message: JSONRPCMessage) {
    this.serverTransport.onmessage?.(message);
  }
}

export class DirectServerTransport implements Transport {
  onclose?: () => void;
  onmessage?: (message: JSONRPCMessage) => void;
  clientTransport: DirectClientTransport;
  constructor() {
    this.clientTransport = new DirectClientTransport(this);
  }
  async start() {}
  async close() {}
  async send(message: JSONRPCMessage) {
    this.clientTransport.onmessage?.(message);
  }
  getClientTransport() {
    return this.clientTransport;
  }
}
