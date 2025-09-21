export declare const validateEmail: (email: string) => boolean;
export declare const validatePassword: (password: string) => {
    isValid: boolean;
    errors: string[];
};
export declare const validateUsername: (username: string) => boolean;
export declare const formatDate: (date: Date, format?: "short" | "long" | "time") => string;
export declare const getRelativeTime: (date: Date) => string;
export declare const formatDuration: (minutes: number) => string;
export declare const calculateProgress: (completed: number, total: number) => number;
export declare const getProgressColor: (progress: number) => string;
export declare const getLevelFromProgress: (progress: number) => {
    level: number;
    nextLevelProgress: number;
};
export declare const truncateText: (text: string, maxLength: number, suffix?: string) => string;
export declare const slugify: (text: string) => string;
export declare const capitalizeFirst: (text: string) => string;
export declare const formatName: (firstName: string, lastName: string) => string;
export declare const formatNumber: (num: number) => string;
export declare const formatPrice: (price: number, currency?: string) => string;
export declare const formatPercentage: (value: number, decimals?: number) => string;
export declare const groupBy: <T, K extends keyof T>(array: T[], key: K) => Record<string, T[]>;
export declare const sortBy: <T>(array: T[], key: keyof T, order?: "asc" | "desc") => T[];
export declare const uniqueBy: <T, K extends keyof T>(array: T[], key: K) => T[];
export declare const debounce: <T extends (...args: any[]) => any>(func: T, wait: number) => ((...args: Parameters<T>) => void);
export declare const storage: {
    get: <T>(key: string, defaultValue?: T) => T | null;
    set: <T>(key: string, value: T) => void;
    remove: (key: string) => void;
    clear: () => void;
};
export declare const generateAvatarColor: (name: string) => string;
export declare const buildApiUrl: (endpoint: string, params?: Record<string, any>, baseUrl?: string) => string;
export declare const getErrorMessage: (error: any) => string;
export declare const isNetworkError: (error: any) => boolean;
export declare const calculateLearningVelocity: (lessonsCompleted: number, daysSinceStart: number) => number;
export declare const getSkillLevel: (score: number) => string;
export declare const generateStudyStreak: (activityDates: Date[]) => number;
export * from './types';
//# sourceMappingURL=utils.d.ts.map