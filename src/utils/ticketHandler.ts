import {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    EmbedBuilder,
    ButtonInteraction,
    ModalSubmitInteraction,
    TextChannel,
    OverwriteResolvable,
    PermissionFlagsBits
} from "discord.js";
import { getServerSettings } from './serverSettings.js';
import { t } from './i18n.js';
import sql from '../db.js';
import { generateAndUploadTranscript } from './transcriptHandler.js';

export async function handleTicketButton(interaction: ButtonInteraction): Promise<void> {
    const { customId, guild, user } = interaction;

    const settings = await getServerSettings(guild!.id);
    const lang = settings.language || 'en';

    if (customId === "ticket_open") {
        const existing = guild!.channels.cache.find(c => c.name === `ticket-${user.username}`.toLowerCase());
        if (existing) {
            return void interaction.reply({ content: t('ticket_already_open', lang), ephemeral: true });
        }

        const modal = new ModalBuilder()
            .setCustomId('ticket_reason_modal')
            .setTitle(t('ticket_modal_title', lang));

        const reasonInput = new TextInputBuilder()
            .setCustomId('ticket_reason')
            .setLabel(t('ticket_reason_label', lang))
            .setStyle(TextInputStyle.Paragraph)
            .setPlaceholder(t('ticket_reason_placeholder', lang))
            .setRequired(true);

        const row = new ActionRowBuilder<TextInputBuilder>().addComponents(reasonInput);
        modal.addComponents(row);

        await interaction.showModal(modal);
    }

    else if (customId === "ticket_close") {
        if (!interaction.member || !('permissions' in interaction.member) || !(interaction.member.permissions as any).has('ManageChannels')) {
            return void interaction.reply({ content: t('ticket_no_close_perm', lang), ephemeral: true });
        }

        await interaction.deferReply({ ephemeral: true });

        const channel = interaction.channel as TextChannel;
        const guild = interaction.guild!;

        let transcriptUrl: string | null = null;
        try {
            transcriptUrl = await generateAndUploadTranscript(channel, interaction.user, guild);
        } catch (err) {
            console.error('Transcript generation error:', err);
        }

        try {
            await sql`
                UPDATE tickets
                SET closed_at = NOW(),
                    closed_by = ${interaction.user.id},
                    transcript_url = ${transcriptUrl}
                WHERE channel_id = ${channel.id}
                  AND guild_id = ${guild.id}
                  AND closed_at IS NULL
            `;
        } catch (err) {
            console.error('DB update error on ticket close:', err);
        }

        await interaction.editReply({ content: t('ticket_closing', lang) });
        await channel.delete();
    }
}

export async function handleTicketModal(interaction: ModalSubmitInteraction): Promise<void> {
    if (!interaction.isModalSubmit()) return;
    if (interaction.customId !== 'ticket_reason_modal') return;

    const reason = interaction.fields.getTextInputValue('ticket_reason');
    const user = interaction.user;
    const guild = interaction.guild!;
    const guildId = guild.id;

    const settings = await getServerSettings(guildId);
    const lang = settings.language || 'en';

    const category = (interaction.channel as TextChannel).parent ?? null;

    const permissionOverwrites: OverwriteResolvable[] = [
        { id: guild.id, deny: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] },
        { id: user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages], deny: [PermissionFlagsBits.ManageChannels] },
        { id: guild.members.me!.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ManageChannels, PermissionFlagsBits.ReadMessageHistory] }
    ];

    if (settings.mod_role_id) {
        const modRole = guild.roles.cache.get(settings.mod_role_id);
        if (modRole) {
            permissionOverwrites.push({
                id: settings.mod_role_id,
                allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ManageChannels]
            });
        }
    }

    const ticketChannel = await guild.channels.create({
        name: `ticket-${user.username}`.toLowerCase(),
        type: 0,
        parent: category?.id ?? null,
        permissionOverwrites
    }) as TextChannel;

    await sql`
        INSERT INTO tickets (guild_id, channel_id, channel_name, user_id)
        VALUES (${guild.id}, ${ticketChannel.id}, ${ticketChannel.name}, ${user.id})
    `;

    const embed = new EmbedBuilder()
        .setTitle(t('ticket_embed_title', lang, { username: user.username }))
        .setDescription(t('ticket_embed_desc', lang))
        .addFields(
            { name: t('ticket_field_user', lang), value: `${user}`, inline: true },
            { name: t('ticket_field_reason', lang), value: reason, inline: false }
        )
        .setColor('Purple' as any)
        .setTimestamp();

    const closeRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
            .setCustomId('ticket_close')
            .setLabel(t('ticket_btn_close', lang))
            .setStyle(ButtonStyle.Danger)
    );

    await ticketChannel.send({ embeds: [embed], components: [closeRow] });

    if (settings.mod_role_id) {
        const modRole = guild.roles.cache.get(settings.mod_role_id);
        if (modRole) {
            await ticketChannel.send(`<@&${settings.mod_role_id}>`);
        }
    }

    await interaction.reply({ content: t('ticket_created', lang, { channel: ticketChannel.toString() }), ephemeral: true });
}
