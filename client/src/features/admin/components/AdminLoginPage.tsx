import { LockKeyhole, ShieldCheck } from 'lucide-react';
import { Alert, AlertDescription } from '@/shared/ui/alert';
import { Button } from '@/shared/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/card';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';

type AdminLoginPageProps = {
    token: string;
    reviewerName: string;
    loading: boolean;
    error: string | null;
    onTokenChange: (value: string) => void;
    onReviewerNameChange: (value: string) => void;
    onSubmit: () => void;
};

/**
 * Dedicated login screen shown before moderation dashboard access.
 */
export function AdminLoginPage({
    token,
    reviewerName,
    loading,
    error,
    onTokenChange,
    onReviewerNameChange,
    onSubmit,
}: AdminLoginPageProps) {
    return (
        <div className="min-h-screen w-full bg-background text-foreground">
            <div className="flex min-h-screen w-full items-center justify-center gap-4 px-4 py-6 sm:px-6 sm:py-8 lg:gap-8 lg:px-8">
                <Card className="w-full max-w-[420px] border-2 border-border bg-card shadow-none">
                    <CardHeader className="space-y-2">
                        <p className="text-xs font-semibold tracking-[0.14em] text-muted-foreground uppercase">Das Nest</p>
                        <CardTitle className="text-lg">
                            login
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <form
                            className="space-y-4"
                            onSubmit={(event) => {
                                event.preventDefault();
                                onSubmit();
                            }}
                        >
                            <div className="space-y-2">
                                <Label htmlFor="admin-login-token">access token</Label>
                                <Input
                                    id="admin-login-token"
                                    name="admin-login-token"
                                    type="password"
                                    autoComplete="current-password"
                                    autoFocus
                                    value={token}
                                    onChange={(event) => onTokenChange(event.target.value)}
                                    placeholder="enter access token"
                                    disabled={loading}
                                    className="h-10 border-2 border-input bg-background"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="admin-login-reviewer">reviewer name</Label>
                                <Input
                                    id="admin-login-reviewer"
                                    name="admin-login-reviewer"
                                    type="text"
                                    autoComplete="nickname"
                                    value={reviewerName}
                                    onChange={(event) => onReviewerNameChange(event.target.value)}
                                    placeholder="admin"
                                    disabled={loading}
                                    className="h-10 border-2 border-input bg-background"
                                />
                            </div>

                            {error && (
                                <Alert aria-live="polite" className="border-2 border-destructive bg-background py-3">
                                    <AlertDescription className="text-sm text-destructive">{error}</AlertDescription>
                                </Alert>
                            )}

                            <Button
                                type="submit"
                                className="h-10 w-full border-2 border-primary font-semibold uppercase"
                                disabled={loading}
                            >
                                <LockKeyhole className="h-4 w-4" />
                                {loading ? 'Verifying access...' : 'Sign in'}
                            </Button>
                        </form>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}

