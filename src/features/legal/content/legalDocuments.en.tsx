import { cn } from '@/shared/lib/cn';
import type { LegalContentProps, LegalDocumentDefinition, LegalDocumentId } from './legalDocument.types';

const contentBaseClass = 'space-y-4 text-sm text-zinc-400 leading-relaxed';

export function ImprintLegalContent({ className }: LegalContentProps) {
	return (
		<div className={cn(contentBaseClass, className)}>
			<div>
				<h4 className="font-medium text-zinc-200 mb-2 text-xs uppercase tracking-wider">Scope</h4>
				<p>This imprint applies to:</p>
				<ul className="list-disc list-inside mt-1 text-zinc-500">
					<li>https://synth.textmode.art</li>
				</ul>
			</div>

			<div>
				<h4 className="font-medium text-zinc-200 mb-2 text-xs uppercase tracking-wider">
					Provider Information (Section 5 DDG)
				</h4>
				<p className="break-words">
					Christopher Dietrich
					<br />
					Mauerstraße 36
					<br />
					40476 Düsseldorf
					<br />
					Deutschland
				</p>
			</div>

			<div>
				<h4 className="font-medium text-zinc-200 mb-2 text-xs uppercase tracking-wider">Contact</h4>
				<div className="space-y-1">
					<p>
						Email:{' '}
						<a href="mailto:hello@textmode.art" className="text-emerald-400 hover:text-emerald-300 transition-colors">
							hello@textmode.art
						</a>
					</p>
					<p className="text-zinc-500 text-[11px] leading-relaxed italic">
						Alternative:{' '}
						<a
							href="/en/contact"
							target="_blank"
							rel="noopener noreferrer"
							className="text-emerald-400 hover:text-emerald-300 transition-colors"
							>
								Open contact page in a new tab
						</a>
						.
					</p>
				</div>
			</div>

			<div>
				<h4 className="font-medium text-zinc-200 mb-2 text-xs uppercase tracking-wider">
					Responsible for Editorial Content (Section 18 (2) MStV)
				</h4>
				<p className="break-words">
					Christopher Dietrich
					<br />
					Mauerstraße 36
					<br />
					40476 Düsseldorf
					<br />
					Deutschland
				</p>
			</div>

			<div>
				<h4 className="font-medium text-zinc-200 mb-2 text-xs uppercase tracking-wider">
					Liability for Own and External Content
				</h4>
				<p className="text-zinc-500 break-words">
					We create and maintain our own content with due care. External links are checked at the time of linking. The
					respective third-party provider remains responsible for external content.
				</p>
			</div>

			<div>
				<h4 className="font-medium text-zinc-200 mb-2 text-xs uppercase tracking-wider">Legal References</h4>
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
	);
}

export function TermsLegalContent({ className }: LegalContentProps) {
	return (
		<div className={cn(contentBaseClass, className)}>
			<div>
				<h4 className="font-medium text-zinc-200 mb-2 text-xs uppercase tracking-wider">Scope</h4>
				<p className="text-zinc-500 break-words">
					These terms apply to the use of synth.textmode.art and related features, including local live coding,
					client-side sketch sharing, and sandboxed code execution.
				</p>
			</div>

			<div>
				<h4 className="font-medium text-zinc-200 mb-2 text-xs uppercase tracking-wider">Nature of Service</h4>
				<p className="text-zinc-500 break-words">
					The platform is provided for creative coding and community sharing. Availability, performance, and compatibility
					may change over time. There is no guarantee that specific features are continuously available.
				</p>
			</div>

			<div>
				<h4 className="font-medium text-zinc-200 mb-2 text-xs uppercase tracking-wider">Acceptable Use</h4>
				<p className="text-zinc-500">You must not use the service to:</p>
				<ul className="list-disc list-inside mt-2 text-zinc-500 space-y-1">
					<li>upload or distribute unlawful, infringing, or abusive content</li>
					<li>attempt unauthorized access, scraping abuse, or security bypasses</li>
					<li>disrupt service operation or bypass technical safeguards</li>
					<li>misrepresent identity or rights ownership</li>
				</ul>
			</div>

			<div>
				<h4 className="font-medium text-zinc-200 mb-2 text-xs uppercase tracking-wider">User Content and Rights</h4>
				<p className="text-zinc-500 break-words">
					You remain responsible for code, text, and media references you create or share. Share links encode your sketch
					in the URL and are distributed only when you choose to copy or send them.
				</p>
				<p className="text-zinc-500 mt-2 break-words">
					If third-party claims are asserted against us due to unlawful content you submitted (for example copyright or
					personality-rights violations), you agree to indemnify us for resulting costs to the extent you are responsible.
				</p>
			</div>

			<div>
				<h4 className="font-medium text-zinc-200 mb-2 text-xs uppercase tracking-wider">Notice and Action</h4>
				<p className="text-zinc-500 break-words">
					If you contact us about allegedly illegal or infringing content connected to the project, we review the notice
					and act without undue delay where required by applicable law.
				</p>
			</div>

			<div>
				<h4 className="font-medium text-zinc-200 mb-2 text-xs uppercase tracking-wider">
					Unreviewed Sketches and Execution Risk
				</h4>
				<p className="text-zinc-500 break-words">
					Shared sketches can contain unreviewed third-party code. Running such code may trigger audio output,
					performance-heavy loops, or external network requests. You decide whether to execute shared code and should
					review it first.
				</p>
				<p className="text-zinc-500 mt-2 break-words">
					Execution of shared sketches is optional and at your own risk. We do not guarantee that third-party sketches are
					safe, lawful, error-free, or fit for a particular purpose.
				</p>
			</div>

			<div>
				<h4 className="font-medium text-zinc-200 mb-2 text-xs uppercase tracking-wider">Liability</h4>
				<p className="text-zinc-500 break-words">
					We are liable under statutory law. To the extent legally permitted, liability for slight negligence is excluded,
					except for breaches of essential contractual obligations (cardinal obligations). In such cases, liability is
					limited to foreseeable, typical damages.
				</p>
				<p className="text-zinc-500 mt-2 break-words">
					Liability limitations do not apply in cases of intent, gross negligence, injury to life/body/health, fraudulent
					concealment, guarantees, mandatory statutory liability (including product liability), or where liability cannot
					be excluded under applicable law.
				</p>
			</div>

			<div>
				<h4 className="font-medium text-zinc-200 mb-2 text-xs uppercase tracking-wider">Applicable Law</h4>
				<p className="text-zinc-500 break-words">
					German law applies, without prejudice to mandatory consumer protection provisions that may apply in your country
					of residence.
				</p>
			</div>

			<div>
				<h4 className="font-medium text-zinc-200 mb-2 text-xs uppercase tracking-wider">Reporting and Contact</h4>
				<p className="text-zinc-500">
					For legal notices, rights claims, or abuse reports, contact{' '}
					<a href="mailto:hello@textmode.art" className="text-emerald-400 hover:text-emerald-300 transition-colors">
						hello@textmode.art
					</a>
					.
				</p>
			</div>

			<div>
				<h4 className="font-medium text-zinc-200 mb-2 text-xs uppercase tracking-wider">Last Updated</h4>
				<p className="text-zinc-500">2026-02-24</p>
			</div>
		</div>
	);
}

export function PrivacyLegalContent({ className }: LegalContentProps) {
	return (
		<div className={cn(contentBaseClass, className)}>
			<div>
				<h4 className="font-medium text-zinc-200 mb-2 text-xs uppercase tracking-wider">Controller</h4>
				<p className="break-words">
					Christopher Dietrich
					<br />
					Mauerstraße 36
					<br />
					40476 Düsseldorf
					<br />
					Deutschland
					<br />
					Email:{' '}
					<a href="mailto:hello@textmode.art" className="text-emerald-400 hover:text-emerald-300 transition-colors">
						hello@textmode.art
					</a>
				</p>
			</div>

			<div>
				<h4 className="font-medium text-zinc-200 mb-2 text-xs uppercase tracking-wider">General Information</h4>
				<p className="text-zinc-500 break-words">
					This policy explains how personal data is processed when using synth.textmode.art. Personal data means any
					information relating to an identified or identifiable natural person (Art. 4(1) GDPR/DSGVO).
				</p>
			</div>

			<div>
				<h4 className="font-medium text-zinc-200 mb-2 text-xs uppercase tracking-wider">Hosting and Server Logs</h4>
				<p className="text-zinc-500 break-words">
					The service is hosted on infrastructure of{' '}
					<a
						href="https://www.hetzner.com/legal/privacy-policy"
						target="_blank"
						rel="noopener noreferrer"
						className="text-emerald-400 hover:text-emerald-300 transition-colors"
					>
						Hetzner
					</a>
					. When you access this service, technically required connection data can be processed, such as IP address,
					timestamp, requested URL, referrer, user agent, and response status.
				</p>
				<p className="text-zinc-500 mt-2 break-words">
					Purpose: secure and stable operation, debugging, abuse detection, and service defense.
					<br />
					Legal basis: Art. 6(1)(f) GDPR (legitimate interests).
				</p>
			</div>

			<div>
				<h4 className="font-medium text-zinc-200 mb-2 text-xs uppercase tracking-wider">Contact</h4>
				<p className="text-zinc-500 break-words">
					If you contact us by email or through linked external channels, we process the data you provide to handle and
					answer your request.
				</p>
				<p className="text-zinc-500 mt-2 break-words">
					Purpose: handling your contact request.
					<br />
					Legal basis: Art. 6(1)(b) GDPR (contractual or pre-contractual requests) or Art. 6(1)(f) GDPR (legitimate
					interests in effective communication).
				</p>
				<p className="text-zinc-500 mt-2 break-words">
					Storage: Communication data is stored for the duration of the communication and any subsequent documentation
					requirements.
				</p>
			</div>

			<div>
				<h4 className="font-medium text-zinc-200 mb-2 text-xs uppercase tracking-wider">Local Storage and Device Access</h4>
				<p className="text-zinc-500 break-words">
					The app stores data in your browser local storage to provide core functionality and preferences, including code
					snippets and editor settings.
				</p>
				<ul className="list-disc list-inside mt-2 text-zinc-500 space-y-1">
					<li>engine code and drafts</li>
					<li>app settings and UI preferences</li>
					<li>welcome dialog dismissal state</li>
				</ul>
				<p className="text-zinc-500 mt-2 break-words">
					Legal basis (GDPR): Art. 6(1)(b) and Art. 6(1)(f).
					<br />
					Legal basis (German telecommunications/data protection law): Section 25(2) no. 2 TDDDG for storage/access that is
					strictly necessary for the service requested by the user.
				</p>
			</div>

			<div>
				<h4 className="font-medium text-zinc-200 mb-2 text-xs uppercase tracking-wider">
					External Resources and Third-Party Endpoints
				</h4>
				<p className="text-zinc-500 break-words">
					User code can load external media/resources. In those cases, your browser connects directly to external
					providers and transmits technically necessary connection data (including IP address). These providers process data
					under their own responsibility.
				</p>
			</div>

			<div>
				<h4 className="font-medium text-zinc-200 mb-2 text-xs uppercase tracking-wider">Recipients and Processors</h4>
				<p className="text-zinc-500 break-words">
					We use service providers for infrastructure operation (in particular hosting). Where required, we conclude data
					processing agreements under Art. 28 GDPR.
				</p>
			</div>

			<div>
				<h4 className="font-medium text-zinc-200 mb-2 text-xs uppercase tracking-wider">Storage Periods</h4>
				<p className="text-zinc-500 break-words">
					We store data only as long as necessary for the respective purpose and legal obligations:
				</p>
				<ul className="list-disc list-inside mt-2 text-zinc-500 space-y-1">
					<li>technical log data: limited retention for security and operations</li>
					<li>local storage data: until you delete it in your browser</li>
				</ul>
			</div>

			<div>
				<h4 className="font-medium text-zinc-200 mb-2 text-xs uppercase tracking-wider">Share-Link Execution Consent</h4>
				<p className="text-zinc-500 break-words">
					Before unreviewed shared code can run, users must explicitly confirm in the untrusted-sketch dialog.
				</p>
			</div>

			<div>
				<h4 className="font-medium text-zinc-200 mb-2 text-xs uppercase tracking-wider">Your Rights under GDPR</h4>
				<p className="text-zinc-500 break-words">
					You have rights under Arts. 15-22 GDPR, in particular access, rectification, erasure, restriction, data
					portability, and objection (Art. 21 GDPR). You may also withdraw consent at any time where processing is based
					on consent.
				</p>
				<p className="text-zinc-500 mt-2 break-words">
					To exercise your rights, contact{' '}
					<a href="mailto:hello@textmode.art" className="text-emerald-400 hover:text-emerald-300 transition-colors">
						hello@textmode.art
					</a>
					.
				</p>
			</div>

			<div>
				<h4 className="font-medium text-zinc-200 mb-2 text-xs uppercase tracking-wider">Right to Lodge a Complaint</h4>
				<p className="text-zinc-500 break-words">
					You have the right to lodge a complaint with a supervisory authority, in particular in the member state of your
					habitual residence, place of work, or place of the alleged infringement.
				</p>
				<p className="text-zinc-500 mt-2 break-words">
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
				<h4 className="font-medium text-zinc-200 mb-2 text-xs uppercase tracking-wider">No Automated Decision-Making</h4>
				<p className="text-zinc-500 break-words">
					We do not use automated decision-making or profiling under Art. 22 GDPR for legal or similarly significant
					effects.
				</p>
			</div>

			<div>
				<h4 className="font-medium text-zinc-200 mb-2 text-xs uppercase tracking-wider">Last Updated</h4>
				<p className="text-zinc-500">2026-02-24</p>
			</div>

			<div>
				<h4 className="font-medium text-zinc-200 mb-2 text-xs uppercase tracking-wider">Main Legal Sources</h4>
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
	);
}

export const LEGAL_DOCUMENTS_EN: Record<LegalDocumentId, LegalDocumentDefinition> = {
	imprint: {
		id: 'imprint',
		title: 'Imprint',
		navLabel: 'Imprint',
		path: '/imprint',
		description: 'Provider information and legal details.',
		Content: ImprintLegalContent,
	},
	terms: {
		id: 'terms',
		title: 'Terms & Acceptable Use',
		navLabel: 'Terms',
		path: '/tos',
		description: 'Usage rules and liability boundaries.',
		Content: TermsLegalContent,
	},
	privacy: {
		id: 'privacy',
		title: 'Privacy Policy',
		navLabel: 'Privacy',
		path: '/privacy',
		description: 'GDPR-focused processing, recipients, and data subject rights.',
		Content: PrivacyLegalContent,
	},
};
