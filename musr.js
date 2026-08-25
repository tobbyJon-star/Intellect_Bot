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

function isAdmin(chatId) {
  return ADMIN_IDS.includes(chatId);
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
let activeSessions = {};
let userSteps = {};
let tempRegData = {};
let tempCourseData = {};
let tempMessages = {};

function validatePassword(pass) {
  if (pass.length < 8) return false;
  const letters = (pass.match(/[a-zA-Z]/g) || []).length;
  const digits = (pass.match(/[0-9]/g) || []).length;
  return letters >= 4 && digits >= 4;
}

const mainKeyboard = (chatId) => {
  const buttons = [
    ['📚 Barcha Kurslar', '👨‍🏫 Ustozlarimiz'],
    ['🔍 Kurs Qidirish', '📞 Bog\'lanish & Manzil']
  ];

  if (isAdmin(chatId)) {
    buttons.push(['⚙️ Admin Panel']);
  }

  return {
    reply_markup: {
      keyboard: buttons,
      resize_keyboard: true
    }
  };
};

const roleKeyboard = {
  reply_markup: {
    keyboard: [
      ['👨‍🎓 O\'quvchi', '👨‍🏫 O\'qituvchi'],
      ['❌ Bekor qilish']
    ],
    resize_keyboard: true
  }
};

const phoneShareKeyboard = {
  reply_markup: {
    keyboard: [
      [{ text: "📱 Telefon raqamimni yuborish", request_contact: true }],
      ['❌ Bekor qilish']
    ],
    resize_keyboard: true,
    one_time_keyboard: true
  }
};

const genderInlineKeyboard = {
  reply_markup: {
    inline_keyboard: [
      [
        { text: "👨 Erkak", callback_data: "gender_Erkak" },
        { text: "👩 Ayol", callback_data: "gender_Ayol" }
      ]
    ]
  }
};

const adminKeyboard = {
  reply_markup: {
    keyboard: [
      ['👥 Ro\'yxatdan o\'tganlar', '🔍 Foydalanuvchi Qidirish'],
      ['➕ Yangi Kurs Qo\'shish', '📹 Dars/Video Qo\'shish'],
      ['✏️ Kursni Tahrirlash', '🗑 Kursni O\'chirish'],
      ['📢 E\'lon Yuborish', '📊 Statistika'],
      ['◀️ Bosh Menyu']
    ],
    resize_keyboard: true
  }
};

const adminUsersMenuKeyboard = {
  reply_markup: {
    keyboard: [
      ['📋 Barcha Foydalanuvchilar Listi', '🔍 Foydalanuvchi Qidirish'],
      ['◀️ Admin Panel']
    ],
    resize_keyboard: true
  }
};

const cancelKeyboard = {
  reply_markup: {
    keyboard: [['❌ Bekor qilish']],
    resize_keyboard: true
  }
};

const authStartKeyboard = {
  reply_markup: {
    keyboard: [
      ['📝 Ro\'yxatdan o\'tish', '🔑 Akkauntga kirish (Login)']
    ],
    resize_keyboard: true
  }
};

async function checkSub(chatId) {
  try {
    const member = await bot.getChatMember(REQUIRED_CHANNEL, chatId);
    return ['creator', 'administrator', 'member'].includes(member.status);
  } catch (e) {
    return true;
  }
}

async function sendSubMessage(chatId) {
  return bot.sendMessage(
    chatId,
    `📢 <b>Botdan foydalanish uchun rasmiy guruhimizga a'zo bo'ling:</b>\n\n${REQUIRED_CHANNEL}`,
    {
      parse_mode: 'HTML',
      reply_markup: {
        inline_keyboard: [
          [{ text: "📢 Guruhga o'tish", url: `https://t.me/${REQUIRED_CHANNEL.replace('@', '')}` }],
          [{ text: "✅ A'zolikni tekshirish", callback_data: "check_subscription" }]
        ]
      }
    }
  );
}

async function clearTempMessages(chatId) {
  if (tempMessages[chatId] && tempMessages[chatId].length > 0) {
    for (let msgId of tempMessages[chatId]) {
      try {
        await bot.deleteMessage(chatId, msgId);
      } catch (e) {}
    }
    tempMessages[chatId] = [];
  }
}

function saveTempMsg(chatId, msgId) {
  if (!tempMessages[chatId]) tempMessages[chatId] = [];
  tempMessages[chatId].push(msgId);
}

async function sendSubjectSelection(chatId) {
  const inlineButtons = SUBJECTS.map((sub, index) => [
    { text: sub, callback_data: `select_subject_${index}` }
  ]);

  return bot.sendMessage(chatId, "🎯 <b>Qaysi soha yoki fan sizni ko'proq qiziqtiradi?</b>\n\nQuyidagilardan birini tanlang:", {
    parse_mode: 'HTML',
    reply_markup: { inline_keyboard: inlineButtons }
  });
}

bot.on('message', async (msg) => {
  const chatId = msg.chat.id;
  const text = msg.text || '';
  const msgId = msg.message_id;

  if (text === '❌ Bekor qilish' || text === '/start' || text === '◀️ Bosh Menyu') {
    await clearTempMessages(chatId);
    delete userSteps[chatId];
    delete tempCourseData[chatId];
    delete tempRegData[chatId];

    if (text === '❌ Bekor qilish') {
      return bot.sendMessage(
        chatId, 
        "Jarayon bekor qilindi.", 
        activeSessions[chatId] ? (isAdmin(chatId) ? adminKeyboard : mainKeyboard(chatId)) : authStartKeyboard
      );
    }

    if (!activeSessions[chatId]) {
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
      `🌟 <b>Xush kelibsiz!</b>\n\nKerakli bo'limni tanlang:`,
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

    if (!phoneNum.startsWith('+')) {
      phoneNum = '+' + phoneNum;
    }

    tempRegData[chatId].phone = phoneNum;
    userSteps[chatId] = 'REG_PASSWORD';

    let sent = await bot.sendMessage(
      chatId,
      "🔑 <b>Akkaunt uchun parol o'ylab toping:</b>\n\n" +
      "⚠️ <i>Parol kamida 8 ta belgidan iborat bo'lishi hamda kamida 4 ta harf va 4 ta raqamdan tashkil topishi kerak!</i>",
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

    activeSessions[chatId] = accKey;

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
      let sent = await bot.sendMessage(chatId, "❌ <b>Bunday Ism-Familiya bilan akkaunt topilmadi.</b>\n\nQaytadan kiriting yoki <b>❌ Bekor qilish</b> tugmasini bosing:", { parse_mode: 'HTML', ...cancelKeyboard });
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

    userAcc.chatId = chatId;
    saveUsersData();
    activeSessions[chatId] = accKey;

    await clearTempMessages(chatId);
    delete userSteps[chatId];
    delete tempRegData[chatId];

    await bot.sendMessage(chatId, `✅ <b>Akkauntga muvaffaqiyatli kirdingiz!</b>\n👤 Rolingiz: <b>${userAcc.role || "O'quvchi"}</b>`, { parse_mode: 'HTML' });

    const isSubbed = await checkSub(chatId);
    if (!isSubbed) return sendSubMessage(chatId);

    return bot.sendMessage(chatId, "🌟 <b>Xush kelibsiz!</b> Kerakli bo'limni tanlang:", mainKeyboard(chatId));
  }

  if (!activeSessions[chatId]) {
    return bot.sendMessage(chatId, "⚠️ <b>Botdan foydalanish uchun avval ro'yxatdan o'ting!</b>", { parse_mode: 'HTML', ...authStartKeyboard });
  }

  const isSubbed = await checkSub(chatId);
  if (!isSubbed) return sendSubMessage(chatId);

  if (text === '📚 Barcha Kurslar') {
    await clearTempMessages(chatId);
    if (courses.length === 0) return bot.sendMessage(chatId, "Hozircha kurslar yo'q.", mainKeyboard(chatId));

    let inlineButtons = courses.map(c => [{ text: `🎓 ${c.title} (${c.price})`, callback_data: `course_${c.id}` }]);
    return bot.sendMessage(chatId, "👇 <b>Mavjud kurslar:</b>", { parse_mode: 'HTML', reply_markup: { inline_keyboard: inlineButtons } });
  }

  if (text === '👨‍🏫 Ustozlarimiz') {
    await clearTempMessages(chatId);
    let teachersText = "👨‍🏫 <b>Ustozlarimiz:</b>\n\n";
    courses.forEach(c => teachersText += `• <b>${escapeHTML(c.teacher)}</b> — <i>${escapeHTML(c.title)}</i>\n`);
    return bot.sendMessage(chatId, teachersText, { parse_mode: 'HTML', ...mainKeyboard(chatId) });
  }

  if (text === '📞 Bog\'lanish & Manzil') {
    await clearTempMessages(chatId);
    return bot.sendMessage(chatId, `📞 <b>Bog'lanish:</b>\n📱 Tel: +998 (90) 621-44-55\n📍 Guruh: ${REQUIRED_CHANNEL}`, { parse_mode: 'HTML', ...mainKeyboard(chatId) });
  }

  // ADMIN PANELI
  if (isAdmin(chatId)) {
    if (text === '⚙️ Admin Panel' || text === '◀️ Admin Panel') {
      await clearTempMessages(chatId);
      delete userSteps[chatId];
      return bot.sendMessage(chatId, "⚙️ <b>Admin paneli:</b>", { parse_mode: 'HTML', ...adminKeyboard });
    }

    if (text === '👥 Ro\'yxatdan o\'tganlar') {
      await clearTempMessages(chatId);
      const allUsers = Object.values(userDataStore);
      const now = Date.now();
      const fifteenMinMs = 15 * 60 * 1000;

      const recent15 = allUsers.filter(u => u.registeredAt && (now - u.registeredAt <= fifteenMinMs));

      let msgText = `👥 <b>RO'YXATDAN O'TGANLAR BO'LIMI</b>\n\n` +
                    `📊 Jami foydalanuvchilar: <b>${allUsers.length} ta</b>\n` +
                    `⏱ Oxirgi 15 minutda qo'shilganlar: <b>${recent15.length} ta</b>\n\n` +
                    `Quyidagi tugmalardan birini tanlang:`;

      return bot.sendMessage(chatId, msgText, { parse_mode: 'HTML', ...adminUsersMenuKeyboard });
    }

    if (text === '📋 Barcha Foydalanuvchilar Listi') {
      await clearTempMessages(chatId);
      const allUsers = Object.values(userDataStore);
      if (allUsers.length === 0) return bot.sendMessage(chatId, "Hozircha ro'yxatdan o'tganlar yo'q.", adminUsersMenuKeyboard);

      let msgText = `📋 <b>RO'YXATDAN O'TGAN FOYDALANUVCHILAR:</b>\n\n`;
      const now = Date.now();
      const fifteenMinMs = 15 * 60 * 1000;

      allUsers.forEach((u, idx) => {
        const isNew = u.registeredAt && (now - u.registeredAt <= fifteenMinMs);
        msgText += `${idx + 1}. <b>${escapeHTML(u.fullName)}</b> (${u.role || "O'quvchi"}) ${isNew ? '🆕 [Yangi - 15 daqiqa ichida]' : ''}\n` +
                   `📱 Tel: <code>${u.phone || 'Yo\'q'}</code>\n` +
                   `🎯 Soha: ${u.subject || 'Tanlanmagan'}\n\n`;
      });

      return bot.sendMessage(chatId, msgText, { parse_mode: 'HTML', ...adminUsersMenuKeyboard });
    }

    // 🔍 FOYDALANUVCHI QIDIRISH (BUYRUQ)
    if (text === '🔍 Foydalanuvchi Qidirish') {
      await clearTempMessages(chatId);
      userSteps[chatId] = 'SEARCH_USER';
      let sent = await bot.sendMessage(
        chatId, 
        "🔍 <b>Foydalanuvchini qidirish:</b>\n\nQidirilayotgan foydalanuvchining <b>Ismi</b>, <b>Telefon raqami</b> yoki <b>Sohasini</b> yozing:", 
        { parse_mode: 'HTML', ...cancelKeyboard }
      );
      saveTempMsg(chatId, sent.message_id);
      return;
    }

    // 🔍 FOYDALANUVCHI QIDIRISH (MATN KELGANDA)
    if (step === 'SEARCH_USER') {
      await clearTempMessages(chatId);
      delete userSteps[chatId];

      const query = text.trim().toLowerCase();
      const allUsers = Object.values(userDataStore);

      const filteredUsers = allUsers.filter(u => {
        const nameMatch = u.fullName && u.fullName.toLowerCase().includes(query);
        const phoneMatch = u.phone && u.phone.toLowerCase().includes(query);
        const subjectMatch = u.subject && u.subject.toLowerCase().includes(query);
        return nameMatch || phoneMatch || subjectMatch;
      });

      if (filteredUsers.length === 0) {
        return bot.sendMessage(
          chatId, 
          `❌ <b>"${escapeHTML(text)}"</b> bo'yicha hech qanday foydalanuvchi topilmadi.`, 
          { parse_mode: 'HTML', ...adminUsersMenuKeyboard }
        );
      }

      let resultText = `🔍 <b>QIDIRUV NATIJALARI (${filteredUsers.length} ta):</b>\n\n`;
      filteredUsers.forEach((u, idx) => {
        resultText += `${idx + 1}. <b>${escapeHTML(u.fullName)}</b> (${u.role || "O'quvchi"})\n` +
                      `🎂 Yoshi: ${u.age || 'Kiritilmagan'}\n` +
                      `👫 Jinsi: ${u.gender || 'Kiritilmagan'}\n` +
                      `📱 Tel: <code>${u.phone || 'Yo\'q'}</code>\n` +
                      `🎯 Soha: ${u.subject || 'Tanlanmagan'}\n\n`;
      });

      return bot.sendMessage(chatId, resultText, { parse_mode: 'HTML', ...adminUsersMenuKeyboard });
    }
  }
});

bot.on('callback_query', async (query) => {
  const chatId = query.message.chat.id;
  const data = query.data;

  try { await bot.answerCallbackQuery(query.id); } catch(e) {}

  if (data === 'check_subscription') {
    const isSubbed = await checkSub(chatId);
    if (isSubbed) {
      try { await bot.deleteMessage(chatId, query.message.message_id); } catch(e) {}
      bot.sendMessage(chatId, "✅ Rahmat! Guruhga a'zo bo'ldingiz.", mainKeyboard(chatId));
    } else {
      bot.answerCallbackQuery(query.id, { text: "❌ Siz hali guruhga a'zo bo'lmadingiz!", show_alert: true });
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
        "📱 <b>Telefon raqamingizni yuboring:</b>\n\n<i>Pastdagi \"📱 Telefon raqamimni yuborish\" tugmasini bosing:</i>",
        { parse_mode: 'HTML', ...phoneShareKeyboard }
      );
      saveTempMsg(chatId, sent.message_id);
    }
  }

  if (data.startsWith('select_subject_')) {
    const subIndex = parseInt(data.split('_')[2]);
    const selectedSubject = SUBJECTS[subIndex];

    const accKey = activeSessions[chatId];
    let userAcc = null;

    if (accKey && userDataStore[accKey]) {
      userDataStore[accKey].subject = selectedSubject;
      userAcc = userDataStore[accKey];
      saveUsersData();
    }

    try { await bot.deleteMessage(chatId, query.message.message_id); } catch (e) {}

    const welcomeText = 
      `🌟 <b>Xush kelibsiz, ${escapeHTML(userAcc ? userAcc.fullName : '')}!</b>\n\n` +
      `Bizning <b>"Intellekt"</b> ta'lim oilamizga xush kelibsiz! 🚀\n\n` +
      `🎯 Tanlangan sohangiz: <b>${selectedSubject}</b>`;

    await bot.sendMessage(chatId, welcomeText, { parse_mode: 'HTML' });

    delete tempRegData[chatId];

    const isSubbed = await checkSub(chatId);
    if (!isSubbed) return sendSubMessage(chatId);

    return bot.sendMessage(chatId, "👇 Kerakli bo'limni tanlang:", mainKeyboard(chatId));
  }
});

console.log('🚀 Bot muvaffaqiyatli ishga tushdi...');
