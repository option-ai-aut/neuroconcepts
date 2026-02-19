#!/usr/bin/env python3
"""
Telegram → Cursor CLI Agent Bot
Wähle den Agent per Inline-Keyboard, dann wird die Aufgabe ausgeführt.
"""

import os
import glob
import asyncio
import logging
from telegram import Update, InlineKeyboardButton, InlineKeyboardMarkup
from telegram.ext import (
    ApplicationBuilder, MessageHandler, CommandHandler,
    CallbackQueryHandler, filters, ContextTypes
)
from telegram.constants import ParseMode

logging.basicConfig(
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    level=logging.INFO
)
logger = logging.getLogger(__name__)

# ─── Konfiguration ────────────────────────────────────────────────────────────
TELEGRAM_TOKEN  = os.environ["TELEGRAM_TOKEN"]
ALLOWED_CHAT_ID = int(os.environ["ALLOWED_CHAT_ID"])
CURSOR_API_KEY  = os.environ["CURSOR_API_KEY"]
WORKSPACE_DIR   = os.environ.get("WORKSPACE_DIR", "/Users/dennis/NeuroConcepts.ai")
AGENT_PATH      = os.environ.get("AGENT_PATH", os.path.expanduser("~/.local/bin/agent"))
# ──────────────────────────────────────────────────────────────────────────────

# ─── Agent-Definitionen ───────────────────────────────────────────────────────
AGENTS = {
    "general": {
        "label": "🤖 General",
        "description": "Allgemeine Entwicklung & Features",
        "prefix": "",
    },
    "debugger": {
        "label": "🐛 Debugger",
        "description": "Bugs finden & beheben",
        "prefix": (
            "Du bist ein erfahrener Debugging-Experte. "
            "Analysiere das Problem systematisch: Lies zuerst relevante Logs und Fehler, "
            "identifiziere die Ursache, und behebe den Bug mit minimalem Eingriff. "
            "Erkläre kurz was du gefunden hast. Aufgabe: "
        ),
    },
    "stage_migrator": {
        "label": "🚀 Stage Migrator",
        "description": "DB-Migrationen & Deployments",
        "prefix": (
            "Du bist ein Deployment- und Migrations-Experte für das Immivo-Projekt. "
            "Umgebungen: dev (dev.immivo.ai), test (test.immivo.ai), main (immivo.ai). "
            "Prisma-Schema liegt in src/services/orchestrator/prisma/schema.prisma. "
            "Sei vorsichtig mit produktiven Daten. Aufgabe: "
        ),
    },
    "security": {
        "label": "🔒 Security",
        "description": "Sicherheitsprüfung & Fixes",
        "prefix": (
            "Du bist ein Security-Experte. Analysiere den Code auf: "
            "Auth-Schwachstellen, unsichere API-Endpunkte, fehlende Input-Validierung, "
            "exponierte Secrets, CSP/CORS-Probleme, SQL-Injection, XSS. "
            "Priorisiere nach Schweregrad (Critical/High/Medium/Low). Aufgabe: "
        ),
    },
}

# Letzter verwendeter Agent pro Chat
last_agent: dict[int, str] = {}
# Zwischenspeicher: Nachricht wartet auf Agent-Auswahl
pending_prompt: dict[int, str] = {}
# Nachrichten-Counter für automatische Session-Rotation
SESSION_MAX_MESSAGES = 20
session_message_count: dict[int, int] = {}
# ──────────────────────────────────────────────────────────────────────────────


def is_authorized(update: Update) -> bool:
    return update.effective_chat.id == ALLOWED_CHAT_ID


def build_agent_keyboard() -> InlineKeyboardMarkup:
    buttons = [
        [InlineKeyboardButton(f"{info['label']}  —  {info['description']}", callback_data=f"agent:{key}")]
        for key, info in AGENTS.items()
    ]
    return InlineKeyboardMarkup(buttons)


CHATS_DIR = os.path.expanduser("~/.cursor/chats")


def get_latest_chat_id():
    """Neueste Chat-Session-ID aus ~/.cursor/chats/ lesen."""
    try:
        dirs = glob.glob(os.path.join(CHATS_DIR, "*"))
        if not dirs:
            return None
        latest = max(dirs, key=os.path.getmtime)
        chat_id = os.path.basename(latest)
        return chat_id if len(chat_id) == 32 else None
    except Exception:
        return None


async def run_agent(prompt: str, agent_key: str, force_new: bool = False) -> str:
    agent = AGENTS.get(agent_key, AGENTS["general"])
    full_prompt = agent["prefix"] + prompt if agent["prefix"] else prompt

    # Immer letzte Session fortsetzen (außer /new wurde aufgerufen)
    cmd = [AGENT_PATH, full_prompt, "--print", "--trust"]
    if not force_new:
        chat_id = get_latest_chat_id()
        if chat_id:
            cmd += ["--resume", chat_id]

    env = {**os.environ, "CURSOR_API_KEY": CURSOR_API_KEY}
    try:
        result = await asyncio.create_subprocess_exec(
            *cmd,
            cwd=WORKSPACE_DIR,
            env=env,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )
        stdout, stderr = await asyncio.wait_for(result.communicate(), timeout=300)
        output = stdout.decode("utf-8", errors="replace").strip()
        if not output and stderr:
            output = f"⚠️ Fehler:\n{stderr.decode('utf-8', errors='replace')[:1000]}"
        return output or "✅ Erledigt (keine Ausgabe)"
    except asyncio.TimeoutError:
        return "⏱ Timeout nach 5 Minuten."
    except Exception as e:
        return f"❌ Fehler: {e}"


async def handle_message(update: Update, context: ContextTypes.DEFAULT_TYPE):
    if not is_authorized(update):
        await update.message.reply_text("⛔ Nicht autorisiert.")
        return

    prompt = update.message.text.strip()
    if not prompt:
        return

    chat_id = update.effective_chat.id
    pending_prompt[chat_id] = prompt

    # Agent-Auswahl anzeigen
    default = last_agent.get(chat_id, "general")
    default_label = AGENTS[default]["label"]

    await update.message.reply_text(
        f"*Welchen Agent soll ich nutzen?*\n\n"
        f"Aufgabe: `{prompt[:120]}{'...' if len(prompt) > 120 else ''}`\n\n"
        f"Zuletzt: {default_label}",
        parse_mode=ParseMode.MARKDOWN,
        reply_markup=build_agent_keyboard(),
    )


async def handle_agent_selection(update: Update, context: ContextTypes.DEFAULT_TYPE):
    query = update.callback_query
    await query.answer()

    if not is_authorized(update):
        return

    chat_id = update.effective_chat.id
    agent_key = query.data.replace("agent:", "")

    if agent_key not in AGENTS:
        await query.edit_message_text("❌ Unbekannter Agent.")
        return

    prompt = pending_prompt.pop(chat_id, None)
    if not prompt:
        await query.edit_message_text("⚠️ Aufgabe nicht mehr vorhanden. Bitte neu senden.")
        return

    last_agent[chat_id] = agent_key
    agent_label = AGENTS[agent_key]["label"]

    # Status-Nachricht updaten
    await query.edit_message_text(
        f"{agent_label} arbeitet...\n\n`{prompt[:120]}{'...' if len(prompt) > 120 else ''}`",
        parse_mode=ParseMode.MARKDOWN,
    )

    # Session-Counter: nach 20 Nachrichten automatisch neu starten
    force_new = context.user_data.pop("force_new", False)
    count = session_message_count.get(chat_id, 0) + 1
    if count > SESSION_MAX_MESSAGES:
        force_new = True
        session_message_count[chat_id] = 1
        await update.effective_chat.send_message(
            "🔄 *Session-Limit erreicht (20 Nachrichten)* — neue Session gestartet.",
            parse_mode=ParseMode.MARKDOWN,
        )
    else:
        session_message_count[chat_id] = count

    result = await run_agent(prompt, agent_key, force_new=force_new)

    # Ergebnis senden
    chunks = [result[i:i+3800] for i in range(0, len(result), 3800)]
    for i, chunk in enumerate(chunks):
        header = f"✅ *{agent_label}* — Ergebnis" + (f" ({i+1}/{len(chunks)})" if len(chunks) > 1 else "")
        await update.effective_chat.send_message(
            f"{header}\n\n```\n{chunk}\n```",
            parse_mode=ParseMode.MARKDOWN,
        )


async def cmd_start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    if not is_authorized(update):
        return
    lines = "\n".join(f"{info['label']}  —  {info['description']}" for info in AGENTS.values())
    await update.message.reply_text(
        f"👋 *Immivo Developer Bot*\n\n"
        f"Schick mir eine Aufgabe und wähle dann den Agent:\n\n{lines}\n\n"
        f"📁 Workspace: `{WORKSPACE_DIR}`",
        parse_mode=ParseMode.MARKDOWN,
    )


async def cmd_new(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Neue leere Session starten (löscht keine Dateien, ignoriert nur die letzte)."""
    if not is_authorized(update):
        return
    # Wir können keine Session löschen, aber wir merken uns dass die nächste
    # Aufgabe ohne --resume laufen soll (indem wir den Chats-Ordner kurz umbenennen)
    # Einfachste Lösung: neue Dummy-Datei mit aktuellem Timestamp erstellen
    # sodass get_latest_chat_id() nichts findet, was resume-fähig ist.
    # Stattdessen: Flag setzen
    chat_id = update.effective_chat.id
    last_agent[chat_id] = last_agent.get(chat_id, "general")
    context.user_data["force_new"] = True
    session_message_count[chat_id] = 0
    await update.message.reply_text(
        "🆕 Nächste Aufgabe startet eine *neue Session* (kein Resume).",
        parse_mode=ParseMode.MARKDOWN,
    )


async def cmd_status(update: Update, context: ContextTypes.DEFAULT_TYPE):
    if not is_authorized(update):
        return
    import subprocess
    try:
        r = subprocess.run([AGENT_PATH, "--version"], capture_output=True, text=True, timeout=10)
        version = r.stdout.strip() or r.stderr.strip()
    except Exception as e:
        version = f"Fehler: {e}"
    chat_id = update.effective_chat.id
    current = AGENTS.get(last_agent.get(chat_id, "general"), {}).get("label", "—")
    count = session_message_count.get(chat_id, 0)
    await update.message.reply_text(
        f"✅ Bot läuft\n"
        f"🤖 Cursor CLI: `{version}`\n"
        f"🎯 Letzter Agent: {current}\n"
        f"💬 Session: {count}/{SESSION_MAX_MESSAGES} Nachrichten\n"
        f"📁 `{WORKSPACE_DIR}`",
        parse_mode=ParseMode.MARKDOWN,
    )


def main():
    app = ApplicationBuilder().token(TELEGRAM_TOKEN).build()
    app.add_handler(CommandHandler("start", cmd_start))
    app.add_handler(CommandHandler("status", cmd_status))
    app.add_handler(CommandHandler("new", cmd_new))
    app.add_handler(CallbackQueryHandler(handle_agent_selection, pattern="^agent:"))
    app.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, handle_message))

    logger.info("Bot gestartet mit %d Agents.", len(AGENTS))
    app.run_polling(drop_pending_updates=True)


if __name__ == "__main__":
    main()
