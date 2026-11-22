
-- Add missing payment details to transactions

ALTER TABLE public.transactions
ADD COLUMN IF NOT EXISTS amount NUMERIC(12,2);

ALTER TABLE public.transactions
ADD COLUMN IF NOT EXISTS payment_type TEXT;

-- Ensure payment amounts are positive
ALTER TABLE public.transactions
ADD CONSTRAINT transactions_amount_positive
CHECK (amount > 0);

-- Restrict payment types
ALTER TABLE public.transactions
ADD CONSTRAINT transactions_payment_type_check
CHECK (payment_type IN ('advance', 'balance', 'refund'));

-- Make both columns mandatory
ALTER TABLE public.transactions
ALTER COLUMN amount SET NOT NULL;

ALTER TABLE public.transactions
ALTER COLUMN payment_type SET NOT NULL;
