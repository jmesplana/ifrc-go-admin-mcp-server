#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  ListToolsRequestSchema,
  CallToolRequestSchema,
  Tool,
  CallToolResult
} from '@modelcontextprotocol/sdk/types.js';

interface DrefOperation {
  id: number;
  title: string;
  country: string;
  disaster_type: string;
  amount_requested: number;
  amount_funded: number;
  disaster_start_date: string;
  status: string;
  created_at?: string;
  modified_at?: string;
}

interface Emergency {
  id: number;
  name: string;
  countries: string[];
  disaster_type: string;
  num_affected: number;
  disaster_start_date: string;
}

interface Appeal {
  id: number;
  name: string;
  country: string;
  disaster_type: string;
  amount_requested: number;
  amount_funded: number;
  start_date: string;
  end_date: string;
}

interface APIResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

class IFRCAPIClient {
  private baseUrl = 'https://goadmin.ifrc.org/api/v2';
  private cache = new Map<string, { data: any; timestamp: number }>();
  private cacheTimeout = 5 * 60 * 1000; // 5 minutes

  private async fetchWithCache<T>(url: string): Promise<T> {
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
      
      const data = await response.json() as T;
      this.cache.set(url, { data, timestamp: Date.now() });
      return data;
    } catch (error) {
      throw new Error(`Failed to fetch data from IFRC API: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getCompletedDrefs(limit = 50, offset = 0): Promise<APIResponse<DrefOperation>> {
    const url = `${this.baseUrl}/completed_dref/?limit=${limit}&offset=${offset}`;
    return this.fetchWithCache<APIResponse<DrefOperation>>(url);
  }

  async getOngoingDrefs(limit = 50, offset = 0): Promise<APIResponse<DrefOperation>> {
    const url = `${this.baseUrl}/dref/?limit=${limit}&offset=${offset}`;
    return this.fetchWithCache<APIResponse<DrefOperation>>(url);
  }

  async getAppeals(limit = 50, offset = 0): Promise<APIResponse<Appeal>> {
    const url = `${this.baseUrl}/appeal/?limit=${limit}&offset=${offset}`;
    return this.fetchWithCache<APIResponse<Appeal>>(url);
  }

  async getEmergencies(limit = 50, offset = 0): Promise<APIResponse<Emergency>> {
    const url = `${this.baseUrl}/event/?limit=${limit}&offset=${offset}`;
    return this.fetchWithCache<APIResponse<Emergency>>(url);
  }

  async searchDrefsByCountry(countryIso: string, limit = 50): Promise<APIResponse<DrefOperation>> {
    const url = `${this.baseUrl}/dref/?country__iso=${countryIso}&limit=${limit}`;
    return this.fetchWithCache<APIResponse<DrefOperation>>(url);
  }

  async searchDrefsByDisasterType(disasterType: string, limit = 50): Promise<APIResponse<DrefOperation>> {
    const url = `${this.baseUrl}/dref/?disaster_type__name__icontains=${encodeURIComponent(disasterType)}&limit=${limit}`;
    return this.fetchWithCache<APIResponse<DrefOperation>>(url);
  }

  async getDrefStatistics(): Promise<{
    total_operations: number;
    total_requested: number;
    total_funded: number;
    active_operations: number;
  }> {
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
      throw new Error(`Failed to calculate DREF statistics: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}

const server = new Server(
  {
    name: 'ifrc-go-admin-mcp-server',
    version: '1.0.0',
    description: 'MCP server for IFRC GO Admin API access'
  },
  {
    capabilities: {
      tools: {}
    }
  }
);

const apiClient = new IFRCAPIClient();

const tools: Tool[] = [
  {
    name: 'get_completed_drefs',
    description: 'Retrieve completed DREF (Disaster Relief Emergency Fund) operations',
    inputSchema: {
      type: 'object',
      properties: {
        limit: {
          type: 'number',
          description: 'Maximum number of results to return (default: 50)',
          default: 50
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
          description: 'Maximum number of results to return (default: 50)',
          default: 50
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
          description: 'Maximum number of results to return (default: 50)',
          default: 50
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
          description: 'Maximum number of results to return (default: 50)',
          default: 50
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
          description: 'Maximum number of results to return (default: 50)',
          default: 50
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
          description: 'Maximum number of results to return (default: 50)',
          default: 50
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

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return { tools };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  try {
    const { name, arguments: args } = request.params;

    switch (name) {
      case 'get_completed_drefs': {
        const limit = (args?.limit as number) || 50;
        const offset = (args?.offset as number) || 0;
        const result = await apiClient.getCompletedDrefs(limit, offset);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2)
            }
          ]
        };
      }

      case 'get_ongoing_drefs': {
        const limit = (args?.limit as number) || 50;
        const offset = (args?.offset as number) || 0;
        const result = await apiClient.getOngoingDrefs(limit, offset);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2)
            }
          ]
        };
      }

      case 'get_appeals': {
        const limit = (args?.limit as number) || 50;
        const offset = (args?.offset as number) || 0;
        const result = await apiClient.getAppeals(limit, offset);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2)
            }
          ]
        };
      }

      case 'get_emergencies': {
        const limit = (args?.limit as number) || 50;
        const offset = (args?.offset as number) || 0;
        const result = await apiClient.getEmergencies(limit, offset);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2)
            }
          ]
        };
      }

      case 'search_drefs_by_country': {
        const { country_iso, limit = 50 } = args || {};
        if (!country_iso) {
          throw new Error('country_iso parameter is required');
        }
        const result = await apiClient.searchDrefsByCountry(country_iso as string, limit as number);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2)
            }
          ]
        };
      }

      case 'search_drefs_by_disaster_type': {
        const { disaster_type, limit = 50 } = args || {};
        if (!disaster_type) {
          throw new Error('disaster_type parameter is required');
        }
        const result = await apiClient.searchDrefsByDisasterType(disaster_type as string, limit as number);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2)
            }
          ]
        };
      }

      case 'get_dref_statistics': {
        const result = await apiClient.getDrefStatistics();
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2)
            }
          ]
        };
      }

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: `Error: ${error instanceof Error ? error.message : 'Unknown error occurred'}`
        }
      ],
      isError: true
    };
  }
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('IFRC GO Admin MCP Server running on stdio');
}

if (require.main === module) {
  main().catch((error) => {
    console.error('Server error:', error);
    process.exit(1);
  });
}