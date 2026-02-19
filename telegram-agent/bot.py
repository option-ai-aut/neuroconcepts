#!/usr/bin/env python3
"""
Telegram → Cursor CLI Agent Bot
Empfängt Nachrichten via Telegram und führt sie als Cursor Agent aus.
Antwort kommt zurück als Telegram-Nachricht.
"""

import os
import subprocess
import asyncio
import logging
from telegram import Update
from telegram.ext import ApplicationBuilder, MessageHandler, CommandHandler, filters, ContextTypes
from telegram.constants import ParseMode

logging.basicConfig(
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    level=logging.INFO
)
logger = logging.getLogger(__name__)

# ─── Konfiguration ────────────────────────────────────────────────────────────
TELEGRAM_TOKEN  = os.environ["TELEGRAM_TOKEN"]
ALLOWED_CHAT_ID = int(os.environ["ALLOWED_CHAT_ID"])   # Nur du darfst Befehle senden
CURSOR_API_KEY  = os.environ["CURSOR_API_KEY"]
WORKSPACE_DIR   = os.environ.get("WORKSPACE_DIR", "/Users/dennis/NeuroConcepts.ai")
AGENT_PATH      = os.environ.get("AGENT_PATH", os.path.expanduser("~/.local/bin/agent"))
# ──────────────────────────────────────────────────────────────────────────────


def is_authorized(update: Update) -> bool:
    return update.effective_chat.id == ALLOWED_CHAT_ID


async def run_agent(prompt: str) -> str:
    """Führt Cursor CLI Agent aus und gibt das Ergebnis zurück."""
    env = {**os.environ, "CURSOR_API_KEY": CURSOR_API_KEY}
    try:
        result = await asyncio.create_subprocess_exec(
            AGENT_PATH, prompt, "--print", "--trust",
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
        return "⏱ Timeout nach 5 Minuten – Task läuft möglicherweise noch."
    except Exception as e:
        return f"❌ Fehler beim Ausführen: {e}"


async def handle_message(update: Update, context: ContextTypes.DEFAULT_TYPE):
    if not is_authorized(update):
        await update.message.reply_text("⛔ Nicht autorisiert.")
        return

    prompt = update.message.text.strip()
    if not prompt:
        return

    # Bestätigung senden
    thinking_msg = await update.message.reply_text(
        f"🤖 Cursor Agent arbeitet...\n\n`{prompt[:100]}{'...' if len(prompt) > 100 else ''}`",
        parse_mode=ParseMode.MARKDOWN
    )

    # Agent ausführen
    result = await run_agent(prompt)

    # Ergebnis senden (Telegram max 4096 Zeichen pro Nachricht)
    await thinking_msg.delete()

    chunks = [result[i:i+4000] for i in range(0, len(result), 4000)]
    for i, chunk in enumerate(chunks):
        prefix = f"📋 *Ergebnis ({i+1}/{len(chunks)})*\n\n" if len(chunks) > 1 else "✅ *Ergebnis*\n\n"
        await update.message.reply_text(
            prefix + f"```\n{chunk}\n```",
            parse_mode=ParseMode.MARKDOWN
        )


async def cmd_start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    if not is_authorized(update):
        return
    await update.message.reply_text(
        "👋 *Cursor Agent Bot*\n\n"
        "Schick mir einfach einen Befehl, z.B.:\n"
        "`Füge in dashboard/page.tsx einen Export-Button hinzu`\n\n"
        f"📁 Workspace: `{WORKSPACE_DIR}`",
        parse_mode=ParseMode.MARKDOWN
    )


async def cmd_status(update: Update, context: ContextTypes.DEFAULT_TYPE):
    if not is_authorized(update):
        return
    # Cursor Agent Version prüfen
    try:
        r = subprocess.run([AGENT_PATH, "--version"], capture_output=True, text=True, timeout=10)
        version = r.stdout.strip() or r.stderr.strip()
    except Exception as e:
        version = f"Fehler: {e}"
    await update.message.reply_text(
        f"✅ Bot läuft\n"
        f"🤖 Cursor CLI: `{version}`\n"
        f"📁 Workspace: `{WORKSPACE_DIR}`",
        parse_mode=ParseMode.MARKDOWN
    )


def main():
    app = ApplicationBuilder().token(TELEGRAM_TOKEN).build()
    app.add_handler(CommandHandler("start", cmd_start))
    app.add_handler(CommandHandler("status", cmd_status))
    app.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, handle_message))

    logger.info("Bot gestartet. Warte auf Nachrichten...")
    app.run_polling(drop_pending_updates=True)


if __name__ == "__main__":
    main()
