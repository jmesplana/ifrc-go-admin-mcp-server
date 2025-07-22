const { Server } = require('@modelcontextprotocol/sdk/server/index.js');
const { 
  ListToolsRequestSchema,
  CallToolRequestSchema 
} = require('@modelcontextprotocol/sdk/types.js');

class IFRCAPIClient {
  constructor() {
    this.baseUrl = 'https://goadmin.ifrc.org/api/v2';
    this.cache = new Map();
    this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
  }

  async fetchWithCache(url) {
    const cached = this.cache.get(url);
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.data;
    }

    try {
      const fetch = require('node-fetch');
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      this.cache.set(url, { data, timestamp: Date.now() });
      return data;
    } catch (error) {
      throw new Error(`Failed to fetch data from IFRC API: ${error.message || 'Unknown error'}`);
    }
  }

  async getCompletedDrefs(limit = 20, offset = 0) {
    const url = `${this.baseUrl}/completed_dref/?limit=${limit}&offset=${offset}`;
    return this.fetchWithCache(url);
  }

  async getOngoingDrefs(limit = 20, offset = 0) {
    const url = `${this.baseUrl}/dref/?limit=${limit}&offset=${offset}`;
    return this.fetchWithCache(url);
  }

  async getAppeals(limit = 20, offset = 0) {
    const url = `${this.baseUrl}/appeal/?limit=${limit}&offset=${offset}`;
    return this.fetchWithCache(url);
  }

  async getEmergencies(limit = 20, offset = 0) {
    const url = `${this.baseUrl}/event/?limit=${limit}&offset=${offset}`;
    return this.fetchWithCache(url);
  }

  async searchDrefsByCountry(countryIso, limit = 20) {
    const url = `${this.baseUrl}/dref/?country__iso=${countryIso}&limit=${limit}`;
    return this.fetchWithCache(url);
  }

  async searchDrefsByDisasterType(disasterType, limit = 20) {
    const url = `${this.baseUrl}/dref/?disaster_type__name__icontains=${encodeURIComponent(disasterType)}&limit=${limit}`;
    return this.fetchWithCache(url);
  }

  async getDrefStatistics() {
    try {
      const [completed, ongoing] = await Promise.all([
        this.getCompletedDrefs(1000, 0),
        this.getOngoingDrefs(1000, 0)
      ]);

      const allOperations = [...completed.results, ...ongoing.results];
      
      return {
        total_operations: allOperations.length,
        total_requested: allOperations.reduce((sum, op) => sum + (op.amount_requested || 0), 0),
        total_funded: allOperations.reduce((sum, op) => sum + (op.amount_funded || 0), 0),
        active_operations: ongoing.results.length
      };
    } catch (error) {
      throw new Error(`Failed to calculate DREF statistics: ${error.message || 'Unknown error'}`);
    }
  }
}

const apiClient = new IFRCAPIClient();

const tools = [
  {
    name: 'get_completed_drefs',
    description: 'Retrieve completed DREF (Disaster Relief Emergency Fund) operations',
    inputSchema: {
      type: 'object',
      properties: {
        limit: {
          type: 'number',
          description: 'Maximum number of results to return (default: 20)',
          default: 20
        },
        offset: {
          type: 'number',
          description: 'Number of results to skip (default: 0)',
          default: 0
        }
      }
    }
  },
  {
    name: 'get_ongoing_drefs',
    description: 'Get currently active DREF operations',
    inputSchema: {
      type: 'object',
      properties: {
        limit: {
          type: 'number',
          description: 'Maximum number of results to return (default: 20)',
          default: 20
        },
        offset: {
          type: 'number',
          description: 'Number of results to skip (default: 0)',
          default: 0
        }
      }
    }
  },
  {
    name: 'get_appeals',
    description: 'Access humanitarian appeals for funding',
    inputSchema: {
      type: 'object',
      properties: {
        limit: {
          type: 'number',
          description: 'Maximum number of results to return (default: 20)',
          default: 20
        },
        offset: {
          type: 'number',
          description: 'Number of results to skip (default: 0)',
          default: 0
        }
      }
    }
  },
  {
    name: 'get_emergencies',
    description: 'Query emergency events and disasters',
    inputSchema: {
      type: 'object',
      properties: {
        limit: {
          type: 'number',
          description: 'Maximum number of results to return (default: 20)',
          default: 20
        },
        offset: {
          type: 'number',
          description: 'Number of results to skip (default: 0)',
          default: 0
        }
      }
    }
  },
  {
    name: 'search_drefs_by_country',
    description: 'Find DREF operations by country ISO code',
    inputSchema: {
      type: 'object',
      properties: {
        country_iso: {
          type: 'string',
          description: 'ISO country code (e.g., BD for Bangladesh, US for United States)',
        },
        limit: {
          type: 'number',
          description: 'Maximum number of results to return (default: 20)',
          default: 20
        }
      },
      required: ['country_iso']
    }
  },
  {
    name: 'search_drefs_by_disaster_type',
    description: 'Search DREF operations by disaster type (flood, earthquake, cyclone, etc.)',
    inputSchema: {
      type: 'object',
      properties: {
        disaster_type: {
          type: 'string',
          description: 'Disaster type to search for (e.g., flood, earthquake, cyclone, drought)',
        },
        limit: {
          type: 'number',
          description: 'Maximum number of results to return (default: 20)',
          default: 20
        }
      },
      required: ['disaster_type']
    }
  },
  {
    name: 'get_dref_statistics',
    description: 'Get summary statistics about DREF operations',
    inputSchema: {
      type: 'object',
      properties: {}
    }
  }
];

async function handleToolCall(toolName, args) {
  try {
    switch (toolName) {
      case 'get_completed_drefs': {
        const limit = args?.limit || 20;
        const offset = args?.offset || 0;
        return await apiClient.getCompletedDrefs(limit, offset);
      }

      case 'get_ongoing_drefs': {
        const limit = args?.limit || 20;
        const offset = args?.offset || 0;
        return await apiClient.getOngoingDrefs(limit, offset);
      }

      case 'get_appeals': {
        const limit = args?.limit || 20;
        const offset = args?.offset || 0;
        return await apiClient.getAppeals(limit, offset);
      }

      case 'get_emergencies': {
        const limit = args?.limit || 20;
        const offset = args?.offset || 0;
        return await apiClient.getEmergencies(limit, offset);
      }

      case 'search_drefs_by_country': {
        const { country_iso, limit = 20 } = args || {};
        if (!country_iso) {
          throw new Error('country_iso parameter is required');
        }
        return await apiClient.searchDrefsByCountry(country_iso, limit);
      }

      case 'search_drefs_by_disaster_type': {
        const { disaster_type, limit = 20 } = args || {};
        if (!disaster_type) {
          throw new Error('disaster_type parameter is required');
        }
        return await apiClient.searchDrefsByDisasterType(disaster_type, limit);
      }

      case 'get_dref_statistics': {
        return await apiClient.getDrefStatistics();
      }

      default:
        throw new Error(`Unknown tool: ${toolName}`);
    }
  } catch (error) {
    throw new Error(`Tool execution failed: ${error.message || 'Unknown error'}`);
  }
}

module.exports = async (req, res) => {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method === 'GET') {
    // Return server info and available tools
    return res.json({
      server: {
        name: 'ifrc-go-admin-mcp-server',
        version: '1.0.0',
        description: 'MCP server for IFRC GO Admin API access'
      },
      tools: tools
    });
  }

  if (req.method === 'POST') {
    try {
      const { method, params } = req.body;

      if (method === 'tools/list') {
        return res.json({
          tools: tools
        });
      }

      if (method === 'tools/call') {
        const { name, arguments: args } = params;
        const result = await handleToolCall(name, args);
        
        return res.json({
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2)
            }
          ]
        });
      }

      return res.status(400).json({
        error: 'Unsupported method'
      });

    } catch (error) {
      return res.status(500).json({
        error: error.message || 'Internal server error',
        content: [
          {
            type: 'text',
            text: `Error: ${error.message || 'Unknown error occurred'}`
          }
        ],
        isError: true
      });
    }
  }

  return res.status(405).json({
    error: 'Method not allowed'
  });
};