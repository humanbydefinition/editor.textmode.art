import { ScrollArea } from '@/shared/ui/scroll-area';
import { Github, ExternalLink } from 'lucide-react';
import { APP_META } from '@/shared/config/appMeta';
import discordIconMarkup from '@/shared/assets/discord.svg?raw';

export function AboutTab() {
	return (
		<ScrollArea className="h-full">
			<div className="p-6 space-y-6">
				<div className="rounded-xl overflow-hidden border border-white/10 bg-zinc-900/20">
					<div className="p-5 text-left space-y-2">
						<h2 className="text-xl font-bold text-white">{APP_META.name}</h2>
						<p className="text-sm text-zinc-400 max-w-[90%]">{APP_META.description}</p>
					</div>
					<div className="grid grid-cols-3 divide-x divide-white/5 border-t border-white/5 bg-zinc-900/40">
						<div className="p-3 text-center">
							<p className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1">Version</p>
							<p className="text-xs font-mono text-zinc-300">{APP_META.version}</p>
						</div>
						<div className="p-3 text-center">
							<p className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1">License</p>
							<a
								href={APP_META.urls.license}
								target="_blank"
								rel="noopener noreferrer"
								className="text-xs font-mono text-zinc-300 hover:text-white transition-colors"
							>
								{APP_META.licenseLabel}
							</a>
						</div>
						<div className="p-3 text-center">
							<p className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1">Created By</p>
							<div className="flex items-center justify-center gap-2">
								<img
									src={APP_META.author.avatarUrl}
									alt={APP_META.author.name}
									className="w-5 h-5 rounded-full border border-white/10"
								/>
								<a
									href={APP_META.author.profileUrl}
									target="_blank"
									rel="noopener noreferrer"
									className="text-xs font-medium text-zinc-300 hover:text-white transition-colors"
								>
									<span className="sm:hidden">{APP_META.author.shortName}</span>
									<span className="hidden sm:inline">{APP_META.author.name}</span>
								</a>
							</div>
						</div>
					</div>
				</div>

				{/* Social / Connect Section */}
				<div className="space-y-4">
					<h3 className="text-sm font-medium text-zinc-400 uppercase tracking-wider">Connect</h3>
					<div className="grid grid-cols-2 gap-3">
						<a
							href={APP_META.urls.discord}
							target="_blank"
							rel="noopener noreferrer"
							className="flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-zinc-900/30 border border-white/5 hover:bg-zinc-800/50 hover:border-white/10 transition-all group w-full"
						>
							<span
								aria-hidden="true"
								className="inline-flex w-4 h-4 fill-current text-zinc-500 group-hover:text-white shrink-0"
								dangerouslySetInnerHTML={{ __html: discordIconMarkup }}
							/>
							<span className="text-sm text-zinc-400 group-hover:text-white">discord</span>
						</a>
						<a
							href={APP_META.urls.repo}
							target="_blank"
							rel="noopener noreferrer"
							className="flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-zinc-900/30 border border-white/5 hover:bg-zinc-800/50 hover:border-white/10 transition-all group w-full"
						>
							<Github className="w-4 h-4 text-zinc-500 group-hover:text-white shrink-0" />
							<span className="text-sm text-zinc-400 group-hover:text-white">github</span>
						</a>
					</div>
				</div>

				<div className="space-y-4">
					<h3 className="text-sm font-medium text-zinc-400 uppercase tracking-wider">Resources</h3>
					<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
						{APP_META.resources.map((resource) => (
							<a
								key={resource.name}
								href={resource.url}
								target="_blank"
								rel="noopener noreferrer"
								className="flex flex-col p-3 rounded-lg bg-zinc-900/30 border border-white/5 hover:bg-zinc-800/50 hover:border-white/10 transition-all group"
							>
								<div className="flex items-center justify-between mb-2">
									<div className="flex items-center gap-2">
										<Github className="w-4 h-4 text-zinc-500 group-hover:text-white transition-colors" />
										<span className="text-sm font-medium text-zinc-300 group-hover:text-white">
											{resource.name}
										</span>
									</div>
									<ExternalLink className="w-3 h-3 text-zinc-600 group-hover:text-zinc-400" />
								</div>
								<div className="flex items-center justify-between gap-2">
									<span className="text-xs text-zinc-500 group-hover:text-zinc-400 truncate">
										{resource.description}
									</span>
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
