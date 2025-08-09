-- Create seller_payouts table used by verify-razorpay-payment and create-seller-payout functions

CREATE TABLE IF NOT EXISTS public.seller_payouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id UUID NOT NULL REFERENCES public.enhanced_transactions(id) ON DELETE CASCADE,
  seller_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  amount DECIMAL(10,2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processed', 'failed', 'cancelled')),
  razorpay_payout_id TEXT,
  processed_at TIMESTAMPTZ,
  upi_id TEXT,
  phone_number TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.seller_payouts ENABLE ROW LEVEL SECURITY;

-- Policies: sellers can view their own payouts
CREATE POLICY IF NOT EXISTS "Sellers can view own payouts" ON public.seller_payouts
  FOR SELECT USING (seller_id = auth.uid());

-- Policies: system (edge functions) can insert/update payouts
CREATE POLICY IF NOT EXISTS "System can insert payouts" ON public.seller_payouts
  FOR INSERT WITH CHECK (true);

CREATE POLICY IF NOT EXISTS "System can update payouts" ON public.seller_payouts
  FOR UPDATE USING (true);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_seller_payouts_seller_id ON public.seller_payouts(seller_id);
CREATE INDEX IF NOT EXISTS idx_seller_payouts_status ON public.seller_payouts(status);

