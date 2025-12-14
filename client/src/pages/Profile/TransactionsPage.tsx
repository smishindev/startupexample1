/**
 * TransactionsPage - Display user's transaction history
 * Shows all purchases, refunds, and invoices
 */

import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Container,
  Paper,
  Typography,
  Button,
  CircularProgress,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
} from '@mui/material';
import ReceiptIcon from '@mui/icons-material/Receipt';
import RefreshIcon from '@mui/icons-material/Refresh';
import DownloadIcon from '@mui/icons-material/Download';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { getUserTransactions, requestRefund, downloadInvoice, testCompleteTransaction, type Transaction } from '../../services/paymentApi';
import { format } from 'date-fns';
import { HeaderV4 } from '../../components/Navigation/HeaderV4';

const TransactionsPage: React.FC = () => {
  const navigate = useNavigate();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refundDialog, setRefundDialog] = useState<{
    open: boolean;
    transaction: Transaction | null;
  }>({ open: false, transaction: null });
  const [refundReason, setRefundReason] = useState('');
  const [refundProcessing, setRefundProcessing] = useState(false);

  const loadTransactions = async () => {
    try {
      setLoading(true);
      const data = await getUserTransactions();
      setTransactions(data);
      setError(null);
    } catch (err) {
      console.error('Error loading transactions:', err);
      setError('Failed to load transactions');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTransactions();
  }, []);

  const handleRefundClick = (transaction: Transaction) => {
    setRefundDialog({ open: true, transaction });
    setRefundReason('');
  };

  const handleRefundSubmit = async () => {
    if (!refundDialog.transaction || !refundReason.trim()) {
      return;
    }

    setRefundProcessing(true);
    try {
      await requestRefund({
        transactionId: refundDialog.transaction.Id,
        reason: refundReason,
      });
      
      setRefundDialog({ open: false, transaction: null });
      setRefundReason('');
      
      // Reload transactions
      await loadTransactions();
      
      alert('Refund request submitted successfully!');
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to process refund. Please try again.');
    } finally {
      setRefundProcessing(false);
    }
  };

  const handleDownloadInvoice = async (invoiceId: string) => {
    try {
      await downloadInvoice(invoiceId);
    } catch (err) {
      alert('Failed to download invoice. Please try again.');
    }
  };

  const handleTestComplete = async (transaction: Transaction) => {
    if (!transaction.StripePaymentIntentId) {
      alert('No payment intent ID found');
      return;
    }

    if (!confirm('This will simulate webhook completion and generate an invoice. Continue?')) {
      return;
    }

    try {
      await testCompleteTransaction(transaction.StripePaymentIntentId);
      alert('Transaction completed! Reloading...');
      await loadTransactions();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to complete transaction');
    }
  };

  const getStatusChip = (status: string) => {
    const statusConfig: Record<string, { color: any; label: string }> = {
      completed: { color: 'success', label: 'Completed' },
      pending: { color: 'warning', label: 'Pending' },
      failed: { color: 'error', label: 'Failed' },
      refunded: { color: 'default', label: 'Refunded' },
    };

    const config = statusConfig[status] || { color: 'default', label: status };
    return <Chip label={config.label} color={config.color} size="small" />;
  };

  const isRefundEligible = (transaction: Transaction): boolean => {
    if (transaction.Status !== 'completed') return false;
    
    const daysSincePurchase = Math.floor(
      (Date.now() - new Date(transaction.CreatedAt).getTime()) / (1000 * 60 * 60 * 24)
    );
    
    return daysSincePurchase <= 30;
  };

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ py: 8, textAlign: 'center' }}>
        <CircularProgress size={60} />
        <Typography variant="h6" sx={{ mt: 3 }}>
          Loading transactions...
        </Typography>
      </Container>
    );
  }

  return (
    <>
      <HeaderV4 />
      <Container maxWidth="lg" sx={{ py: 6 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
          <Typography variant="h4">
            Transaction History
          </Typography>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={loadTransactions}
          >
            Refresh
          </Button>
        </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {transactions.length === 0 ? (
        <Paper elevation={2} sx={{ p: 6, textAlign: 'center' }}>
          <ReceiptIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h6" gutterBottom>
            No Transactions Yet
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Your purchase history will appear here
          </Typography>
          <Button variant="contained" onClick={() => navigate('/courses')}>
            Browse Courses
          </Button>
        </Paper>
      ) : (
        <TableContainer component={Paper} elevation={2}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Date</TableCell>
                <TableCell>Course</TableCell>
                <TableCell>Amount</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Invoice</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {transactions.map((transaction) => (
                <TableRow key={transaction.Id}>
                  <TableCell>
                    {format(new Date(transaction.CreatedAt), 'MMM dd, yyyy')}
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" fontWeight="medium">
                      {transaction.CourseTitle || 'Course'}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" fontWeight="medium">
                      ${transaction.Amount.toFixed(2)} {transaction.Currency.toUpperCase()}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    {getStatusChip(transaction.Status)}
                  </TableCell>
                  <TableCell>
                    {transaction.InvoiceNumber && transaction.InvoiceId && (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="caption">
                          {transaction.InvoiceNumber}
                        </Typography>
                        <IconButton 
                          size="small" 
                          onClick={() => handleDownloadInvoice(transaction.InvoiceId!)}
                          title="Download Invoice PDF"
                        >
                          <DownloadIcon fontSize="small" />
                        </IconButton>
                      </Box>
                    )}
                  </TableCell>
                  <TableCell>
                    {transaction.Status === 'pending' && transaction.StripePaymentIntentId && (
                      <Button
                        size="small"
                        variant="outlined"
                        color="success"
                        startIcon={<CheckCircleIcon />}
                        onClick={() => handleTestComplete(transaction)}
                        sx={{ mr: 1 }}
                      >
                        Test Complete
                      </Button>
                    )}
                    {isRefundEligible(transaction) && (
                      <Button
                        size="small"
                        variant="outlined"
                        color="error"
                        onClick={() => handleRefundClick(transaction)}
                      >
                        Request Refund
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Refund Dialog */}
      <Dialog
        open={refundDialog.open}
        onClose={() => setRefundDialog({ open: false, transaction: null })}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Request Refund</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Please provide a reason for requesting a refund for{' '}
            <strong>{refundDialog.transaction?.CourseTitle}</strong>.
          </Typography>
          <TextField
            fullWidth
            multiline
            rows={4}
            label="Reason for Refund"
            value={refundReason}
            onChange={(e) => setRefundReason(e.target.value)}
            placeholder="Please explain why you're requesting a refund..."
            required
          />
          <Alert severity="info" sx={{ mt: 2 }}>
            Refunds are processed within 5-10 business days. Your course access will be revoked
            once the refund is approved.
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRefundDialog({ open: false, transaction: null })}>
            Cancel
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={handleRefundSubmit}
            disabled={!refundReason.trim() || refundProcessing}
          >
            {refundProcessing ? 'Processing...' : 'Submit Refund Request'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
    </>
  );
};

export default TransactionsPage;
