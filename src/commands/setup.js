import { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } from "discord.js";
import sql from '../db.js';

export default {
    data: new SlashCommandBuilder()
        .setName("setup")
        .setDescription("Configure server settings for the bot")
        .addChannelOption(option =>
            option.setName("log_channel")
                  .setDescription("Channel for moderation logs")
                  .setRequired(false)
        )
        .addRoleOption(option =>
            option.setName("mod_role")
                  .setDescription("Role that can use moderation commands")
                  .setRequired(false)
        )
        .addChannelOption(option =>
            option.setName("confession_channel")
                  .setDescription("Channel where confessions will be posted")
                  .setRequired(false)
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction) {
        const logChannel = interaction.options.getChannel("log_channel");
        const modRole = interaction.options.getRole("mod_role");
        const confessionChannel = interaction.options.getChannel("confession_channel");

        // If no options provided, show current settings
        if (!logChannel && !modRole && !confessionChannel) {
            try {
                const settings = await sql`
                    SELECT * FROM server_settings WHERE guild_id = ${interaction.guild.id}
                `;

                const embed = new EmbedBuilder()
                    .setTitle("🔧 Server Settings")
                    .setColor(0x7289DA)
                    .setTimestamp();

                if (settings.length === 0) {
                    embed.setDescription("❌ No server settings configured yet. Use `/setup` with options to configure.");
                } else {
                    const setting = settings[0];
                    let description = "**Current Configuration:**\n\n";
                    
                    if (setting.log_channel_id) {
                        description += `📋 **Log Channel:** <#${setting.log_channel_id}>\n`;
                    } else {
                        description += `📋 **Log Channel:** Not set\n`;
                    }

                    if (setting.mod_role_id) {
                        description += `👮 **Moderator Role:** <@&${setting.mod_role_id}>\n`;
                    } else {
                        description += `👮 **Moderator Role:** Not set\n`;
                    }

                    if (setting.confession_channel_id) {
                        description += `💭 **Confession Channel:** <#${setting.confession_channel_id}>\n`;
                    } else {
                        description += `💭 **Confession Channel:** Not set\n`;
                    }

                    embed.setDescription(description);
                    embed.setFooter({ text: `Last updated: ${new Date(setting.updated_at).toLocaleString()}` });
                }

                return interaction.reply({ embeds: [embed], ephemeral: true });

            } catch (error) {
                console.error('Setup Command Error:', error);
                return interaction.reply({ 
                    content: "❌ Failed to retrieve server settings.", 
                    ephemeral: true 
                });
            }
        }

        try {
            // Update or insert server settings
            const updateFields = [];
            const updateValues = {};
            
            if (logChannel) {
                updateFields.push("log_channel_id = ${logChannelId}");
                updateValues.logChannelId = logChannel.id;
            }
            
            if (modRole) {
                updateFields.push("mod_role_id = ${modRoleId}");
                updateValues.modRoleId = modRole.id;
            }
            
            if (confessionChannel) {
                updateFields.push("confession_channel_id = ${confessionChannelId}");
                updateValues.confessionChannelId = confessionChannel.id;
            }

            // Use PostgreSQL UPSERT (INSERT ... ON CONFLICT)
            let query;
            const values = { ...updateValues, guildId: interaction.guild.id };

            if (logChannel && modRole && confessionChannel) {
                query = sql`
                    INSERT INTO server_settings (guild_id, log_channel_id, mod_role_id, confession_channel_id, updated_at)
                    VALUES (${values.guildId}, ${values.logChannelId}, ${values.modRoleId}, ${values.confessionChannelId}, NOW())
                    ON CONFLICT (guild_id) DO UPDATE SET 
                        log_channel_id = ${values.logChannelId},
                        mod_role_id = ${values.modRoleId}, 
                        confession_channel_id = ${values.confessionChannelId},
                        updated_at = NOW()
                `;
            } else {
                // Partial update - get existing settings first
                const existing = await sql`
                    SELECT * FROM server_settings WHERE guild_id = ${interaction.guild.id}
                `;

                const currentLogChannel = logChannel?.id || (existing[0]?.log_channel_id || null);
                const currentModRole = modRole?.id || (existing[0]?.mod_role_id || null);
                const currentConfessionChannel = confessionChannel?.id || (existing[0]?.confession_channel_id || null);

                query = sql`
                    INSERT INTO server_settings (guild_id, log_channel_id, mod_role_id, confession_channel_id, updated_at)
                    VALUES (${interaction.guild.id}, ${currentLogChannel}, ${currentModRole}, ${currentConfessionChannel}, NOW())
                    ON CONFLICT (guild_id) DO UPDATE SET 
                        log_channel_id = ${currentLogChannel},
                        mod_role_id = ${currentModRole},
                        confession_channel_id = ${currentConfessionChannel},
                        updated_at = NOW()
                `;
            }

            await query;

            // Create success embed
            const embed = new EmbedBuilder()
                .setTitle("✅ Server Settings Updated")
                .setColor(0x51CF66)
                .setTimestamp();

            let description = "**Updated Settings:**\n\n";
            
            if (logChannel) {
                description += `📋 **Log Channel:** ${logChannel}\n`;
            }
            
            if (modRole) {
                description += `👮 **Moderator Role:** ${modRole}\n`;
            }
            
            if (confessionChannel) {
                description += `💭 **Confession Channel:** ${confessionChannel}\n`;
            }

            embed.setDescription(description);

            await interaction.reply({ embeds: [embed], ephemeral: true });

        } catch (error) {
            console.error('Setup Command Error:', error);
            return interaction.reply({ 
                content: "❌ Failed to update server settings.", 
                ephemeral: true 
            });
        }
    }
};