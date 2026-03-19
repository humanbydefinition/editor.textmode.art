import type { FastifyPluginAsync } from 'fastify';
import fastifyPlugin from 'fastify-plugin';
import { DiscordService } from '../modules/discord/discord.service.js';

const discordPlugin: FastifyPluginAsync = async (app) => {
    const discordService = DiscordService.getInstance();

    try {
        await discordService.initialize();
    } catch (error) {
        app.log.error(error, '[Discord] Setup failed');
    }

    app.addHook('onClose', async () => {
        await discordService.destroy();
    });
};

export default fastifyPlugin(discordPlugin);
