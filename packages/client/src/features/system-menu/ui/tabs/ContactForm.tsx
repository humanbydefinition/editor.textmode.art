import { useState } from 'react';
import { toast } from 'sonner';
import { Send, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Input } from '@/shared/ui/input';
import { Textarea } from '@/shared/ui/textarea';
import { Button } from '@/shared/ui/button';
import { Label } from '@/shared/ui/label';
import { cn } from '@/shared/lib/cn';
import { TurnstileWidget } from '@/features/publish/ui/TurnstileWidget';
import { contactFormSchema } from '@synth.textmode.art/contracts/contact';
import type { ContactFormPayload, ContactResponse } from '@synth.textmode.art/contracts/contact';

const TURNSTILE_SITE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY;
const TURNSTILE_CONFIGURED = Boolean(TURNSTILE_SITE_KEY);

export function ContactForm() {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [subject, setSubject] = useState('');
    const [message, setMessage] = useState('');
    const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
    const [turnstileError, setTurnstileError] = useState<string | null>(null);
    const [turnstileResetNonce, setTurnstileResetNonce] = useState(0);

    const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
    const [error, setError] = useState<string | null>(null);
    const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

    const handleFieldChange = (field: string, value: string, setter: (val: string) => void) => {
        setter(value);
        if (fieldErrors[field]) {
            setFieldErrors(prev => {
                const updated = { ...prev };
                delete updated[field];
                return updated;
            });
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!turnstileToken) {
            setError('Please complete the security verification.');
            return;
        }

        setStatus('submitting');
        setError(null);
        setFieldErrors({});

        const payload: ContactFormPayload = {
            name,
            email,
            subject,
            message,
            turnstileToken,
        };

        const parsed = contactFormSchema.safeParse(payload);
        if (!parsed.success) {
            const formatted = parsed.error.flatten().fieldErrors as Record<string, string[] | undefined>;
            const errors: Record<string, string> = {};
            for (const key in formatted) {
                errors[key] = formatted[key]?.[0] || '';
            }
            setFieldErrors(errors);
            setStatus('idle');
            return;
        }

        try {
            const response = await fetch('/api/contact', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload),
            });

            const result: ContactResponse = await response.json();

            if (response.ok && result.success) {
                setStatus('success');
                setName('');
                setEmail('');
                setSubject('');
                setMessage('');
                setTurnstileToken(null);
                setTurnstileResetNonce((n) => n + 1);
                toast.success('Message sent successfully!');
            } else {
                setStatus('error');
                setError(result.error || 'Failed to send message. Please try again later.');
            }
        } catch (err) {
            console.error('Contact form submission error:', err);
            setStatus('error');
            setError('A network error occurred. Please check your connection and try again.');
        }
    };

    if (status === 'success') {
        return (
            <div className="flex flex-col items-center justify-center py-12 px-4 text-center space-y-4 bg-zinc-900/20 border border-white/5 rounded-lg">
                <CheckCircle2 className="w-12 h-12 text-emerald-500" />
                <div className="space-y-2">
                    <h3 className="text-lg font-medium text-white">Message Sent!</h3>
                    <p className="text-sm text-zinc-400 max-w-xs mx-auto">
                        Thank you for reaching out. We'll get back to you as soon as possible.
                    </p>
                </div>
                <Button 
                    variant="outline" 
                    onClick={() => setStatus('idle')}
                    className="border-white/10 hover:bg-white/5 text-zinc-300"
                >
                    Send another message
                </Button>
            </div>
        );
    }

    return (
        <form onSubmit={handleSubmit} noValidate className="space-y-4 min-w-0">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5 min-w-0">
                    <Label 
                        htmlFor="contact-name" 
                        className={cn("text-xs font-medium uppercase tracking-wider", fieldErrors.name ? "text-red-400" : "text-zinc-400")}
                    >
                        Name
                    </Label>
                    <Input
                        id="contact-name"
                        value={name}
                        onChange={(e) => handleFieldChange('name', e.target.value, setName)}
                        placeholder="Your name"
                        aria-invalid={Boolean(fieldErrors.name)}
                        className="bg-zinc-900/50 border-white/10 focus:border-emerald-500/50 h-9 text-zinc-200"
                        disabled={status === 'submitting'}
                    />
                    {fieldErrors.name && <p className="text-[10px] text-red-400 ml-1">{fieldErrors.name}</p>}
                </div>
                <div className="space-y-1.5 min-w-0">
                    <Label 
                        htmlFor="contact-email" 
                        className={cn("text-xs font-medium uppercase tracking-wider", fieldErrors.email ? "text-red-400" : "text-zinc-400")}
                    >
                        Email
                    </Label>
                    <Input
                        id="contact-email"
                        type="email"
                        value={email}
                        onChange={(e) => handleFieldChange('email', e.target.value, setEmail)}
                        placeholder="your@email.com"
                        aria-invalid={Boolean(fieldErrors.email)}
                        className="bg-zinc-900/50 border-white/10 focus:border-emerald-500/50 h-9 text-zinc-200"
                        disabled={status === 'submitting'}
                    />
                    {fieldErrors.email && <p className="text-[10px] text-red-400 ml-1">{fieldErrors.email}</p>}
                </div>
            </div>

            <div className="space-y-1.5 min-w-0">
                <Label 
                    htmlFor="contact-subject" 
                    className={cn("text-xs font-medium uppercase tracking-wider", fieldErrors.subject ? "text-red-400" : "text-zinc-400")}
                >
                    Subject
                </Label>
                <Input
                    id="contact-subject"
                    value={subject}
                    onChange={(e) => handleFieldChange('subject', e.target.value, setSubject)}
                    placeholder="What is this about?"
                    aria-invalid={Boolean(fieldErrors.subject)}
                    className="bg-zinc-900/50 border-white/10 focus:border-emerald-500/50 h-9 text-zinc-200"
                    disabled={status === 'submitting'}
                />
                {fieldErrors.subject && <p className="text-[10px] text-red-400 ml-1">{fieldErrors.subject}</p>}
            </div>

            <div className="space-y-1.5 min-w-0">
                <Label 
                    htmlFor="contact-message" 
                    className={cn("text-xs font-medium uppercase tracking-wider", fieldErrors.message ? "text-red-400" : "text-zinc-400")}
                >
                    Message
                </Label>
                <Textarea
                    id="contact-message"
                    value={message}
                    onChange={(e) => handleFieldChange('message', e.target.value, setMessage)}
                    placeholder="Your message..."
                    aria-invalid={Boolean(fieldErrors.message)}
                    rows={5}
                    className="bg-zinc-900/50 border-white/10 focus:border-emerald-500/50 resize-none min-h-[120px] text-zinc-200 break-words whitespace-pre-wrap"
                    disabled={status === 'submitting'}
                />
                {fieldErrors.message && <p className="text-[10px] text-red-400 ml-1">{fieldErrors.message}</p>}
            </div>

            <div className="rounded-lg border border-white/5 bg-zinc-900/30 p-3 space-y-2">
                <Label className="text-xs font-medium text-zinc-400 uppercase tracking-wider">
                    Security Verification <span className="text-red-400">*</span>
                </Label>
                {TURNSTILE_CONFIGURED ? (
                    <>
                        <TurnstileWidget
                            siteKey={TURNSTILE_SITE_KEY}
                            resetNonce={turnstileResetNonce}
                            onTokenChange={setTurnstileToken}
                            onErrorChange={setTurnstileError}
                            className="flex justify-start"
                        />
                        {turnstileError && <p className="text-[11px] text-red-400 mt-1">{turnstileError}</p>}
                        {turnstileToken && !turnstileError && (
                            <p className="text-[11px] text-emerald-400 mt-1 flex items-center gap-1">
                                Verification complete.
                            </p>
                        )}
                    </>
                ) : (
                    <p className="text-[11px] text-red-300">
                        Security verification is not configured. Contact form is currently unavailable.
                    </p>
                )}
            </div>

            {error && (
                <div className="rounded-lg border border-red-500/20 bg-red-500/5 p-3 flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                    <p className="text-xs text-red-300 leading-snug">{error}</p>
                </div>
            )}

            <Button
                type="submit"
                disabled={status === 'submitting' || !TURNSTILE_CONFIGURED}
                className="w-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 hover:bg-emerald-500/20 disabled:opacity-50 py-5 transition-all duration-300"
            >
                {status === 'submitting' ? (
                    <>
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                        <span className="font-medium">Sending...</span>
                    </>
                ) : (
                    <>
                        <Send className="w-4 h-4 mr-2" />
                        <span className="font-medium uppercase tracking-wider text-xs">Send Message</span>
                    </>
                )}
            </Button>
        </form>
    );
}
