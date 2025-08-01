# PayMCP Integration with Forked Mastra API

This example demonstrates how to integrate PayMCP with the forked Mastra API to create a powerful MCP client that handles payments and authentication automatically.

## Overview

This example shows how to use the forked Mastra MCP client with PayMCP integration to connect to multiple MCP servers while handling payments and OAuth authentication transparently. The forked Mastra API includes custom `StreamableHTTPClientTransport` functionality that allows for advanced transport layer customization.

## Features

- **PayMCP Integration**: Automatic payment processing and OAuth authentication
- **Forked Mastra API**: Uses the enhanced Mastra MCP client with custom transport support
- **Multiple Service Support**: Connect to image generation and search services
- **Single MCPClient**: Uses one MCPClient instance with multiple server configurations
- **Tool Discovery**: Automatically discover and list available tools from MCP servers
- **Manual Tool Execution**: Demonstrate tool execution with proper argument handling
- **Error Handling**: Comprehensive error handling and logging

## Prerequisites

1. **Solana Configuration**: Set up your Solana environment variables:
   ```bash
   export SOLANA_ENDPOINT="https://api.mainnet-beta.solana.com"
   export SOLANA_PRIVATE_KEY="your_base58_encoded_private_key"
   ```

2. **Dependencies**: Install the required packages:
   ```bash
   npm install
   ```

3. **Forked Mastra**: This example uses the forked Mastra API with custom transport functionality

## Usage

### Basic Usage

```bash
npm run dev "your request here"
```

### Examples

**Generate an image:**
```bash
npm run dev "create an image of a beautiful sunset over mountains"
```

**Search for information:**
```bash
npm run dev "search for latest AI news"
```

**Complex requests:**
```bash
npm run dev "I need to create a visual representation of a futuristic city and also search for information about urban planning trends"
```

## Architecture

### PayMCP Integration

The example uses PayMCP to:
1. **Handle Payments**: Automatically process Solana payments for MCP service usage
2. **OAuth Authentication**: Manage OAuth flows and token storage
3. **Custom Transport**: Use PayMCP's custom `StreamableHTTPClientTransport`
4. **Session Management**: Handle session IDs and connection lifecycle

### Forked Mastra API

The forked Mastra API provides:
- **Custom Transport Support**: Use your own `StreamableHTTPClientTransport` instances
- **Enhanced Logging**: Detailed logging with custom log handlers
- **Multiple Server Support**: Connect to multiple MCP servers simultaneously
- **Tool Management**: Advanced tool discovery and execution capabilities

### Available Services

The system automatically connects to:

**Image Generation Service**
- **Server**: `https://image.corp.novellum.ai`
- **Tool**: `image_create_image`
- **Capability**: Generate images from text descriptions
- **Arguments**: `{ prompt: string }`

**Search Service**
- **Server**: `https://search.corp.novellum.ai`
- **Tool**: `search_search`
- **Capability**: Search for information on any topic
- **Arguments**: `{ query: string }`

## Development

### Building

```bash
npm run build
```

### Running

```bash
npm start
```

### Environment Variables

Create a `.env` file or set environment variables:

```bash
SOLANA_ENDPOINT=https://api.mainnet-beta.solana.com
SOLANA_PRIVATE_KEY=your_base58_encoded_private_key
```

## Technical Details

### MCP Integration

The example uses the forked Mastra MCP client to:
- Connect to multiple MCP servers with custom transport
- Fetch available tools dynamically
- Execute tools with proper authentication and payments
- Handle custom headers and session management

### PayMCP Integration

- Automatic Solana payment processing
- OAuth authentication handled transparently
- Custom transport layer with PayMCP's `buildStreamableTransport`
- Secure token storage and management

### Custom Transport Features

The forked Mastra API supports:
- **Custom Transport Instances**: Pass your own `StreamableHTTPClientTransport`
- **Advanced Configuration**: Custom headers, reconnection logic, session management
- **Transport Extension**: Extend the transport class with custom behavior
- **Full Control**: Customize every aspect of the transport layer

## Error Handling

The application includes comprehensive error handling for:
- Missing environment variables
- Network connectivity issues
- Payment processing errors
- Tool execution failures
- MCP server connection issues

## Security Notes

- **Private Keys**: Never commit private keys to version control
- **Environment Variables**: Use `.env` files for local development
- **Database**: OAuth tokens are stored securely in SQLite
- **Custom Headers**: Use custom headers for additional security

## Troubleshooting

### Common Issues

**Import Errors**
```bash
# Ensure the main library is built
cd ../.. && npm run build
```

**Missing Environment Variables**
```bash
# Check all required variables are set
echo $SOLANA_ENDPOINT
echo $SOLANA_PRIVATE_KEY
```

**Tool Execution Errors**
- Verify Solana wallet has sufficient USDC
- Check network connectivity to MCP servers
- Ensure OAuth flow completes successfully

### Debug Mode

Enable debug logging:
```bash
DEBUG=1 npm run dev "your request"
```

## Differences from Standard Examples

- **Forked Mastra API**: Uses enhanced Mastra MCP client with custom transport
- **PayMCP Integration**: Automatic payment processing and OAuth handling
- **Single MCPClient**: Uses one client instance with multiple server configurations
- **Advanced Logging**: Detailed logging with custom handlers
- **Multiple Server Support**: Connect to multiple MCP servers simultaneously

## Future Enhancements

- Support for additional MCP services
- Advanced transport customization
- Custom authentication flows
- Performance optimization
- Extended error handling

## Related Examples

- **Basic Example**: Simple PayMCP client usage
- **Vercel SDK Example**: AI-powered tool selection
- **Custom Transport Example**: Advanced transport customization

## Contributing

This example demonstrates the integration between PayMCP and the forked Mastra API. For more information about the custom transport functionality, see the Mastra fork documentation.

## Success Indicators

When the example runs successfully, you should see:
- ✅ Successful OAuth authentication flow
- ✅ Connection to multiple MCP servers
- ✅ Tool discovery and listing
- ✅ Proper error handling for tool execution
- ✅ Clean disconnection and cleanup 