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
      
      // Get token from environment variable or use a default for demo
      const token = process.env.IFRC_API_TOKEN || 'abc123def456';
      
      const headers = {
        'Authorization': `Token ${token}`,
        'Accept': 'application/json',
        'User-Agent': 'IFRC-GO-Admin-MCP-Server/1.0.0'
      };

      const response = await fetch(url, { headers });
      
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

  // New endpoints for enhanced functionality
  async getCountries(limit = 20, offset = 0) {
    const url = `${this.baseUrl}/country/?limit=${limit}&offset=${offset}`;
    return this.fetchWithCache(url);
  }

  async getCountryProfile(countryId) {
    const url = `${this.baseUrl}/country/${countryId}/`;
    return this.fetchWithCache(url);
  }

  async getRegions(limit = 20, offset = 0) {
    const url = `${this.baseUrl}/region/?limit=${limit}&offset=${offset}`;
    return this.fetchWithCache(url);
  }

  async getDisasterTypes(limit = 20, offset = 0) {
    const url = `${this.baseUrl}/disaster_type/?limit=${limit}&offset=${offset}`;
    return this.fetchWithCache(url);
  }

  async searchOperationsByDateRange(startDate, endDate, limit = 20) {
    const url = `${this.baseUrl}/event/?disaster_start_date__gte=${startDate}&disaster_start_date__lte=${endDate}&limit=${limit}`;
    return this.fetchWithCache(url);
  }

  async getOperationsByCountry(countryId, limit = 20) {
    const url = `${this.baseUrl}/event/?countries__in=${countryId}&limit=${limit}`;
    return this.fetchWithCache(url);
  }

  async getFieldReports(limit = 20, offset = 0) {
    const url = `${this.baseUrl}/field_report/?limit=${limit}&offset=${offset}`;
    return this.fetchWithCache(url);
  }

  async searchFieldReportsByCountry(countryId, limit = 20) {
    const url = `${this.baseUrl}/field_report/?countries=${countryId}&limit=${limit}`;
    return this.fetchWithCache(url);
  }

  // Personnel and Deployment endpoints
  async getPersonnelDeployments(limit = 20, offset = 0) {
    const url = `${this.baseUrl}/personnel/?limit=${limit}&offset=${offset}`;
    return this.fetchWithCache(url);
  }

  async getPersonnelByCountry(countryId, limit = 20) {
    const url = `${this.baseUrl}/personnel/?country_deployed_to=${countryId}&limit=${limit}`;
    return this.fetchWithCache(url);
  }

  async getPersonnelByType(type, limit = 20) {
    const url = `${this.baseUrl}/personnel/?type=${type}&limit=${limit}`;
    return this.fetchWithCache(url);
  }

  // Situational Updates and Reporting
  async getSituationReports(limit = 20, offset = 0) {
    const url = `${this.baseUrl}/situation_report/?limit=${limit}&offset=${offset}`;
    return this.fetchWithCache(url);
  }

  async getSituationReportsByCountry(countryId, limit = 20) {
    const url = `${this.baseUrl}/situation_report/?countries=${countryId}&limit=${limit}`;
    return this.fetchWithCache(url);
  }

  // Project and Programme data
  async getProjects(limit = 20, offset = 0) {
    const url = `${this.baseUrl}/project/?limit=${limit}&offset=${offset}`;
    return this.fetchWithCache(url);
  }

  async getProjectsByCountry(countryId, limit = 20) {
    const url = `${this.baseUrl}/project/?project_country=${countryId}&limit=${limit}`;
    return this.fetchWithCache(url);
  }

  // Surge deployments
  async getSurgeDeployments(limit = 20, offset = 0) {
    const url = `${this.baseUrl}/surge_deployment/?limit=${limit}&offset=${offset}`;
    return this.fetchWithCache(url);
  }

  // Flash Updates - rapid situation updates
  async getFlashUpdates(limit = 20, offset = 0) {
    const url = `${this.baseUrl}/flash_update/?limit=${limit}&offset=${offset}`;
    return this.fetchWithCache(url);
  }

  async getFlashUpdatesByCountry(countryId, limit = 20) {
    const url = `${this.baseUrl}/flash_update/?countries=${countryId}&limit=${limit}`;
    return this.fetchWithCache(url);
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

    // Get countries
    server.tool(
      'get_countries',
      'Get list of countries with basic profile information',
      {
        limit: z.number().int().min(1).max(1000).optional().default(20),
        offset: z.number().int().min(0).optional().default(0)
      },
      async ({ limit, offset }) => {
        try {
          const result = await apiClient.getCountries(limit, offset);
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

    // Get country profile
    server.tool(
      'get_country_profile',
      'Get detailed country profile including risk indicators and operational data',
      {
        country_id: z.number().int().min(1)
      },
      async ({ country_id }) => {
        try {
          const result = await apiClient.getCountryProfile(country_id);
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

    // Get regions
    server.tool(
      'get_regions',
      'Get regional classifications and operational areas',
      {
        limit: z.number().int().min(1).max(1000).optional().default(20),
        offset: z.number().int().min(0).optional().default(0)
      },
      async ({ limit, offset }) => {
        try {
          const result = await apiClient.getRegions(limit, offset);
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

    // Get disaster types
    server.tool(
      'get_disaster_types',
      'Get available disaster types and classifications',
      {
        limit: z.number().int().min(1).max(1000).optional().default(20),
        offset: z.number().int().min(0).optional().default(0)
      },
      async ({ limit, offset }) => {
        try {
          const result = await apiClient.getDisasterTypes(limit, offset);
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

    // Search operations by date range
    server.tool(
      'search_operations_by_date_range',
      'Search emergency operations within a specific date range',
      {
        start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'),
        end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'),
        limit: z.number().int().min(1).max(1000).optional().default(20)
      },
      async ({ start_date, end_date, limit }) => {
        try {
          const result = await apiClient.searchOperationsByDateRange(start_date, end_date, limit);
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

    // Get operations by country
    server.tool(
      'get_operations_by_country',
      'Get emergency operations for a specific country',
      {
        country_id: z.number().int().min(1),
        limit: z.number().int().min(1).max(1000).optional().default(20)
      },
      async ({ country_id, limit }) => {
        try {
          const result = await apiClient.getOperationsByCountry(country_id, limit);
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

    // Get field reports
    server.tool(
      'get_field_reports',
      'Get field reports from humanitarian operations',
      {
        limit: z.number().int().min(1).max(1000).optional().default(20),
        offset: z.number().int().min(0).optional().default(0)
      },
      async ({ limit, offset }) => {
        try {
          const result = await apiClient.getFieldReports(limit, offset);
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

    // Search field reports by country
    server.tool(
      'search_field_reports_by_country',
      'Get field reports for a specific country',
      {
        country_id: z.number().int().min(1),
        limit: z.number().int().min(1).max(1000).optional().default(20)
      },
      async ({ country_id, limit }) => {
        try {
          const result = await apiClient.searchFieldReportsByCountry(country_id, limit);
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

    // Personnel Deployments
    server.tool(
      'get_personnel_deployments',
      'Get personnel deployments and humanitarian workforce data',
      {
        limit: z.number().int().min(1).max(1000).optional().default(20),
        offset: z.number().int().min(0).optional().default(0)
      },
      async ({ limit, offset }) => {
        try {
          const result = await apiClient.getPersonnelDeployments(limit, offset);
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

    // Personnel by country
    server.tool(
      'get_personnel_by_country',
      'Get personnel deployed to a specific country',
      {
        country_id: z.number().int().min(1),
        limit: z.number().int().min(1).max(1000).optional().default(20)
      },
      async ({ country_id, limit }) => {
        try {
          const result = await apiClient.getPersonnelByCountry(country_id, limit);
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

    // Personnel by type
    server.tool(
      'get_personnel_by_type',
      'Get personnel deployments by type (RIT, ERU, Surge, etc.)',
      {
        type: z.string().min(1),
        limit: z.number().int().min(1).max(1000).optional().default(20)
      },
      async ({ type, limit }) => {
        try {
          const result = await apiClient.getPersonnelByType(type, limit);
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

    // Situation Reports
    server.tool(
      'get_situation_reports',
      'Get official situation reports from operations',
      {
        limit: z.number().int().min(1).max(1000).optional().default(20),
        offset: z.number().int().min(0).optional().default(0)
      },
      async ({ limit, offset }) => {
        try {
          const result = await apiClient.getSituationReports(limit, offset);
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

    // Situation Reports by country
    server.tool(
      'get_situation_reports_by_country',
      'Get situation reports for a specific country',
      {
        country_id: z.number().int().min(1),
        limit: z.number().int().min(1).max(1000).optional().default(20)
      },
      async ({ country_id, limit }) => {
        try {
          const result = await apiClient.getSituationReportsByCountry(country_id, limit);
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

    // Projects
    server.tool(
      'get_projects',
      'Get humanitarian projects and programmes',
      {
        limit: z.number().int().min(1).max(1000).optional().default(20),
        offset: z.number().int().min(0).optional().default(0)
      },
      async ({ limit, offset }) => {
        try {
          const result = await apiClient.getProjects(limit, offset);
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

    // Projects by country
    server.tool(
      'get_projects_by_country',
      'Get humanitarian projects for a specific country',
      {
        country_id: z.number().int().min(1),
        limit: z.number().int().min(1).max(1000).optional().default(20)
      },
      async ({ country_id, limit }) => {
        try {
          const result = await apiClient.getProjectsByCountry(country_id, limit);
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

    // Surge Deployments
    server.tool(
      'get_surge_deployments',
      'Get surge capacity deployments and rapid response teams',
      {
        limit: z.number().int().min(1).max(1000).optional().default(20),
        offset: z.number().int().min(0).optional().default(0)
      },
      async ({ limit, offset }) => {
        try {
          const result = await apiClient.getSurgeDeployments(limit, offset);
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

    // Flash Updates
    server.tool(
      'get_flash_updates',
      'Get rapid flash updates and breaking news from operations',
      {
        limit: z.number().int().min(1).max(1000).optional().default(20),
        offset: z.number().int().min(0).optional().default(0)
      },
      async ({ limit, offset }) => {
        try {
          const result = await apiClient.getFlashUpdates(limit, offset);
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

    // Flash Updates by country
    server.tool(
      'get_flash_updates_by_country',
      'Get flash updates for a specific country',
      {
        country_id: z.number().int().min(1),
        limit: z.number().int().min(1).max(1000).optional().default(20)
      },
      async ({ country_id, limit }) => {
        try {
          const result = await apiClient.getFlashUpdatesByCountry(country_id, limit);
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