import { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, ChatInputCommandInteraction, MessageFlags } from "discord.js";
import sql from '../db.js';
import { clearServerSettingsCache } from '../utils/serverSettings.js';
import { t } from '../utils/i18n.js';
import type { Command } from '../types/index.js';

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
        .addStringOption(option =>
            option.setName("language")
                  .setDescription("Bot language for this server")
                  .setRequired(false)
                  .addChoices(
                      { name: 'English', value: 'en' },
                      { name: 'French', value: 'fr' }
                  )
        )
        .addStringOption(option =>
            option.setName("source_guild")
                  .setDescription("Guild ID of the main server (set on appeal server)")
                  .setRequired(false)
        )
        .addStringOption(option =>
            option.setName("appeal_invite")
                  .setDescription("Invite URL for the appeal server (set on main server, included in ban DMs)")
                  .setRequired(false)
        )
        .addStringOption(option =>
            option.setName("main_invite")
                  .setDescription("Permanent invite URL for the main server (set on appeal server, sent when appeal is accepted)")
                  .setRequired(false)
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction: ChatInputCommandInteraction): Promise<void> {
        const logChannel = interaction.options.getChannel("log_channel");
        const modRole = interaction.options.getRole("mod_role");
        const languageOption = interaction.options.getString("language");
        const sourceGuildOption = interaction.options.getString("source_guild");
        const appealInviteOption = interaction.options.getString("appeal_invite");
        const mainInviteOption = interaction.options.getString("main_invite");

        let existing: Record<string, string> = {};
        try {
            const rows = await sql`SELECT * FROM server_settings WHERE guild_id = ${interaction.guild!.id}`;
            existing = rows[0] || {};
        } catch (error) {
            console.error('Setup Command Error:', error);
        }

        const currentLang = (existing.language as 'en' | 'fr') || 'en';

        if (!logChannel && !modRole && !languageOption && !sourceGuildOption && !appealInviteOption && !mainInviteOption) {
            const lang = currentLang;
            const embed = new EmbedBuilder()
                .setTitle(t('setup_title_view', lang))
                .setColor(0x7289DA)
                .setTimestamp();

            if (!existing.guild_id) {
                embed.setDescription(t('setup_no_settings', lang));
            } else {
                let description = t('setup_current_config', lang);

                description += existing.log_channel_id
                    ? t('setup_log_channel', lang, { id: existing.log_channel_id }) + '\n'
                    : t('setup_log_channel_none', lang) + '\n';

                description += existing.mod_role_id
                    ? t('setup_mod_role', lang, { id: existing.mod_role_id }) + '\n'
                    : t('setup_mod_role_none', lang) + '\n';

                description += t('setup_language', lang) + '\n';

                description += existing.source_guild_id
                    ? t('setup_source_guild', lang, { id: existing.source_guild_id }) + '\n'
                    : t('setup_source_guild_none', lang) + '\n';

                description += existing.appeal_invite_url
                    ? t('setup_appeal_invite', lang, { url: existing.appeal_invite_url }) + '\n'
                    : t('setup_appeal_invite_none', lang) + '\n';

                description += existing.main_invite_url
                    ? t('setup_main_invite', lang, { url: existing.main_invite_url }) + '\n'
                    : t('setup_main_invite_none', lang) + '\n';

                embed.setDescription(description);
                embed.setFooter({ text: t('setup_footer_updated', lang, { date: new Date(existing.updated_at).toLocaleString() }) });
            }

            return void interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
        }

        const newLang = (languageOption as 'en' | 'fr') || currentLang;

        try {
            const mergedLogChannel = logChannel?.id || existing.log_channel_id || null;
            const mergedModRole = modRole?.id || existing.mod_role_id || null;
            const mergedLanguage = languageOption || currentLang;
            const mergedSourceGuild = sourceGuildOption !== null ? sourceGuildOption : (existing.source_guild_id || null);
            const mergedAppealInvite = appealInviteOption !== null ? appealInviteOption : (existing.appeal_invite_url || null);
            const mergedMainInvite = mainInviteOption !== null ? mainInviteOption : (existing.main_invite_url || null);

            await sql`
                INSERT INTO server_settings (guild_id, log_channel_id, mod_role_id, language, source_guild_id, appeal_invite_url, main_invite_url, updated_at)
                VALUES (${interaction.guild!.id}, ${mergedLogChannel}, ${mergedModRole}, ${mergedLanguage}, ${mergedSourceGuild}, ${mergedAppealInvite}, ${mergedMainInvite}, NOW())
                ON CONFLICT (guild_id) DO UPDATE SET
                    log_channel_id = ${mergedLogChannel},
                    mod_role_id = ${mergedModRole},
                    language = ${mergedLanguage},
                    source_guild_id = ${mergedSourceGuild},
                    appeal_invite_url = ${mergedAppealInvite},
                    main_invite_url = ${mergedMainInvite},
                    updated_at = NOW()
            `;

            clearServerSettingsCache(interaction.guild!.id);

            const embed = new EmbedBuilder()
                .setTitle(t('setup_title_updated', newLang))
                .setColor(0x51CF66)
                .setTimestamp();

            let description = t('setup_updated_config', newLang);

            if (logChannel) description += t('setup_updated_log_channel', newLang, { channel: logChannel.toString() }) + '\n';
            if (modRole) description += t('setup_updated_mod_role', newLang, { role: modRole.toString() }) + '\n';
            if (languageOption) description += t('setup_updated_language', newLang) + '\n';
            if (sourceGuildOption) description += t('setup_updated_source_guild', newLang, { id: sourceGuildOption }) + '\n';
            if (appealInviteOption) description += t('setup_updated_appeal_invite', newLang, { url: appealInviteOption }) + '\n';
            if (mainInviteOption) description += t('setup_updated_main_invite', newLang, { url: mainInviteOption }) + '\n';

            embed.setDescription(description);

            return void interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });

        } catch (error) {
            console.error('Setup Command Error:', error);
            return void interaction.reply({ content: t('setup_failed_update', newLang), flags: MessageFlags.Ephemeral });
        }
    }
} satisfies Command;
