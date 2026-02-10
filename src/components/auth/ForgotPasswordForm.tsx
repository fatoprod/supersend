import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { Mail, ArrowLeft, CheckCircle } from "lucide-react";
import { sendPasswordResetEmail } from "firebase/auth";
import { auth } from "../../lib/firebase";
import { useToast } from "../../hooks";
import { Button, Input, Card, CardHeader, CardTitle, CardDescription, CardContent } from "../ui";
import { useI18n } from "../../i18n";

export function ForgotPasswordForm() {
  const { toast } = useToast();
  const { t } = useI18n();

  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  const validate = () => {
    if (!email) {
      setError(t.auth.emailRequired);
      return false;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError(t.auth.invalidEmail);
      return false;
    }
    setError("");
    return true;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setIsLoading(true);
    try {
      await sendPasswordResetEmail(auth, email);
      setSent(true);
      toast.success(t.auth.resetEmailSent);
    } catch {
      // Always show success to avoid revealing if email exists
      setSent(true);
    } finally {
      setIsLoading(false);
    }
  };

  if (sent) {
    return (
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-success/10">
            <CheckCircle className="h-8 w-8 text-success" />
          </div>
          <CardTitle className="text-center">{t.auth.resetEmailSent}</CardTitle>
          <CardDescription className="text-center">
            {t.auth.resetEmailDescription}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Link to="/login">
            <Button variant="secondary" className="w-full">
              <ArrowLeft className="mr-2 h-4 w-4" />
              {t.auth.backToLogin}
            </Button>
          </Link>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>{t.auth.resetPassword}</CardTitle>
        <CardDescription>
          {t.auth.resetPasswordDescription}
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
              error={error}
              className="pl-10"
            />
          </div>

          <Button type="submit" className="w-full" isLoading={isLoading}>
            {t.auth.sendResetLink}
          </Button>

          <div className="text-center">
            <Link
              to="/login"
              className="inline-flex items-center gap-1 text-sm text-text-muted hover:text-primary"
            >
              <ArrowLeft className="h-3 w-3" />
              {t.auth.backToLogin}
            </Link>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
