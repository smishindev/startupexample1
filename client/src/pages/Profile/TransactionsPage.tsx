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
  Divider,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  LinearProgress,
  Tooltip,
} from '@mui/material';
import ReceiptIcon from '@mui/icons-material/Receipt';
import RefreshIcon from '@mui/icons-material/Refresh';
import DownloadIcon from '@mui/icons-material/Download';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CheckIcon from '@mui/icons-material/Check';
import InfoIcon from '@mui/icons-material/Info';
import { getUserTransactions, requestRefund, downloadInvoice, testCompleteTransaction, type Transaction } from '../../services/paymentApi';
import { format } from 'date-fns';
import { HeaderV5 as HeaderV4 } from '../../components/Navigation/HeaderV5';

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

  const getStatusChip = (status: string, transaction: Transaction) => {
    const statusConfig: Record<string, { color: any; label: string }> = {
      completed: { color: 'success', label: 'Completed' },
      pending: { color: 'warning', label: 'Pending' },
      failed: { color: 'error', label: 'Failed' },
      refunded: { color: 'default', label: 'Refunded' },
    };

    const config = statusConfig[status] || { color: 'default', label: status };
    
    // Add tooltip with additional info
    let tooltip = '';
    if (status === 'completed' && transaction.CompletedAt) {
      tooltip = `Completed on ${format(new Date(transaction.CompletedAt), 'MMM dd, yyyy')}`;
    } else if (status === 'refunded' && transaction.RefundedAt) {
      tooltip = `Refunded on ${format(new Date(transaction.RefundedAt), 'MMM dd, yyyy')}`;
    } else if (status === 'pending') {
      tooltip = 'Payment is being processed';
    } else if (status === 'failed') {
      tooltip = 'Payment failed or was declined';
    }

    return (
      <Tooltip title={tooltip} arrow>
        <Chip label={config.label} color={config.color} size="small" />
      </Tooltip>
    );
  };

  const isRefundEligible = (transaction: Transaction): boolean => {
    if (transaction.Status !== 'completed') return false;
    
    // Use UTC for consistent date calculations
    const purchaseDate = new Date(transaction.CreatedAt);
    const now = new Date();
    
    // Calculate days using UTC timestamps to avoid timezone issues
    const daysSincePurchase = Math.floor(
      (now.getTime() - purchaseDate.getTime()) / (1000 * 60 * 60 * 24)
    );
    
    return daysSincePurchase <= 30;
  };

  const getDaysRemaining = (transaction: Transaction): number => {
    // Use UTC for consistent date calculations
    const purchaseDate = new Date(transaction.CreatedAt);
    const now = new Date();
    
    // Calculate days using UTC timestamps to avoid timezone issues
    const daysSincePurchase = Math.floor(
      (now.getTime() - purchaseDate.getTime()) / (1000 * 60 * 60 * 24)
    );
    
    return Math.max(0, 30 - daysSincePurchase);
  };

  const getRefundAmount = (transaction: Transaction): number => {
    // For now, return full amount. In production, this would factor in course completion
    // and calculate partial refunds based on policy
    return transaction.Amount;
  };

  const getRefundIneligibilityReason = (transaction: Transaction): string | null => {
    if (transaction.Status === 'refunded') {
      return 'This transaction has already been refunded.';
    }
    if (transaction.Status === 'pending') {
      return 'Cannot refund pending transactions. Please wait for completion.';
    }
    if (transaction.Status === 'failed') {
      return 'Failed transactions cannot be refunded.';
    }
    if (!isRefundEligible(transaction)) {
      return 'Refund period (30 days) has expired.';
    }
    return null;
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
            data-testid="transactions-refresh-button"
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
          <Button variant="contained" onClick={() => navigate('/courses')} data-testid="transactions-browse-courses-button">
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
                    {getStatusChip(transaction.Status, transaction)}
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
                          data-testid="transactions-download-invoice-button"
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
                        data-testid="transactions-test-complete-button"
                      >
                        Test Complete
                      </Button>
                    )}
                    {transaction.Status === 'completed' && (
                      isRefundEligible(transaction) ? (
                        <Button
                          size="small"
                          variant="outlined"
                          color="error"
                          onClick={() => handleRefundClick(transaction)}
                          data-testid="transactions-request-refund-button"
                        >
                          Request Refund
                        </Button>
                      ) : (
                        <Tooltip title={getRefundIneligibilityReason(transaction) || 'Not eligible'}>
                          <span>
                            <Button
                              size="small"
                              variant="outlined"
                              color="error"
                              disabled
                              data-testid="transactions-request-refund-button-disabled"
                            >
                              Request Refund
                            </Button>
                          </span>
                        </Tooltip>
                      )
                    )}
                    {transaction.Status === 'refunded' && (
                      <Chip 
                        label="Refunded" 
                        size="small" 
                        color="default"
                        icon={<CheckCircleIcon />}
                      />
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Enhanced Refund Dialog */}
      <Dialog
        open={refundDialog.open}
        onClose={() => setRefundDialog({ open: false, transaction: null })}
        maxWidth="md"
        fullWidth
        data-testid="transactions-refund-dialog"
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <InfoIcon color="primary" />
            <Typography variant="h6">Request Refund</Typography>
          </Box>
        </DialogTitle>
        <DialogContent>
          {refundDialog.transaction && (
            <>
              {/* Course Details */}
              <Paper elevation={0} sx={{ p: 2, bgcolor: 'grey.50', mb: 3 }}>
                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                  Course
                </Typography>
                <Typography variant="body1" fontWeight="medium">
                  {refundDialog.transaction.CourseTitle}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                  Purchased on {format(new Date(refundDialog.transaction.CreatedAt), 'MMMM dd, yyyy')}
                </Typography>
              </Paper>

              {/* Refund Policy */}
              <Typography variant="subtitle1" fontWeight="medium" gutterBottom>
                📋 Refund Policy
              </Typography>
              <List dense sx={{ mb: 2 }}>
                <ListItem>
                  <ListItemIcon><CheckIcon color="success" fontSize="small" /></ListItemIcon>
                  <ListItemText 
                    primary="30-Day Money-Back Guarantee"
                    secondary="Full refund within 30 days of purchase"
                  />
                </ListItem>
                <ListItem>
                  <ListItemIcon><CheckIcon color="success" fontSize="small" /></ListItemIcon>
                  <ListItemText 
                    primary="Fast Processing"
                    secondary="Refunds processed within 5-10 business days"
                  />
                </ListItem>
                <ListItem>
                  <ListItemIcon><CheckIcon color="success" fontSize="small" /></ListItemIcon>
                  <ListItemText 
                    primary="Course Access"
                    secondary="Access will be revoked once refund is approved"
                  />
                </ListItem>
              </List>

              <Divider sx={{ my: 2 }} />

              {/* Eligibility Status */}
              <Box sx={{ mb: 3 }}>
                <Typography variant="subtitle2" gutterBottom>
                  Refund Window
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
                  <Box sx={{ flexGrow: 1 }}>
                    <LinearProgress 
                      variant="determinate" 
                      value={((30 - getDaysRemaining(refundDialog.transaction)) / 30) * 100}
                      sx={{ height: 8, borderRadius: 4 }}
                    />
                  </Box>
                  <Typography variant="body2" color="text.secondary" sx={{ minWidth: 80 }}>
                    {getDaysRemaining(refundDialog.transaction)} days left
                  </Typography>
                </Box>
                {getDaysRemaining(refundDialog.transaction) <= 7 && (
                  <Alert severity="warning" sx={{ mt: 1 }}>
                    Refund window closes soon! Request must be submitted within {getDaysRemaining(refundDialog.transaction)} days.
                  </Alert>
                )}
              </Box>

              {/* Refund Amount */}
              <Paper elevation={0} sx={{ p: 2, bgcolor: 'primary.50', mb: 3 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="subtitle2">
                    Estimated Refund Amount
                  </Typography>
                  <Typography variant="h6" color="primary.main" fontWeight="bold">
                    ${getRefundAmount(refundDialog.transaction).toFixed(2)} {refundDialog.transaction.Currency.toUpperCase()}
                  </Typography>
                </Box>
                <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                  Full purchase price will be refunded
                </Typography>
              </Paper>

              <Divider sx={{ my: 2 }} />

              {/* Reason Input */}
              <Typography variant="subtitle2" gutterBottom>
                Reason for Refund *
              </Typography>
              <TextField
                fullWidth
                multiline
                rows={4}
                value={refundReason}
                onChange={(e) => setRefundReason(e.target.value)}
                placeholder="Please help us understand why you're requesting a refund. Your feedback helps us improve our courses."
                required
                error={refundReason.length > 0 && refundReason.length < 10}
                helperText={
                  refundReason.length > 0 && refundReason.length < 10
                    ? 'Please provide at least 10 characters'
                    : `${refundReason.length}/500 characters`
                }
                inputProps={{ maxLength: 500 }}
                data-testid="transactions-refund-reason-input"
              />
            </>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button onClick={() => setRefundDialog({ open: false, transaction: null })} data-testid="transactions-refund-cancel-button">
            Cancel
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={handleRefundSubmit}
            disabled={!refundReason.trim() || refundReason.length < 10 || refundProcessing}
            data-testid="transactions-refund-submit-button"
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
