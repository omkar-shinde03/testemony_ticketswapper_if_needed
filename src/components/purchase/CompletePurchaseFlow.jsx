import React from 'react';
import { RazorpayEscrowPayment } from '@/components/payments/RazorpayEscrowPayment';
import { StripePaymentForm } from '@/components/payments/StripePaymentForm';

export const CompletePurchaseFlow = ({ ticket, isOpen, onClose, onSuccess }) => {
  const useMockPayments = (import.meta?.env?.VITE_MOCK_PAYMENTS === 'true') || import.meta?.env?.DEV;
  const useStripe = !!import.meta?.env?.VITE_STRIPE_PUBLISHABLE_KEY && !useMockPayments;

  if (useStripe) {
    return (
      <StripePaymentForm
        ticket={ticket}
        onSuccess={onSuccess}
        onCancel={onClose}
      />
    );
  }

  return (
    <RazorpayEscrowPayment
      ticket={ticket}
      isOpen={isOpen}
      onClose={onClose}
      onSuccess={onSuccess}
    />
  );
};