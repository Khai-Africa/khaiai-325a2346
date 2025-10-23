import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";
import { Separator } from "@/components/ui/separator";
import khaiLogo from "@/assets/khai-ai-logo.png";
import { useTranslation } from "@/hooks/useTranslation";
import { LanguageSwitch } from "@/components/LanguageSwitch";

const signupSchema = z.object({
  username: z.string().trim().min(3, { message: "Username must be at least 3 characters" }).max(30),
  mobile: z.string().trim().optional(),
  email: z.string().trim().email({ message: "Invalid email address" }).max(255),
  password: z.string().min(6, { message: "Password must be at least 6 characters" }).max(100),
  confirmPassword: z.string(),
  secretWord: z.string().trim().min(3, { message: "Secret word must be at least 3 characters" }).max(50),
  confirmSecretWord: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
}).refine((data) => data.secretWord === data.confirmSecretWord, {
  message: "Secret words don't match",
  path: ["confirmSecretWord"],
});

const resetSchema = z.object({
  email: z.string().trim().email({ message: "Invalid email address" }),
});

const loginSchema = z.object({
  identifier: z.string().trim().min(1, { message: "Username or mobile number required" }),
  password: z.string().min(1, { message: "Password required" }),
});

const Auth = () => {
  const { t } = useTranslation();
  const [isLogin, setIsLogin] = useState(true);
  const [isResetPassword, setIsResetPassword] = useState(false);
  const [identifier, setIdentifier] = useState("");
  const [username, setUsername] = useState("");
  const [mobile, setMobile] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [secretWord, setSecretWord] = useState("");
  const [confirmSecretWord, setConfirmSecretWord] = useState("");
  const [loading, setLoading] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetSecretWord, setResetSecretWord] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    // Check if user is already logged in and redirect immediately
    const checkAndRedirect = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        const params = new URLSearchParams(window.location.search);
        const redirect = params.get('redirect');
        navigate(redirect === 'premium' ? '/premium' : '/', { replace: true });
      }
    };

    checkAndRedirect();

    // Also listen for auth state changes (important for OAuth redirects)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session) {
        const params = new URLSearchParams(window.location.search);
        const redirect = params.get('redirect');
        navigate(redirect === 'premium' ? '/premium' : '/', { replace: true });
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const result = loginSchema.safeParse({ identifier, password });
    if (!result.success) {
      toast({
        title: "Validation Error",
        description: result.error.errors[0].message,
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      // Call the auth-login edge function
      const { data, error } = await supabase.functions.invoke("auth-login", {
        body: { 
          identifier: result.data.identifier, 
          password: result.data.password 
        },
      });

      if (error || data?.error) {
        toast({
          title: "Login Failed",
          description: data?.error || "Invalid username/mobile or password.",
          variant: "destructive",
        });
      } else if (data?.session) {
        // Set the session manually
        await supabase.auth.setSession({
          access_token: data.session.access_token,
          refresh_token: data.session.refresh_token,
        });
        
        toast({
          title: "Welcome back!",
          description: "You've successfully logged in.",
        });
        
        // Check if user came from upgrade flow
        const params = new URLSearchParams(window.location.search);
        const redirect = params.get('redirect');
        navigate(redirect === 'premium' ? '/premium' : '/');
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const result = signupSchema.safeParse({ 
      username, 
      mobile, 
      email, 
      password, 
      confirmPassword,
      secretWord,
      confirmSecretWord
    });
    
    if (!result.success) {
      toast({
        title: "Validation Error",
        description: result.error.errors[0].message,
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      // Check if username already exists
      const { data: existingUser } = await supabase
        .from("profiles")
        .select("username")
        .eq("username", result.data.username)
        .maybeSingle();

      if (existingUser) {
        toast({
          title: "Username Taken",
          description: "Please choose a different username.",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      const redirectUrl = `${window.location.origin}/`;
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email: result.data.email,
        password: result.data.password,
        options: {
          emailRedirectTo: redirectUrl,
        },
      });

      if (signUpError) {
        toast({
          title: "Error",
          description: signUpError.message,
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      if (authData.user) {
        // Create profile with secret word
        const { error: profileError } = await supabase
          .from("profiles")
          .insert({
            id: authData.user.id,
            username: result.data.username,
            mobile_number: result.data.mobile || null,
            secret_word: result.data.secretWord.toLowerCase(),
          });

        if (profileError) {
          toast({
            title: "Error",
            description: "Failed to create profile. Please try again.",
            variant: "destructive",
          });
          setLoading(false);
          return;
        }

        // Send welcome email
        try {
          await supabase.functions.invoke('send-email', {
            body: {
              templateKey: 'welcome',
              recipientEmail: result.data.email,
              recipientName: result.data.username,
              userId: authData.user.id,
              variables: {
                username: result.data.username,
              },
            },
          });
        } catch (emailError) {
          console.error('Failed to send welcome email:', emailError);
          // Don't block signup if email fails
        }

        // Send in-app notification
        try {
          await supabase.functions.invoke('send-in-app-notification', {
            body: {
              userId: authData.user.id,
              title: 'Welcome to Khai AI! 🎉',
              message: 'Your AI assistant is ready. Start chatting now!',
              type: 'success',
              actionUrl: '/',
            },
          });
        } catch (notifError) {
          console.error('Failed to send notification:', notifError);
        }

        toast({
          title: "Account Created!",
          description: "You've successfully signed up. Welcome to Khai AI!",
        });
        
        // Check if user came from upgrade flow
        const params = new URLSearchParams(window.location.search);
        const redirect = params.get('redirect');
        navigate(redirect === 'premium' ? '/premium' : '/');
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!resetEmail || !resetSecretWord || !newPassword) {
      toast({
        title: "Validation Error",
        description: "All fields are required",
        variant: "destructive",
      });
      return;
    }

    if (newPassword.length < 6) {
      toast({
        title: "Validation Error",
        description: "Password must be at least 6 characters",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      // Call edge function to verify secret word and reset password
      const { data, error } = await supabase.functions.invoke("reset-password", {
        body: { 
          email: resetEmail,
          secretWord: resetSecretWord.toLowerCase(),
          newPassword: newPassword
        },
      });

      if (error || data?.error) {
        toast({
          title: "Reset Failed",
          description: data?.error || "Invalid email or secret word.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Success!",
          description: "Your password has been reset successfully.",
        });
        
        setIsResetPassword(false);
        setResetEmail("");
        setResetSecretWord("");
        setNewPassword("");
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "An error occurred. Please try again later.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    try {
      // Check if user came from upgrade flow
      const params = new URLSearchParams(window.location.search);
      const redirect = params.get('redirect');
      const redirectPath = redirect === 'premium' ? '/premium' : '/';
      
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}${redirectPath}`,
        },
      });

      if (error) {
        toast({
          title: "Error",
          description: error.message,
          variant: "destructive",
        });
        setLoading(false);
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to initiate Google login.",
        variant: "destructive",
      });
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/5 p-4 sm:p-6">
      <div className="absolute top-2 right-2 sm:top-4 sm:right-4 z-20">
        <LanguageSwitch />
      </div>
      <div className="w-full max-w-md px-4 sm:px-0">
        <div className="text-center mb-6 sm:mb-8">
          <button 
            onClick={() => navigate("/")}
            className="inline-block cursor-pointer hover:opacity-80 transition-opacity"
          >
            <img 
              src={khaiLogo} 
              alt="Khai AI" 
              className="w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-3 sm:mb-4"
            />
          </button>
          <h1 className="text-2xl sm:text-3xl font-bold mb-2">{t('auth.welcomeTitle')}</h1>
          <p className="text-sm sm:text-base text-muted-foreground px-2">
            {isLogin ? t('auth.signInSubtitle') : t('auth.signUpSubtitle')}
          </p>
        </div>

        <div className="bg-card border rounded-lg p-4 sm:p-8 shadow-lg">
          {isResetPassword ? (
            <form onSubmit={handleResetPassword} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="reset-email">{t('auth.emailAddress')}</Label>
                <Input
                  id="reset-email"
                  type="email"
                  placeholder={t('auth.enterYourEmail')}
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                  required
                  disabled={loading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="reset-secret">{t('auth.secretWord')}</Label>
                <Input
                  id="reset-secret"
                  type="text"
                  placeholder={t('auth.enterSecretWord')}
                  value={resetSecretWord}
                  onChange={(e) => setResetSecretWord(e.target.value)}
                  required
                  disabled={loading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="new-password">{t('auth.newPassword')}</Label>
                <Input
                  id="new-password"
                  type="password"
                  placeholder={t('auth.enterNewPassword')}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  disabled={loading}
                  minLength={6}
                />
              </div>

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? t('auth.pleaseWait') : t('auth.resetPassword')}
              </Button>

              <Button
                type="button"
                variant="ghost"
                className="w-full"
                onClick={() => {
                  setIsResetPassword(false);
                  setResetEmail("");
                  setResetSecretWord("");
                  setNewPassword("");
                }}
                disabled={loading}
              >
                {t('auth.backToLogin')}
              </Button>
            </form>
          ) : isLogin ? (
            <>
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="identifier">{t('auth.usernameOrMobile')}</Label>
                  <Input
                    id="identifier"
                    type="text"
                    placeholder={t('auth.enterUsername')}
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    required
                    disabled={loading}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">{t('auth.password')}</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder={t('auth.enterPassword')}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    disabled={loading}
                    minLength={6}
                  />
                </div>

                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? t('auth.pleaseWait') : t('auth.signIn')}
                </Button>
              </form>

              <Separator className="my-4" />

              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={handleGoogleLogin}
                disabled={loading}
              >
                <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                {t('auth.continueWithGoogle')}
              </Button>

              <div className="mt-6 text-center space-y-2">
                <button
                  onClick={() => setIsLogin(false)}
                  className="text-sm text-primary hover:underline block w-full"
                  disabled={loading}
                >
                  {t('auth.dontHaveAccount')}
                </button>
                <button
                  onClick={() => setIsResetPassword(true)}
                  className="text-sm text-muted-foreground hover:underline block w-full"
                  disabled={loading}
                >
                  {t('auth.forgotPassword')}
                </button>
              </div>
            </>
          ) : (
            <>
              <form onSubmit={handleSignup} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="username">{t('auth.username')} *</Label>
                  <Input
                    id="username"
                    type="text"
                    placeholder={t('auth.chooseUsername')}
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                    disabled={loading}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="mobile">{t('auth.mobile')}</Label>
                  <Input
                    id="mobile"
                    type="tel"
                    placeholder={t('auth.enterMobile')}
                    value={mobile}
                    onChange={(e) => setMobile(e.target.value)}
                    disabled={loading}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">{t('auth.email')}</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder={t('auth.enterEmail')}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={loading}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="signup-password">{t('auth.password')} *</Label>
                  <Input
                    id="signup-password"
                    type="password"
                    placeholder={t('auth.createPassword')}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    disabled={loading}
                    minLength={6}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirm-password">{t('auth.confirmPassword')}</Label>
                  <Input
                    id="confirm-password"
                    type="password"
                    placeholder={t('auth.confirmYourPassword')}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    disabled={loading}
                    minLength={6}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="secret-word">{t('auth.secretWord')} *</Label>
                  <Input
                    id="secret-word"
                    type="text"
                    placeholder={t('auth.enterSecretWord')}
                    value={secretWord}
                    onChange={(e) => setSecretWord(e.target.value)}
                    required
                    disabled={loading}
                  />
                  <p className="text-xs text-muted-foreground">
                    This will be used for password recovery
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirm-secret">{t('auth.confirmSecretWord')}</Label>
                  <Input
                    id="confirm-secret"
                    type="text"
                    placeholder={t('auth.confirmSecretWord')}
                    value={confirmSecretWord}
                    onChange={(e) => setConfirmSecretWord(e.target.value)}
                    required
                    disabled={loading}
                  />
                </div>

                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? t('auth.creatingAccount') : t('auth.signUp')}
                </Button>
              </form>

              <Separator className="my-4" />

              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={handleGoogleLogin}
                disabled={loading}
              >
                <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                {t('auth.continueWithGoogle')}
              </Button>

              <div className="mt-6 text-center">
                <button
                  onClick={() => setIsLogin(true)}
                  className="text-sm text-primary hover:underline"
                  disabled={loading}
                >
                  {t('auth.alreadyHaveAccount')}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default Auth;
