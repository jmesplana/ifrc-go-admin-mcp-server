import { z } from 'zod';
import { createMcpHandler } from 'mcp-handler';

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

const handler = createMcpHandler(
  (server) => {
    // Get completed DREF operations
    server.tool(
      'get_completed_drefs',
      'Retrieve completed DREF (Disaster Relief Emergency Fund) operations',
      {
        limit: z.number().int().min(1).max(1000).optional().default(20),
        offset: z.number().int().min(0).optional().default(0)
      },
      async ({ limit, offset }) => {
        try {
          const result = await apiClient.getCompletedDrefs(limit, offset);
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(result, null, 2)
              }
            ]
          };
        } catch (error) {
          return {
            content: [
              {
                type: 'text',
                text: `Error: ${error.message}`
              }
            ],
            isError: true
          };
        }
      }
    );

    // Get ongoing DREF operations
    server.tool(
      'get_ongoing_drefs',
      'Get currently active DREF operations',
      {
        limit: z.number().int().min(1).max(1000).optional().default(20),
        offset: z.number().int().min(0).optional().default(0)
      },
      async ({ limit, offset }) => {
        try {
          const result = await apiClient.getOngoingDrefs(limit, offset);
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(result, null, 2)
              }
            ]
          };
        } catch (error) {
          return {
            content: [
              {
                type: 'text',
                text: `Error: ${error.message}`
              }
            ],
            isError: true
          };
        }
      }
    );

    // Get appeals
    server.tool(
      'get_appeals',
      'Access humanitarian appeals for funding',
      {
        limit: z.number().int().min(1).max(1000).optional().default(20),
        offset: z.number().int().min(0).optional().default(0)
      },
      async ({ limit, offset }) => {
        try {
          const result = await apiClient.getAppeals(limit, offset);
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(result, null, 2)
              }
            ]
          };
        } catch (error) {
          return {
            content: [
              {
                type: 'text',
                text: `Error: ${error.message}`
              }
            ],
            isError: true
          };
        }
      }
    );

    // Get emergencies
    server.tool(
      'get_emergencies',
      'Query emergency events and disasters',
      {
        limit: z.number().int().min(1).max(1000).optional().default(20),
        offset: z.number().int().min(0).optional().default(0)
      },
      async ({ limit, offset }) => {
        try {
          const result = await apiClient.getEmergencies(limit, offset);
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(result, null, 2)
              }
            ]
          };
        } catch (error) {
          return {
            content: [
              {
                type: 'text',
                text: `Error: ${error.message}`
              }
            ],
            isError: true
          };
        }
      }
    );

    // Search DREFs by country
    server.tool(
      'search_drefs_by_country',
      'Find DREF operations by country ISO code',
      {
        country_iso: z.string().min(2).max(3),
        limit: z.number().int().min(1).max(1000).optional().default(20)
      },
      async ({ country_iso, limit }) => {
        try {
          const result = await apiClient.searchDrefsByCountry(country_iso, limit);
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(result, null, 2)
              }
            ]
          };
        } catch (error) {
          return {
            content: [
              {
                type: 'text',
                text: `Error: ${error.message}`
              }
            ],
            isError: true
          };
        }
      }
    );

    // Search DREFs by disaster type
    server.tool(
      'search_drefs_by_disaster_type',
      'Search DREF operations by disaster type (flood, earthquake, cyclone, etc.)',
      {
        disaster_type: z.string().min(1),
        limit: z.number().int().min(1).max(1000).optional().default(20)
      },
      async ({ disaster_type, limit }) => {
        try {
          const result = await apiClient.searchDrefsByDisasterType(disaster_type, limit);
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(result, null, 2)
              }
            ]
          };
        } catch (error) {
          return {
            content: [
              {
                type: 'text',
                text: `Error: ${error.message}`
              }
            ],
            isError: true
          };
        }
      }
    );

    // Get DREF statistics
    server.tool(
      'get_dref_statistics',
      'Get summary statistics about DREF operations',
      {},
      async () => {
        try {
          const result = await apiClient.getDrefStatistics();
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(result, null, 2)
              }
            ]
          };
        } catch (error) {
          return {
            content: [
              {
                type: 'text',
                text: `Error: ${error.message}`
              }
            ],
            isError: true
          };
        }
      }
    );
  },
  {
    name: 'ifrc-go-admin-mcp-server',
    version: '1.0.0',
    description: 'MCP server for IFRC GO Admin API access to humanitarian data'
  },
  { basePath: '/api' }
);

export { handler as GET, handler as POST, handler as DELETE };