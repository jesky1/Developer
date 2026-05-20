"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Eye, EyeOff, Loader2, KeyRound, Check, X } from "lucide-react";
import { toast } from "sonner";
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

interface ChangePasswordModalProps {
    isOpen: boolean;
    onClose: () => void;
    userId: string;
    username: string;
    isAdmin: boolean;
}

export function ChangePasswordModal({
    isOpen,
    onClose,
    userId,
    username,
    isAdmin,
}: ChangePasswordModalProps) {
    const { t } = useTranslation();
    const [currentPassword, setCurrentPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [showCurrentPassword, setShowCurrentPassword] = useState(false);
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    // Password strength checks
    const hasMinLength = newPassword.length >= 8;
    const hasUppercase = /[A-Z]/.test(newPassword);
    const hasLowercase = /[a-z]/.test(newPassword);
    const hasNumber = /[0-9]/.test(newPassword);
    const passwordsMatch = newPassword && confirmPassword && newPassword === confirmPassword;

    const strengthScore = [hasMinLength, hasUppercase, hasLowercase, hasNumber].filter(Boolean).length;
    const strengthLabel =
        strengthScore <= 1 ? t("auth.weak") :
            strengthScore <= 3 ? t("auth.medium") :
                t("auth.strong");
    const strengthColor =
        strengthScore <= 1 ? "bg-red-500" :
            strengthScore <= 3 ? "bg-yellow-500" :
                "bg-green-500";

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");

        if (!currentPassword || !newPassword || !confirmPassword) {
            setError(t("auth.changePassword.allFieldsRequired"));
            return;
        }

        if (!hasMinLength || !hasUppercase || !hasLowercase || !hasNumber) {
            setError(t("auth.passwordRequirements"));
            return;
        }

        if (newPassword !== confirmPassword) {
            setError(t("auth.confirmMismatch"));
            return;
        }

        if (currentPassword === newPassword) {
            setError(t("auth.changePassword.samePassword"));
            return;
        }

        setLoading(true);
        try {
            // Get the stored auth token
            const token = localStorage.getItem("goalzone_admin_token");

            // Choose the right API endpoint based on user type
            const endpoint = isAdmin
                ? "/api/admin/auth?action=change-password"
                : "/api/auth/change-password";

            const body = isAdmin
                ? { userId, currentPassword, newPassword }
                : { currentPassword, newPassword };

            const res = await fetch(endpoint, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    ...(token ? { Authorization: `Bearer ${token}` } : {}),
                },
                body: JSON.stringify(body),
            });

            const data = await res.json();

            if (!res.ok) {
                setError(data.error || t("auth.changePassword.failed"));
                return;
            }

            toast.success(t("auth.changePassword.success"), {
                icon: <KeyRound className="w-4 h-4 text-neon" />,
            });

            // Reset form and close
            setCurrentPassword("");
            setNewPassword("");
            setConfirmPassword("");
            setError("");
            onClose();
        } catch (err) {
            setError(err instanceof Error ? err.message : t("auth.changePassword.failed"));
        } finally {
            setLoading(false);
        }
    };

    const handleClose = () => {
        if (!loading) {
            setCurrentPassword("");
            setNewPassword("");
            setConfirmPassword("");
            setError("");
            onClose();
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
            <DialogContent className="sm:max-w-md glass-card border-neon/10 p-0 overflow-hidden">
                {/* Header */}
                <div className="relative px-8 pt-8 pb-2">
                    <div
                        className="absolute inset-0 opacity-[0.03] pointer-events-none"
                        style={{
                            backgroundImage: `linear-gradient(var(--neon) 1px, transparent 1px), linear-gradient(90deg, var(--neon) 1px, transparent 1px)`,
                            backgroundSize: "40px 40px",
                        }}
                    />

                    <DialogHeader className="relative z-10">
                        <div className="flex flex-col items-center gap-3">
                            <motion.div
                                initial={{ scale: 0.8, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                transition={{ delay: 0.1, type: "spring", stiffness: 200, damping: 15 }}
                                className="flex h-12 w-12 items-center justify-center rounded-xl bg-neon shadow-lg shadow-neon/25"
                            >
                                <KeyRound className="h-6 w-6 text-neon-foreground" />
                            </motion.div>
                            <div className="text-center">
                                <DialogTitle className="text-xl font-bold tracking-wide">
                                    {t("auth.changePassword.title")}
                                </DialogTitle>
                                <DialogDescription className="text-sm text-muted-foreground mt-1">
                                    {t("auth.changePassword.subtitle")}
                                </DialogDescription>
                            </div>
                        </div>
                    </DialogHeader>
                </div>

                {/* Form */}
                <div className="px-8 pb-8 pt-2">
                    <form onSubmit={handleSubmit} className="space-y-4">
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

                        {/* Current Password */}
                        <div className="space-y-2">
                            <Label htmlFor="current-password" className="text-sm font-medium text-foreground">
                                {t("auth.changePassword.currentPassword")}
                            </Label>
                            <div className="relative">
                                <Input
                                    id="current-password"
                                    type={showCurrentPassword ? "text" : "password"}
                                    placeholder={t("auth.changePassword.enterCurrentPassword")}
                                    value={currentPassword}
                                    onChange={(e) => setCurrentPassword(e.target.value)}
                                    disabled={loading}
                                    className="h-11 bg-background/50 border-border focus:border-neon/50 focus:ring-neon/20 pr-10"
                                    autoComplete="current-password"
                                    autoFocus
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                                    tabIndex={-1}
                                >
                                    {showCurrentPassword ? (
                                        <EyeOff className="h-4 w-4" />
                                    ) : (
                                        <Eye className="h-4 w-4" />
                                    )}
                                </button>
                            </div>
                        </div>

                        {/* New Password */}
                        <div className="space-y-2">
                            <Label htmlFor="new-password" className="text-sm font-medium text-foreground">
                                {t("auth.changePassword.newPassword")}
                            </Label>
                            <div className="relative">
                                <Input
                                    id="new-password"
                                    type={showNewPassword ? "text" : "password"}
                                    placeholder={t("auth.changePassword.enterNewPassword")}
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    disabled={loading}
                                    className="h-11 bg-background/50 border-border focus:border-neon/50 focus:ring-neon/20 pr-10"
                                    autoComplete="new-password"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowNewPassword(!showNewPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                                    tabIndex={-1}
                                >
                                    {showNewPassword ? (
                                        <EyeOff className="h-4 w-4" />
                                    ) : (
                                        <Eye className="h-4 w-4" />
                                    )}
                                </button>
                            </div>

                            {/* Password strength indicator */}
                            {newPassword && (
                                <motion.div
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: "auto" }}
                                    exit={{ opacity: 0, height: 0 }}
                                    className="space-y-2"
                                >
                                    <div className="flex gap-1">
                                        {[1, 2, 3, 4].map((level) => (
                                            <div
                                                key={level}
                                                className={`h-1 flex-1 rounded-full transition-colors ${strengthScore >= level ? strengthColor : "bg-border"
                                                    }`}
                                            />
                                        ))}
                                    </div>
                                    <p className="text-xs text-muted-foreground">{strengthLabel}</p>

                                    {/* Requirements checklist */}
                                    <div className="grid grid-cols-2 gap-1">
                                        {[
                                            { check: hasMinLength, label: t("auth.minChars") },
                                            { check: hasUppercase, label: t("auth.uppercase") },
                                            { check: hasLowercase, label: t("auth.lowercase") },
                                            { check: hasNumber, label: t("auth.number") },
                                        ].map(({ check, label }) => (
                                            <div
                                                key={label}
                                                className={`flex items-center gap-1.5 text-[11px] ${check ? "text-green-500" : "text-muted-foreground"
                                                    }`}
                                            >
                                                {check ? (
                                                    <Check className="w-3 h-3" />
                                                ) : (
                                                    <X className="w-3 h-3" />
                                                )}
                                                {label}
                                            </div>
                                        ))}
                                    </div>
                                </motion.div>
                            )}
                        </div>

                        {/* Confirm New Password */}
                        <div className="space-y-2">
                            <Label htmlFor="confirm-new-password" className="text-sm font-medium text-foreground">
                                {t("auth.changePassword.confirmNewPassword")}
                            </Label>
                            <div className="relative">
                                <Input
                                    id="confirm-new-password"
                                    type={showConfirmPassword ? "text" : "password"}
                                    placeholder={t("auth.changePassword.repeatNewPassword")}
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    disabled={loading}
                                    className="h-11 bg-background/50 border-border focus:border-neon/50 focus:ring-neon/20 pr-10"
                                    autoComplete="new-password"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                                    tabIndex={-1}
                                >
                                    {showConfirmPassword ? (
                                        <EyeOff className="h-4 w-4" />
                                    ) : (
                                        <Eye className="h-4 w-4" />
                                    )}
                                </button>
                            </div>
                            {confirmPassword && (
                                <p
                                    className={`text-xs ${passwordsMatch ? "text-green-500" : "text-red-500"
                                        }`}
                                >
                                    {passwordsMatch
                                        ? t("auth.passwordMatch")
                                        : t("auth.passwordMismatch")}
                                </p>
                            )}
                        </div>

                        <Button
                            type="submit"
                            disabled={loading || !passwordsMatch || strengthScore < 4}
                            className="w-full h-11 bg-neon hover:bg-neon/90 text-neon-foreground font-semibold text-sm gap-2 shadow-lg shadow-neon/20"
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    {t("auth.changePassword.changing")}
                                </>
                            ) : (
                                <>
                                    <KeyRound className="w-4 h-4" />
                                    {t("auth.changePassword.submit")}
                                </>
                            )}
                        </Button>
                    </form>
                </div>
            </DialogContent>
        </Dialog>
    );
}
