"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Zap, Eye, EyeOff, Loader2, UserPlus, Check, X } from "lucide-react";
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

interface RegisterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSwitchToLogin: () => void;
  onRegisterSuccess: (user: RegisterUser, token: string) => void;
}

export interface RegisterUser {
  id: string;
  name: string;
  email: string;
  image: string;
  provider: string;
  role: string;
  isActive: boolean;
}

export function RegisterModal({ isOpen, onClose, onSwitchToLogin, onRegisterSuccess }: RegisterModalProps) {
  const { t } = useTranslation();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState("");

  // Password strength indicators
  const passwordChecks = useMemo(() => ({
    minLength: password.length >= 8,
    hasUppercase: /[A-Z]/.test(password),
    hasLowercase: /[a-z]/.test(password),
    hasNumber: /[0-9]/.test(password),
  }), [password]);

  const passwordStrength = useMemo(() => {
    const checks = Object.values(passwordChecks);
    const passed = checks.filter(Boolean).length;
    if (passed === 0) return { level: 0, label: "", color: "" };
    if (passed <= 2) return { level: 1, label: t("auth.weak"), color: "text-red-500" };
    if (passed <= 3) return { level: 2, label: t("auth.medium"), color: "text-yellow-500" };
    return { level: 3, label: t("auth.strong"), color: "text-green-500" };
  }, [passwordChecks, t]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    // Client-side validation
    if (!name.trim()) {
      setError(t("auth.nameRequired"));
      return;
    }

    if (name.trim().length < 2) {
      setError(t("auth.nameMinLength"));
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      setError(t("auth.invalidEmail"));
      return;
    }

    if (!passwordChecks.minLength || !passwordChecks.hasUppercase || !passwordChecks.hasLowercase || !passwordChecks.hasNumber) {
      setError(t("auth.passwordRequirements"));
      return;
    }

    if (password !== confirmPassword) {
      setError(t("auth.confirmMismatch"));
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          password,
          confirmPassword,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || t("auth.registerFailed"));
      }

      toast.success(t("auth.registerSuccess"), {
        icon: <UserPlus className="w-4 h-4 text-neon" />,
        duration: 4000,
      });

      onRegisterSuccess(data.user, data.token);
      // Reset form
      setName("");
      setEmail("");
      setPassword("");
      setConfirmPassword("");
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : t("auth.registerFailed"));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleRegister = async () => {
    setGoogleLoading(true);
    setError("");
    try {
      await signIn("google", { callbackUrl: "/" });
    } catch {
      setError(t("auth.googleRegisterFailed"));
      setGoogleLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading && !googleLoading) {
      onClose();
      setError("");
    }
  };

  const handleSwitchToLogin = () => {
    if (!loading && !googleLoading) {
      onClose();
      setError("");
      onSwitchToLogin();
    }
  };

  const CheckItem = ({ passed, label }: { passed: boolean; label: string }) => (
    <div className={`flex items-center gap-1.5 text-[11px] transition-colors ${passed ? 'text-green-500' : 'text-muted-foreground/60'}`}>
      {passed ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
      <span>{label}</span>
    </div>
  );

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="sm:max-w-md glass-card border-neon/10 p-0 overflow-hidden max-h-[90vh] overflow-y-auto">
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
                  {t("auth.registerTitle")}<span className="text-neon">ZONE</span>
                </DialogTitle>
                <DialogDescription className="text-sm text-muted-foreground mt-1">
                  {t("auth.registerSubtitle")}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
        </div>

        {/* Form */}
        <div className="px-8 pb-8 pt-2">
          {/* Google Register Button */}
          <Button
            type="button"
            variant="outline"
            disabled={googleLoading || loading}
            onClick={handleGoogleRegister}
            className="w-full h-11 border-border hover:bg-neon/5 font-medium text-sm gap-3 mb-4"
          >
            {googleLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <GoogleIcon />
            )}
            {t("auth.signUpWithGoogle")}
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

            {/* Full Name field */}
            <div className="space-y-2">
              <Label htmlFor="register-name" className="text-sm font-medium text-foreground">
                {t("auth.fullName")}
              </Label>
              <Input
                id="register-name"
                type="text"
                placeholder={t("auth.enterFullName")}
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={loading || googleLoading}
                className="h-11 bg-background/50 border-border focus:border-neon/50 focus:ring-neon/20"
                autoComplete="name"
                autoFocus
              />
            </div>

            {/* Email field */}
            <div className="space-y-2">
              <Label htmlFor="register-email" className="text-sm font-medium text-foreground">
                {t("auth.email")}
              </Label>
              <Input
                id="register-email"
                type="email"
                placeholder={t("auth.enterEmail")}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading || googleLoading}
                className="h-11 bg-background/50 border-border focus:border-neon/50 focus:ring-neon/20"
                autoComplete="email"
              />
            </div>

            {/* Password field */}
            <div className="space-y-2">
              <Label htmlFor="register-password" className="text-sm font-medium text-foreground">
                {t("auth.password")}
              </Label>
              <div className="relative">
                <Input
                  id="register-password"
                  type={showPassword ? "text" : "password"}
                  placeholder={t("auth.minChars")}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading || googleLoading}
                  className="h-11 bg-background/50 border-border focus:border-neon/50 focus:ring-neon/20 pr-10"
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>

              {/* Password strength indicators */}
              {password.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="space-y-1.5 pt-1"
                >
                  {/* Strength bar */}
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-1 rounded-full bg-muted overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${
                          passwordStrength.level === 1 ? 'w-1/3 bg-red-500' :
                          passwordStrength.level === 2 ? 'w-2/3 bg-yellow-500' :
                          passwordStrength.level === 3 ? 'w-full bg-green-500' : 'w-0'
                        }`}
                      />
                    </div>
                    <span className={`text-[11px] font-medium ${passwordStrength.color}`}>
                      {passwordStrength.label}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-x-3 gap-y-0.5">
                    <CheckItem passed={passwordChecks.minLength} label={t("auth.minChars")} />
                    <CheckItem passed={passwordChecks.hasUppercase} label={t("auth.uppercase")} />
                    <CheckItem passed={passwordChecks.hasLowercase} label={t("auth.lowercase")} />
                    <CheckItem passed={passwordChecks.hasNumber} label={t("auth.number")} />
                  </div>
                </motion.div>
              )}
            </div>

            {/* Confirm Password field */}
            <div className="space-y-2">
              <Label htmlFor="register-confirm-password" className="text-sm font-medium text-foreground">
                {t("auth.confirmPassword")}
              </Label>
              <div className="relative">
                <Input
                  id="register-confirm-password"
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder={t("auth.repeatPassword")}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  disabled={loading || googleLoading}
                  className={`h-11 bg-background/50 border-border focus:border-neon/50 focus:ring-neon/20 pr-10 ${
                    confirmPassword && confirmPassword !== password ? 'border-red-500/50 focus:border-red-500/50' :
                    confirmPassword && confirmPassword === password ? 'border-green-500/50 focus:border-green-500/50' : ''
                  }`}
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  tabIndex={-1}
                >
                  {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {confirmPassword && confirmPassword !== password && (
                <p className="text-[11px] text-red-500">{t("auth.passwordMismatch")}</p>
              )}
              {confirmPassword && confirmPassword === password && (
                <p className="text-[11px] text-green-500">{t("auth.passwordMatch")}</p>
              )}
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
                  {t("auth.signingUp")}
                </>
              ) : (
                <>
                  <UserPlus className="h-4 w-4" />
                  {t("auth.signUp")}
                </>
              )}
            </Button>

            {/* Switch to Login */}
            <div className="text-center pt-1">
              <p className="text-sm text-muted-foreground">
                {t("auth.hasAccount")}{" "}
                <button
                  type="button"
                  onClick={handleSwitchToLogin}
                  className="text-neon hover:underline font-medium"
                >
                  {t("auth.loginHere")}
                </button>
              </p>
            </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
