import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Mail, Lock, Eye, EyeOff } from "lucide-react";
import { useAuth, useToast } from "../../hooks";
import { Button, Input, Card, CardHeader, CardTitle, CardDescription, CardContent } from "../ui";
import { useI18n } from "../../i18n";

export function LoginForm() {
  const navigate = useNavigate();
  const { signIn } = useAuth();
  const { toast } = useToast();
  const { t } = useI18n();
  
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});

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
    
    if (!validate()) return;
    
    setIsLoading(true);
    try {
      await signIn(email, password);
      toast.success(t.auth.welcomeToast);
      navigate("/dashboard");
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : t.auth.failedToSignIn;
      toast.error(t.auth.loginFailed, errorMessage);
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
          
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2">
              <input type="checkbox" className="rounded border-border" />
              <span className="text-sm text-text-muted">{t.auth.rememberMe}</span>
            </label>
            <Link
              to="/forgot-password"
              className="text-sm text-primary hover:underline"
            >
              {t.auth.forgotPassword}
            </Link>
          </div>
          
          <Button type="submit" className="w-full" isLoading={isLoading}>
            {t.auth.signIn}
          </Button>
        </form>
      </CardContent>
      
    </Card>
  );
}
