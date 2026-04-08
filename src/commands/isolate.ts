import {
    SlashCommandBuilder,
    PermissionFlagsBits,
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ChatInputCommandInteraction,
    GuildMember,
    TextChannel,
    OverwriteResolvable,
    ChannelType,
    NonThreadGuildBasedChannel,
    MessageFlags
} from "discord.js";
import { getServerSettings, hasModeratorRole } from '../utils/serverSettings.js';
import { t } from '../utils/i18n.js';
import sql from '../db.js';
import type { Command } from '../types/index.js';

export default {
    data: new SlashCommandBuilder()
        .setName("isolate")
        .setDescription("Quarantine a member in a private moderation channel")
        .addUserOption(option =>
            option.setName("member")
                  .setDescription("Member to isolate")
                  .setRequired(true)
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

    async execute(interaction: ChatInputCommandInteraction): Promise<void> {
        const member = interaction.options.getMember("member") as GuildMember;
        const guild = interaction.guild!;
        const guildId = guild.id;

        const settings = await getServerSettings(guildId);
        const lang = settings.language || 'en';

        const hasPerms = await hasModeratorRole(interaction.member as GuildMember, guildId);
        if (!hasPerms) {
            return void interaction.reply({ content: t('isolate_no_permission', lang), flags: MessageFlags.Ephemeral });
        }

        if (!member.moderatable) {
            return void interaction.reply({ content: t('isolate_cannot_isolate', lang), flags: MessageFlags.Ephemeral });
        }

        const existing = await sql`
            SELECT 1 FROM isolated_users WHERE guild_id = ${guildId} AND user_id = ${member.user.id}
        `;
        if (existing.length > 0) {
            return void interaction.reply({ content: t('isolate_already_isolated', lang), flags: MessageFlags.Ephemeral });
        }

        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

        try {
            // Apply deny overwrites — optimized: categories + root channels + de-synced channels
            // Threads are excluded as they don't have permissionOverwrites
            const channels = [...guild.channels.cache.values()].filter(
                (c): c is NonThreadGuildBasedChannel => !c.isThread()
            );
            const toRestrict = channels.filter(c => {
                if (c.type === ChannelType.GuildCategory) return true;
                if (!c.parent) return true; // root-level channel
                return !c.permissionsLocked; // de-synced from category
            });

            await Promise.all(
                toRestrict.map(c =>
                    c.permissionOverwrites.edit(member.user.id, { ViewChannel: false }).catch(() => {})
                )
            );

            // Find category to place isolation channel (use ticket panel channel's category)
            const panelChannelId = settings.ticket_panel_channel_id;
            const panelChannel = panelChannelId ? guild.channels.cache.get(panelChannelId) : null;
            const category = panelChannel?.parent ?? null;

            const permissionOverwrites: OverwriteResolvable[] = [
                { id: guild.id, deny: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] },
                {
                    id: member.user.id,
                    allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages],
                    deny: [PermissionFlagsBits.ManageChannels]
                },
                {
                    id: guild.members.me!.id,
                    allow: [
                        PermissionFlagsBits.ViewChannel,
                        PermissionFlagsBits.SendMessages,
                        PermissionFlagsBits.ManageChannels,
                        PermissionFlagsBits.ReadMessageHistory
                    ]
                }
            ];

            if (settings.mod_role_id) {
                permissionOverwrites.push({
                    id: settings.mod_role_id,
                    allow: [
                        PermissionFlagsBits.ViewChannel,
                        PermissionFlagsBits.SendMessages,
                        PermissionFlagsBits.ManageChannels
                    ]
                });
            }

            const isolationChannel = await guild.channels.create({
                name: `isolated-${member.user.username}`.toLowerCase(),
                type: ChannelType.GuildText,
                parent: category?.id ?? null,
                permissionOverwrites
            }) as TextChannel;

            await sql`
                INSERT INTO isolated_users (guild_id, user_id, channel_id, moderator_id)
                VALUES (${guildId}, ${member.user.id}, ${isolationChannel.id}, ${interaction.user.id})
            `;

            const embed = new EmbedBuilder()
                .setTitle(t('isolate_embed_title', lang, { username: member.user.username }))
                .setDescription(t('isolate_embed_desc', lang))
                .addFields(
                    { name: t('field_user', lang), value: `${member.user} (${member.user.id})`, inline: true },
                    { name: t('field_moderator', lang), value: `${interaction.user}`, inline: true }
                )
                .setColor(0xFF6600)
                .setTimestamp();

            const endRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
                new ButtonBuilder()
                    .setCustomId('isolate_end')
                    .setLabel(t('isolate_btn_end', lang))
                    .setStyle(ButtonStyle.Success)
            );

            await isolationChannel.send({ embeds: [embed], components: [endRow] });

            if (settings.mod_role_id) {
                await isolationChannel.send(`<@&${settings.mod_role_id}>`);
            }

            await interaction.editReply({
                content: t('isolate_success', lang, { tag: member.user.tag, channel: isolationChannel.toString() })
            });

        } catch (error) {
            console.error(error);
            await interaction.editReply({ content: t('isolate_failed', lang) });
        }
    }
} satisfies Command;
