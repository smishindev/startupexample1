/**
 * Payment API Service
 * Handles all payment-related API calls for course purchases
 * Implements timeout handling and retry logic
 */

import axios, { AxiosError } from 'axios';

const API_BASE_URL = (import.meta as any).env?.VITE_API_BASE_URL || 'http://localhost:3001';

// Configure axios with timeout and interceptors
const paymentAxios = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000, // 30 second timeout for payment operations
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add request interceptor for auth token
paymentAxios.interceptors.request.use(
  (config) => {
    const authStorage = localStorage.getItem('auth-storage');
    if (authStorage) {
      try {
        const parsed = JSON.parse(authStorage);
        const token = parsed?.state?.token;
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
      } catch (e) {
        console.error('Error parsing auth storage:', e);
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Add response interceptor for error handling
paymentAxios.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.code === 'ECONNABORTED') {
      throw new Error('Request timeout. Please check your internet connection and try again.');
    }
    if (!error.response) {
      throw new Error('Network error. Please check your internet connection.');
    }
    throw error;
  }
);

export interface PaymentIntent {
  clientSecret: string;
  paymentIntentId: string;
}

export interface Transaction {
  Id: string;
  Amount: number;
  Currency: string;
  Status: 'pending' | 'completed' | 'failed' | 'refunded';
  CreatedAt: string;
  CompletedAt?: string;
  RefundedAt?: string;
  CourseTitle?: string;
  CourseThumbnail?: string;
  InvoiceNumber?: string;
  InvoicePdfUrl?: string;
  InvoiceId?: string; // For download endpoint
  StripePaymentIntentId?: string; // For test completion
}

export interface RefundRequest {
  transactionId: string;
  reason: string;
}

export interface RefundResponse {
  refundId: string;
  amount: number;
  currency: string;
  status: string;
}

/**
 * Create a payment intent for course purchase
 */
export const createPaymentIntent = async (
  courseId: string,
  amount: number,
  currency: string = 'usd'
): Promise<PaymentIntent> => {
  try {
    const response = await paymentAxios.post<{ success: boolean; data: PaymentIntent }>(
      '/api/payments/create-payment-intent',
      { courseId, amount, currency }
    );

    if (!response.data.success) {
      throw new Error('Failed to create payment intent');
    }

    return response.data.data;
  } catch (error) {
    console.error('Error creating payment intent:', error);
    throw error;
  }
};

/**
 * Get user's transaction history
 */
export const getUserTransactions = async (): Promise<Transaction[]> => {
  try {
    const response = await paymentAxios.get<{ success: boolean; data: Transaction[] }>(
      '/api/payments/transactions'
    );

    if (!response.data.success) {
      throw new Error('Failed to retrieve transactions');
    }

    return response.data.data;
  } catch (error) {
    console.error('Error fetching transactions:', error);
    throw error;
  }
};

/**
 * Download invoice PDF
 */
export const downloadInvoice = async (invoiceId: string): Promise<void> => {
  try {
    const response = await paymentAxios.get(
      `/api/payments/invoice/${invoiceId}/download`,
      {
        responseType: 'blob', // Important for file download
        timeout: 60000, // Extend timeout for file download (60 seconds)
      }
    );

    // Create download link
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `invoice_${invoiceId}.pdf`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Error downloading invoice:', error);
    throw error;
  }
};

/**
 * Get specific transaction details
 */
export const getTransaction = async (transactionId: string): Promise<Transaction> => {
  try {
    const response = await paymentAxios.get<{ success: boolean; data: Transaction }>(
      `/api/payments/transaction/${transactionId}`
    );

    if (!response.data.success) {
      throw new Error('Failed to retrieve transaction');
    }

    return response.data.data;
  } catch (error) {
    console.error('Error fetching transaction:', error);
    throw error;
  }
};

/**
 * Request a refund for a transaction
 */
export const requestRefund = async (request: RefundRequest): Promise<RefundResponse> => {
  try {
    const response = await paymentAxios.post<{ success: boolean; data: RefundResponse }>(
      '/api/payments/request-refund',
      request
    );

    if (!response.data.success) {
      throw new Error('Failed to process refund');
    }

    return response.data.data;
  } catch (error) {
    console.error('Error requesting refund:', error);
    throw error;
  }
};

/**
 * TEST ONLY: Manually complete a transaction (simulates webhook)
 */
export const testCompleteTransaction = async (paymentIntentId: string): Promise<void> => {
  try {
    const response = await paymentAxios.post(
      '/api/payments/test-complete',
      { paymentIntentId }
    );

    if (!response.data.success) {
      throw new Error('Failed to complete transaction');
    }
  } catch (error) {
    console.error('Error completing transaction:', error);
    throw error;
  }
};

export default {
  createPaymentIntent,
  getUserTransactions,
  getTransaction,
  requestRefund,
  downloadInvoice,
  testCompleteTransaction,
};

