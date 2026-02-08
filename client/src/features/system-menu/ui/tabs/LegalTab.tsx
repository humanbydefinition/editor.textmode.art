import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { ScrollArea } from "@/shared/ui/scroll-area";
import { cn } from "@/shared/lib/cn";

export function LegalTab() {
    const [openSection, setOpenSection] = useState<"imprint" | "privacy" | null>(null);

    const toggleSection = (section: "imprint" | "privacy") => {
        setOpenSection(openSection === section ? null : section);
    };

    return (
        <div className="h-full flex flex-col p-6 gap-3 overflow-hidden">
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
                <ChevronDown
                    className={cn(
                        "w-4 h-4 transition-transform duration-300 ease-out",
                        openSection === "imprint" && "rotate-180"
                    )}
                />
            </button>

            <div
                className={cn(
                    "overflow-hidden transition-all duration-300 ease-out -mt-3",
                    "border-x border-b border-white/5 rounded-b-lg bg-zinc-900/20",
                    openSection === "imprint" ? "flex-1 min-h-0 opacity-100" : "h-0 opacity-0 border-0"
                )}
            >
                <ScrollArea className="h-full">
                    <div className="p-4 space-y-4 text-sm text-zinc-400 leading-relaxed">
                        <div>
                            <h4 className="font-medium text-zinc-200 mb-2">Scope</h4>
                            <p>This imprint applies to:</p>
                            <ul className="list-disc list-inside mt-1 text-zinc-500">
                                <li>https://synth.textmode.art</li>
                            </ul>
                        </div>

                        <div>
                            <h4 className="font-medium text-zinc-200 mb-2">Provider Information (Section 5 DDG)</h4>
                            <p>
                                Christopher Dietrich
                                <br />
                                Herler Strasse 70/72
                                <br />
                                51067 Cologne
                                <br />
                                Germany
                            </p>
                        </div>

                        <div>
                            <h4 className="font-medium text-zinc-200 mb-2">Contact</h4>
                            <p>
                                Email:{" "}
                                <a
                                    href="mailto:hello@textmode.art"
                                    className="text-emerald-400 hover:text-emerald-300 transition-colors"
                                >
                                    hello@textmode.art
                                </a>
                            </p>
                        </div>

                        <div>
                            <h4 className="font-medium text-zinc-200 mb-2">
                                Responsible for Editorial Content (Section 18 (2) MStV, if applicable)
                            </h4>
                            <p>
                                Christopher Dietrich
                                <br />
                                Herler Strasse 70/72
                                <br />
                                51067 Cologne
                                <br />
                                Germany
                            </p>
                        </div>

                        <div>
                            <h4 className="font-medium text-zinc-200 mb-2">Liability for Own and External Content</h4>
                            <p className="text-zinc-500">
                                We create and maintain our own content with due care. External links are checked at the time of
                                linking. The respective third-party provider remains responsible for external content.
                            </p>
                        </div>

                        <div>
                            <h4 className="font-medium text-zinc-200 mb-2">Legal References</h4>
                            <ul className="list-disc list-inside mt-1 text-zinc-500 space-y-1">
                                <li>
                                    <a
                                        href="https://www.gesetze-im-internet.de/ddg/__5.html"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-emerald-400 hover:text-emerald-300 transition-colors"
                                    >
                                        Section 5 DDG
                                    </a>
                                </li>
                                <li>
                                    <a
                                        href="https://www.die-medienanstalten.de/fileadmin/user_upload/Rechtsgrundlagen/Gesetze_Staatsvertraege/Medienstaatsvertrag_MStV.pdf"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-emerald-400 hover:text-emerald-300 transition-colors"
                                    >
                                        Media State Treaty (MStV)
                                    </a>
                                </li>
                            </ul>
                        </div>
                    </div>
                </ScrollArea>
            </div>

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
                <span className="font-medium">Privacy Policy</span>
                <ChevronDown
                    className={cn(
                        "w-4 h-4 transition-transform duration-300 ease-out",
                        openSection === "privacy" && "rotate-180"
                    )}
                />
            </button>

            <div
                className={cn(
                    "overflow-hidden transition-all duration-300 ease-out -mt-3",
                    "border-x border-b border-white/5 rounded-b-lg bg-zinc-900/20",
                    openSection === "privacy" ? "flex-1 min-h-0 opacity-100" : "h-0 opacity-0 border-0"
                )}
            >
                <ScrollArea className="h-full">
                    <div className="p-4 space-y-4 text-sm text-zinc-400 leading-relaxed">
                        <div>
                            <h4 className="font-medium text-zinc-200 mb-2">Controller</h4>
                            <p>
                                Christopher Dietrich
                                <br />
                                Herler Strasse 70/72
                                <br />
                                51067 Cologne
                                <br />
                                Germany
                                <br />
                                Email:{" "}
                                <a
                                    href="mailto:hello@textmode.art"
                                    className="text-emerald-400 hover:text-emerald-300 transition-colors"
                                >
                                    hello@textmode.art
                                </a>
                            </p>
                        </div>

                        <div>
                            <h4 className="font-medium text-zinc-200 mb-2">General Information</h4>
                            <p className="text-zinc-500">
                                This policy explains how personal data is processed when using synth.textmode.art. Personal data
                                means any information relating to an identified or identifiable natural person (Art. 4(1)
                                GDPR/DSGVO).
                            </p>
                        </div>

                        <div>
                            <h4 className="font-medium text-zinc-200 mb-2">Hosting and Server Logs</h4>
                            <p className="text-zinc-500">
                                The service is hosted on infrastructure of{" "}
                                <a
                                    href="https://www.hetzner.com/legal/privacy-policy"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-emerald-400 hover:text-emerald-300 transition-colors"
                                >
                                    Hetzner
                                </a>
                                . When you access this service, technically required connection data can be processed, such as
                                IP address, timestamp, requested URL, referrer, user agent, and response status.
                            </p>
                            <p className="text-zinc-500 mt-2">
                                Purpose: secure and stable operation, debugging, abuse detection, and service defense.
                                <br />
                                Legal basis: Art. 6(1)(f) GDPR (legitimate interests).
                            </p>
                        </div>

                        <div>
                            <h4 className="font-medium text-zinc-200 mb-2">Publish Requests and Gallery Moderation</h4>
                            <p className="text-zinc-500">
                                If you submit content for the gallery, we process the data you send, including:
                            </p>
                            <ul className="list-disc list-inside mt-2 text-zinc-500 space-y-1">
                                <li>slug, title, description, code content, and optional license</li>
                                <li>optional author name and optional social profile links</li>
                                <li>moderation metadata (status, reviewed time, reviewer name, optional denial reason)</li>
                                <li>publish-consent evidence (accepted flag, acceptance timestamp, policy version)</li>
                            </ul>
                            <p className="text-zinc-500 mt-2">
                                Submission requires an explicit consent confirmation in the publish dialog before a request can be
                                sent.
                            </p>
                            <p className="text-zinc-500 mt-2">
                                Purpose: processing and moderating your submission, operating the public gallery, and preventing
                                abuse.
                                <br />
                                Legal basis: Art. 6(1)(b) GDPR (processing your submission request) and Art. 6(1)(f) GDPR
                                (legitimate interests in secure and reliable operations).
                            </p>
                            <p className="text-zinc-500 mt-2">
                                Important: Approved submissions are publicly visible by design, including any optional
                                author/social information you provided.
                            </p>
                        </div>

                        <div>
                            <h4 className="font-medium text-zinc-200 mb-2">Anti-Spam and Abuse Prevention</h4>
                            <p className="text-zinc-500">
                                We use layered anti-spam controls for gallery submissions: Cloudflare Turnstile verification,
                                challenge + proof-of-work, idempotency guards, and global queue limits.
                            </p>
                            <p className="text-zinc-500 mt-2">
                                Turnstile is provided by Cloudflare and may process technical connection metadata as part of
                                bot detection. For details, see Cloudflare documentation and privacy information.
                            </p>
                            <p className="text-zinc-500 mt-2">
                                Purpose: protect availability and moderation capacity.
                                <br />
                                Legal basis: Art. 6(1)(f) GDPR.
                            </p>
                        </div>

                        <div>
                            <h4 className="font-medium text-zinc-200 mb-2">Analytics (Umami)</h4>
                            <p className="text-zinc-500">
                                We use{" "}
                                <a
                                    href="https://umami.is/"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-emerald-400 hover:text-emerald-300 transition-colors"
                                >
                                    Umami
                                </a>{" "}
                                via{" "}
                                <span className="text-zinc-300">analytics.textmode.art</span> to measure aggregate usage.
                                According to our setup, no marketing cookies or cross-site profiling are used.
                            </p>
                            <p className="text-zinc-500 mt-2">
                                Purpose: reach measurement and product quality improvements.
                                <br />
                                Legal basis: Art. 6(1)(f) GDPR.
                            </p>
                        </div>

                        <div>
                            <h4 className="font-medium text-zinc-200 mb-2">Local Storage and Device Access</h4>
                            <p className="text-zinc-500">
                                The app stores data in your browser local storage to provide core functionality and preferences,
                                including code snippets and editor settings.
                            </p>
                            <ul className="list-disc list-inside mt-2 text-zinc-500 space-y-1">
                                <li>engine code and drafts</li>
                                <li>app settings and UI preferences</li>
                                <li>welcome dialog dismissal state</li>
                            </ul>
                            <p className="text-zinc-500 mt-2">
                                Legal basis (GDPR): Art. 6(1)(b) and Art. 6(1)(f).
                                <br />
                                Legal basis (German telecommunications/data protection law): Section 25(2) no. 2 TDDDG for
                                storage/access that is strictly necessary for the service requested by the user.
                            </p>
                        </div>

                        <div>
                            <h4 className="font-medium text-zinc-200 mb-2">External Resources and Third-Party Endpoints</h4>
                            <p className="text-zinc-500">
                                User code can load external media/resources. In those cases, your browser connects directly to
                                external providers and transmits technically necessary connection data (including IP address).
                                These providers process data under their own responsibility.
                            </p>
                        </div>

                        <div>
                            <h4 className="font-medium text-zinc-200 mb-2">Recipients and Processors</h4>
                            <p className="text-zinc-500">
                                We use service providers for infrastructure operation (in particular hosting). Where required, we
                                conclude data processing agreements under Art. 28 GDPR.
                            </p>
                        </div>

                        <div>
                            <h4 className="font-medium text-zinc-200 mb-2">Storage Periods</h4>
                            <p className="text-zinc-500">
                                We store data only as long as necessary for the respective purpose and legal obligations:
                            </p>
                            <ul className="list-disc list-inside mt-2 text-zinc-500 space-y-1">
                                <li>technical log data: limited retention for security and operations</li>
                                <li>submission and moderation data: until moderation purpose ends or deletion is requested</li>
                                <li>approved gallery entries: until removed by us or by justified deletion request</li>
                                <li>local storage data: until you delete it in your browser</li>
                            </ul>
                        </div>

                        <div>
                            <h4 className="font-medium text-zinc-200 mb-2">Your Rights under GDPR</h4>
                            <p className="text-zinc-500">
                                You have rights under Arts. 15-22 GDPR, in particular access, rectification, erasure,
                                restriction, data portability, and objection (Art. 21 GDPR). You may also withdraw consent at
                                any time where processing is based on consent.
                            </p>
                            <p className="text-zinc-500 mt-2">
                                To exercise your rights, contact{" "}
                                <a
                                    href="mailto:hello@textmode.art"
                                    className="text-emerald-400 hover:text-emerald-300 transition-colors"
                                >
                                    hello@textmode.art
                                </a>
                                .
                            </p>
                        </div>

                        <div>
                            <h4 className="font-medium text-zinc-200 mb-2">Right to Lodge a Complaint</h4>
                            <p className="text-zinc-500">
                                You have the right to lodge a complaint with a supervisory authority, in particular in the
                                member state of your habitual residence, place of work, or place of the alleged infringement.
                            </p>
                            <p className="text-zinc-500 mt-2">
                                Competent authority for Cologne, NRW:
                                <br />
                                <a
                                    href="https://www.ldi.nrw.de/"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-emerald-400 hover:text-emerald-300 transition-colors"
                                >
                                    Landesbeauftragte fuer Datenschutz und Informationsfreiheit Nordrhein-Westfalen
                                </a>
                            </p>
                        </div>

                        <div>
                            <h4 className="font-medium text-zinc-200 mb-2">No Automated Decision-Making</h4>
                            <p className="text-zinc-500">
                                We do not use automated decision-making or profiling under Art. 22 GDPR for legal or similarly
                                significant effects.
                            </p>
                        </div>

                        <div>
                            <h4 className="font-medium text-zinc-200 mb-2">Last Updated</h4>
                            <p className="text-zinc-500">2026-02-08</p>
                        </div>

                        <div>
                            <h4 className="font-medium text-zinc-200 mb-2">Main Legal Sources</h4>
                            <ul className="list-disc list-inside mt-1 text-zinc-500 space-y-1">
                                <li>
                                    <a
                                        href="https://eur-lex.europa.eu/eli/reg/2016/679/oj"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-emerald-400 hover:text-emerald-300 transition-colors"
                                    >
                                        GDPR (EU) 2016/679
                                    </a>
                                </li>
                                <li>
                                    <a
                                        href="https://www.gesetze-im-internet.de/ddg/"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-emerald-400 hover:text-emerald-300 transition-colors"
                                    >
                                        DDG
                                    </a>
                                </li>
                                <li>
                                    <a
                                        href="https://www.gesetze-im-internet.de/ttdsg/__25.html"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-emerald-400 hover:text-emerald-300 transition-colors"
                                    >
                                        TDDDG Section 25
                                    </a>
                                </li>
                            </ul>
                        </div>
                    </div>
                </ScrollArea>
            </div>
        </div>
    );
}
