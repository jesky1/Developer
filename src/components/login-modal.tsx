"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Zap, Eye, EyeOff, Loader2, LogIn } from "lucide-react";
import { toast } from "sonner";
import { signIn } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { useTranslation } from "@/lib/i18n";

interface LoginUser {
  id: string;
  username: string;
  email: string;
  displayName: string;
  avatarUrl: string;
  role: string;
  isActive: boolean;
}

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (user: LoginUser, token: string) => void;
  onSwitchToRegister: () => void;
}

function GoogleIcon() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 24 24">
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        fill="#EA4335"
      />
    </svg>
  );
}

export function LoginModal({ isOpen, onClose, onLoginSuccess, onSwitchToRegister }: LoginModalProps) {
  const { t } = useTranslation();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!username.trim() || !password.trim()) {
      setError(t("auth.fillCredentials"));
      return;
    }

    setLoading(true);
    try {
      // STEP 1: Try admin auth first (for AdminUser table)
      // Admin users are in the AdminUser table, not the regular User table
      try {
        const adminRes = await fetch("/api/admin/auth?action=login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username: username.trim(), password }),
        });

        const adminData = await adminRes.json();

        if (adminRes.ok && adminData.token) {
          // Admin login successful
          toast.success(t("auth.welcomeBack"), {
            icon: <LogIn className="w-4 h-4 text-neon" />,
          });

          onLoginSuccess(adminData.user, adminData.token);

          // Reset form
          setUsername("");
          setPassword("");
          setError("");
          return; // Done!
        }
        // Admin auth failed — continue to try NextAuth for regular users
      } catch {
        // Admin auth request failed — continue to try NextAuth
      }

      // STEP 2: Try NextAuth credentials login (for regular User table)
      const result = await signIn("credentials", {
        redirect: false,
        email: username.trim(),
        password,
      });

      if (result?.error) {
        // Both admin and NextAuth failed
        setError(result.error === "Configuration" ? t("auth.configError") : result.error);
        return;
      }

      if (result?.ok) {
        toast.success(t("auth.loginSuccess"), {
          icon: <LogIn className="w-4 h-4 text-neon" />,
        });

        // Refresh to get the session
        window.location.reload();
      }

      // Reset form
      setUsername("");
      setPassword("");
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : t("auth.loginFailed"));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setGoogleLoading(true);
    setError("");
    try {
      await signIn("google", { callbackUrl: "/" });
    } catch {
      setError(t("auth.googleFailed"));
      setGoogleLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading && !googleLoading) {
      onClose();
      setError("");
    }
  };

  const handleSwitchToRegister = () => {
    if (!loading && !googleLoading) {
      onClose();
      setError("");
      onSwitchToRegister();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="sm:max-w-md glass-card border-neon/10 p-0 overflow-hidden">
        {/* Header */}
        <div className="relative px-8 pt-8 pb-2">
          {/* Decorative background */}
          <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{
            backgroundImage: `linear-gradient(var(--neon) 1px, transparent 1px), linear-gradient(90deg, var(--neon) 1px, transparent 1px)`,
            backgroundSize: '40px 40px',
          }} />

          <DialogHeader className="relative z-10">
            <div className="flex flex-col items-center gap-3">
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.1, type: "spring", stiffness: 200, damping: 15 }}
                className="flex h-12 w-12 items-center justify-center rounded-xl bg-neon shadow-lg shadow-neon/25"
              >
                <Zap className="h-6 w-6 text-neon-foreground" />
              </motion.div>
              <div className="text-center">
                <DialogTitle className="text-xl font-bold tracking-wide">
                  GOAL<span className="text-neon">ZONE</span>
                </DialogTitle>
                <DialogDescription className="text-sm text-muted-foreground mt-1">
                  {t("auth.loginTitle")}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
        </div>

        {/* Form */}
        <div className="px-8 pb-8 pt-2">
          {/* Google Login Button */}
          <Button
            type="button"
            variant="outline"
            disabled={googleLoading || loading}
            onClick={handleGoogleLogin}
            className="w-full h-11 border-border hover:bg-neon/5 font-medium text-sm gap-3 mb-4"
          >
            {googleLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <GoogleIcon />
            )}
            {t("auth.signInWithGoogle")}
          </Button>

          {/* Divider */}
          <div className="relative my-4">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border/50" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="px-3 bg-background text-muted-foreground">{t("auth.or")}</span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Error message */}
            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-500"
                >
                  {error}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Username/Email field */}
            <div className="space-y-2">
              <Label htmlFor="login-username" className="text-sm font-medium text-foreground">
                {t("auth.usernameEmail")}
              </Label>
              <Input
                id="login-username"
                type="text"
                placeholder={t("auth.enterUsername")}
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                disabled={loading || googleLoading}
                className="h-11 bg-background/50 border-border focus:border-neon/50 focus:ring-neon/20"
                autoComplete="username"
                autoFocus
              />
            </div>

            {/* Password field */}
            <div className="space-y-2">
              <Label htmlFor="login-password" className="text-sm font-medium text-foreground">
                {t("auth.password")}
              </Label>
              <div className="relative">
                <Input
                  id="login-password"
                  type={showPassword ? "text" : "password"}
                  placeholder={t("auth.enterPassword")}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading || googleLoading}
                  className="h-11 bg-background/50 border-border focus:border-neon/50 focus:ring-neon/20 pr-10"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 h-4" />
                  ) : (
                    <Eye className="h-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            {/* Submit button */}
            <Button
              type="submit"
              disabled={loading || googleLoading}
              className="w-full h-11 bg-neon hover:bg-neon/90 text-neon-foreground font-semibold text-sm gap-2 shadow-lg shadow-neon/20"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {t("auth.signingIn")}
                </>
              ) : (
                <>
                  <LogIn className="h-4 w-4" />
                  {t("auth.signIn")}
                </>
              )}
            </Button>

            {/* Switch to Register */}
            <div className="text-center pt-1">
              <p className="text-sm text-muted-foreground">
                {t("auth.noAccount")}{" "}
                <button
                  type="button"
                  onClick={handleSwitchToRegister}
                  className="text-neon hover:underline font-medium"
                >
                  {t("auth.registerHere")}
                </button>
              </p>
            </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
