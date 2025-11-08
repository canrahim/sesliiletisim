export const translations = {
  en: {
    // Auth Modal
    welcome: 'Welcome',
    welcomeBack: 'Welcome Back',
    login: 'Sign In',
    register: 'Sign Up',
    email: 'Email',
    username: 'Username',
    password: 'Password',
    displayName: 'Display Name (optional)',
    forgotPassword: 'Forgot password?',
    noAccount: "Don't have an account?",
    hasAccount: 'Already have an account?',
    loginSuccess: 'Login successful!',
    registerSuccess: 'Registration successful!',
    loading: 'Loading...',
    
    // Placeholders
    emailPlaceholder: 'Enter your email',
    usernamePlaceholder: 'Enter your username',
    passwordPlaceholder: 'Enter your password',
    displayNamePlaceholder: 'Enter your display name',
    
    // Errors
    emailRequired: 'Email is required',
    usernameRequired: 'Username is required',
    passwordRequired: 'Password is required',
    invalidEmail: 'Invalid email address',
    passwordTooShort: 'Password must be at least 8 characters',
    loginFailed: 'Login failed. Please check your credentials.',
    registerFailed: 'Registration failed. Please try again.',
  },
  tr: {
    // Auth Modal
    welcome: 'Hoş Geldiniz',
    welcomeBack: 'Tekrar Hoş Geldiniz',
    login: 'Giriş Yap',
    register: 'Kayıt Ol',
    email: 'E-posta',
    username: 'Kullanıcı Adı',
    password: 'Şifre',
    displayName: 'Görünen Ad (opsiyonel)',
    forgotPassword: 'Şifremi unuttum?',
    noAccount: 'Hesabınız yok mu?',
    hasAccount: 'Zaten hesabınız var mı?',
    loginSuccess: 'Giriş başarılı!',
    registerSuccess: 'Kayıt başarılı!',
    loading: 'Yükleniyor...',
    
    // Placeholders
    emailPlaceholder: 'E-posta adresinizi girin',
    usernamePlaceholder: 'Kullanıcı adınızı girin',
    passwordPlaceholder: 'Şifrenizi girin',
    displayNamePlaceholder: 'Görünen adınızı girin',
    
    // Errors
    emailRequired: 'E-posta gerekli',
    usernameRequired: 'Kullanıcı adı gerekli',
    passwordRequired: 'Şifre gerekli',
    invalidEmail: 'Geçersiz e-posta adresi',
    passwordTooShort: 'Şifre en az 8 karakter olmalı',
    loginFailed: 'Giriş başarısız. Lütfen bilgilerinizi kontrol edin.',
    registerFailed: 'Kayıt başarısız. Lütfen tekrar deneyin.',
  },
};

export type Language = keyof typeof translations;
export type TranslationKey = keyof typeof translations.en;

