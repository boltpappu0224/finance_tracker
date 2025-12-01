import { Database } from '../lib/database.types';

type Transaction = Database['public']['Tables']['transactions']['Row'];

export interface TransactionFilter {
  userId?: string;
  accountId?: string;
  categoryId?: string;
  startDate?: Date;
  endDate?: Date;
  minAmount?: number;
  maxAmount?: number;
  type?: 'income' | 'expense' | 'transfer';
  merchant?: string;
  tags?: string[];
  description?: string;
  source?: 'manual' | 'sms' | 'ocr' | 'import' | 'api';
  isRecurring?: boolean;
  sortBy?: 'date' | 'amount' | 'merchant' | 'created';
  sortOrder?: 'asc' | 'desc';
}

export interface SearchResult {
  transactions: Transaction[];
  total: number;
  filters: TransactionFilter;
  executionTime: number;
}

export class TransactionSearchEngine {
  search(transactions: Transaction[], filters: TransactionFilter): SearchResult {
    const startTime = Date.now();

    let results = [...transactions];

    if (filters.userId) {
      results = results.filter((t) => t.user_id === filters.userId);
    }

    if (filters.accountId) {
      results = results.filter((t) => t.account_id === filters.accountId);
    }

    if (filters.categoryId) {
      results = results.filter((t) => t.category_id === filters.categoryId);
    }

    if (filters.type) {
      results = results.filter((t) => t.type === filters.type);
    }

    if (filters.startDate) {
      const startDateStr = filters.startDate.toISOString().split('T')[0];
      results = results.filter((t) => t.transaction_date >= startDateStr);
    }

    if (filters.endDate) {
      const endDateStr = filters.endDate.toISOString().split('T')[0];
      results = results.filter((t) => t.transaction_date <= endDateStr);
    }

    if (filters.minAmount !== undefined) {
      results = results.filter((t) => t.amount >= filters.minAmount!);
    }

    if (filters.maxAmount !== undefined) {
      results = results.filter((t) => t.amount <= filters.maxAmount!);
    }

    if (filters.merchant) {
      const merchantLower = filters.merchant.toLowerCase();
      results = results.filter((t) =>
        t.merchant?.toLowerCase().includes(merchantLower)
      );
    }

    if (filters.description) {
      const descLower = filters.description.toLowerCase();
      results = results.filter((t) =>
        t.description?.toLowerCase().includes(descLower)
      );
    }

    if (filters.tags && filters.tags.length > 0) {
      results = results.filter((t) =>
        filters.tags!.some((tag) => t.tags.includes(tag))
      );
    }

    if (filters.source) {
      results = results.filter((t) => t.source === filters.source);
    }

    if (filters.isRecurring !== undefined) {
      results = results.filter((t) => t.is_recurring === filters.isRecurring);
    }

    results = this.sortResults(results, filters.sortBy, filters.sortOrder);

    const executionTime = Date.now() - startTime;

    return {
      transactions: results,
      total: results.length,
      filters,
      executionTime,
    };
  }

  private sortResults(
    transactions: Transaction[],
    sortBy: string = 'date',
    sortOrder: string = 'desc'
  ): Transaction[] {
    const sorted = [...transactions].sort((a, b) => {
      let compareValue = 0;

      switch (sortBy) {
        case 'amount':
          compareValue = a.amount - b.amount;
          break;
        case 'merchant':
          compareValue =
            (a.merchant || '').localeCompare(b.merchant || '') || 0;
          break;
        case 'created':
          compareValue =
            new Date(a.created_at).getTime() -
            new Date(b.created_at).getTime();
          break;
        case 'date':
        default:
          compareValue =
            new Date(a.transaction_date).getTime() -
            new Date(b.transaction_date).getTime();
          break;
      }

      return sortOrder === 'asc' ? compareValue : -compareValue;
    });

    return sorted;
  }

  fullTextSearch(
    transactions: Transaction[],
    query: string,
    fields: (keyof Transaction)[] = ['merchant', 'description']
  ): Transaction[] {
    if (!query || query.length < 2) return [];

    const queryLower = query.toLowerCase();
    const queryTerms = queryLower.split(/\s+/);

    return transactions.filter((transaction) => {
      for (const field of fields) {
        const value = transaction[field];
        if (!value) continue;

        const fieldValue = String(value).toLowerCase();
        const matches = queryTerms.filter((term) => fieldValue.includes(term));

        if (matches.length === queryTerms.length) {
          return true;
        }
      }

      return false;
    });
  }

  getMetrics(
    transactions: Transaction[],
    filters: TransactionFilter
  ): {
    totalAmount: number;
    averageAmount: number;
    count: number;
    byType: { [key: string]: number };
    byCategory: { [key: string]: number };
  } {
    const filtered = this.search(transactions, filters).transactions;

    const totalAmount = filtered.reduce((sum, t) => sum + t.amount, 0);
    const averageAmount = filtered.length > 0 ? totalAmount / filtered.length : 0;

    const byType: { [key: string]: number } = {};
    const byCategory: { [key: string]: number } = {};

    filtered.forEach((t) => {
      byType[t.type] = (byType[t.type] || 0) + t.amount;
      if (t.category_id) {
        byCategory[t.category_id] = (byCategory[t.category_id] || 0) + t.amount;
      }
    });

    return {
      totalAmount,
      averageAmount,
      count: filtered.length,
      byType,
      byCategory,
    };
  }

  groupByPeriod(
    transactions: Transaction[],
    period: 'day' | 'week' | 'month' | 'year'
  ): { [key: string]: Transaction[] } {
    const grouped: { [key: string]: Transaction[] } = {};

    transactions.forEach((transaction) => {
      const date = new Date(transaction.transaction_date);
      let key = '';

      switch (period) {
        case 'day':
          key = transaction.transaction_date;
          break;
        case 'week':
          const weekStart = new Date(date);
          weekStart.setDate(weekStart.getDate() - weekStart.getDay());
          key = weekStart.toISOString().split('T')[0];
          break;
        case 'month':
          key = transaction.transaction_date.substring(0, 7);
          break;
        case 'year':
          key = transaction.transaction_date.substring(0, 4);
          break;
      }

      if (!grouped[key]) {
        grouped[key] = [];
      }
      grouped[key].push(transaction);
    });

    return grouped;
  }

  groupByMerchant(transactions: Transaction[]): { [key: string]: Transaction[] } {
    const grouped: { [key: string]: Transaction[] } = {};

    transactions.forEach((transaction) => {
      const merchant = transaction.merchant || 'Unknown';
      if (!grouped[merchant]) {
        grouped[merchant] = [];
      }
      grouped[merchant].push(transaction);
    });

    return grouped;
  }

  groupByCategory(transactions: Transaction[]): { [key: string]: Transaction[] } {
    const grouped: { [key: string]: Transaction[] } = {};

    transactions.forEach((transaction) => {
      const categoryId = transaction.category_id || 'uncategorized';
      if (!grouped[categoryId]) {
        grouped[categoryId] = [];
      }
      grouped[categoryId].push(transaction);
    });

    return grouped;
  }

  getTrendAnalysis(
    transactions: Transaction[],
    days: number = 30
  ): {
    date: string;
    income: number;
    expense: number;
    net: number;
  }[] {
    const now = new Date();
    const startDate = new Date(now);
    startDate.setDate(startDate.getDate() - days);

    const filtered = transactions.filter((t) => {
      const tDate = new Date(t.transaction_date);
      return tDate >= startDate;
    });

    const byDay = this.groupByPeriod(filtered, 'day');
    const analysis = [];

    for (let i = 0; i <= days; i++) {
      const date = new Date(startDate);
      date.setDate(date.getDate() + i);
      const dateStr = date.toISOString().split('T')[0];

      const dayTransactions = byDay[dateStr] || [];
      const income = dayTransactions
        .filter((t) => t.type === 'income')
        .reduce((sum, t) => sum + t.amount, 0);
      const expense = dayTransactions
        .filter((t) => t.type === 'expense')
        .reduce((sum, t) => sum + t.amount, 0);

      analysis.push({
        date: dateStr,
        income,
        expense,
        net: income - expense,
      });
    }

    return analysis;
  }

  detectSpendingPatterns(
    transactions: Transaction[],
    minOccurrences: number = 3
  ): { merchant: string; frequency: number; averageAmount: number }[] {
    const patterns: { [merchant: string]: Transaction[] } = this.groupByMerchant(transactions);

    return Object.entries(patterns)
      .filter(([, txns]) => txns.length >= minOccurrences)
      .map(([merchant, txns]) => ({
        merchant,
        frequency: txns.length,
        averageAmount: txns.reduce((sum, t) => sum + t.amount, 0) / txns.length,
      }))
      .sort((a, b) => b.frequency - a.frequency);
  }
}

export const transactionSearchEngine = new TransactionSearchEngine();
