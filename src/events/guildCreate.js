import { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from "discord.js";

export default {
    name: "guildCreate",
    once: false,

    async execute(guild) {
        const embed = new EmbedBuilder()
            .setTitle("Thanks for adding NightClaw!")
            .setDescription(
                `Hello! NightClaw has been added to **${guild.name}**.\n\n` +
                "Here's how to get started:"
            )
            .setColor(0x7289DA)
            .addFields(
                {
                    name: "1. Basic Setup",
                    value:
                        "`/setup log_channel` — Set where moderation logs are sent\n" +
                        "`/setup mod_role` — Set which role can use mod commands",
                    inline: false
                },
                {
                    name: "2. Community Features (optional)",
                    value:
                        "`/ticketpanel` — Post a support ticket button in a channel\n" +
                        "`/confessionsetup` — Post a confession panel in a channel\n" +
                        "`/banappeal-panel` — Post a ban appeal button (on your appeal server)",
                    inline: false
                },
                {
                    name: "3. Moderation",
                    value: "Use `/ban`, `/kick`, `/mute`, `/warn`, `/clear`, `/slowmode`, and `/sanction` to manage your server.",
                    inline: false
                },
                {
                    name: "Need help?",
                    value: "Visit the dashboard at **nightclaw.dev** or use `/help` in your server.",
                    inline: false
                }
            )
            .setFooter({ text: "nightclaw.dev" })
            .setTimestamp();

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setLabel("Open Dashboard")
                .setURL("https://nightclaw.dev")
                .setStyle(ButtonStyle.Link)
        );

        try {
            const owner = await guild.fetchOwner();
            await owner.send({ embeds: [embed], components: [row] });
        } catch {
            // Owner has DMs disabled — try posting to the system channel instead
            if (guild.systemChannel) {
                try {
                    await guild.systemChannel.send({ embeds: [embed], components: [row] });
                } catch {
                    // Silently fail if we can't reach either
                }
            }
        }
    }
};
