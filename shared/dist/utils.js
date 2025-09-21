"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateStudyStreak = exports.getSkillLevel = exports.calculateLearningVelocity = exports.isNetworkError = exports.getErrorMessage = exports.buildApiUrl = exports.generateAvatarColor = exports.storage = exports.debounce = exports.uniqueBy = exports.sortBy = exports.groupBy = exports.formatPercentage = exports.formatPrice = exports.formatNumber = exports.formatName = exports.capitalizeFirst = exports.slugify = exports.truncateText = exports.getLevelFromProgress = exports.getProgressColor = exports.calculateProgress = exports.formatDuration = exports.getRelativeTime = exports.formatDate = exports.validateUsername = exports.validatePassword = exports.validateEmail = void 0;
// Validation Utilities
const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
};
exports.validateEmail = validateEmail;
const validatePassword = (password) => {
    const errors = [];
    if (password.length < 8) {
        errors.push('Password must be at least 8 characters long');
    }
    if (!/(?=.*[a-z])/.test(password)) {
        errors.push('Password must contain at least one lowercase letter');
    }
    if (!/(?=.*[A-Z])/.test(password)) {
        errors.push('Password must contain at least one uppercase letter');
    }
    if (!/(?=.*\d)/.test(password)) {
        errors.push('Password must contain at least one number');
    }
    if (!/(?=.*[@$!%*?&])/.test(password)) {
        errors.push('Password must contain at least one special character');
    }
    return {
        isValid: errors.length === 0,
        errors
    };
};
exports.validatePassword = validatePassword;
const validateUsername = (username) => {
    const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/;
    return usernameRegex.test(username);
};
exports.validateUsername = validateUsername;
// Date Utilities
const formatDate = (date, format = 'short') => {
    const options = format === 'short'
        ? { month: 'short', day: 'numeric', year: 'numeric' }
        : format === 'long'
            ? { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }
            : { hour: '2-digit', minute: '2-digit' };
    return date.toLocaleDateString('en-US', options);
};
exports.formatDate = formatDate;
const getRelativeTime = (date) => {
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    const intervals = [
        { label: 'year', seconds: 31536000 },
        { label: 'month', seconds: 2592000 },
        { label: 'week', seconds: 604800 },
        { label: 'day', seconds: 86400 },
        { label: 'hour', seconds: 3600 },
        { label: 'minute', seconds: 60 }
    ];
    for (const interval of intervals) {
        const count = Math.floor(diffInSeconds / interval.seconds);
        if (count > 0) {
            return `${count} ${interval.label}${count !== 1 ? 's' : ''} ago`;
        }
    }
    return 'Just now';
};
exports.getRelativeTime = getRelativeTime;
const formatDuration = (minutes) => {
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    if (hours === 0) {
        return `${remainingMinutes}m`;
    }
    return `${hours}h ${remainingMinutes}m`;
};
exports.formatDuration = formatDuration;
// Progress Utilities
const calculateProgress = (completed, total) => {
    if (total === 0)
        return 0;
    return Math.round((completed / total) * 100);
};
exports.calculateProgress = calculateProgress;
const getProgressColor = (progress) => {
    if (progress < 25)
        return '#f44336'; // red
    if (progress < 50)
        return '#ff9800'; // orange
    if (progress < 75)
        return '#2196f3'; // blue
    return '#4caf50'; // green
};
exports.getProgressColor = getProgressColor;
const getLevelFromProgress = (progress) => {
    // Each level requires exponentially more progress
    let level = 1;
    let requiredProgress = 100;
    let totalProgress = 0;
    while (totalProgress + requiredProgress <= progress) {
        totalProgress += requiredProgress;
        level++;
        requiredProgress = Math.floor(requiredProgress * 1.2); // 20% increase each level
    }
    const nextLevelProgress = progress - totalProgress;
    const progressPercentage = (nextLevelProgress / requiredProgress) * 100;
    return {
        level,
        nextLevelProgress: Math.round(progressPercentage)
    };
};
exports.getLevelFromProgress = getLevelFromProgress;
// String Utilities
const truncateText = (text, maxLength, suffix = '...') => {
    if (text.length <= maxLength)
        return text;
    return text.substring(0, maxLength - suffix.length) + suffix;
};
exports.truncateText = truncateText;
const slugify = (text) => {
    return text
        .toLowerCase()
        .replace(/[^\w\s-]/g, '') // Remove special characters
        .replace(/\s+/g, '-') // Replace spaces with hyphens
        .replace(/-+/g, '-') // Replace multiple hyphens with single hyphen
        .trim();
};
exports.slugify = slugify;
const capitalizeFirst = (text) => {
    return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
};
exports.capitalizeFirst = capitalizeFirst;
const formatName = (firstName, lastName) => {
    return `${(0, exports.capitalizeFirst)(firstName)} ${(0, exports.capitalizeFirst)(lastName)}`;
};
exports.formatName = formatName;
// Number Utilities
const formatNumber = (num) => {
    return new Intl.NumberFormat('en-US').format(num);
};
exports.formatNumber = formatNumber;
const formatPrice = (price, currency = 'USD') => {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency
    }).format(price);
};
exports.formatPrice = formatPrice;
const formatPercentage = (value, decimals = 1) => {
    return `${(value).toFixed(decimals)}%`;
};
exports.formatPercentage = formatPercentage;
// Array Utilities
const groupBy = (array, key) => {
    return array.reduce((groups, item) => {
        const group = String(item[key]);
        groups[group] = groups[group] || [];
        groups[group].push(item);
        return groups;
    }, {});
};
exports.groupBy = groupBy;
const sortBy = (array, key, order = 'asc') => {
    return [...array].sort((a, b) => {
        const aVal = a[key];
        const bVal = b[key];
        if (aVal < bVal)
            return order === 'asc' ? -1 : 1;
        if (aVal > bVal)
            return order === 'asc' ? 1 : -1;
        return 0;
    });
};
exports.sortBy = sortBy;
const uniqueBy = (array, key) => {
    const seen = new Set();
    return array.filter(item => {
        const value = item[key];
        if (seen.has(value))
            return false;
        seen.add(value);
        return true;
    });
};
exports.uniqueBy = uniqueBy;
// Debounce Utility
const debounce = (func, wait) => {
    let timeout;
    return (...args) => {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(null, args), wait);
    };
};
exports.debounce = debounce;
// Local Storage Utilities (Browser only)
exports.storage = typeof window !== 'undefined' ? {
    get: (key, defaultValue) => {
        try {
            const item = localStorage.getItem(key);
            return item ? JSON.parse(item) : defaultValue || null;
        }
        catch {
            return defaultValue || null;
        }
    },
    set: (key, value) => {
        try {
            localStorage.setItem(key, JSON.stringify(value));
        }
        catch (error) {
            console.warn('Failed to save to localStorage:', error);
        }
    },
    remove: (key) => {
        localStorage.removeItem(key);
    },
    clear: () => {
        localStorage.clear();
    }
} : {
    get: () => null,
    set: () => { },
    remove: () => { },
    clear: () => { }
};
// Color Utilities
const generateAvatarColor = (name) => {
    const colors = [
        '#f44336', '#e91e63', '#9c27b0', '#673ab7',
        '#3f51b5', '#2196f3', '#03a9f4', '#00bcd4',
        '#009688', '#4caf50', '#8bc34a', '#cddc39',
        '#ffeb3b', '#ffc107', '#ff9800', '#ff5722'
    ];
    const hash = name.split('').reduce((acc, char) => {
        return char.charCodeAt(0) + ((acc << 5) - acc);
    }, 0);
    return colors[Math.abs(hash) % colors.length];
};
exports.generateAvatarColor = generateAvatarColor;
// API Utilities
const buildApiUrl = (endpoint, params, baseUrl = 'http://localhost:3001') => {
    const url = new URL(endpoint, baseUrl);
    if (params) {
        Object.entries(params).forEach(([key, value]) => {
            if (value !== undefined && value !== null) {
                url.searchParams.append(key, String(value));
            }
        });
    }
    return url.toString();
};
exports.buildApiUrl = buildApiUrl;
// Error Handling Utilities
const getErrorMessage = (error) => {
    if (typeof error === 'string')
        return error;
    if (error?.message)
        return error.message;
    if (error?.error?.message)
        return error.error.message;
    return 'An unexpected error occurred';
};
exports.getErrorMessage = getErrorMessage;
const isNetworkError = (error) => {
    return error?.code === 'NETWORK_ERROR' || error?.message?.includes('Network Error');
};
exports.isNetworkError = isNetworkError;
// Learning Utilities
const calculateLearningVelocity = (lessonsCompleted, daysSinceStart) => {
    if (daysSinceStart === 0)
        return 0;
    return lessonsCompleted / daysSinceStart;
};
exports.calculateLearningVelocity = calculateLearningVelocity;
const getSkillLevel = (score) => {
    if (score >= 90)
        return 'Expert';
    if (score >= 75)
        return 'Advanced';
    if (score >= 60)
        return 'Intermediate';
    if (score >= 40)
        return 'Beginner';
    return 'Novice';
};
exports.getSkillLevel = getSkillLevel;
const generateStudyStreak = (activityDates) => {
    if (activityDates.length === 0)
        return 0;
    const sortedDates = activityDates
        .map(date => new Date(date.getFullYear(), date.getMonth(), date.getDate()))
        .sort((a, b) => b.getTime() - a.getTime());
    let streak = 0;
    let currentDate = new Date();
    currentDate.setHours(0, 0, 0, 0);
    for (const activityDate of sortedDates) {
        if (activityDate.getTime() === currentDate.getTime()) {
            streak++;
            currentDate.setDate(currentDate.getDate() - 1);
        }
        else if (activityDate.getTime() < currentDate.getTime()) {
            break;
        }
    }
    return streak;
};
exports.generateStudyStreak = generateStudyStreak;
// Export all utilities
__exportStar(require("./types"), exports);
//# sourceMappingURL=utils.js.map