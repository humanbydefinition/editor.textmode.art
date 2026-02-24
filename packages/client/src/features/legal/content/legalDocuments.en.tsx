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
					Herler Strasse 70/72
					<br />
					51067 Cologne
					<br />
					Germany
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
							Open contact form in a new tab
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
					Herler Strasse 70/72
					<br />
					51067 Cologne
					<br />
					Germany
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
					These terms apply to the use of synth.textmode.art and related features, including sketch sharing, gallery
					submission, and moderation workflows.
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
					<li>disrupt service operation (for example by automated spam or denial patterns)</li>
					<li>misrepresent identity, rights ownership, or moderation history</li>
				</ul>
			</div>

			<div>
				<h4 className="font-medium text-zinc-200 mb-2 text-xs uppercase tracking-wider">User Content and Rights</h4>
				<p className="text-zinc-500 break-words">
					You remain responsible for the content you submit. By submitting to the gallery, you confirm that you have the
					required rights to publish code/text/media references and that publication does not violate third-party rights
					or applicable law.
				</p>
				<p className="text-zinc-500 mt-2 break-words">
					For operating, moderating, and publishing the gallery, you grant us a non-exclusive, worldwide, royalty-free
					license to host, reproduce, adapt (for example previews and OG images), publicly display, and make your
					submission available within synth.textmode.art and related project channels.
				</p>
				<p className="text-zinc-500 mt-2 break-words">
					If third-party claims are asserted against us due to unlawful content you submitted (for example copyright or
					personality-rights violations), you agree to indemnify us for resulting costs to the extent you are responsible.
				</p>
			</div>

			<div>
				<h4 className="font-medium text-zinc-200 mb-2 text-xs uppercase tracking-wider">Moderation and Enforcement</h4>
				<p className="text-zinc-500 break-words">
					We may review, deny, unpublish, or remove submissions where required for legal compliance, platform integrity,
					abuse prevention, or community safety. Queue limits and anti-spam controls may block or delay submissions when
					capacity is reached.
				</p>
			</div>

			<div>
				<h4 className="font-medium text-zinc-200 mb-2 text-xs uppercase tracking-wider">Notice and Action</h4>
				<p className="text-zinc-500 break-words">
					As a hosting service, we are not subject to a general obligation to proactively monitor all user submissions.
					When we receive sufficiently specific notices about allegedly illegal content, we review and act without undue
					delay where required by applicable law.
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
					Herler Strasse 70/72
					<br />
					51067 Cologne
					<br />
					Germany
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
				<h4 className="font-medium text-zinc-200 mb-2 text-xs uppercase tracking-wider">
					Publish Requests and Gallery Moderation
				</h4>
				<p className="text-zinc-500 break-words">If you submit content for the gallery, we process the data you send, including:</p>
				<ul className="list-disc list-inside mt-2 text-zinc-500 space-y-1">
					<li>slug, title, description, code content, and optional license</li>
					<li>optional author name and optional social profile links</li>
					<li>moderation metadata (status, reviewed time, reviewer name, optional denial reason)</li>
					<li>publish-consent evidence (accepted flag, acceptance timestamp, policy version)</li>
				</ul>
				<p className="text-zinc-500 mt-2 break-words">
					Submission requires an explicit consent confirmation in the publish dialog before a request can be sent.
				</p>
				<p className="text-zinc-500 mt-2 break-words">
					Purpose: processing and moderating your submission, operating the public gallery, and preventing abuse.
					<br />
					Legal basis: Art. 6(1)(b) GDPR (processing your submission request) and Art. 6(1)(f) GDPR (legitimate interests
					in secure and reliable operations).
				</p>
				<p className="text-zinc-500 mt-2 break-words">
					Important: Approved submissions are publicly visible by design, including any optional author/social information
					you provided.
				</p>
			</div>

			<div>
				<h4 className="font-medium text-zinc-200 mb-2 text-xs uppercase tracking-wider">Contact Form</h4>
				<p className="text-zinc-500 break-words">
					If you use the integrated contact form, we process the data you provide (name, email address, subject, and
					message) to process and answer your request.
				</p>
				<p className="text-zinc-500 mt-2 break-words">
					Purpose: handling your contact request.
					<br />
					Legal basis: Art. 6(1)(b) GDPR (contractual or pre-contractual requests) or Art. 6(1)(f) GDPR (legitimate
					interests in effective communication).
				</p>
				<p className="text-zinc-500 mt-2 break-words">
					Storage: The data is sent to us by email and stored for the duration of the communication and any subsequent
					documentation requirements.
				</p>
			</div>

			<div>
				<h4 className="font-medium text-zinc-200 mb-2 text-xs uppercase tracking-wider">Anti-Spam and Abuse Prevention</h4>
				<p className="text-zinc-500 break-words">
					We use layered anti-spam controls for gallery submissions: Cloudflare Turnstile verification, challenge +
					proof-of-work, idempotency guards, and global queue limits.
				</p>
				<p className="text-zinc-500 mt-2 break-words">
					Cloudflare Turnstile may process technical signals required for bot detection (for example IP address, TLS
					fingerprint, user-agent, and sitekey/origin context). In this setup, Turnstile verification is used only for
					security/abuse prevention in publish and contact requests.
				</p>
				<p className="text-zinc-500 mt-2 break-words">
					Purpose: protect availability and moderation capacity.
					<br />
					Legal basis: Art. 6(1)(f) GDPR.
				</p>
				<p className="text-zinc-500 mt-2 break-words">
					For device storage/access rules under German law, processing is performed as technically necessary to provide a
					user-requested secure submission flow (Section 25(2) no. 2 TDDDG).
				</p>
				<p className="text-zinc-500 mt-2 break-words">
					Recipient/processor: Cloudflare, Inc. (USA). We rely on Cloudflare&apos;s DPA and transfer safeguards (including
					DPF/SCC mechanisms where applicable).
				</p>
				<ul className="list-disc list-inside mt-2 text-zinc-500 space-y-1">
					<li>
						<a
							href="https://www.cloudflare.com/turnstile-privacy-policy/"
							target="_blank"
							rel="noopener noreferrer"
							className="text-emerald-400 hover:text-emerald-300 transition-colors"
						>
							Cloudflare Turnstile Privacy Addendum
						</a>
					</li>
					<li>
						<a
							href="https://www.cloudflare.com/cloudflare-customer-dpa/"
							target="_blank"
							rel="noopener noreferrer"
							className="text-emerald-400 hover:text-emerald-300 transition-colors"
						>
							Cloudflare Customer DPA
						</a>
					</li>
					<li>
						<a
							href="https://www.cloudflare.com/gdpr/subprocessors/"
							target="_blank"
							rel="noopener noreferrer"
							className="text-emerald-400 hover:text-emerald-300 transition-colors"
						>
							Cloudflare Subprocessors
						</a>
					</li>
				</ul>
			</div>

			<div>
				<h4 className="font-medium text-zinc-200 mb-2 text-xs uppercase tracking-wider">Discord Notifications</h4>
				<p className="text-zinc-500 break-words">
					When you submit content to the gallery or when a submission is approved, certain data is transmitted to Discord
					via a bot API to notify our moderation team and community.
				</p>
				<p className="text-zinc-500 mt-2 break-words">
					Data shared: author name, social links, sketch title, description, and the public slug.
				</p>
				<p className="text-zinc-500 mt-2 break-words">
					Purpose: moderation workflow, community notifications, and platform engagement.
					<br />
					Legal basis: Art. 6(1)(f) GDPR (legitimate interests).
				</p>
				<p className="text-zinc-500 mt-2 break-words">
					Recipient: Discord, Inc. (USA). Discord participates in the EU-U.S. Data Privacy Framework (DPF), providing an
					adequacy decision for data transfers to the USA.
				</p>
				<ul className="list-disc list-inside mt-2 text-zinc-500 space-y-1">
					<li>
						<a
							href="https://discord.com/privacy"
							target="_blank"
							rel="noopener noreferrer"
							className="text-emerald-400 hover:text-emerald-300 transition-colors"
						>
							Discord Privacy Policy
						</a>
					</li>
				</ul>
			</div>

			<div>
				<h4 className="font-medium text-zinc-200 mb-2 text-xs uppercase tracking-wider">Analytics (Umami)</h4>
				<p className="text-zinc-500 break-words">
					We use{' '}
					<a
						href="https://umami.is/"
						target="_blank"
						rel="noopener noreferrer"
						className="text-emerald-400 hover:text-emerald-300 transition-colors"
					>
						Umami
					</a>{' '}
					via <span className="text-zinc-300">analytics.textmode.art</span> to measure aggregate usage. According to our
					setup, no marketing cookies or cross-site profiling are used.
				</p>
				<p className="text-zinc-500 mt-2 break-words">
					Purpose: reach measurement and product quality improvements.
					<br />
					Legal basis: Art. 6(1)(f) GDPR.
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
					<li>anti-spam challenge state: short-lived, automatically expiring in memory</li>
					<li>turnstile verification tokens: processed for verification and not stored long-term</li>
					<li>submission and moderation data: until moderation purpose ends or deletion is requested</li>
					<li>approved gallery entries: until removed by us or by justified deletion request</li>
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
				<p className="text-zinc-500">2026-02-15</p>
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
		description: 'Provider information and legal publishing details.',
		Content: ImprintLegalContent,
	},
	terms: {
		id: 'terms',
		title: 'Terms & Acceptable Use',
		navLabel: 'Terms',
		path: '/tos',
		description: 'Usage rules, moderation scope, and liability boundaries.',
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
