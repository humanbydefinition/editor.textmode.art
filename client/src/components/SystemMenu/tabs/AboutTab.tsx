import { ScrollArea } from "@/components/ui/scroll-area";
import { Github, ExternalLink, Heart } from 'lucide-react';

const CodebergIcon = ({ className }: { className?: string }) => (
    <svg
        role="img"
        viewBox="0 0 24 24"
        className={className}
        fill="currentColor"
        xmlns="http://www.w3.org/2000/svg"
    >
        <title>Codeberg</title>
        <path d="M11.955.49A12 12 0 0 0 0 12.49a12 12 0 0 0 1.832 6.373L11.838 5.766a.18.18 0 0 1 .324 0l10.006 13.097A12 12 0 0 0 11.955.49zm-.437 6.138L4.69 15.658a.22.22 0 0 0 .01.278l4.755 5.86a.22.22 0 0 0 .367-.042l2.341-4.851a.22.22 0 0 1 .403.016l1.791 4.56a.22.22 0 0 0 .385.048l2.766-4.665a.22.22 0 0 0-.02-.275l-5.322-6.425a.22.22 0 0 0-.35 0z" />
    </svg>
);

export function AboutTab() {
    const resources = [
        {
            name: "textmode.js",
            description: "core textmode library",
            url: "https://github.com/humanbydefinition/textmode.js",
            license: "MIT"
        },
        {
            name: "textmode.synth.js",
            description: "synthesis add-on library",
            url: "https://github.com/humanbydefinition/textmode.synth.js",
            license: "AGPLv3"
        },
        {
            name: "textmode.filters.js",
            description: "filter add-on library",
            url: "https://github.com/humanbydefinition/textmode.filters.js",
            license: "MIT"
        },
        {
            name: "@strudel/web",
            description: "live coding algorithmic patterns",
            url: "https://codeberg.org/uzu/strudel",
            license: "AGPLv3"
        }
    ];

    return (
        <ScrollArea className="h-full">
            <div className="p-6 space-y-6">
                <div className="rounded-xl overflow-hidden border border-white/10 bg-zinc-900/20">
                    <div className="p-5 text-left space-y-2">
                        <h2 className="text-xl font-bold text-white">synth.textmode.art</h2>
                        <p className="text-sm text-zinc-400 max-w-[90%]">
                            a live coding environment for procedural text generation and ASCII synthesis.
                        </p>
                    </div>
                    <div className="grid grid-cols-3 divide-x divide-white/5 border-t border-white/5 bg-zinc-900/40">
                        <div className="p-3 text-center">
                            <p className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1">Version</p>
                            <p className="text-xs font-mono text-zinc-300">1.0.0-beta.1</p>
                        </div>
                        <div className="p-3 text-center">
                            <p className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1">License</p>
                            <a
                                href="https://github.com/humanbydefinition/synth.textmode.art/blob/main/LICENSE"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs font-mono text-zinc-300 hover:text-white transition-colors"
                            >
                                GNU AGPLv3
                            </a>
                        </div>
                        <div className="p-3 text-center">
                            <p className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1">Created By</p>
                            <div className="flex items-center justify-center gap-2">
                                <img
                                    src="https://github.com/humanbydefinition.png"
                                    alt="humanbydefinition"
                                    className="w-5 h-5 rounded-full border border-white/10"
                                />
                                <a
                                    href="https://github.com/humanbydefinition"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-xs font-medium text-zinc-300 hover:text-white transition-colors"
                                >
                                    <span className="sm:hidden">hbd</span>
                                    <span className="hidden sm:inline">humanbydefinition</span>
                                </a>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Social / Connect Section */}
                <div className="space-y-4">
                    <h3 className="text-sm font-medium text-zinc-400 uppercase tracking-wider">Connect</h3>
                    <div className="grid grid-cols-3 gap-3">
                        <a
                            href="https://discord.gg/sjrw8QXNks"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-zinc-900/30 border border-white/5 hover:bg-zinc-800/50 hover:border-white/10 transition-all group w-full"
                        >
                            <svg role="img" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 fill-current text-zinc-500 group-hover:text-white shrink-0">
                                <path d="M20.317 4.3698a19.7913 19.7913 0 0 0-4.8851-1.5152.0741.0741 0 0 0-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 0 0-.0785-.037 19.7363 19.7363 0 0 0-4.8852 1.515.0699.0699 0 0 0-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 0 0 .0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 0 0 .0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 0 0-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 0 1-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 0 1 .0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 0 1 .0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 0 1-.0066.1276 12.2986 12.2986 0 0 1-1.873.8914.0766.0766 0 0 0-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 0 0 .0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 0 0 .0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 0 0-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.946 2.419-2.1568 2.419zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.946 2.419-2.1568 2.419z" />
                            </svg>
                            <span className="text-sm text-zinc-400 group-hover:text-white">discord</span>
                        </a>
                        <a
                            href="https://github.com/humanbydefinition/synth.textmode.art"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-zinc-900/30 border border-white/5 hover:bg-zinc-800/50 hover:border-white/10 transition-all group w-full"
                        >
                            <Github className="w-4 h-4 text-zinc-500 group-hover:text-white shrink-0" />
                            <span className="text-sm text-zinc-400 group-hover:text-white">github</span>
                        </a>
                        <a
                            href="https://code.textmode.art/docs/support"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-zinc-900/30 border border-white/5 hover:bg-pink-500/10 hover:border-pink-500/20 transition-all group w-full"
                        >
                            <Heart className="w-4 h-4 text-pink-400 group-hover:text-pink-300 shrink-0" />
                            <span className="text-sm text-zinc-400 group-hover:text-pink-300">support</span>
                        </a>
                    </div>
                </div>

                <div className="space-y-4">
                    <h3 className="text-sm font-medium text-zinc-400 uppercase tracking-wider">Resources</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {resources.map((resource) => (
                            <a
                                key={resource.name}
                                href={resource.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex flex-col p-3 rounded-lg bg-zinc-900/30 border border-white/5 hover:bg-zinc-800/50 hover:border-white/10 transition-all group"
                            >
                                <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-2">
                                        {resource.url.includes("codeberg") ? (
                                            <CodebergIcon className="w-4 h-4 text-zinc-500 group-hover:text-white transition-colors" />
                                        ) : (
                                            <Github className="w-4 h-4 text-zinc-500 group-hover:text-white transition-colors" />
                                        )}
                                        <span className="text-sm font-medium text-zinc-300 group-hover:text-white">{resource.name}</span>
                                    </div>
                                    <ExternalLink className="w-3 h-3 text-zinc-600 group-hover:text-zinc-400" />
                                </div>
                                <div className="flex items-center justify-between gap-2">
                                    <span className="text-xs text-zinc-500 group-hover:text-zinc-400 truncate">{resource.description}</span>
                                    <span className="text-[10px] px-1.5 py-0.5 rounded border border-white/5 bg-white/5 text-zinc-500 font-mono group-hover:border-white/10 group-hover:text-zinc-400 whitespace-nowrap">
                                        {resource.license}
                                    </span>
                                </div>
                            </a>
                        ))}
                    </div>
                </div>
            </div>
        </ScrollArea>
    );
}
