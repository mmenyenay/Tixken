const { Client } = require('@modelcontextprotocol/sdk/client/index.js');
const { StreamableHTTPClientTransport } = require('@modelcontextprotocol/sdk/client/streamableHttp.js');
require('dotenv').config();

let client;

async function getMcpClient() {
  if (client) return client;

    const transport = new StreamableHTTPClientTransport(new URL('https://mcp.brickken.com/mcp'));
      client = new Client({ name: 'tixken-agent', version: '0.1.0' }, { capabilities: {} });
        await client.connect(transport);

          await client.callTool({
              name: 'configure',
                  arguments: {
                        env: 'sandbox',
                              privateKey: process.env.AGENT_PRIVATE_KEY,
                                    apiKey: ''
                                        }
                                          });

                                            return client;
                                            }

                                            async function callMcpTool(name, args) {
                                              const mcp = await getMcpClient();
                                                const result = await mcp.callTool({ name, arguments: args });
                                                  return result;
                                                  }

                                                  module.exports = { callMcpTool };