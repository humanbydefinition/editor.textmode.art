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
            const userUrl = submission.socialLinks?.[0] ? submission.socialLinks[0].url : null;

            const embed = new EmbedBuilder()
                .setColor(0x0099FF)
                .setTitle('A new gallery sketch submission has been received!')
                .setURL(sketchUrl)
                .setDescription(submission.description || 'No description provided.')
                .addFields(
                    { name: 'Title', value: submission.title, inline: true },
                    { name: 'Author', value: submission.authorName || 'Anonymous', inline: true },
                    { name: 'License', value: submission.license || 'None', inline: true },
                )
                .setTimestamp();

            if (userUrl) {
                embed.setAuthor({ name: submission.authorName || 'Author', url: userUrl });
            }

            await channel.send({ embeds: [embed] });
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
            socialLinks?: unknown;
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
            const author = sketch.authorName?.trim() ? escapeInlineMarkdown(sketch.authorName.trim()) : 'unknown';
            const description = sketch.description?.trim() ? sketch.description.trim() : null;
            const socialLinks = formatUnknownSocialLinks(sketch.socialLinks);
            const hasSocialLinks = socialLinks !== 'none';

            const lines = [
                '**A new entry has been approved and added to the gallery!**',
                sketchUrl,
                '',
                `**"${title}"**`,
                `by _${author}_`,
            ];

            if (description) {
                lines.push('', toQuotedBlock(description));
            }

            if (hasSocialLinks) {
                lines.push('', '**Links**', socialLinks);
            }

            const message = lines.join('\n');

            await channel.send({
                content: message,
                allowedMentions: { parse: [] },
            });
            console.log(`[Discord] Approval notification sent for sketch ${sketch.slug}`);
        } catch (error) {
            console.error('[Discord] Failed to send approval notification:', error);
        }
    }
}
