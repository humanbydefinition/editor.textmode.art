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
            <div className="grid min-h-screen w-full gap-4 px-4 py-6 sm:px-6 sm:py-8 lg:grid-cols-[minmax(0,1fr)_420px] lg:items-center lg:gap-8 lg:px-8">
                <section className="order-2 border-2 border-border bg-card p-5 lg:order-1 lg:p-8">
                    <p className="text-xs font-semibold tracking-[0.14em] text-muted-foreground uppercase">Das Nest</p>
                    <h1 className="mt-3 text-2xl leading-tight font-semibold sm:text-3xl">
                        Admin moderation login
                    </h1>
                    <p className="mt-4 max-w-xl text-sm leading-6 text-muted-foreground">
                        Enter your server token, then continue to the moderation dashboard. No queue data is displayed
                        before authentication succeeds.
                    </p>
                    <div className="mt-5 grid gap-2 text-xs text-muted-foreground sm:text-sm">
                        <p className="border-2 border-border bg-background px-3 py-2">
                            Access is validated through <code>/api/admin/session</code>.
                        </p>
                        <p className="border-2 border-border bg-background px-3 py-2">
                            Reviewer name is saved and attached to moderation actions.
                        </p>
                    </div>
                </section>

                <Card className="order-1 w-full border-2 border-border bg-card shadow-none lg:order-2">
                    <CardHeader className="space-y-2">
                        <CardTitle className="flex items-center gap-2 text-lg">
                            <ShieldCheck className="h-5 w-5 text-primary" />
                            Admin Login
                        </CardTitle>
                        <CardDescription>Use your credentials to start moderation.</CardDescription>
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
                                <Label htmlFor="admin-login-token">Admin token</Label>
                                <Input
                                    id="admin-login-token"
                                    name="admin-login-token"
                                    type="password"
                                    autoComplete="current-password"
                                    autoFocus
                                    value={token}
                                    onChange={(event) => onTokenChange(event.target.value)}
                                    placeholder="Enter ADMIN_API_TOKEN"
                                    disabled={loading}
                                    className="h-10 rounded-none border-2 border-input bg-background"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="admin-login-reviewer">Reviewer name</Label>
                                <Input
                                    id="admin-login-reviewer"
                                    name="admin-login-reviewer"
                                    type="text"
                                    autoComplete="nickname"
                                    value={reviewerName}
                                    onChange={(event) => onReviewerNameChange(event.target.value)}
                                    placeholder="admin"
                                    disabled={loading}
                                    className="h-10 rounded-none border-2 border-input bg-background"
                                />
                            </div>

                            {error && (
                                <Alert aria-live="polite" className="rounded-none border-2 border-destructive bg-background py-3">
                                    <AlertDescription className="text-sm text-destructive">{error}</AlertDescription>
                                </Alert>
                            )}

                            <Button
                                type="submit"
                                className="h-10 w-full rounded-none border-2 border-primary font-semibold uppercase"
                                disabled={loading}
                            >
                                <LockKeyhole className="h-4 w-4" />
                                {loading ? 'Verifying access...' : 'Sign in to dashboard'}
                            </Button>
                        </form>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
