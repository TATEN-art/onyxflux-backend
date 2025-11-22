export const PLAN_LIMITS = {
  FREE: {
    apiRequests: 100000,
    novaCredits: 0,
    trialDays: 5,
    rateLimit: 100,
  },
  STARTER: {
    apiRequests: 1000000,
    novaCredits: 250,
    rateLimit: 1000,
  },
  PRO: {
    apiRequests: 10000000,
    novaCredits: 2500,
    rateLimit: 5000,
  },
  ENTERPRISE: {
    apiRequests: -1,
    novaCredits: 10000,
    rateLimit: 50000,
  },
};

export const NOVA_CREDIT_COSTS = {
  TEXT_ANSWER: 1,
  PREDICTION: 3,
  LIQUIDITY_ANALYSIS: 5,
  WHALE_SCAN: 10,
  MANIPULATION_SCAN: 20,
};
