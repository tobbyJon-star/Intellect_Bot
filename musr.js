import TelegramBot from 'node-telegram-bot-api';

const TOKEN = "8753920376:AAEXJenUZbM-GqAY2rI-oA-LDVgThBFRJhI"; 
const ADMIN_ID = 5631424867;

const bot = new TelegramBot(TOKEN, {
  polling: {
    interval: 300,
    autoStart: true,
    params: { timeout: 10 }
  }
});

process.on('uncaughtException', (err) => console.error('Uncaught Exception:', err));
process.on('unhandledRejection', (reason) => console.error('Unhandled Rejection:', reason));

bot.on('polling_error', (error) => {
  if (error.code !== 'EFATAL') console.log('Qayta ulanmoqda...');
});

function escapeHTML(str = '') {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

let courses = [
  {
    id: 1,
    title: "Node.js va Telegram Botlar",
    teacher: "Jasur Rahmatov",
    description: "Noldan professional botlar yaratish va serverga joylash kursi.",
    price: "250,000 so'm",
    videos: []
  }
];

let users = new Set();
let userSteps = {};
let tempCourseData = {};
let tempMessages = {};

const mainKeyboard = (chatId) => {
  const buttons = [
    ['📚 Barcha Kurslar', '👨‍🏫 Ustozlarimiz'],
    ['🔍 Kurs Qidirish', '📞 Bog\'lanish & Manzil']
  ];

  if (chatId === ADMIN_ID) {
    buttons.push(['⚙️ Admin Panel']);
  }

  return {
    reply_markup: {
      keyboard: buttons,
      resize_keyboard: true
    }
  };
};

const adminKeyboard = {
  reply_markup: {
    keyboard: [
      ['➕ Yangi Kurs Qo\'shish', '📹 Dars/Video Qo\'shish'],
      ['✏️ Kursni Tahrirlash', '🗑 Kursni O\'chirish'],
      ['📢 E\'lon Yuborish', '📊 Statistika'],
      ['◀️ Bosh Menyu']
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

bot.on('message', async (msg) => {
  const chatId = msg.chat.id;
  const text = msg.text || '';
  const msgId = msg.message_id;
  const step = userSteps[chatId];

  users.add(chatId);

  if (step) {
    saveTempMsg(chatId, msgId);
  }

  if (text === '❌ Bekor qilish') {
    await clearTempMessages(chatId);
    delete userSteps[chatId];
    delete tempCourseData[chatId];
    const targetKeyboard = chatId === ADMIN_ID ? adminKeyboard : mainKeyboard(chatId);
    return bot.sendMessage(chatId, "Jarayon bekor qilindi.", targetKeyboard);
  }

  if (text === '/start' || text === '◀️ Bosh Menyu') {
    await clearTempMessages(chatId);
    delete userSteps[chatId];
    delete tempCourseData[chatId];
    return bot.sendMessage(
      chatId,
      `🌟 <b>"Intellekt"</b> onlayn ta'lim platformasiga xush kelibsiz!\n\nBizning kurslarimiz orqali zamonaviy kasblarni egallang. Kerakli bo'limni tanlang:`,
      { parse_mode: 'HTML', ...mainKeyboard(chatId) }
    );
  }

  if (text === '📚 Barcha Kurslar') {
    await clearTempMessages(chatId);
    if (courses.length === 0) return bot.sendMessage(chatId, "Hozircha hech qanday kurs mavjud emas.", mainKeyboard(chatId));

    let inlineButtons = courses.map(course => [
      { text: `🎓 ${course.title} (${course.price})`, callback_data: `course_${course.id}` }
    ]);

    return bot.sendMessage(chatId, "👇 <b>Mavjud onlayn kurslarimiz ro'yxati:</b>", {
      parse_mode: 'HTML',
      reply_markup: { inline_keyboard: inlineButtons }
    });
  }

  if (text === '👨‍🏫 Ustozlarimiz') {
    await clearTempMessages(chatId);
    let teachersText = "👨‍🏫 <b>O'quv markazimiz ustozlari:</b>\n\n";
    courses.forEach(c => {
      teachersText += `• <b>${escapeHTML(c.teacher)}</b> — <i>${escapeHTML(c.title)}</i> kursi ustozi\n`;
    });
    return bot.sendMessage(chatId, teachersText, { parse_mode: 'HTML', ...mainKeyboard(chatId) });
  }

  if (text === '📞 Bog\'lanish & Manzil') {
    await clearTempMessages(chatId);
    return bot.sendMessage(
      chatId,
      `📞 <b>Biz bilan bog'lanish:</b>\n\n` +
      `📱 Tel: +998 (90) 123-45-67\n` +
      `💬 Telegram: @Intellekt_Admin\n` +
      `📍 Manzil: Andijon viloyati, Baliqchi tumani\n` 
     ,
      { parse_mode: 'HTML', ...mainKeyboard(chatId) }
    );
  }

  if (text === '🔍 Kurs Qidirish') {
    await clearTempMessages(chatId);
    userSteps[chatId] = 'SEARCH_COURSE';
    saveTempMsg(chatId, msgId);

    let sent = await bot.sendMessage(chatId, "🔍 Qidirmoqchi bo'lgan kursingiz nomini yozing:", cancelKeyboard);
    saveTempMsg(chatId, sent.message_id);
    return;
  }

  if (step === 'SEARCH_COURSE') {
    delete userSteps[chatId];
    const results = courses.filter(c => c.title.toLowerCase().includes(text.toLowerCase()));
    await clearTempMessages(chatId);

    const activeKeyboard = chatId === ADMIN_ID ? adminKeyboard : mainKeyboard(chatId);

    if (results.length === 0) {
      return bot.sendMessage(chatId, "❌ Sizning so'rovingiz bo'yicha hech qanday kurs topilmadi.", activeKeyboard);
    }

    let inlineButtons = results.map(c => [{ text: `🎓 ${c.title}`, callback_data: `course_${c.id}` }]);
    
    // Qidiruvdan so'ng asosiy menyu yo'qolib qolmasligi uchun xabar va menyuni alohida yuboramiz
    await bot.sendMessage(chatId, `🔍 <b>Topilgan kurslar (${results.length} ta):</b>`, {
      parse_mode: 'HTML',
      reply_markup: { inline_keyboard: inlineButtons }
    });

    return bot.sendMessage(chatId, "Kerakli bo'limni tanlang:", activeKeyboard);
  }

  // ADMIN PANELI
  if (chatId === ADMIN_ID) {
    if (text === '⚙️ Admin Panel') {
      await clearTempMessages(chatId);
      return bot.sendMessage(chatId, "⚙️ <b>Admin paneliga xush kelibsiz!</b>", { parse_mode: 'HTML', ...adminKeyboard });
    }

    if (text === '📊 Statistika') {
      await clearTempMessages(chatId);
      return bot.sendMessage(chatId, `📊 <b>Markaz statistikasi:</b>\n\n• Jami foydalanuvchilar: ${users.size} ta\n• Jami kurslar: ${courses.length} ta`, { parse_mode: 'HTML', ...adminKeyboard });
    }

    // --- KURS QO'SHISH ---
    if (text === '➕ Yangi Kurs Qo\'shish') {
      await clearTempMessages(chatId);
      userSteps[chatId] = 'ADD_TITLE';
      tempCourseData[chatId] = {};
      saveTempMsg(chatId, msgId);

      let sent = await bot.sendMessage(chatId, "1️⃣ <b>Yangi kurs nomini kiriting:</b>", { parse_mode: 'HTML', ...cancelKeyboard });
      saveTempMsg(chatId, sent.message_id);
      return;
    }

    if (step === 'ADD_TITLE') {
      tempCourseData[chatId].title = text;
      userSteps[chatId] = 'ADD_TEACHER';

      let sent = await bot.sendMessage(chatId, "2️⃣ <b>Kurs ustozi (F.I.SH) kim?</b>", { parse_mode: 'HTML', ...cancelKeyboard });
      saveTempMsg(chatId, sent.message_id);
      return;
    }

    if (step === 'ADD_TEACHER') {
      tempCourseData[chatId].teacher = text;
      userSteps[chatId] = 'ADD_DESC';

      let sent = await bot.sendMessage(chatId, "3️⃣ <b>Kurs haqida qisqacha ma'lumot yozing:</b>", { parse_mode: 'HTML', ...cancelKeyboard });
      saveTempMsg(chatId, sent.message_id);
      return;
    }

    if (step === 'ADD_DESC') {
      tempCourseData[chatId].description = text;
      userSteps[chatId] = 'ADD_PRICE';

      let sent = await bot.sendMessage(chatId, "4️⃣ <b>Kurs narxini kiriting (Masalan: 300,000 so'm):</b>", { parse_mode: 'HTML', ...cancelKeyboard });
      saveTempMsg(chatId, sent.message_id);
      return;
    }

    if (step === 'ADD_PRICE') {
      tempCourseData[chatId].price = text;

      const newCourse = {
        id: courses.length > 0 ? Math.max(...courses.map(c => c.id)) + 1 : 1,
        title: tempCourseData[chatId].title,
        teacher: tempCourseData[chatId].teacher,
        description: tempCourseData[chatId].description,
        price: tempCourseData[chatId].price,
        videos: []
      };

      courses.push(newCourse);
      await clearTempMessages(chatId);

      delete userSteps[chatId];
      delete tempCourseData[chatId];

      return bot.sendMessage(
        chatId, 
        `🎉 <b>Muvaffaqiyatli!</b>\n\n✅ <b>"${escapeHTML(newCourse.title)}"</b> kursi muvaffaqiyatli qo'shildi!`, 
        { parse_mode: 'HTML', ...adminKeyboard }
      );
    }

    // --- KURS O'CHIRISH ---
    if (text === '🗑 Kursni O\'chirish') {
      await clearTempMessages(chatId);
      if (courses.length === 0) return bot.sendMessage(chatId, "O'chirish uchun hech qanday kurs yo'q.", adminKeyboard);

      let deleteButtons = courses.map(c => [{ text: `🗑 ${c.title}`, callback_data: `deletecourse_${c.id}` }]);
      return bot.sendMessage(chatId, "Qaysi kursni o'chirib tashlamoqchisiz?", { reply_markup: { inline_keyboard: deleteButtons } });
    }

    // --- KURS TAHRIRLASH ---
    if (text === '✏️ Kursni Tahrirlash') {
      await clearTempMessages(chatId);
      if (courses.length === 0) return bot.sendMessage(chatId, "Tahrirlash uchun hech qanday kurs yo'q.", adminKeyboard);

      let editButtons = courses.map(c => [{ text: `✏️ ${c.title}`, callback_data: `editcourse_${c.id}` }]);
      return bot.sendMessage(chatId, "Qaysi kursni tahrirlamoqchisiz?", { reply_markup: { inline_keyboard: editButtons } });
    }

    if (step && step.startsWith('EDIT_FIELD_')) {
      const field = step.replace('EDIT_FIELD_', '');
      const courseId = tempCourseData[chatId].selectedCourseId;
      const course = courses.find(c => c.id === courseId);

      if (course) {
        course[field] = text;
        await clearTempMessages(chatId);
        delete userSteps[chatId];
        delete tempCourseData[chatId];

        return bot.sendMessage(chatId, `✅ Kurs ma'lumoti muvaffaqiyatli yangilandi!`, { parse_mode: 'HTML', ...adminKeyboard });
      }
    }

    // --- VIDEO QO'SHISH ---
    if (text === '📹 Dars/Video Qo\'shish') {
      await clearTempMessages(chatId);
      if (courses.length === 0) return bot.sendMessage(chatId, "Avval kurs yaratishingiz kerak.", adminKeyboard);

      let courseButtons = courses.map(c => [{ text: c.title, callback_data: `addvideo_${c.id}` }]);
      return bot.sendMessage(chatId, "Qaysi kursga video-darslik qo'shmoqchisiz?", { reply_markup: { inline_keyboard: courseButtons } });
    }

    if (step === 'WAITING_VIDEO_FILE') {
      const courseId = tempCourseData[chatId]?.selectedCourseId;
      const course = courses.find(c => c.id === courseId);

      const videoFileId = msg.video?.file_id || (msg.document?.mime_type?.includes('video') ? msg.document.file_id : null);

      if (videoFileId && course) {
        course.videos.push({
          title: msg.caption || `Dars ${course.videos.length + 1}`,
          fileId: videoFileId,
          caption: msg.caption || ''
        });

        await clearTempMessages(chatId);
        delete userSteps[chatId];
        delete tempCourseData[chatId];

        return bot.sendMessage(chatId, `✅ Video <b>"${escapeHTML(course.title)}"</b> kursiga saqlandi!`, { parse_mode: 'HTML', ...adminKeyboard });
      } else {
        let sent = await bot.sendMessage(chatId, "⚠️ Iltimos, faqat video fayl yuboring.", cancelKeyboard);
        saveTempMsg(chatId, sent.message_id);
        return;
      }
    }

    // --- E'LON YUBORISH ---
    if (text === '📢 E\'lon Yuborish') {
      await clearTempMessages(chatId);
      userSteps[chatId] = 'WAITING_BROADCAST';
      saveTempMsg(chatId, msgId);

      let sent = await bot.sendMessage(chatId, "📢 Barcha foydalanuvchilarga yubormoqchi bo'lgan e'lon matnini kiriting:", cancelKeyboard);
      saveTempMsg(chatId, sent.message_id);
      return;
    }

    if (step === 'WAITING_BROADCAST') {
      delete userSteps[chatId];
      let sentCount = 0;

      await clearTempMessages(chatId);
      let waitMsg = await bot.sendMessage(chatId, "⏳ E'lon tarqatilmoqda...", adminKeyboard);

      for (let userChatId of users) {
        try {
          await bot.sendMessage(userChatId, `📢 <b>E'LON:</b>\n\n${escapeHTML(text)}`, { parse_mode: 'HTML' });
          sentCount++;
        } catch (err) {}
      }

      try { await bot.deleteMessage(chatId, waitMsg.message_id); } catch(e) {}

      return bot.sendMessage(chatId, `✅ E'lon <b>${sentCount} ta</b> foydalanuvchiga muvaffaqiyatli yuborildi!`, { parse_mode: 'HTML', ...adminKeyboard });
    }
  }
});

// -------------------------------------------------------------
// INLINE TUGMALAR
// -------------------------------------------------------------
bot.on('callback_query', async (query) => {
  const chatId = query.message.chat.id;
  const data = query.data;

  try { await bot.answerCallbackQuery(query.id); } catch(e) {}

  if (data.startsWith('course_')) {
    const courseId = parseInt(data.split('_')[1]);
    const course = courses.find(c => c.id === courseId);

    if (course) {
      let infoText = `🎓 <b>${escapeHTML(course.title)}</b>\n\n` +
                     `👨‍🏫 Ustoz: <b>${escapeHTML(course.teacher)}</b>\n` +
                     `💵 Narxi: <b>${escapeHTML(course.price)}</b>\n` +
                     `📝 Haqida: ${escapeHTML(course.description)}\n` +
                     `📹 Mavjud darslar: <b>${course.videos.length} ta</b>`;

      let actionButtons = [
        [{ text: '📺 Darslarni ko\'rish', callback_data: `watch_${course.id}` }],
        [{ text: '➕ Kursga yozilish', callback_data: `enroll_${course.id}` }]
      ];

      bot.sendMessage(chatId, infoText, {
        parse_mode: 'HTML',
        reply_markup: { inline_keyboard: actionButtons }
      });
    }
  }

  if (data.startsWith('watch_')) {
    const courseId = parseInt(data.split('_')[1]);
    const course = courses.find(c => c.id === courseId);

    if (!course || course.videos.length === 0) {
      return bot.answerCallbackQuery(query.id, { text: "Bu kursda hali video darsliklar yo'q.", show_alert: true });
    }

    bot.sendMessage(chatId, `📚 <b>${escapeHTML(course.title)}</b> kursining darslari:`, { parse_mode: 'HTML' });
    
    course.videos.forEach((v, index) => {
      if (v.fileId) {
        bot.sendVideo(chatId, v.fileId, { caption: `🎥 ${index + 1}-dars: ${v.caption}` });
      } else {
        bot.sendMessage(chatId, `🎥 ${index + 1}-dars: ${escapeHTML(v.title)} (Video hali yuklanmagan)`);
      }
    });
  }

  // Admin: Kursni o'chirish
  if (data.startsWith('deletecourse_')) {
    const courseId = parseInt(data.split('_')[1]);
    courses = courses.filter(c => c.id !== courseId);
    try { await bot.deleteMessage(chatId, query.message.message_id); } catch (e) {}
    bot.sendMessage(chatId, "✅ Kurs muvaffaqiyatli o'chirib tashlandi!", adminKeyboard);
  }

  // Admin: Kursni tahrirlash menyusi
  if (data.startsWith('editcourse_')) {
    const courseId = parseInt(data.split('_')[1]);
    const course = courses.find(c => c.id === courseId);

    if (course) {
      tempCourseData[chatId] = { selectedCourseId: courseId };
      let editOptions = [
        [{ text: "📌 Nomini o'zgartirish", callback_data: `editfield_title` }],
        [{ text: "👨‍🏫 Ustozni o'zgartirish", callback_data: `editfield_teacher` }],
        [{ text: "📝 Tavsifni o'zgartirish", callback_data: `editfield_description` }],
        [{ text: "💵 Narxni o'zgartirish", callback_data: `editfield_price` }]
      ];

      bot.sendMessage(chatId, `✏️ <b>${escapeHTML(course.title)}</b> kursining qaysi ma'lumotini o'zgartirmoqchisiz?`, {
        parse_mode: 'HTML',
        reply_markup: { inline_keyboard: editOptions }
      });
    }
  }

  if (data.startsWith('editfield_')) {
    const field = data.replace('editfield_', '');
    userSteps[chatId] = `EDIT_FIELD_${field}`;

    let promptText = "";
    if (field === 'title') promptText = "Yangi kurs nomini kiriting:";
    if (field === 'teacher') promptText = "Yangi ustoz F.I.SH.ni kiriting:";
    if (field === 'description') promptText = "Yangi kurs tavsifini kiriting:";
    if (field === 'price') promptText = "Yangi kurs narxini kiriting:";

    let sent = await bot.sendMessage(chatId, promptText, cancelKeyboard);
    saveTempMsg(chatId, sent.message_id);
  }

  if (data.startsWith('addvideo_')) {
    await clearTempMessages(chatId);
    const courseId = parseInt(data.split('_')[1]);
    userSteps[chatId] = 'WAITING_VIDEO_FILE';
    tempCourseData[chatId] = { selectedCourseId: courseId };

    let sent = await bot.sendMessage(chatId, "🎥 Endi ushbu kurs uchun <b>Video darslikni</b> yuboring:", { parse_mode: 'HTML', ...cancelKeyboard });
    saveTempMsg(chatId, sent.message_id);
  }

  if (data.startsWith('enroll_')) {
    bot.sendMessage(chatId, "✅ So'rovingiz qabul qilindi! Tez orada administratorimiz siz bilan bog'lanadi.\n ❗ Iltimos agar telegramingizda nomeringiz yashirilgan bolsa uni ochib qo'yish esdan chiqasin.");
    bot.sendMessage(ADMIN_ID, `🔔 <b>Yangi talaba!</b>\n\n👤 Foydalanuvchi: @${query.from.username || query.from.first_name}\n🆔 ID: ${chatId}\n🎓 Kurs ID: ${data.split('_')[1]}`, { parse_mode: 'HTML' });
  }
});

const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => {
  res.send('Intellect Bot active!');
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

console.log('🚀 Intellekt Boti muvaffaqiyatli ishga tushdi...');
