# PayMcp Client Example

This is an example CLI application that demonstrates how to use the `paymcp-client` library to create images using the PayMcp payment system. It imports from the compiled JavaScript files in the main library's `dist` directory.

## Features

- Takes a command line argument as an image prompt
- Uses the `payMcpClient` function to create a proper MCP client
- Handles OAuth authentication and payments automatically
- Connects to the image generation service at `https://image.corp.novellum.ai`
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
npm run dev "a beautiful sunset over mountains"
```

**Note**: The development script uses a shell script to properly handle argument passing.

### Production mode (build and run):
```bash
npm run build
npm start "a beautiful sunset over mountains"
```

### Direct execution:
```bash
npx tsx src/index.ts "a beautiful sunset over mountains"
```



## How it works

1. The application takes an image prompt as a command line argument
2. It creates a Solana payment maker for handling payments
3. Uses the `payMcpClient` function to create a proper MCP client
4. The MCP client automatically handles:
   - OAuth authentication flow
   - Payment processing when required
   - Tool calls to the image generation service
5. Returns the image generation result

## Configuration

The application is configured with the following settings as specified in PROMPT.md:
- **MCP Server**: `https://image.corp.novellum.ai`
- **Account**: `paymcp`
- **Payment Makers**: `solana`

## Error Handling

The application includes comprehensive error handling for:
- Missing command line arguments
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
1. The main library's TypeScript source files are available
2. You're using the correct import paths (pointing to `src/` directory)
3. The TypeScript compiler can resolve the imports correctly

### Private Key Format
The `SOLANA_PRIVATE_KEY` must be in base58 format. You can get this from your Solana wallet or generate a new keypair.

 