import { ScrollArea } from "@/components/ui/scroll-area";
import { Keyboard } from "lucide-react";

interface ShortcutGroup {
    title: string;
    shortcuts: {
        keys: string[];
        description: string;
    }[];
}

export function ShortcutsTab() {
    const groups: ShortcutGroup[] = [
        {
            title: "Editor Control",
            shortcuts: [
                { keys: ["Ctrl", "Enter"], description: "run code / apply changes" },
                { keys: ["Ctrl", "Shift", "R"], description: "hard reset" },
            ]
        },
        {
            title: "Appearance",
            shortcuts: [
                { keys: ["Ctrl", "+"], description: "increase font size" },
                { keys: ["Ctrl", "-"], description: "decrease font size" },
                { keys: ["Ctrl", "B"], description: "toggle text background" },
                { keys: ["Ctrl", "Shift", "H"], description: "hide / show ui" },
                { keys: ["Shake Mouse", "2x Ctrl"], description: "find my cursor (sonar ping)" },
            ]
        },
        {
            title: "Navigation & Editing",
            shortcuts: [
                { keys: ["Ctrl", "F"], description: "find" },
                { keys: ["Ctrl", "H"], description: "replace" },
                { keys: ["Ctrl", "Z"], description: "undo" },
                { keys: ["Ctrl", "Y"], description: "redo" },
                { keys: ["Ctrl", "/"], description: "toggle comment" },
                { keys: ["Alt", "Click"], description: "add multi-cursor" },
                { keys: ["F1"], description: "open command palette" },
            ]
        },
        {
            title: "Settings",
            shortcuts: [
                { keys: ["Ctrl", "E"], description: "toggle auto-execute" },
            ]
        }
    ];

    return (
        <ScrollArea className="h-full">
            <div className="p-6 space-y-6">
                <div className="flex items-center gap-2 mb-6 text-zinc-400">
                    <Keyboard className="w-5 h-5" />
                    <span className="text-sm font-medium uppercase tracking-wider">Keyboard Shortcuts</span>
                </div>

                <div className="grid gap-6">
                    {groups.map((group) => (
                        <div key={group.title} className="space-y-3">
                            <h3 className="text-xs font-medium text-zinc-500 uppercase tracking-wider px-1">
                                {group.title}
                            </h3>
                            <div className="space-y-2">
                                {group.shortcuts.map((shortcut) => (
                                    <div
                                        key={shortcut.description}
                                        className="flex items-center justify-between p-3 rounded-lg bg-zinc-900/30 border border-white/5 group hover:bg-zinc-800/50 transition-colors"
                                    >
                                        <span className="text-sm text-zinc-300 group-hover:text-white transition-colors">
                                            {shortcut.description}
                                        </span>
                                        <div className="flex items-center gap-1.5">
                                            {shortcut.keys.map((key) => (
                                                <kbd
                                                    key={key}
                                                    className="px-2 py-1 min-w-[24px] text-center rounded bg-zinc-800 border-b-2 border-zinc-700 text-zinc-400 font-mono text-[10px] font-bold shadow-sm"
                                                >
                                                    {key}
                                                </kbd>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </ScrollArea>
    );
}
