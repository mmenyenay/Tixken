const TelegramBot = require('node-telegram-bot-api');
require('dotenv').config();

const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { polling: false });

async function sendTelegramAlert(message) {
  try {
      await bot.sendMessage(process.env.TELEGRAM_CHAT_ID, message);
        } catch (err) {
            console.error('Telegram alert failed:', err.message);
              }
              }

              module.exports = { sendTelegramAlert };