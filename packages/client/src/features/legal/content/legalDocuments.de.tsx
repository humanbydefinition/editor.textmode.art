import { cn } from '@/shared/lib/cn';
import type { LegalContentProps, LegalDocumentDefinition, LegalDocumentId } from './legalDocument.types';

const contentBaseClass = 'space-y-4 text-sm text-zinc-400 leading-relaxed';

export function ImprintLegalContentDe({ className }: LegalContentProps) {
	return (
		<div className={cn(contentBaseClass, className)}>
			<div>
				<h4 className="font-medium text-zinc-200 mb-2 text-xs uppercase tracking-wider">Geltungsbereich</h4>
				<p>Dieses Impressum gilt fuer:</p>
				<ul className="list-disc list-inside mt-1 text-zinc-500">
					<li>https://synth.textmode.art</li>
				</ul>
			</div>

			<div>
				<h4 className="font-medium text-zinc-200 mb-2 text-xs uppercase tracking-wider">
					Anbieterkennzeichnung (Section 5 DDG)
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
				<h4 className="font-medium text-zinc-200 mb-2 text-xs uppercase tracking-wider">Kontakt</h4>
				<div className="space-y-1">
					<p>
						E-Mail:{' '}
						<a href="mailto:hello@textmode.art" className="text-emerald-400 hover:text-emerald-300 transition-colors">
							hello@textmode.art
						</a>
					</p>
					<p className="text-zinc-500 text-[11px] leading-relaxed italic">
						Alternative: Verwende den Kontaktformular-Button unten im Legal-Tab.
					</p>
				</div>
			</div>

			<div>
				<h4 className="font-medium text-zinc-200 mb-2 text-xs uppercase tracking-wider">
					Verantwortlich fuer journalistisch-redaktionelle Inhalte (Section 18 (2) MStV)
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
					Haftung fuer eigene und externe Inhalte
				</h4>
				<p className="text-zinc-500 break-words">
					Eigene Inhalte erstellen und pflegen wir mit der gebotenen Sorgfalt. Externe Links werden zum Zeitpunkt der
					Verlinkung geprueft. Fuer externe Inhalte bleibt der jeweilige Drittanbieter verantwortlich.
				</p>
			</div>

			<div>
				<h4 className="font-medium text-zinc-200 mb-2 text-xs uppercase tracking-wider">Rechtsgrundlagen</h4>
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
							Medienstaatsvertrag (MStV)
						</a>
					</li>
				</ul>
			</div>
		</div>
	);
}

export function TermsLegalContentDe({ className }: LegalContentProps) {
	return (
		<div className={cn(contentBaseClass, className)}>
			<div>
				<h4 className="font-medium text-zinc-200 mb-2 text-xs uppercase tracking-wider">Geltungsbereich</h4>
				<p className="text-zinc-500 break-words">
					Diese Bedingungen gelten fuer die Nutzung von synth.textmode.art und zugehoerigen Funktionen, einschliesslich
					Sketch-Sharing, Galerie-Einreichung und Moderationsablaeufen.
				</p>
			</div>

			<div>
				<h4 className="font-medium text-zinc-200 mb-2 text-xs uppercase tracking-wider">Art des Dienstes</h4>
				<p className="text-zinc-500 break-words">
					Die Plattform wird fuer Creative Coding und Community-Sharing bereitgestellt. Verfuegbarkeit, Performance und
					Kompatibilitaet koennen sich im Zeitverlauf aendern. Es besteht keine Gewaehr dafuer, dass bestimmte Funktionen
					dauerhaft verfuegbar sind.
				</p>
			</div>

			<div>
				<h4 className="font-medium text-zinc-200 mb-2 text-xs uppercase tracking-wider">Zulaessige Nutzung</h4>
				<p className="text-zinc-500">Du darfst den Dienst nicht nutzen, um:</p>
				<ul className="list-disc list-inside mt-2 text-zinc-500 space-y-1">
					<li>rechtswidrige, verletzende oder missbraeuchliche Inhalte hochzuladen oder zu verbreiten</li>
					<li>unbefugte Zugriffe, missbraeuchliches Scraping oder Sicherheitsumgehungen zu versuchen</li>
					<li>den Dienstbetrieb zu stoeren (zum Beispiel durch automatisierten Spam oder DoS-Muster)</li>
					<li>Identitaet, Rechteinhaberschaft oder Moderationshistorie falsch darzustellen</li>
				</ul>
			</div>

			<div>
				<h4 className="font-medium text-zinc-200 mb-2 text-xs uppercase tracking-wider">Nutzerinhalte und Rechte</h4>
				<p className="text-zinc-500 break-words">
					Du bleibst fuer eingereichte Inhalte verantwortlich. Mit einer Galerie-Einreichung bestaetigst du, dass du ueber
					die erforderlichen Rechte zur Veroeffentlichung von Code/Text/Medienverweisen verfuegst und dass die
					Veroeffentlichung keine Rechte Dritter oder geltendes Recht verletzt.
				</p>
			</div>

			<div>
				<h4 className="font-medium text-zinc-200 mb-2 text-xs uppercase tracking-wider">Moderation und Durchsetzung</h4>
				<p className="text-zinc-500 break-words">
					Wir koennen Einreichungen pruefen, ablehnen, depublizieren oder entfernen, soweit dies fuer rechtliche
					Compliance, Plattformintegritaet, Missbrauchspraevention oder Community-Sicherheit erforderlich ist.
					Queue-Limits und Anti-Spam-Kontrollen koennen Einreichungen blockieren oder verzoegern, wenn Kapazitaetsgrenzen
					erreicht sind.
				</p>
			</div>

			<div>
				<h4 className="font-medium text-zinc-200 mb-2 text-xs uppercase tracking-wider">
					Ungepruefte Sketches und Ausfuehrungsrisiko
				</h4>
				<p className="text-zinc-500 break-words">
					Geteilte Sketches koennen ungeprueften Drittcode enthalten. Das Ausfuehren kann Audioausgabe,
					performance-intensive Schleifen oder externe Netzwerkanfragen ausloesen. Du entscheidest selbst, ob du
					geteilten Code ausfuehrst, und solltest ihn vorher pruefen.
				</p>
			</div>

			<div>
				<h4 className="font-medium text-zinc-200 mb-2 text-xs uppercase tracking-wider">Haftung</h4>
				<p className="text-zinc-500 break-words">
					Wir haften nach den gesetzlichen Vorschriften. Soweit gesetzlich zulaessig, ist die Haftung fuer leichte
					Fahrlaessigkeit auf vorhersehbare, vertragstypische Schaeden begrenzt. Haftungsbeschraenkungen gelten nicht bei
					Vorsatz, grober Fahrlaessigkeit, Verletzung von Leben/Koerper/Gesundheit, zwingender gesetzlicher Haftung
					(einschliesslich Produkthaftung) oder soweit Haftung nach anwendbarem Recht nicht ausgeschlossen werden kann.
				</p>
			</div>

			<div>
				<h4 className="font-medium text-zinc-200 mb-2 text-xs uppercase tracking-wider">Anwendbares Recht</h4>
				<p className="text-zinc-500 break-words">
					Es gilt deutsches Recht, unbeschadet zwingender Verbraucherschutzvorschriften, die in deinem Wohnsitzstaat
					gelten koennen.
				</p>
			</div>

			<div>
				<h4 className="font-medium text-zinc-200 mb-2 text-xs uppercase tracking-wider">Meldung und Kontakt</h4>
				<p className="text-zinc-500">
					Fuer rechtliche Hinweise, Rechteanfragen oder Missbrauchsmeldungen kontaktiere{' '}
					<a href="mailto:hello@textmode.art" className="text-emerald-400 hover:text-emerald-300 transition-colors">
						hello@textmode.art
					</a>
					.
				</p>
			</div>

			<div>
				<h4 className="font-medium text-zinc-200 mb-2 text-xs uppercase tracking-wider">Zuletzt aktualisiert</h4>
				<p className="text-zinc-500">2026-02-15</p>
			</div>
		</div>
	);
}

export function PrivacyLegalContentDe({ className }: LegalContentProps) {
	return (
		<div className={cn(contentBaseClass, className)}>
			<div>
				<h4 className="font-medium text-zinc-200 mb-2 text-xs uppercase tracking-wider">Verantwortlicher</h4>
				<p className="break-words">
					Christopher Dietrich
					<br />
					Herler Strasse 70/72
					<br />
					51067 Cologne
					<br />
					Germany
					<br />
					E-Mail:{' '}
					<a href="mailto:hello@textmode.art" className="text-emerald-400 hover:text-emerald-300 transition-colors">
						hello@textmode.art
					</a>
				</p>
			</div>

			<div>
				<h4 className="font-medium text-zinc-200 mb-2 text-xs uppercase tracking-wider">Allgemeine Hinweise</h4>
				<p className="text-zinc-500 break-words">
					Diese Erklaerung informiert darueber, wie personenbezogene Daten bei der Nutzung von synth.textmode.art
					verarbeitet werden. Personenbezogene Daten sind alle Informationen, die sich auf eine identifizierte oder
					identifizierbare natuerliche Person beziehen (Art. 4(1) DSGVO/GDPR).
				</p>
			</div>

			<div>
				<h4 className="font-medium text-zinc-200 mb-2 text-xs uppercase tracking-wider">Hosting und Server-Logs</h4>
				<p className="text-zinc-500 break-words">
					Der Dienst wird auf Infrastruktur von{' '}
					<a
						href="https://www.hetzner.com/legal/privacy-policy"
						target="_blank"
						rel="noopener noreferrer"
						className="text-emerald-400 hover:text-emerald-300 transition-colors"
					>
						Hetzner
					</a>
					 betrieben. Beim Zugriff koennen technisch erforderliche Verbindungsdaten verarbeitet werden, zum Beispiel
					IP-Adresse, Zeitstempel, angeforderte URL, Referrer, User-Agent und Response-Status.
				</p>
				<p className="text-zinc-500 mt-2 break-words">
					Zweck: sicherer und stabiler Betrieb, Debugging, Missbrauchserkennung und Dienstschutz.
					<br />
					Rechtsgrundlage: Art. 6(1)(f) DSGVO (berechtigte Interessen).
				</p>
			</div>

			<div>
				<h4 className="font-medium text-zinc-200 mb-2 text-xs uppercase tracking-wider">
					Veroeffentlichungsanfragen und Galerie-Moderation
				</h4>
				<p className="text-zinc-500 break-words">
					Wenn du Inhalte fuer die Galerie einreichst, verarbeiten wir die von dir uebermittelten Daten, einschliesslich:
				</p>
				<ul className="list-disc list-inside mt-2 text-zinc-500 space-y-1">
					<li>Slug, Titel, Beschreibung, Code-Inhalte und optionale Lizenz</li>
					<li>optionaler Autorname und optionale Social-Profile-Links</li>
					<li>Moderationsmetadaten (Status, Pruefzeit, Pruefername, optionaler Ablehnungsgrund)</li>
					<li>Nachweise zur Publikations-Einwilligung (Flag, Zeitpunkt, Richtlinienversion)</li>
				</ul>
				<p className="text-zinc-500 mt-2 break-words">
					Die Einreichung setzt eine explizite Einwilligungsbestaetigung im Publish-Dialog voraus.
				</p>
				<p className="text-zinc-500 mt-2 break-words">
					Zweck: Verarbeitung und Moderation deiner Einreichung, Betrieb der oeffentlichen Galerie und Missbrauchspraevention.
					<br />
					Rechtsgrundlage: Art. 6(1)(b) DSGVO (Verarbeitung deiner Einreichungsanfrage) und Art. 6(1)(f) DSGVO
					(berechtigte Interessen am sicheren und verlaesslichen Betrieb).
				</p>
				<p className="text-zinc-500 mt-2 break-words">
					Wichtig: Freigegebene Einreichungen sind oeffentlich sichtbar, einschliesslich optionaler Autor-/Social-Angaben.
				</p>
			</div>

			<div>
				<h4 className="font-medium text-zinc-200 mb-2 text-xs uppercase tracking-wider">Kontaktformular</h4>
				<p className="text-zinc-500 break-words">
					Wenn du das integrierte Kontaktformular nutzt, verarbeiten wir die von dir angegebenen Daten (Name,
					E-Mail-Adresse, Betreff und Nachricht), um deine Anfrage zu bearbeiten und zu beantworten.
				</p>
				<p className="text-zinc-500 mt-2 break-words">
					Zweck: Bearbeitung deiner Kontaktanfrage.
					<br />
					Rechtsgrundlage: Art. 6(1)(b) DSGVO (vertragliche/vorvertragliche Anfragen) oder Art. 6(1)(f) DSGVO
					(berechtigte Interessen an effektiver Kommunikation).
				</p>
				<p className="text-zinc-500 mt-2 break-words">
					Speicherung: Die Daten werden per E-Mail uebermittelt und fuer die Dauer der Kommunikation sowie ggf.
					nachgelagerter Dokumentationspflichten gespeichert.
				</p>
			</div>

			<div>
				<h4 className="font-medium text-zinc-200 mb-2 text-xs uppercase tracking-wider">Anti-Spam und Missbrauchspraevention</h4>
				<p className="text-zinc-500 break-words">
					Wir nutzen mehrstufige Anti-Spam-Kontrollen fuer Galerie-Einreichungen: Cloudflare Turnstile-Verifikation,
					Challenge + Proof-of-Work, Idempotenz-Schutz und globale Queue-Limits.
				</p>
				<p className="text-zinc-500 mt-2 break-words">
					Cloudflare Turnstile kann technische Signale verarbeiten, die fuer Bot-Erkennung erforderlich sind (zum Beispiel
					IP-Adresse, TLS-Fingerprint, User-Agent sowie Sitekey-/Origin-Kontext). In diesem Setup wird Turnstile nur fuer
					Sicherheits- und Missbrauchspraevention bei Publish- und Kontaktanfragen genutzt.
				</p>
				<p className="text-zinc-500 mt-2 break-words">
					Zweck: Schutz von Verfuegbarkeit und Moderationskapazitaet.
					<br />
					Rechtsgrundlage: Art. 6(1)(f) DSGVO.
				</p>
				<p className="text-zinc-500 mt-2 break-words">
					Fuer Speicher-/Zugriffsregeln nach deutschem Recht erfolgt die Verarbeitung als technisch erforderlich fuer den
					vom Nutzer angeforderten sicheren Einreichungsprozess (Section 25(2) no. 2 TDDDG).
				</p>
				<p className="text-zinc-500 mt-2 break-words">
					Empfaenger/Auftragsverarbeiter: Cloudflare, Inc. (USA). Wir stuetzen uns auf Cloudflare-DPA und
					Transfergarantien (einschliesslich DPF/SCC, soweit anwendbar).
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
				<h4 className="font-medium text-zinc-200 mb-2 text-xs uppercase tracking-wider">Discord-Benachrichtigungen</h4>
				<p className="text-zinc-500 break-words">
					Wenn du Inhalte fuer die Galerie einreichst oder eine Einreichung freigegeben wird, werden bestimmte Daten per
					Bot-API an Discord uebermittelt, um Moderationsteam und Community zu informieren.
				</p>
				<p className="text-zinc-500 mt-2 break-words">
					Geteilte Daten: Autorname, Social-Links, Sketch-Titel, Beschreibung und oeffentlicher Slug.
				</p>
				<p className="text-zinc-500 mt-2 break-words">
					Zweck: Moderationsworkflow, Community-Benachrichtigungen und Plattform-Engagement.
					<br />
					Rechtsgrundlage: Art. 6(1)(f) DSGVO (berechtigte Interessen).
				</p>
				<p className="text-zinc-500 mt-2 break-words">
					Empfaenger: Discord, Inc. (USA). Discord nimmt am EU-U.S. Data Privacy Framework (DPF) teil, wodurch ein
					Angemessenheitsbeschluss fuer Datentransfers in die USA besteht.
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
					Wir nutzen{' '}
					<a
						href="https://umami.is/"
						target="_blank"
						rel="noopener noreferrer"
						className="text-emerald-400 hover:text-emerald-300 transition-colors"
					>
						Umami
					</a>{' '}
					ueber <span className="text-zinc-300">analytics.textmode.art</span> zur aggregierten Nutzungsanalyse. Nach
					unserem Setup werden keine Marketing-Cookies oder Cross-Site-Profile verwendet.
				</p>
				<p className="text-zinc-500 mt-2 break-words">
					Zweck: Reichweitenmessung und Verbesserung der Produktqualitaet.
					<br />
					Rechtsgrundlage: Art. 6(1)(f) DSGVO.
				</p>
			</div>

			<div>
				<h4 className="font-medium text-zinc-200 mb-2 text-xs uppercase tracking-wider">Local Storage und Geraetezugriff</h4>
				<p className="text-zinc-500 break-words">
					Die App speichert Daten im Browser-Local-Storage, um Kernfunktionen und Praeferenzen bereitzustellen,
					einschliesslich Code-Snippets und Editor-Einstellungen.
				</p>
				<ul className="list-disc list-inside mt-2 text-zinc-500 space-y-1">
					<li>Engine-Code und Entwuerfe</li>
					<li>App-Einstellungen und UI-Praeferenzen</li>
					<li>Status des ausgeblendeten Welcome-Dialogs</li>
				</ul>
				<p className="text-zinc-500 mt-2 break-words">
					Rechtsgrundlage (DSGVO): Art. 6(1)(b) und Art. 6(1)(f).
					<br />
					Rechtsgrundlage (deutsches Telekommunikations-/Datenschutzrecht): Section 25(2) no. 2 TDDDG fuer
					Speicherung/Zugriff, die fuer den vom Nutzer angeforderten Dienst strikt erforderlich ist.
				</p>
			</div>

			<div>
				<h4 className="font-medium text-zinc-200 mb-2 text-xs uppercase tracking-wider">
					Externe Ressourcen und Drittanbieter-Endpunkte
				</h4>
				<p className="text-zinc-500 break-words">
					Nutzercode kann externe Medien/Ressourcen laden. In diesen Faellen stellt dein Browser direkte Verbindungen zu
					externen Anbietern her und uebermittelt technisch erforderliche Verbindungsdaten (einschliesslich IP-Adresse).
					Diese Anbieter verarbeiten Daten in eigener Verantwortung.
				</p>
			</div>

			<div>
				<h4 className="font-medium text-zinc-200 mb-2 text-xs uppercase tracking-wider">Empfaenger und Auftragsverarbeiter</h4>
				<p className="text-zinc-500 break-words">
					Wir nutzen Dienstleister fuer den Infrastrukturbetrieb (insbesondere Hosting). Soweit erforderlich, schliessen wir
					Auftragsverarbeitungsvertraege gemaess Art. 28 DSGVO.
				</p>
			</div>

			<div>
				<h4 className="font-medium text-zinc-200 mb-2 text-xs uppercase tracking-wider">Speicherfristen</h4>
				<p className="text-zinc-500 break-words">
					Wir speichern Daten nur so lange, wie es fuer den jeweiligen Zweck und gesetzliche Pflichten erforderlich ist:
				</p>
				<ul className="list-disc list-inside mt-2 text-zinc-500 space-y-1">
					<li>technische Log-Daten: begrenzte Aufbewahrung fuer Sicherheit und Betrieb</li>
					<li>Anti-Spam-Challenge-Status: kurzlebig, automatische In-Memory-Ablaufsteuerung</li>
					<li>Turnstile-Token: fuer Verifikation verarbeitet, nicht langfristig gespeichert</li>
					<li>Einreichungs- und Moderationsdaten: bis Moderationszweck endet oder Loeschung angefordert wird</li>
					<li>freigegebene Galerie-Eintraege: bis Entfernung durch uns oder berechtigte Loeschanfrage</li>
					<li>Local-Storage-Daten: bis du sie im Browser loeschst</li>
				</ul>
			</div>

			<div>
				<h4 className="font-medium text-zinc-200 mb-2 text-xs uppercase tracking-wider">Einwilligung zur Share-Link-Ausfuehrung</h4>
				<p className="text-zinc-500 break-words">
					Bevor ungepruefter geteilter Code ausgefuehrt werden kann, muessen Nutzer dies im Untrusted-Sketch-Dialog
					ausdruecklich bestaetigen.
				</p>
			</div>

			<div>
				<h4 className="font-medium text-zinc-200 mb-2 text-xs uppercase tracking-wider">Deine Rechte nach DSGVO</h4>
				<p className="text-zinc-500 break-words">
					Du hast Rechte nach Art. 15-22 DSGVO, insbesondere Auskunft, Berichtigung, Loeschung, Einschraenkung,
					Datenuebertragbarkeit und Widerspruch (Art. 21 DSGVO). Eine erteilte Einwilligung kannst du jederzeit mit Wirkung
					fuer die Zukunft widerrufen, soweit die Verarbeitung darauf beruht.
				</p>
				<p className="text-zinc-500 mt-2 break-words">
					Zur Ausuebung deiner Rechte kontaktiere{' '}
					<a href="mailto:hello@textmode.art" className="text-emerald-400 hover:text-emerald-300 transition-colors">
						hello@textmode.art
					</a>
					.
				</p>
			</div>

			<div>
				<h4 className="font-medium text-zinc-200 mb-2 text-xs uppercase tracking-wider">Beschwerderecht</h4>
				<p className="text-zinc-500 break-words">
					Du hast das Recht, Beschwerde bei einer Aufsichtsbehoerde einzulegen, insbesondere in dem Mitgliedstaat deines
					gewoehnlichen Aufenthalts, deines Arbeitsplatzes oder des Orts des mutmasslichen Verstosses.
				</p>
				<p className="text-zinc-500 mt-2 break-words">
					Zustaendige Behoerde fuer Cologne, NRW:
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
				<h4 className="font-medium text-zinc-200 mb-2 text-xs uppercase tracking-wider">Keine automatisierte Entscheidung</h4>
				<p className="text-zinc-500 break-words">
					Wir nutzen keine automatisierte Entscheidungsfindung oder Profiling nach Art. 22 DSGVO mit rechtlicher oder
					vergleichbar erheblicher Wirkung.
				</p>
			</div>

			<div>
				<h4 className="font-medium text-zinc-200 mb-2 text-xs uppercase tracking-wider">Zuletzt aktualisiert</h4>
				<p className="text-zinc-500">2026-02-15</p>
			</div>

			<div>
				<h4 className="font-medium text-zinc-200 mb-2 text-xs uppercase tracking-wider">Wichtige Rechtsquellen</h4>
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

export const LEGAL_DOCUMENTS_DE: Record<LegalDocumentId, LegalDocumentDefinition> = {
	imprint: {
		id: 'imprint',
		title: 'Impressum',
		navLabel: 'Impressum',
		path: '/imprint',
		description: 'Anbieterkennzeichnung und Pflichtangaben.',
		Content: ImprintLegalContentDe,
	},
	terms: {
		id: 'terms',
		title: 'Nutzungsbedingungen',
		navLabel: 'Nutzung',
		path: '/tos',
		description: 'Nutzungsregeln, Moderation und Haftungsrahmen.',
		Content: TermsLegalContentDe,
	},
	privacy: {
		id: 'privacy',
		title: 'Datenschutzerklaerung',
		navLabel: 'Datenschutz',
		path: '/privacy',
		description: 'Datenschutzinformationen nach DSGVO zu Verarbeitung und Betroffenenrechten.',
		Content: PrivacyLegalContentDe,
	},
};
