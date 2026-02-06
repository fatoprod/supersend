import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Mail, Lock, User, Eye, EyeOff } from "lucide-react";
import { useAuth, useToast } from "../../hooks";
import { Button, Input, Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "../ui";
import { useI18n } from "../../i18n";

export function RegisterForm() {
  const navigate = useNavigate();
  const { signUp } = useAuth();
  const { toast } = useToast();
  const { t } = useI18n();
  
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const newErrors: Record<string, string> = {};
    
    if (!name.trim()) {
      newErrors.name = t.auth.nameRequired;
    }
    
    if (!email) {
      newErrors.email = t.auth.emailRequired;
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = t.auth.invalidEmail;
    }
    
    if (!password) {
      newErrors.password = t.auth.passwordRequired;
    } else if (password.length < 8) {
      newErrors.password = t.auth.passwordMinLength;
    } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password)) {
      newErrors.password = t.auth.passwordRequirements;
    }
    
    if (password !== confirmPassword) {
      newErrors.confirmPassword = t.auth.passwordsDoNotMatch;
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    
    if (!validate()) return;
    
    setIsLoading(true);
    try {
      await signUp(email, password, name);
      toast.success(t.auth.accountCreated, t.auth.verifyYourEmail);
      navigate("/verify-email");
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : t.auth.failedToCreateAccount;
      toast.error(t.auth.registrationFailed, errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>{t.auth.createAccount}</CardTitle>
        <CardDescription>
          {t.auth.getStarted}
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative">
            <User className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-text-muted" />
            <Input
              type="text"
              placeholder={t.auth.fullNamePlaceholder}
              value={name}
              onChange={(e) => setName(e.target.value)}
              error={errors.name}
              className="pl-10"
            />
          </div>
          
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
          
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-text-muted" />
            <Input
              type={showPassword ? "text" : "password"}
              placeholder={t.auth.confirmPasswordPlaceholder}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              error={errors.confirmPassword}
              className="pl-10"
            />
          </div>
          
          <p className="text-xs text-text-muted">
            {t.auth.termsAgreement}{" "}
            <Link to="/terms" className="text-primary hover:underline">
              {t.auth.termsOfService}
            </Link>{" "}
            {t.auth.and}{" "}
            <Link to="/privacy" className="text-primary hover:underline">
              {t.auth.privacyPolicy}
            </Link>
          </p>
          
          <Button type="submit" className="w-full" isLoading={isLoading}>
            {t.auth.createAccount}
          </Button>
        </form>
      </CardContent>
      
      <CardFooter className="justify-center">
        <p className="text-sm text-text-muted">
          {t.auth.alreadyHaveAccount}{" "}
          <Link to="/login" className="text-primary hover:underline">
            {t.auth.signIn}
          </Link>
        </p>
      </CardFooter>
    </Card>
  );
}
