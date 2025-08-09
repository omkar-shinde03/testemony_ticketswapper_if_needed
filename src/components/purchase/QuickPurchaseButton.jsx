import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { CompletePurchaseFlow } from './CompletePurchaseFlow';
import { CreditCard, Loader, ShieldCheck } from 'lucide-react';
import { isEmailVerified } from '@/utils/emailVerification';

export const QuickPurchaseButton = ({ 
  ticket, 
  onPurchaseSuccess, 
  disabled = false,
  variant = "default",
  size = "default",
  className = ""
}) => {
  const [isPurchaseFlowOpen, setIsPurchaseFlowOpen] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(false);
  const { toast } = useToast();

  const handlePurchaseClick = async () => {
    setIsCheckingAuth(true);

    try {
      // Check if user is authenticated
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError || !user) {
        toast({
          title: "Authentication Required",
          description: "Please log in to purchase tickets",
          variant: "destructive"
        });
        return;
      }

      // Check if user owns this ticket
      if ((ticket.user_id && ticket.user_id === user.id) || (ticket.seller_id && ticket.seller_id === user.id)) {
        toast({
          title: "Cannot Purchase",
          description: "You cannot purchase your own ticket",
          variant: "destructive"
        });
        return;
      }

      // Check if ticket is still available
      const { data: currentTicket, error: ticketError } = await supabase
        .from('tickets')
        .select('status')
        .eq('id', ticket.id)
        .single();

      if (ticketError) throw ticketError;

      if (currentTicket.status !== 'available') {
        toast({
          title: "Ticket Unavailable",
          description: "This ticket is no longer available for purchase",
          variant: "destructive"
        });
        return;
      }

      // Check email verification using centralized helper (auth.users OR profiles)
      const verified = await isEmailVerified();

      if (!verified) {
        toast({
          title: "Email Verification Required",
          description: "Please verify your email before purchasing tickets",
          variant: "destructive"
        });
        return;
      }

      // All checks passed, open purchase flow
      setIsPurchaseFlowOpen(true);

    } catch (error) {
      console.error('Purchase check error:', error);
      toast({
        title: "Error",
        description: "Unable to initiate purchase. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsCheckingAuth(false);
    }
  };

  const handlePurchaseSuccess = (transactionData) => {
    setIsPurchaseFlowOpen(false);
    onPurchaseSuccess && onPurchaseSuccess(transactionData);
  };

  return (
    <>
      <Button
        onClick={handlePurchaseClick}
        disabled={disabled || isCheckingAuth || ticket.status !== 'available'}
        variant={variant}
        size={size}
        className={`flex items-center gap-2 ${className}`}
      >
        {isCheckingAuth ? (
          <>
            <Loader className="h-4 w-4 animate-spin" />
            Checking...
          </>
        ) : (
          <>
            <CreditCard className="h-4 w-4" />
            Buy Now
            <ShieldCheck className="h-3 w-3 opacity-70" />
          </>
        )}
      </Button>

      <CompletePurchaseFlow
        ticket={ticket}
        isOpen={isPurchaseFlowOpen}
        onClose={() => setIsPurchaseFlowOpen(false)}
        onSuccess={handlePurchaseSuccess}
      />
    </>
  );
};