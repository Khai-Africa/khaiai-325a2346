export type Language = 'en' | 'fr';

export const translations = {
  en: {
    // Common
    common: {
      back: 'Back',
      backToChat: 'Back to Chat',
      loading: 'Loading...',
      save: 'Save',
      cancel: 'Cancel',
      delete: 'Delete',
      edit: 'Edit',
      close: 'Close',
      or: 'or',
      and: 'and',
    },
    
    // Hero
    hero: {
      title: 'Khai AI',
      subtitle: 'What can I help with?',
      startChatting: 'Start Chatting',
      generateImages: 'Generate Images',
      learnMore: 'Learn More',
      goPremium: 'Go Premium',
      login: 'Login',
      upgradeToPremium: 'Upgrade to Premium',
    },
    
    // Auth
    auth: {
      welcomeTitle: 'Welcome to Khai AI',
      signInSubtitle: 'Sign in to continue',
      signUpSubtitle: 'Create your account',
      username: 'Username',
      mobile: 'Mobile Number',
      email: 'Email',
      password: 'Password',
      secretWord: 'Secret Word',
      confirmSecretWord: 'Confirm Secret Word',
      newPassword: 'New Password',
      signIn: 'Sign In',
      signUp: 'Sign Up',
      pleaseWait: 'Please wait...',
      continueWithGoogle: 'Continue with Google',
      dontHaveAccount: "Don't have an account? Sign up",
      alreadyHaveAccount: 'Already have an account? Sign in',
      forgotPassword: 'Forgot password?',
      resetPassword: 'Reset Password',
      resetting: 'Resetting...',
      backToLogin: 'Back to Login',
      usernameOrMobile: 'Username or Mobile Number',
      chooseUsername: 'Choose a username',
      enterMobile: 'Enter your mobile number (optional)',
      enterEmail: 'Enter your email (optional)',
      enterPassword: 'Enter your password',
      enterUsername: 'Enter username or mobile',
      enterSecretWord: 'Enter your secret word',
      enterNewPassword: 'Enter new password',
      usernameRequired: 'Username must be at least 3 characters',
      invalidEmail: 'Invalid email address',
      passwordRequired: 'Password must be at least 6 characters',
      secretWordRequired: 'Secret word must be at least 3 characters',
      secretWordsMismatch: "Secret words don't match",
      emailOrMobileRequired: 'Either email or mobile number is required',
      validationError: 'Validation Error',
      loginFailed: 'Login Failed',
      invalidCredentials: 'Invalid username/mobile or password.',
      welcomeBack: 'Welcome back!',
      loginSuccess: "You've successfully logged in.",
      error: 'Error',
      unexpectedError: 'An unexpected error occurred. Please try again.',
      usernameTaken: 'Username Taken',
      usernameInUse: 'This username is already in use. Please choose another.',
      accountCreated: 'Account Created!',
      signupSuccess: "You've successfully signed up. Welcome to Khai AI!",
      resetFailed: 'Reset Failed',
      userNotFound: 'User not found.',
      invalidSecretWord: 'Invalid secret word.',
      resetSuccess: 'Success!',
      passwordResetSuccess: 'Your password has been reset successfully.',
      allFieldsRequired: 'All fields are required',
    },
    
    // Chat
    chat: {
      whatCanIHelp: 'What can I help with?',
      typingPlaceholder: 'Ask Khai...',
      newChat: 'New Chat',
      noConversations: 'No conversations yet',
      today: 'TODAY',
      yesterday: 'YESTERDAY',
      older: 'OLDER',
      recording: 'Recording... Click again to stop',
      transcribing: 'Transcribing audio...',
      audioTranscribed: 'Audio transcribed successfully!',
      noSpeechDetected: 'No speech detected',
      transcribeFailed: 'Failed to transcribe audio',
      microphoneError: 'Could not access microphone',
      generatingSpeech: 'Generating speech...',
      playingAudio: 'Playing audio...',
      speechFailed: 'Failed to generate speech',
      stoppedSpeaking: 'Stopped speaking',
      freeTrialLimit: 'Free trial limit reached. Create an account to continue chatting!',
      signUp: 'Sign Up',
      messageLimitReached: 'Message limit reached. Upgrade to Premium for unlimited messages.',
      upgrade: 'Upgrade',
      rateLimitExceeded: 'Rate limit exceeded. Please wait a moment and try again.',
      authError: 'Authentication error. Please log in again.',
      sendFailed: 'Failed to send message. Please try again.',
      conversationDeleted: 'Conversation deleted',
      deleteConversationFailed: 'Failed to delete conversation',
      loadConversationFailed: 'Failed to load conversation',
      switchedToMode: 'Switched to {mode} mode',
      messagesLeft: 'You have {count} messages left. Sign up for a free account to get more!',
      signOut: 'Sign Out',
      signedOut: 'Signed out successfully',
    },
    
    // Sidebar
    sidebar: {
      backToChat: 'Back to Chat',
      newChat: 'New Chat',
      generateImages: 'Generate Images',
      noConversations: 'No conversations yet',
      upgradeToPremium: 'Upgrade to Premium',
      signOut: 'Sign Out',
    },
    
    // Settings
    settings: {
      title: 'Settings',
      subtitle: 'Manage your account preferences and settings',
      account: 'Account',
      accountInfo: 'Your account information',
      email: 'Email',
      userId: 'User ID',
      currency: 'Currency',
      currencyDescription: 'Choose your preferred currency for pricing',
      notifications: 'Notifications',
      notificationsDescription: 'Manage your notification preferences',
      pushNotifications: 'Push Notifications',
      pushNotificationsDescription: 'Receive notifications in the app',
      emailUpdates: 'Email Updates',
      emailUpdatesDescription: 'Receive updates via email',
      dataExport: 'Data Export',
      dataExportDescription: 'Download all your data',
      exportMyData: 'Export My Data',
      exportingData: 'Exporting your data...',
      dataExported: 'Data exported successfully!',
      exportFailed: 'Failed to export data',
      dangerZone: 'Danger Zone',
      dangerZoneDescription: 'Irreversible actions',
      deleteAccount: 'Delete Account',
      deleting: 'Deleting...',
      deleteConfirm: 'Are you sure you want to delete your account? This action cannot be undone.',
      deleteInstructions: 'Please contact support@khai-ai.com to delete your account',
      signOutFailed: 'Failed to sign out',
    },
    
    // Premium
    premium: {
      upgradeToPremium: 'Upgrade to Premium',
      unlockFullPower: 'Unlock the Full Power of',
      subtitle: 'Get unlimited access to advanced AI capabilities, priority support, and exclusive features',
      mostPopular: 'Most Popular',
      perMonth: '/month',
      perYear: '/year',
      saveWithAnnual: 'Save 17% with annual billing',
      upgradeNow: 'Upgrade Now',
      currentPlan: 'Current Plan',
      processing: 'Processing...',
      manage: 'Manage',
      premiumFeatures: 'Premium Features',
      unlimitedMessages: 'Unlimited Messages',
      unlimitedMessagesDesc: 'No daily limits, chat as much as you need',
      advancedAIModes: 'Advanced AI Modes',
      advancedAIModesDesc: 'Access to deep research, thinking, and specialized modes',
      unlimitedImageGen: 'Unlimited Image Generation',
      unlimitedImageGenDesc: 'Create stunning AI images without daily limits (Free: 3/day)',
      webSearch: 'Web Search',
      webSearchDesc: 'Get real-time information from the web',
      prioritySupport: 'Priority Support',
      prioritySupportDesc: 'Get help faster with priority assistance',
      earlyAccess: 'Early Access',
      earlyAccessDesc: 'Be first to try new features and capabilities',
      checkoutFailed: 'Failed to create checkout session',
      portalFailed: 'Failed to open customer portal',
      pleaseSignIn: 'Please sign in to upgrade',
      pleaseSignInManage: 'Please sign in to manage subscription',
      subscriptionActivated: 'Subscription activated! Welcome to Premium!',
      checkoutCanceled: 'Checkout canceled. You can upgrade anytime!',
      paymentVerified: 'Payment verified! Welcome to Premium!',
      verificationFailed: 'Payment verification failed. Please contact support.',
      verifyFailed: 'Failed to verify payment',
      mobileMoneyPayment: 'Mobile Money',
      cardPayment: 'Card',
      creatingCheckout: 'Creating checkout session...',
      plansLoadFailed: 'Failed to load subscription plans',
    },
    
    // Image Generation
    imageGen: {
      title: 'AI Image Generation',
      subtitle: 'Create stunning images with the power of AI',
      recentCreations: 'Recent Creations',
      generatedOn: 'Generated on',
      noRecentImages: 'No recent images',
    },
    
    // Usage
    usage: {
      title: 'Usage',
      subtitle: 'Track your usage and limits',
      messagesUsed: 'Messages Used',
      imagesGenerated: 'Images Generated',
      unlimitedMessages: 'Unlimited',
      unlimitedImages: 'Unlimited',
    },
    
    // Help
    help: {
      title: 'Help & Support',
      subtitle: 'Get help with Khai AI',
      faq: 'Frequently Asked Questions',
      contactSupport: 'Contact Support',
    },
    
    // Learn More
    learnMore: {
      title: 'About Khai AI',
      subtitle: 'Learn more about our AI assistant',
    },
    
    // Privacy & Terms
    privacy: {
      title: 'Privacy Policy',
      subtitle: 'Your privacy matters to us',
    },
    
    terms: {
      title: 'Terms of Service',
      subtitle: 'Terms and conditions',
    },
    
    // Suggestions
    suggestions: {
      learnCulture: 'Learn about African culture',
      searchKhai: 'Search with Khai AI',
      talkKhai: 'Talk with Khai AI',
      getIdeas: 'Get creative ideas',
      writeCode: 'Write code',
      translateLanguages: 'Translate languages',
      more: 'More',
    },
    
    // Typewriter prompts
    typewriter: {
      askKhai: 'Ask Khai...',
      writeCode: 'Write code...',
      farmGuide: 'Farm guide...',
      createImage: 'Create image...',
      howToFind: 'How do I find...',
      calculate: '10% of 150...',
    },
    
    // Message Actions
    actions: {
      copy: 'Copy',
      copied: 'Copied!',
      speak: 'Speak',
      regenerate: 'Regenerate',
      regenerating: 'Regenerating response...',
      share: 'Share',
    },
    
    // Share Dialog
    share: {
      title: 'Share Conversation',
      copyToClipboard: 'Copy to clipboard',
      shareOn: 'Share on',
    },
    
    // Subscription Badge
    subscriptionBadge: {
      free: 'Free',
      premium: 'Premium',
    },
    
    // Usage Indicator
    usageIndicator: {
      messagesUsed: '{used} / {limit} messages used',
      imagesGenerated: '{used} / {limit} images today',
      unlimited: 'Unlimited',
    },
    
    // 404
    notFound: {
      title: '404',
      subtitle: 'Oops! Page not found',
      returnHome: 'Return to Home',
    },
  },
  
  fr: {
    // Common
    common: {
      back: 'Retour',
      backToChat: 'Retour au Chat',
      loading: 'Chargement...',
      save: 'Enregistrer',
      cancel: 'Annuler',
      delete: 'Supprimer',
      edit: 'Modifier',
      close: 'Fermer',
      or: 'ou',
      and: 'et',
    },
    
    // Hero
    hero: {
      title: 'Khai AI',
      subtitle: 'Comment puis-je vous aider ?',
      startChatting: 'Commencer à Discuter',
      generateImages: 'Générer des Images',
      learnMore: 'En Savoir Plus',
      goPremium: 'Passer à Premium',
      login: 'Connexion',
      upgradeToPremium: 'Passer à Premium',
    },
    
    // Auth
    auth: {
      welcomeTitle: 'Bienvenue sur Khai AI',
      signInSubtitle: 'Connectez-vous pour continuer',
      signUpSubtitle: 'Créez votre compte',
      username: "Nom d'utilisateur",
      mobile: 'Numéro de Téléphone',
      email: 'Email',
      password: 'Mot de passe',
      secretWord: 'Mot Secret',
      confirmSecretWord: 'Confirmer le Mot Secret',
      newPassword: 'Nouveau Mot de Passe',
      signIn: 'Se Connecter',
      signUp: "S'inscrire",
      pleaseWait: 'Veuillez patienter...',
      continueWithGoogle: 'Continuer avec Google',
      dontHaveAccount: "Vous n'avez pas de compte ? Inscrivez-vous",
      alreadyHaveAccount: 'Vous avez déjà un compte ? Connectez-vous',
      forgotPassword: 'Mot de passe oublié ?',
      resetPassword: 'Réinitialiser le Mot de Passe',
      resetting: 'Réinitialisation...',
      backToLogin: 'Retour à la Connexion',
      usernameOrMobile: "Nom d'utilisateur ou Numéro de Téléphone",
      chooseUsername: "Choisissez un nom d'utilisateur",
      enterMobile: 'Entrez votre numéro de téléphone (optionnel)',
      enterEmail: 'Entrez votre email (optionnel)',
      enterPassword: 'Entrez votre mot de passe',
      enterUsername: "Entrez le nom d'utilisateur ou le mobile",
      enterSecretWord: 'Entrez votre mot secret',
      enterNewPassword: 'Entrez le nouveau mot de passe',
      usernameRequired: "Le nom d'utilisateur doit contenir au moins 3 caractères",
      invalidEmail: 'Adresse email invalide',
      passwordRequired: 'Le mot de passe doit contenir au moins 6 caractères',
      secretWordRequired: 'Le mot secret doit contenir au moins 3 caractères',
      secretWordsMismatch: 'Les mots secrets ne correspondent pas',
      emailOrMobileRequired: "L'email ou le numéro de téléphone est requis",
      validationError: 'Erreur de Validation',
      loginFailed: 'Échec de la Connexion',
      invalidCredentials: "Nom d'utilisateur/mobile ou mot de passe invalide.",
      welcomeBack: 'Bon retour !',
      loginSuccess: 'Vous êtes connecté avec succès.',
      error: 'Erreur',
      unexpectedError: 'Une erreur inattendue est survenue. Veuillez réessayer.',
      usernameTaken: "Nom d'utilisateur Pris",
      usernameInUse: "Ce nom d'utilisateur est déjà utilisé. Veuillez en choisir un autre.",
      accountCreated: 'Compte Créé !',
      signupSuccess: 'Vous êtes inscrit avec succès. Bienvenue sur Khai AI !',
      resetFailed: 'Échec de la Réinitialisation',
      userNotFound: 'Utilisateur non trouvé.',
      invalidSecretWord: 'Mot secret invalide.',
      resetSuccess: 'Succès !',
      passwordResetSuccess: 'Votre mot de passe a été réinitialisé avec succès.',
      allFieldsRequired: 'Tous les champs sont requis',
    },
    
    // Chat
    chat: {
      whatCanIHelp: 'Comment puis-je vous aider ?',
      typingPlaceholder: 'Demandez à Khai...',
      newChat: 'Nouveau Chat',
      noConversations: 'Aucune conversation pour le moment',
      today: "AUJOURD'HUI",
      yesterday: 'HIER',
      older: 'PLUS ANCIEN',
      recording: 'Enregistrement... Cliquez à nouveau pour arrêter',
      transcribing: "Transcription de l'audio...",
      audioTranscribed: 'Audio transcrit avec succès !',
      noSpeechDetected: 'Aucune parole détectée',
      transcribeFailed: "Échec de la transcription de l'audio",
      microphoneError: 'Impossible d\'accéder au microphone',
      generatingSpeech: 'Génération de la parole...',
      playingAudio: "Lecture de l'audio...",
      speechFailed: 'Échec de la génération de la parole',
      stoppedSpeaking: 'Arrêt de la lecture',
      freeTrialLimit: 'Limite d\'essai gratuit atteinte. Créez un compte pour continuer à discuter !',
      signUp: "S'inscrire",
      messageLimitReached: 'Limite de messages atteinte. Passez à Premium pour des messages illimités.',
      upgrade: 'Mettre à Niveau',
      rateLimitExceeded: 'Limite de débit dépassée. Veuillez attendre un moment et réessayer.',
      authError: 'Erreur d\'authentification. Veuillez vous reconnecter.',
      sendFailed: 'Échec de l\'envoi du message. Veuillez réessayer.',
      conversationDeleted: 'Conversation supprimée',
      deleteConversationFailed: 'Échec de la suppression de la conversation',
      loadConversationFailed: 'Échec du chargement de la conversation',
      switchedToMode: 'Basculé en mode {mode}',
      messagesLeft: 'Il vous reste {count} messages. Inscrivez-vous pour un compte gratuit pour en obtenir plus !',
      signOut: 'Se Déconnecter',
      signedOut: 'Déconnexion réussie',
    },
    
    // Sidebar
    sidebar: {
      backToChat: 'Retour au Chat',
      newChat: 'Nouveau Chat',
      generateImages: 'Générer des Images',
      noConversations: 'Aucune conversation pour le moment',
      upgradeToPremium: 'Passer à Premium',
      signOut: 'Se Déconnecter',
    },
    
    // Settings
    settings: {
      title: 'Paramètres',
      subtitle: 'Gérez les préférences de votre compte',
      account: 'Compte',
      accountInfo: 'Informations de votre compte',
      email: 'Email',
      userId: 'ID Utilisateur',
      currency: 'Devise',
      currencyDescription: 'Choisissez votre devise préférée pour les prix',
      notifications: 'Notifications',
      notificationsDescription: 'Gérez vos préférences de notification',
      pushNotifications: 'Notifications Push',
      pushNotificationsDescription: "Recevoir des notifications dans l'application",
      emailUpdates: 'Mises à Jour par Email',
      emailUpdatesDescription: 'Recevoir des mises à jour par email',
      dataExport: 'Export de Données',
      dataExportDescription: 'Téléchargez toutes vos données',
      exportMyData: 'Exporter Mes Données',
      exportingData: 'Export de vos données...',
      dataExported: 'Données exportées avec succès !',
      exportFailed: "Échec de l'export des données",
      dangerZone: 'Zone Dangereuse',
      dangerZoneDescription: 'Actions irréversibles',
      deleteAccount: 'Supprimer le Compte',
      deleting: 'Suppression...',
      deleteConfirm: 'Êtes-vous sûr de vouloir supprimer votre compte ? Cette action ne peut pas être annulée.',
      deleteInstructions: 'Veuillez contacter support@khai-ai.com pour supprimer votre compte',
      signOutFailed: 'Échec de la déconnexion',
    },
    
    // Premium
    premium: {
      upgradeToPremium: 'Passer à Premium',
      unlockFullPower: 'Débloquez la Puissance Complète de',
      subtitle: 'Obtenez un accès illimité aux capacités IA avancées, au support prioritaire et aux fonctionnalités exclusives',
      mostPopular: 'Le Plus Populaire',
      perMonth: '/mois',
      perYear: '/an',
      saveWithAnnual: 'Économisez 17% avec la facturation annuelle',
      upgradeNow: 'Mettre à Niveau Maintenant',
      currentPlan: 'Plan Actuel',
      processing: 'Traitement...',
      manage: 'Gérer',
      premiumFeatures: 'Fonctionnalités Premium',
      unlimitedMessages: 'Messages Illimités',
      unlimitedMessagesDesc: 'Aucune limite quotidienne, discutez autant que vous le souhaitez',
      advancedAIModes: 'Modes IA Avancés',
      advancedAIModesDesc: 'Accès à la recherche approfondie, à la réflexion et aux modes spécialisés',
      unlimitedImageGen: 'Génération d\'Images Illimitée',
      unlimitedImageGenDesc: 'Créez de superbes images IA sans limites quotidiennes (Gratuit : 3/jour)',
      webSearch: 'Recherche Web',
      webSearchDesc: 'Obtenez des informations en temps réel depuis le web',
      prioritySupport: 'Support Prioritaire',
      prioritySupportDesc: 'Obtenez de l\'aide plus rapidement avec une assistance prioritaire',
      earlyAccess: 'Accès Anticipé',
      earlyAccessDesc: 'Soyez le premier à essayer les nouvelles fonctionnalités',
      checkoutFailed: 'Échec de la création de la session de paiement',
      portalFailed: 'Échec de l\'ouverture du portail client',
      pleaseSignIn: 'Veuillez vous connecter pour mettre à niveau',
      pleaseSignInManage: 'Veuillez vous connecter pour gérer l\'abonnement',
      subscriptionActivated: 'Abonnement activé ! Bienvenue dans Premium !',
      checkoutCanceled: 'Paiement annulé. Vous pouvez mettre à niveau à tout moment !',
      paymentVerified: 'Paiement vérifié ! Bienvenue dans Premium !',
      verificationFailed: 'Échec de la vérification du paiement. Veuillez contacter le support.',
      verifyFailed: 'Échec de la vérification du paiement',
      mobileMoneyPayment: 'Mobile Money',
      cardPayment: 'Carte',
      creatingCheckout: 'Création de la session de paiement...',
      plansLoadFailed: 'Échec du chargement des plans d\'abonnement',
    },
    
    // Image Generation
    imageGen: {
      title: 'Génération d\'Images IA',
      subtitle: 'Créez de superbes images avec la puissance de l\'IA',
      recentCreations: 'Créations Récentes',
      generatedOn: 'Généré le',
      noRecentImages: 'Aucune image récente',
    },
    
    // Usage
    usage: {
      title: 'Utilisation',
      subtitle: 'Suivez votre utilisation et vos limites',
      messagesUsed: 'Messages Utilisés',
      imagesGenerated: 'Images Générées',
      unlimitedMessages: 'Illimité',
      unlimitedImages: 'Illimité',
    },
    
    // Help
    help: {
      title: 'Aide & Support',
      subtitle: 'Obtenez de l\'aide avec Khai AI',
      faq: 'Questions Fréquemment Posées',
      contactSupport: 'Contacter le Support',
    },
    
    // Learn More
    learnMore: {
      title: 'À Propos de Khai AI',
      subtitle: 'En savoir plus sur notre assistant IA',
    },
    
    // Privacy & Terms
    privacy: {
      title: 'Politique de Confidentialité',
      subtitle: 'Votre confidentialité nous tient à cœur',
    },
    
    terms: {
      title: 'Conditions d\'Utilisation',
      subtitle: 'Termes et conditions',
    },
    
    // Suggestions
    suggestions: {
      learnCulture: 'Découvrir la culture africaine',
      searchKhai: 'Rechercher avec Khai AI',
      talkKhai: 'Parler avec Khai AI',
      getIdeas: 'Obtenir des idées créatives',
      writeCode: 'Écrire du code',
      translateLanguages: 'Traduire des langues',
      more: 'Plus',
    },
    
    // Typewriter prompts
    typewriter: {
      askKhai: 'Demandez à Khai...',
      writeCode: 'Écrire du code...',
      farmGuide: 'Guide agricole...',
      createImage: 'Créer une image...',
      howToFind: 'Comment trouver...',
      calculate: '10% de 150...',
    },
    
    // Message Actions
    actions: {
      copy: 'Copier',
      copied: 'Copié !',
      speak: 'Parler',
      regenerate: 'Régénérer',
      regenerating: 'Régénération de la réponse...',
      share: 'Partager',
    },
    
    // Share Dialog
    share: {
      title: 'Partager la Conversation',
      copyToClipboard: 'Copier dans le presse-papiers',
      shareOn: 'Partager sur',
    },
    
    // Subscription Badge
    subscriptionBadge: {
      free: 'Gratuit',
      premium: 'Premium',
    },
    
    // Usage Indicator
    usageIndicator: {
      messagesUsed: '{used} / {limit} messages utilisés',
      imagesGenerated: '{used} / {limit} images aujourd\'hui',
      unlimited: 'Illimité',
    },
    
    // 404
    notFound: {
      title: '404',
      subtitle: 'Oups ! Page non trouvée',
      returnHome: 'Retour à l\'Accueil',
    },
  },
};

export type TranslationKey = string;
