import { Client, Events, GatewayIntentBits, EmbedBuilder, TextChannel } from 'discord.js';
import type { SketchRequestPayload } from '@synth.textmode.art/contracts/sketch';
import { env } from '../../config/env.js';

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
                .setTitle('New Sketch Submitted!')
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

    public async sendApprovalNotification(sketch: { slug: string; title: string; description: string | null; authorName: string | null; socialLinks: any }, publicUrlOverride?: string): Promise<void> {
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

            // Extract URL from socialLinks if it exists (Prisma JSON type)
            let userUrl: string | null = null;
            if (Array.isArray(sketch.socialLinks) && sketch.socialLinks.length > 0) {
                const firstLink = sketch.socialLinks[0];
                if (typeof firstLink === 'object' && firstLink !== null && 'url' in firstLink) {
                    userUrl = (firstLink as any).url;
                }
            }

            const embed = new EmbedBuilder()
                .setColor(0x00FF00) // Green for approved
                .setTitle('✨ New Sketch Approved! ✨')
                .setURL(sketchUrl)
                .setDescription(sketch.description || 'No description provided.')
                .addFields(
                    { name: 'Title', value: sketch.title, inline: true },
                    { name: 'Author', value: sketch.authorName || 'Anonymous', inline: true },
                )
                .setTimestamp();

            if (userUrl) {
                embed.setAuthor({ name: sketch.authorName || 'Author', url: userUrl });
            }

            // If there's an OG image (preview), we could add it but we might not have the URL handy if it was just generated. 
            // The admin route triggers generation *after* approval usually, or in parallel. 
            // For now, simple notification.

            await channel.send({ embeds: [embed] });
            console.log(`[Discord] Approval notification sent for sketch ${sketch.slug}`);
        } catch (error) {
            console.error('[Discord] Failed to send approval notification:', error);
        }
    }
}
