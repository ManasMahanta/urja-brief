// Telegram distribution — the India-first channel email can't match. Posts to
// a channel via the Bot API. Configured with two env vars the operator sets up
// once (bot token from @BotFather + the channel id/@handle with the bot as an
// admin). No-ops cleanly when unconfigured, so nothing breaks if it isn't set.

export function telegramConfigured(): boolean {
  return !!process.env.TELEGRAM_BOT_TOKEN && !!process.env.TELEGRAM_CHAT_ID;
}

// `html` may use a small subset of Telegram HTML: <b>, <i>, <a href>.
export async function sendTelegram(html: string): Promise<boolean> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) return false;
  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: html,
        parse_mode: "HTML",
        disable_web_page_preview: true,
      }),
      signal: AbortSignal.timeout(10_000),
    });
    return res.ok;
  } catch {
    return false;
  }
}

// Escape user/content text for Telegram HTML (only &, <, > matter).
export const tgEscape = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
