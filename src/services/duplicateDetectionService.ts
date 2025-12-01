import { Database } from '../lib/database.types';

type Transaction = Database['public']['Tables']['transactions']['Row'];

interface DuplicateCheckOptions {
  timeWindowMinutes?: number;
  amountTolerance?: number;
  ignoreMerchant?: boolean;
}

interface DuplicateResult {
  isDuplicate: boolean;
  matchingTransactions: Transaction[];
  confidence: number;
}

export function calculateStringSimilarity(str1: string, str2: string): number {
  const s1 = str1.toLowerCase().trim();
  const s2 = str2.toLowerCase().trim();

  if (s1 === s2) return 1;

  const longer = s1.length > s2.length ? s1 : s2;
  const shorter = s1.length > s2.length ? s2 : s1;

  if (longer.length === 0) return 1;

  const editDistance = getEditDistance(shorter, longer);
  return (longer.length - editDistance) / longer.length;
}

function getEditDistance(s1: string, s2: string): number {
  const costs = [];
  for (let i = 0; i <= s1.length; i++) {
    let lastValue = i;
    for (let j = 0; j <= s2.length; j++) {
      if (i === 0) {
        costs[j] = j;
      } else if (j > 0) {
        let newValue = costs[j - 1];
        if (s1.charAt(i - 1) !== s2.charAt(j - 1)) {
          newValue = Math.min(Math.min(newValue, lastValue), costs[j]) + 1;
        }
        costs[j - 1] = lastValue;
        lastValue = newValue;
      }
    }
    if (i > 0) costs[s2.length] = lastValue;
  }
  return costs[s2.length];
}

export function detectDuplicateTransaction(
  newTransaction: Partial<Transaction>,
  existingTransactions: Transaction[],
  options: DuplicateCheckOptions = {}
): DuplicateResult {
  const {
    timeWindowMinutes = 30,
    amountTolerance = 0.01,
    ignoreMerchant = false,
  } = options;

  const matchingTransactions: Transaction[] = [];
  let maxConfidence = 0;

  const newDate = new Date(newTransaction.transaction_date || new Date());
  const timeWindowMs = timeWindowMinutes * 60 * 1000;

  for (const existing of existingTransactions) {
    const existingDate = new Date(existing.transaction_date);
    const timeDiff = Math.abs(newDate.getTime() - existingDate.getTime());

    if (timeDiff > timeWindowMs) {
      continue;
    }

    let confidence = 0;

    if (
      newTransaction.amount &&
      Math.abs(newTransaction.amount - existing.amount) <= amountTolerance
    ) {
      confidence += 0.4;
    } else {
      continue;
    }

    if (newTransaction.type === existing.type) {
      confidence += 0.2;
    }

    if (!ignoreMerchant && newTransaction.merchant && existing.merchant) {
      const merchantSimilarity = calculateStringSimilarity(
        newTransaction.merchant,
        existing.merchant
      );
      confidence += merchantSimilarity * 0.3;
    }

    if (confidence >= 0.5) {
      matchingTransactions.push(existing);
      maxConfidence = Math.max(maxConfidence, confidence);
    }
  }

  return {
    isDuplicate: matchingTransactions.length > 0 && maxConfidence >= 0.7,
    matchingTransactions,
    confidence: maxConfidence,
  };
}

export function findAndMergeDuplicates(
  transactions: Transaction[]
): { merged: Transaction[]; duplicates: Transaction[][] } {
  const duplicates: Transaction[][] = [];
  const processed = new Set<string>();
  const merged: Transaction[] = [];

  for (const transaction of transactions) {
    if (processed.has(transaction.id)) continue;

    const duplicateResult = detectDuplicateTransaction(transaction, transactions, {
      timeWindowMinutes: 60,
      amountTolerance: 0.01,
      ignoreMerchant: false,
    });

    if (duplicateResult.isDuplicate && duplicateResult.matchingTransactions.length > 0) {
      const group = [transaction, ...duplicateResult.matchingTransactions];
      group.forEach((t) => processed.add(t.id));
      duplicates.push(group);

      const mergedTransaction = mergeDuplicateTransactions(group);
      merged.push(mergedTransaction);
    } else {
      processed.add(transaction.id);
      merged.push(transaction);
    }
  }

  return { merged, duplicates };
}

function mergeDuplicateTransactions(transactions: Transaction[]): Transaction {
  const primary = transactions[0];

  const merchantCounts: { [key: string]: number } = {};
  transactions.forEach((t) => {
    if (t.merchant) {
      merchantCounts[t.merchant] = (merchantCounts[t.merchant] || 0) + 1;
    }
  });

  const commonMerchant =
    Object.entries(merchantCounts).sort(([, a], [, b]) => b - a)[0]?.[0] ||
    primary.merchant;

  return {
    ...primary,
    merchant: commonMerchant || primary.merchant,
    description: primary.description || 'Merged duplicate transactions',
    raw_data: {
      ...(primary.raw_data as object),
      merged_from: transactions.map((t) => t.id),
      merge_count: transactions.length,
    },
  };
}

export function detectPotentialDuplicatesByBatch(
  transactions: Transaction[],
  batchSize: number = 10
): Transaction[][] {
  const potentialDuplicates: Transaction[][] = [];

  for (let i = 0; i < transactions.length; i++) {
    for (let j = i + 1; j < Math.min(i + batchSize, transactions.length); j++) {
      const txn1 = transactions[i];
      const txn2 = transactions[j];

      const result = detectDuplicateTransaction(txn1, [txn2], {
        timeWindowMinutes: 120,
        amountTolerance: 0.05,
      });

      if (result.isDuplicate) {
        potentialDuplicates.push([txn1, txn2, ...result.matchingTransactions]);
      }
    }
  }

  return potentialDuplicates;
}
