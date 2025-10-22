-- Create email templates table
CREATE TABLE IF NOT EXISTS email_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_key TEXT UNIQUE NOT NULL,
  subject TEXT NOT NULL,
  html_content TEXT NOT NULL,
  text_content TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create email logs table
CREATE TABLE IF NOT EXISTS email_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  template_key TEXT NOT NULL,
  recipient_email TEXT NOT NULL,
  subject TEXT NOT NULL,
  status TEXT NOT NULL,
  provider_response JSONB,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create in-app notifications table
CREATE TABLE IF NOT EXISTS in_app_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL,
  is_read BOOLEAN DEFAULT false,
  action_url TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  read_at TIMESTAMPTZ
);

-- Create email campaigns table
CREATE TABLE IF NOT EXISTS email_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID REFERENCES auth.users(id) NOT NULL,
  campaign_name TEXT NOT NULL,
  subject TEXT NOT NULL,
  html_content TEXT NOT NULL,
  text_content TEXT,
  target_audience TEXT NOT NULL,
  target_user_ids UUID[],
  status TEXT DEFAULT 'draft',
  scheduled_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  total_recipients INTEGER DEFAULT 0,
  successful_sends INTEGER DEFAULT 0,
  failed_sends INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE email_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE in_app_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_campaigns ENABLE ROW LEVEL SECURITY;

-- RLS Policies for email_templates
CREATE POLICY "Admins can manage email templates"
  ON email_templates FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Authenticated users can view active templates"
  ON email_templates FOR SELECT
  USING (is_active = true AND auth.uid() IS NOT NULL);

-- RLS Policies for email_logs
CREATE POLICY "Users can view their own email logs"
  ON email_logs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all email logs"
  ON email_logs FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "System can insert email logs"
  ON email_logs FOR INSERT
  WITH CHECK (true);

-- RLS Policies for in_app_notifications
CREATE POLICY "Users can view their own notifications"
  ON in_app_notifications FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications"
  ON in_app_notifications FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own notifications"
  ON in_app_notifications FOR DELETE
  USING (auth.uid() = user_id);

CREATE POLICY "System can create notifications"
  ON in_app_notifications FOR INSERT
  WITH CHECK (true);

-- RLS Policies for email_campaigns
CREATE POLICY "Admins can manage campaigns"
  ON email_campaigns FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Create indexes for performance
CREATE INDEX idx_email_logs_user_id ON email_logs(user_id);
CREATE INDEX idx_email_logs_status ON email_logs(status);
CREATE INDEX idx_email_logs_created_at ON email_logs(created_at DESC);
CREATE INDEX idx_notifications_user_id ON in_app_notifications(user_id);
CREATE INDEX idx_notifications_is_read ON in_app_notifications(is_read);
CREATE INDEX idx_notifications_created_at ON in_app_notifications(created_at DESC);

-- Insert default email templates
INSERT INTO email_templates (template_key, subject, html_content, text_content) VALUES
('welcome', 'Welcome to Khai AI - Your AI Assistant is Ready! 🎉', 
'<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
    .content { background: #f9fafb; padding: 30px; }
    .button { display: inline-block; background: #8b5cf6; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
    .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 14px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Welcome to Khai AI! 🎉</h1>
    </div>
    <div class="content">
      <p>Hi {{username}},</p>
      <p>Thank you for joining Khai AI! We''re excited to have you on board. Your AI assistant is ready to help you with:</p>
      <ul>
        <li>✨ Intelligent conversations powered by advanced AI</li>
        <li>🎨 Image generation for your creative needs</li>
        <li>🎤 Voice chat and transcription</li>
        <li>📁 File analysis and document processing</li>
        <li>🌐 Web search integration</li>
      </ul>
      <p>Get started by exploring the chat interface and trying out different features!</p>
      <a href="{{app_url}}" class="button">Start Chatting</a>
      <p>Need help? Check out our <a href="{{help_url}}">Help Center</a> or contact support anytime.</p>
    </div>
    <div class="footer">
      <p>© 2025 Khai AI. All rights reserved.</p>
    </div>
  </div>
</body>
</html>',
'Welcome to Khai AI!

Hi {{username}},

Thank you for joining Khai AI! Your AI assistant is ready to help you with intelligent conversations, image generation, voice chat, file analysis, and more.

Start chatting: {{app_url}}

Need help? Visit our Help Center: {{help_url}}

© 2025 Khai AI. All rights reserved.'),

('payment_confirmed', 'Payment Confirmed - Thank You for Upgrading to Premium! ✅',
'<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
    .content { background: #f9fafb; padding: 30px; }
    .detail-box { background: white; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; margin: 20px 0; }
    .detail-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #f3f4f6; }
    .detail-row:last-child { border-bottom: none; }
    .button { display: inline-block; background: #8b5cf6; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
    .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 14px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Payment Confirmed! ✅</h1>
    </div>
    <div class="content">
      <p>Hi {{username}},</p>
      <p>Thank you for upgrading to <strong>{{plan_name}}</strong>! Your payment has been successfully processed.</p>
      <div class="detail-box">
        <div class="detail-row">
          <span><strong>Plan:</strong></span>
          <span>{{plan_name}}</span>
        </div>
        <div class="detail-row">
          <span><strong>Amount:</strong></span>
          <span>{{amount}} {{currency}}</span>
        </div>
        <div class="detail-row">
          <span><strong>Next Renewal:</strong></span>
          <span>{{subscription_end}}</span>
        </div>
      </div>
      <p>You now have access to all premium features including:</p>
      <ul>
        <li>✨ Unlimited messages</li>
        <li>🎨 Unlimited image generation</li>
        <li>🎤 Voice chat & transcription</li>
        <li>📁 File upload & analysis</li>
        <li>🌐 Web search integration</li>
        <li>💬 WhatsApp direct support</li>
      </ul>
      <a href="{{app_url}}" class="button">Start Using Premium</a>
    </div>
    <div class="footer">
      <p>© 2025 Khai AI. All rights reserved.</p>
    </div>
  </div>
</body>
</html>',
'Payment Confirmed!

Hi {{username}},

Thank you for upgrading to {{plan_name}}! Your payment of {{amount}} {{currency}} has been successfully processed.

Next Renewal: {{subscription_end}}

You now have access to all premium features.

Start using Premium: {{app_url}}

© 2025 Khai AI. All rights reserved.'),

('payment_reminder_monthly', 'Your Monthly Premium Subscription Renews in 3 Days',
'<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
    .content { background: #f9fafb; padding: 30px; }
    .highlight-box { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; }
    .button { display: inline-block; background: #8b5cf6; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
    .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 14px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Subscription Renewal Reminder</h1>
    </div>
    <div class="content">
      <p>Hi {{username}},</p>
      <p>This is a friendly reminder that your <strong>{{plan_name}}</strong> subscription will automatically renew in 3 days.</p>
      <div class="highlight-box">
        <p><strong>Renewal Details:</strong></p>
        <p>📅 Renewal Date: {{renewal_date}}</p>
        <p>💰 Amount: {{amount}} {{currency}}</p>
      </div>
      <p>Your premium features will continue uninterrupted. If you need to update your payment method or make changes to your subscription, you can do so anytime.</p>
      <a href="{{manage_subscription_url}}" class="button">Manage Subscription</a>
      <p>Questions? Our support team is here to help!</p>
    </div>
    <div class="footer">
      <p>© 2025 Khai AI. All rights reserved.</p>
    </div>
  </div>
</body>
</html>',
'Subscription Renewal Reminder

Hi {{username}},

Your {{plan_name}} subscription will automatically renew in 3 days.

Renewal Date: {{renewal_date}}
Amount: {{amount}} {{currency}}

Manage your subscription: {{manage_subscription_url}}

© 2025 Khai AI. All rights reserved.'),

('payment_reminder_yearly', 'Your Yearly Premium Subscription Renews in 3 Days',
'<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
    .content { background: #f9fafb; padding: 30px; }
    .highlight-box { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; }
    .savings-badge { background: #10b981; color: white; padding: 8px 16px; border-radius: 20px; display: inline-block; margin: 10px 0; }
    .button { display: inline-block; background: #8b5cf6; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
    .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 14px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Annual Subscription Renewal</h1>
    </div>
    <div class="content">
      <p>Hi {{username}},</p>
      <p>Your <strong>{{plan_name}}</strong> subscription will automatically renew in 3 days.</p>
      <div class="savings-badge">🎉 You save 17% with annual billing!</div>
      <div class="highlight-box">
        <p><strong>Renewal Details:</strong></p>
        <p>📅 Renewal Date: {{renewal_date}}</p>
        <p>💰 Amount: {{amount}} {{currency}}</p>
      </div>
      <p>Thank you for being a valued premium member! Your subscription will continue with all premium features.</p>
      <a href="{{manage_subscription_url}}" class="button">Manage Subscription</a>
    </div>
    <div class="footer">
      <p>© 2025 Khai AI. All rights reserved.</p>
    </div>
  </div>
</body>
</html>',
'Annual Subscription Renewal

Hi {{username}},

Your {{plan_name}} subscription will automatically renew in 3 days.

Renewal Date: {{renewal_date}}
Amount: {{amount}} {{currency}}

You save 17% with annual billing!

Manage your subscription: {{manage_subscription_url}}

© 2025 Khai AI. All rights reserved.'),

('cancellation_notice', 'We''re Sorry to See You Go - Subscription Cancelled',
'<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #6b7280 0%, #4b5563 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
    .content { background: #f9fafb; padding: 30px; }
    .info-box { background: white; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; margin: 20px 0; }
    .button { display: inline-block; background: #8b5cf6; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
    .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 14px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Subscription Cancelled</h1>
    </div>
    <div class="content">
      <p>Hi {{username}},</p>
      <p>We''re sorry to see you go. Your <strong>{{plan_name}}</strong> subscription has been cancelled.</p>
      <div class="info-box">
        <p><strong>What happens next?</strong></p>
        <p>✅ You''ll continue to have access to premium features until <strong>{{end_date}}</strong></p>
        <p>✅ No further charges will be made</p>
        <p>✅ After {{end_date}}, you''ll revert to the Free plan with:</p>
        <ul>
          <li>10 messages per day</li>
          <li>3 images per day</li>
          <li>Basic AI chat</li>
        </ul>
      </div>
      <p>We''d love to hear your feedback! Please let us know how we can improve.</p>
      <a href="{{reactivate_url}}" class="button">Reactivate Premium</a>
      <p>Changed your mind? You can reactivate your subscription anytime before {{end_date}}.</p>
    </div>
    <div class="footer">
      <p>© 2025 Khai AI. All rights reserved.</p>
    </div>
  </div>
</body>
</html>',
'Subscription Cancelled

Hi {{username}},

Your {{plan_name}} subscription has been cancelled.

You''ll have access to premium features until {{end_date}}.

After that, you''ll revert to the Free plan with 10 messages per day.

Reactivate anytime: {{reactivate_url}}

© 2025 Khai AI. All rights reserved.'),

('account_deletion', 'Account Deletion Request Received',
'<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
    .content { background: #f9fafb; padding: 30px; }
    .warning-box { background: #fee2e2; border-left: 4px solid #ef4444; padding: 15px; margin: 20px 0; }
    .button { display: inline-block; background: #6b7280; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
    .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 14px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Account Deletion Request</h1>
    </div>
    <div class="content">
      <p>Hi {{username}},</p>
      <p>We''ve received your request to delete your Khai AI account.</p>
      <div class="warning-box">
        <p><strong>⚠️ Important Information:</strong></p>
        <p>🗑️ Deletion Date: {{deletion_date}}</p>
        <p>📊 The following data will be permanently deleted:</p>
        <ul>
          <li>All conversations and messages</li>
          <li>Generated images</li>
          <li>Uploaded files</li>
          <li>Account preferences and settings</li>
        </ul>
        <p><strong>This action cannot be undone.</strong></p>
      </div>
      <p>If you change your mind, please contact our support team immediately at support@khai-ai.com</p>
      <p>Thank you for being part of the Khai AI community. We hope to see you again in the future.</p>
    </div>
    <div class="footer">
      <p>© 2025 Khai AI. All rights reserved.</p>
    </div>
  </div>
</body>
</html>',
'Account Deletion Request

Hi {{username}},

Your Khai AI account deletion request has been received.

Deletion Date: {{deletion_date}}

All your data (conversations, images, files, settings) will be permanently deleted. This action cannot be undone.

To cancel this request, contact support@khai-ai.com immediately.

© 2025 Khai AI. All rights reserved.'),

('feature_announcement', '{{feature_name}} - New Feature Available! 🚀',
'<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
    .content { background: #f9fafb; padding: 30px; }
    .feature-box { background: white; border: 2px solid #8b5cf6; border-radius: 8px; padding: 20px; margin: 20px 0; }
    .button { display: inline-block; background: #8b5cf6; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
    .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 14px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🚀 New Feature Alert!</h1>
    </div>
    <div class="content">
      <p>Hi {{username}},</p>
      <p>We''re excited to announce a new feature that will enhance your Khai AI experience!</p>
      <div class="feature-box">
        <h2>{{feature_name}}</h2>
        <p>{{feature_description}}</p>
      </div>
      <a href="{{cta_url}}" class="button">Try It Now</a>
      <p>As always, we''re committed to bringing you the best AI experience. Your feedback helps us improve!</p>
    </div>
    <div class="footer">
      <p>© 2025 Khai AI. All rights reserved.</p>
    </div>
  </div>
</body>
</html>',
'New Feature Available!

Hi {{username}},

{{feature_name}}

{{feature_description}}

Try it now: {{cta_url}}

© 2025 Khai AI. All rights reserved.')
ON CONFLICT (template_key) DO NOTHING;