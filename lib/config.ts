export const CONFIG = {
  // Rate limits (requests per minute)
  rateLimits: {
    enabled: true, // Flag to enable/disable rate limiting
    search: 10,
    contentFetch: 20,
    reportGeneration: 5,
    agentOptimizations: 10,
  },

  // Search settings
  search: {
    resultsPerPage: 10,
    maxSelectableResults: 3,
    provider: 'google' as 'google' | 'bing' | 'exa', // Default search provider
    safeSearch: {
      google: 'active' as 'active' | 'off',
      bing: 'moderate' as 'moderate' | 'strict' | 'off',
    },
    market: 'en-US',
  },

  // AI Platform settings
  platforms: {
    google: {
      enabled: true,
      models: {
        'google/gemini-2.0-flash-lite-preview-02-05:free': {
          enabled: true,
          label: 'Gemini Flash',
        },
        'google/gemini-2.0-flash-thinking-exp:free': {
          enabled: true,
          label: 'Gemini Flash Thinking',
        },
        'google/gemini-exp-1206:free': {
          enabled: true,
          label: 'Gemini Exp',
        },
      },
    },
    openai: {
      enabled: true,
      models: {
        'openai/gpt-4o': {
          enabled: true,
          label: 'GPT-4o',
        },
        'openai/o1-mini': {
          enabled: true,
          label: 'o1-mini',
        },
        "openai/o1": {
          enabled: true,
          label: 'o1',
        },
      },
    },
    anthropic: {
      enabled: true,
      models: {
        'anthropic/claude-3.7-sonnet': {
          enabled: true,
          label: 'Claude 3.7 Sonnet',
        },
        'anthropic/claude-3.5-haiku': {
          enabled: true,
          label: 'Claude 3.5 Haiku',
        },
      },
    },
    deepseek: {
      enabled: true,
      models: {
        "deepseek/deepseek-chat": {
          enabled: true,
          label: 'Deepseek Chat',
        },
        "deepseek/deepseek-r1": {
          enabled: true,
          label: 'Deepseek R1',
        },
      },
    },
  },
} as const
