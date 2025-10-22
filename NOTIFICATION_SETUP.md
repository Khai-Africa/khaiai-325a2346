# Notification System Setup Guide

## Overview
Your comprehensive notification system is now fully integrated with:
- ✅ Email notifications via Resend
- ✅ In-app real-time notifications via Pusher
- ✅ Automated email triggers for all key events
- ✅ Admin email campaign management
- ✅ Payment reminder cron job

## What's Been Implemented

### 1. Database Tables
- `email_templates` - Pre-configured email templates
- `email_logs` - Track all sent emails
- `in_app_notifications` - User notifications
- `email_campaigns` - Admin campaign management

### 2. Email Templates (7 total)
- **welcome** - Sent after user signup
- **payment_confirmed** - Sent after successful payment
- **payment_reminder_monthly** - 3 days before monthly renewal
- **payment_reminder_yearly** - 3 days before yearly renewal
- **cancellation_notice** - Sent when subscription is cancelled
- **account_deletion** - Sent when account deletion is requested
- **feature_announcement** - For announcing new features

### 3. Edge Functions
- `send-email` - Core email sending service
- `send-in-app-notification` - Create real-time notifications
- `get-user-notifications` - Fetch user notifications
- `mark-notification-read` - Mark notifications as read
- `create-email-campaign` - Admin campaign creation
- `check-payment-reminders` - Cron job for payment reminders
- `stripe-webhook` - Handle Stripe subscription events
- `flutterwave-webhook` - Updated with email notifications

### 4. Frontend Components
- `NotificationBell` - Real-time notification bell (added to sidebar)
- `Notifications` page - Full notification management

### 5. Automated Triggers
- ✅ Welcome email on signup
- ✅ Payment confirmation (Stripe + Flutterwave)
- ✅ Subscription cancellation notice
- ✅ Account deletion confirmation

## Required Configuration

### 1. Pusher Configuration

You need to add the **PUSHER_KEY** secret (in addition to existing PUSHER_APP_ID, PUSHER_SECRET, PUSHER_CLUSTER):

1. Go to your Pusher dashboard: https://dashboard.pusher.com/
2. Select your app
3. Copy the **Key** value
4. Add it as a secret in Lovable Cloud: `PUSHER_KEY`

### 2. Stripe Webhook Setup

To receive subscription cancellation and payment confirmation events:

1. Go to Stripe Dashboard: https://dashboard.stripe.com/webhooks
2. Click "Add endpoint"
3. Enter your webhook URL:
   ```
   https://olofegxhytctncyhsmpy.supabase.co/functions/v1/stripe-webhook
   ```
4. Select events to listen for:
   - `checkout.session.completed`
   - `customer.subscription.deleted`
   - `customer.subscription.updated`
5. Copy the **Signing secret**
6. Add it as a secret in Lovable Cloud: `STRIPE_WEBHOOK_SECRET`

### 3. Payment Reminder Cron Job

To automatically send payment reminders 3 days before renewal:

#### Option 1: Using Supabase pg_cron (Recommended)

Run this SQL in your Supabase SQL Editor:

```sql
-- Enable pg_cron and pg_net extensions
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Create cron job to run daily at 9 AM UTC
SELECT cron.schedule(
  'payment-reminders-daily',
  '0 9 * * *', -- Every day at 9 AM UTC
  $$
  SELECT net.http_post(
    url:='https://olofegxhytctncyhsmpy.supabase.co/functions/v1/check-payment-reminders',
    headers:='{"Content-Type": "application/json", "Authorization": "Bearer YOUR_ANON_KEY"}'::jsonb
  ) as request_id;
  $$
);
```

Replace `YOUR_ANON_KEY` with your Supabase anon key.

#### Option 2: External Cron Service

Use a service like:
- **Cron-job.org** (https://cron-job.org)
- **EasyCron** (https://www.easycron.com)
- **GitHub Actions**

Configure to call:
```
POST https://olofegxhytctncyhsmpy.supabase.co/functions/v1/check-payment-reminders
Headers: 
  Content-Type: application/json
  Authorization: Bearer YOUR_ANON_KEY
```

Schedule: Daily at 9 AM UTC

### 4. Testing the System

#### Test Welcome Email
1. Sign up as a new user
2. Check email inbox for welcome email
3. Check in-app notification bell

#### Test Payment Confirmation
1. Complete a test payment via Stripe/Flutterwave
2. Check email for confirmation
3. Check in-app notifications

#### Test Payment Reminders
Manually trigger the cron job:
```bash
curl -X POST \
  https://olofegxhytctncyhsmpy.supabase.co/functions/v1/check-payment-reminders \
  -H "Authorization: Bearer YOUR_ANON_KEY"
```

#### Test Subscription Cancellation
1. Cancel a subscription via Stripe Customer Portal
2. Check email for cancellation notice
3. Check in-app notifications

## Admin Features

### Managing Email Templates

Admins can view and edit email templates in the database:
```sql
SELECT * FROM email_templates;
```

To update a template:
```sql
UPDATE email_templates 
SET html_content = '...' 
WHERE template_key = 'welcome';
```

### Creating Email Campaigns

Use the `create-email-campaign` edge function to send targeted emails:

```javascript
await supabase.functions.invoke('create-email-campaign', {
  body: {
    campaignName: 'Feature Update - WhatsApp Support',
    subject: 'New Feature: WhatsApp Direct Support 🎉',
    htmlContent: '<html>...</html>',
    textContent: 'Plain text version',
    targetAudience: 'premium_monthly', // or 'all', 'free', 'premium_yearly'
  }
});
```

### Monitoring Email Logs

Check email delivery status:
```sql
SELECT 
  template_key,
  status,
  COUNT(*) as count,
  MAX(created_at) as last_sent
FROM email_logs
GROUP BY template_key, status
ORDER BY last_sent DESC;
```

## Troubleshooting

### Emails Not Sending
1. Check Resend API key is configured
2. Verify email domain is verified in Resend
3. Check edge function logs: `supabase functions logs send-email`
4. Check email_logs table for error details

### In-App Notifications Not Appearing
1. Verify PUSHER_KEY secret is set
2. Check browser console for errors
3. Verify NotificationBell component is mounted
4. Check Pusher dashboard for activity

### Payment Reminders Not Sending
1. Verify cron job is scheduled correctly
2. Check edge function logs: `supabase functions logs check-payment-reminders`
3. Test manually with curl command above
4. Verify Stripe subscriptions have correct renewal dates

## Support

For issues or questions:
- Check edge function logs in Supabase dashboard
- Review email_logs table for email delivery issues
- Contact support@khai.africa

## Next Steps

Consider adding:
1. Email preference center (let users choose which emails to receive)
2. SMS notifications via Twilio
3. Push notifications for mobile PWA
4. Advanced email segmentation
5. A/B testing for email templates
6. Email analytics dashboard in Admin panel
