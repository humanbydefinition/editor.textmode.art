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
}
