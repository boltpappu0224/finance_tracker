interface MerchantInfo {
  name: string;
  alternateNames: string[];
  category: string;
  icon: string;
  website?: string;
  phone?: string;
  frequency: number;
  lastSeen: Date;
}

const initialMerchants: { [key: string]: MerchantInfo } = {
  zomato: {
    name: 'Zomato',
    alternateNames: ['ZOMATO', 'zomato.com', 'Zomato Food'],
    category: 'food_dining',
    icon: '🍔',
    website: 'zomato.com',
    frequency: 0,
    lastSeen: new Date(),
  },
  swiggy: {
    name: 'Swiggy',
    alternateNames: ['SWIGGY', 'swiggy.in', 'Swiggy Delivery'],
    category: 'food_dining',
    icon: '🍕',
    website: 'swiggy.in',
    frequency: 0,
    lastSeen: new Date(),
  },
  amazon: {
    name: 'Amazon',
    alternateNames: ['AMAZON', 'amazon.in', 'Amazon Prime'],
    category: 'shopping',
    icon: '📦',
    website: 'amazon.in',
    frequency: 0,
    lastSeen: new Date(),
  },
  flipkart: {
    name: 'Flipkart',
    alternateNames: ['FLIPKART', 'flipkart.com', 'FK'],
    category: 'shopping',
    icon: '🛍️',
    website: 'flipkart.com',
    frequency: 0,
    lastSeen: new Date(),
  },
  uber: {
    name: 'Uber',
    alternateNames: ['UBER', 'UBER TRIP', 'UBER EATS'],
    category: 'transportation',
    icon: '🚗',
    website: 'uber.com',
    frequency: 0,
    lastSeen: new Date(),
  },
  ola: {
    name: 'Ola',
    alternateNames: ['OLA', 'OLA CABS', 'OLA RIDE'],
    category: 'transportation',
    icon: '🚕',
    website: 'olarides.com',
    frequency: 0,
    lastSeen: new Date(),
  },
  netflix: {
    name: 'Netflix',
    alternateNames: ['NETFLIX', 'netflix.com'],
    category: 'entertainment',
    icon: '🎬',
    website: 'netflix.com',
    frequency: 0,
    lastSeen: new Date(),
  },
  spotify: {
    name: 'Spotify',
    alternateNames: ['SPOTIFY', 'spotify.com'],
    category: 'entertainment',
    icon: '🎵',
    website: 'spotify.com',
    frequency: 0,
    lastSeen: new Date(),
  },
  bigbasket: {
    name: 'BigBasket',
    alternateNames: ['BIGBASKET', 'bigbasket.com'],
    category: 'groceries',
    icon: '🛒',
    website: 'bigbasket.com',
    frequency: 0,
    lastSeen: new Date(),
  },
  dmart: {
    name: 'DMart',
    alternateNames: ['DMART', 'D MART'],
    category: 'groceries',
    icon: '🏪',
    frequency: 0,
    lastSeen: new Date(),
  },
  jiomart: {
    name: 'JioMart',
    alternateNames: ['JIOMART', 'Jio Mart'],
    category: 'groceries',
    icon: '🛍️',
    website: 'jiomart.com',
    frequency: 0,
    lastSeen: new Date(),
  },
  bookmyshow: {
    name: 'BookMyShow',
    alternateNames: ['BOOKMYSHOW', 'bms', 'Movie Tickets'],
    category: 'entertainment',
    icon: '🎫',
    website: 'bookmyshow.com',
    frequency: 0,
    lastSeen: new Date(),
  },
  makemytrip: {
    name: 'MakeMyTrip',
    alternateNames: ['MAKEMYTRIP', 'mmt', 'Flight Booking'],
    category: 'travel',
    icon: '✈️',
    website: 'makemytrip.com',
    frequency: 0,
    lastSeen: new Date(),
  },
  oyo: {
    name: 'OYO',
    alternateNames: ['OYO HOTELS', 'OYO', 'Hotel Booking'],
    category: 'travel',
    icon: '🏨',
    website: 'oyo.com',
    frequency: 0,
    lastSeen: new Date(),
  },
  fastag: {
    name: 'FASTag',
    alternateNames: ['FASTAG', 'Toll'],
    category: 'transportation',
    icon: '🛣️',
    frequency: 0,
    lastSeen: new Date(),
  },
  indigo: {
    name: 'IndiGo Airlines',
    alternateNames: ['INDIGO', '6E', 'Flight'],
    category: 'travel',
    icon: '✈️',
    website: 'goindigo.in',
    frequency: 0,
    lastSeen: new Date(),
  },
};

export class MerchantDatabase {
  private merchants: Map<string, MerchantInfo> = new Map();

  constructor() {
    Object.entries(initialMerchants).forEach(([key, merchant]) => {
      this.merchants.set(key, merchant);
      merchant.alternateNames.forEach((alt) => {
        this.merchants.set(alt.toLowerCase(), merchant);
      });
    });
  }

  search(query: string, limit: number = 10): MerchantInfo[] {
    if (!query || query.length < 2) return [];

    const queryLower = query.toLowerCase();
    const results: { merchant: MerchantInfo; score: number }[] = [];
    const seen = new Set<string>();

    this.merchants.forEach((merchant, key) => {
      if (seen.has(merchant.name)) return;
      seen.add(merchant.name);

      let score = 0;

      if (merchant.name.toLowerCase() === queryLower) {
        score = 100;
      } else if (merchant.name.toLowerCase().startsWith(queryLower)) {
        score = 80 + ((merchant.name.length - queryLower.length) * -5);
      } else if (merchant.name.toLowerCase().includes(queryLower)) {
        score = 60 + ((merchant.name.length - queryLower.length) * -2);
      } else if (key.includes(queryLower)) {
        score = 40;
      } else {
        const similarity = this.calculateSimilarity(queryLower, merchant.name.toLowerCase());
        if (similarity > 0.6) {
          score = similarity * 50;
        }
      }

      score += merchant.frequency * 2;

      if (score > 0) {
        results.push({ merchant, score });
      }
    });

    return results
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map((r) => r.merchant);
  }

  private calculateSimilarity(query: string, name: string): number {
    const queryWords = query.split(/\s+/);
    const nameWords = name.split(/\s+/);

    const matches = queryWords.filter((qw) =>
      nameWords.some((nw) => nw.startsWith(qw))
    );

    return matches.length / Math.max(queryWords.length, 1);
  }

  addMerchant(merchant: MerchantInfo): void {
    const key = merchant.name.toLowerCase().replace(/\s+/g, '');
    this.merchants.set(key, merchant);

    merchant.alternateNames.forEach((alt) => {
      this.merchants.set(alt.toLowerCase(), merchant);
    });
  }

  recordTransaction(merchantName: string): void {
    const merchant = this.findMerchant(merchantName);
    if (merchant) {
      merchant.frequency += 1;
      merchant.lastSeen = new Date();
    }
  }

  findMerchant(query: string): MerchantInfo | undefined {
    const normalized = query.toLowerCase();
    return this.merchants.get(normalized);
  }

  suggestCategory(merchantName: string): string | undefined {
    const merchant = this.findMerchant(merchantName);
    return merchant?.category;
  }

  getMerchantsByCategory(category: string): MerchantInfo[] {
    const merchants = new Map<string, MerchantInfo>();

    this.merchants.forEach((merchant) => {
      if (merchant.category === category) {
        merchants.set(merchant.name, merchant);
      }
    });

    return Array.from(merchants.values());
  }

  getFrequentMerchants(limit: number = 20): MerchantInfo[] {
    const merchants = new Map<string, MerchantInfo>();

    this.merchants.forEach((merchant) => {
      if (!merchants.has(merchant.name)) {
        merchants.set(merchant.name, merchant);
      }
    });

    return Array.from(merchants.values())
      .sort((a, b) => b.frequency - a.frequency)
      .slice(0, limit);
  }

  exportDatabase(): MerchantInfo[] {
    const merchants = new Map<string, MerchantInfo>();

    this.merchants.forEach((merchant) => {
      if (!merchants.has(merchant.name)) {
        merchants.set(merchant.name, merchant);
      }
    });

    return Array.from(merchants.values());
  }
}

export const merchantDatabase = new MerchantDatabase();

export function normalizeMerchantName(merchant: string): string {
  return merchant
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/[^\w\s]/g, '');
}

export function extractMerchantDomain(merchantEmail: string): string | null {
  const match = merchantEmail.match(/@([a-zA-Z0-9.-]+)/);
  return match ? match[1] : null;
}

export function suggestMerchantMatch(
  inputMerchant: string,
  candidates: string[]
): string | null {
  const normalized = normalizeMerchantName(inputMerchant);

  for (const candidate of candidates) {
    const normalizedCandidate = normalizeMerchantName(candidate);
    if (normalizedCandidate === normalized) {
      return candidate;
    }

    if (normalizedCandidate.includes(normalized) || normalized.includes(normalizedCandidate)) {
      return candidate;
    }
  }

  return null;
}
