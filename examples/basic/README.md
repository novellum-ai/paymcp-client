# PayMcp Client Example

This is an example CLI application that demonstrates how to use the `paymcp-client` library to interact with various MCP services using the PayMcp payment system. It imports from the compiled JavaScript files in the main library's `dist` directory because the source files are designed to be compiled to CommonJS and use `.js` extensions in their imports, which requires compilation for proper module resolution.

## Features

- Supports multiple services: image generation and search
- Takes service type and prompt/query as command line arguments
- Uses the `payMcpClient` function to create a proper MCP client
- Handles OAuth authentication and payments automatically
- Connects to different MCP servers based on the service:
  - Image generation: `https://image.corp.novellum.ai`
  - Search: `https://search.corp.novellum.ai`
- Uses Solana as the payment network
- Makes proper MCP tool calls instead of raw HTTP requests

## Prerequisites

- Node.js 18 or higher
- A Solana wallet with USDC for payments
- Access to the image generation service

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Set up environment variables:
   ```bash
   export SOLANA_ENDPOINT="https://api.mainnet-beta.solana.com"
   export SOLANA_PRIVATE_KEY="your_base58_encoded_private_key"
   ```

   **Note**: Replace `your_base58_encoded_private_key` with your actual Solana private key in base58 format.

## Usage

### Development mode (using tsx):
```bash
# Image generation
npm run dev image "a beautiful sunset over mountains"

# Search
npm run dev search "latest news about AI"
```

**Note**: The development script uses a shell script to properly handle argument passing.

### Production mode (build and run):
```bash
npm run build

# Image generation
npm start image "a beautiful sunset over mountains"

# Search
npm start search "latest news about AI"
```

### Direct execution:
```bash
# Image generation
npx tsx src/index.ts image "a beautiful sunset over mountains"

# Search
npx tsx src/index.ts search "latest news about AI"
```

### Debug Mode

To enable debug output, set the `DEBUG` environment variable:

```bash
# With debug output
DEBUG=1 npm run dev image "test prompt"

# Or for production
DEBUG=1 npm start image "test prompt"
```

Debug output includes:
- Service configuration details
- Request success messages
- Result data



## How it works

1. The application takes a service type and prompt/query as command line arguments
2. It creates a Solana payment maker for handling payments
3. Uses the `payMcpClient` function to create a proper MCP client
4. The MCP client automatically handles:
   - OAuth authentication flow
   - Payment processing when required
   - Tool calls to the appropriate service (image generation or search)
5. Returns the service result with appropriate formatting

## Configuration

The application is configured with the following settings:
- **Account**: `paymcp`
- **Payment Makers**: `solana`

### Services

- **Image Generation**:
  - MCP Server: `https://image.corp.novellum.ai`
  - Tool: `image_create_image`
  - Parameter: `prompt`
- **Search**:
  - MCP Server: `https://search.corp.novellum.ai`
  - Tool: `search_search`
  - Parameter: `query`

## Error Handling

The application includes comprehensive error handling for:
- Missing command line arguments
- Invalid service types
- Missing environment variables
- Network errors
- Payment failures
- Authentication errors

## Database

The application uses SQLite to store OAuth tokens and client credentials. The database file (`example-oauth.db`) is created in the current directory.

## Security Notes

- Never commit your private keys to version control
- Use environment variables for sensitive configuration
- The database file contains encrypted tokens - keep it secure
- Consider using a dedicated wallet for this application

## Troubleshooting

### Import Errors
If you encounter import errors like "The requested module does not provide an export", make sure:
1. The main library has been built: `cd .. && npm run build`
2. You're using the correct import paths (pointing to `dist/` directory)
3. The TypeScript compiler can resolve the imports correctly

**Note**: The example uses compiled JavaScript files from the `dist` directory because the source files are designed to be compiled to CommonJS and use `.js` extensions in their imports, which requires compilation for proper module resolution.

### Private Key Format
The `SOLANA_PRIVATE_KEY` must be in base58 format. You can get this from your Solana wallet or generate a new keypair.

 