// Workflow definitions for Phase 3 implementation
export const workflowDefinitions = {
  // Simple 2-step workflows for Checkpoint 1 & 2
  location_weather: {
    name: "Current Location Weather",
    description: "Get weather for current location",
    steps: [
      {
        id: "get_location",
        operation: "getCurrentLocation",
        parameters: {},
        outputMapping: {
          "country": "location.country",
          "city": "location.city"
        }
      },
      {
        id: "get_weather", 
        operation: "getCurrentWeather",
        parameters: {
          "q": "${get_location.city}"
        },
        dependencies: ["get_location"]
      }
    ],
    aggregation: {
      format: "combined",
      includeSteps: true
    }
  },

  currency_location: {
    name: "Currency Rates for Current Location",
    description: "Get local currency exchange rates",
    steps: [
      {
        id: "get_location",
        operation: "getCurrentLocation", 
        parameters: {},
        outputMapping: {
          "countryCode": "location.country"
        }
      },
      {
        id: "get_rates",
        operation: "getExchangeRates",
        parameters: {
          "base": "USD"
        },
        dependencies: ["get_location"]
      }
    ],
    aggregation: {
      format: "combined"
    }
  },

  // Test workflow for basic functionality
  quick_info: {
    name: "Quick Information",
    description: "Get random fact and current location",
    steps: [
      {
        id: "get_fact",
        operation: "getRandomFact",
        parameters: {}
      },
      {
        id: "get_location",
        operation: "getCurrentLocation",
        parameters: {}
      }
    ],
    aggregation: {
      format: "combined"
    }
  },

  // CHECKPOINT 3: Complex multi-step workflows (3+ APIs)
  trip_planning: {
    name: "Trip Planning Assistant",
    description: "Comprehensive trip information for destination",
    steps: [
      {
        id: "get_current_location",
        operation: "getCurrentLocation",
        parameters: {}
      },
      {
        id: "get_exchange_rate",
        operation: "getExchangeRates",
        parameters: {
          "base": "USD"
        }
      },
      {
        id: "get_destination_weather",
        operation: "getCurrentWeather",
        parameters: {
          "q": "${parameters.destination}"
        },
        conditional: {
          "executeIf": "parameters.destination",
          "fallback": {
            "q": "Tokyo"
          }
        }
      },
      {
        id: "get_destination_news",
        operation: "getTopHeadlines",
        parameters: {
          "country": "us",
          "category": "business"
        },
        dependencies: ["get_destination_weather"],
        conditional: {
          "executeIf": "previous_steps_successful",
          "maxRetries": 2
        },
        optional: true
      }
    ],
    aggregation: {
      format: "travel_summary",
      includeMetadata: true
    }
  },

  market_overview: {
    name: "Market Overview",
    description: "Currency rates, financial news, and economic facts",
    steps: [
      {
        id: "get_usd_rates",
        operation: "getExchangeRates",
        parameters: {
          "base": "USD"
        }
      },
      {
        id: "get_financial_news",
        operation: "getTopHeadlines",
        parameters: {
          "category": "business",
          "country": "us"
        },
        optional: true
      },
      {
        id: "get_economic_fact",
        operation: "getRandomFact",
        parameters: {}
      }
    ],
    aggregation: {
      format: "market_report",
      sections: ["currency", "news", "trivia"]
    }
  },

  comprehensive_location_info: {
    name: "Complete Location Analysis",
    description: "Everything about current or specified location",
    steps: [
      {
        id: "get_location",
        operation: "getCurrentLocation",
        parameters: {}
      },
      {
        id: "get_weather",
        operation: "getCurrentWeather",
        parameters: {
          "q": "${get_location.city}"
        },
        dependencies: ["get_location"]
      },
      {
        id: "get_local_news",
        operation: "getTopHeadlines",
        parameters: {
          "country": "us",
          "category": "general"
        },
        dependencies: ["get_location"],
        conditional: {
          "executeIf": "news_api_available"
        },
        optional: true
      },
      {
        id: "get_random_fact",
        operation: "getRandomFact",
        parameters: {}
      }
    ],
    aggregation: {
      format: "location_report",
      sections: ["location", "weather", "news", "trivia"]
    }
  },

  // Test workflow with intentional error for recovery testing
  test_recovery: {
    name: "Error Recovery Test",
    description: "Test workflow error recovery mechanisms",
    steps: [
      {
        id: "get_location",
        operation: "getCurrentLocation",
        parameters: {}
      },
      {
        id: "simulate_error",
        operation: "getRandomFact",
        parameters: {
          "intentionalError": true
        },
        optional: true,
        conditional: {
          "executeIf": "parameters.simulateError"
        }
      },
      {
        id: "get_fact",
        operation: "getRandomFact",
        parameters: {}
      }
    ],
    aggregation: {
      format: "recovery_test",
      allowPartialSuccess: true
    }
  }
};

// Workflow patterns for intent detection
export const workflowPatterns = {
  patterns: [
    {
      regex: /weather\s+(at\s+my\s+location|here|current|where\s+i\s+am)/i,
      workflow: "location_weather",
      description: "Weather at current location"
    },
    {
      regex: /currency.*location|rates.*location|location.*currency|location.*rates/i,
      workflow: "currency_location",
      description: "Currency rates for current location"
    },
    {
      regex: /(quick|basic|simple)\s+(info|information)/i,
      workflow: "quick_info",
      description: "Quick information summary"
    },
    {
      regex: /find\s+restaurants?\s+in\s+(\w+)/i,
      workflow: "location_weather", // Placeholder - would be restaurant finder
      parameterExtraction: {
        location: 1
      },
      description: "Find restaurants (placeholder workflow)"
    },
    // CHECKPOINT 3: Complex workflow patterns
    {
      regex: /(trip|travel|visit|plan.*trip).*?(to|in)\s+(\w+)/i,
      workflow: "trip_planning",
      parameterExtraction: {
        destination: 3
      },
      description: "Trip planning for destination"
    },
    {
      regex: /(market|financial|economy|business)\s+(overview|summary|analysis)/i,
      workflow: "market_overview",
      description: "Market and financial overview"
    },
    {
      regex: /(everything|all|complete|full|comprehensive).*?(about|info|information).*?(location|where|here)/i,
      workflow: "comprehensive_location_info",
      description: "Complete location analysis"
    },
    {
      regex: /what.*should.*know.*about.*(\w+)/i,
      workflow: "comprehensive_location_info",
      parameterExtraction: {
        location: 1
      },
      description: "Comprehensive information about location"
    }
  ],

  // Keywords that suggest workflow vs single API
  workflowIndicators: [
    'at my location',
    'where i am',
    'current location',
    'here',
    'find restaurants',
    'plan trip',
    'everything about',
    'comprehensive',
    'complete information',
    // CHECKPOINT 3: Complex workflow indicators
    'trip planning',
    'travel to',
    'visit',
    'market overview',
    'financial summary',
    'business analysis',
    'complete analysis',
    'full information',
    'what should i know'
  ],

  // Keywords that definitely indicate single API
  singleApiIndicators: [
    'weather in tokyo',
    'weather in london', 
    'convert usd to eur',
    'latest news',
    'random fact',
    'exchange rates'
  ]
};

// Workflow metadata for planning and estimation
export const workflowMetadata = {
  location_weather: {
    estimatedTime: 4000, // 4 seconds
    complexity: 'simple',
    apiTypes: ['geolocation', 'weather'],
    requiresAuth: ['weather']
  },
  
  currency_location: {
    estimatedTime: 3000, // 3 seconds
    complexity: 'simple', 
    apiTypes: ['geolocation', 'currency'],
    requiresAuth: []
  },
  
  quick_info: {
    estimatedTime: 2500, // 2.5 seconds
    complexity: 'simple',
    apiTypes: ['facts', 'geolocation'],
    requiresAuth: []
  }
};