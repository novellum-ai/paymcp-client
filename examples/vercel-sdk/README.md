# PayMCP Client - Vercel AI SDK Example

This example demonstrates how to integrate the PayMCP client with the Vercel AI SDK to create an AI-powered application that can automatically select and use MCP tools based on user requests.

## Overview

The Vercel AI SDK example provides an intelligent interface that uses GPT-4 to understand user requests and automatically choose the appropriate MCP tools to fulfill them. Instead of manually specifying which service to use, you simply describe what you want, and the AI determines the best tools to use.

## Features

- **AI-Powered Tool Selection**: Uses GPT-4 to automatically choose the right MCP tools
- **Multiple Service Integration**: Seamlessly integrates image generation and search services
- **Automatic OAuth & Payments**: Handles authentication and payments through PayMCP
- **Natural Language Interface**: Describe what you want in plain English
- **Tool Execution**: Automatically executes the selected tools with proper parameters

## Prerequisites

1. **Solana Configuration**: Set up your Solana environment variables:
   ```bash
   export SOLANA_ENDPOINT="https://api.mainnet-beta.solana.com"
   export SOLANA_PRIVATE_KEY="your_base58_encoded_private_key"
   ```

2. **OpenAI API Key**: Set your OpenAI API key:
   ```bash
   export OPENAI_API_KEY="your_openai_api_key"
   ```

3. **Dependencies**: Install the required packages:
   ```bash
   npm install
   ```

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
npm run dev "find me the latest news about artificial intelligence"
```

**Complex requests:**
```bash
npm run dev "I need to create a visual representation of a futuristic city and also search for information about urban planning trends"
```

## Architecture

### AI-Powered Tool Selection

The application uses GPT-4 to:
1. **Analyze** the user's request
2. **Select** appropriate MCP tools from available options
3. **Execute** the tools with proper parameters
4. **Return** results in a natural, conversational format

### Available Tools

The system automatically has access to:

**Image Generation Service**
- **Server**: `https://image.corp.novellum.ai`
- **Tool**: `image_create_image`
- **Capability**: Generate images from text descriptions

**Search Service**
- **Server**: `https://search.corp.novellum.ai`
- **Tool**: `search_search`
- **Capability**: Search for information on any topic

### How It Works

1. **Request Processing**: User provides a natural language request
2. **Tool Discovery**: System fetches available tools from all MCP servers
3. **AI Analysis**: GPT-4 analyzes the request and selects appropriate tools
4. **Tool Execution**: Selected tools are executed with proper parameters
5. **Response Generation**: AI provides a natural response incorporating tool results

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
OPENAI_API_KEY=your_openai_api_key
```

## Technical Details

### MCP Integration

The example uses the MCP SDK's `experimental_createMCPClient` to:
- Connect to multiple MCP servers
- Fetch available tools dynamically
- Execute tools with proper authentication and payments

### Vercel AI SDK Integration

- Uses `generateText` for AI-powered responses
- Integrates MCP tools as function calls
- Provides natural language interface

### Payment Processing

- Automatic Solana payment processing via PayMCP
- OAuth authentication handled transparently
- Secure token storage and management

## Error Handling

The application includes comprehensive error handling for:
- Missing environment variables
- Network connectivity issues
- Payment processing errors
- Tool execution failures
- AI model errors

## Security Notes

- **Private Keys**: Never commit private keys to version control
- **Environment Variables**: Use `.env` files for local development
- **API Keys**: Keep OpenAI API keys secure
- **Database**: OAuth tokens are stored securely in SQLite

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
echo $OPENAI_API_KEY
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

## Differences from Basic Example

- **AI-Powered**: Uses GPT-4 to select tools automatically
- **Natural Language**: No need to specify service types manually
- **Dynamic Tool Discovery**: Fetches tools from all available services
- **Intelligent Responses**: Provides contextual, natural language responses
- **Multi-Tool Execution**: Can use multiple tools for complex requests

## Future Enhancements

- Support for additional MCP services
- Conversation memory and context
- Streaming responses
- Custom tool definitions
- Advanced prompt engineering

 