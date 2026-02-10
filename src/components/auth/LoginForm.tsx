import { useState, useRef, useCallback, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { Mail, Lock, Eye, EyeOff, ShieldAlert } from "lucide-react";
import { useAuth, useToast } from "../../hooks";
import { Button, Input, Card, CardHeader, CardTitle, CardDescription, CardContent } from "../ui";
import { useI18n } from "../../i18n";

const MAX_ATTEMPTS = 5;
const LOCKOUT_DURATION = 30; // seconds

export function LoginForm() {
  const navigate = useNavigate();
  const { signIn } = useAuth();
  const { toast } = useToast();
  const { t } = useI18n();
  
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});

  // Brute force protection
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [lockoutEnd, setLockoutEnd] = useState<number | null>(null);
  const [lockoutSeconds, setLockoutSeconds] = useState(0);
  const lockoutTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  const startLockout = useCallback(() => {
    const end = Date.now() + LOCKOUT_DURATION * 1000;
    setLockoutEnd(end);
    setLockoutSeconds(LOCKOUT_DURATION);

    if (lockoutTimer.current) clearInterval(lockoutTimer.current);
    lockoutTimer.current = setInterval(() => {
      const remaining = Math.ceil((end - Date.now()) / 1000);
      if (remaining <= 0) {
        setLockoutEnd(null);
        setLockoutSeconds(0);
        setFailedAttempts(0);
        if (lockoutTimer.current) clearInterval(lockoutTimer.current);
      } else {
        setLockoutSeconds(remaining);
      }
    }, 1000);
  }, []);

  const isLockedOut = lockoutEnd !== null && Date.now() < lockoutEnd;

  const validate = () => {
    const newErrors: { email?: string; password?: string } = {};
    
    if (!email) {
      newErrors.email = t.auth.emailRequired;
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = t.auth.invalidEmail;
    }
    
    if (!password) {
      newErrors.password = t.auth.passwordRequired;
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    
    if (!validate() || isLockedOut) return;
    
    setIsLoading(true);
    try {
      await signIn(email, password, rememberMe);
      setFailedAttempts(0);
      toast.success(t.auth.welcomeToast);
      navigate("/dashboard");
    } catch {
      const newAttempts = failedAttempts + 1;
      setFailedAttempts(newAttempts);

      if (newAttempts >= MAX_ATTEMPTS) {
        startLockout();
        toast.error(t.auth.loginFailed, t.auth.tooManyAttempts);
      } else {
        // Generic error message — never reveal whether email exists
        toast.error(t.auth.loginFailed, t.auth.invalidCredentials);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>{t.auth.welcomeBack}</CardTitle>
        <CardDescription>
          {t.auth.signInDescription}
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-text-muted" />
            <Input
              type="email"
              placeholder={t.auth.emailPlaceholder}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              error={errors.email}
              className="pl-10"
            />
          </div>
          
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-text-muted" />
            <Input
              type={showPassword ? "text" : "password"}
              placeholder={t.auth.passwordPlaceholder}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              error={errors.password}
              className="pl-10 pr-10"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text"
            >
              {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
            </button>
          </div>
          
          {isLockedOut && (
            <div className="flex items-center gap-3 rounded-lg bg-error/10 p-3 text-sm text-error">
              <ShieldAlert className="h-5 w-5 flex-shrink-0" />
              <span>{t.auth.lockedOut.replace("{seconds}", String(lockoutSeconds))}</span>
            </div>
          )}

          {failedAttempts > 0 && failedAttempts < MAX_ATTEMPTS && !isLockedOut && (
            <p className="text-xs text-text-muted text-center">
              {t.auth.attemptsRemaining.replace("{count}", String(MAX_ATTEMPTS - failedAttempts))}
            </p>
          )}

          <div className="flex items-center">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="rounded border-border"
              />
              <span className="text-sm text-text-muted">{t.auth.rememberMe}</span>
            </label>
          </div>
          
          <Button type="submit" className="w-full" isLoading={isLoading} disabled={isLockedOut}>
            {t.auth.signIn}
          </Button>
        </form>
      </CardContent>
      
    </Card>
  );
}
