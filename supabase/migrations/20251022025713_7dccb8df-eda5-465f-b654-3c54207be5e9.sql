-- Add stripe_price_id column to subscription_plans table
ALTER TABLE public.subscription_plans ADD COLUMN IF NOT EXISTS stripe_price_id TEXT;

-- Update existing plans with Stripe price IDs
UPDATE public.subscription_plans 
SET stripe_price_id = 'price_1SKoCAHO3c5LUpMtshQnD1QB'
WHERE name = 'Premium' AND billing_period = 'monthly';

-- Note: You'll need to create a yearly price in Stripe and update this
UPDATE public.subscription_plans 
SET stripe_price_id = NULL  
WHERE name = 'Premium Yearly' AND billing_period = 'yearly';

COMMENT ON COLUMN public.subscription_plans.stripe_price_id IS 'Stripe price ID for this subscription plan';