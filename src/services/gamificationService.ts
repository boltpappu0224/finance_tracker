export interface UserStreak {
  userId: string;
  currentStreak: number;
  longestStreak: number;
  lastTrackedDate: Date;
  streakBroken: boolean;
}

export interface BadgeProgress {
  badgeId: string;
  badgeName: string;
  progress: number;
  target: number;
  percentage: number;
  earned: boolean;
  earnedAt?: Date;
}

export interface Achievement {
  id: string;
  userId: string;
  type: 'badge' | 'milestone' | 'challenge';
  title: string;
  description: string;
  icon: string;
  earnedAt: Date;
  reward?: number;
}

export interface Challenge {
  id: string;
  name: string;
  description: string;
  icon: string;
  type: 'monthly' | 'weekly' | 'daily';
  goal: number;
  unit: string;
  rewards: number;
  startDate: Date;
  endDate: Date;
}

export class GamificationService {
  calculateStreak(
    transactionDates: Date[],
    previousStreak?: UserStreak
  ): UserStreak {
    if (transactionDates.length === 0) {
      return previousStreak || {
        userId: '',
        currentStreak: 0,
        longestStreak: 0,
        lastTrackedDate: new Date(),
        streakBroken: false,
      };
    }

    const sortedDates = [...transactionDates].sort(
      (a, b) => b.getTime() - a.getTime()
    );

    let currentStreak = 1;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const lastDate = new Date(sortedDates[0]);
    lastDate.setHours(0, 0, 0, 0);

    const daysDiff = Math.floor((today.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));

    if (daysDiff > 1) {
      return {
        userId: previousStreak?.userId || '',
        currentStreak: 1,
        longestStreak: previousStreak?.longestStreak || 1,
        lastTrackedDate: new Date(),
        streakBroken: true,
      };
    }

    for (let i = 1; i < sortedDates.length; i++) {
      const currentDate = new Date(sortedDates[i]);
      const previousDate = new Date(sortedDates[i - 1]);

      currentDate.setHours(0, 0, 0, 0);
      previousDate.setHours(0, 0, 0, 0);

      const diff = Math.floor(
        (previousDate.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24)
      );

      if (diff === 1) {
        currentStreak++;
      } else {
        break;
      }
    }

    const longestStreak = Math.max(
      currentStreak,
      previousStreak?.longestStreak || 0
    );

    return {
      userId: previousStreak?.userId || '',
      currentStreak,
      longestStreak,
      lastTrackedDate: new Date(),
      streakBroken: false,
    };
  }

  calculateBadgeProgress(
    userId: string,
    badgeType: string,
    currentValue: number,
    targetValue: number
  ): BadgeProgress {
    const percentage = Math.min((currentValue / targetValue) * 100, 100);
    const earned = currentValue >= targetValue;

    const badgeNames: { [key: string]: string } = {
      first_transaction: 'First Step',
      tracking_pro: 'Tracking Pro',
      budget_master: 'Budget Master',
      saver: 'Saver',
      seven_day_streak: '7-Day Streak',
      thirty_day_streak: '30-Day Streak',
      goal_getter: 'Goal Getter',
      investor: 'Investor',
    };

    return {
      badgeId: badgeType,
      badgeName: badgeNames[badgeType] || badgeType,
      progress: currentValue,
      target: targetValue,
      percentage,
      earned,
      earnedAt: earned ? new Date() : undefined,
    };
  }

  checkBadgeEligibility(
    metric: string,
    value: number,
    thresholds: { [key: string]: number }
  ): string[] {
    const earned: string[] = [];

    Object.entries(thresholds).forEach(([badgeId, threshold]) => {
      if (value >= threshold) {
        earned.push(badgeId);
      }
    });

    return earned;
  }

  calculateRewardPoints(
    achievementType: 'badge' | 'milestone' | 'challenge',
    difficulty: 'easy' | 'medium' | 'hard'
  ): number {
    const baseRewards: { [key: string]: number } = {
      badge: 50,
      milestone: 100,
      challenge: 200,
    };

    const difficultyMultiplier: { [key: string]: number } = {
      easy: 1,
      medium: 1.5,
      hard: 2,
    };

    return Math.round(
      baseRewards[achievementType] * difficultyMultiplier[difficulty]
    );
  }

  getUpcomingChallenges(allChallenges: Challenge[]): Challenge[] {
    const now = new Date();
    return allChallenges
      .filter((c) => c.startDate > now)
      .sort((a, b) => a.startDate.getTime() - b.startDate.getTime())
      .slice(0, 5);
  }

  getActiveChallenges(allChallenges: Challenge[]): Challenge[] {
    const now = new Date();
    return allChallenges.filter((c) => c.startDate <= now && c.endDate >= now);
  }

  calculateChallengeProgress(
    userId: string,
    challenge: Challenge,
    userProgress: number
  ): { progress: number; percentage: number; completed: boolean } {
    const percentage = Math.min((userProgress / challenge.goal) * 100, 100);
    const completed = userProgress >= challenge.goal;

    return {
      progress: userProgress,
      percentage,
      completed,
    };
  }

  generateLeaderboard(
    users: Array<{ userId: string; points: number; streakLength: number }>
  ): Array<{
    rank: number;
    userId: string;
    points: number;
    streakLength: number;
  }> {
    const sorted = users
      .sort((a, b) => b.points - a.points)
      .map((user, index) => ({
        rank: index + 1,
        ...user,
      }));

    return sorted;
  }

  calculateLevel(totalPoints: number): number {
    const pointsPerLevel = 1000;
    return Math.floor(totalPoints / pointsPerLevel) + 1;
  }

  getNextMilestone(currentPoints: number): { pointsNeeded: number; milestone: number } {
    const pointsPerLevel = 1000;
    const currentMilestone = Math.floor(currentPoints / pointsPerLevel) + 1;
    const nextMilestonePoints = currentMilestone * pointsPerLevel;
    const pointsNeeded = nextMilestonePoints - currentPoints;

    return {
      pointsNeeded: Math.max(pointsNeeded, 0),
      milestone: currentMilestone,
    };
  }

  getSuggestedChallenges(
    userStats: {
      transactionFrequency: number;
      savingsRate: number;
      currentStreak: number;
    }
  ): string[] {
    const suggestions: string[] = [];

    if (userStats.transactionFrequency < 5) {
      suggestions.push('increase_tracking');
    }

    if (userStats.savingsRate < 20) {
      suggestions.push('increase_savings');
    }

    if (userStats.currentStreak < 7) {
      suggestions.push('build_streak');
    }

    if (userStats.savingsRate > 30) {
      suggestions.push('invest_in_goals');
    }

    return suggestions;
  }

  createAchievement(
    userId: string,
    type: 'badge' | 'milestone' | 'challenge',
    title: string,
    description: string,
    icon: string,
    reward?: number
  ): Achievement {
    return {
      id: crypto.randomUUID(),
      userId,
      type,
      title,
      description,
      icon,
      earnedAt: new Date(),
      reward,
    };
  }

  formatAchievementNotification(achievement: Achievement): string {
    const typeEmoji: { [key: string]: string } = {
      badge: '🏅',
      milestone: '🎯',
      challenge: '🏆',
    };

    return `${typeEmoji[achievement.type]} You earned: ${achievement.title}! ${achievement.description}`;
  }
}

export const gamificationService = new GamificationService();
