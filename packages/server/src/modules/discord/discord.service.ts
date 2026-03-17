import { Client, EmbedBuilder, Events, GatewayIntentBits, TextChannel } from 'discord.js';
import type { SketchRequestPayload } from '@synth.textmode.art/contracts/sketch';
import { env } from '../../config/env.js';

function escapeInlineMarkdown(value: string): string {
    return value.replace(/([\\`*_~|>])/g, '\\$1');
}

interface SocialLinkLike {
    label?: unknown;
    url?: unknown;
}

function formatUnknownSocialLinks(socialLinks: unknown): string {
    if (!Array.isArray(socialLinks) || socialLinks.length === 0) {
        return 'none';
    }

    const lines = socialLinks
        .map((entry) => {
            if (!entry || typeof entry !== 'object') {
                return null;
            }

            const { label, url } = entry as SocialLinkLike;
            if (typeof url !== 'string' || url.trim().length === 0) {
                return null;
            }

            const safeLabel = typeof label === 'string' && label.trim().length > 0
                ? escapeInlineMarkdown(label.trim())
                : 'Link';

            return `- **${safeLabel}:** <${url.trim()}>`;
        })
        .filter((line): line is string => line !== null);

    return lines.length > 0 ? lines.join('\n') : 'none';
}

function toQuotedBlock(value: string): string {
    return value
        .split(/\r?\n/)
        .map((line) => `> ${line}`)
        .join('\n');
}

export class DiscordService {
    private static instance: DiscordService;
    private client: Client;
    private isReady = false;

    private constructor() {
        this.client = new Client({
            intents: [GatewayIntentBits.Guilds],
        });

        this.client.once(Events.ClientReady, (c) => {
            console.log(`[Discord] Ready! Logged in as ${c.user.tag}`);
            this.isReady = true;
        });

        this.client.on(Events.Error, (error) => {
            console.error('[Discord] Client error:', error);
        });
    }

    public static getInstance(): DiscordService {
        if (!DiscordService.instance) {
            DiscordService.instance = new DiscordService();
        }
        return DiscordService.instance;
    }

    public async initialize(): Promise<void> {
        if (!env.DISCORD_BOT_TOKEN) {
            console.warn('[Discord] No bot token provided, skipping initialization.');
            return;
        }

        try {
            await this.client.login(env.DISCORD_BOT_TOKEN);
        } catch (error) {
            console.error('[Discord] Failed to login:', error);
        }
    }

    public async destroy(): Promise<void> {
        if (this.isReady) {
            await this.client.destroy();
            this.isReady = false;
        }
    }

    public async sendSubmissionNotification(submission: SketchRequestPayload, slug: string): Promise<void> {
        if (!this.isReady || !env.DISCORD_CHANNEL_ID) {
            return;
        }

        try {
            const channel = await this.client.channels.fetch(env.DISCORD_CHANNEL_ID);
            if (!channel || !(channel instanceof TextChannel)) {
                console.warn(`[Discord] Channel ${env.DISCORD_CHANNEL_ID} not found or is not a text channel.`);
                return;
            }

            const publicUrl = env.PUBLIC_BASE_URL || 'https://synth.textmode.art';
            const sketchUrl = `${publicUrl}/s/${slug}`;
            const title = escapeInlineMarkdown(submission.title);
            const author = submission.authorName?.trim()
                ? escapeInlineMarkdown(submission.authorName.trim())
                : 'anonymous';
            const description = submission.description?.trim() || null;
            const license = submission.license?.trim() || null;
            const socialLinks = formatUnknownSocialLinks(submission.socialLinks);
            const hasSocialLinks = socialLinks !== 'none';

            const lines: (string | null)[] = [
                `## ${title}`,
                description ? toQuotedBlock(description) : null,
                '',
                `**Author:** ${author}`,
                license ? `**License:** ${escapeInlineMarkdown(license)}` : null,
            ];

            if (hasSocialLinks) {
                lines.push('', '**Links**', socialLinks);
            }

            const embed = new EmbedBuilder()
                .setColor(0x5865f2)
                .setTitle('New gallery submission')
                .setURL(sketchUrl)
                .setDescription(lines.filter((line) => line !== null).join('\n'))
                .setTimestamp()
                .setFooter({ text: 'synth.textmode.art' });

            await channel.send({ embeds: [embed], allowedMentions: { parse: [] } });
            console.log(`[Discord] Notification sent for sketch ${slug}`);
        } catch (error) {
            console.error('[Discord] Failed to send notification:', error);
        }
    }

    public async sendApprovalNotification(
        sketch: {
            slug: string;
            title: string;
            description?: string | null;
            authorName?: string | null;
            license?: string | null;
            socialLinks?: unknown;
            ogImageUrl?: string | null;
        },
        publicUrlOverride?: string
    ): Promise<void> {
        if (!this.isReady || !env.DISCORD_APPROVED_CHANNEL_ID) {
            return;
        }

        try {
            const channel = await this.client.channels.fetch(env.DISCORD_APPROVED_CHANNEL_ID);
            if (!channel || !(channel instanceof TextChannel)) {
                console.warn(`[Discord] Channel ${env.DISCORD_APPROVED_CHANNEL_ID} not found or is not a text channel.`);
                return;
            }

            const publicUrl = publicUrlOverride || env.PUBLIC_BASE_URL || 'https://synth.textmode.art';
            const sketchUrl = `${publicUrl}/s/${sketch.slug}`;
            const title = escapeInlineMarkdown(sketch.title);
            const author = sketch.authorName?.trim() ? escapeInlineMarkdown(sketch.authorName.trim()) : 'anonymous';
            const description = sketch.description?.trim() || null;
            const socialLinks = formatUnknownSocialLinks(sketch.socialLinks);
            const hasSocialLinks = socialLinks !== 'none';

            const lines: (string | null)[] = [
                `## ${title}`,
                description ? toQuotedBlock(description) : null,
                '',
                `**Author:** ${author}`,
                sketch.license?.trim() ? `**License:** ${escapeInlineMarkdown(sketch.license.trim())}` : null,
            ];

            if (hasSocialLinks) {
                lines.push('', '**Links**', socialLinks);
            }

            const embed = new EmbedBuilder()
                .setColor(0x57f287)
                .setTitle('New gallery submission approved!')
                .setURL(sketchUrl)
                .setDescription(lines.filter((line) => line !== null).join('\n'))
                .setTimestamp()
                .setFooter({ text: 'synth.textmode.art' });

            if (sketch.ogImageUrl) {
                embed.setImage(sketch.ogImageUrl);
            }

            await channel.send({ embeds: [embed], allowedMentions: { parse: [] } });
            console.log(`[Discord] Approval notification sent for sketch ${sketch.slug}`);
        } catch (error) {
            console.error('[Discord] Failed to send approval notification:', error);
        }
    }
}
