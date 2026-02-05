import { useState } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ChevronDown } from "lucide-react";
import { cn } from "@/utils/utils";

export function LegalTab() {
    const [openSection, setOpenSection] = useState<"imprint" | "privacy" | null>(null);

    const toggleSection = (section: "imprint" | "privacy") => {
        setOpenSection(openSection === section ? null : section);
    };

    return (
        <div className="h-full flex flex-col p-6 gap-3 overflow-hidden">
            {/* Imprint Header */}
            <button
                onClick={() => toggleSection("imprint")}
                className={cn(
                    "flex items-center justify-between w-full px-4 py-3 text-sm shrink-0",
                    "border border-white/5 rounded-lg",
                    "transition-colors duration-200",
                    openSection === "imprint"
                        ? "text-white bg-zinc-800/60 rounded-b-none border-b-0"
                        : "text-zinc-300 bg-zinc-900/30 hover:text-white hover:bg-zinc-900/50"
                )}
            >
                <span className="font-medium">Imprint</span>
                <ChevronDown className={cn(
                    "w-4 h-4 transition-transform duration-300 ease-out",
                    openSection === "imprint" && "rotate-180"
                )} />
            </button>

            {/* Imprint Content */}
            <div className={cn(
                "overflow-hidden transition-all duration-300 ease-out -mt-3",
                "border-x border-b border-white/5 rounded-b-lg bg-zinc-900/20",
                openSection === "imprint"
                    ? "flex-1 min-h-0 opacity-100"
                    : "h-0 opacity-0 border-0"
            )}>
                <ScrollArea className="h-full">
                    <div className="p-4 space-y-4 text-sm text-zinc-400 leading-relaxed">
                        <div>
                            <h4 className="font-medium text-zinc-200 mb-2">Scope</h4>
                            <p>This imprint and privacy policy applies to:</p>
                            <ul className="list-disc list-inside mt-1 text-zinc-500">
                                <li>https://synth.textmode.art</li>
                            </ul>
                        </div>

                        <div>
                            <h4 className="font-medium text-zinc-200 mb-2">Responsible for the content according to §5 TMG and §55 Abs.2 RStV</h4>
                            <p>
                                Christopher Dietrich<br />
                                Herler Straße 70/72<br />
                                51067 Cologne<br />
                                Germany
                            </p>
                        </div>

                        <div>
                            <h4 className="font-medium text-zinc-200 mb-2">Contact</h4>
                            <p>
                                Email: <a href="mailto:hello@textmode.art" className="text-emerald-400 hover:text-emerald-300 transition-colors">hello@textmode.art</a>
                            </p>
                        </div>

                        <div>
                            <h4 className="font-medium text-zinc-200 mb-2">Disclaimer of Liability</h4>
                            <p className="text-zinc-500">
                                The contents of our pages have been created with the utmost care. However, we cannot guarantee the contents' accuracy, completeness or topicality. As a service provider, we are responsible for our own content on these web pages according to § 7 Abs.1 TMG, but not for the content of external links according to § 8 TMG. The providers or operators of linked sites are solely responsible for their content.
                            </p>
                        </div>
                    </div>
                </ScrollArea>
            </div>

            {/* Data Protection Policy Header */}
            <button
                onClick={() => toggleSection("privacy")}
                className={cn(
                    "flex items-center justify-between w-full px-4 py-3 text-sm shrink-0",
                    "border border-white/5 rounded-lg",
                    "transition-colors duration-200",
                    openSection === "privacy"
                        ? "text-white bg-zinc-800/60 rounded-b-none border-b-0"
                        : "text-zinc-300 bg-zinc-900/30 hover:text-white hover:bg-zinc-900/50"
                )}
            >
                <span className="font-medium">Data Protection Policy</span>
                <ChevronDown className={cn(
                    "w-4 h-4 transition-transform duration-300 ease-out",
                    openSection === "privacy" && "rotate-180"
                )} />
            </button>

            {/* Data Protection Policy Content */}
            <div className={cn(
                "overflow-hidden transition-all duration-300 ease-out -mt-3",
                "border-x border-b border-white/5 rounded-b-lg bg-zinc-900/20",
                openSection === "privacy"
                    ? "flex-1 min-h-0 opacity-100"
                    : "h-0 opacity-0 border-0"
            )}>
                <ScrollArea className="h-full">
                    <div className="p-4 space-y-4 text-sm text-zinc-400 leading-relaxed">
                        <div>
                            <h4 className="font-medium text-zinc-200 mb-2">Introduction</h4>
                            <p className="text-zinc-500">
                                synth.textmode.art is a live coding environment for creating real-time visuals with textmode.js and audio patterns with Strudel. This application is hosted on a Virtual Private Server (VPS) provided by <a href="https://www.hetzner.com/legal/privacy-policy" target="_blank" rel="noopener noreferrer" className="text-emerald-400 hover:text-emerald-300 transition-colors">Hetzner</a>. As service providers, Hetzner may collect certain technically necessary data (including IP addresses) in accordance with their privacy policy.
                            </p>
                        </div>

                        <div>
                            <h4 className="font-medium text-zinc-200 mb-2">Analytics</h4>
                            <p className="text-zinc-500">
                                We use <a href="https://umami.is/" target="_blank" rel="noopener noreferrer" className="text-emerald-400 hover:text-emerald-300 transition-colors">Umami</a>, a privacy-focused analytics tool, to collect anonymous usage statistics. Umami does not use cookies and does not collect any personally identifiable information. The following anonymous data may be collected:
                            </p>
                            <ul className="list-disc list-inside mt-2 text-zinc-500">
                                <li>Page views and referral sources</li>
                                <li>Browser type and device information</li>
                                <li>Country of origin (based on anonymized IP)</li>
                                <li>Session duration</li>
                            </ul>
                            <p className="text-zinc-500 mt-2">
                                As Umami does not use cookies and does not collect personal data, consent for this type of analytics is not required under GDPR.
                            </p>
                        </div>

                        <div>
                            <h4 className="font-medium text-zinc-200 mb-2">External Resources (Audio, Images, Fonts)</h4>
                            <p className="text-zinc-500">
                                Both Strudel and textmode.js allow loading external resources such as audio samples, images, fonts, or videos from third-party Content Delivery Networks (CDNs) or servers. When you use these features or custom user scripts, your browser establishes a direct connection to these external providers to fetch the requested assets. This process involves the transmission of technically necessary data, such as your IP address, to the respective third-party provider.
                            </p>
                        </div>

                        <div>
                            <h4 className="font-medium text-zinc-200 mb-2">Local Storage</h4>
                            <p className="text-zinc-500">
                                This application uses browser local storage to save your code, preferences, and enhance your experience. Specifically:
                            </p>
                            <ul className="list-disc list-inside mt-2 text-zinc-500">
                                <li>Your code and sketches</li>
                                <li>Editor preferences (font size, auto-execute, etc.)</li>
                                <li>Welcome modal dismissal preference</li>
                            </ul>
                            <p className="text-zinc-500 mt-2">
                                This data is stored only in your browser, does not contain personally identifiable information, is never transmitted to our servers, and can be deleted at any time by clearing your browser's local storage. No consent is required for this type of storage as it serves only to improve usability (Art. 6(1)(f) GDPR - legitimate interest).
                            </p>
                        </div>

                        <div>
                            <h4 className="font-medium text-zinc-200 mb-2">No Personal Data Collection</h4>
                            <p className="text-zinc-500">
                                Apart from the anonymized analytics described above, we do not require user registration, collect personal information, process user-specific data beyond what is technically necessary, or use cookies for tracking.
                            </p>
                        </div>

                        <div>
                            <h4 className="font-medium text-zinc-200 mb-2">Your Rights</h4>
                            <p className="text-zinc-500">
                                Under the GDPR, you have various rights regarding the processing of your personal data. For any questions about our data practices, please contact us at <a href="mailto:hello@textmode.art" className="text-emerald-400 hover:text-emerald-300 transition-colors">hello@textmode.art</a>.
                            </p>
                            <p className="text-zinc-500 mt-2">
                                The competent supervisory authority is: <a href="https://www.ldi.nrw.de/" target="_blank" rel="noopener noreferrer" className="text-emerald-400 hover:text-emerald-300 transition-colors">Landesbeauftragte für Datenschutz und Informationsfreiheit Nordrhein-Westfalen</a>.
                            </p>
                        </div>
                    </div>
                </ScrollArea>
            </div>
        </div>
    );
}



