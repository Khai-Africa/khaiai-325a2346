-- Create payment providers table
CREATE TABLE IF NOT EXISTS public.payment_providers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('stripe', 'flutterwave')),
  config JSONB DEFAULT '{}'::jsonb,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create payment transactions table
CREATE TABLE IF NOT EXISTS public.payment_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  amount NUMERIC(10, 2) NOT NULL,
  currency TEXT NOT NULL,
  provider TEXT NOT NULL CHECK (provider IN ('stripe', 'flutterwave')),
  status TEXT NOT NULL CHECK (status IN ('pending', 'completed', 'failed', 'cancelled')),
  reference TEXT UNIQUE NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create currency rates table
CREATE TABLE IF NOT EXISTS public.currency_rates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  currency_code TEXT UNIQUE NOT NULL,
  rate_to_usd NUMERIC(10, 6) NOT NULL,
  last_updated TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create user currency preferences table
CREATE TABLE IF NOT EXISTS public.user_currency_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE NOT NULL,
  preferred_currency TEXT NOT NULL DEFAULT 'XAF',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create uploaded files table
CREATE TABLE IF NOT EXISTS public.uploaded_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  conversation_id UUID,
  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  file_url TEXT,
  extracted_text TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create user tokens table for OAuth
CREATE TABLE IF NOT EXISTS public.user_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  provider TEXT NOT NULL CHECK (provider IN ('google_calendar', 'google_drive')),
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.payment_providers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.currency_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_currency_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.uploaded_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_tokens ENABLE ROW LEVEL SECURITY;

-- RLS Policies for payment_providers (public read)
CREATE POLICY "Anyone can view active payment providers"
  ON public.payment_providers FOR SELECT
  USING (is_active = true);

-- RLS Policies for payment_transactions
CREATE POLICY "Users can view their own transactions"
  ON public.payment_transactions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own transactions"
  ON public.payment_transactions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- RLS Policies for currency_rates (public read)
CREATE POLICY "Anyone can view currency rates"
  ON public.currency_rates FOR SELECT
  USING (true);

-- RLS Policies for user_currency_preferences
CREATE POLICY "Users can view their own preferences"
  ON public.user_currency_preferences FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own preferences"
  ON public.user_currency_preferences FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own preferences"
  ON public.user_currency_preferences FOR UPDATE
  USING (auth.uid() = user_id);

-- RLS Policies for uploaded_files
CREATE POLICY "Users can view their own files"
  ON public.uploaded_files FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own files"
  ON public.uploaded_files FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own files"
  ON public.uploaded_files FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for user_tokens
CREATE POLICY "Users can view their own tokens"
  ON public.user_tokens FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own tokens"
  ON public.user_tokens FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own tokens"
  ON public.user_tokens FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own tokens"
  ON public.user_tokens FOR DELETE
  USING (auth.uid() = user_id);

-- Triggers for updated_at
CREATE TRIGGER update_payment_transactions_updated_at
  BEFORE UPDATE ON public.payment_transactions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_user_currency_preferences_updated_at
  BEFORE UPDATE ON public.user_currency_preferences
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_user_tokens_updated_at
  BEFORE UPDATE ON public.user_tokens
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Insert initial payment providers
INSERT INTO public.payment_providers (name, type, is_active) VALUES
  ('Stripe', 'stripe', true),
  ('Flutterwave', 'flutterwave', true)
ON CONFLICT DO NOTHING;

-- Insert initial currency rates (sample rates - will be updated dynamically)
INSERT INTO public.currency_rates (currency_code, rate_to_usd) VALUES
  ('USD', 1.000000),
  ('XAF', 620.000000),
  ('GHS', 12.500000),
  ('KES', 130.000000),
  ('NGN', 775.000000),
  ('UGX', 3700.000000),
  ('TZS', 2500.000000),
  ('RWF', 1300.000000),
  ('XOF', 620.000000),
  ('EUR', 0.920000),
  ('GBP', 0.790000)
ON CONFLICT (currency_code) DO NOTHING;