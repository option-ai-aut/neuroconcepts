#!/bin/bash
# Einmalige Einrichtung des Telegram Bots

set -e
cd "$(dirname "$0")"

echo "📦 Python-Abhängigkeiten installieren..."
pip3 install python-telegram-bot --quiet

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔑 Jetzt brauchst du 3 Werte:"
echo ""
echo "1) TELEGRAM_TOKEN  → von @BotFather (/newbot)"
echo "2) ALLOWED_CHAT_ID → schreib deinem Bot eine Nachricht,"
echo "   dann: curl 'https://api.telegram.org/bot<TOKEN>/getUpdates'"
echo "   Die 'id' unter 'chat' ist deine Chat-ID"
echo "3) CURSOR_API_KEY  → cursor.com → Settings → API Keys"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

read -p "TELEGRAM_TOKEN: " TELEGRAM_TOKEN
read -p "ALLOWED_CHAT_ID: " ALLOWED_CHAT_ID
read -p "CURSOR_API_KEY: " CURSOR_API_KEY

# .env erstellen
cat > .env << EOF
TELEGRAM_TOKEN=$TELEGRAM_TOKEN
ALLOWED_CHAT_ID=$ALLOWED_CHAT_ID
CURSOR_API_KEY=$CURSOR_API_KEY
WORKSPACE_DIR=/Users/dennis/NeuroConcepts.ai
AGENT_PATH=/Users/dennis/.local/bin/agent
EOF

# plist mit echten Werten befüllen
sed -i '' \
  -e "s|REPLACE_ME.*TELEGRAM_TOKEN.*|<string>$TELEGRAM_TOKEN</string>|g" \
  com.immivo.telegram-agent.plist

# Direkte Ersetzung in der plist
python3 - << PYEOF
import plistlib

with open('com.immivo.telegram-agent.plist', 'rb') as f:
    plist = plistlib.load(f)

env = plist['EnvironmentVariables']
env['TELEGRAM_TOKEN'] = '$TELEGRAM_TOKEN'
env['ALLOWED_CHAT_ID'] = '$ALLOWED_CHAT_ID'
env['CURSOR_API_KEY']  = '$CURSOR_API_KEY'

with open('com.immivo.telegram-agent.plist', 'wb') as f:
    plistlib.dump(plist, f)

print("✅ plist aktualisiert")
PYEOF

# Als launchd Service installieren
PLIST_DEST="$HOME/Library/LaunchAgents/com.immivo.telegram-agent.plist"
cp com.immivo.telegram-agent.plist "$PLIST_DEST"
launchctl load "$PLIST_DEST"

echo ""
echo "✅ Bot ist installiert und läuft!"
echo "📱 Schreib deinem Bot auf Telegram eine Nachricht zum Testen."
echo ""
echo "Nützliche Befehle:"
echo "  Status:   launchctl list | grep telegram"
echo "  Logs:     tail -f telegram-agent/bot.log"
echo "  Stoppen:  launchctl unload ~/Library/LaunchAgents/com.immivo.telegram-agent.plist"
echo "  Starten:  launchctl load ~/Library/LaunchAgents/com.immivo.telegram-agent.plist"
