import { cn } from '@/shared/lib/cn';
import type { LegalContentProps, LegalDocumentDefinition, LegalDocumentId } from './legalDocument.types';

const contentBaseClass = 'space-y-4 text-sm text-zinc-400 leading-relaxed';

export function ImprintLegalContentDe({ className }: LegalContentProps) {
	return (
		<div className={cn(contentBaseClass, className)}>
			<div>
				<h4 className="font-medium text-zinc-200 mb-2 text-xs uppercase tracking-wider">Geltungsbereich</h4>
				<p>Dieses Impressum gilt für:</p>
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
					Mauerstraße 36
					<br />
					40476 Düsseldorf
					<br />
					Deutschland
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
						Alternative:{' '}
						<a
							href="/de/contact"
							target="_blank"
							rel="noopener noreferrer"
							className="text-emerald-400 hover:text-emerald-300 transition-colors"
							>
								Kontaktseite in neuem Tab oeffnen
						</a>
						.
					</p>
				</div>
			</div>

			<div>
				<h4 className="font-medium text-zinc-200 mb-2 text-xs uppercase tracking-wider">
					Verantwortlich für journalistisch-redaktionelle Inhalte (Section 18 (2) MStV)
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
					Haftung für eigene und externe Inhalte
				</h4>
				<p className="text-zinc-500 break-words">
					Eigene Inhalte erstellen und pflegen wir mit der gebotenen Sorgfalt. Externe Links werden zum Zeitpunkt der
					Verlinkung geprüft. Für externe Inhalte bleibt der jeweilige Drittanbieter verantwortlich.
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
					lokalem Live-Coding, clientseitigem Sketch-Sharing und sandboxed Code-Ausfuehrung.
				</p>
			</div>

			<div>
				<h4 className="font-medium text-zinc-200 mb-2 text-xs uppercase tracking-wider">Art des Dienstes</h4>
				<p className="text-zinc-500 break-words">
					Die Plattform wird für Creative Coding und Community-Sharing bereitgestellt. Verfügbarkeit, Performance und
					Kompatibilität können sich im Zeitverlauf ändern. Es besteht keine Gewähr dafür, dass bestimmte Funktionen
					dauerhaft verfügbar sind.
				</p>
			</div>

			<div>
				<h4 className="font-medium text-zinc-200 mb-2 text-xs uppercase tracking-wider">Zulässige Nutzung</h4>
				<p className="text-zinc-500">Du darfst den Dienst nicht nutzen, um:</p>
				<ul className="list-disc list-inside mt-2 text-zinc-500 space-y-1">
					<li>rechtswidrige, verletzende oder missbräuchliche Inhalte hochzuladen oder zu verbreiten</li>
					<li>unbefugte Zugriffe, missbräuchliches Scraping oder Sicherheitsumgehungen zu versuchen</li>
					<li>den Dienstbetrieb zu stoeren oder technische Schutzmassnahmen zu umgehen</li>
					<li>Identitaet oder Rechteinhaberschaft falsch darzustellen</li>
				</ul>
			</div>

			<div>
				<h4 className="font-medium text-zinc-200 mb-2 text-xs uppercase tracking-wider">Nutzerinhalte und Rechte</h4>
				<p className="text-zinc-500 break-words">
					Du bleibst fuer Code, Text und Medienverweise verantwortlich, die du erstellst oder teilst. Share-Links
					kodieren deinen Sketch in der URL und werden nur verbreitet, wenn du sie kopierst oder versendest.
				</p>
				<p className="text-zinc-500 mt-2 break-words">
					Wenn Dritte wegen rechtswidriger Inhalte aus deiner Einreichung Ansprüche gegen uns geltend machen (zum Beispiel
					Urheber- oder Persönlichkeitsrechtsverletzungen), stellst du uns im Umfang deiner Verantwortlichkeit von den
					daraus entstehenden Kosten frei.
				</p>
			</div>

			<div>
				<h4 className="font-medium text-zinc-200 mb-2 text-xs uppercase tracking-wider">Hinweis- und Abhilfeverfahren</h4>
				<p className="text-zinc-500 break-words">
					Wenn du uns zu mutmasslich rechtswidrigen oder rechtsverletzenden Inhalten mit Projektbezug kontaktierst,
					pruefen wir den Hinweis und ergreifen unverzueglich die gesetzlich erforderlichen Massnahmen.
				</p>
			</div>

			<div>
				<h4 className="font-medium text-zinc-200 mb-2 text-xs uppercase tracking-wider">
					Ungeprüfte Sketches und Ausführungsrisiko
				</h4>
				<p className="text-zinc-500 break-words">
					Geteilte Sketches können ungeprüften Drittcode enthalten. Das Ausführen kann Audioausgabe,
					performance-intensive Schleifen oder externe Netzwerkanfragen auslösen. Du entscheidest selbst, ob du
					geteilten Code ausführst, und solltest ihn vorher prüfen.
				</p>
				<p className="text-zinc-500 mt-2 break-words">
					Die Ausführung geteilter Sketches ist freiwillig und erfolgt auf eigenes Risiko. Für Sicherheit,
					Rechtmäßigkeit, Fehlerfreiheit oder Eignung von Dritt-Sketches übernehmen wir keine Gewähr.
				</p>
			</div>

			<div>
				<h4 className="font-medium text-zinc-200 mb-2 text-xs uppercase tracking-wider">Haftung</h4>
				<p className="text-zinc-500 break-words">
					Wir haften nach den gesetzlichen Vorschriften. Soweit gesetzlich zulässig, ist die Haftung für leichte
					Fahrlässigkeit ausgeschlossen, außer bei Verletzung wesentlicher Vertragspflichten (Kardinalpflichten). In
					diesem Fall ist die Haftung auf den vorhersehbaren, vertragstypischen Schaden begrenzt.
				</p>
				<p className="text-zinc-500 mt-2 break-words">
					Haftungsbeschränkungen gelten nicht bei Vorsatz, grober Fahrlässigkeit, Verletzung von
					Leben/Körper/Gesundheit, arglistigem Verschweigen, Garantieübernahme, zwingender gesetzlicher Haftung
					(einschließlich Produkthaftung) oder soweit Haftung nach anwendbarem Recht nicht ausgeschlossen werden kann.
				</p>
			</div>

			<div>
				<h4 className="font-medium text-zinc-200 mb-2 text-xs uppercase tracking-wider">Anwendbares Recht</h4>
				<p className="text-zinc-500 break-words">
					Es gilt deutsches Recht, unbeschadet zwingender Verbraucherschutzvorschriften, die in deinem Wohnsitzstaat
					gelten können.
				</p>
			</div>

			<div>
				<h4 className="font-medium text-zinc-200 mb-2 text-xs uppercase tracking-wider">Meldung und Kontakt</h4>
				<p className="text-zinc-500">
					Für rechtliche Hinweise, Rechteanfragen oder Missbrauchsmeldungen kontaktiere{' '}
					<a href="mailto:hello@textmode.art" className="text-emerald-400 hover:text-emerald-300 transition-colors">
						hello@textmode.art
					</a>
					.
				</p>
			</div>

			<div>
				<h4 className="font-medium text-zinc-200 mb-2 text-xs uppercase tracking-wider">Zuletzt aktualisiert</h4>
				<p className="text-zinc-500">2026-02-24</p>
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
					Mauerstraße 36
					<br />
					40476 Düsseldorf
					<br />
					Deutschland
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
					Diese Erklärung informiert darüber, wie personenbezogene Daten bei der Nutzung von synth.textmode.art
					verarbeitet werden. Personenbezogene Daten sind alle Informationen, die sich auf eine identifizierte oder
					identifizierbare natürliche Person beziehen (Art. 4(1) DSGVO/GDPR).
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
					{' '}betrieben. Beim Zugriff können technisch erforderliche Verbindungsdaten verarbeitet werden, zum Beispiel
					IP-Adresse, Zeitstempel, angeforderte URL, Referrer, User-Agent und Response-Status.
				</p>
				<p className="text-zinc-500 mt-2 break-words">
					Zweck: sicherer und stabiler Betrieb, Debugging, Missbrauchserkennung und Dienstschutz.
					<br />
					Rechtsgrundlage: Art. 6(1)(f) DSGVO (berechtigte Interessen).
				</p>
			</div>

			<div>
				<h4 className="font-medium text-zinc-200 mb-2 text-xs uppercase tracking-wider">Kontakt</h4>
				<p className="text-zinc-500 break-words">
					Wenn du uns per E-Mail oder ueber verlinkte externe Kanaele kontaktierst, verarbeiten wir die von dir
					angegebenen Daten zur Bearbeitung und Beantwortung deiner Anfrage.
				</p>
				<p className="text-zinc-500 mt-2 break-words">
					Zweck: Bearbeitung deiner Kontaktanfrage.
					<br />
					Rechtsgrundlage: Art. 6(1)(b) DSGVO (vertragliche/vorvertragliche Anfragen) oder Art. 6(1)(f) DSGVO
					(berechtigte Interessen an effektiver Kommunikation).
				</p>
				<p className="text-zinc-500 mt-2 break-words">
					Speicherung: Kommunikationsdaten werden fuer die Dauer der Kommunikation sowie ggf. nachgelagerter
					Dokumentationspflichten gespeichert.
				</p>
			</div>

			<div>
				<h4 className="font-medium text-zinc-200 mb-2 text-xs uppercase tracking-wider">Local Storage und Gerätezugriff</h4>
				<p className="text-zinc-500 break-words">
					Die App speichert Daten im Browser-Local-Storage, um Kernfunktionen und Präferenzen bereitzustellen,
					einschließlich Code-Snippets und Editor-Einstellungen.
				</p>
				<ul className="list-disc list-inside mt-2 text-zinc-500 space-y-1">
					<li>Engine-Code und Entwürfe</li>
					<li>App-Einstellungen und UI-Präferenzen</li>
					<li>Status des ausgeblendeten Welcome-Dialogs</li>
				</ul>
				<p className="text-zinc-500 mt-2 break-words">
					Rechtsgrundlage (DSGVO): Art. 6(1)(b) und Art. 6(1)(f).
					<br />
					Rechtsgrundlage (deutsches Telekommunikations-/Datenschutzrecht): Section 25(2) no. 2 TDDDG für
					Speicherung/Zugriff, die für den vom Nutzer angeforderten Dienst strikt erforderlich ist.
				</p>
			</div>

			<div>
				<h4 className="font-medium text-zinc-200 mb-2 text-xs uppercase tracking-wider">
					Externe Ressourcen und Drittanbieter-Endpunkte
				</h4>
				<p className="text-zinc-500 break-words">
					Nutzercode kann externe Medien/Ressourcen laden. In diesen Fällen stellt dein Browser direkte Verbindungen zu
					externen Anbietern her und übermittelt technisch erforderliche Verbindungsdaten (einschließlich IP-Adresse).
					Diese Anbieter verarbeiten Daten in eigener Verantwortung.
				</p>
			</div>

			<div>
				<h4 className="font-medium text-zinc-200 mb-2 text-xs uppercase tracking-wider">Empfänger und Auftragsverarbeiter</h4>
				<p className="text-zinc-500 break-words">
					Wir nutzen Dienstleister für den Infrastrukturbetrieb (insbesondere Hosting). Soweit erforderlich, schließen wir
					Auftragsverarbeitungsverträge gemäß Art. 28 DSGVO.
				</p>
			</div>

			<div>
				<h4 className="font-medium text-zinc-200 mb-2 text-xs uppercase tracking-wider">Speicherfristen</h4>
				<p className="text-zinc-500 break-words">
					Wir speichern Daten nur so lange, wie es für den jeweiligen Zweck und gesetzliche Pflichten erforderlich ist:
				</p>
				<ul className="list-disc list-inside mt-2 text-zinc-500 space-y-1">
					<li>technische Log-Daten: begrenzte Aufbewahrung für Sicherheit und Betrieb</li>
					<li>Local-Storage-Daten: bis du sie im Browser löschst</li>
				</ul>
			</div>

			<div>
				<h4 className="font-medium text-zinc-200 mb-2 text-xs uppercase tracking-wider">Einwilligung zur Share-Link-Ausführung</h4>
				<p className="text-zinc-500 break-words">
					Bevor ungeprüfter geteilter Code ausgeführt werden kann, müssen Nutzer dies im Untrusted-Sketch-Dialog
					ausdrücklich bestätigen.
				</p>
			</div>

			<div>
				<h4 className="font-medium text-zinc-200 mb-2 text-xs uppercase tracking-wider">Deine Rechte nach DSGVO</h4>
				<p className="text-zinc-500 break-words">
					Du hast Rechte nach Art. 15-22 DSGVO, insbesondere Auskunft, Berichtigung, Löschung, Einschränkung,
					Datenübertragbarkeit und Widerspruch (Art. 21 DSGVO). Eine erteilte Einwilligung kannst du jederzeit mit Wirkung
					für die Zukunft widerrufen, soweit die Verarbeitung darauf beruht.
				</p>
				<p className="text-zinc-500 mt-2 break-words">
					Zur Ausübung deiner Rechte kontaktiere{' '}
					<a href="mailto:hello@textmode.art" className="text-emerald-400 hover:text-emerald-300 transition-colors">
						hello@textmode.art
					</a>
					.
				</p>
			</div>

			<div>
				<h4 className="font-medium text-zinc-200 mb-2 text-xs uppercase tracking-wider">Beschwerderecht</h4>
				<p className="text-zinc-500 break-words">
					Du hast das Recht, Beschwerde bei einer Aufsichtsbehörde einzulegen, insbesondere in dem Mitgliedstaat deines
					gewöhnlichen Aufenthalts, deines Arbeitsplatzes oder des Orts des mutmaßlichen Verstoßes.
				</p>
				<p className="text-zinc-500 mt-2 break-words">
					Zuständige Behörde für Köln, NRW:
					<br />
					<a
						href="https://www.ldi.nrw.de/"
						target="_blank"
						rel="noopener noreferrer"
						className="text-emerald-400 hover:text-emerald-300 transition-colors"
					>
						Landesbeauftragte für Datenschutz und Informationsfreiheit Nordrhein-Westfalen
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
				<p className="text-zinc-500">2026-02-24</p>
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
			description: 'Nutzungsregeln und Haftungsrahmen.',
		Content: TermsLegalContentDe,
	},
	privacy: {
		id: 'privacy',
		title: 'Datenschutzerklärung',
		navLabel: 'Datenschutz',
		path: '/privacy',
		description: 'Datenschutzinformationen nach DSGVO zu Verarbeitung und Betroffenenrechten.',
		Content: PrivacyLegalContentDe,
	},
};
