import { Database } from '../lib/database.types';

type FamilyMember = Database['public']['Tables']['family_members']['Row'];
type Profile = Database['public']['Tables']['profiles']['Row'];

export type FamilyRole = 'admin' | 'member' | 'child' | 'viewer';

export interface FamilyPermissions {
  view_transactions: boolean;
  add_transactions: boolean;
  edit_own_transactions: boolean;
  edit_all_transactions: boolean;
  manage_budgets: boolean;
  manage_family: boolean;
  view_reports: boolean;
  manage_goals: boolean;
}

const rolePermissions: { [key in FamilyRole]: FamilyPermissions } = {
  admin: {
    view_transactions: true,
    add_transactions: true,
    edit_own_transactions: true,
    edit_all_transactions: true,
    manage_budgets: true,
    manage_family: true,
    view_reports: true,
    manage_goals: true,
  },
  member: {
    view_transactions: true,
    add_transactions: true,
    edit_own_transactions: true,
    edit_all_transactions: false,
    manage_budgets: true,
    manage_family: false,
    view_reports: true,
    manage_goals: true,
  },
  child: {
    view_transactions: true,
    add_transactions: true,
    edit_own_transactions: true,
    edit_all_transactions: false,
    manage_budgets: false,
    manage_family: false,
    view_reports: false,
    manage_goals: true,
  },
  viewer: {
    view_transactions: true,
    add_transactions: false,
    edit_own_transactions: false,
    edit_all_transactions: false,
    manage_budgets: false,
    manage_family: false,
    view_reports: true,
    manage_goals: false,
  },
};

export interface FamilyInvite {
  id: string;
  familyId: string;
  email: string;
  role: FamilyRole;
  inviteCode: string;
  expiresAt: Date;
  createdBy: string;
  acceptedAt?: Date;
}

export class FamilyManagementService {
  getPermissionsForRole(role: FamilyRole): FamilyPermissions {
    return rolePermissions[role];
  }

  canPerformAction(
    userRole: FamilyRole,
    action: keyof FamilyPermissions
  ): boolean {
    const permissions = this.getPermissionsForRole(userRole);
    return permissions[action];
  }

  validateRoleHierarchy(currentRole: FamilyRole, targetRole: FamilyRole): boolean {
    const hierarchy: { [key in FamilyRole]: number } = {
      admin: 4,
      member: 3,
      child: 2,
      viewer: 1,
    };

    return hierarchy[currentRole] > hierarchy[targetRole];
  }

  generateInviteCode(): string {
    return Math.random().toString(36).substring(2, 10).toUpperCase();
  }

  createInvite(
    familyId: string,
    email: string,
    role: FamilyRole,
    createdBy: string
  ): FamilyInvite {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    return {
      id: crypto.randomUUID(),
      familyId,
      email,
      role,
      inviteCode: this.generateInviteCode(),
      expiresAt,
      createdBy,
    };
  }

  isInviteValid(invite: FamilyInvite): boolean {
    return !invite.acceptedAt && invite.expiresAt > new Date();
  }

  calculateFamilyBudget(
    members: FamilyMember[],
    individualBudgets: { [userId: string]: number }
  ): {
    totalBudget: number;
    memberBudgets: { [userId: string]: number };
    averagePerPerson: number;
  } {
    const totalBudget = Object.values(individualBudgets).reduce(
      (sum, budget) => sum + budget,
      0
    );
    const averagePerPerson = totalBudget / Math.max(members.length, 1);

    return {
      totalBudget,
      memberBudgets: individualBudgets,
      averagePerPerson,
    };
  }

  splitExpenseEqually(amount: number, memberCount: number): number {
    return Math.round((amount / memberCount) * 100) / 100;
  }

  splitExpenseProportionally(
    amount: number,
    weights: { [userId: string]: number }
  ): { [userId: string]: number } {
    const totalWeight = Object.values(weights).reduce((sum, w) => sum + w, 0);
    const split: { [userId: string]: number } = {};

    Object.entries(weights).forEach(([userId, weight]) => {
      split[userId] = Math.round((amount * (weight / totalWeight)) * 100) / 100;
    });

    return split;
  }

  aggregateTransactionsByMember(
    transactions: any[],
    members: FamilyMember[]
  ): {
    [userId: string]: {
      totalExpense: number;
      totalIncome: number;
      net: number;
      transactionCount: number;
    };
  } {
    const aggregated: {
      [userId: string]: {
        totalExpense: number;
        totalIncome: number;
        net: number;
        transactionCount: number;
      };
    } = {};

    members.forEach((member) => {
      aggregated[member.user_id] = {
        totalExpense: 0,
        totalIncome: 0,
        net: 0,
        transactionCount: 0,
      };
    });

    transactions.forEach((transaction) => {
      if (aggregated[transaction.user_id]) {
        const agg = aggregated[transaction.user_id];
        agg.transactionCount += 1;

        if (transaction.type === 'expense') {
          agg.totalExpense += transaction.amount;
        } else if (transaction.type === 'income') {
          agg.totalIncome += transaction.amount;
        }

        agg.net = agg.totalIncome - agg.totalExpense;
      }
    });

    return aggregated;
  }

  canAccessTransaction(
    userId: string,
    transactionUserId: string,
    userRole: FamilyRole
  ): boolean {
    if (!this.getPermissionsForRole(userRole).view_transactions) {
      return false;
    }

    if (userId === transactionUserId) {
      return true;
    }

    return userRole !== 'viewer';
  }

  canEditTransaction(
    userId: string,
    transactionUserId: string,
    userRole: FamilyRole
  ): boolean {
    if (userId === transactionUserId) {
      return this.getPermissionsForRole(userRole).edit_own_transactions;
    }

    return this.getPermissionsForRole(userRole).edit_all_transactions;
  }

  getSharedExpenseSummary(
    transactions: any[],
    contributors: string[],
    period?: { start: Date; end: Date }
  ): {
    totalShared: number;
    perPerson: number;
    byPerson: { [userId: string]: number };
  } {
    let filtered = transactions;

    if (period) {
      filtered = transactions.filter((t) => {
        const tDate = new Date(t.transaction_date);
        return tDate >= period.start && tDate <= period.end;
      });
    }

    const sharedTransactions = filtered.filter(
      (t) =>
        t.type === 'expense' &&
        contributors.includes(t.user_id)
    );

    const totalShared = sharedTransactions.reduce(
      (sum, t) => sum + t.amount,
      0
    );

    const perPerson = this.splitExpenseEqually(totalShared, contributors.length);

    const byPerson: { [userId: string]: number } = {};
    contributors.forEach((userId) => {
      byPerson[userId] =
        sharedTransactions
          .filter((t) => t.user_id === userId)
          .reduce((sum, t) => sum + t.amount, 0) - perPerson;
    });

    return {
      totalShared,
      perPerson,
      byPerson,
    };
  }

  generateFamilyReport(
    members: FamilyMember[],
    transactions: any[],
    period: { start: Date; end: Date }
  ): {
    period: { start: Date; end: Date };
    memberCount: number;
    totalTransactions: number;
    totalIncome: number;
    totalExpense: number;
    byMember: any;
    topMerchants: any;
  } {
    const periodStart = period.start.toISOString().split('T')[0];
    const periodEnd = period.end.toISOString().split('T')[0];

    const filtered = transactions.filter((t) => {
      const tDate = t.transaction_date;
      return tDate >= periodStart && tDate <= periodEnd;
    });

    const totalIncome = filtered
      .filter((t) => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0);

    const totalExpense = filtered
      .filter((t) => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0);

    const byMember = this.aggregateTransactionsByMember(filtered, members);

    const merchantCounts: { [key: string]: number } = {};
    filtered.forEach((t) => {
      if (t.merchant) {
        merchantCounts[t.merchant] = (merchantCounts[t.merchant] || 0) + 1;
      }
    });

    const topMerchants = Object.entries(merchantCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([merchant, count]) => ({ merchant, count }));

    return {
      period,
      memberCount: members.length,
      totalTransactions: filtered.length,
      totalIncome,
      totalExpense,
      byMember,
      topMerchants,
    };
  }
}

export const familyManagementService = new FamilyManagementService();
