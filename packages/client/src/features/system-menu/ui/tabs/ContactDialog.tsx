import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogDescription,
} from '@/shared/ui/dialog';
import { Button } from '@/shared/ui/button';
import { MessageSquare } from 'lucide-react';
import { ContactForm } from './ContactForm';
import { cn } from '@/shared/lib/cn';

interface ContactDialogProps {
    buttonClassName?: string;
}

export function ContactDialog({ buttonClassName }: ContactDialogProps = {}) {
    return (
        <Dialog>
            <DialogTrigger asChild>
                <Button 
                    className={cn(
                        'w-full bg-zinc-900/40 border border-white/10 text-zinc-400 hover:bg-zinc-800/60 hover:text-white transition-all duration-300 py-5',
                        buttonClassName
                    )}
                >
                    <div className="flex flex-col items-center">
                        <div className="flex items-center gap-2">
                            <MessageSquare className="w-4 h-4" />
                            <span className="font-medium">send us a message</span>
                        </div>
                    </div>
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px] bg-zinc-950/95 backdrop-blur-2xl border-white/10 p-6 flex flex-col outline-none shadow-2xl shadow-black/50">
                <DialogHeader className="mb-2">
                    <DialogTitle className="text-xl font-bold tracking-tight text-white">contact us</DialogTitle>
                    <DialogDescription className="text-zinc-500">
                        have a question or feedback? send us a message and we'll get back to you as soon as possible.
                    </DialogDescription>
                </DialogHeader>
                <ContactForm />
            </DialogContent>
        </Dialog>
    );
}
