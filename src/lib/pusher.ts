// Pusher configuration for real-time notifications
// To use: Add VITE_PUSHER_KEY, VITE_PUSHER_APP_ID, and VITE_PUSHER_CLUSTER to .env

export const pusherConfig = {
  key: import.meta.env.VITE_PUSHER_KEY || '',
  cluster: import.meta.env.VITE_PUSHER_CLUSTER || 'mt1',
  appId: import.meta.env.VITE_PUSHER_APP_ID || '',
};

// Note: The Pusher integration is optional. 
// The notification system will work without it, but real-time updates won't be available.
// In-app notifications will still be visible after page refresh.
