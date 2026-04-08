import {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    EmbedBuilder,
    ChannelType,
    PermissionFlagsBits,
    ButtonInteraction,
    ModalSubmitInteraction,
    TextChannel,
    MessageFlags
} from "discord.js";
import sql from '../db.js';
import { getServerSettings, hasModeratorRole } from './serverSettings.js';
import { t } from './i18n.js';

export async function handleAppealButton(interaction: ButtonInteraction): Promise<void> {
    const { customId } = interaction;

    if (customId === 'appeal_open') {
        const settings = await getServerSettings(interaction.guild!.id);
        const lang = settings.language || 'en';

        const [existingAppeal] = await sql`
            SELECT id FROM ban_appeals WHERE user_id = ${interaction.user.id} AND appeal_guild_id = ${interaction.guild!.id} AND status = 'open'
        `;
        if (existingAppeal) {
            return void interaction.reply({ content: t('appeal_already_open', lang), flags: MessageFlags.Ephemeral });
        }

        const [cooldownAppeal] = await sql`
            SELECT cooldown_until FROM ban_appeals
            WHERE user_id = ${interaction.user.id} AND appeal_guild_id = ${interaction.guild!.id}
              AND status = 'refused' AND cooldown_until > NOW()
            ORDER BY updated_at DESC LIMIT 1
        `;
        if (cooldownAppeal) {
            const until = `<t:${Math.floor(new Date(cooldownAppeal.cooldown_until).getTime() / 1000)}:F>`;
            return void interaction.reply({ content: t('appeal_on_cooldown', lang, { date: until }), flags: MessageFlags.Ephemeral });
        }

        const modal = new ModalBuilder()
            .setCustomId('appeal_reason_modal')
            .setTitle(t('appeal_modal_title', lang));

        const reasonInput = new TextInputBuilder()
            .setCustomId('appeal_reason')
            .setLabel(t('appeal_reason_label', lang))
            .setStyle(TextInputStyle.Paragraph)
            .setPlaceholder(t('appeal_reason_placeholder', lang))
            .setRequired(true);

        modal.addComponents(new ActionRowBuilder<TextInputBuilder>().addComponents(reasonInput));
        await interaction.showModal(modal);

    } else if (customId === 'appeal_accept') {
        const settings = await getServerSettings(interaction.guild!.id);
        const lang = settings.language || 'en';

        const hasPerm = await hasModeratorRole(interaction.member as any, interaction.guild!.id);
        if (!hasPerm) {
            return void interaction.reply({ content: t('appeal_no_permission', lang), flags: MessageFlags.Ephemeral });
        }

        const modal = new ModalBuilder()
            .setCustomId('appeal_accept_modal')
            .setTitle(t('appeal_accept_modal_title', lang));

        const reasonInput = new TextInputBuilder()
            .setCustomId('appeal_accept_reason')
            .setLabel(t('appeal_accept_reason_label', lang))
            .setStyle(TextInputStyle.Paragraph)
            .setRequired(true);

        modal.addComponents(new ActionRowBuilder<TextInputBuilder>().addComponents(reasonInput));
        await interaction.showModal(modal);

    } else if (customId === 'appeal_close') {
        const settings = await getServerSettings(interaction.guild!.id);
        const lang = settings.language || 'en';

        const hasPerm = await hasModeratorRole(interaction.member as any, interaction.guild!.id);
        if (!hasPerm) {
            return void interaction.reply({ content: t('appeal_no_permission', lang), flags: MessageFlags.Ephemeral });
        }

        await interaction.reply({ content: '🗑️ Closing appeal...', flags: MessageFlags.Ephemeral });
        await (interaction.channel as TextChannel).delete();

    } else if (customId === 'appeal_refuse') {
        const settings = await getServerSettings(interaction.guild!.id);
        const lang = settings.language || 'en';

        const hasPerm = await hasModeratorRole(interaction.member as any, interaction.guild!.id);
        if (!hasPerm) {
            return void interaction.reply({ content: t('appeal_no_permission', lang), flags: MessageFlags.Ephemeral });
        }

        const cooldownRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
            new ButtonBuilder().setCustomId('appeal_refuse_3d').setLabel(t('appeal_cooldown_3d', lang)).setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId('appeal_refuse_1w').setLabel(t('appeal_cooldown_1w', lang)).setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId('appeal_refuse_2w').setLabel(t('appeal_cooldown_2w', lang)).setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId('appeal_refuse_1m').setLabel(t('appeal_cooldown_1m', lang)).setStyle(ButtonStyle.Danger)
        );

        await interaction.reply({ content: t('appeal_cooldown_select', lang), components: [cooldownRow], flags: MessageFlags.Ephemeral });

    } else if (customId.startsWith('appeal_refuse_')) {
        const settings = await getServerSettings(interaction.guild!.id);
        const lang = settings.language || 'en';

        const cooldownMap: Record<string, number> = { appeal_refuse_3d: 3, appeal_refuse_1w: 7, appeal_refuse_2w: 14, appeal_refuse_1m: 30 };
        const cooldownDays = cooldownMap[customId] ?? 0;

        await refuseAppeal(interaction, cooldownDays);
    }
}

export async function handleAppealModal(interaction: ModalSubmitInteraction): Promise<void> {
    if (interaction.customId === 'appeal_reason_modal') {
        await openAppeal(interaction);
    } else if (interaction.customId === 'appeal_accept_modal') {
        await acceptAppeal(interaction);
    }
}

async function openAppeal(interaction: ModalSubmitInteraction): Promise<void> {
    const appealReason = interaction.fields.getTextInputValue('appeal_reason');
    const user = interaction.user;
    const guild = interaction.guild!;

    const settings = await getServerSettings(guild.id);
    const lang = settings.language || 'en';

    if (!settings.source_guild_id) {
        return void interaction.reply({ content: t('appeal_no_source_guild', lang), flags: MessageFlags.Ephemeral });
    }

    const [banLog] = await sql`
        SELECT * FROM mod_logs
        WHERE target_id = ${user.id} AND guild_id = ${settings.source_guild_id} AND action = 'ban'
        ORDER BY created_at DESC LIMIT 1
    `;

    if (!banLog) {
        return void interaction.reply({ content: t('appeal_no_ban_found', lang), flags: MessageFlags.Ephemeral });
    }

    let category = guild.channels.cache.find(c => c.name === 'Ban Appeals 🔨' && c.type === ChannelType.GuildCategory);
    if (!category) {
        category = await guild.channels.create({
            name: 'Ban Appeals 🔨',
            type: ChannelType.GuildCategory
        });
    }

    const permissionOverwrites = [
        { id: guild.id, deny: [PermissionFlagsBits.ViewChannel] },
        { id: user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages], deny: [PermissionFlagsBits.ManageChannels] }
    ];

    if (settings.mod_role_id) {
        permissionOverwrites.push({
            id: settings.mod_role_id,
            allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ManageChannels]
        } as any);
    }

    const safeName = user.username.toLowerCase().replace(/[^a-z0-9]/g, '-').slice(0, 20);
    const appealChannel = await guild.channels.create({
        name: `appeal-${safeName}`,
        type: ChannelType.GuildText,
        parent: category.id,
        permissionOverwrites
    }) as TextChannel;

    const banReason = banLog.reason || t('no_reason', lang);

    const embed = new EmbedBuilder()
        .setTitle(t('appeal_embed_title', lang, { tag: user.tag }))
        .addFields(
            { name: t('field_user', lang), value: `${user} (${user.id})`, inline: true },
            { name: t('appeal_field_ban_reason', lang), value: banReason, inline: false },
            { name: t('appeal_field_appeal_reason', lang), value: appealReason, inline: false },
            { name: t('appeal_field_status', lang), value: t('appeal_status_open', lang), inline: true }
        )
        .setColor(0xFFAA00)
        .setTimestamp();

    const actionRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
            .setCustomId('appeal_accept')
            .setLabel(t('appeal_btn_accept', lang))
            .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
            .setCustomId('appeal_refuse')
            .setLabel(t('appeal_btn_refuse', lang))
            .setStyle(ButtonStyle.Danger)
    );

    const message = await appealChannel.send({ embeds: [embed], components: [actionRow] });

    if (settings.mod_role_id) {
        await appealChannel.send(`<@&${settings.mod_role_id}>`);
    }

    await sql`
        INSERT INTO ban_appeals (user_id, appeal_guild_id, source_guild_id, appeal_reason, ban_reason, status, channel_id, message_id)
        VALUES (${user.id}, ${guild.id}, ${settings.source_guild_id}, ${appealReason}, ${banReason}, 'open', ${appealChannel.id}, ${message.id})
    `;

    await interaction.reply({ content: t('appeal_created', lang, { channel: appealChannel.toString() }), flags: MessageFlags.Ephemeral });
}

async function acceptAppeal(interaction: ModalSubmitInteraction): Promise<void> {
    const decisionReason = interaction.fields.getTextInputValue('appeal_accept_reason');
    const staff = interaction.user;
    const guild = interaction.guild!;

    const settings = await getServerSettings(guild.id);
    const lang = settings.language || 'en';

    const [existingAppeal] = await sql`
        SELECT id FROM ban_appeals WHERE channel_id = ${interaction.channel!.id} AND status = 'open'
    `;

    if (!existingAppeal) {
        return void interaction.reply({ content: t('appeal_not_found', lang), flags: MessageFlags.Ephemeral });
    }

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    // Atomically claim the appeal — only one concurrent call wins
    const [appeal] = await sql`
        UPDATE ban_appeals
        SET status = 'accepted', reviewed_by = ${staff.id}, decision_reason = ${decisionReason}, updated_at = NOW()
        WHERE channel_id = ${interaction.channel!.id} AND status = 'open'
        RETURNING *
    `;

    if (!appeal) {
        return void interaction.editReply({ content: t('appeal_not_found', lang) });
    }

    let sourceGuild;
    try {
        sourceGuild = await interaction.client.guilds.fetch(appeal.source_guild_id);
    } catch {
        sourceGuild = null;
    }

    if (sourceGuild) {
        try {
            await sourceGuild.bans.remove(appeal.user_id, decisionReason);
        } catch (err: any) {
            await (interaction.channel as TextChannel).send(t('appeal_unban_failed', lang, { error: err.message }));
        }
    }

    const invite = settings.main_invite_url || null;

    try {
        const originalMessage = await (interaction.channel as TextChannel).messages.fetch(appeal.message_id);
        const updatedEmbed = EmbedBuilder.from(originalMessage.embeds[0])
            .setColor(0x57F287)
            .spliceFields(
                originalMessage.embeds[0].fields.findIndex(f => f.name.includes('Status') || f.name.includes('Statut')),
                1,
                { name: originalMessage.embeds[0].fields.find(f => f.name.includes('Status') || f.name.includes('Statut'))?.name || t('appeal_field_status', lang), value: t('appeal_status_accepted', lang), inline: true },
                { name: t('field_moderator', lang), value: `${staff.tag}`, inline: true },
                { name: t('field_reason', lang), value: decisionReason, inline: false }
            );
        await originalMessage.edit({ embeds: [updatedEmbed], components: [] });
    } catch {
        // message may have been deleted
    }

    const closeRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
            .setCustomId('appeal_close')
            .setLabel(t('appeal_btn_close', lang))
            .setStyle(ButtonStyle.Secondary)
    );

    const inviteStr = invite ?? '(invite creation failed)';
    await (interaction.channel as TextChannel).send({ content: t('appeal_accepted_msg', lang, { invite: inviteStr }), components: [closeRow] });

    if (sourceGuild) {
        const sourceSettings = await getServerSettings(appeal.source_guild_id);
        if (sourceSettings.log_channel_id) {
            try {
                const logChannel = sourceGuild.channels.cache.get(sourceSettings.log_channel_id);
                if (logChannel?.isTextBased()) {
                    const logEmbed = new EmbedBuilder()
                        .setTitle(t('appeal_log_accepted_title', sourceSettings.language || 'en'))
                        .addFields(
                            { name: t('field_user', sourceSettings.language || 'en'), value: `<@${appeal.user_id}> (${appeal.user_id})`, inline: true },
                            { name: t('field_moderator', sourceSettings.language || 'en'), value: `${staff.tag}`, inline: true },
                            { name: t('field_reason', sourceSettings.language || 'en'), value: decisionReason, inline: false }
                        )
                        .setColor(0x57F287)
                        .setTimestamp();
                    await logChannel.send({ embeds: [logEmbed] });
                }
            } catch {
                // log channel may be inaccessible
            }
        }
    }

    await interaction.editReply({ content: '✅ Appeal accepted.' });
}

async function refuseAppeal(interaction: ButtonInteraction, cooldownDays: number = 0): Promise<void> {
    const staff = interaction.user;
    const guild = interaction.guild!;

    const settings = await getServerSettings(guild.id);
    const lang = settings.language || 'en';

    const [appeal] = await sql`
        SELECT * FROM ban_appeals WHERE channel_id = ${interaction.channel!.id} AND status = 'open'
    `;

    if (!appeal) {
        return void interaction.reply({ content: t('appeal_not_found', lang), flags: MessageFlags.Ephemeral });
    }

    await interaction.deferUpdate();

    const cooldownUntil = cooldownDays > 0
        ? new Date(Date.now() + cooldownDays * 24 * 60 * 60 * 1000)
        : null;

    await sql`
        UPDATE ban_appeals SET status = 'refused', reviewed_by = ${staff.id}, cooldown_until = ${cooldownUntil}, updated_at = NOW()
        WHERE channel_id = ${interaction.channel!.id}
    `;

    try {
        const originalMessage = await (interaction.channel as TextChannel).messages.fetch(appeal.message_id);
        const statusFieldIndex = originalMessage.embeds[0].fields.findIndex(f => f.name.includes('Status') || f.name.includes('Statut'));
        const updatedEmbed = EmbedBuilder.from(originalMessage.embeds[0])
            .setColor(0xED4245)
            .spliceFields(
                statusFieldIndex,
                1,
                { name: originalMessage.embeds[0].fields[statusFieldIndex]?.name || t('appeal_field_status', lang), value: t('appeal_status_refused', lang), inline: true },
                { name: t('field_moderator', lang), value: `${staff.tag}`, inline: true }
            );
        await originalMessage.edit({ embeds: [updatedEmbed], components: [] });
    } catch {
        // message may have been deleted
    }

    const closeRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
            .setCustomId('appeal_close')
            .setLabel(t('appeal_btn_close', lang))
            .setStyle(ButtonStyle.Secondary)
    );
    await (interaction.channel as TextChannel).send({ content: t('appeal_refused_msg', lang), components: [closeRow] });

    let sourceGuild;
    try {
        sourceGuild = await interaction.client.guilds.fetch(appeal.source_guild_id);
    } catch {
        sourceGuild = null;
    }

    if (sourceGuild) {
        const sourceSettings = await getServerSettings(appeal.source_guild_id);
        if (sourceSettings.log_channel_id) {
            try {
                const logChannel = sourceGuild.channels.cache.get(sourceSettings.log_channel_id);
                if (logChannel?.isTextBased()) {
                    const logEmbed = new EmbedBuilder()
                        .setTitle(t('appeal_log_refused_title', sourceSettings.language || 'en'))
                        .addFields(
                            { name: t('field_user', sourceSettings.language || 'en'), value: `<@${appeal.user_id}> (${appeal.user_id})`, inline: true },
                            { name: t('field_moderator', sourceSettings.language || 'en'), value: `${staff.tag}`, inline: true }
                        )
                        .setColor(0xED4245)
                        .setTimestamp();
                    await logChannel.send({ embeds: [logEmbed] });
                }
            } catch {
                // log channel may be inaccessible
            }
        }
    }
}
