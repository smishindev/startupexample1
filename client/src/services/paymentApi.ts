/**
 * Payment API Service
 * Handles all payment-related API calls for course purchases
 */

import axios from 'axios';

const API_BASE_URL = (import.meta as any).env?.VITE_API_BASE_URL || 'http://localhost:3001';

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
    const response = await axios.post<{ success: boolean; data: PaymentIntent }>(
      `${API_BASE_URL}/api/payments/create-payment-intent`,
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
    const response = await axios.get<{ success: boolean; data: Transaction[] }>(
      `${API_BASE_URL}/api/payments/transactions`
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
 * Get specific transaction details
 */
export const getTransaction = async (transactionId: string): Promise<Transaction> => {
  try {
    const response = await axios.get<{ success: boolean; data: Transaction }>(
      `${API_BASE_URL}/api/payments/transaction/${transactionId}`
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
    const response = await axios.post<{ success: boolean; data: RefundResponse }>(
      `${API_BASE_URL}/api/payments/request-refund`,
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

export default {
  createPaymentIntent,
  getUserTransactions,
  getTransaction,
  requestRefund,
};
