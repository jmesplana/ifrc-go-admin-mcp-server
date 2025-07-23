# IFRC GO Admin API MCP Server

A Model Context Protocol (MCP) server that provides access to the International Federation of Red Cross and Red Crescent Societies (IFRC) GO Admin API for disaster relief emergency fund (DREF) data.

## Features

- **DREF Operations**: Access completed and ongoing disaster relief emergency fund operations
- **Appeals**: Query humanitarian funding appeals 
- **Emergencies**: Get emergency event and disaster data
- **Search & Filter**: Search by country, disaster type, and other criteria
- **Caching**: Built-in response caching to reduce API load
- **Pagination**: Handle large datasets efficiently

## Prerequisites

- Node.js 18.0.0 or higher
- npm or yarn package manager
- MCP-compatible client (Claude Desktop, etc.)

## Installation

### 1. Install Dependencies
```bash
npm install
```

### 2. Build the Project
```bash
npm run build
```

### 3. Test the Server
```bash
npm start
```

## Usage

### Configure in Claude Desktop

Add to your Claude Desktop configuration file (`~/Library/Application Support/Claude/claude_desktop_config.json` on macOS):

```json
{
  "mcpServers": {
    "ifrc-go-admin": {
      "command": "node",
      "args": ["/path/to/your/ifrc-go-admin-mcp-server/dist/index.js"]
    }
  }
}
```

### Available Tools

1. **get_completed_drefs**: Retrieve completed DREF operations
2. **get_ongoing_drefs**: Get currently active DREF operations  
3. **get_appeals**: Access humanitarian appeals for funding
4. **get_emergencies**: Query emergency events and disasters
5. **search_drefs_by_country**: Find DREF operations by country ISO code
6. **search_drefs_by_disaster_type**: Search by disaster type (flood, earthquake, etc.)
7. **get_dref_statistics**: Get summary statistics about DREF operations

### Example Queries for AI Assistants

- "Show me recent earthquake-related DREF operations"
- "What are the ongoing emergency appeals in Bangladesh?"
- "Compare funding amounts for cyclone vs flood disasters this year"
- "List all completed DREF operations in West Africa"

## Development

### Scripts

- `npm run build` - Compile TypeScript to JavaScript
- `npm run dev` - Watch mode for development
- `npm start` - Start the production server
- `npm test` - Test server startup

### API Exploration

Before implementing, explore the API endpoints:

```bash
# Test basic connectivity
curl "https://goadmin.ifrc.org/api/v2/dref/?limit=1"

# Check completed DREFs
curl "https://goadmin.ifrc.org/api/v2/completed_dref/?limit=5"

# Search by country
curl "https://goadmin.ifrc.org/api/v2/dref/?country__iso=BD"
```

### Adding New Endpoints

1. **Update Types**: Add TypeScript interfaces for new data structures
2. **Extend API Client**: Add methods to `IFRCAPIClient` class
3. **Register Tools**: Add tool definitions in `ListToolsRequestSchema` handler
4. **Implement Handlers**: Add case in `CallToolRequestSchema` handler

### Pagination Best Practices

Following IFRC API documentation guidelines:

- Default limit is 50 records per page
- Maximum limit is 1000 records per page  
- Stop pagination when returned records < limit
- Check for empty array [] to confirm no more data
- Use offset-based pagination with limit/offset parameters

### Rate Limiting Considerations

The server includes basic caching (5-minute timeout) to be respectful of IFRC's infrastructure. For production use:

- Implement exponential backoff for retries
- Add request rate limiting 
- Monitor API usage and respect any documented limits
- Consider using webhooks for real-time updates if available

### Error Handling

The server includes comprehensive error handling:
- HTTP errors from the API
- Invalid parameters
- Network timeouts
- Cache management

### Authentication

Currently, the IFRC GO Admin API appears to be publicly accessible. If authentication is required:

1. Add API key management to the `IFRCAPIClient` class
2. Include authentication headers in requests
3. Handle authentication errors appropriately

## Data Schema Examples

### DREF Operation
```json
{
  "id": 12345,
  "title": "Bangladesh: Cyclone Mocha",
  "country": "Bangladesh", 
  "disaster_type": "Cyclone",
  "amount_requested": 500000,
  "amount_funded": 500000,
  "disaster_start_date": "2023-05-14",
  "status": "completed"
}
```

### Emergency Event
```json
{
  "id": 67890,
  "name": "Morocco Earthquake September 2023",
  "countries": ["Morocco"],
  "disaster_type": "Earthquake", 
  "num_affected": 300000,
  "disaster_start_date": "2023-09-08"
}
```

## Project Structure

```
ifrc-go-admin-mcp-server/
├── src/
│   └── index.ts          # Main MCP server implementation
├── dist/                 # Compiled JavaScript output
├── package.json          # Project configuration
├── tsconfig.json         # TypeScript configuration
└── README.md             # This file
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Submit a pull request

## Humanitarian Use Guidelines

This server provides access to sensitive humanitarian data. Please:

- Use responsibly and respect the humanitarian context
- Don't overwhelm the IFRC API with excessive requests
- Consider data privacy when analyzing beneficiary information
- Contribute improvements back to the humanitarian community

## Support

For issues related to:
- **MCP Server**: Open an issue in this repository
- **IFRC GO API**: Contact IFRC technical support
- **Data Questions**: Refer to IFRC GO documentation

## License

MIT License - See LICENSE file for details.

## Acknowledgments

- International Federation of Red Cross and Red Crescent Societies
- Model Context Protocol development team
- Open source humanitarian technology community