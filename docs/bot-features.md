# NightClaw — Bot Features & Commands

NightClaw is a multi-guild Discord bot providing moderation tools, a support ticket system, anonymous/public confessions, and a ban appeal system. All features are configured per-server and support English and French.

---

## Table of Contents

1. [Setup & Configuration](#setup--configuration)
2. [Moderation Commands](#moderation-commands)
   - [/ban](#ban)
   - [/kick](#kick)
   - [/mute](#mute)
   - [/unmute](#unmute)
   - [/warn](#warn)
   - [/clear](#clear)
   - [/slowmode](#slowmode)
3. [Moderation History](#moderation-history)
   - [/sanction](#sanction)
4. [Community Features](#community-features)
   - [Confessions](#confessions)
   - [Support Tickets](#support-tickets)
   - [Ban Appeals](#ban-appeals)
5. [Localization](#localization)
6. [Permissions Summary](#permissions-summary)

---

## Setup & Configuration

### `/setup`

Configure the bot for your server. Run without options to view the current configuration.

**Required permission:** Administrator

| Option               | Type    | Description                                                                         |
| -------------------- | ------- | ----------------------------------------------------------------------------------- |
| `log_channel`        | Channel | Channel where moderation logs are posted                                            |
| `mod_role`           | Role    | Role that can use moderation commands                                               |
| `confession_channel` | Channel | Channel where confessions are posted                                                |
| `language`           | String  | Bot language (`en` or `fr`)                                                         |
| `source_guild`       | String  | Guild ID of the main server (set on the appeal server)                              |
| `appeal_invite`      | String  | Invite URL for the appeal server (included in ban DMs)                              |
| `main_invite`        | String  | Permanent invite URL for the main server (sent to users when an appeal is accepted) |

All options are optional and can be set independently — only provided fields are updated.

---

## Moderation Commands

All moderation commands require the configured **mod role** or the **Administrator** Discord permission. Actions are logged to the configured log channel and stored in the moderation database.

---

### `/ban`

Permanently ban a member from the server.

**Required permission:** Mod role or Administrator

| Option   | Type   | Required | Description        |
| -------- | ------ | -------- | ------------------ |
| `member` | User   | Yes      | The member to ban  |
| `reason` | String | Yes      | Reason for the ban |

**Behavior:**

- Sends the banned user a DM with the reason and a link to the appeal server (if configured via `/setup appeal_invite`)
- Bans the member via Discord
- Logs the action to the log channel and database

---

### `/kick`

Kick a member from the server.

**Required permission:** Mod role or Administrator

| Option   | Type   | Required | Description         |
| -------- | ------ | -------- | ------------------- |
| `member` | User   | Yes      | The member to kick  |
| `reason` | String | Yes      | Reason for the kick |

**Behavior:**

- Sends the kicked user a DM with the reason
- Kicks the member via Discord
- Logs the action to the log channel and database

---

### `/mute`

Temporarily mute a member using Discord's timeout feature.

**Required permission:** Mod role or Administrator

| Option   | Type    | Required | Description              |
| -------- | ------- | -------- | ------------------------ |
| `member` | User    | Yes      | The member to mute       |
| `time`   | Integer | Yes      | Mute duration in minutes |
| `reason` | String  | Yes      | Reason for the mute      |

**Behavior:**

- Applies a Discord timeout for the specified duration
- Sends the user a DM with the duration and reason
- Logs the action with a timeout expiration timestamp to the log channel and database

---

### `/unmute`

Remove a timeout (unmute) from a member before it expires.

**Required permission:** Mod role or Administrator

| Option   | Type | Required | Description          |
| -------- | ---- | -------- | -------------------- |
| `member` | User | Yes      | The member to unmute |

**Behavior:**

- Checks that the member is currently muted
- Removes the timeout
- Logs the action to the log channel

---

### `/warn`

Issue a formal warning to a member.

**Required permission:** Mod role or Administrator

| Option   | Type   | Required | Description            |
| -------- | ------ | -------- | ---------------------- |
| `member` | User   | Yes      | The member to warn     |
| `reason` | String | Yes      | Reason for the warning |

**Behavior:**

- Increments the member's warning count in the database
- Sends the user a DM including their current total warning count
- If the member reaches **3 or more warnings**, the command reply includes a threshold alert for staff
- Logs the action with the total warning count to the log channel and database

---

### `/clear`

Bulk-delete messages in a channel.

**Required permission:** Manage Messages

| Option   | Type            | Required | Description                                    |
| -------- | --------------- | -------- | ---------------------------------------------- |
| `amount` | Integer (1–100) | Yes      | Number of messages to delete                   |
| `reason` | String          | Yes      | Reason for clearing                            |
| `member` | User            | No       | Only delete messages from this specific member |

**Behavior:**

- If `member` is provided, fetches the last 100 messages and deletes up to `amount` from that user
- If no `member` is provided, bulk-deletes up to `amount` messages in the channel
- Messages older than 14 days cannot be bulk-deleted (Discord limitation)
- Posts a log to the log channel with the deletion count and target member

---

### `/slowmode`

Set or disable slowmode in a channel.

**Required permission:** Mod role or Administrator

| Option    | Type              | Required | Description                                      |
| --------- | ----------------- | -------- | ------------------------------------------------ |
| `seconds` | Integer (0–21600) | Yes      | Slowmode delay in seconds. `0` disables slowmode |
| `channel` | Channel           | No       | Target channel (defaults to current channel)     |

**Behavior:**

- Applies the slowmode delay to the target channel
- Confirms the change with an embed showing the new slowmode status

---

## Moderation History

### `/sanction`

View the full moderation history of a user in this server.

**Required permission:** Mod role or Administrator

| Option | Type | Required | Description         |
| ------ | ---- | -------- | ------------------- |
| `user` | User | Yes      | The user to look up |

**Behavior:**

- Displays a paginated list of all moderation actions for that user (15 per page)
- Each entry shows the action type with an emoji, date, and brief summary:
  - ⛔ Ban
  - 👢 Kick
  - 🔇 Mute
  - ⚠️ Warn
- Navigation buttons allow scrolling through pages
- A **"View Details"** button opens a modal where you enter a sanction number to see the full record: action, moderator, date, and reason
- If the user has no moderation history, a clean record message is shown

---

## Community Features

### Confessions

Allow members to submit anonymous or public confessions to a designated channel.

**Setup command:** `/confessionsetup`
**Required permission to set up:** Manage Channels

Running `/confessionsetup` posts a panel with two buttons in the current channel:

- **Anonymous Confession** — The confession is posted with no author information
- **Public Confession** — The confession is posted with the author's username

**Confession flow:**

1. Member clicks a button on the panel
2. A modal appears prompting them to enter their confession (10–1000 characters)
3. The confession is posted as an embed in the configured confession channel
4. A thread is automatically created on the confession post for discussion
5. The confession panel is re-posted at the bottom of the channel

**Anonymous confessions** appear with a dark gray embed and a generic ID in the footer.
**Public confessions** appear with a blue embed showing the author's name and tag.

---

### Support Tickets

Let members open private support channels with your moderation team.

**Setup command:** `/ticketpanel`
**Required permission to set up:** Manage Channels

Running `/ticketpanel` posts a panel with an **"Open Ticket"** button in the current channel.

**Ticket flow:**

1. Member clicks **Open Ticket**
2. A modal appears asking for the reason for the ticket
3. A private channel named `ticket-{username}` is created in the **Support** category
4. Channel permissions:
   - The member can view and send messages
   - The configured mod role can view, send, and manage the channel
   - All other members are denied access
5. The mod role is pinged in the new channel
6. A **Close Ticket** button is available in the channel; clicking it deletes the channel

---

### Ban Appeals

Allow banned users to submit a ban appeal from a separate appeal server.

**Setup command:** `/banappeal-panel`
**Required permission to set up:** Manage Channels

Running `/banappeal-panel` posts a panel with an **"Appeal Ban"** button in the current channel.

**Appeal flow:**

1. Banned user clicks **Appeal Ban** on the appeal server
2. The bot verifies they are actually banned on the main server
3. The bot checks they have no open appeal and are not on a cooldown
4. A modal appears asking for their appeal reason
5. A private channel named `appeal-{username}` is created in the **Ban Appeals** category
6. Staff can then take one of two actions:

**Accept:**

- Staff provides an acceptance reason via modal
- The user is unbanned on the main server
- The appeal embed updates to green (accepted)
- The user receives a DM with the main server invite link
- The action is logged to the main server's log channel

**Refuse:**

- Staff selects a cooldown period before the user can re-appeal:
  - 3 days
  - 1 week
  - 2 weeks
  - 1 month
- The appeal embed updates with the refusal and cooldown info
- The user is notified via DM

**Enforcement:**

- If the user re-joins the main server before their appeal is processed, they are automatically kicked from the appeal server
- Cooldowns are enforced — users cannot open a new appeal while one is pending or a cooldown is active

---

## Localization

meownya supports **English** and **French**. The language can be set per-server.

```
/setup language:en   # English (default)
/setup language:fr   # French
```

All user-facing messages, embeds, and DMs are localized based on the server's configured language.

---

## Permissions Summary

| Command            | Required Discord Permission | Also requires mod role? |
| ------------------ | --------------------------- | ----------------------- |
| `/setup`           | Administrator               | No                      |
| `/ban`             | Ban Members                 | Yes (or Administrator)  |
| `/kick`            | Kick Members                | Yes (or Administrator)  |
| `/mute`            | Moderate Members            | Yes (or Administrator)  |
| `/unmute`          | Moderate Members            | Yes (or Administrator)  |
| `/warn`            | Moderate Members            | Yes (or Administrator)  |
| `/clear`           | Manage Messages             | No                      |
| `/slowmode`        | Manage Channels             | Yes (or Administrator)  |
| `/sanction`        | Moderate Members            | Yes (or Administrator)  |
| `/ticketpanel`     | Manage Channels             | No                      |
| `/confessionsetup` | Manage Channels             | No                      |
| `/banappeal-panel` | Manage Channels             | No                      |

> **Mod role:** Configured via `/setup mod_role`. Members with the mod role bypass the listed Discord permission checks for moderation commands. Server administrators always bypass all permission checks.
