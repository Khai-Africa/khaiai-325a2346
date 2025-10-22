-- Update Premium subscription prices to whole numbers
UPDATE subscription_plans 
SET price = 10.00 
WHERE name = 'Premium' AND billing_period = 'monthly';

UPDATE subscription_plans 
SET price = 100.00 
WHERE name = 'Premium Yearly' AND billing_period = 'yearly';