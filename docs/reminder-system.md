# Reminder & Live-Notification System

## Overview
Reminders are tied to real scheduled shows — there's no free-text/manual reminder path. A user sets a reminder from the Bell icon on a show card (PBS-scraped or OnWave-internal), and gets a real-time push when it's due. The same delivery channel also carries "X just went live" notifications (added in M5).

## How it works

### Creating a reminder
- The Bell icon on `PBSShowCard` and `InternalShowCard` is the only entry point — there's no standalone reminder-creation form. Clicking it calls into `RemindersContext` (`useReminders()`), which owns the actual `POST /reminders` / `GET /reminders` / `DELETE /reminders/{id}` calls.
- Reminders are always attached to a real `Show`/`PBSShow` record — the schedule data itself is the source of truth for what the reminder is about.

### Real-time delivery
- `NotificationContext` (`src/contexts/NotificationContext.tsx`) opens one WebSocket per logged-in user to `wss://.../ws?user_id={userId}`, with automatic reconnect on drop.
- Two message types are currently handled: `show_reminder` (a reminder's scheduled time has arrived) and `show_live` (a station/show the user follows has just started broadcasting — see M5's Go Live chat/notifications work). Both show a toast and, if permission was granted, a browser `Notification`.
- There's no dedicated "Reminders" nav tab or bell icon in the top nav — reminders live entirely on the show cards that created them, and delivery is a toast/notification, not a page.

### Backend
- `internal/reminder` owns the reminder CRUD + the periodic checker/cleanup jobs that decide when a reminder is due.
- `internal/notify`'s `WebSocketHub` is the actual connection registry (keyed by user ID) both the reminder checker and the M5 "went live" event bridge push through.

## Related components
- `RemindersList` — a user's own reminders (profile page).
- `ConnectionStatus` — a small connected/disconnected indicator for the notification socket.
- `PBSShowCard` / `InternalShowCard` — the actual reminder entry points.
