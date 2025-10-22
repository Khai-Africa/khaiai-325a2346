-- Update Free plan features
UPDATE subscription_plans 
SET features = jsonb_build_array(
  '10 messages per day',
  'Basic AI chat',
  'Standard support',
  '3 images per day',
  'Share conversations'
)
WHERE name = 'Free' AND billing_period = 'monthly';

-- Update Premium Monthly features
UPDATE subscription_plans 
SET features = jsonb_build_array(
  'Unlimited messages',
  'Advanced AI modes (Deep Research, Thinking)',
  'Unlimited image generation',
  'Voice chat & transcription',
  'File upload & analysis',
  'Web search integration',
  'WhatsApp direct support',
  'Priority support',
  'Early access to new features'
)
WHERE name = 'Premium' AND billing_period = 'monthly';

-- Update Premium Yearly features
UPDATE subscription_plans 
SET features = jsonb_build_array(
  'Unlimited messages',
  'Advanced AI modes (Deep Research, Thinking)',
  'Unlimited image generation',
  'Voice chat & transcription',
  'File upload & analysis',
  'Web search integration',
  'WhatsApp direct support',
  'Priority support',
  'Early access to new features',
  'Save 17% with annual billing'
)
WHERE name = 'Premium Yearly' AND billing_period = 'yearly';