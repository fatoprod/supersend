export type Locale = "pt-BR" | "en";

export interface Translations {
  // Common
  common: {
    search: string;
    save: string;
    cancel: string;
    delete: string;
    edit: string;
    copy: string;
    filter: string;
    import: string;
    loading: string;
    user: string;
    vsLastMonth: string;
    selected: string;
    noResults: string;
  };

  // Auth
  auth: {
    welcomeBack: string;
    signInDescription: string;
    emailPlaceholder: string;
    passwordPlaceholder: string;
    emailRequired: string;
    invalidEmail: string;
    passwordRequired: string;
    rememberMe: string;
    forgotPassword: string;
    signIn: string;
    welcomeToast: string;
    loginFailed: string;
    failedToSignIn: string;
    dontHaveAccount: string;
    signUp: string;
    createAccount: string;
    getStarted: string;
    fullNamePlaceholder: string;
    confirmPasswordPlaceholder: string;
    nameRequired: string;
    passwordMinLength: string;
    passwordRequirements: string;
    passwordsDoNotMatch: string;
    termsAgreement: string;
    termsOfService: string;
    and: string;
    privacyPolicy: string;
    accountCreated: string;
    verifyYourEmail: string;
    registrationFailed: string;
    failedToCreateAccount: string;
    alreadyHaveAccount: string;
    verifyEmail: string;
    codeSentTo: string;
    invalidCode: string;
    failedToVerifyCode: string;
    emailVerified: string;
    accountNowActive: string;
    codeSent: string;
    checkEmailForCode: string;
    failedToResend: string;
    tryAgainLater: string;
    didntReceiveCode: string;
    resend: string;
    signOut: string;
  };

  // Navigation
  nav: {
    dashboard: string;
    contacts: string;
    campaigns: string;
    templates: string;
    analytics: string;
    settings: string;
  };

  // Dashboard
  dashboard: {
    title: string;
    subtitle: string;
    totalContacts: string;
    campaignsSent: string;
    emailsSent: string;
    openRate: string;
    recentCampaigns: string;
    campaign: string;
    status: string;
    sent: string;
    opened: string;
    clicked: string;
    date: string;
    completed: string;
    scheduled: string;
    draft: string;
    processing: string;
    failed: string;
    paused: string;
  };

  // Contacts
  contacts: {
    title: string;
    totalContacts: string;
    searchPlaceholder: string;
    addContact: string;
    sendEmail: string;
    email: string;
    name: string;
    company: string;
    tags: string;
    added: string;
    active: string;
    unsubscribed: string;
  };

  // Campaigns
  campaigns: {
    title: string;
    subtitle: string;
    all: string;
    newCampaign: string;
    recipients: string;
    send: string;
    pause: string;
    viewReport: string;
    noCampaigns: string;
    createFirstCampaign: string;
  };

  // Templates
  templates: {
    title: string;
    subtitle: string;
    newTemplate: string;
    subject: string;
    lastUpdated: string;
    createNewTemplate: string;
    startFromScratch: string;
  };

  // Analytics
  analytics: {
    title: string;
    subtitle: string;
    clickRate: string;
    unsubscribeRate: string;
    bounceRate: string;
    performanceOverTime: string;
    chartComingSoon: string;
    topCampaigns: string;
    openPercent: string;
    clickPercent: string;
  };

  // Settings
  settings: {
    title: string;
    subtitle: string;
    profile: string;
    emailSettings: string;
    security: string;
    notifications: string;
    apiKeys: string;
    settingsSaved: string;
    changesSaved: string;
    profileInfo: string;
    updateProfileDescription: string;
    changePhoto: string;
    photoHelp: string;
    displayName: string;
    yourName: string;
    emailLabel: string;
    emailCannotChange: string;
    saveChanges: string;
    emailSettingsTitle: string;
    emailSettingsDescription: string;
    defaultFromName: string;
    defaultFromNamePlaceholder: string;
    defaultFromEmail: string;
    defaultFromEmailPlaceholder: string;
    replyToEmail: string;
    replyToEmailPlaceholder: string;
    unsubscribeLinkText: string;
    unsubscribeLinkPlaceholder: string;
    unsubscribe: string;
    securityTitle: string;
    securityDescription: string;
    currentPassword: string;
    currentPasswordPlaceholder: string;
    newPassword: string;
    newPasswordPlaceholder: string;
    confirmNewPassword: string;
    confirmNewPasswordPlaceholder: string;
    updatePassword: string;
    notificationPreferences: string;
    notificationDescription: string;
    campaignCompleted: string;
    campaignCompletedDesc: string;
    newSubscriber: string;
    newSubscriberDesc: string;
    weeklyDigest: string;
    weeklyDigestDesc: string;
    productUpdates: string;
    productUpdatesDesc: string;
    savePreferences: string;
    apiKeysTitle: string;
    apiKeysDescription: string;
    productionApiKey: string;
    testApiKey: string;
    regenerate: string;
    generateNewApiKey: string;
    language: string;
    languageDescription: string;
  };

  // 404
  notFound: {
    title: string;
    message: string;
    goToDashboard: string;
  };
}
