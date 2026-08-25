import TelegramBot from 'node-telegram-bot-api';
import fs from 'fs';
import express from 'express';
import https from 'https';

const app = express();
const PORT = process.env.PORT || 3000;
const RENDER_URL = "https://intellect-bot-ikul.onrender.com";

app.get('/', (req, res) => {
  res.send('Intellect Bot muvaffaqiyatli ishlamoqda!');
});

app.listen(PORT, () => {
  console.log(`Server ${PORT}-portda ishga tushdi.`);

  setInterval(() => {
    if (RENDER_URL) {
      https.get(RENDER_URL, (res) => {
        console.log('🔄 Server faol ushlab turildi (Keep-Alive Ping)');
      }).on('error', (err) => {
        console.error('Ping xatoligi:', err.message);
      });
    }
  }, 10 * 60 * 1000);
});

const TOKEN = process.env.BOT_TOKEN || "8753920376:AAGUONfs4dmXPy-EjsaTYtZ8ZLgaBPkDiJc"; 
const ADMIN_IDS = [8299255756, 5631424867];
const REQUIRED_CHANNEL = "@intelekt_oquv_markazi";
const COURSES_PER_PAGE = 5;

function isAdmin(chatId) {
  return ADMIN_IDS.includes(Number(chatId));
}

process.on('uncaughtException', (err) => {
  if (err?.code === 'EFATAL' || err?.message?.includes('fetch failed')) return;
  console.error('Uncaught Exception:', err);
});

process.on('unhandledRejection', (reason) => {
  if (
    reason?.code === 'EFATAL' || 
    reason?.name === 'FatalError' ||
    reason?.message?.includes('fetch failed') ||
    reason?.cause?.code === 'UND_ERR_CONNECT_TIMEOUT'
  ) {
    return;
  }
  console.error('Unhandled Rejection:', reason);
});

const bot = new TelegramBot(TOKEN, {
  polling: {
    interval: 500,
    autoStart: true,
    params: { timeout: 30 }
  },
  request: {
    agentOptions: { keepAlive: true, keepAliveMsecs: 10000 },
    timeout: 30000
  }
});

bot.on('polling_error', (error) => {
  if (error.code === 'EFATAL' || error.message?.includes('fetch failed')) return;
  console.log('Polling xabari:', error.message || error);
});

function escapeHTML(str = '') {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

const SUBJECTS = [
  "💻 IT va Dasturlash",
  "🎨 Grafik Dizayn & Motion",
  "🇬🇧 Ingliz tili (IELTS / CEFR)",
  "📐 Matematika & Fizika",
  "📊 Buxgalteriya va Moliya",
  "📱 SMM va Raqamli Marketing"
];

const COURSES_FILE = './courses_db.json';
const USERS_FILE = './users_db.json';

function loadCourses() {
  try {
    if (fs.existsSync(COURSES_FILE)) {
      return JSON.parse(fs.readFileSync(COURSES_FILE, 'utf8'));
    }
  } catch (e) {
    console.error("Kurslarni o'qishda xato:", e);
  }
  return [
    {
      id: 1,
      title: "Node.js va Telegram Botlar",
      teacher: "Jasur Rahmatov",
      description: "Noldan professional botlar yaratish va serverga joylash kursi.",
      price: "250,000 so'm",
      videos: []
    }
  ];
}

function saveCoursesData() {
  try {
    fs.writeFileSync(COURSES_FILE, JSON.stringify(courses, null, 2), 'utf8');
  } catch (e) {
    console.error("Kurslarni saqlashda xato:", e);
  }
}

function loadUsers() {
  try {
    if (fs.existsSync(USERS_FILE)) {
      return JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'));
    }
  } catch (e) {
    console.error("Foydalanuvchilarni o'qishda xato:", e);
  }
  return {};
}

function saveUsersData() {
  try {
    fs.writeFileSync(USERS_FILE, JSON.stringify(userDataStore, null, 2), 'utf8');
  } catch (e) {
    console.error("Foydalanuvchilarni saqlashda xato:", e);
  }
}

let courses = loadCourses();
let userDataStore = loadUsers();
let userSteps = {};
let tempRegData = {};
let tempCourseData = {};
let tempMessages = {};
let tempTargetUser = {};

function getUserByChatId(chatId) {
  const allUsers = Object.values(userDataStore);
  return allUsers.find(u => u.chatId === chatId);
}

function validatePassword(pass) {
  if (pass.length < 8) return false;
  const letters = (pass.match(/[a-zA-Z]/g) || []).length;
  const digits = (pass.match(/[0-9]/g) || []).length;
  return letters >= 4 && digits >= 4;
}

// KEYBOARDS
const mainKeyboard = (chatId) => {
  const buttons = [
    ['📚 Barcha Kurslar', '👨‍🏫 Ustozlarimiz'],
    ['🔍 Kurs Qidirish', '📞 Bog\'lanish & Manzil']
  ];
  if (isAdmin(chatId)) {
    buttons.push(['⚙️ Admin Panel']);
  }
  return { reply_markup: { keyboard: buttons, resize_keyboard: true } };
};

const roleKeyboard = {
  reply_markup: {
    keyboard: [['👨‍🎓 O\'quvchi', '👨‍🏫 O\'qituvchi'], ['❌ Bekor qilish']],
    resize_keyboard: true
  }
};

const phoneShareKeyboard = {
  reply_markup: {
    keyboard: [[{ text: "📱 Telefon raqamimni yuborish", request_contact: true }], ['❌ Bekor qilish']],
    resize_keyboard: true, one_time_keyboard: true
  }
};

const genderInlineKeyboard = {
  reply_markup: {
    inline_keyboard: [[{ text: "👨 Erkak", callback_data: "gender_Erkak" }, { text: "👩 Ayol", callback_data: "gender_Ayol" }]]
  }
};

const adminKeyboard = {
  reply_markup: {
    keyboard: [
      ['👥 Ro\'yxatdan o\'tganlar', '🔍 Foydalanuvchi Qidirish'],
      ['➕ Yangi Kurs Qo\'shish', '📹 Dars/Video Qo\'shish'],
      ['✏️ Kursni Tahrirlash', '🗑 Kursni O\'chirish'],
      ['📢 E\'lon Yuborish', '📊 Statistika'],
      ['🏠 Foydalanuvchi Menyu']
    ],
    resize_keyboard: true
  }
};

const adminUsersMenuKeyboard = {
  reply_markup: {
    keyboard: [['📋 Barcha Foydalanuvchilar Listi', '🔍 Foydalanuvchi Qidirish'], ['⚙️ Admin Panel']],
    resize_keyboard: true
  }
};

const cancelKeyboard = {
  reply_markup: { keyboard: [['❌ Bekor qilish']], resize_keyboard: true }
};

const priceKeyboard = {
  reply_markup: {
    keyboard: [['⏭ Narxni tashlab ketish (Tekinga qo\'yish)'], ['❌ Bekor qilish']],
    resize_keyboard: true
  }
};

const authStartKeyboard = {
  reply_markup: { keyboard: [['📝 Ro\'yxatdan o\'tish', '🔑 Akkauntga kirish (Login)']], resize_keyboard: true }
};

async function checkSub(chatId) {
  try {
    const member = await bot.getChatMember(REQUIRED_CHANNEL, chatId);
    return ['creator', 'administrator', 'member'].includes(member.status);
  } catch (e) {
    return true;
  }
}

async function sendSubMessage(chatId, extraText = "") {
  const textMsg = `${extraText}📢 <b>Botdan to'liq foydalanish uchun rasmiy kanalimizga a'zo bo'ling:</b>\n\n${REQUIRED_CHANNEL}`;
  return bot.sendMessage(
    chatId,
    textMsg,
    {
      parse_mode: 'HTML',
      reply_markup: {
        inline_keyboard: [
          [{ text: "📢 Kanalga o'tish", url: `https://t.me/${REQUIRED_CHANNEL.replace('@', '')}` }],
          [{ text: "✅ A'zolikni tekshirish", callback_data: "check_subscription" }]
        ]
      }
    }
  );
}

async function clearTempMessages(chatId) {
  if (tempMessages[chatId] && tempMessages[chatId].length > 0) {
    for (let msgId of tempMessages[chatId]) {
      try { await bot.deleteMessage(chatId, msgId); } catch (e) {}
    }
    tempMessages[chatId] = [];
  }
}

function saveTempMsg(chatId, msgId) {
  if (!tempMessages[chatId]) tempMessages[chatId] = [];
  tempMessages[chatId].push(msgId);
}

async function sendSubjectSelection(chatId) {
  const inlineButtons = SUBJECTS.map((sub, index) => [{ text: sub, callback_data: `select_subject_${index}` }]);
  return bot.sendMessage(chatId, "🎯 <b>Qaysi soha yoki fan sizni ko'proq qiziqtiradi?</b>\n\nQuyidagilardan birini tanlang:", {
    parse_mode: 'HTML',
    reply_markup: { inline_keyboard: inlineButtons }
  });
}

function getCoursesPageInlineKeyboard(page = 1) {
  const totalCourses = courses.length;
  const totalPages = Math.ceil(totalCourses / COURSES_PER_PAGE) || 1;
  const currentPage = Math.min(Math.max(1, page), totalPages);

  const startIndex = (currentPage - 1) * COURSES_PER_PAGE;
  const pageCourses = courses.slice(startIndex, startIndex + COURSES_PER_PAGE);

  let inlineButtons = pageCourses.map(c => [{ text: `🎓 ${c.title} (${c.price})`, callback_data: `course_${c.id}` }]);

  let navRow = [];
  if (currentPage > 1) {
    navRow.push({ text: "⬅️ Orqaga", callback_data: `courses_page_${currentPage - 1}` });
  }
  navRow.push({ text: `📄 ${currentPage}/${totalPages}`, callback_data: "ignore_page_click" });
  if (currentPage < totalPages) {
    navRow.push({ text: "Keyingi ➡️", callback_data: `courses_page_${currentPage + 1}` });
  }

  if (navRow.length > 0) {
    inlineButtons.push(navRow);
  }

  return { inline_keyboard: inlineButtons };
}

// BOT MESSAGE HANDLER
bot.on('message', async (msg) => {
  const chatId = msg.chat.id;
  const text = msg.text || '';
  const msgId = msg.message_id;

  const savedUser = getUserByChatId(chatId);

  // KICK MUDDATINI TEKSHIRISH (2 kunlik ban)
  const allUsersCheck = Object.values(userDataStore);
  const foundByChat = allUsersCheck.find(u => u.chatId === chatId);
  if (foundByChat && foundByChat.kickUntil && Date.now() < foundByChat.kickUntil) {
    return bot.sendMessage(chatId, "⚠️ Biz sizni taniymiz, sz berilgan muddat tugasa keyin kira olasz.", authStartKeyboard);
  }

  if (text === '/leave') {
    await clearTempMessages(chatId);
    delete userSteps[chatId];
    delete tempCourseData[chatId];
    delete tempRegData[chatId];
    delete tempTargetUser[chatId];

    if (savedUser) {
      savedUser.chatId = null;
      saveUsersData();
    }

    return bot.sendMessage(
      chatId,
      "🚪 <b>Akkauntdan muvaffaqiyatli chiqdingiz!</b>\n\nMa'lumotlaringiz xotirada saqlab qolindi. Qayta kirish uchun Login tugmasini bosing:",
      { parse_mode: 'HTML', ...authStartKeyboard }
    );
  }

  if (text === '🏠 Foydalanuvchi Menyu' || text === '◀️ Bosh Menyu') {
    await clearTempMessages(chatId);
    delete userSteps[chatId];
    delete tempCourseData[chatId];
    delete tempRegData[chatId];
    delete tempTargetUser[chatId];

    if (!savedUser) {
      return bot.sendMessage(chatId, "🌟 Botdan foydalanish uchun ro'yxatdan o'ting:", authStartKeyboard);
    }

    const isSubbed = await checkSub(chatId);
    if (!isSubbed) return sendSubMessage(chatId);

    return bot.sendMessage(
      chatId,
      `🏠 <b>Asosiy foydalanuvchi menyusidasiz:</b>`,
      { parse_mode: 'HTML', ...mainKeyboard(chatId) }
    );
  }

  if (text === '❌ Bekor qilish' || text === '/start') {
    await clearTempMessages(chatId);
    delete userSteps[chatId];
    delete tempCourseData[chatId];
    delete tempRegData[chatId];
    delete tempTargetUser[chatId];

    if (text === '❌ Bekor qilish') {
      return bot.sendMessage(
        chatId, 
        "Jarayon bekor qilindi.", 
        savedUser ? mainKeyboard(chatId) : authStartKeyboard
      );
    }

    if (!savedUser) {
      return bot.sendMessage(
        chatId,
        `🌟 <b>"Intellekt" platformasiga xush kelibsiz!</b>\n\nBotdan foydalanish uchun avval ro'yxatdan o'ting yoki login qiling:`,
        { parse_mode: 'HTML', ...authStartKeyboard }
      );
    }

    const isSubbed = await checkSub(chatId);
    if (!isSubbed) return sendSubMessage(chatId);

    return bot.sendMessage(
      chatId,
      `🌟 <b>Xush kelibsiz, ${escapeHTML(savedUser.fullName)}!</b>\n\nKerakli bo'limni tanlang:`,
      { parse_mode: 'HTML', ...mainKeyboard(chatId) }
    );
  }

  const step = userSteps[chatId];

  if (step) {
    saveTempMsg(chatId, msgId);
  }

  if (text === '📝 Ro\'yxatdan o\'tish') {
    await clearTempMessages(chatId);
    userSteps[chatId] = 'REG_ROLE';
    tempRegData[chatId] = {};
    let sent = await bot.sendMessage(chatId, "👤 <b>Siz kimsiz? Rolingizni tanlang:</b>", { parse_mode: 'HTML', ...roleKeyboard });
    saveTempMsg(chatId, sent.message_id);
    return;
  }

  if (step === 'REG_ROLE') {
    if (text !== '👨‍🎓 O\'quvchi' && text !== '👨‍🏫 O\'qituvchi') {
      let sent = await bot.sendMessage(chatId, "⚠️ Iltimos, pastdagi tugmalardan birini tanlang:", roleKeyboard);
      saveTempMsg(chatId, sent.message_id);
      return;
    }
    tempRegData[chatId].role = text.includes("O'quvchi") ? "O'quvchi" : "O'qituvchi";
    userSteps[chatId] = 'REG_NAME';
    let sent = await bot.sendMessage(chatId, "👤 <b>Ism va Familiyangizni kiriting:</b>\n<i>(Masalan: Ali Valiyev)</i>", { parse_mode: 'HTML', ...cancelKeyboard });
    saveTempMsg(chatId, sent.message_id);
    return;
  }

  if (step === 'REG_NAME') {
    tempRegData[chatId].fullName = text.trim();
    userSteps[chatId] = 'REG_AGE';
    let sent = await bot.sendMessage(chatId, "🎂 <b>Yoshingizni kiriting:</b>", { parse_mode: 'HTML', ...cancelKeyboard });
    saveTempMsg(chatId, sent.message_id);
    return;
  }

  if (step === 'REG_AGE') {
    if (isNaN(text)) {
      let sent = await bot.sendMessage(chatId, "⚠️ Iltimos, yoshingizni faqat raqamlarda kiriting:", cancelKeyboard);
      saveTempMsg(chatId, sent.message_id);
      return;
    }
    tempRegData[chatId].age = text;
    userSteps[chatId] = 'REG_GENDER';
    let sent = await bot.sendMessage(chatId, "👫 <b>Jinsingizni tanlang:</b>", { parse_mode: 'HTML', ...genderInlineKeyboard });
    saveTempMsg(chatId, sent.message_id);
    return;
  }

  if (step === 'REG_PHONE') {
    let phoneNum = msg.contact ? msg.contact.phone_number : text.trim();
    if (!phoneNum.startsWith('+')) phoneNum = '+' + phoneNum;
    tempRegData[chatId].phone = phoneNum;
    userSteps[chatId] = 'REG_PASSWORD';
    let sent = await bot.sendMessage(
      chatId,
      "🔑 <b>Akkaunt uchun parol o'ylab toping:</b>\n\n⚠️ <i>Parol kamida 8 ta belgidan iborat bo'lishi hamda kamida 4 ta harf va 4 ta raqamdan tashkil topishi kerak!</i>",
      { parse_mode: 'HTML', ...cancelKeyboard }
    );
    saveTempMsg(chatId, sent.message_id);
    return;
  }

  if (step === 'REG_PASSWORD') {
    if (!validatePassword(text)) {
      let sent = await bot.sendMessage(
        chatId,
        "❌ <b>Parol talabga javob bermaydi!</b>\n\nIltimos, kamida 8 ta belgili (4 ta harf va 4 ta raqam) parol kiriting:",
        { parse_mode: 'HTML', ...cancelKeyboard }
      );
      saveTempMsg(chatId, sent.message_id);
      return;
    }
    const accKey = tempRegData[chatId].fullName.toLowerCase();
    tempRegData[chatId].password = text;
    tempRegData[chatId].chatId = chatId;
    tempRegData[chatId].registeredAt = Date.now();
    tempRegData[chatId].subject = null;

    userDataStore[accKey] = tempRegData[chatId];
    saveUsersData();

    await clearTempMessages(chatId);
    delete userSteps[chatId];
    return sendSubjectSelection(chatId);
  }

  if (text === '🔑 Akkauntga kirish (Login)') {
    await clearTempMessages(chatId);
    userSteps[chatId] = 'LOGIN_NAME';
    let sent = await bot.sendMessage(chatId, "👤 Ro'yxatdan o'tgan <b>Ism va Familiyangizni</b> kiriting:", { parse_mode: 'HTML', ...cancelKeyboard });
    saveTempMsg(chatId, sent.message_id);
    return;
  }

  if (step === 'LOGIN_NAME') {
    const accKey = text.trim().toLowerCase();
    const foundKey = Object.keys(userDataStore).find(k => k === accKey || k === text.trim());
    if (!foundKey) {
      let sent = await bot.sendMessage(chatId, "❌ <b>Bunday Ism-Familiya bilan akkaunt topilmadi.</b>\n\nQaytadan kiriting:", { parse_mode: 'HTML', ...cancelKeyboard });
      saveTempMsg(chatId, sent.message_id);
      return;
    }
    tempRegData[chatId] = { loginKey: foundKey };
    userSteps[chatId] = 'LOGIN_PASS';
    let sent = await bot.sendMessage(chatId, "🔑 <b>Parolingizni kiriting:</b>", { parse_mode: 'HTML', ...cancelKeyboard });
    saveTempMsg(chatId, sent.message_id);
    return;
  }

  if (step === 'LOGIN_PASS') {
    const accKey = tempRegData[chatId]?.loginKey;
    const userAcc = userDataStore[accKey];
    if (!userAcc || userAcc.password !== text) {
      let sent = await bot.sendMessage(chatId, "❌ <b>Noto'g'ri parol!</b> Qaytadan kiriting:", { parse_mode: 'HTML', ...cancelKeyboard });
      saveTempMsg(chatId, sent.message_id);
      return;
    }

    if (userAcc.kickUntil && Date.now() < userAcc.kickUntil) {
      return bot.sendMessage(chatId, "⚠️ Biz sizni taniymiz, sz berilgan muddat tugasa keyin kira olasz.", authStartKeyboard);
    }

    userAcc.chatId = chatId;
    saveUsersData();

    await clearTempMessages(chatId);
    delete userSteps[chatId];
    delete tempRegData[chatId];

    await bot.sendMessage(chatId, `✅ <b>Akkauntga muvaffaqiyatli kirdingiz!</b>`, { parse_mode: 'HTML' });
    const isSubbed = await checkSub(chatId);
    if (!isSubbed) return sendSubMessage(chatId);

    return bot.sendMessage(chatId, `🌟 <b>Xush kelibsiz, ${escapeHTML(userAcc.fullName)}!</b>\n\nKerakli bo'limni tanlang:`, mainKeyboard(chatId));
  }

  if (!savedUser) {
    return bot.sendMessage(chatId, "⚠️ <b>Botdan foydalanish uchun avval ro'yxatdan o'ting!</b>", { parse_mode: 'HTML', ...authStartKeyboard });
  }

  const isSubbed = await checkSub(chatId);
  if (!isSubbed) return sendSubMessage(chatId);

  if (text === '📚 Barcha Kurslar') {
    await clearTempMessages(chatId);
    if (courses.length === 0) return bot.sendMessage(chatId, "Hozircha kurslar yo'q.", mainKeyboard(chatId));

    await bot.sendMessage(chatId, "👇 Boshqaruv menyusi faol:", mainKeyboard(chatId));
    return bot.sendMessage(
      chatId, 
      `📚 <b>Mavjud kurslar (Jami: ${courses.length} ta):</b>`, 
      { parse_mode: 'HTML', reply_markup: getCoursesPageInlineKeyboard(1) }
    );
  }

  if (text === '🔍 Kurs Qidirish') {
    await clearTempMessages(chatId);
    userSteps[chatId] = 'SEARCH_COURSE';
    let sent = await bot.sendMessage(chatId, "🔍 <b>Qidirilayotgan kurs nomini yozing:</b>", { parse_mode: 'HTML', ...cancelKeyboard });
    saveTempMsg(chatId, sent.message_id);
    return;
  }

  if (step === 'SEARCH_COURSE') {
    await clearTempMessages(chatId);
    delete userSteps[chatId];
    const query = text.toLowerCase().trim();
    const found = courses.filter(c => c.title.toLowerCase().includes(query) || c.description.toLowerCase().includes(query));

    if (found.length === 0) {
      return bot.sendMessage(chatId, `❌ <b>"${escapeHTML(text)}"</b> bo'yicha hech qanday kurs topilmadi.`, { parse_mode: 'HTML', ...mainKeyboard(chatId) });
    }
    let inlineButtons = found.map(c => [{ text: `🎓 ${c.title} (${c.price})`, callback_data: `course_${c.id}` }]);
    await bot.sendMessage(chatId, "👇 Boshqaruv menyusi faol:", mainKeyboard(chatId));
    return bot.sendMessage(chatId, `🔍 <b>Topilgan kurslar (${found.length} ta):</b>`, { parse_mode: 'HTML', reply_markup: { inline_keyboard: inlineButtons } });
  }

  if (text === '👨‍🏫 Ustozlarimiz') {
    await clearTempMessages(chatId);
    let teachersText = "👨‍🏫 <b>Ustozlarimiz:</b>\n\n";
    courses.forEach(c => teachersText += `• <b>${escapeHTML(c.teacher)}</b> — <i>${escapeHTML(c.title)}</i>\n`);
    return bot.sendMessage(chatId, teachersText, { parse_mode: 'HTML', ...mainKeyboard(chatId) });
  }

  if (text === '📞 Bog\'lanish & Manzil') {
    await clearTempMessages(chatId);
    return bot.sendMessage(chatId, `📞 <b>Bog'lanish:</b>\n📱 Tel: +998 (90) 621-44-55\n📍 Kanal: ${REQUIRED_CHANNEL}`, { parse_mode: 'HTML', ...mainKeyboard(chatId) });
  }

  // ADMIN PANELI
  if (isAdmin(chatId)) {
    if (text === '⚙️ Admin Panel') {
      await clearTempMessages(chatId);
      delete userSteps[chatId];
      delete tempTargetUser[chatId];
      return bot.sendMessage(chatId, "⚙️ <b>Admin paneli:</b>", { parse_mode: 'HTML', ...adminKeyboard });
    }

    if (text === '👥 Ro\'yxatdan o\'tganlar') {
      await clearTempMessages(chatId);
      const allUsers = Object.values(userDataStore);
      const now = Date.now();
      const recent15 = allUsers.filter(u => u.registeredAt && (now - u.registeredAt <= 15 * 60 * 1000));
      let msgText = `👥 <b>RO'YXATDAN O'TGANLAR BO'LIMI</b>\n\n` +
                    `📊 Jami foydalanuvchilar: <b>${allUsers.length} ta</b>\n` +
                    `⏱ Oxirgi 15 minutda qo'shilganlar: <b>${recent15.length} ta</b>`;
      return bot.sendMessage(chatId, msgText, { parse_mode: 'HTML', ...adminUsersMenuKeyboard });
    }

    if (text === '📋 Barcha Foydalanuvchilar Listi') {
      await clearTempMessages(chatId);
      const allUsers = Object.values(userDataStore);
      if (allUsers.length === 0) return bot.sendMessage(chatId, "Hozircha ro'yxatdan o'tganlar yo'q.", adminUsersMenuKeyboard);

      await bot.sendMessage(chatId, `📋 <b>RO'YXATDAN O'TGAN FOYDALANUVCHILAR (${allUsers.length} ta):</b>`, { parse_mode: 'HTML', ...adminUsersMenuKeyboard });

      for (let u of allUsers) {
        let userCard = `👤 <b>${escapeHTML(u.fullName)}</b> (${u.role || "O'quvchi"})\n` +
                       `📱 Tel: <code>${u.phone || 'Yo\'q'}</code>\n` +
                       `🎯 Soha: ${u.subject || 'Tanlanmagan'}`;
        
        let userKey = u.fullName.toLowerCase();
        let inlineBtn = [];
        if (u.chatId) {
          inlineBtn.push([{ text: "✉️ Xabar", callback_data: `send_msg_user_${u.chatId}` }]);
          inlineBtn.push([{ text: "⚠️ Ogohlantirish", callback_data: `warn_user_${u.chatId}` }]);
          inlineBtn.push([{ text: "🚫 Kick (Chiqarish)", callback_data: `kick_user_${u.chatId}` }]);
        }
        inlineBtn.push([{ text: "🗑 Ban/O'chirish", callback_data: `ban_user_${encodeURIComponent(userKey)}` }]);

        await bot.sendMessage(chatId, userCard, { parse_mode: 'HTML', reply_markup: { inline_keyboard: inlineBtn } });
      }
      return;
    }

    if (text === '🔍 Foydalanuvchi Qidirish') {
      await clearTempMessages(chatId);
      userSteps[chatId] = 'SEARCH_USER';
      let sent = await bot.sendMessage(chatId, "🔍 <b>Foydalanuvchi Ismi, Telefon raqami yoki Sohasini kiriting:</b>", { parse_mode: 'HTML', ...cancelKeyboard });
      saveTempMsg(chatId, sent.message_id);
      return;
    }

    if (step === 'SEARCH_USER') {
      await clearTempMessages(chatId);
      delete userSteps[chatId];
      const query = text.trim().toLowerCase();
      const allUsers = Object.values(userDataStore);
      const filtered = allUsers.filter(u => (u.fullName && u.fullName.toLowerCase().includes(query)) || (u.phone && u.phone.includes(query)) || (u.subject && u.subject.toLowerCase().includes(query)));
      if (filtered.length === 0) return bot.sendMessage(chatId, "Hech kim topilmadi.", adminUsersMenuKeyboard);

      await bot.sendMessage(chatId, `🔍 <b>Topilgan foydalanuvchilar (${filtered.length} ta):</b>`, { parse_mode: 'HTML', ...adminUsersMenuKeyboard });

      for (let u of filtered) {
        let userCard = `👤 <b>${escapeHTML(u.fullName)}</b> (${u.role || "O'quvchi"})\n` +
                       `📱 Tel: <code>${u.phone || 'Yo\'q'}</code>\n` +
                       `🎯 Soha: ${u.subject || 'Tanlanmagan'}`;
        
        let userKey = u.fullName.toLowerCase();
        let inlineBtn = [];
        if (u.chatId) {
          inlineBtn.push([{ text: "✉️ Xabar", callback_data: `send_msg_user_${u.chatId}` }]);
          inlineBtn.push([{ text: "⚠️ Ogohlantirish", callback_data: `warn_user_${u.chatId}` }]);
          inlineBtn.push([{ text: "🚫 Kick (Chiqarish)", callback_data: `kick_user_${u.chatId}` }]);
        }
        inlineBtn.push([{ text: "🗑 Ban/O'chirish", callback_data: `ban_user_${encodeURIComponent(userKey)}` }]);

        await bot.sendMessage(chatId, userCard, { parse_mode: 'HTML', reply_markup: { inline_keyboard: inlineBtn } });
      }
      return;
    }

    if (step === 'SEND_DIRECT_MSG_USER') {
      await clearTempMessages(chatId);
      delete userSteps[chatId];
      const targetChatId = tempTargetUser[chatId];
      delete tempTargetUser[chatId];

      if (targetChatId) {
        try {
          await bot.sendMessage(targetChatId, `📩 <b>Admin xabari:</b>\n\n${text}`, { parse_mode: 'HTML' });
          return bot.sendMessage(chatId, "✅ <b>Xabar foydalanuvchiga muvaffaqiyatli yetkazildi!</b>", { parse_mode: 'HTML', ...adminKeyboard });
        } catch (e) {
          return bot.sendMessage(chatId, "❌ Xabar yuborishda xatolik yuz berdi.", adminKeyboard);
        }
      }
    }

    if (step === 'WARN_DIRECT_MSG_USER') {
      await clearTempMessages(chatId);
      delete userSteps[chatId];
      const targetChatId = tempTargetUser[chatId];
      delete tempTargetUser[chatId];

      if (targetChatId) {
        try {
          await bot.sendMessage(targetChatId, `⚠️ <b>ADMINSTRATSIYA OGOHLANTIRISHI:</b>\n\n${text}\n\n<i>Iltimos, bot qoidalariga rioya qiling!</i>`, { parse_mode: 'HTML' });
          return bot.sendMessage(chatId, "✅ <b>Ogohlantirish foydalanuvchiga yuborildi!</b>", { parse_mode: 'HTML', ...adminKeyboard });
        } catch (e) {
          return bot.sendMessage(chatId, "❌ Ogohlantirish yuborishda xatolik.", adminKeyboard);
        }
      }
    }

    if (text === '➕ Yangi Kurs Qo\'shish') {
      await clearTempMessages(chatId);
      userSteps[chatId] = 'ADD_COURSE_TITLE';
      tempCourseData[chatId] = {};
      let sent = await bot.sendMessage(chatId, "📝 <b>Yangi kurs nomini kiriting:</b>", { parse_mode: 'HTML', ...cancelKeyboard });
      saveTempMsg(chatId, sent.message_id);
      return;
    }

    if (step === 'ADD_COURSE_TITLE') {
      tempCourseData[chatId].title = text.trim();
      userSteps[chatId] = 'ADD_COURSE_TEACHER';
      let sent = await bot.sendMessage(chatId, "👨‍🏫 <b>Ustoz ism-sharifini kiriting:</b>", { parse_mode: 'HTML', ...cancelKeyboard });
      saveTempMsg(chatId, sent.message_id);
      return;
    }

    if (step === 'ADD_COURSE_TEACHER') {
      tempCourseData[chatId].teacher = text.trim();
      userSteps[chatId] = 'ADD_COURSE_DESC';
      let sent = await bot.sendMessage(chatId, "📄 <b>Kurs haqida ma'lumot yozing:</b>", { parse_mode: 'HTML', ...cancelKeyboard });
      saveTempMsg(chatId, sent.message_id);
      return;
    }

    if (step === 'ADD_COURSE_DESC') {
      tempCourseData[chatId].description = text.trim();
      userSteps[chatId] = 'ADD_COURSE_PRICE';
      let sent = await bot.sendMessage(chatId, "💰 <b>Kurs narxini kiriting:</b>\n\n<i>(Agar narxsiz yoki bepul bo'lsa, pastdagi tugmani bosing)</i>", { parse_mode: 'HTML', ...priceKeyboard });
      saveTempMsg(chatId, sent.message_id);
      return;
    }

    if (step === 'ADD_COURSE_PRICE') {
      if (text === '⏭ Narxni tashlab ketish (Tekinga qo\'yish)') {
        tempCourseData[chatId].price = "Bepul";
      } else {
        tempCourseData[chatId].price = text.trim();
      }

      const newId = courses.length > 0 ? Math.max(...courses.map(c => c.id)) + 1 : 1;
      const newCourse = {
        id: newId,
        title: tempCourseData[chatId].title,
        teacher: tempCourseData[chatId].teacher,
        description: tempCourseData[chatId].description,
        price: tempCourseData[chatId].price,
        videos: []
      };
      courses.push(newCourse);
      saveCoursesData();

      await clearTempMessages(chatId);
      delete userSteps[chatId];
      delete tempCourseData[chatId];
      return bot.sendMessage(chatId, `✅ <b>"${newCourse.title}" kursi muvaffaqiyatli qo'shildi!</b>`, { parse_mode: 'HTML', ...adminKeyboard });
    }

    if (text === '✏️ Kursni Tahrirlash') {
      await clearTempMessages(chatId);
      if (courses.length === 0) return bot.sendMessage(chatId, "Tahrirlash uchun kurslar mavjud emas.", adminKeyboard);
      let inlineButtons = courses.map(c => [{ text: `✏️ ${c.title}`, callback_data: `edit_course_${c.id}` }]);
      
      await bot.sendMessage(chatId, "⚙️ Admin menyusi faol:", adminKeyboard);
      return bot.sendMessage(chatId, "✏️ <b>Qaysi kursni tahrirlamoqchisiz? Tanlang:</b>", { parse_mode: 'HTML', reply_markup: { inline_keyboard: inlineButtons } });
    }

    if (step === 'EDIT_FIELD_VALUE') {
      const { courseId, field } = tempCourseData[chatId];
      const course = courses.find(c => c.id === courseId);
      if (course) {
        course[field] = text.trim();
        saveCoursesData();
        await clearTempMessages(chatId);
        delete userSteps[chatId];
        delete tempCourseData[chatId];
        return bot.sendMessage(chatId, `✅ <b>Kurs ma'lumoti muvaffaqiyatli tahrirlandi!</b>`, { parse_mode: 'HTML', ...adminKeyboard });
      }
    }

    if (text === '📹 Dars/Video Qo\'shish') {
      await clearTempMessages(chatId);
      if (courses.length === 0) return bot.sendMessage(chatId, "Video qo'shish uchun avval kurs yarating!", adminKeyboard);
      let inlineButtons = courses.map(c => [{ text: c.title, callback_data: `add_vid_course_${c.id}` }]);
      
      await bot.sendMessage(chatId, "⚙️ Admin menyusi faol:", adminKeyboard);
      return bot.sendMessage(chatId, "📹 <b>Qaysi kursga video qo'shmoqchisiz? Tanlang:</b>", { parse_mode: 'HTML', reply_markup: { inline_keyboard: inlineButtons } });
    }

    if (step === 'ADD_VIDEO_TITLE') {
      tempCourseData[chatId].videoTitle = text.trim();
      userSteps[chatId] = 'ADD_VIDEO_FILE';
      let sent = await bot.sendMessage(chatId, "🎥 <b>Videoni yuboring:</b>\n<i>(Barcha turdagi video MP4, fayl, giff yoki video xabarlar qabul qilinadi)</i>", { parse_mode: 'HTML', ...cancelKeyboard });
      saveTempMsg(chatId, sent.message_id);
      return;
    }

    if (step === 'ADD_VIDEO_FILE') {
      const fileId = msg.video?.file_id || 
                     msg.document?.file_id || 
                     msg.video_note?.file_id || 
                     msg.animation?.file_id;

      if (!fileId) {
        let sent = await bot.sendMessage(chatId, "⚠️ Iltimos, video fayl yuboring!", cancelKeyboard);
        saveTempMsg(chatId, sent.message_id);
        return;
      }

      const courseId = tempCourseData[chatId].courseId;
      const course = courses.find(c => c.id === courseId);
      if (course) {
        if (!course.videos) course.videos = [];
        course.videos.push({
          id: course.videos.length + 1,
          title: tempCourseData[chatId].videoTitle,
          fileId: fileId
        });
        saveCoursesData();
        await clearTempMessages(chatId);
        delete userSteps[chatId];
        delete tempCourseData[chatId];
        return bot.sendMessage(chatId, `✅ <b>Dars videosi muvaffaqiyatli qo'shildi!</b>`, { parse_mode: 'HTML', ...adminKeyboard });
      }
    }

    if (text === '🗑 Kursni O\'chirish') {
      await clearTempMessages(chatId);
      if (courses.length === 0) return bot.sendMessage(chatId, "O'chirish uchun kurslar mavjud emas.", adminKeyboard);
      let inlineButtons = courses.map(c => [{ text: `🗑 ${c.title}`, callback_data: `delete_course_${c.id}` }]);
      
      await bot.sendMessage(chatId, "⚙️ Admin menyusi faol:", adminKeyboard);
      return bot.sendMessage(chatId, "🗑 <b>O'chirmoqchi bo'lgan kursingizni tanlang:</b>", { parse_mode: 'HTML', reply_markup: { inline_keyboard: inlineButtons } });
    }

    if (text === '📢 E\'lon Yuborish') {
      await clearTempMessages(chatId);
      userSteps[chatId] = 'BROADCAST_MSG';
      let sent = await bot.sendMessage(chatId, "📢 <b>Barcha foydalanuvchilarga yuboriladigan e'lon matnini kiriting:</b>", { parse_mode: 'HTML', ...cancelKeyboard });
      saveTempMsg(chatId, sent.message_id);
      return;
    }

    if (step === 'BROADCAST_MSG') {
      await clearTempMessages(chatId);
      delete userSteps[chatId];
      const allUsers = Object.values(userDataStore);
      let count = 0;
      for (let u of allUsers) {
        if (u.chatId) {
          try {
            await bot.sendMessage(u.chatId, `📢 <b>E'lon:</b>\n\n${text}`, { parse_mode: 'HTML' });
            count++;
          } catch(e) {}
        }
      }
      return bot.sendMessage(chatId, `✅ E'lon <b>${count} ta</b> foydalanuvchiga muvaffaqiyatli yuborildi!`, { parse_mode: 'HTML', ...adminKeyboard });
    }

    if (text === '📊 Statistika') {
      await clearTempMessages(chatId);
      const userCount = Object.keys(userDataStore).length;
      const courseCount = courses.length;
      let totalVids = 0;
      courses.forEach(c => totalVids += (c.videos ? c.videos.length : 0));

      let statText = `📊 <b>BOT STATISTIKASI:</b>\n\n` +
                     `👥 Foydalanuvchilar: <b>${userCount} ta</b>\n` +
                     `📚 Kurslar: <b>${courseCount} ta</b>\n` +
                     `📹 Jami dars videolari: <b>${totalVids} ta</b>`;
      return bot.sendMessage(chatId, statText, { parse_mode: 'HTML', ...adminKeyboard });
    }
  }
});

// CALLBACK QUERY HANDLER
bot.on('callback_query', async (query) => {
  const chatId = query.message.chat.id;
  const data = query.data;

  try { await bot.answerCallbackQuery(query.id); } catch(e) {}

  if (data === 'check_subscription') {
    const isSubbed = await checkSub(chatId);
    if (isSubbed) {
      try { await bot.deleteMessage(chatId, query.message.message_id); } catch(e) {}
      await bot.sendMessage(chatId, "✅ Rahmat! Kanalimizga muvaffaqiyatli a'zo bo'ldingiz.");
      return bot.sendMessage(chatId, "👇 Kerakli bo'limni tanlang:", mainKeyboard(chatId));
    } else {
      return bot.answerCallbackQuery(query.id, { text: "❌ Siz hali kanalga a'zo bo'lmadingiz!", show_alert: true });
    }
  }

  if (data.startsWith('gender_')) {
    const gender = data.split('_')[1];
    if (tempRegData[chatId]) {
      tempRegData[chatId].gender = gender;
      userSteps[chatId] = 'REG_PHONE';
      try { await bot.deleteMessage(chatId, query.message.message_id); } catch (e) {}
      let sent = await bot.sendMessage(
        chatId,
        "📱 <b>Telefon raqamingizni yuboring:</b>",
        { parse_mode: 'HTML', ...phoneShareKeyboard }
      );
      saveTempMsg(chatId, sent.message_id);
    }
  }

  // SOHA TANLANGANDAN SO'NG O'TISH
  if (data.startsWith('select_subject_')) {
    const subIndex = parseInt(data.split('_')[2]);
    const selectedSubject = SUBJECTS[subIndex];
    const userAcc = getUserByChatId(chatId);

    if (userAcc) {
      userAcc.subject = selectedSubject;
      saveUsersData();
    }
    try { await bot.deleteMessage(chatId, query.message.message_id); } catch (e) {}

    const welcomeHeader = 
      `🌟 Xush kelibsiz, ${escapeHTML(userAcc ? userAcc.fullName : '')}!\n\n` +
      `Bizning <b>"Intellekt"</b> ta'lim oilamizga xush kelibsiz! 🚀\n\n` +
      `🎯 Tanlangan sohangiz: <b>${selectedSubject}</b>\n\n`;

    delete tempRegData[chatId];

    // Obuna bo'lmagan bo'lsa, xabarga inline-kanal tugmalarini ulaydi
    const isSubbed = await checkSub(chatId);
    if (!isSubbed) {
      return sendSubMessage(chatId, welcomeHeader);
    }

    return bot.sendMessage(chatId, `${welcomeHeader}👇 Kerakli bo'limni tanlang:`, { parse_mode: 'HTML', ...mainKeyboard(chatId) });
  }

  if (data.startsWith('courses_page_')) {
    const page = parseInt(data.split('_')[2]);
    try {
      await bot.editMessageReplyMarkup(
        getCoursesPageInlineKeyboard(page),
        { chat_id: chatId, message_id: query.message.message_id }
      );
    } catch(e) {}
    return;
  }

  if (data === 'ignore_page_click') {
    return;
  }

  if (data.startsWith('send_msg_user_')) {
    const targetChatId = parseInt(data.split('_')[3]);
    const userAcc = getUserByChatId(targetChatId);
    tempTargetUser[chatId] = targetChatId;
    userSteps[chatId] = 'SEND_DIRECT_MSG_USER';

    let sent = await bot.sendMessage(
      chatId, 
      `✍️ <b>${escapeHTML(userAcc ? userAcc.fullName : 'Foydalanuvchi')}</b> uchun xabaringizni yozing:`, 
      { parse_mode: 'HTML', ...cancelKeyboard }
    );
    saveTempMsg(chatId, sent.message_id);
    return;
  }

  if (data.startsWith('warn_user_')) {
    const targetChatId = parseInt(data.split('_')[2]);
    const userAcc = getUserByChatId(targetChatId);
    tempTargetUser[chatId] = targetChatId;
    userSteps[chatId] = 'WARN_DIRECT_MSG_USER';

    let sent = await bot.sendMessage(
      chatId,
      `⚠️ <b>${escapeHTML(userAcc ? userAcc.fullName : 'Foydalanuvchi')}</b>ga yuboriladigan ogohlantirish sababini yozing:`,
      { parse_mode: 'HTML', ...cancelKeyboard }
    );
    saveTempMsg(chatId, sent.message_id);
    return;
  }

  if (data.startsWith('kick_user_')) {
    const targetChatId = parseInt(data.split('_')[2]);
    const allUsers = Object.values(userDataStore);
    const userAcc = allUsers.find(u => u.chatId === targetChatId);

    if (userAcc) {
      userAcc.kickUntil = Date.now() + (2 * 24 * 60 * 60 * 1000); // 2 kunlik vaqt
      saveUsersData();

      try {
        await bot.sendMessage(
          targetChatId, 
          "⚠️ <b>Siz admin tomonidan noxush tebranishni sezdik va siz endi 2 kundan keyin kirishingiz mumkin.</b>\n\n⏳ <i>Sizga chiqib ketish uchun 20 sekund vaqt berildi!</i>", 
          { parse_mode: 'HTML' }
        );
      } catch(e) {}

      // 20 sekunddan keyin botdan chopish
      setTimeout(async () => {
        try {
          userAcc.chatId = null;
          saveUsersData();
          await bot.sendMessage(targetChatId, "🚪 Vaqt tugadi. Siz botdan chiqarildingiz.", authStartKeyboard);
        } catch(e) {}
      }, 20000);
    }

    return bot.sendMessage(chatId, `✅ <b>Foydalanuvchiga 20 sekundlik ogohlantirish yuborildi.</b>`, { parse_mode: 'HTML', ...adminKeyboard });
  }

  if (data.startsWith('ban_user_')) {
    const userKey = decodeURIComponent(data.split('_')[2]);
    const userAcc = userDataStore[userKey];

    if (userAcc) {
      if (userAcc.chatId) {
        try {
          await bot.sendMessage(userAcc.chatId, "🚫 <b>Sizning akkauntingiz admin tomonidan butunlay o'chirildi va taqiqlandi!</b>", { parse_mode: 'HTML', ...authStartKeyboard });
        } catch(e) {}
      }
      delete userDataStore[userKey];
      saveUsersData();
      return bot.sendMessage(chatId, `🗑 <b>Foydalanuvchi va uning barcha ma'lumotlari bazadan butunlay o'chirildi (Ban qilindi).</b>`, { parse_mode: 'HTML', ...adminKeyboard });
    } else {
      return bot.sendMessage(chatId, "❌ Foydalanuvchi topilmadi.", adminKeyboard);
    }
  }

  if (data.startsWith('course_')) {
    const courseId = parseInt(data.split('_')[1]);
    const course = courses.find(c => c.id === courseId);
    if (!course) return;

    let text = `🎓 <b>${escapeHTML(course.title)}</b>\n\n` +
               `👨‍🏫 Ustoz: <b>${escapeHTML(course.teacher)}</b>\n` +
               `💰 Narxi: <b>${escapeHTML(course.price)}</b>\n\n` +
               `📄 <i>${escapeHTML(course.description)}</i>\n\n` +
               `📹 <b>Darslar soni:</b> ${course.videos ? course.videos.length : 0} ta`;

    let inlineButtons = [];
    if (course.videos && course.videos.length > 0) {
      course.videos.forEach(v => {
        inlineButtons.push([{ text: `▶️ ${v.title}`, callback_data: `watch_vid_${course.id}_${v.id}` }]);
      });
    }

    return bot.sendMessage(chatId, text, { parse_mode: 'HTML', reply_markup: { inline_keyboard: inlineButtons } });
  }

  if (data.startsWith('watch_vid_')) {
    const parts = data.split('_');
    const courseId = parseInt(parts[2]);
    const vidId = parseInt(parts[3]);
    const course = courses.find(c => c.id === courseId);
    const video = course ? course.videos.find(v => v.id === vidId) : null;

    if (video) {
      return bot.sendVideo(chatId, video.fileId, { caption: `🎥 <b>${escapeHTML(video.title)}</b>`, parse_mode: 'HTML' });
    }
  }

  if (data.startsWith('edit_course_')) {
    const courseId = parseInt(data.split('_')[2]);
    const course = courses.find(c => c.id === courseId);
    if (course) {
      const inlineButtons = [
        [{ text: "📝 Nomini tahrirlash", callback_data: `edit_field_${courseId}_title` }],
        [{ text: "👨‍🏫 Ustozni tahrirlash", callback_data: `edit_field_${courseId}_teacher` }],
        [{ text: "📄 Tavsifni tahrirlash", callback_data: `edit_field_${courseId}_description` }],
        [{ text: "💰 Narxni tahrirlash", callback_data: `edit_field_${courseId}_price` }]
      ];
      try { await bot.deleteMessage(chatId, query.message.message_id); } catch(e) {}
      return bot.sendMessage(chatId, `✏️ <b>"${course.title}" kursining qaysi ma'lumotini o'zgartirmoqchisiz?</b>`, { parse_mode: 'HTML', reply_markup: { inline_keyboard: inlineButtons } });
    }
  }

  if (data.startsWith('edit_field_')) {
    const parts = data.split('_');
    const courseId = parseInt(parts[2]);
    const field = parts[3];

    tempCourseData[chatId] = { courseId, field };
    userSteps[chatId] = 'EDIT_FIELD_VALUE';

    try { await bot.deleteMessage(chatId, query.message.message_id); } catch(e) {}
    let sent = await bot.sendMessage(chatId, `✍️ <b>Yangi qiymatni kiriting:</b>`, { parse_mode: 'HTML', ...cancelKeyboard });
    saveTempMsg(chatId, sent.message_id);
  }

  if (data.startsWith('add_vid_course_')) {
    const courseId = parseInt(data.split('_')[3]);
    tempCourseData[chatId] = { courseId: courseId };
    userSteps[chatId] = 'ADD_VIDEO_TITLE';
    try { await bot.deleteMessage(chatId, query.message.message_id); } catch(e) {}
    let sent = await bot.sendMessage(chatId, "📹 <b>Dars/Video nomini kiriting:</b>", { parse_mode: 'HTML', ...cancelKeyboard });
    saveTempMsg(chatId, sent.message_id);
  }

  if (data.startsWith('delete_course_')) {
    const courseId = parseInt(data.split('_')[2]);
    courses = courses.filter(c => c.id !== courseId);
    saveCoursesData();
    try { await bot.deleteMessage(chatId, query.message.message_id); } catch(e) {}
    return bot.sendMessage(chatId, "✅ <b>Kurs muvaffaqiyatli o'chirildi!</b>", { parse_mode: 'HTML', ...adminKeyboard });
  }
});

console.log('🚀 Bot muvaffaqiyatli ishga tushdi...');
