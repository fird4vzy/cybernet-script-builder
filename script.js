// ═══════════════════════════════════════════════════════════════
// THEME (light / dark) — apply early to avoid flash
// ═══════════════════════════════════════════════════════════════
const THEME_KEY = 'cybernet_theme_v1';
(function initThemeEarly() {
  try {
    const saved = localStorage.getItem(THEME_KEY);
    // Vault is a dark-first design — default to dark unless user chose light
    const theme = saved || 'dark';
    document.documentElement.setAttribute('data-theme', theme);
  } catch (e) {
    document.documentElement.setAttribute('data-theme', 'dark');
  }
})();

function toggleTheme() {
  const cur = document.documentElement.getAttribute('data-theme') || 'light';
  const next = cur === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  try { localStorage.setItem(THEME_KEY, next); } catch (e) {}
  // Re-render canvas so SVG edge colors etc. pick up new theme if needed
  if (typeof canvasRender === 'function') {
    const canvasTab = document.getElementById('tab-canvas');
    if (canvasTab && canvasTab.style.display !== 'none') canvasRender();
  }
}

// ═══════════════════════════════════════════════════════════════
// TEMPLATES
// ═══════════════════════════════════════════════════════════════

// ─── Template 1: AVO Credit Limit (incoming line) ─────────────
const TPL_AVO_LIMIT = {
  name: 'AVO — Кредитный лимит',
  vars: { BANK_NAME: 'AVO bank', PHONE: '+998 (78) 888-78-87', AGENT_NAME: 'Жавохир', APP_NAME: 'AVO' },
  sections: [
    { id: 's1', label: 'Приветствие' },
    { id: 's2', label: 'Кредитный лимит' },
    { id: 's3', label: 'Получение лимита' },
    { id: 's4', label: 'Условия' },
    { id: 's5', label: 'Погашение' },
    { id: 's10', label: 'Тех. вопросы' },
    { id: 's11', label: 'Завершение' }
  ],
  blocks: [
    { id: 'start', sec: 's1', title: 'Старт', intent: 'start', type: 'start', ru: 'Входящий звонок', uz: 'Kiruvchi qo\'ng\'iroq', next_default: 'greeting' },
    { id: 'greeting', sec: 's1', title: 'Приветствие', intent: 'greeting', type: 'normal', ru: 'Алло, здравствуйте! Это {BANK_NAME}, меня зовут {AGENT_NAME}. Чем могу помочь?', uz: 'Allo! Bu {BANK_NAME}, ismim {AGENT_NAME}.', next_default: 'client_question' },
    { id: 'client_question', sec: 's1', title: 'Вопрос клиента?', intent: 'router', type: 'decision', ru: 'Какой вопрос задал клиент?', uz: 'Qanday savol?', next_yes: 'what_is_limit', next_no: 'app_not_working', next_default: 'end_call' },
    { id: 'robot1', sec: 's1', title: 'Вы робот? (1-2)', intent: 'robot', type: 'question', ru: 'Интересно, почему вы так подумали — я живой консультант.', uz: 'Qiziq, nega shunday o\'ylagansiz.', next_default: 'client_question' },
    { id: 'transfer1', sec: 's1', title: 'Перевод на оператора', intent: 'transfer', type: 'end', ru: '→ Перевод на старшего оператора.', uz: '→ Bosh operatorga.', next_default: '' },
    { id: 'what_is_limit', sec: 's2', title: 'Что такое кредитный лимит?', intent: 'what_is_limit', type: 'question', ru: 'Кредитный лимит — сумма кредитных средств на карте {BANK_NAME} platinum.', uz: 'Kredit limit.', next_default: 'more_questions' },
    { id: 'how_to_get', sec: 's3', title: 'Как получить лимит?', intent: 'get_limit', type: 'question', ru: 'Скачайте {APP_NAME}, регистрация, идентификация.', uz: '{APP_NAME} yuklab oling.', next_default: 'more_questions' },
    { id: 'max_limit', sec: 's4', title: 'Максимальный лимит', intent: 'max_amount', type: 'question', ru: 'До 100 млн сумов. Определяется по скорингу.', uz: '100 million so\'mgacha.', next_default: 'more_questions' },
    { id: 'grace', sec: 's4', title: 'Льготный период', intent: 'grace_period', type: 'question', ru: 'До 45 дней без процентов.', uz: '45 kungacha.', next_default: 'more_questions' },
    { id: 'how_to_pay', sec: 's5', title: 'Как погасить долг?', intent: 'pay_debt', type: 'question', ru: 'В {APP_NAME}, банкомате, с Humo/UZCARD.', uz: '{APP_NAME}, bankomat.', next_default: 'more_questions' },
    { id: 'app_not_working', sec: 's10', title: 'Приложение не работает', intent: 'app_broken', type: 'question', ru: 'Обновите {APP_NAME} или переустановите.', uz: '{APP_NAME}ni yangilang.', next_yes: 'more_questions', next_no: 'transfer_operator' },
    { id: 'transfer_operator', sec: 's10', title: 'Перевод на специалиста', intent: 'transfer', type: 'end', ru: 'Оставайтесь на линии.', uz: 'Liniyada qoling.', next_default: '' },
    { id: 'more_questions', sec: 's11', title: 'Ещё вопросы?', intent: 'more', type: 'decision', ru: 'Есть ли ещё вопросы?', uz: 'Yana savol bormi?', next_yes: 'client_question', next_no: 'end_call' },
    { id: 'end_call', sec: 's11', title: 'Завершение', intent: 'goodbye', type: 'end', ru: 'Спасибо за обращение! До свидания!', uz: 'Rahmat! Xayr!', next_default: '' }
  ]
};

// ─── Template 2: Pre-script Collection (outgoing reminder) ────
// Based on Cybernet pre_script_collection with all intents and counters 1/2/3 times
const TPL_COLLECTION = {
  name: 'Pre-script Collection',
  vars: {
    BANK_NAME: 'AVO bank',
    PHONE: '+998 (78) 888-78-87',
    AGENT_NAME: 'Жавохир',
    AMOUNT: 'СУММА',
    DAY: 'День',
    MONTH: 'Месяц'
  },
  sections: [
    { id: 'c1', label: 'Начало / Верификация' },
    { id: 'c2', label: 'Основной вопрос (q_willpay)' },
    { id: 'c3', label: 'Робот / Кто это' },
    { id: 'c4', label: 'Какой кредит' },
    { id: 'c5', label: 'Сколько / Как оплатить' },
    { id: 'c6', label: 'Оператор' },
    { id: 'c7', label: 'Другие вопросы' },
    { id: 'c8', label: 'Отказы и особые случаи' },
    { id: 'c9', label: 'Завершение' }
  ],
  blocks: [
    // ───── c1: Начало / Верификация ─────
    { id: 'start', sec: 'c1', title: 'Старт', intent: 'start', type: 'start', ru: 'Исходящий звонок', uz: 'Chiqish qo\'ng\'irog\'i', next_default: 'langDetect' },
    { id: 'langDetect', sec: 'c1', title: 'Проверка языка', intent: 'langDetect', type: 'decision', ru: 'На каком языке отвечает клиент?', uz: 'Mijoz qaysi tilda javob beradi?', next_yes: 'greeting_ru', next_no: 'greeting_uz', next_default: 'greeting_ru' },
    { id: 'greeting_ru', sec: 'c1', title: 'Приветствие RU', intent: 'greeting', type: 'normal', ru: 'Меня зовут {AGENT_NAME}, звоню из {BANK_NAME}. _____ (Имя клиента), это вы?', uz: '—', next_default: 'q_willpay_1' },
    { id: 'greeting_uz', sec: 'c1', title: 'Приветствие UZ', intent: 'greeting', type: 'normal', ru: '—', uz: 'Mening ismim {AGENT_NAME}, {BANK_NAME}dan qo\'ng\'iroq qilyapman. _____ (mijoz ismi), bu sizmisiz?', next_default: 'q_willpay_1' },
    { id: 'q_soundlessly', sec: 'c1', title: 'Вас не слышно', intent: 'q_soundlessly', type: 'question', ru: 'Ммм секундочку… сейчас лучше?/ Так а сейчас меня слышно?', uz: 'Mmm bir daqiqa… Hozir yaxshimi?/ Hozir meni eshityapsizmi?', next_default: 'q_willpay_1' },
    { id: 'q_recall', sec: 'c1', title: 'Алло, вас не слышно', intent: 'q_recall', type: 'end', ru: 'Алло, вас что-то не слышно, вы могли бы повторить? Хм, к сожалению вас не слышно, перезвоните пожалуйста. До свидания!', uz: 'Afsuski, sizni eshita olmayapman. Iltimos, qaytadan qo\'ng\'iroq qiling.', next_default: '' },
    { id: 'know_person', sec: 'c1', title: 'Кем приходится клиент?', intent: 'know_person', type: 'decision', ru: 'Скажите, пожалуйста, _____ (Имя клиента), кем вам приходится?', uz: 'Iltimos, ayting-chi, _____ sizga kim bo\'ladi?', next_yes: 'relativeloan', next_no: 'dont_know1', next_default: 'dont_know2' },
    { id: 'dont_know1', sec: 'c1', title: 'Не знаю его (незнакомец)', intent: 'dont_know1', type: 'end', ru: 'Извините за беспокойство, но Ваш номер указан как контактный. В случае, если Вы не оформляли кредит, просим связаться по номеру {PHONE} для уточнения. До свидания.', uz: 'Bezovta qilganim uchun uzr, lekin raqamingiz aloqa raqami sifatida ko\'rsatilgan. Agar kreditingiz yo\'q bo\'lsa, {PHONE}ga qo\'ng\'iroq qiling.', next_default: '' },
    { id: 'dont_know2', sec: 'c1', title: 'Передайте информацию', intent: 'dont_know2', type: 'end', ru: 'Пожалуйста передайте этому человеку, что звонили из {BANK_NAME}, и попросите его перезвонить на номер {PHONE}. Спасибо. До свидания!', uz: 'Iltimos, bu odamga {BANK_NAME}dan qo\'ng\'iroq qilganini yetkazing va {PHONE}ga qo\'ng\'iroq qilishini so\'rang. Rahmat!', next_default: '' },
    { id: 'relativeloan', sec: 'c1', title: 'Родственник / знакомый', intent: 'relativeloan', type: 'end', ru: 'Передайте, пожалуйста, что у этого клиента наступает платеж по кредиту, чтобы он не забыл оплатить. Оплатить необходимо до наступления даты платежа. Всего доброго и до свидания!', uz: 'Iltimos, ushbu mijoz to\'lovni unutmasligi uchun kredit bo\'yicha to\'lovi yaqinlashayotganini yetkazib qo\'ying. Xayr!', next_default: '' },
    { id: 'havenotloan', sec: 'c1', title: 'У меня нет кредита', intent: 'havenotloan', type: 'end', ru: 'Поняла вас, но ваш номер указан как контактный. В случае если Все же Вы оформляли кредит, просим Произвести платеж. До свидания.', uz: 'Tushundim, lekin sizning raqamingiz aloqa raqami sifatida keltirilgan. Agar haqiqatan ham kreditni rasmiylashtirgan bo\'lsangiz, to\'lovni amalga oshiring.', next_default: '' },
    { id: 'wrongNumber', sec: 'c1', title: 'Не туда попали', intent: 'wrongNumber', type: 'end', ru: 'Извините за беспокойство. До свидания.', uz: 'Bezovta qilganimiz uchun uzr so\'raymiz! Xayr!', next_default: '' },

    // ───── c2: q_willpay with counters 1/2/3 ─────
    { id: 'q_willpay_1', sec: 'c2', title: 'Успеете оплатить? (1 раз)', intent: 'q_willpay', type: 'question', ru: 'Напоминаю Вам о предстоящем платеже по кредиту в размере {AMOUNT} сум до 8 часов вечера {DAY} {MONTH}. Вы успеете оплатить в срок?', uz: 'Sizga kredit bo\'yicha to\'lov qilishingiz kerakligini eslatib o\'taman. {AMOUNT} so\'m miqdorida, {DAY} {MONTH} kuni, soat 20:00 gacha. To\'lovni belgilangan vaqtda qilishga ulgurasizmi?', next_yes: 'paid', next_no: 'deny', next_default: 'q_willpay_2' },
    { id: 'q_willpay_2', sec: 'c2', title: 'Успеете оплатить? (2 раз)', intent: 'q_willpay', type: 'question', ru: 'Вы успеваете оплатить в срок? По договору, Вам необходимо вносить платежи в срок, чтобы не выйти на просрочку и не испортить кредитную историю.', uz: 'O\'z vaqtida to\'lovni amalga oshirasizmi? Shartnomaga ko\'ra, to\'lovlarni o\'z vaqtida amalga oshirishingiz kerak.', next_yes: 'paid', next_no: 'deny_at_q2', next_default: 'q_willpay_3' },
    { id: 'q_willpay_3', sec: 'c2', title: 'Успеете оплатить? (3 раз)', intent: 'q_willpay', type: 'question', ru: 'Вы внесете оплату во время? Пожалуйста, обратите внимание, несвоевременная оплата может повлиять на вашу кредитную историю и возможность получения кредита в будущем.', uz: 'To\'lovni belgilangan muddatda amalga oshirasizmi? Iltimos, to\'lov kechikkan taqdirda, sizning kredit tarixingiz yomonlashishi mumkinligini e\'tiborga oling.', next_yes: 'paid', next_no: 'final_recall', next_default: 'final_recall' },
    { id: 'paid', sec: 'c2', title: 'Обещал оплатить', intent: 'paid', type: 'end', ru: 'Приняли Ваш ответ, ждем оплату в срок. Нужно ли вам напомнить о ней в день платежа?', uz: 'Javobingizni qabul qildik, to\'lovni o\'z vaqtida amalga oshirishingizni kutmoqdamiz. Sizga eslatib o\'tishimiz kerakmi?', next_default: 'end_call' },
    { id: 'deny', sec: 'c2', title: 'Нет, не успею (1 отказ)', intent: 'deny', type: 'question', ru: 'Понимаю, но по кредиту важно платить в срок, чтобы избежать просрочки и сохранить кредитную историю.', uz: 'Tushunaman, ammo to\'lovlarni kechiktirmaslik va kredit tarixingiz yomonlashmasligi uchun kreditni o\'z vaqtida to\'lash zarur.', next_default: 'deny_at_q2' },
    { id: 'deny_at_q2', sec: 'c2', title: 'Отказ на 2-й вопрос', intent: 'deny_at_q2', type: 'question', ru: 'Я поняла вас, но чтобы избежать просрочки и пени, а также сохранить положительную кредитную историю, рекомендуем погашать кредит вовремя.', uz: 'Men sizni tushunaman, ammo kechikishni oldini olish uchun o\'z vaqtida to\'lashni tavsiya qilamiz.', next_default: 'final_recall' },
    { id: 'final_recall', sec: 'c2', title: 'Финальное напоминание', intent: 'final_recall', type: 'end', ru: 'Рекомендуем вам оплатить ежемесячный платеж. Выход на просрочку окажет негативное влияние на вашу кредитную историю. До свидания!', uz: 'Sizga har oygi to\'lovni amalga oshirishingizni tavsiya qilamiz. To\'lovni kechiktirish kredit tarixingizga salbiy ta\'sir qiladi. Xayr!', next_default: '' },

    // ───── c3: Робот / Кто это ─────
    { id: 'whoIsIt', sec: 'c3', title: 'Кто вы? / Откуда вы?', intent: 'whoIsIt', type: 'question', ru: 'Это звонок из {BANK_NAME}, меня зовут {AGENT_NAME}. Звоню Вам, чтобы напомнить о предстоящем платеже по кредиту.', uz: 'Bu {BANK_NAME}dan qo\'ng\'iroq, mening ismim {AGENT_NAME}. Sizga kredit bo\'yicha to\'lovni eslatish uchun qo\'ng\'iroq qilyapman.', next_default: 'whoIsIt_2' },
    { id: 'whoIsIt_2', sec: 'c3', title: 'Кто вы? (2 раз)', intent: 'whoIsIt', type: 'question', ru: 'Как я уже представлялась ранее, меня зовут {AGENT_NAME}. Чтобы не испортить свою кредитную историю, рекомендуем Вам внести оплату по кредиту до наступления даты платежа.', uz: 'Avval aytib o\'tkanimdek, mening ismim {AGENT_NAME}. Kredit tarixingizni yomonlashmasligi uchun to\'lovni o\'z vaqtida amalga oshirishingizni tavsiya qilamiz.', next_default: 'whoIsIt_3' },
    { id: 'whoIsIt_3', sec: 'c3', title: 'Кто вы? (3 раз)', intent: 'whoIsIt', type: 'question', ru: 'Давайте еще раз расскажу, я {AGENT_NAME} из {BANK_NAME} касательно предстоящего платежа по кредиту.', uz: 'Yana bir bor aytay, men {AGENT_NAME} {BANK_NAME}dan, kredit bo\'yicha to\'lov haqida eslatib o\'tkani qo\'ng\'iroq qilyapman.', next_default: 'q_willpay_1' },
    { id: 'robot', sec: 'c3', title: 'Вы робот? (1 раз)', intent: 'robot', type: 'question', ru: 'Хаха какой интересный вопрос, неожиданно даже. Но я звоню вам чтобы напомнить об оплате, давайте вернемся к этому вопросу.', uz: 'Haha, juda qiziq savol bo\'ldi, kutilmagan edim. Lekin men sizga to\'lov haqida eslatish uchun qo\'ng\'iroq qilyapman, qaytaylik shu masalaga.', next_default: 'robot_2' },
    { id: 'robot_2', sec: 'c3', title: 'Вы робот? (2 раз)', intent: 'robot', type: 'question', ru: 'Мне часто это говорят, интересно даже почему (с усмешкой). Давайте вернемся к основному вопросу.', uz: 'To\'g\'risi bu savolni menga ko\'p berishadi, nega ekan hayronman. Lekin hozir asosiy masalaga qaytaylik.', next_default: 'robot_3' },
    { id: 'robot_3', sec: 'c3', title: 'Вы робот? (3 раз)', intent: 'robot', type: 'question', ru: 'Мне важно сейчас зафиксировать ваш ответ об оплате, давайте мы будем говорить именно про это.', uz: 'Menga hozir sizning to\'lov bo\'yicha javobingizni qayd etish muhim, shu haqida gaplashaylik.', next_default: 'q_willpay_1' },
    { id: 'robot_4', sec: 'c3', title: 'Робот 4й раз', intent: 'robot_final', type: 'end', ru: 'Ну что же вы очень внимательный, тем не менее, Банк ждет в обязательном порядке оплату по кредиту до наступления даты платежа по нему, до свидания!', uz: 'Siz juda diqqatlisiz, lekin Bank kredit bo\'yicha to\'lovni majburiy ravishda kutmoqda. Xayr!', next_default: '' },

    // ───── c4: Какой кредит ─────
    { id: 'whatLoan', sec: 'c4', title: 'Какой кредит? (1 раз)', intent: 'whatLoan', type: 'question', ru: 'Вы оформили кредит в {BANK_NAME}, и наступает дата платежа по нему.', uz: 'Siz {BANK_NAME}da kredit rasmiylashtirgansiz va to\'lov sanasi yaqinlashmoqda.', next_default: 'whatLoan_2' },
    { id: 'whatLoan_2', sec: 'c4', title: 'Какой кредит? (2 раз)', intent: 'whatLoan', type: 'question', ru: 'Как уже ранее озвучивала, в {BANK_NAME} на текущий момент у вас есть оформленный кредит. Рекомендуем внести платеж до наступления срока.', uz: 'Avval aytib o\'tganimdek, hozirgi kunda {BANK_NAME}da sizda rasmiylashtirilgan kredit mavjud. To\'lovni muddatidan oldin amalga oshiring.', next_default: 'whatLoan_3' },
    { id: 'whatLoan_3', sec: 'c4', title: 'Какой кредит? (3 раз)', intent: 'whatLoan', type: 'question', ru: 'Как вы знаете, у вас есть кредит в {BANK_NAME}, и если Вы не внесете оплату до наступления даты платежа, то образуется задолженность и будет начисляться пеня.', uz: 'Yana qaytaraman, {BANK_NAME}dan siz kredit rasmiylashtirgansiz. Agar to\'lovni o\'z vaqtida amalga oshirmasangiz jarimalar ham to\'lashga to\'g\'ri keladi.', next_default: 'q_willpay_1' },

    // ───── c5: Сколько / Как оплатить ─────
    { id: 'howMuch', sec: 'c5', title: 'Сколько? (1 раз)', intent: 'howMuch', type: 'question', ru: 'Сумма оплаты по кредиту составляет "{AMOUNT}". Оплатить можно через приложение, Payme, Click или в кассах филиалов и экспресс-центров нашего банка.', uz: 'Kredit bo\'yicha to\'lov summasi "{AMOUNT}" ni tashkil etadi. To\'lovni Bank ilovasi, Payme, Click orqali yoki bankimizning filiallari va ekspress-markazlaridagi kassalarda amalga oshirishingiz mumkin.', next_default: 'howMuch_2' },
    { id: 'howMuch_2', sec: 'c5', title: 'Сколько? (2 раз)', intent: 'howMuch', type: 'question', ru: 'Как я и озвучивала, сумма платежа по кредиту составляет "{AMOUNT}". Для оплаты есть несколько вариантов: В мобильном приложении, Payme, Click или в кассах наших филиалов.', uz: 'Avval aytganimdek, kredit bo\'yicha to\'lov summasi "{AMOUNT}" ni tashkil etadi. Bir nechta variant mavjud: mobil ilova, Payme, Click yoki bank kassalari.', next_default: 'howMuch_3' },
    { id: 'howMuch_3', sec: 'c5', title: 'Сколько? (3 раз)', intent: 'howMuch', type: 'question', ru: 'Как вы уже знаете, текущая сумма по вашему кредиту составляет "{AMOUNT}". Вы можете оплатить в приложении, Payme, Click, либо в кассах филиалов и экспресс-центров нашего банка.', uz: 'Siz bilganingizdek, hozirgi kredit summasi "{AMOUNT}" ni tashkil etadi. To\'lovni ilova, Payme, Click yoki filial kassalari orqali amalga oshiring.', next_default: 'q_willpay_1' },
    { id: 'how_to_pay', sec: 'c5', title: 'Как оплатить? (1 раз)', intent: 'how_to_pay', type: 'question', ru: 'Вы можете оплатить через мобильные приложения {BANK_NAME}, Payme, Paynet и Click либо в банкоматах и филиалах нашего банка.', uz: 'Siz to\'lovni {BANK_NAME}, Payme, Paynet va Click mobil ilovalari orqali, yoki bankimiz bankomatlari va filiallarida amalga oshirishingiz mumkin.', next_default: 'how_to_pay_2' },
    { id: 'how_to_pay_2', sec: 'c5', title: 'Как оплатить? (2 раз)', intent: 'how_to_pay', type: 'question', ru: 'Давайте повторюсь, вы можете сделать оплату с помощью расчетного счета в приложении {BANK_NAME}, либо через банкоматы и филиалы нашего банка.', uz: 'Aytib o\'tganimdek, {BANK_NAME} ilovasidagi hisobraqam yoki bankomatlar orqali to\'lashingiz mumkin.', next_default: 'how_to_pay_3' },
    { id: 'how_to_pay_3', sec: 'c5', title: 'Как оплатить? (3 раз)', intent: 'how_to_pay', type: 'question', ru: 'Давайте объясню подробней, вы можете сделать оплату в приложениях {BANK_NAME}, Payme, Paynet и Click в разделе оплат, Погашение кредита. Либо через банкоматы и филиалы нашего банка.', uz: 'To\'liqroq aytib o\'taman: to\'lovni {BANK_NAME}, Payme, Paynet va Click ilovalarining "To\'lovlar" bo\'limida "Kreditni yopish" xizmatidan foydalanib to\'lashingiz mumkin.', next_default: 'q_willpay_1' },
    { id: 'paymentDay', sec: 'c5', title: 'Когда надо оплатить? (1 раз)', intent: 'paymentDay', type: 'question', ru: 'Вам необходимо внести платеж по кредиту до 8 часов вечера {DAY} {MONTH}.', uz: 'Siz kredit bo\'yicha to\'lovni {DAY} {MONTH} kuni soat 20:00 gacha amalga oshirishingiz kerak.', next_default: 'paymentDay_2' },
    { id: 'paymentDay_2', sec: 'c5', title: 'Когда надо оплатить? (2 раз)', intent: 'paymentDay', type: 'question', ru: 'Вносить оплату уже можно сейчас. А Согласно договору, срок платежа по кредиту до 8 часов вечера {DAY} {MONTH}.', uz: 'To\'lovni hozirda amalga oshirish mumkin. Shartnomaga ko\'ra, kredit to\'lovining muddati {DAY} {MONTH} kuni soat 20:00 gacha.', next_default: 'paymentDay_3' },
    { id: 'paymentDay_3', sec: 'c5', title: 'Когда надо оплатить? (3 раз)', intent: 'paymentDay', type: 'question', ru: 'Вы уже можете оплатить кредит. Напоминаем, что срок платежа до 20:00 {DAY} {MONTH}.', uz: 'Siz allaqachon kreditni to\'lashingiz mumkin. Eslatib o\'tamiz, to\'lov muddati {DAY} {MONTH} kuni soat 20:00 gacha.', next_default: 'q_willpay_1' },

    // ───── c6: Оператор ─────
    { id: 'operator', sec: 'c6', title: 'На оператора (1 раз)', intent: 'operator', type: 'question', ru: 'Ага я вас услышала, чтобы вы смогли связаться с оператором, перезвоните на номер с которого я звоню, мои коллеги вам помогут.', uz: 'Aha, sizni eshitdim. Operator bilan bog\'lanishingiz uchun, men qo\'ng\'iroq qilgan raqamga qayta qo\'ng\'iroq qiling, hamkasblarim sizga yordam beradi.', next_default: 'operator_2' },
    { id: 'operator_2', sec: 'c6', title: 'На оператора (2 раз)', intent: 'operator', type: 'question', ru: 'Как я уже говорила ранее, Мне сейчас важно зафиксировать ваш ответ.', uz: 'Avval aytganimdek, hozir men sizning javobingizni yozib olishim kerak.', next_default: 'operator_3' },
    { id: 'operator_3', sec: 'c6', title: 'На оператора (3 раз)', intent: 'operator', type: 'end', ru: 'К сожалению, у меня нет технической возможности переключить звонок. Прошу Вас перезвонить по номеру с которого я звоню, мои коллеги вам помогут. Для этого вы можете обратиться по номеру {PHONE}. До свидания!', uz: 'Afsuski, qo\'ng\'iroqni almashtirish uchun texnik imkoniyatim yo\'q. Iltimos, {PHONE} raqamiga qayta qo\'ng\'iroq qiling. Xayr!', next_default: '' },

    // ───── c7: Другие вопросы ─────
    { id: 'have_question', sec: 'c7', title: 'У меня есть вопрос', intent: 'have_question', type: 'question', ru: 'Да, я вас слышу / Слушаю вас, вы хотели что-то спросить?', uz: 'Ha, men sizni eshitaman, nimadir so\'ramoqchimidiz?', next_default: 'q_willpay_1' },
    { id: 'anotherLoan', sec: 'c7', title: 'Другие кредиты (1 раз)', intent: 'anotherLoan', type: 'question', ru: 'Наличие кредитов в других организациях не влияет на дату платежа в {BANK_NAME}. Рекомендуем Вам предпринять меры по погашению вашего ежемесячного платежа во избежание просрочки.', uz: 'Boshqa banklardan kreditlaringiz borligi {BANK_NAME}dagi to\'lovlaringizga ta\'sir ko\'rsatmaydi. Kechikishning oldini olish uchun oylik to\'lovni to\'lash choralarini ko\'ring.', next_default: 'anotherLoan_2' },
    { id: 'anotherLoan_2', sec: 'c7', title: 'Другие кредиты (2 раз)', intent: 'anotherLoan', type: 'question', ru: 'Как я было озвучено ранее, Факт наличия кредитов в других организациях не влияет на дату платежа. Вам рекомендуется предпринять шаги по внесению ежемесячного платежа.', uz: 'Avval aytib o\'tganimdek, boshqa tashkilotlardagi kreditlar mavjudligi to\'lov sanasiga ta\'sir qilmaydi.', next_default: 'anotherLoan_3' },
    { id: 'anotherLoan_3', sec: 'c7', title: 'Другие кредиты (3 раз)', intent: 'anotherLoan', type: 'question', ru: 'Наличие кредитов в других местах не влияет на срок платежа. Рекомендуем вам внести платеж в указанные сроки.', uz: 'Boshqa joylardagi kreditlar mavjudligi to\'lov muddatiga ta\'sir qilmaydi. Belgilangan muddatda to\'lovni amalga oshiring.', next_default: 'q_willpay_1' },
    { id: 'different_payment_date', sec: 'c7', title: 'В договоре другая дата (1)', intent: 'different_payment_date', type: 'question', ru: 'Мхм, да-да, увидел. Тогда необходимо внести оплату до даты, которая указана в договоре или можете уже сегодня оплатить. Я просто напоминаю, чтобы вы не забыли.', uz: 'Mhm, ha-ha, ko\'rdim. Unda shartnomada ko\'rsatilgan sanagacha to\'lovni amalga oshirishingiz kerak yoki bugunoq to\'lashingiz mumkin.', next_default: 'different_payment_date_2' },
    { id: 'different_payment_date_2', sec: 'c7', title: 'В договоре другая дата (2)', intent: 'different_payment_date', type: 'question', ru: 'Как уже говорил, нужно внести платеж в срок, то есть до той даты, которая у вас в договоре или можете уже сегодня оплатить.', uz: 'Avval aytganimdek, to\'lovni o\'z vaqtida amalga oshirishingiz kerak.', next_default: 'different_payment_date_3' },
    { id: 'different_payment_date_3', sec: 'c7', title: 'В договоре другая дата (3)', intent: 'different_payment_date', type: 'question', ru: 'Понял вас, увидел информацию. В таком случае, вам нужно внести оплату до даты, которая указана в договоре или можете уже сегодня оплатить. Я звоню вам напомнить, чтобы не забыли.', uz: 'Tushundim sizni, ma\'lumotni ko\'rdim. Shartnomada ko\'rsatilgan sanagacha to\'lovni amalga oshiring.', next_default: 'q_willpay_1' },
    { id: 'change_payment_schedule', sec: 'c7', title: 'Поменять график (1 раз)', intent: 'change_payment_schedule', type: 'question', ru: 'Если вы хотите поменять дату платежа, вам необходимо оплатить текущий платеж по кредиту. Затем обратиться в отделение банка и написать заявление на изменение графика, которое будет рассматриваться в течение 15 календарных дней.', uz: 'Agar siz to\'lov sanasini o\'zgartirmoqchi bo\'lsangiz, joriy to\'lovni to\'lashingiz kerak. Keyin bank filialiga murojaat qilib ariza yozishingiz kerak.', next_default: 'change_payment_schedule_2' },
    { id: 'change_payment_schedule_2', sec: 'c7', title: 'Поменять график (2 раз)', intent: 'change_payment_schedule', type: 'question', ru: 'Как вы уже знаете, чтобы изменить дату платежа, внесите платеж по кредиту в срок и подайте заявление на изменение графика. Заявление будет рассмотрено в течение 15 календарных дней.', uz: 'To\'lov sanasini o\'zgartirish uchun o\'z vaqtida to\'lang va ariza bering.', next_default: 'change_payment_schedule_3' },
    { id: 'change_payment_schedule_3', sec: 'c7', title: 'Поменять график (3 раз)', intent: 'change_payment_schedule', type: 'question', ru: 'Как я уже упоминала, чтобы поменять дату платежа, вам нужно оплатить по кредиту вовремя и подать заявление на изменение графика.', uz: 'Avval aytganimdek, to\'lov sanasini o\'zgartirish uchun kreditni o\'z vaqtida to\'lang va ariza bering.', next_default: 'q_willpay_1' },
    { id: 'madeRecalculation', sec: 'c7', title: 'Сделали перерасчет', intent: 'madeRecalculation', type: 'end', ru: 'Поняла вас, мы сделаем дополнительную проверку. Всего доброго и до свидания!', uz: 'Tushundim, biz qo\'shimcha tekshiruv o\'tkazamiz. Yaxshi kun tilaymiz, xayr!', next_default: '' },

    // ───── c8: Отказы и особые случаи ─────
    { id: 'arrest', sec: 'c8', title: 'Арест счёта (1 раз)', intent: 'arrest', type: 'question', ru: 'Понимаю вас, это неприятная ситуация. При наличии арестов на счетах, рекомендуем Вам внести платеж на счет для погашения кредита, реквизиты Вы можете узнать в мобильном приложении {BANK_NAME}.', uz: 'Sizni tushundim, bu juda yomon holat. Agar siz hisob raqamingiz bloklangan bo\'lsa, kreditni yopish uchun {BANK_NAME} hisob raqamingizni to\'ldirrishingizni tavsiya qilamiz.', next_default: 'arrest_2' },
    { id: 'arrest_2', sec: 'c8', title: 'Арест счёта (2 раз)', intent: 'arrest', type: 'question', ru: 'Да я вас услышала, но чтобы избежать негативных последствий для вашей кредитной истории, рекомендуем вам внести платеж на счет погашения кредита, реквизиты можете узнать в мобильном приложении.', uz: 'Ha, tushundim, lekin kredit tarixingizga salbiy ta\'sir ko\'rsatmaslik uchun kredit to\'lovlarini amalga oshirishingizni maslahat beramiz.', next_default: 'arrest_3' },
    { id: 'arrest_3', sec: 'c8', title: 'Арест счёта (3 раз)', intent: 'arrest', type: 'question', ru: 'Тем не менее, оплатить возможность есть, через счет погашения кредита, реквизиты можете взять в приложении. Лучше все же успеть погасить во время.', uz: 'Aaaa, to\'lovni yana kredit xisob raqamingizni to\'ldirib amalga oshirishingiz imkoni mavjud. O\'z vaqtida amalga oshiring.', next_default: 'q_willpay_1' },
    { id: 'outOfTown', sec: 'c8', title: 'Я не в городе / терминал', intent: 'outOfTown', type: 'question', ru: 'К сожалению, вас плохо слышно. Напоминаем, что вам необходимо оплатить по кредиту до наступления даты платежа. Сообщаем, что звонки к вам будут поступать до момента полного погашения задолженности. До свидания!', uz: 'Afsuski, sizni eshita olmayapman. Eslatib o\'tamiz, kredit bo\'yicha to\'lovni to\'lov sanasidan oldin amalga oshirishingiz kerak. Xayr!', next_default: 'end_call' },
    { id: 'stopCallingMe', sec: 'c8', title: 'Хватит напоминать', intent: 'stopCallingMe', type: 'end', ru: 'Понял вас, спасибо. Тогда будем ждать платеж в срок, всего доброго. До свидания!', uz: 'Tushundim, rahmat. Unda to\'lovni o\'z vaqtida kutamiz. Xayr!', next_default: '' },
    { id: 'fraud', sec: 'c8', title: 'Мошенничество (1 раз)', intent: 'fraud', type: 'question', ru: 'Хочу вас успокоить - мы не запрашиваем у вас никаких кодов, паролей или персональных данных. Я звоню вам по вопросу предстоящего платежа по кредиту. Если хотите, вы можете самостоятельно проверить информацию - позвоните на официальный номер {BANK_NAME} {PHONE}.', uz: 'Sizni ishontirib aytmoqchimanki, biz sizdan hech qanday kod, parol yoki shaxsiy ma\'lumotlarni so\'ramaymiz. Kredit bo\'yicha to\'lov haqida qo\'ng\'iroq qilyapman.', next_default: 'fraud_2' },
    { id: 'fraud_2', sec: 'c8', title: 'Мошенничество (2 раз)', intent: 'fraud', type: 'question', ru: 'Понимаю вас, сейчас действительно важно быть осторожным. Мы не запрашиваем никаких кодов или данных. Я звоню вам, чтобы проинформировать о предстоящем платеже по кредиту.', uz: 'Sizni tushunaman, hozir haqiqatan ham ehtiyot bo\'lish kerak. Men sizdan hech qanday kod yoki ma\'lumot so\'ramayman.', next_default: 'fraud_3' },
    { id: 'fraud_3', sec: 'c8', title: 'Мошенничество (3 раз)', intent: 'fraud', type: 'question', ru: 'Еще раз повторяю, данный звонок носит информационный характер - по предстоящему платежу по кредиту. Если вам будет спокойнее, вы можете позвонить в {BANK_NAME} по номеру {PHONE} и всё уточнить.', uz: 'Yana bir bor eslatib o\'taman, ushbu qo\'ng\'iroq axborot tariqasida. Xavotirlanyotgan bo\'lsangiz, {BANK_NAME}ning {PHONE} raqamiga qo\'ng\'iroq qiling.', next_default: 'q_willpay_1' },
    { id: 'anotherAnswer', sec: 'c8', title: 'Другой ответ / не по теме', intent: 'anotherAnswer', type: 'question', ru: 'По данному вопросу вы можете обратиться в колл-центр по номеру {PHONE}. А сейчас ответьте пожалуйста на мой вопрос.', uz: 'Ushbu masala bo\'yicha {PHONE} raqamiga qo\'ng\'iroq qiling. Endi savolimga javob bering.', next_default: 'q_willpay_1' },
    { id: 'otherPaymentDate', sec: 'c8', title: 'Оплачу позже (неделя/ЗП)', intent: 'otherPaymentDate', type: 'question', ru: 'При выходе на просрочку вы испортите свою кредитную историю и Не сможете получить кредит ни в {BANK_NAME}, ни в других. А так же, это совсем не выгодно для вас, переплачивать штрафы. Для фиксации в системе: Вы внесете оплату до наступления даты платежа?', uz: 'Agar to\'lovni kechiktirsangiz, bu kredit tarixingizga salbiy ta\'sir qiladi va boshqa banklardan kredit olish imkoniyatini cheklaydi. Siz kelajakdagi to\'lovni amalga oshirishni rejalashtiryapsizmi?', next_yes: 'paid', next_no: 'final_recall', next_default: 'q_willpay_3' },
    { id: 'error_state', sec: 'c8', title: 'Непонятная речь / ошибка', intent: 'error_state', type: 'end', ru: 'Извините, видимо что-то со связью. {BANK_NAME} Напоминает о необходимости внести плановый платеж по кредиту До наступления даты платежа. До свидания.', uz: 'Uzr, ehtimol, aloqa bilan bog\'liq muammo bo\'ldi. {BANK_NAME} kredit bo\'yicha to\'lovni sana kelguniga qadar amalga oshirishingizni eslatadi. Xayr!', next_default: '' },

    // ───── c9: Завершение ─────
    { id: 'end_call', sec: 'c9', title: 'Завершение звонка', intent: 'goodbye', type: 'end', ru: 'Мы произведем дополнительную проверку погашения. Спасибо, до свидания!', uz: 'Biz to\'lovni tekshirib chiqamiz. Rahmat, xayr!', next_default: '' }
  ]
};

// ─── Template 3: Blank ────────────────────────────────────────
const TPL_BLANK = {
  name: 'Новый профиль',
  vars: { BANK_NAME: '', PHONE: '', AGENT_NAME: '' },
  sections: [{ id: 's1', label: 'Основной раздел' }],
  blocks: [
    { id: 'start', sec: 's1', title: 'Старт', intent: 'start', type: 'start', ru: '', uz: '', next_default: '' }
  ]
};

const TEMPLATES = {
  avo_limit: TPL_AVO_LIMIT,
  collection: TPL_COLLECTION,
  blank: TPL_BLANK
};

// ═══════════════════════════════════════════════════════════════
// STATE
// ═══════════════════════════════════════════════════════════════
let profiles = { 'AVO — Кредитный лимит': JSON.parse(JSON.stringify(TPL_AVO_LIMIT)) };
let activeProfile = 'AVO — Кредитный лимит';
let openBlocks = new Set();
let dirtyVars = new Set(); // unsaved variable keys

function data() {
  const p = profiles[activeProfile];
  if (p && !p._migrated) {
    ensureProfileBranches(p);
    p._migrated = true;
  }
  return p;
}

// ═══════════════════════════════════════════════════════════════
// BRANCH MIGRATION & HELPERS
// ─ Each block now has `branches: [{ id, label, color, next }]`
// ─ Old fields next_default/next_yes/next_no still kept for back-compat
// ═══════════════════════════════════════════════════════════════
const BRANCH_COLOR_DEFAULT = '#6b7280';  // grey (used for all branches by default)

function branchId() { return 'br_' + Math.random().toString(36).slice(2, 8); }

// ─ True if given hex color is dark (luminance-based) ─
function isColorDark(hex) {
  if (!hex || hex[0] !== '#') return false;
  const h = hex.length === 4 ? '#' + hex[1]+hex[1] + hex[2]+hex[2] + hex[3]+hex[3] : hex;
  const r = parseInt(h.slice(1, 3), 16);
  const g = parseInt(h.slice(3, 5), 16);
  const b = parseInt(h.slice(5, 7), 16);
  const lum = (0.299 * r + 0.587 * g + 0.114 * b);
  return lum < 130;
}

// Migrate block: if no `branches` field, build one from legacy next_*
// ALL branches get the default grey color — no more yes/no distinction
function ensureBranches(b) {
  if (Array.isArray(b.branches)) return;
  const branches = [];
  if (b.next_yes) branches.push({ id: branchId(), label: 'да', color: BRANCH_COLOR_DEFAULT, next: b.next_yes });
  if (b.next_no)  branches.push({ id: branchId(), label: 'нет', color: BRANCH_COLOR_DEFAULT, next: b.next_no });
  if (b.next_default) branches.push({ id: branchId(), label: '→', color: BRANCH_COLOR_DEFAULT, next: b.next_default });
  b.branches = branches;
}

// Keep legacy fields in sync (so old export/import code doesn't break)
function syncLegacyNext(b) {
  b.next_default = ''; b.next_yes = ''; b.next_no = '';
  (b.branches || []).forEach(br => {
    const lab = (br.label || '').trim().toLowerCase();
    if (lab === 'да' || lab === 'yes' || lab === 'ha') b.next_yes = br.next;
    else if (lab === 'нет' || lab === 'no' || lab === 'yoq' || lab === 'yo\'q') b.next_no = br.next;
    else if (!b.next_default) b.next_default = br.next;
  });
}

// Migrate ALL blocks in a profile; also sync legacy on save
function ensureProfileBranches(profile) {
  if (!profile || !profile.blocks) return;
  profile.blocks.forEach(ensureBranches);
}

// Migrate every profile at startup
Object.values(profiles).forEach(ensureProfileBranches);

// Collect all intents from all blocks (for dropdowns/CRUD)
function collectIntents() {
  const set = new Set();
  data().blocks.forEach(b => { if (b.intent) set.add(b.intent); });
  return Array.from(set).sort();
}

// ═══════════════════════════════════════════════════════════════
// UTILITIES
// ═══════════════════════════════════════════════════════════════
function esc(s) { return (s||'').replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m])); }
function interpolate(text, vars) {
  if (!text) return '';
  // Support both {VAR} and [VAR] placeholder styles (AI sometimes uses square brackets)
  return text
    .replace(/\{(\w+)\}/g, (m, k) => (vars[k] !== undefined && vars[k] !== '') ? vars[k] : m)
    .replace(/\[(\w+)\]/g, (m, k) => (vars[k] !== undefined && vars[k] !== '') ? vars[k] : m);
}
function hl(text, q) { const e = esc(text); if (!q) return e; const safe = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); return e.replace(new RegExp(safe, 'gi'), m => `<span class="highlight">${m}</span>`); }
function matches(block, q) {
  if (!q) return true;
  const low = q.toLowerCase();
  return (block.title||'').toLowerCase().includes(low) || (block.id||'').toLowerCase().includes(low) || (block.intent||'').toLowerCase().includes(low) || (block.ru||'').toLowerCase().includes(low) || (block.uz||'').toLowerCase().includes(low);
}
function uid(prefix) { return prefix + '_' + Math.random().toString(36).slice(2, 8); }
function downloadBlob(content, filename, type) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click();
  setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url); }, 100);
}

// ─── Toast notification ───────────────────────────────────────
let toastTimer = null;
// ═══════════════════════════════════════════════════════════════
// ICON SYSTEM — sharp industrial-minimal inline SVGs (opium-adapted):
// 1.5px hairline strokes, square caps, miter joins, currentColor.
// ═══════════════════════════════════════════════════════════════
const CS_ICONS = {
  spark: '<path d="M12 2l2.2 7.8L22 12l-7.8 2.2L12 22l-2.2-7.8L2 12l7.8-2.2z"/>',
  pen: '<path d="M4 20l4-1L20 7l-3-3L5 16l-1 4z"/><path d="M14 6l3 3"/>',
  save: '<path d="M12 3v10M8 9l4 4 4-4"/><path d="M4 17v4h16v-4"/>',
  trash: '<path d="M4 6h16M8 6V3h8v3M6 6l1 15h10l1-15"/><path d="M10 10v7M14 10v7"/>',
  chat: '<path d="M3 4h18v12H8l-5 5z"/>',
  robot: '<path d="M5 8h14v11H5zM12 8V4M8 4h8"/><path d="M9 12v2M15 12v2M9 17h6"/>',
  gear: '<path d="M12 2l3 3h4v4l3 3-3 3v4h-4l-3 3-3-3H5v-4l-3-3 3-3V5h4z"/><path d="M9.5 9.5h5v5h-5z"/>',
  folder: '<path d="M3 5h6l2 2h10v13H3z"/>',
  tag: '<path d="M3 3h8l10 10-8 8L3 11z"/><path d="M8 8h2v2H8z"/>',
  film: '<path d="M3 5h18v14H3zM3 9h18M7 5v14M17 5v14"/>',
  scroll: '<path d="M6 3h12v18l-3-2-3 2-3-2-3 2z"/>',
  flag: '<path d="M5 3v18M5 4h13l-3 4 3 4H5"/>',
  warn: '<path d="M12 3L22 20H2z"/><path d="M12 9v5M12 16.5v1.5"/>',
  checkDiamond: '<path d="M12 2l10 10-10 10L2 12z"/><path d="M8 12l2.5 2.5L16 9"/>',
  pin: '<path d="M12 3v5M12 16v5M3 12h5M16 12h5"/><path d="M10.5 10.5h3v3h-3z"/>',
  bookmark: '<path d="M7 3h10v18l-5-4-5 4z"/>',
  clipboard: '<path d="M9 2h6v4H9z"/><path d="M6 4v18h12V4"/><path d="M9 10h6M9 14h6"/>',
  building: '<path d="M4 21V5h9v16M13 9h7v12M2 21h20"/><path d="M7 8h3M7 12h3M7 16h3"/>',
  target: '<path d="M12 4l8 8-8 8-8-8z"/><path d="M12 9l3 3-3 3-3-3z"/>',
  swatch: '<path d="M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z"/>',
  doc: '<path d="M6 2h9l4 4v16H6z"/><path d="M15 2v4h4M9 12h7M9 16h7"/>',
  key: '<circle cx="8" cy="8" r="4"/><path d="M11 11l9 9M17 17l3-3"/>',
  search: '<circle cx="10" cy="10" r="6"/><path d="M15 15l6 6"/>',
  shuffle: '<path d="M3 6h4l10 12h4M17 4l4 4-4 4M3 18h4M17 20l4-4-4-4"/>',
  refresh: '<path d="M20 12a8 8 0 1 1-2.3-5.7"/><path d="M20 3v5h-5"/>',
  flask: '<path d="M10 2v7L4 20h16L14 9V2M8 2h8"/>'
};
function csIcon(name, size = 14, style = '') {
  const body = CS_ICONS[name];
  if (!body) return '';
  return '<svg viewBox="0 0 24 24" width="' + size + '" height="' + size + '" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="square" stroke-linejoin="miter" style="vertical-align:-2px;flex-shrink:0;' + style + '">' + body + '</svg>';
}
function csSevDiamond(color) {
  return '<svg viewBox="0 0 24 24" width="12" height="12" style="vertical-align:-1px;"><path d="M12 3l9 9-9 9-9-9z" fill="' + color + '" stroke="none"/></svg>';
}

// ═══ Expandable side rail + profile block ═══
function toggleRail() {
  const rail = document.querySelector('.side-rail');
  if (!rail) return;
  const expanded = rail.classList.toggle('expanded');
  try { localStorage.setItem('cs_rail_expanded', expanded ? '1' : '0'); } catch {}
  const t = document.querySelector('.rail-toggle .rail-tooltip');
  if (t) t.textContent = expanded ? 'Свернуть меню' : 'Развернуть меню';
}
function updateRailProfile() {
  const u = (typeof currentUser !== 'undefined' && currentUser) ? currentUser : null;
  const name = u?.user_metadata?.full_name || u?.user_metadata?.name || (u?.email ? u.email.split('@')[0] : 'Гость');
  const email = u?.email || '';
  const av = document.getElementById('rail-avatar');
  const nm = document.getElementById('rail-profile-name');
  const em = document.getElementById('rail-profile-email');
  const out = document.getElementById('rail-signout');
  if (av) av.textContent = ((name || '?').trim().charAt(0) || '?').toUpperCase();
  if (nm) nm.textContent = name;
  if (em) em.textContent = email;
  if (out) out.style.display = u ? '' : 'none';
  const prof = document.getElementById('rail-profile');
  if (prof) prof.title = email ? (name + ' · ' + email) : name;
}
(function initRail() {
  try {
    if (localStorage.getItem('cs_rail_expanded') === '1') {
      document.querySelector('.side-rail')?.classList.add('expanded');
      const t = document.querySelector('.rail-toggle .rail-tooltip');
      if (t) t.textContent = 'Свернуть меню';
    }
  } catch {}
  updateRailProfile();
})();

function toast(message, type = 'success') {
  const el = document.getElementById('toast');
  if (!el) return;
  clearTimeout(toastTimer);
  el.className = 'toast ' + type;
  const icon = type === 'success' ? '✓' : type === 'error' ? '✕' : 'ⓘ';
  el.innerHTML = `<span>${icon}</span> ${esc(message)}`;
  // trigger reflow to restart animation
  void el.offsetWidth;
  el.classList.add('show');
  toastTimer = setTimeout(() => { el.classList.remove('show'); }, type === 'error' ? 5000 : 2200);
}

// ═══════════════════════════════════════════════════════════════
// UNDO / REDO
// Snapshot-based: each mutation pushes full state clone, 50-step cap
// ═══════════════════════════════════════════════════════════════
const HISTORY_LIMIT = 50;
const history = {
  past: [],     // array of { profiles, activeProfile, label } snapshots
  future: [],
  coalesceTimer: null,
  coalesceLabel: null
};

function snapshot(label) {
  // Coalesce rapid calls with the same label (e.g., repeated drag saves)
  if (history.coalesceLabel === label && history.coalesceTimer) {
    clearTimeout(history.coalesceTimer);
    history.coalesceTimer = setTimeout(() => {
      history.coalesceLabel = null;
      history.coalesceTimer = null;
    }, 500);
    return;
  }

  const snap = {
    profiles: JSON.parse(JSON.stringify(profiles)),
    activeProfile,
    label: label || 'Действие'
  };
  history.past.push(snap);
  if (history.past.length > HISTORY_LIMIT) history.past.shift();
  history.future = []; // invalidate redo on any new action
  history.coalesceLabel = label;
  history.coalesceTimer = setTimeout(() => {
    history.coalesceLabel = null;
    history.coalesceTimer = null;
  }, 500);
  updateUndoUI();
}

function undo() {
  if (!history.past.length) { toast('Нечего отменять', 'info'); return; }
  // Save current state to future
  history.future.push({
    profiles: JSON.parse(JSON.stringify(profiles)),
    activeProfile,
    label: history.past[history.past.length - 1].label
  });
  const snap = history.past.pop();
  profiles = snap.profiles;
  activeProfile = snap.activeProfile;
  rerenderAll();
  updateUndoUI();
  toast(`↶ Отменено: ${snap.label}`);
}

function redo() {
  if (!history.future.length) { toast('Нечего повторить', 'info'); return; }
  history.past.push({
    profiles: JSON.parse(JSON.stringify(profiles)),
    activeProfile,
    label: history.future[history.future.length - 1].label
  });
  const snap = history.future.pop();
  profiles = snap.profiles;
  activeProfile = snap.activeProfile;
  rerenderAll();
  updateUndoUI();
  toast(`↷ Повторено: ${snap.label}`);
}

function rerenderAll() {
  renderProfiles();
  renderBlocks();
  renderVars();
  renderStats();
  // Refresh tabs that are currently visible
  const activeTabBtn = document.querySelector('.rail-btn.active');
  const tab = activeTabBtn?.dataset?.tab;
  if (tab === 'canvas') canvasRender();
  if (tab === 'preview') renderPreview();
  if (tab === 'validate') renderValidation();
}

function updateUndoUI() {
  const pastLen = history.past.length;
  const futLen = history.future.length;
  const pastLabel = pastLen ? history.past[pastLen-1].label : '';
  const futLabel = futLen ? history.future[futLen-1].label : '';

  ['btn-undo', 'btn-undo-float'].forEach(bid => {
    const btn = document.getElementById(bid);
    if (!btn) return;
    btn.disabled = !pastLen;
    btn.title = pastLen ? `Отменить: ${pastLabel} (Ctrl+Z)` : 'Нечего отменять (Ctrl+Z)';
  });
  ['btn-redo', 'btn-redo-float'].forEach(bid => {
    const btn = document.getElementById(bid);
    if (!btn) return;
    btn.disabled = !futLen;
    btn.title = futLen ? `Повторить: ${futLabel} (Ctrl+Shift+Z)` : 'Нечего повторить (Ctrl+Shift+Z)';
  });
}

// Global keyboard shortcuts
document.addEventListener('keydown', (e) => {
  // Ignore if typing in input/textarea
  const tag = (e.target.tagName || '').toLowerCase();
  if (tag === 'input' || tag === 'textarea' || tag === 'select') return;
  if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key.toLowerCase() === 'z') {
    e.preventDefault();
    undo();
  } else if ((e.ctrlKey || e.metaKey) && (e.key.toLowerCase() === 'y' || (e.shiftKey && e.key.toLowerCase() === 'z'))) {
    e.preventDefault();
    redo();
  }
});

// ═══════════════════════════════════════════════════════════════
// STATS CARDS
// ═══════════════════════════════════════════════════════════════
function renderStats() {
  const d = data();
  const questionCount = d.blocks.filter(b => b.type === 'question').length;
  const decisionCount = d.blocks.filter(b => b.type === 'decision').length;
  const endCount = d.blocks.filter(b => b.type === 'end' || b.type === 'start').length;
  const varsCount = Object.keys(d.vars).length;
  const langsCovered = d.blocks.filter(b => b.ru && b.uz).length;
  const langCoverage = d.blocks.length ? Math.round((langsCovered / d.blocks.length) * 100) : 0;

  document.getElementById('stats-grid').innerHTML = `
    <div class="stat-card grad-blue">
      <div class="stat-label">Всего блоков</div>
      <div class="stat-value">${d.blocks.length}</div>
      <div class="stat-sub">в ${d.sections.length} разделах</div>
      <div class="stat-icon si-blue"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg></div>
    </div>
    <div class="stat-card grad-orange">
      <div class="stat-label">Вопросов клиента</div>
      <div class="stat-value">${questionCount}</div>
      <div class="stat-sub">оранжевые блоки</div>
      <div class="stat-icon si-orange"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg></div>
    </div>
    <div class="stat-card grad-purple">
      <div class="stat-label">Развилок</div>
      <div class="stat-value">${decisionCount}</div>
      <div class="stat-sub">ромбы-решения</div>
      <div class="stat-icon si-purple"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 22 12 12 22 2 12 12 2"/></svg></div>
    </div>
    <div class="stat-card grad-green">
      <div class="stat-label">Покрытие языков</div>
      <div class="stat-value">${langCoverage}%</div>
      <div class="stat-sub">${langsCovered} / ${d.blocks.length} блоков</div>
      <div class="stat-icon si-green"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg></div>
    </div>
    <div class="stat-card grad-teal">
      <div class="stat-label">Переменных</div>
      <div class="stat-value">${varsCount}</div>
      <div class="stat-sub">для подстановки</div>
      <div class="stat-icon si-teal"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 3H7a2 2 0 0 0-2 2v5a2 2 0 0 1-2 2 2 2 0 0 1 2 2v5a2 2 0 0 0 2 2h1"/><path d="M16 21h1a2 2 0 0 0 2-2v-5a2 2 0 0 1 2-2 2 2 0 0 1-2-2V5a2 2 0 0 0-2-2h-1"/></svg></div>
    </div>
    <div class="stat-card grad-red">
      <div class="stat-label">Конечных точек</div>
      <div class="stat-value">${endCount}</div>
      <div class="stat-sub">старт + завершения</div>
      <div class="stat-icon si-red"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="5" width="14" height="14" rx="2" fill="currentColor"/></svg></div>
    </div>
  `;
  // refresh validation indicator
  if (typeof updateValidationBadge === 'function') updateValidationBadge();
}

// ═══════════════════════════════════════════════════════════════
// PROFILES with modal
// ═══════════════════════════════════════════════════════════════
function renderProfiles() {
  const names = Object.keys(profiles);
  // Update trigger label
  const cur = document.getElementById('profile-dd-current');
  if (cur) cur.textContent = activeProfile || '—';
  setTimeout(updateShareButton, 0);
  // Build menu
  const menu = document.getElementById('profile-dd-menu');
  if (menu) {
    menu.innerHTML = names.map(name => `
      <button class="profile-dd-item ${name === activeProfile ? 'active' : ''}" onclick="switchProfile('${esc(name)}'); closeProfileDropdown();">
        <span class="profile-dd-dot"></span>
        <span class="profile-dd-name">${esc(name)}</span>
        ${name === activeProfile ? '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>' : ''}
      </button>
    `).join('');
  }
}

function toggleProfileDropdown(e) {
  if (e) e.stopPropagation();
  const dd = document.getElementById('profile-dropdown');
  if (dd) dd.classList.toggle('open');
  updateShareButton();
}

function closeProfileDropdown() {
  const dd = document.getElementById('profile-dropdown');
  if (dd) dd.classList.remove('open');
}

// Close dropdown when clicking outside
document.addEventListener('click', (e) => {
  const dd = document.getElementById('profile-dropdown');
  if (dd && dd.classList.contains('open') && !dd.contains(e.target)) {
    dd.classList.remove('open');
  }
});

function switchProfile(name) {
  activeProfile = name;
  openBlocks.clear();
  dirtyVars.clear();
  canvasState.selectedId = null;
  canvasState.zoom = 1;
  canvasState.panX = 0;
  canvasState.panY = 0;
  renderProfiles(); renderBlocks(); renderVars(); renderStats();
}

function newProfile() {
  // open the template-selection modal
  const modal = document.getElementById('template-modal');
  const input = document.getElementById('modal-profile-name');
  input.value = 'Новый банк';
  // reset radio buttons
  document.querySelectorAll('input[name="tpl"]').forEach((r, i) => { r.checked = (i === 0); });
  modal.style.display = 'flex';
  setTimeout(() => input.focus(), 50);
}

function closeTemplateModal() {
  document.getElementById('template-modal').style.display = 'none';
}

function confirmNewProfile() {
  const name = document.getElementById('modal-profile-name').value.trim();
  if (!name) { toast('Введите название профиля', 'error'); return; }
  if (profiles[name]) { toast('Профиль с таким названием уже существует', 'error'); return; }
  snapshot('Новый профиль');
  const tpl = document.querySelector('input[name="tpl"]:checked')?.value || 'avo_limit';
  profiles[name] = JSON.parse(JSON.stringify(TEMPLATES[tpl]));
  profiles[name].name = name;
  activeProfile = name;
  closeTemplateModal();
  renderProfiles(); renderBlocks(); renderVars(); renderStats();
  toast(`Профиль «${name}» создан`);
}

function renameProfile() {
  const n = prompt('Новое название:', activeProfile);
  if (!n || n === activeProfile || profiles[n]) return;
  snapshot('Переименование профиля');
  profiles[n] = profiles[activeProfile]; profiles[n].name = n;
  delete profiles[activeProfile]; activeProfile = n;
  renderProfiles(); renderBlocks();
  toast('Профиль переименован');
}

function deleteProfile() {
  if (Object.keys(profiles).length <= 1) { toast('Нужен хотя бы один профиль', 'error'); return; }
  const p = profiles[activeProfile];
  if (p && p._readOnly) { toast('Это общий профиль коллеги — его нельзя удалить', 'error'); return; }
  if (!confirm(`Удалить «${activeProfile}»?`)) return;
  snapshot('Удаление профиля');
  // Удалить из облака
  if (p && p._cloudId && typeof cloudDeleteProfile === 'function') {
    cloudDeleteProfile(p._cloudId);
  }
  delete profiles[activeProfile];
  activeProfile = Object.keys(profiles)[0];
  renderProfiles(); renderBlocks(); renderVars(); renderStats();
  toast('Профиль удалён');
}

function toggleShareProfile() {
  const p = profiles[activeProfile];
  if (!p) return;
  if (p._readOnly) { toast('Это общий профиль коллеги', 'error'); return; }
  if (!getCurrentUserId()) { toast('Войдите, чтобы делиться профилями', 'error'); return; }
  p._isShared = !p._isShared;
  toast(p._isShared ? '✓ Профиль теперь виден команде' : 'Профиль снова личный');
  updateShareButton();
  if (typeof cloudPushProfiles === 'function') cloudPushProfiles();
}

function updateShareButton() {
  const btn = document.getElementById('share-profile-btn');
  if (!btn) return;
  const p = profiles[activeProfile];
  const shared = p && p._isShared;
  btn.classList.toggle('active', !!shared);
  btn.title = shared ? 'Виден команде — нажмите чтобы сделать личным' : 'Сделать видимым для команды';
}

// ═══════════════════════════════════════════════════════════════
// BLOCKS
// ═══════════════════════════════════════════════════════════════
function renderBlocks() {
  const d = data();
  const q = document.getElementById('search').value.trim();
  const lang = document.getElementById('lang-filter').value;
  const list = document.getElementById('blocks-list');
  let html = ''; let total = 0;
  const allIds = d.blocks.map(b => b.id);

  d.sections.forEach(sec => {
    const blocks = d.blocks.filter(b => b.sec === sec.id && matches(b, q));
    total += blocks.length;
    if (!blocks.length && q) return;

    html += `<div class="section">
      <div class="section-header">
        <span class="section-title">${esc(sec.label)}</span>
        <span class="section-count">${blocks.length}</span>
        <button class="icon-btn" onclick="addBlock('${sec.id}')" title="+ блок">+</button>
        <button class="icon-btn" onclick="renameSection('${sec.id}')" title="Переименовать">${csIcon('pen',12)}</button>
        <button class="icon-btn" onclick="deleteSection('${sec.id}')" title="Удалить">×</button>
      </div>`;

    blocks.forEach(b => {
      ensureBranches(b);
      const isOpen = openBlocks.has(b.id);
      const showRU = lang !== 'uz';
      const showUZ = lang !== 'ru';
      const type = b.type || 'normal';

      html += `<div class="block ${isOpen ? 'open' : ''}">
        <div class="block-head" onclick="toggleBlock('${b.id}')">
          <div class="type-dot dot-${type}"></div>
          <span class="block-title">${hl(b.title, q)}</span>
          <span class="block-id">${esc(b.id)}</span>
          <span class="block-chev ${isOpen ? 'open' : ''}">▶</span>
        </div>`;

      // LAZY: only render the heavy body for OPEN blocks (huge perf win on 100+ blocks)
      if (isOpen) {
      html += `
        <div class="block-body">
          <div class="field-grid-4">
            <div class="field">
              <label class="field-label">Название</label>
              <input class="input" id="ft-${b.id}" value="${esc(b.title)}">
            </div>
            <div class="field">
              <label class="field-label">Intent</label>
              <input class="input" id="fi-${b.id}" value="${esc(b.intent||'')}">
            </div>
            <div class="field">
              <label class="field-label">Тип узла</label>
              <select class="input" id="fty-${b.id}">
                <option value="start" ${type==='start'?'selected':''}>Начало</option>
                <option value="normal" ${type==='normal'?'selected':''}>Ответ бота (белый)</option>
                <option value="question" ${type==='question'?'selected':''}>Вопрос клиента (оранжевый)</option>
                <option value="decision" ${type==='decision'?'selected':''}>Решение / ромб</option>
                <option value="end" ${type==='end'?'selected':''}>Конец</option>
              </select>
            </div>
            <div class="field">
              <label class="field-label">Колонка в схеме</label>
              <select class="input" id="flane-${b.id}">
                <option value="auto" ${(!b.lane || b.lane==='auto')?'selected':''}>Авто</option>
                <option value="left" ${b.lane==='left'?'selected':''}>← Левая (отказы)</option>
                <option value="center" ${b.lane==='center'?'selected':''}>↕ Центр (основной путь)</option>
                <option value="right" ${b.lane==='right'?'selected':''}>→ Правая (вопросы)</option>
              </select>
            </div>
          </div>
          <div class="connections">
            <div class="connections-title">
              Ветки (связи со следующими блоками)
              <button class="cs-add-branch" style="float:right;" onclick="addBranchInList('${b.id}')" title="Добавить ветку">+ ветка</button>
            </div>
            <div id="br-list-${b.id}">
              ${((b.branches && b.branches.length) ? b.branches : []).map((br, idx) => `
                <div class="cs-branch-row" data-block-id="${b.id}" data-br-idx="${idx}">
                  <input type="color" class="cs-branch-color" value="${br.color || BRANCH_COLOR_DEFAULT}" title="Цвет ветки">
                  <input type="text" class="cs-branch-label" value="${esc(br.label || '')}" placeholder="лейбл (да / rus / ...)">
                  <select class="cs-branch-next">
                    <option value="">— выбрать блок —</option>
                    ${allIds.filter(id => id !== b.id).map(id => {
                      const blk = d.blocks.find(x => x.id === id);
                      return `<option value="${id}" ${br.next===id?'selected':''}>${esc(id)} — ${esc(blk?blk.title:'')}</option>`;
                    }).join('')}
                  </select>
                  <button class="cs-branch-del" onclick="removeBranchInList('${b.id}', ${idx})" title="Удалить">×</button>
                </div>
              `).join('') || '<div class="cs-branches-empty">Нет веток. Нажмите «+ ветка» чтобы добавить связь.</div>'}
            </div>
          </div>
          <div class="field-grid-2" style="margin-bottom: 0;">
            ${showRU ? `<div class="field">
              <label class="field-label">Русский</label>
              <textarea class="textarea" id="fr-${b.id}">${esc(b.ru)}</textarea>
            </div>` : ''}
            ${showUZ ? `<div class="field">
              <label class="field-label">O'zbek</label>
              <textarea class="textarea" id="fu-${b.id}">${esc(b.uz)}</textarea>
            </div>` : ''}
          </div>
          <div class="vars-hint">Переменные: ${Object.keys(d.vars).map(v => `<span class="var-chip">{${v}}</span>`).join('')}</div>
          <div class="ai-block-group" style="margin: 12px 0;">
            <div class="ai-block-title">
              <span>${csIcon('robot',13)} AI-помощник</span>
              <span class="ai-status-badge" onclick="openLLMSettings()" title="Настроить API ключ">${csIcon('gear',12)}</span>
            </div>
            <div class="ai-buttons-grid">
              ${renderStyleButtons(b.id, 'improveBlockTextInList')}
            </div>
          </div>
          <div class="block-actions">
            <select class="select" id="fs-${b.id}" style="font-size: 12px;">
              ${d.sections.map(s => `<option value="${s.id}" ${s.id===b.sec?'selected':''}>→ ${esc(s.label)}</option>`).join('')}
            </select>
            <button class="btn btn-sm btn-danger" onclick="deleteBlock('${b.id}')">Удалить</button>
            <button class="btn btn-sm btn-primary" onclick="saveBlock('${b.id}')">Сохранить</button>
          </div>
        </div>`;
      } // end if(isOpen)
      html += `</div>`;
    });
    html += '</div>';
  });

  if (!total && q) html = `<div class="empty">Ничего не найдено по «${esc(q)}»</div>`;
  list.innerHTML = html;
}

function toggleBlock(id) { if (openBlocks.has(id)) openBlocks.delete(id); else openBlocks.add(id); renderBlocks(); }

function saveBlock(id) {
  const b = data().blocks.find(x => x.id === id); if (!b) return;
  snapshot('Редактирование блока');
  const g = (k) => document.getElementById(k+'-'+id);
  if (g('ft')) b.title = g('ft').value;
  if (g('fi')) b.intent = g('fi').value;
  if (g('fty')) b.type = g('fty').value;
  if (g('flane')) b.lane = g('flane').value;
  if (g('fr')) b.ru = g('fr').value;
  if (g('fu')) b.uz = g('fu').value;
  if (g('fs')) b.sec = g('fs').value;
  // Read branches from block's editor rows
  const rows = document.querySelectorAll(`#br-list-${CSS.escape(id)} .cs-branch-row`);
  if (rows.length !== undefined) {
    const branches = [];
    rows.forEach(row => {
      const color = row.querySelector('.cs-branch-color')?.value || BRANCH_COLOR_DEFAULT;
      const label = row.querySelector('.cs-branch-label')?.value || '';
      const next = row.querySelector('.cs-branch-next')?.value || '';
      branches.push({ id: branchId(), label, color, next });
    });
    b.branches = branches;
    syncLegacyNext(b);
  }
  renderBlocks(); renderStats();
  toast(`Блок «${b.title}» сохранён`);
}

function deleteBlock(id) {
  if (!confirm('Удалить блок?')) return;
  snapshot('Удаление блока');
  data().blocks = data().blocks.filter(b => b.id !== id);
  data().blocks.forEach(b => {
    ensureBranches(b);
    b.branches = (b.branches || []).filter(br => br.next !== id);
    if (b.next_default === id) b.next_default = '';
    if (b.next_yes === id) b.next_yes = '';
    if (b.next_no === id) b.next_no = '';
  });
  openBlocks.delete(id);
  renderBlocks(); renderStats();
  toast('Блок удалён');
}

function addBlock(secId) {
  snapshot('Добавление блока');
  const id = uid('b');
  data().blocks.push({ id, sec: secId, title: 'Новый блок', intent: '', type: 'normal', ru: '', uz: '', branches: [], next_default: '', next_yes: '', next_no: '' });
  openBlocks.add(id);
  renderBlocks(); renderStats();
}

// Branch CRUD helpers for the list editor (Блоки tab)
function readBranchesFromBlockList(blockId) {
  const rows = document.querySelectorAll(`#br-list-${CSS.escape(blockId)} .cs-branch-row`);
  const branches = [];
  rows.forEach(row => {
    const color = row.querySelector('.cs-branch-color')?.value || BRANCH_COLOR_DEFAULT;
    const label = row.querySelector('.cs-branch-label')?.value || '';
    const next = row.querySelector('.cs-branch-next')?.value || '';
    branches.push({ id: branchId(), label, color, next });
  });
  return branches;
}

function addBranchInList(blockId) {
  const b = data().blocks.find(x => x.id === blockId);
  if (!b) return;
  snapshot('Добавление ветки');
  // Capture any unsaved edits first
  b.branches = readBranchesFromBlockList(blockId);
  b.branches.push({ id: branchId(), label: '', color: BRANCH_COLOR_DEFAULT, next: '' });
  renderBlocks();
}

function removeBranchInList(blockId, idx) {
  const b = data().blocks.find(x => x.id === blockId);
  if (!b) return;
  snapshot('Удаление ветки');
  b.branches = readBranchesFromBlockList(blockId);
  b.branches.splice(idx, 1);
  renderBlocks();
}

function addSection() {
  const label = prompt('Название раздела:', 'Новый раздел');
  if (!label) return;
  snapshot('Добавление раздела');
  data().sections.push({ id: uid('s'), label });
  renderBlocks(); renderStats();
}

function renameSection(id) {
  const s = data().sections.find(x => x.id === id); if (!s) return;
  const n = prompt('Новое название:', s.label);
  if (n) { snapshot('Переименование раздела'); s.label = n; renderBlocks(); toast('Раздел переименован'); }
}

function deleteSection(id) {
  const count = data().blocks.filter(b => b.sec === id).length;
  if (!confirm(`Удалить раздел и ${count} блоков внутри?`)) return;
  snapshot('Удаление раздела');
  data().sections = data().sections.filter(s => s.id !== id);
  data().blocks = data().blocks.filter(b => b.sec !== id);
  renderBlocks(); renderStats();
  toast('Раздел удалён');
}

// ═══════════════════════════════════════════════════════════════
// VARIABLES with dirty state + save button
// ═══════════════════════════════════════════════════════════════
function renderVars() {
  const d = data();
  // Load meta header fields
  const meta = d.meta || {};
  const setVal = (id, v) => { const el = document.getElementById(id); if (el) el.value = v || ''; };
  setVal('meta-author', meta.author);
  setVal('meta-version', meta.version);
  setVal('meta-description', meta.description);
  setVal('meta-goal', meta.goal);
  const html = Object.entries(d.vars).map(([k, v]) => {
    const isDirty = dirtyVars.has(k);
    return `
      <div class="var-card ${isDirty ? 'dirty' : ''}" data-key="${esc(k)}">
        <label>{${esc(k)}}</label>
        <input class="input" value="${esc(v)}" oninput="markVarDirty('${esc(k)}')" data-var="${esc(k)}">
        <button class="var-save" onclick="saveVar('${esc(k)}')">${csIcon('save',12)} Сохранить</button>
        <button class="var-del" onclick="deleteVar('${esc(k)}')">удалить</button>
      </div>
    `;
  }).join('');
  document.getElementById('vars-grid').innerHTML = html || '<div class="empty">Нет переменных. Нажмите «+ добавить переменную» чтобы создать первую.</div>';
}

function markMetaDirty() {
  const ind = document.getElementById('vars-saved-indicator');
  if (ind) { ind.textContent = 'Есть несохранённые изменения шапки'; ind.style.color = 'var(--warn)'; }
}

function saveMeta() {
  const d = data();
  if (!d.meta) d.meta = {};
  d.meta.author = document.getElementById('meta-author')?.value || '';
  d.meta.version = document.getElementById('meta-version')?.value || '';
  d.meta.description = document.getElementById('meta-description')?.value || '';
  d.meta.goal = document.getElementById('meta-goal')?.value || '';
  snapshot('Изменение шапки скрипта');
  saveToStorage();
  const ind = document.getElementById('vars-saved-indicator');
  if (ind) { ind.textContent = '✓ Шапка сохранена'; ind.style.color = 'var(--ok)'; }
  toast('✓ Шапка скрипта сохранена');
}

function markVarDirty(k) {
  dirtyVars.add(k);
  const card = document.querySelector(`.var-card[data-key="${k}"]`);
  if (card) card.classList.add('dirty');
}

function saveVar(k) {
  const card = document.querySelector(`.var-card[data-key="${k}"]`);
  if (!card) return;
  const input = card.querySelector('input[data-var]');
  if (!input) return;
  if (data().vars[k] !== input.value) snapshot('Изменение переменной');
  data().vars[k] = input.value;
  dirtyVars.delete(k);
  card.classList.remove('dirty');
  toast(`Переменная {${k}} сохранена`);
}

function saveAllVars() {
  const d = data();
  let changed = false;
  document.querySelectorAll('.var-card[data-key]').forEach(card => {
    const key = card.dataset.key;
    const input = card.querySelector('input[data-var]');
    if (input && d.vars[key] !== input.value) changed = true;
  });
  if (changed) snapshot('Сохранение переменных');
  let saved = 0;
  document.querySelectorAll('.var-card[data-key]').forEach(card => {
    const key = card.dataset.key;
    const input = card.querySelector('input[data-var]');
    if (input) {
      data().vars[key] = input.value;
      if (dirtyVars.has(key)) saved++;
      dirtyVars.delete(key);
      card.classList.remove('dirty');
    }
  });
  const indicator = document.getElementById('vars-saved-indicator');
  if (indicator) {
    indicator.textContent = `✓ Сохранено${saved ? ' (изменено: ' + saved + ')' : ' — всё актуально'}`;
    indicator.classList.add('show');
    setTimeout(() => indicator.classList.remove('show'), 2500);
  }
  toast(saved ? `Сохранено переменных: ${saved}` : 'Изменений не было');
}

function addVariable() {
  const k = prompt('Имя переменной (только латиница и цифры, без пробелов):', 'NEW_VAR');
  if (!k) return;
  if (!/^\w+$/.test(k)) { toast('Неверное имя. Только буквы, цифры, подчёркивание.', 'error'); return; }
  if (data().vars[k] !== undefined) { toast('Переменная уже существует', 'error'); return; }
  const v = prompt('Значение:', '');
  if (v === null) return;
  snapshot('Добавление переменной');
  data().vars[k] = v;
  renderVars(); renderStats();
  toast(`Переменная {${k}} создана`);
}

function deleteVar(k) {
  if (!confirm(`Удалить переменную {${k}}?`)) return;
  snapshot('Удаление переменной');
  delete data().vars[k];
  dirtyVars.delete(k);
  renderVars(); renderStats();
  toast(`Переменная {${k}} удалена`);
}

// ═══════════════════════════════════════════════════════════════
// TAB SWITCHING
// ═══════════════════════════════════════════════════════════════
function switchTab(tab, btn) {
  // Stop simulator when leaving canvas
  if (simState.active && tab !== 'canvas') {
    simStop();
  }
  // Reset active state for both .tab (legacy) and .rail-btn (new sidebar)
  document.querySelectorAll('.tab, .rail-btn').forEach(t => t.classList.remove('active'));
  if (btn) btn.classList.add('active');
  // If switched programmatically without a button (e.g. from code), find the rail button by data-tab
  if (!btn) {
    const railBtn = document.querySelector(`.rail-btn[data-tab="${tab}"]`);
    if (railBtn) railBtn.classList.add('active');
  }
  ['editor', 'vars', 'intents', 'canvas', 'refs', 'preview', 'validate', 'export'].forEach(t => {
    const el = document.getElementById('tab-'+t);
    if (el) el.style.display = (t === tab) ? 'block' : 'none';
  });
  if (tab === 'vars') renderVars();
  if (tab === 'intents') renderIntents();
  if (tab === 'preview') renderPreview();
  if (tab === 'canvas') canvasRender();
  if (tab === 'refs') renderReferences();
  if (tab === 'validate') renderValidation();
  if (tab === 'export') renderLayoutIndicator();
}

// ═══════════════════════════════════════════════════════════════
// FLOWCHART: 3-column swim-lane layout
// Center = happy path, Left = refusals/dead-ends, Right = questions/loops
// ═══════════════════════════════════════════════════════════════
// ─── Safe text for SVG (NO HTML entities — SVG uses raw chars) ───
function svgText(s) {
  return (s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// ─── Wrap text into multiple <tspan> lines ────────────────────
function svgWrapText(x, baseY, text, maxChars, lineH, attrs) {
  const words = text.split(' ');
  const lines = [];
  let cur = '';
  words.forEach(w => {
    const test = cur ? cur + ' ' + w : w;
    if (test.length > maxChars && cur) { lines.push(cur); cur = w; }
    else cur = test;
  });
  if (cur) lines.push(cur);
  // Max 3 lines; truncate last
  if (lines.length > 3) { lines.length = 3; lines[2] = lines[2].substring(0, maxChars - 1) + '…'; }
  const totalH = lines.length * lineH;
  const startY = baseY - totalH / 2 + lineH / 2;
  return lines.map((l, i) =>
    `<tspan x="${x}" y="${startY + i * lineH}" ${attrs}>${svgText(l)}</tspan>`
  ).join('');
}

// ═══════════════════════════════════════════════════════════════
// LAYOUT: Sugiyama-style layering
// ─ Assign row (rank) to every block using longest-path from roots
// ─ Never put a block on a row above its parent → no upward edges
// ─ Counter groups (intent_2, intent_3) go on the SAME row
// ═══════════════════════════════════════════════════════════════
function buildLayout(blocks) {
  if (!blocks.length) return { rank: {}, cols: {}, pos: {}, byId: {}, groupOf: {}, happyPath: new Set() };

  const byId = {};
  blocks.forEach(b => byId[b.id] = b);

  // ── Detect counter groups ──────────────────────────────────
  const counterGroups = new Map();
  blocks.forEach(b => {
    if (!b.intent) return;
    const base = b.id.replace(/_\d+$/, '');
    if (base === b.intent || b.id === b.intent) {
      if (!counterGroups.has(b.intent)) counterGroups.set(b.intent, []);
      counterGroups.get(b.intent).push(b.id);
    }
  });
  const groupOf = {};
  counterGroups.forEach(ids => {
    if (ids.length < 2) return;
    ids.sort((a, b) => {
      const na = parseInt((a.match(/_(\d+)$/) || [,'1'])[1], 10);
      const nb = parseInt((b.match(/_(\d+)$/) || [,'1'])[1], 10);
      return na - nb;
    });
    const leader = ids[0];
    ids.forEach(id => groupOf[id] = leader);
  });

  // ── Build edges, but SKIP counter-group internal edges ─────
  // (they connect horizontally, not vertically)
  const edges = []; // { from, to }
  blocks.forEach(b => {
    ['next_default', 'next_yes', 'next_no'].forEach(k => {
      const to = b[k];
      if (!to || !byId[to]) return;
      // Skip if both in same group (these are horizontal counters)
      if (groupOf[b.id] && groupOf[b.id] === groupOf[to]) return;
      edges.push({ from: b.id, to });
    });
  });

  // ── Longest-path ranking (bottom-up from sinks) ───────────
  const childrenOf = {};
  const parentsOf = {};
  blocks.forEach(b => { childrenOf[b.id] = []; parentsOf[b.id] = []; });
  edges.forEach(e => {
    if (!childrenOf[e.from]) childrenOf[e.from] = [];
    if (!parentsOf[e.to]) parentsOf[e.to] = [];
    childrenOf[e.from].push(e.to);
    parentsOf[e.to].push(e.from);
  });

  // DFS to compute longest path from any root
  const rank = {};
  const visited = new Set();
  function dfs(id) {
    if (visited.has(id)) return rank[id] || 0;
    visited.add(id);
    const children = (childrenOf[id] || []).filter(c => c !== id); // no self-loops
    if (!children.length) { rank[id] = 0; return 0; }
    const maxChild = Math.max(...children.map(dfs));
    rank[id] = maxChild + 1;
    return rank[id];
  }
  // Find roots (no parents)
  const roots = blocks.filter(b => !(parentsOf[b.id] || []).length);
  if (!roots.length) roots.push(blocks[0]);

  // Process roots first, then anything unvisited
  roots.forEach(r => dfs(r.id));
  blocks.forEach(b => { if (!visited.has(b.id)) dfs(b.id); });

  // ── Normalize: max rank = row 0 at top ────────────────────
  const maxRank = Math.max(...Object.values(rank), 0);
  const normalRank = {};
  blocks.forEach(b => { normalRank[b.id] = maxRank - (rank[b.id] || 0); });

  // ── Counter group: all members get leader's row ────────────
  Object.entries(groupOf).forEach(([m, leader]) => {
    if (m !== leader) normalRank[m] = normalRank[leader];
  });

  // ── Assign lanes: center (happy path), left, right ─────────
  const happyPath = new Set();
  roots.forEach(r => {
    let cur = r.id, safety = 0;
    while (cur && byId[cur] && safety++ < 200) {
      happyPath.add(cur);
      cur = byId[cur].next_default;
      if (happyPath.has(cur)) break; // avoid infinite loop
    }
  });

  const getLane = (b) => {
    if (b.lane && b.lane !== 'auto') return b.lane;
    if (groupOf[b.id] && groupOf[b.id] !== b.id) {
      const ldr = byId[groupOf[b.id]];
      if (ldr && ldr.lane && ldr.lane !== 'auto') return ldr.lane;
    }
    if (happyPath.has(b.id)) return 'center';
    if (b.type === 'start') return 'center';
    if (b.type === 'decision') return 'center';
    if (b.type === 'end') return 'left';
    if (b.type === 'question') return 'right';
    return 'right';
  };

  const laneOf = {};
  blocks.forEach(b => { laneOf[b.id] = getLane(b); });
  // Group members inherit leader lane
  Object.entries(groupOf).forEach(([m, l]) => {
    if (m !== l) laneOf[m] = laneOf[l];
  });

  // ── Build row buckets per lane ─────────────────────────────
  // rowCells[row][lane] = [ids in order]
  const rowCells = {};
  blocks.forEach(b => {
    const r = normalRank[b.id];
    if (!rowCells[r]) rowCells[r] = { left: [], center: [], right: [] };
    const ln = laneOf[b.id] || 'center';
    // Don't add counter members to the same slot more than once if leader already there
    rowCells[r][ln].push(b.id);
  });

  // Sort each cell: counter group members adjacent by suffix
  Object.values(rowCells).forEach(cell => {
    ['left', 'center', 'right'].forEach(ln => {
      cell[ln].sort((a, b) => {
        const ga = groupOf[a] || a, gb = groupOf[b] || b;
        if (ga !== gb) return ga.localeCompare(gb);
        const na = parseInt((a.match(/_(\d+)$/) || [,'1'])[1], 10);
        const nb = parseInt((b.match(/_(\d+)$/) || [,'1'])[1], 10);
        return na - nb;
      });
    });
  });

  return { rank: normalRank, rowCells, byId, groupOf, laneOf, happyPath };
}

// ═══════════════════════════════════════════════════════════════
// SVG RENDERER — clean rebuild, text wrapping, Cybernet style
// ═══════════════════════════════════════════════════════════════
function buildCybernetSVG(lang, scale, opts = {}) {
  const d = data();
  if (!d.blocks.length) return '<svg xmlns="http://www.w3.org/2000/svg" width="400" height="100"><text x="200" y="50" text-anchor="middle" font-size="14" fill="#999">Нет блоков</text></svg>';

  const { rank, rowCells, byId, groupOf, laneOf, happyPath } = buildLayout(d.blocks);
  const showLanes = opts.showLanes !== false;

  // ── Geometry ──────────────────────────────────────────────
  const NW = 190, NH = 64;
  const HG = 18, VG = 90, LG = 70, PAD = 50;

  // ── Detect if user has manual Canvas layout ───────────────
  // If at least half the blocks have x,y coords → use manual positions
  const blocksWithCoords = d.blocks.filter(b => typeof b.x === 'number' && typeof b.y === 'number');
  const useManualLayout = opts.useManualCoords !== false && blocksWithCoords.length > d.blocks.length / 2;

  const pos = {};
  let canvasW, canvasH;

  if (useManualLayout) {
    // ─── Use manual x, y from Canvas ───
    let minX = Infinity, minY = Infinity, maxX = 0, maxY = 0;
    d.blocks.forEach(b => {
      const x = typeof b.x === 'number' ? b.x : 0;
      const y = typeof b.y === 'number' ? b.y : 0;
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x + NW);
      maxY = Math.max(maxY, y + NH);
    });
    // Normalize so top-left starts at PAD,PAD
    const offsetX = PAD - minX;
    const offsetY = PAD - minY;
    d.blocks.forEach(b => {
      const x = typeof b.x === 'number' ? b.x : 0;
      const y = typeof b.y === 'number' ? b.y : 0;
      pos[b.id] = { x: x + offsetX, y: y + offsetY };
    });
    canvasW = maxX - minX + PAD * 2;
    canvasH = maxY - minY + PAD * 2;
  } else {
    // ─── Auto swim-lane positions ───
    const rows = Object.keys(rowCells).map(Number).sort((a, b) => a - b);
    if (!rows.length) return '';
    let maxL = 0, maxC = 1, maxR = 0;
    rows.forEach(r => {
      const cell = rowCells[r];
      maxL = Math.max(maxL, cell.left.length);
      maxC = Math.max(maxC, cell.center.length);
      maxR = Math.max(maxR, cell.right.length);
    });
    const laneW = {
      left:   maxL * NW + Math.max(0, maxL - 1) * HG,
      center: maxC * NW + Math.max(0, maxC - 1) * HG,
      right:  maxR * NW + Math.max(0, maxR - 1) * HG
    };
    const laneX = {
      left:   PAD,
      center: PAD + (laneW.left  ? laneW.left + LG : 0),
      right:  PAD + (laneW.left  ? laneW.left + LG : 0) + laneW.center + (laneW.right ? LG : 0)
    };
    canvasW = laneX.right + laneW.right + PAD;
    canvasH = rows.length * (NH + VG) + PAD * 2;
    rows.forEach(r => {
      const cell = rowCells[r];
      ['left', 'center', 'right'].forEach(ln => {
        const nodes = cell[ln];
        if (!nodes.length) return;
        const totalW = nodes.length * NW + Math.max(0, nodes.length - 1) * HG;
        const colW = laneW[ln] || NW;
        const startX = laneX[ln] + (colW - totalW) / 2;
        const y = PAD + r * (NH + VG);
        nodes.forEach((id, i) => {
          pos[id] = { x: startX + i * (NW + HG), y };
        });
      });
    });
  }

  // ── SVG header ────────────────────────────────────────────
  const W = opts.standalone ? canvasW : canvasW * scale;
  const H = opts.standalone ? canvasH : canvasH * scale;

  let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${canvasW} ${canvasH}" style="display:block;background:white;font-family:Arial,Helvetica,sans-serif;">`;

  // ── Arrow markers ─────────────────────────────────────────
  svg += `<defs>
    <marker id="m0" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 Z" fill="#444"/></marker>
    <marker id="mY" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 Z" fill="#16a34a"/></marker>
    <marker id="mN" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 Z" fill="#dc2626"/></marker>
    <marker id="mC" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto"><path d="M0,0 L7,3.5 L0,7 Z" fill="#999"/></marker>
  </defs>`;

  // ── Lane backgrounds (only in auto layout mode) ───────────
  if (showLanes && !useManualLayout) {
    const rows = Object.keys(rowCells).map(Number).sort((a, b) => a - b);
    const maxRow = Math.max(...rows);
    let maxL = 0, maxC = 1, maxR = 0;
    rows.forEach(r => {
      maxL = Math.max(maxL, rowCells[r].left.length);
      maxC = Math.max(maxC, rowCells[r].center.length);
      maxR = Math.max(maxR, rowCells[r].right.length);
    });
    const laneW2 = {
      left:   maxL * NW + Math.max(0, maxL - 1) * HG,
      center: maxC * NW + Math.max(0, maxC - 1) * HG,
      right:  maxR * NW + Math.max(0, maxR - 1) * HG
    };
    const laneX2 = {
      left:   PAD,
      center: PAD + (laneW2.left  ? laneW2.left + LG : 0),
      right:  PAD + (laneW2.left  ? laneW2.left + LG : 0) + laneW2.center + (laneW2.right ? LG : 0)
    };
    const laneTop = PAD - 20;
    const laneHeight = canvasH - PAD * 2 + 40;
    if (maxL) {
      svg += `<rect x="${laneX2.left - 12}" y="${laneTop}" width="${laneW2.left + 24}" height="${laneHeight}" fill="#fef2f2" rx="10" opacity="0.7"/>`;
      svg += `<text x="${laneX2.left + laneW2.left/2}" y="${laneTop - 8}" text-anchor="middle" font-size="10" font-weight="bold" fill="#991b1b" letter-spacing="0.5">ОТКАЗЫ / ОСОБЫЕ СЛУЧАИ</text>`;
    }
    if (maxC) {
      svg += `<rect x="${laneX2.center - 12}" y="${laneTop}" width="${laneW2.center + 24}" height="${laneHeight}" fill="#f0fdf4" rx="10" opacity="0.7"/>`;
      svg += `<text x="${laneX2.center + laneW2.center/2}" y="${laneTop - 8}" text-anchor="middle" font-size="10" font-weight="bold" fill="#166534" letter-spacing="0.5">ОСНОВНОЙ ПУТЬ</text>`;
    }
    if (maxR) {
      svg += `<rect x="${laneX2.right - 12}" y="${laneTop}" width="${laneW2.right + 24}" height="${laneHeight}" fill="#eff6ff" rx="10" opacity="0.7"/>`;
      svg += `<text x="${laneX2.right + laneW2.right/2}" y="${laneTop - 8}" text-anchor="middle" font-size="10" font-weight="bold" fill="#1e40af" letter-spacing="0.5">ВОПРОСЫ КЛИЕНТА</text>`;
    }
  }

  // ── Counter group horizontal connectors ───────────────────
  d.blocks.forEach(b => {
    const leaderId = groupOf[b.id];
    if (!leaderId || leaderId === b.id || !pos[b.id]) return;
    const match = b.id.match(/_(\d+)$/);
    if (!match) return;
    const num = parseInt(match[1], 10);
    const prevId = num === 2 ? leaderId : leaderId + '_' + (num - 1);
    if (!pos[prevId]) return;
    const ax = pos[prevId].x + NW, ay = pos[prevId].y + NH / 2;
    const bx = pos[b.id].x, by = pos[b.id].y + NH / 2;
    svg += `<line x1="${ax}" y1="${ay}" x2="${bx}" y2="${by}" stroke="#aaa" stroke-width="1" stroke-dasharray="4,3" marker-end="url(#mC)"/>`;
    const mx = (ax + bx) / 2, my = ay - 5;
    svg += `<text x="${mx}" y="${my}" text-anchor="middle" font-size="9" fill="#888">${num}-й раз</text>`;
  });

  // ── Main edges ────────────────────────────────────────────
  // Track used offsets to prevent overlapping lines on same column
  const usedViaX = {};

  d.blocks.forEach(b => {
    if (!pos[b.id]) return;

    const drawEdge = (toId, label, color, marker) => {
      if (!toId || !pos[toId]) return;
      // Skip counter-internal edges (they're already drawn horizontally)
      if (groupOf[b.id] && groupOf[b.id] === groupOf[toId]) return;

      const A = pos[b.id], Z = pos[toId];
      const fx = A.x + NW / 2, fy = A.y + NH;
      const tx = Z.x + NW / 2, ty = Z.y;

      let path;

      if (ty > fy + 10) {
        // Normal downward: elbow route
        const my = (fy + ty) / 2;
        path = `M${fx},${fy} L${fx},${my} L${tx},${my} L${tx},${ty}`;
      } else {
        // Back edge (upward or same row): route around the side
        // Use right side if target is to the right, left side otherwise
        const sideOffset = 30 + (Object.keys(usedViaX).length % 3) * 18;
        const sideX = tx > fx ? Math.max(A.x + NW + sideOffset, Z.x + NW + sideOffset)
                               : Math.min(A.x - sideOffset, Z.x - sideOffset);
        const topY = Math.min(A.y, Z.y) - 30;
        path = `M${fx},${fy} L${fx},${fy + 20} L${sideX},${fy + 20} L${sideX},${topY} L${tx},${topY} L${tx},${ty}`;
        usedViaX[`${b.id}->${toId}`] = sideX;
      }

      svg += `<path d="${path}" stroke="${color}" stroke-width="1.3" fill="none" marker-end="url(#${marker})"/>`;

      if (label) {
        const lx = (fx + tx) / 2, ly = ty > fy + 10 ? (fy + ty) / 2 : fy + 20;
        svg += `<rect x="${lx - 14}" y="${ly - 8}" width="28" height="15" rx="3" fill="white" stroke="${color}" stroke-width="0.5"/>`;
        svg += `<text x="${lx}" y="${ly + 3}" text-anchor="middle" font-size="9" font-weight="bold" fill="${color}">${svgText(label)}</text>`;
      }
    };

    drawEdge(b.next_default, '',    '#444', 'm0');
    drawEdge(b.next_yes,     'да',  '#16a34a', 'mY');
    drawEdge(b.next_no,      'нет', '#dc2626', 'mN');
  });

  // ── Nodes ─────────────────────────────────────────────────
  d.blocks.forEach(b => {
    if (!pos[b.id]) return;
    const { x, y } = pos[b.id];
    const type = b.type || 'normal';
    const isCenter = happyPath.has(b.id);
    const onCenter = laneOf[b.id] === 'center';

    // Fill colors — Cybernet palette
    let fill = '#ffffff', strokeC = '#333333';
    if (type === 'question')  { fill = '#fde5c8'; strokeC = '#333'; }
    if (type === 'start')     { fill = '#ffffff'; strokeC = '#333'; }
    if (type === 'end')       { fill = '#ffffff'; strokeC = '#333'; }
    if (type === 'decision')  { fill = '#ffffff'; strokeC = '#333'; }

    const sw = isCenter ? 2 : 1;  // bolder border on happy path
    const cx = x + NW / 2, cy = y + NH / 2;

    // ── Shape ──
    if (type === 'decision') {
      // Diamond / rhombus
      svg += `<polygon points="${cx},${y} ${x+NW},${cy} ${cx},${y+NH} ${x},${cy}" fill="${fill}" stroke="${strokeC}" stroke-width="${sw}"/>`;
    } else if (type === 'start' || type === 'end') {
      // Rounded pill
      const r = NH / 2;
      svg += `<rect x="${x}" y="${y}" width="${NW}" height="${NH}" rx="${r}" fill="${fill}" stroke="${strokeC}" stroke-width="${sw}"/>`;
    } else {
      // Rectangle with Cybernet-style content stripes
      svg += `<rect x="${x}" y="${y}" width="${NW}" height="${NH}" fill="${fill}" stroke="${strokeC}" stroke-width="${sw}"/>`;
      // Top title bar
      svg += `<rect x="${x}" y="${y}" width="${NW}" height="18" fill="rgba(0,0,0,0.04)" stroke="none"/>`;
      // Horizontal content lines
      const lc = type === 'question' ? '#c07030' : '#999999';
      for (let li = 0; li < 3; li++) {
        const ly2 = y + 26 + li * 11;
        svg += `<line x1="${x+8}" y1="${ly2}" x2="${x+NW-8}" y2="${ly2}" stroke="${lc}" stroke-width="0.8"/>`;
      }
    }

    // ── Text ──
    const title = b.title || '';
    const bodyText = interpolate(b[lang] || '', d.vars);

    if (type === 'decision') {
      // Diamond: title centred
      svg += `<text font-size="10" font-weight="bold" fill="#1a1a2e">`;
      svg += svgWrapText(cx, cy - 2, title, 20, 12, 'text-anchor="middle"');
      svg += '</text>';
    } else if (type === 'start' || type === 'end') {
      svg += `<text font-size="11" font-weight="bold" fill="#1a1a2e">`;
      svg += svgWrapText(cx, cy + 1, title, 24, 13, 'text-anchor="middle"');
      svg += '</text>';
    } else {
      // Title in top bar
      const shortTitle = title.length > 28 ? title.substring(0, 27) + '…' : title;
      svg += `<text x="${cx}" y="${y + 12}" text-anchor="middle" font-size="10" font-weight="bold" fill="#1a1a2e">${svgText(shortTitle)}</text>`;
      // Body text in stripe area (small)
      const shortBody = bodyText.length > 60 ? bodyText.substring(0, 59) + '…' : bodyText;
      const bodyLines = shortBody.split('\n').slice(0, 3);
      bodyLines.forEach((line, i) => {
        const truncLine = line.length > 30 ? line.substring(0, 29) + '…' : line;
        svg += `<text x="${x + NW/2}" y="${y + 24 + i * 11}" text-anchor="middle" font-size="8.5" fill="#444">${svgText(truncLine)}</text>`;
      });
      // ID in bottom-right corner
      svg += `<text x="${x + NW - 4}" y="${y + NH - 3}" text-anchor="end" font-size="7" fill="#bbb">${svgText(b.id)}</text>`;
    }
  });

  svg += '</svg>';
  return svg;
}

function renderTree() {
  const lang = document.getElementById('tree-lang').value;
  const scale = parseFloat(document.getElementById('tree-zoom').value);
  const container = document.getElementById('tree-canvas');
  if (!container) return;
  const d = data();
  if (!d || !d.blocks.length) {
    container.innerHTML = '<div class="empty">Нет блоков для отображения</div>';
    return;
  }
  // Make sure all blocks have x,y (use Canvas auto-layout if needed)
  const missing = d.blocks.filter(b => typeof b.x !== 'number' || typeof b.y !== 'number');
  if (missing.length) {
    canvasApplyAutoLayout();
  }
  const svg = buildStaticCanvasSVG(lang, scale);
  container.innerHTML = svg || '<div class="empty">Нет блоков для отображения</div>';
}

// Static SVG render of Canvas-style flowchart — used for "Схема" tab and exports
function buildStaticCanvasSVG(lang, scale, theme) {
  const d = data();
  const blocks = d.blocks;
  if (!blocks.length) return '';
  theme = theme || 'light';
  const showBoth = (lang === 'both');

  // Theme palette
  const T = theme === 'dark' ? {
    bg: '#0A0A12', nodeBg: '#181822', nodeStroke: '#3D3D4D',
    headFill: '#22222E', title: '#FAFAFA', body: '#B4B4C4',
    titleHeaderText: '#FAFAFA', metaCard: '#11111B', metaBorder: '#4F46E5',
    metaText: '#B4B4C4', metaTitle: '#FAFAFA', accent: '#818CF8'
  } : {
    bg: '#ffffff', nodeBg: '#ffffff', nodeStroke: '#d1d5db',
    headFill: '#f9fafb', title: '#0f1419', body: '#4b5563',
    titleHeaderText: '#0f1419', metaCard: '#ffffff', metaBorder: '#1e3a8a',
    metaText: '#4b5563', metaTitle: '#1e3a8a', accent: '#4f46e5'
  };

  const NW = 230;
  const approxH = (b) => {
    if (b.type === 'start' || b.type === 'end') return 60;
    const ruLen = (b.ru || '').length;
    const uzLen = (b.uz || '').length;
    const txt = showBoth ? (ruLen + uzLen) : (b[lang] || b.ru || b.uz || '').length;
    if (showBoth) {
      // Two language blocks need more height
      if (txt < 60) return 110;
      if (txt < 160) return 160;
      if (txt < 320) return 230;
      return 300;
    }
    if (txt < 30) return 80;
    if (txt < 80) return 110;
    if (txt < 160) return 150;
    return 200;
  };

  // Compute bounds
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  blocks.forEach(b => {
    const x = b.x || 0, y = b.y || 0, h = approxH(b);
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    maxX = Math.max(maxX, x + NW);
    maxY = Math.max(maxY, y + h);
  });

  // Reserve space for title header card above the diagram
  const meta = d.meta || {};
  const hasHeader = !!(meta.author || meta.description || meta.goal || meta.version || d.name);
  const headerH = hasHeader ? 200 : 0;

  const PAD = 40;
  const width = (maxX - minX + PAD * 2);
  const height = (maxY - minY + PAD * 2 + headerH);
  const offX = -minX + PAD;
  const offY = -minY + PAD + headerH;

  const edgesSvg = buildCanvasEdges(blocks, { obstacleAware: true });
  const edgesInner = edgesSvg.replace(/^<svg[^>]*>/, '').replace(/<\/svg>$/, '');

  const dispW = width * scale;
  const dispH = height * scale;

  let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${dispW}" height="${dispH}" viewBox="0 0 ${width} ${height}" style="background: ${T.bg};">`;
  // Background rect (so PNG/PDF have the theme bg, not transparent)
  svg += `<rect x="0" y="0" width="${width}" height="${height}" fill="${T.bg}"/>`;

  // ─── Title header card ───
  if (hasHeader) {
    const cardX = PAD, cardY = PAD, cardW = Math.min(440, width - PAD * 2), cardH = 170;
    svg += `<rect x="${cardX}" y="${cardY}" width="${cardW}" height="${cardH}" rx="12" fill="${T.metaCard}" stroke="${T.metaBorder}" stroke-width="2"/>`;
    let ty = cardY + 30;
    svg += `<text x="${cardX + 22}" y="${ty}" font-size="11" font-weight="600" fill="${T.accent}" font-family="monospace" letter-spacing="1.5">CYBERNET AI · КОНСТРУКТОР СКРИПТОВ</text>`;
    ty += 30;
    svg += `<text x="${cardX + 22}" y="${ty}" font-size="22" font-weight="800" fill="${T.metaTitle}">${esc((d.name || 'Скрипт').slice(0, 40))}</text>`;
    ty += 28;
    const metaRow = (label, val) => {
      if (!val) return;
      svg += `<text x="${cardX + 22}" y="${ty}" font-size="12" fill="${T.metaText}"><tspan font-weight="700" fill="${T.metaTitle}">${esc(label)}:</tspan> ${esc(String(val).slice(0, 55))}</text>`;
      ty += 22;
    };
    metaRow('Версия', meta.version);
    metaRow('Автор', meta.author);
    metaRow('Описание', meta.description);
    metaRow('Цель', meta.goal);
  }

  svg += `<g transform="translate(${offX},${offY})">`;
  svg += edgesInner;

  blocks.forEach(b => {
    const x = b.x || 0;
    const y = b.y || 0;
    const h = approxH(b);
    const type = b.type || 'normal';
    const title = b.title || '';
    if (showBoth) {
      svg += renderStaticNodeBoth(b, x, y, NW, h, type, title, interpolate(b.ru || '', d.vars), interpolate(b.uz || '', d.vars), T);
    } else {
      const text = interpolate(b[lang] || '', d.vars);
      svg += renderStaticNode(b, x, y, NW, h, type, title, text, T);
    }
  });

  svg += '</g></svg>';
  return svg;
}

// Render one block as static SVG matching Canvas visual style
function renderStaticNode(b, x, y, w, h, type, title, text, T) {
  T = T || { nodeBg:'#fff', nodeStroke:'#d1d5db', headFill:'#f9fafb', title:'#0f1419', body:'#4b5563' };
  // Color/border per type (matches CSS .cv-shape-*)
  let fill = T.nodeBg, stroke = T.nodeStroke, rx = 10;
  let leftAccent = null, leftAccentColor = null;
  let cornerSymbol = null, cornerSymbolColor = null;
  let customColor = false;

  if (b.color) {
    fill = b.color;
    customColor = true;
  } else {
    if (type === 'start') {
      fill = T === undefined || T.nodeBg === '#fff' ? '#dcfce7' : 'rgba(52,211,153,0.14)';
      stroke = '#86efac'; rx = 32;
    } else if (type === 'end') {
      fill = T.nodeBg === '#fff' ? '#fee2e2' : 'rgba(255,77,109,0.14)';
      stroke = '#fca5a5'; rx = 32;
    } else if (type === 'decision') {
      fill = T.nodeBg === '#fff' ? '#fef3c7' : 'rgba(168,85,247,0.16)';
      stroke = '#fbbf24'; leftAccent = 6; leftAccentColor = '#f59e0b';
      cornerSymbol = '◆'; cornerSymbolColor = '#a855f7';
    } else if (type === 'question') {
      fill = T.nodeBg === '#fff' ? '#ffedd5' : 'rgba(251,191,36,0.12)';
      stroke = '#fb923c'; leftAccent = 6; leftAccentColor = '#f97316';
      cornerSymbol = '?'; cornerSymbolColor = '#f97316';
    }
  }

  // Text colors: on custom color, decide by darkness
  let titleColor = T.title, bodyColor = T.body;
  if (customColor) {
    const darkBg = isColorDark(b.color);
    titleColor = darkBg ? '#fafafa' : '#1a1a2e';
    bodyColor = darkBg ? '#e5e5e5' : '#333333';
  }

  let s = `<g class="static-node" data-id="${esc(b.id)}">`;
  s += `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx}" ry="${rx}" fill="${fill}" stroke="${stroke}" stroke-width="1.5"/>`;

  if (leftAccent) {
    s += `<rect x="${x}" y="${y}" width="${leftAccent}" height="${h}" rx="${rx}" ry="${rx}" fill="${leftAccentColor}"/>`;
    s += `<rect x="${x + leftAccent}" y="${y}" width="2" height="${h}" fill="${fill}"/>`;
  }
  if (cornerSymbol) {
    s += `<text x="${x + w - 10}" y="${y + 16}" font-size="13" font-weight="700" fill="${cornerSymbolColor}" text-anchor="end">${esc(cornerSymbol)}</text>`;
  }

  const headH = 28;
  let headFill = (type === 'start' || type === 'end') ? 'rgba(255,255,255,0.25)' : T.headFill;
  if (customColor) headFill = 'rgba(255,255,255,0.25)';
  if (type === 'start' || type === 'end') {
    s += `<path d="M ${x + rx} ${y} L ${x + w - rx} ${y} A ${rx} ${rx} 0 0 1 ${x + w} ${y + rx} L ${x + w} ${y + headH} L ${x} ${y + headH} L ${x} ${y + rx} A ${rx} ${rx} 0 0 1 ${x + rx} ${y} Z" fill="${headFill}" opacity="0.6"/>`;
  } else {
    s += `<rect x="${x + (leftAccent || 0)}" y="${y + 1}" width="${w - (leftAccent || 0) - 2}" height="${headH - 1}" fill="${headFill}" rx="${Math.max(0, rx - 2)}"/>`;
  }

  const titlePadL = (leftAccent || 0) + 10;
  const titleMaxW = w - titlePadL - 20;
  const titleLines = wrapText(title, titleMaxW, 12, 700);
  const titleLineH = 14;
  const titleStartY = y + 11 + (titleLines.length === 1 ? 4 : 0);
  titleLines.slice(0, 2).forEach((line, i) => {
    s += `<text x="${x + titlePadL}" y="${titleStartY + i * titleLineH}" font-size="12" font-weight="700" fill="${titleColor}">${esc(line)}</text>`;
  });

  if (text) {
    const bodyMaxLines = Math.floor((h - headH - 14) / 14);
    if (bodyMaxLines > 0) {
      const bodyLines = wrapText(text, titleMaxW, 11, 400);
      const visibleLines = bodyLines.slice(0, bodyMaxLines);
      if (bodyLines.length > bodyMaxLines && visibleLines.length) {
        const last = visibleLines[visibleLines.length - 1];
        visibleLines[visibleLines.length - 1] = last.length > 25 ? last.substring(0, 25) + '…' : last + '…';
      }
      visibleLines.forEach((line, i) => {
        s += `<text x="${x + titlePadL}" y="${y + headH + 14 + i * 14}" font-size="11" fill="${bodyColor}">${esc(line)}</text>`;
      });
    }
  }

  s += '</g>';
  return s;
}

// Render block with BOTH languages (RU + UZ) for export
function renderStaticNodeBoth(b, x, y, w, h, type, title, ruText, uzText, T) {
  let fill = T.nodeBg, stroke = T.nodeStroke, rx = 10;
  let leftAccent = null, leftAccentColor = null, cornerSymbol = null, cornerSymbolColor = null;
  let customColor = false;

  if (b.color) { fill = b.color; customColor = true; }
  else {
    if (type === 'start') { fill = T.nodeBg === '#ffffff' ? '#dcfce7' : 'rgba(52,211,153,0.14)'; stroke = '#86efac'; rx = 28; }
    else if (type === 'end') { fill = T.nodeBg === '#ffffff' ? '#fee2e2' : 'rgba(255,77,109,0.14)'; stroke = '#fca5a5'; rx = 28; }
    else if (type === 'decision') { fill = T.nodeBg === '#ffffff' ? '#fef3c7' : 'rgba(168,85,247,0.16)'; stroke = '#fbbf24'; leftAccent = 6; leftAccentColor = '#f59e0b'; cornerSymbol = '◆'; cornerSymbolColor = '#a855f7'; }
    else if (type === 'question') { fill = T.nodeBg === '#ffffff' ? '#ffedd5' : 'rgba(251,191,36,0.12)'; stroke = '#fb923c'; leftAccent = 6; leftAccentColor = '#f97316'; cornerSymbol = '?'; cornerSymbolColor = '#f97316'; }
  }

  let titleColor = T.title, bodyColor = T.body, labelColor = T.accent;
  if (customColor) {
    const darkBg = isColorDark(b.color);
    titleColor = darkBg ? '#fafafa' : '#1a1a2e';
    bodyColor = darkBg ? '#e5e5e5' : '#333333';
    labelColor = darkBg ? '#c7d2fe' : '#4f46e5';
  }

  let s = `<g class="static-node" data-id="${esc(b.id)}">`;
  s += `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx}" ry="${rx}" fill="${fill}" stroke="${stroke}" stroke-width="1.5"/>`;
  if (leftAccent) {
    s += `<rect x="${x}" y="${y}" width="${leftAccent}" height="${h}" rx="${rx}" ry="${rx}" fill="${leftAccentColor}"/>`;
    s += `<rect x="${x + leftAccent}" y="${y}" width="2" height="${h}" fill="${fill}"/>`;
  }
  if (cornerSymbol) {
    s += `<text x="${x + w - 10}" y="${y + 16}" font-size="13" font-weight="700" fill="${cornerSymbolColor}" text-anchor="end">${esc(cornerSymbol)}</text>`;
  }

  const headH = 26;
  let headFill = (type === 'start' || type === 'end' || customColor) ? 'rgba(255,255,255,0.25)' : T.headFill;
  if (type === 'start' || type === 'end') {
    s += `<path d="M ${x + rx} ${y} L ${x + w - rx} ${y} A ${rx} ${rx} 0 0 1 ${x + w} ${y + rx} L ${x + w} ${y + headH} L ${x} ${y + headH} L ${x} ${y + rx} A ${rx} ${rx} 0 0 1 ${x + rx} ${y} Z" fill="${headFill}" opacity="0.6"/>`;
  } else {
    s += `<rect x="${x + (leftAccent || 0)}" y="${y + 1}" width="${w - (leftAccent || 0) - 2}" height="${headH - 1}" fill="${headFill}" rx="${Math.max(0, rx - 2)}"/>`;
  }

  const padL = (leftAccent || 0) + 10;
  const maxW = w - padL - 20;
  // Title
  const titleLines = wrapText(title, maxW, 11, 700);
  s += `<text x="${x + padL}" y="${y + 17}" font-size="11" font-weight="700" fill="${titleColor}">${esc(titleLines[0] || '')}</text>`;

  let cursorY = y + headH + 14;
  const remainingH = h - headH - 12;
  const perLang = Math.floor((remainingH - 24) / 2); // split space between RU and UZ
  const maxLinesPerLang = Math.max(1, Math.floor(perLang / 13));

  // RU
  s += `<text x="${x + padL}" y="${cursorY}" font-size="8" font-weight="700" fill="${labelColor}" font-family="monospace">RU</text>`;
  cursorY += 12;
  const ruLines = wrapText(ruText, maxW, 10, 400).slice(0, maxLinesPerLang);
  ruLines.forEach(line => {
    s += `<text x="${x + padL}" y="${cursorY}" font-size="10" fill="${bodyColor}">${esc(line)}</text>`;
    cursorY += 13;
  });
  cursorY += 4;
  // UZ
  s += `<text x="${x + padL}" y="${cursorY}" font-size="8" font-weight="700" fill="${labelColor}" font-family="monospace">UZ</text>`;
  cursorY += 12;
  const uzLines = wrapText(uzText, maxW, 10, 400).slice(0, maxLinesPerLang);
  uzLines.forEach(line => {
    s += `<text x="${x + padL}" y="${cursorY}" font-size="10" fill="${bodyColor}" font-style="italic">${esc(line)}</text>`;
    cursorY += 13;
  });

  s += '</g>';
  return s;
}

// Approximate text wrapping — assumes ~6.5px per char average
function wrapText(text, maxWidth, fontSize, weight) {
  if (!text) return [];
  const charW = fontSize * 0.55 * (weight >= 700 ? 1.1 : 1);
  const charsPerLine = Math.max(8, Math.floor(maxWidth / charW));
  // Split by explicit newlines first
  const paragraphs = text.split(/\n+/);
  const lines = [];
  paragraphs.forEach(p => {
    const words = p.split(/\s+/);
    let cur = '';
    words.forEach(w => {
      const test = cur ? cur + ' ' + w : w;
      if (test.length > charsPerLine && cur) {
        lines.push(cur);
        cur = w;
      } else {
        cur = test;
      }
    });
    if (cur) lines.push(cur);
  });
  return lines;
}

// ═══════════════════════════════════════════════════════════════
// LIVE PREVIEW — walk through the script like an operator
// ═══════════════════════════════════════════════════════════════
let livePreviewState = { currentId: null, history: [] };

function renderPreview() {
  const d = data();
  const lang = document.getElementById('preview-lang').value;

  // Initialize: pick first start block
  if (!livePreviewState.currentId || !d.blocks.find(b => b.id === livePreviewState.currentId)) {
    const firstStart = d.blocks.find(b => b.type === 'start') || d.blocks[0];
    livePreviewState.currentId = firstStart ? firstStart.id : null;
    livePreviewState.history = [];
  }

  const container = document.getElementById('preview-content');

  if (!livePreviewState.currentId) {
    container.innerHTML = '<div class="empty">Нет блоков для предпросмотра</div>';
    return;
  }

  const b = d.blocks.find(x => x.id === livePreviewState.currentId);
  if (!b) {
    container.innerHTML = '<div class="empty">Блок не найден</div>';
    return;
  }

  const type = b.type || 'normal';
  const text = interpolate(b[lang] || '(пусто)', d.vars);
  const sec = d.sections.find(s => s.id === b.sec);

  // Find connection targets
  const nextDef = b.next_default ? d.blocks.find(x => x.id === b.next_default) : null;
  const nextYes = b.next_yes ? d.blocks.find(x => x.id === b.next_yes) : null;
  const nextNo = b.next_no ? d.blocks.find(x => x.id === b.next_no) : null;

  // History breadcrumbs
  const breadcrumbs = livePreviewState.history.slice(-5).map((h, i) => {
    const hb = d.blocks.find(x => x.id === h);
    return hb ? `<span class="lp-crumb">${esc(hb.title)}</span>` : '';
  }).join(' → ');

  let html = `
    <div class="lp-toolbar">
      <button class="btn btn-sm" onclick="lpReset()" ${livePreviewState.history.length === 0 ? 'disabled' : ''}>⟲ К началу</button>
      <button class="btn btn-sm" onclick="lpBack()" ${livePreviewState.history.length === 0 ? 'disabled' : ''}>← Назад</button>
      <div class="lp-path">${breadcrumbs || '<span class="lp-crumb-start">Начало разговора</span>'}</div>
      <div class="lp-step-count">Шаг ${livePreviewState.history.length + 1}</div>
    </div>

    <div class="lp-card lp-card-${type}">
      <div class="lp-header">
        <div class="type-dot dot-${type}"></div>
        <div class="lp-title-block">
          <div class="lp-title">${esc(b.title)}</div>
          <div class="lp-meta">
            ${sec ? `<span>${csIcon('folder',11)} ${esc(sec.label)}</span>` : ''}
            ${b.intent ? `<span>${csIcon('tag',11)} ${esc(b.intent)}</span>` : ''}
            <span class="lp-id">${esc(b.id)}</span>
          </div>
        </div>
        <div class="lp-lang-label">${lang === 'ru' ? 'RU' : 'UZ'}</div>
      </div>
      <div class="lp-text">${esc(text)}</div>
    </div>

    <div class="lp-choices">
      <div class="lp-choices-label">Что отвечает клиент?</div>
      ${nextYes ? `<button class="lp-choice lp-choice-yes" onclick="lpGoto('${esc(nextYes.id)}')">
        <span class="lp-choice-label">✓ ДА</span>
        <span class="lp-choice-target">→ ${esc(nextYes.title)}</span>
      </button>` : ''}
      ${nextNo ? `<button class="lp-choice lp-choice-no" onclick="lpGoto('${esc(nextNo.id)}')">
        <span class="lp-choice-label">✕ НЕТ</span>
        <span class="lp-choice-target">→ ${esc(nextNo.title)}</span>
      </button>` : ''}
      ${nextDef ? `<button class="lp-choice lp-choice-def" onclick="lpGoto('${esc(nextDef.id)}')">
        <span class="lp-choice-label">→ Продолжить</span>
        <span class="lp-choice-target">${esc(nextDef.title)}</span>
      </button>` : ''}
      ${!nextDef && !nextYes && !nextNo ? `<div class="lp-end-state">
        ${type === 'end' ? '✓ Конец разговора' : '⚠ Тупиковый блок (нет связей)'}
      </div>` : ''}
    </div>

    <div class="lp-jump">
      <label class="field-label">Быстрый переход к любому блоку</label>
      <select class="input" onchange="lpGoto(this.value); this.value='';">
        <option value="">— выбрать блок —</option>
        ${d.blocks.map(bb => `<option value="${esc(bb.id)}">${esc(bb.id)} — ${esc(bb.title)}</option>`).join('')}
      </select>
    </div>
  `;

  container.innerHTML = html;
}

function lpGoto(id) {
  if (!id) return;
  if (livePreviewState.currentId) {
    livePreviewState.history.push(livePreviewState.currentId);
  }
  livePreviewState.currentId = id;
  renderPreview();
}

function lpBack() {
  if (!livePreviewState.history.length) return;
  livePreviewState.currentId = livePreviewState.history.pop();
  renderPreview();
}

function lpReset() {
  livePreviewState.currentId = null;
  livePreviewState.history = [];
  renderPreview();
}

// ═══════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════

// ─── JSON ─────────────────────────────────────────────────────
function exportJSON() {
  const name = activeProfile.replace(/[^\w.-]/g, '_');
  downloadBlob(JSON.stringify(data(), null, 2), `${name}_profile.json`, 'application/json');
  toast('JSON скачан');
}

// Helper: read export options (lang + theme) from UI
function getExportOptions() {
  const lang = document.getElementById('export-lang')?.value || 'both';
  const theme = document.getElementById('export-theme')?.value || 'light';
  return { lang, theme };
}

// ─── SVG (standalone, full-size) ───────────────────────────────
function exportSVG() {
  if (!data().blocks.length) { toast('Нет блоков для экспорта', 'error'); return; }
  const { lang, theme } = getExportOptions();
  const svg = buildStaticCanvasSVG(lang, 1, theme);
  downloadBlob(svg, activeProfile.replace(/[^\w.-]/g, '_') + '_flowchart.svg', 'image/svg+xml');
  toast('SVG схемы скачан');
}

// ─── PNG via canvas ───────────────────────────────────────────
function exportPNG() {
  if (!data().blocks.length) { toast('Нет блоков для экспорта', 'error'); return; }
  const { lang, theme } = getExportOptions();
  const svgString = buildStaticCanvasSVG(lang, 1, theme);
  const bgColor = theme === 'dark' ? '#0A0A12' : '#ffffff';
  const parser = new DOMParser();
  const svgDoc = parser.parseFromString(svgString, 'image/svg+xml');
  const svgEl = svgDoc.documentElement;
  const width = parseInt(svgEl.getAttribute('width'), 10);
  const height = parseInt(svgEl.getAttribute('height'), 10);

  const img = new Image();
  const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(svgBlob);

  img.onload = function() {
    const scale = 2; // 2x for retina quality
    const canvas = document.createElement('canvas');
    canvas.width = width * scale;
    canvas.height = height * scale;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.scale(scale, scale);
    ctx.drawImage(img, 0, 0);
    URL.revokeObjectURL(url);
    canvas.toBlob((blob) => {
      if (!blob) { toast('Ошибка при создании PNG', 'error'); return; }
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = activeProfile.replace(/[^\w.-]/g, '_') + '_flowchart.png';
      document.body.appendChild(a); a.click();
      setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(a.href); }, 100);
      toast('PNG схемы скачан');
    }, 'image/png');
  };
  img.onerror = function() {
    URL.revokeObjectURL(url);
    toast('Не удалось преобразовать SVG в PNG', 'error');
  };
  img.src = url;
}

// ─── PDF: render SVG → PNG → embed in PDF, download directly ──────
// jsPDF can miss at page load (slow/blocked CDN). Retry loading it once on demand.
function ensureJsPDF() {
  return new Promise((resolve) => {
    const found = () => window.jspdf?.jsPDF || window.jsPDF || null;
    if (found()) return resolve(found());
    const sc = document.createElement('script');
    sc.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
    sc.onload = () => resolve(found());
    sc.onerror = () => resolve(null);
    setTimeout(() => resolve(found()), 7000);
    document.head.appendChild(sc);
  });
}

// ─── PDF схемы (ВЕКТОРНЫЙ): страница размером в саму схему, печать браузера.
//     «Сохранить как PDF» даёт истинный вектор — чёткий на любом зуме, текст
//     выделяется, файл меньше. Раньше здесь была растровая картинка в PDF
//     («как скан») — тот путь оставлен fallback'ом: exportFlowchartPDFRaster.
function exportFlowchartPDF() {
  if (!data().blocks.length) { toast('Нет блоков для экспорта', 'error'); return; }
  const { lang, theme } = getExportOptions();
  const langPages = lang === 'both' ? ['ru', 'uz'] : [lang];
  const bg = theme === 'dark' ? '#0A0A12' : '#ffffff';
  const labelColor = theme === 'dark' ? '#818CF8' : '#4F46E5';

  const parser = new DOMParser();
  let maxW = 0, maxH = 0;
  const pagesSvg = langPages.map((L) => {
    const svgStr = buildStaticCanvasSVG(L, 1, theme);
    const el = parser.parseFromString(svgStr, 'image/svg+xml').documentElement;
    const vb = (el.getAttribute('viewBox') || '0 0 1000 1000').split(/\s+/).map(Number);
    maxW = Math.max(maxW, vb[2] || 1000);
    maxH = Math.max(maxH, vb[3] || 1000);
    return { L, svgStr };
  });

  // Browsers cap @page around ~200in (14400pt) — scale the page down if needed;
  // the SVG is vector, so this costs zero quality.
  const k = Math.min(1, 14000 / Math.max(maxW, maxH));
  const pageW = Math.ceil(maxW * k) + 48;
  const pageH = Math.ceil(maxH * k) + 72;
  const title = activeProfile.replace(/[^\w.-]/g, '_') + '_flowchart';

  let html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${title}</title><style>
    @page { size: ${pageW}pt ${pageH}pt; margin: 0; }
    html, body { margin: 0; padding: 0; background: ${bg}; }
    .pg { padding: 16pt 24pt 24pt; box-sizing: border-box; page-break-after: always; background: ${bg}; }
    .pg:last-child { page-break-after: auto; }
    .pg .lang-label { font-family: -apple-system, 'Segoe UI', Roboto, sans-serif; font-size: 11pt; font-weight: 700; letter-spacing: 1px; color: ${labelColor}; margin: 0 0 8pt; }
    .pg svg { width: 100%; height: auto; display: block; }
    @media screen { body { background: #52525E; } .pg { max-width: 1400px; margin: 16px auto; box-shadow: 0 6px 28px rgba(0,0,0,0.35); } }
  </style></head><body>`;
  pagesSvg.forEach((p) => {
    const lbl = p.L === 'uz' ? "UZ · O'ZBEK" : 'RU · РУССКИЙ';
    html += `<div class="pg">${langPages.length > 1 ? `<div class="lang-label">${lbl}</div>` : ''}${p.svgStr}</div>`;
  });
  html += `<script>window.onload = () => setTimeout(() => window.print(), 400);<\/script></body></html>`;

  const win = window.open('', '_blank');
  if (!win) {
    toast('Всплывающее окно заблокировано — делаю растровый PDF', 'error');
    exportFlowchartPDFRaster();
    return;
  }
  win.document.write(html);
  win.document.close();
  toast('В окне печати: Принтер → «Сохранить как PDF». PDF будет векторным');
}

function exportFlowchartPDFRaster() {
  if (!data().blocks.length) { toast('Нет блоков для экспорта', 'error'); return; }

  const { lang, theme } = getExportOptions();
  const bgColor = theme === 'dark' ? '#0A0A12' : '#ffffff';
  // If "both" — render two separate single-language pages (RU page, then UZ page)
  const langPages = lang === 'both' ? ['ru', 'uz'] : [lang];

  toast('Генерирую PDF...', 'info');

  // Render each language to a PNG dataURL (async via Image), then assemble PDF
  const renderLangToImage = (oneLang) => new Promise((resolve, reject) => {
    const svgString = buildStaticCanvasSVG(oneLang, 1, theme);
    const parser = new DOMParser();
    const svgDoc = parser.parseFromString(svgString, 'image/svg+xml');
    const svgEl = svgDoc.documentElement;
    const vb = (svgEl.getAttribute('viewBox') || '0 0 1000 1000').split(/\s+/).map(Number);
    const width = vb[2] || 1000;
    const height = vb[3] || 1000;
    const img = new Image();
    const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(svgBlob);
    img.onload = function() {
      // Cap the raster: giant flowcharts at fixed 2x blow past browser canvas limits,
      // which is what silently kicked this export back to PNG. ~18MP ≈ A3 @ 300dpi.
      const scale = Math.min(2, Math.sqrt(18e6 / (width * height)), 8000 / Math.max(width, height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(width * scale);
      canvas.height = Math.round(height * scale);
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = bgColor;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.scale(scale, scale);
      ctx.drawImage(img, 0, 0);
      URL.revokeObjectURL(url);
      let dataUrl = '';
      try { dataUrl = canvas.toDataURL('image/png'); } catch (err) { reject(new Error('схема слишком большая для canvas')); return; }
      if (!dataUrl || dataUrl.length < 1000) { reject(new Error('схема слишком большая для canvas')); return; }
      resolve({ imgData: dataUrl, width, height });
    };
    img.onerror = function() { URL.revokeObjectURL(url); reject(new Error('SVG render failed')); };
    img.src = url;
  });

  (async () => {
    try {
      const jsPDFLib = await ensureJsPDF();
      if (!jsPDFLib) {
        toast('Библиотека PDF не загрузилась (CDN недоступен) — скачиваю PNG', 'error');
        exportPNG();
        return;
      }
      const pages = [];
      for (const oneLang of langPages) {
        pages.push({ lang: oneLang, ...(await renderLangToImage(oneLang)) });
      }

      let pdf = null;
      pages.forEach((page, idx) => {
        const orientation = page.width >= page.height ? 'landscape' : 'portrait';
        if (idx === 0) {
          pdf = new jsPDFLib({ orientation, unit: 'pt', format: 'a3' });
        } else {
          pdf.addPage('a3', orientation);
        }
        const pageW = pdf.internal.pageSize.getWidth();
        const pageH = pdf.internal.pageSize.getHeight();
        if (theme === 'dark') {
          pdf.setFillColor(10, 10, 18);
          pdf.rect(0, 0, pageW, pageH, 'F');
        }
        // Language label at top corner
        const labelTxt = page.lang === 'uz' ? 'UZ · O\'ZBEK' : 'RU · РУССКИЙ';
        pdf.setFontSize(11);
        pdf.setTextColor(theme === 'dark' ? 129 : 79, theme === 'dark' ? 140 : 70, theme === 'dark' ? 248 : 229);
        pdf.text(labelTxt, 24, 28);

        const margin = 20;
        const topReserve = 36;
        const availW = pageW - margin * 2;
        const availH = pageH - margin * 2 - topReserve;
        const imgRatio = page.width / page.height;
        const availRatio = availW / availH;
        let drawW, drawH;
        if (imgRatio > availRatio) { drawW = availW; drawH = availW / imgRatio; }
        else { drawH = availH; drawW = availH * imgRatio; }
        const offsetX = (pageW - drawW) / 2;
        const offsetY = topReserve + (availH - drawH) / 2 + margin;
        pdf.addImage(page.imgData, 'PNG', offsetX, offsetY, drawW, drawH);
      });

      pdf.save(activeProfile.replace(/[^\w.-]/g, '_') + '_flowchart.pdf');
      toast(`✓ PDF скачан${langPages.length > 1 ? ' (RU + UZ, 2 страницы)' : ''}`);
    } catch (e) {
      console.error(e);
      toast('Не удалось создать PDF (' + (e && e.message ? e.message : e) + ') — скачиваю PNG', 'error');
      exportPNG();
    }
  })();
}


// ─── Markdown ─────────────────────────────────────────────────
function exportMarkdown() {
  const d = data();
  let md = `# ${d.name}\n\n## Переменные\n\n`;
  Object.entries(d.vars).forEach(([k, v]) => md += `- \`{${k}}\` = ${v}\n`);
  md += '\n---\n\n';
  d.sections.forEach(sec => {
    const blocks = d.blocks.filter(b => b.sec === sec.id);
    if (!blocks.length) return;
    md += `## ${sec.label}\n\n`;
    blocks.forEach(b => {
      md += `### ${b.title} *(${b.type || 'normal'})*\n`;
      if (b.intent) md += `- Intent: \`${b.intent}\`\n`;
      if (b.next_default) md += `- → По умолчанию: \`${b.next_default}\`\n`;
      if (b.next_yes) md += `- → Да: \`${b.next_yes}\`\n`;
      if (b.next_no) md += `- → Нет: \`${b.next_no}\`\n`;
      md += `\n**RU:** ${interpolate(b.ru, d.vars)}\n\n`;
      md += `**UZ:** ${interpolate(b.uz, d.vars)}\n\n`;
    });
  });
  downloadBlob(md, activeProfile.replace(/[^\w.-]/g, '_') + '.md', 'text/markdown');
  toast('Markdown скачан');
}

// ─── Full HTML (table + flowchart, all-in-one) ─────────────────
function exportHTML() {
  const d = data();
  const svgRu = buildStaticCanvasSVG('ru', 1);
  const svgUz = buildStaticCanvasSVG('uz', 1);

  let html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${esc(d.name)}</title>
  <style>
    @page { size: A4; margin: 1.5cm; }
    @page flowchart { size: A3 landscape; margin: 1cm; }
    body { font-family: -apple-system, 'Inter', sans-serif; max-width: 900px; margin: 0 auto; padding: 1rem; color: #0f1419; }
    h1 { font-weight: 700; border-bottom: 2px solid #0f1419; padding-bottom: 0.5rem; }
    h2 { font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.06em; color: #6b7280; margin-top: 2rem; padding-bottom: 8px; border-bottom: 1px solid #e5e7eb; }
    .block { border: 1px solid #e5e7eb; border-radius: 12px; padding: 14px 18px; margin-bottom: 10px; page-break-inside: avoid; }
    .block-head { display: flex; align-items: center; gap: 10px; margin-bottom: 10px; }
    .type-dot { width: 8px; height: 8px; border-radius: 50%; }
    .dot-start { background: #22c55e; } .dot-normal { background: #3b82f6; } .dot-question { background: #f97316; } .dot-decision { background: #a855f7; } .dot-end { background: #ef4444; }
    .block-title { font-size: 14px; font-weight: 600; flex: 1; }
    .block-id { font-size: 11px; font-family: monospace; color: #9ca3af; padding: 2px 8px; background: #f3f4f6; border-radius: 6px; }
    .meta { font-size: 11px; color: #6b7280; font-family: monospace; margin-bottom: 10px; padding: 6px 10px; background: #f9fafb; border-radius: 6px; }
    .lang-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
    .lang-col { background: #f9fafb; padding: 12px 14px; border-radius: 8px; font-size: 13px; white-space: pre-wrap; border: 1px solid #eef0f3; }
    .lang-label { font-size: 10px; font-weight: 700; text-transform: uppercase; color: #9ca3af; margin-bottom: 6px; }
    .flowchart-page { page: flowchart; page-break-before: always; max-width: none; padding: 0; }
    .flowchart-page h1 { font-size: 18px; margin-bottom: 10px; }
    .flowchart-page svg { width: 100%; max-width: 100%; height: auto; }
    .legend { display: flex; gap: 16px; margin: 10px 0 15px; font-size: 11px; color: #4b5563; flex-wrap: wrap; font-weight: 500; }
    .legend-item { display: flex; align-items: center; gap: 5px; }
    .legend-sq { width: 16px; height: 11px; border: 1px solid #333; }
    @media print { body { max-width: none; } }
  </style></head><body>
  <h1>${esc(d.name)}</h1>
  <p style="color: #6b7280;">Сгенерировано: ${new Date().toLocaleString('ru-RU')} · ${d.blocks.length} блоков · ${d.sections.length} разделов</p>`;

  d.sections.forEach(sec => {
    const blocks = d.blocks.filter(b => b.sec === sec.id);
    if (!blocks.length) return;
    html += `<h2>${esc(sec.label)}</h2>`;
    blocks.forEach(b => {
      const type = b.type || 'normal';
      html += `<div class="block">
        <div class="block-head">
          <div class="type-dot dot-${type}"></div>
          <span class="block-title">${esc(b.title)}</span>
          <span class="block-id">${esc(b.id)}</span>
        </div>`;
      const metaParts = [];
      if (b.intent) metaParts.push(`intent: ${esc(b.intent)}`);
      if (b.next_default) metaParts.push(`→ ${esc(b.next_default)}`);
      if (b.next_yes) metaParts.push(`да → ${esc(b.next_yes)}`);
      if (b.next_no) metaParts.push(`нет → ${esc(b.next_no)}`);
      if (metaParts.length) html += `<div class="meta">${metaParts.join(' · ')}</div>`;
      html += `<div class="lang-grid">
        <div class="lang-col"><div class="lang-label">Русский</div>${esc(interpolate(b.ru, d.vars))}</div>
        <div class="lang-col"><div class="lang-label">O'zbek</div>${esc(interpolate(b.uz, d.vars))}</div>
      </div></div>`;
    });
  });

  html += `<div class="flowchart-page">
    <h1>${esc(d.name)} — Блок-схема (RU)</h1>
    <div class="legend">
      <div class="legend-item"><div class="legend-sq" style="background:#fde5c8;"></div>Вопрос клиента</div>
      <div class="legend-item"><div class="legend-sq" style="background:white;"></div>Ответ бота</div>
      <div class="legend-item"><div style="width:14px; height:14px; background:white; border:1px solid #333; transform: rotate(45deg);"></div>Решение</div>
      <div class="legend-item"><div class="legend-sq" style="background:white; border-radius:50%;"></div>Начало/конец</div>
      <div class="legend-item" style="margin-left: auto;"><span style="color:#16a34a; font-weight:600;">━ да</span> · <span style="color:#dc2626; font-weight:600;">━ нет</span> · <span style="color:#333; font-weight:600;">━ по умолчанию</span></div>
    </div>
    ${svgRu}
  </div>`;
  html += `<div class="flowchart-page">
    <h1>${esc(d.name)} — Блок-схема (UZ)</h1>
    ${svgUz}
  </div>`;

  html += `<script>window.onload = () => setTimeout(() => window.print(), 400);<\/script></body></html>`;

  const win = window.open('', '_blank');
  if (win) {
    win.document.write(html);
    win.document.close();
    toast('Откройте окно печати и выберите «Сохранить как PDF»');
  } else {
    downloadBlob(html, activeProfile.replace(/[^\w.-]/g, '_') + '.html', 'text/html');
    toast('Окно заблокировано — HTML скачан', 'info');
  }
}

// ─── Draw.io XML ──────────────────────────────────────────────
function exportDrawio() {
  const d = data();
  if (!d.blocks.length) { toast('Нет блоков для экспорта', 'error'); return; }

  const NW = 190, NH = 64, HG = 18, VG = 90, LG = 70, PAD = 50;

  // ─── Detect if user has manual Canvas layout ───
  const blocksWithCoords = d.blocks.filter(b => typeof b.x === 'number' && typeof b.y === 'number');
  const useManualLayout = blocksWithCoords.length > d.blocks.length / 2;

  const pos = {};

  if (useManualLayout) {
    // ─── Use manual x, y from Canvas (normalize to start near 0,0) ───
    let minX = Infinity, minY = Infinity;
    d.blocks.forEach(b => {
      const x = typeof b.x === 'number' ? b.x : 0;
      const y = typeof b.y === 'number' ? b.y : 0;
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
    });
    const offsetX = PAD - minX;
    const offsetY = PAD - minY;
    d.blocks.forEach(b => {
      const x = typeof b.x === 'number' ? b.x : 0;
      const y = typeof b.y === 'number' ? b.y : 0;
      pos[b.id] = { x: x + offsetX, y: y + offsetY };
    });
  } else {
    // ─── Auto swim-lane ───
    const { rowCells } = buildLayout(d.blocks);
    const rows = Object.keys(rowCells).map(Number).sort((a,b) => a-b);
    let maxL = 0, maxC = 1, maxR = 0;
    rows.forEach(r => {
      maxL = Math.max(maxL, rowCells[r].left.length);
      maxC = Math.max(maxC, rowCells[r].center.length);
      maxR = Math.max(maxR, rowCells[r].right.length);
    });
    const laneW = {
      left:   maxL * NW + Math.max(0, maxL-1) * HG,
      center: maxC * NW + Math.max(0, maxC-1) * HG,
      right:  maxR * NW + Math.max(0, maxR-1) * HG
    };
    const laneX = {
      left:   PAD,
      center: PAD + (laneW.left ? laneW.left + LG : 0),
      right:  PAD + (laneW.left ? laneW.left + LG : 0) + laneW.center + (laneW.right ? LG : 0)
    };
    rows.forEach(r => {
      ['left','center','right'].forEach(ln => {
        const nodes = rowCells[r][ln];
        if (!nodes.length) return;
        const totalW = nodes.length * NW + Math.max(0, nodes.length-1) * HG;
        const colW = laneW[ln] || NW;
        const startX = laneX[ln] + (colW - totalW) / 2;
        nodes.forEach((id, i) => {
          pos[id] = { x: startX + i*(NW+HG), y: PAD + r*(NH+VG) };
        });
      });
    });
  }

  // Compute canvasW for document size
  let canvasW = 0;
  Object.values(pos).forEach(p => { canvasW = Math.max(canvasW, p.x + NW + PAD); });
  canvasW = Math.max(canvasW, 1000);

  let cells = '', cellId = 2;
  const idMap = {};

  // ─── Title header card (company + script meta) ───
  const meta = d.meta || {};
  const titleLines = [
    `<b style="font-size:18px;">${svgText(d.name || 'Скрипт')}</b>`,
    meta.version ? `<b>Версия:</b> ${svgText(meta.version)}` : '',
    meta.author ? `<b>Автор:</b> ${svgText(meta.author)}` : '',
    meta.description ? `<b>Описание:</b> ${svgText(meta.description)}` : '',
    meta.goal ? `<b>Цель:</b> ${svgText(meta.goal)}` : '',
    `<i style="color:#5b8cff;">Cybernet AI · Конструктор скриптов</i>`
  ].filter(Boolean).join('<br>');
  // Place above the diagram (negative Y so it sits on top)
  cells += `<mxCell id="title_header" value="${titleLines}" style="rounded=1;whiteSpace=wrap;html=1;fillColor=#ffffff;strokeColor=#1e3a8a;strokeWidth=2;align=left;verticalAlign=top;spacing=14;fontSize=12;fontColor=#1e3a8a;" vertex="1" parent="1"><mxGeometry x="${PAD}" y="${PAD - 220}" width="380" height="180" as="geometry"/></mxCell>`;

  d.blocks.forEach(b => {
    if (!pos[b.id]) return;
    const { x, y } = pos[b.id];
    const type = b.type || 'normal';
    let fill = 'white', shapeStyle = 'rounded=0';
    if (type === 'question') fill = '#fde5c8';
    if (type === 'decision') shapeStyle = 'rhombus';
    if (type === 'start' || type === 'end') shapeStyle = 'ellipse';
    if (b.color) fill = b.color;
    // Build cell content: bold title + body text (ru, then uz if present)
    const titlePart = (b.title || '').trim();
    const ruPart = (b.ru || '').trim();
    const uzPart = (b.uz || '').trim();
    let bodyLines = [];
    if (titlePart) bodyLines.push('<b>' + svgText(titlePart) + '</b>');
    if (ruPart) bodyLines.push(svgText(ruPart));
    if (uzPart) bodyLines.push('<i>' + svgText(uzPart) + '</i>');
    const txt = bodyLines.join('<br>');
    // Auto-height by content length so text fits
    const totalLen = titlePart.length + ruPart.length + uzPart.length;
    let cellH = NH;
    if (totalLen > 240) cellH = 180;
    else if (totalLen > 140) cellH = 140;
    else if (totalLen > 70) cellH = 100;
    else if (totalLen > 30) cellH = 80;
    const cellW = totalLen > 70 ? 240 : NW;
    cells += `<mxCell id="${cellId}" value="${txt}" style="${shapeStyle};whiteSpace=wrap;html=1;fillColor=${fill};strokeColor=#333333;fontSize=10;align=left;verticalAlign=top;spacing=6;" vertex="1" parent="1"><mxGeometry x="${x}" y="${y}" width="${cellW}" height="${cellH}" as="geometry"/></mxCell>`;
    idMap[b.id] = cellId;
    cellId++;
  });

  d.blocks.forEach(b => {
    const from = idMap[b.id]; if (!from) return;
    const addEdge = (toId, label, color) => {
      const to = idMap[toId]; if (!to) return;
      cells += `<mxCell id="${cellId}" value="${svgText(label || '')}" style="edgeStyle=orthogonalEdgeStyle;rounded=0;html=1;strokeColor=${color};fontSize=10;fontStyle=1;" edge="1" parent="1" source="${from}" target="${to}"><mxGeometry relative="1" as="geometry"/></mxCell>`;
      cellId++;
    };
    // Prefer modern branches[]; fall back to legacy next_* fields
    if (Array.isArray(b.branches) && b.branches.length) {
      b.branches.forEach(br => {
        if (!br.target) return;
        const color = br.color && br.color !== BRANCH_COLOR_DEFAULT ? br.color : '#333333';
        addEdge(br.target, br.label || '', color);
      });
    } else {
      addEdge(b.next_default, '', '#333333');
      addEdge(b.next_yes, 'да', '#16a34a');
      addEdge(b.next_no, 'нет', '#dc2626');
    }
  });

  const xml = `<mxfile host="app.diagrams.net"><diagram name="${esc(d.name)}"><mxGraphModel dx="1200" dy="900" grid="1" gridSize="10" guides="1" tooltips="1" connect="1" arrows="1" fold="1" page="1" pageScale="1" pageWidth="${canvasW}" pageHeight="2000" math="0" shadow="0"><root><mxCell id="0"/><mxCell id="1" parent="0"/>${cells}</root></mxGraphModel></diagram></mxfile>`;
  downloadBlob(xml, activeProfile.replace(/[^\w.-]/g, '_') + '.drawio', 'application/xml');
  toast('Draw.io файл скачан');
}

// ─── Layout indicator on Export tab ──────────────────────────
function renderLayoutIndicator() {
  const d = data();
  const el = document.getElementById('layout-indicator');
  if (!el) return;
  const withCoords = d.blocks.filter(b => typeof b.x === 'number' && typeof b.y === 'number').length;
  const total = d.blocks.length;
  const useManual = withCoords > total / 2;

  if (useManual) {
    el.className = 'layout-indicator manual';
    el.innerHTML = `
      <div class="layout-indicator-icon">${csIcon('swatch',14)}</div>
      <div>
        <strong>Будет использована ваша раскладка с Canvas</strong><br>
        <span style="opacity:0.85;">${withCoords} из ${total} блоков имеют ручные координаты. Экспорт PDF / SVG / PNG / Draw.io сохранит вашу раскладку.</span>
      </div>
      <button class="li-action" onclick="switchTab('canvas', document.querySelector('[data-tab=canvas]'))">Открыть Canvas</button>
    `;
  } else {
    el.className = 'layout-indicator auto';
    el.innerHTML = `
      <div class="layout-indicator-icon">${csIcon('gear',14)}</div>
      <div>
        <strong>Будет использована автоматическая раскладка</strong><br>
        <span style="opacity:0.85;">Вы ещё не редактировали блоки на Canvas. Экспорт использует авто-раскладку swim-lane (центр = happy path, слева = отказы, справа = вопросы).</span>
      </div>
      <button class="li-action" onclick="switchTab('canvas', document.querySelector('[data-tab=canvas]'))">Перейти на Canvas</button>
    `;
  }
}

// ─── All at once ──────────────────────────────────────────────
function exportAll() {
  exportJSON();
  setTimeout(() => exportDrawio(), 300);
  setTimeout(() => exportHTML(), 600);
}

// ─── Import ───────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════
// CSV IMPORT / EXPORT (RFC 4180 compliant)
// Columns: id, title, intent, type, section, next_default, next_yes, next_no, text_ru, text_uz
// ═══════════════════════════════════════════════════════════════
const CSV_COLUMNS = ['id', 'title', 'intent', 'type', 'section', 'next_default', 'next_yes', 'next_no', 'text_ru', 'text_uz'];

function csvEscape(v) {
  const s = String(v == null ? '' : v);
  if (/[",\n\r]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
  return s;
}

// Parse CSV text respecting RFC 4180: quoted fields may contain commas, newlines, and escaped quotes ("")
function parseCSV(text) {
  const rows = [];
  let row = [];
  let field = '';
  let i = 0;
  let inQuotes = false;
  // Normalize Windows/Mac line endings
  text = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  // Strip BOM
  if (text.charCodeAt(0) === 0xFEFF) text = text.slice(1);

  while (i < text.length) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') { field += '"'; i += 2; continue; }
        inQuotes = false; i++;
      } else {
        field += ch; i++;
      }
    } else {
      if (ch === '"') { inQuotes = true; i++; }
      else if (ch === ',') { row.push(field); field = ''; i++; }
      else if (ch === '\n') { row.push(field); rows.push(row); row = []; field = ''; i++; }
      else { field += ch; i++; }
    }
  }
  // Flush last field/row if non-empty
  if (field !== '' || row.length) { row.push(field); rows.push(row); }
  // Remove trailing empty rows
  while (rows.length && rows[rows.length - 1].every(c => c === '')) rows.pop();
  return rows;
}

function downloadCSVTemplate() {
  const rows = [
    CSV_COLUMNS,
    ['start', 'Старт', '', 'start', 's1', 'greeting', '', '', 'Входящий звонок', 'Kiruvchi qo\'ng\'iroq'],
    ['greeting', 'Приветствие', 'greeting', 'normal', 's1', 'client_question', '', '', 'Здравствуйте! Это {BANK_NAME}, меня зовут {AGENT_NAME}.', 'Assalomu alaykum! Bu {BANK_NAME}.'],
    ['client_question', 'Вопрос клиента?', 'router', 'decision', 's1', 'end_call', 'payment_info', 'end_call', 'Какой у вас вопрос?', 'Qanday savolingiz bor?'],
    ['payment_info', 'Как оплатить?', 'pay_info', 'question', 's2', 'end_call', '', '', 'Через {APP_NAME}, Payme или Click. Сумма: {AMOUNT} сум.', '{APP_NAME}, Payme yoki Click orqali.'],
    ['end_call', 'Завершение', 'goodbye', 'end', 's3', '', '', '', 'Спасибо! До свидания.', 'Rahmat, xayr!']
  ];
  const csv = rows.map(r => r.map(csvEscape).join(',')).join('\n');
  downloadBlob('\uFEFF' + csv, 'script_template.csv', 'text/csv;charset=utf-8');
  toast('Шаблон CSV скачан');
}

function exportAllBlocksCSV() {
  const d = data();
  if (!d.blocks.length) { toast('Нет блоков для экспорта', 'error'); return; }
  const rows = [CSV_COLUMNS];
  d.blocks.forEach(b => {
    rows.push([
      b.id || '',
      b.title || '',
      b.intent || '',
      b.type || 'normal',
      b.sec || '',
      b.next_default || '',
      b.next_yes || '',
      b.next_no || '',
      b.ru || '',
      b.uz || ''
    ]);
  });
  const csv = rows.map(r => r.map(csvEscape).join(',')).join('\n');
  const name = activeProfile.replace(/[^\w.-]/g, '_');
  downloadBlob('\uFEFF' + csv, name + '_blocks.csv', 'text/csv;charset=utf-8');
  toast('CSV со всеми блоками скачан');
}

function importCSV(event) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (ev) => {
    try {
      const rows = parseCSV(ev.target.result);
      if (rows.length < 2) throw new Error('Файл пустой или нет данных кроме заголовков');
      const header = rows[0].map(h => h.trim().toLowerCase());

      // Map header → column index; tolerate missing columns
      const idx = {};
      CSV_COLUMNS.forEach(col => { idx[col] = header.indexOf(col); });
      if (idx.id === -1) throw new Error('Обязательная колонка `id` не найдена. Скачайте шаблон CSV.');

      const dataRows = rows.slice(1).filter(r => r.some(c => c && c.trim()));
      const errors = [];
      const importedBlocks = [];
      const seenIds = new Set();

      dataRows.forEach((r, i) => {
        const rowNum = i + 2; // account for header and 1-based
        const id = (r[idx.id] || '').trim();
        if (!id) { errors.push(`Строка ${rowNum}: пустой id`); return; }
        if (seenIds.has(id)) { errors.push(`Строка ${rowNum}: повторяющийся id «${id}»`); return; }
        seenIds.add(id);

        const get = (col) => idx[col] >= 0 ? (r[idx[col]] || '').trim() : '';
        const validTypes = ['start', 'normal', 'question', 'decision', 'end'];
        let type = get('type').toLowerCase() || 'normal';
        if (!validTypes.includes(type)) {
          errors.push(`Строка ${rowNum}: неизвестный тип «${type}», использую "normal"`);
          type = 'normal';
        }

        importedBlocks.push({
          id,
          title: get('title') || id,
          intent: get('intent'),
          type,
          sec: get('section') || 's1',
          next_default: get('next_default'),
          next_yes: get('next_yes'),
          next_no: get('next_no'),
          ru: idx.text_ru >= 0 ? r[idx.text_ru] || '' : '',
          uz: idx.text_uz >= 0 ? r[idx.text_uz] || '' : ''
        });
      });

      // Validate references
      const refErrors = [];
      importedBlocks.forEach((b, i) => {
        ['next_default', 'next_yes', 'next_no'].forEach(k => {
          if (b[k] && !seenIds.has(b[k])) {
            refErrors.push(`Блок «${b.id}» ссылается на несуществующий «${b[k]}» через ${k}`);
          }
        });
      });

      // Collect sections
      const sectionIds = new Set(importedBlocks.map(b => b.sec).filter(Boolean));
      const sections = Array.from(sectionIds).map(id => ({
        id,
        label: id === 's1' ? 'Основной раздел' : id
      }));
      if (!sections.length) sections.push({ id: 's1', label: 'Основной раздел' });

      // Build report and ask user to confirm
      let report = `Распознано блоков: ${importedBlocks.length}\n`;
      report += `Разделов: ${sections.length}\n`;
      if (errors.length) report += `\n⚠ Предупреждений: ${errors.length}\n  ${errors.slice(0, 5).join('\n  ')}${errors.length > 5 ? '\n  …и ещё ' + (errors.length - 5) : ''}\n`;
      if (refErrors.length) report += `\n⚠ Битых ссылок: ${refErrors.length}\n  ${refErrors.slice(0, 5).join('\n  ')}${refErrors.length > 5 ? '\n  …и ещё ' + (refErrors.length - 5) : ''}\n`;
      report += `\nИмпортировать как новый профиль?`;

      const profName = prompt(report + '\n\nНазвание нового профиля:', file.name.replace(/\.csv$/i, '') || 'CSV импорт');
      if (!profName) { toast('Импорт отменён', 'info'); return; }
      if (profiles[profName]) {
        if (!confirm(`Профиль «${profName}» уже существует. Перезаписать?`)) { toast('Импорт отменён', 'info'); return; }
      }

      snapshot('Импорт CSV');
      profiles[profName] = {
        name: profName,
        vars: { BANK_NAME: '', PHONE: '', AGENT_NAME: '', APP_NAME: '', AMOUNT: '' },
        sections,
        blocks: importedBlocks
      };
      activeProfile = profName;
      canvasState.autoLaidOut.delete(profName); // force auto-layout next time
      renderProfiles(); renderBlocks(); renderVars(); renderStats();
      toast(`✓ Импортировано ${importedBlocks.length} блоков из CSV`);
    } catch (err) {
      toast('Ошибка импорта CSV: ' + err.message, 'error');
    }
  };
  reader.readAsText(file, 'UTF-8');
  event.target.value = '';
}

function importJSON(e) {
  const file = e.target.files[0]; if (!file) return;
  const r = new FileReader();
  r.onload = (ev) => {
    try {
      const p = JSON.parse(ev.target.result);
      if (!p.name || !p.sections || !p.blocks) throw new Error('Неверная структура файла');
      snapshot('Импорт JSON');
      profiles[p.name] = p;
      activeProfile = p.name;
      renderProfiles(); renderBlocks(); renderVars(); renderStats();
      toast(`Профиль «${p.name}» импортирован`);
    } catch (err) {
      toast('Ошибка импорта: ' + err.message, 'error');
    }
  };
  r.readAsText(file);
  e.target.value = '';
}

// ═══════════════════════════════════════════════════════════════
// DRAW.IO IMPORT — parse .drawio / .xml files into a profile
// Specifically tuned for Visio→Drawio exports (UserObject + stencils)
// ═══════════════════════════════════════════════════════════════

function decodeDrawioContent(xmlString) {
  // We expect uncompressed XML with <mxGraphModel> visible
  if (xmlString.includes('<mxGraphModel')) return xmlString;
  const m = xmlString.match(/<diagram[^>]*>([\s\S]*?)<\/diagram>/);
  if (!m) throw new Error('Не нашёл <mxGraphModel> или <diagram> в файле');
  let content = m[1].trim();
  if (content.startsWith('<')) return content;
  throw new Error('Файл сжат (base64+deflate). Откройте в app.diagrams.net → Extras → Edit Diagram → скопируйте XML и сохраните как новый .xml файл (несжатый).');
}

// Parse mxCell style string into key/value object
function parseDrawioStyle(styleStr) {
  const parts = (styleStr || '').split(';').filter(Boolean);
  const result = { _shape: '' };
  parts.forEach((p, i) => {
    if (!p.includes('=') && i === 0) {
      result._shape = p;
    } else if (p.includes('=')) {
      const [k, ...rest] = p.split('=');
      result[k] = rest.join('=');  // value may contain '='
    }
  });
  return result;
}

// Extract clean readable text from HTML inside drawio value/label
function cleanCellText(value) {
  if (!value) return '';
  // Decode entities first by setting innerHTML
  const div = document.createElement('div');
  div.innerHTML = value;
  // Replace <br> with newlines
  div.querySelectorAll('br').forEach(br => br.replaceWith('\n'));
  // Replace block-level closings with newlines too
  div.querySelectorAll('div, p').forEach(el => {
    if (el.nextSibling) el.appendChild(document.createTextNode('\n'));
  });
  let text = div.textContent || '';
  // Collapse multiple whitespace, but preserve intentional newlines
  text = text.replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim();
  return text;
}

// Transliterate cyrillic to latin for IDs
function makeIdFromTitle(title, used) {
  const tr = { 'а':'a','б':'b','в':'v','г':'g','д':'d','е':'e','ё':'e','ж':'zh','з':'z','и':'i','й':'y','к':'k','л':'l','м':'m','н':'n','о':'o','п':'p','р':'r','с':'s','т':'t','у':'u','ф':'f','х':'h','ц':'c','ч':'ch','ш':'sh','щ':'sch','ы':'y','э':'e','ю':'yu','я':'ya','ъ':'','ь':'' };
  let lower = (title || 'block').toLowerCase().slice(0, 50);
  let id = lower.split('').map(ch => tr[ch] !== undefined ? tr[ch] : ch).join('');
  id = id.replace(/[^a-z0-9_]+/g, '_').replace(/^_+|_+$/g, '').substring(0, 30);
  if (!id) id = 'block';
  let unique = id, i = 2;
  while (used.has(unique)) unique = id + '_' + (i++);
  used.add(unique);
  return unique;
}

// Detect block type by combining: shape style, text content, edge counts
function detectBlockType(text, styleStr, incomingCount, outgoingCount) {
  const t = (text || '').toLowerCase().trim();

  // Text-based hints — most reliable for start/end
  if (/^(старт|начало|start|boshlash|нача\u0301ло)/i.test(t)) return 'start';
  if (/(конец|завершение|end|tugatish|tamomlash|завершение звонка)$/i.test(t)) return 'end';

  // Edge-based fallback for start/end only
  if (incomingCount === 0 && outgoingCount > 0) return 'start';
  if (outgoingCount === 0 && incomingCount > 0) return 'end';

  // Everything else = normal (no auto-coloring)
  return 'normal';
}

// Parse one <diagram> page into a list of vertices + edges
function parseDrawioPage(rootEl) {
  const allCells = Array.from(rootEl.querySelectorAll('mxCell'));
  const userObjects = Array.from(rootEl.querySelectorAll('UserObject'));

  const vertices = new Map();
  const edges = [];
  const childLabels = new Map();

  const SKIP_TAGS = ['фон', 'background', 'подложка', 'логотип', 'logo', 'легенда', 'legend'];

  // ── Index every element by id, and record parent + geometry, so we can resolve
  //    nested (grouped) blocks and convert their relative coords to absolute. ──
  const byId = new Map();            // id → { el, cellEl, parent, x,y,w,h, style, isVertex, isEdge, tags, labelHtml, value }
  const readGeom = (cellEl) => {
    const g = cellEl && cellEl.querySelector(':scope > mxGeometry') || (cellEl && cellEl.querySelector('mxGeometry'));
    return {
      x: g ? (parseFloat(g.getAttribute('x') || '0') || 0) : 0,
      y: g ? (parseFloat(g.getAttribute('y') || '0') || 0) : 0,
      w: g ? (parseFloat(g.getAttribute('width') || '0') || 0) : 0,
      h: g ? (parseFloat(g.getAttribute('height') || '0') || 0) : 0,
      hasGeom: !!g
    };
  };

  userObjects.forEach(uo => {
    const id = uo.getAttribute('id'); if (!id) return;
    const inner = uo.querySelector('mxCell'); if (!inner) return;
    const g = readGeom(inner);
    byId.set(id, {
      cellEl: inner, parent: inner.getAttribute('parent') || '',
      style: inner.getAttribute('style') || '',
      isVertex: inner.getAttribute('vertex') === '1',
      isEdge: inner.getAttribute('edge') === '1',
      tags: (uo.getAttribute('tags') || '').toLowerCase(),
      labelHtml: uo.getAttribute('label') || '',
      value: uo.getAttribute('value') || '',
      source: inner.getAttribute('source'), target: inner.getAttribute('target'),
      ...g
    });
  });
  allCells.forEach(c => {
    const id = c.getAttribute('id'); if (!id || byId.has(id)) return;
    const g = readGeom(c);
    byId.set(id, {
      cellEl: c, parent: c.getAttribute('parent') || '',
      style: c.getAttribute('style') || '',
      isVertex: c.getAttribute('vertex') === '1',
      isEdge: c.getAttribute('edge') === '1',
      tags: '', labelHtml: '', value: c.getAttribute('value') || '',
      source: c.getAttribute('source'), target: c.getAttribute('target'),
      ...g
    });
  });

  const isLayerId = (id) => !id || !byId.has(id); // parent points to layer/root (id "0"/"1" not indexed)
  // Absolute top-left of a cell = its own x/y plus every ancestor group's x/y.
  const absPos = (id, guard = 0) => {
    const n = byId.get(id);
    if (!n || guard > 40) return { x: n ? n.x : 0, y: n ? n.y : 0 };
    if (isLayerId(n.parent)) return { x: n.x, y: n.y };
    const p = absPos(n.parent, guard + 1);
    return { x: p.x + n.x, y: p.y + n.y };
  };

  const isTextLabel = (style) => /(?:^|;)\s*text\s*;/.test(style) || style.startsWith('text;');
  const isEdgeLabel = (style) => style.includes('edgeLabel');
  const looksLikeGroup = (n) => /(?:^|;)group(?:;|$)/.test(n.style) || n.style.includes('container=1');

  // ── Which cells are REAL blocks?  A vertex is a block unless it's an
  //    edge-label, or a pure group/container wrapper with no text of its own. ──
  const isBlockVertex = (id) => {
    const n = byId.get(id);
    if (!n || !n.isVertex) return false;
    if (n.tags && SKIP_TAGS.some(t => n.tags.includes(t))) return false;
    if (isEdgeLabel(n.style)) return false;
    // A group/container that merely holds children and has no label → not a block itself
    if (looksLikeGroup(n)) {
      const txt = cleanCellText(n.labelHtml || n.value || '');
      if (!txt) return false;
    }
    return true;
  };

  // ── Build blocks (absolute coords) ──
  byId.forEach((n, id) => {
    if (!n.isVertex) return;
    if (!isBlockVertex(id)) return;
    // text-label cell: if its parent is a real block, fold it in as caption; else keep as own block
    if (isTextLabel(n.style) && !isLayerId(n.parent) && isBlockVertex(n.parent)) {
      const t = cleanCellText(n.value || n.labelHtml || '');
      if (t) { const ex = childLabels.get(n.parent) || ''; childLabels.set(n.parent, ex ? ex + '\n' + t : t); }
      return;
    }
    const pos = absPos(id);
    const text = cleanCellText(n.labelHtml || n.value || '');
    vertices.set(id, {
      mxId: id, title: text, styleStr: n.style,
      x: pos.x, y: pos.y,
      w: n.w || 120, h: n.h || 60,
      isUserObject: !!n.labelHtml
    });
  });

  // ── Fold non-block child captions (edgeLabel/text children of blocks) into titles ──
  byId.forEach((n, id) => {
    if (!n.isVertex || vertices.has(id)) return;
    if (isLayerId(n.parent) || !vertices.has(n.parent)) return;
    if (isTextLabel(n.style) || isEdgeLabel(n.style)) {
      const t = cleanCellText(n.value || n.labelHtml || '');
      if (t) { const ex = childLabels.get(n.parent) || ''; childLabels.set(n.parent, ex ? ex + '\n' + t : t); }
    }
  });

  // ── Edges ──
  byId.forEach((n, id) => {
    if (!n.isEdge) return;
    const source = n.source, target = n.target;
    if (!source || !target) return;
    let label = cleanCellText(n.value || n.labelHtml || '');
    // edge label may live in a child edgeLabel cell
    if (!label) {
      byId.forEach((c) => {
        if (!label && c.parent === id && isEdgeLabel(c.style)) label = cleanCellText(c.value || c.labelHtml || '');
      });
    }
    let waypoints = [];
    const egeom = n.cellEl.querySelector('mxGeometry');
    if (egeom) {
      const ptsArray = egeom.querySelector('Array[as="points"]');
      if (ptsArray) ptsArray.querySelectorAll('mxPoint').forEach(pt => {
        const px = parseFloat(pt.getAttribute('x')), py = parseFloat(pt.getAttribute('y'));
        if (!isNaN(px) && !isNaN(py)) waypoints.push({ x: px, y: py });
      });
    }
    const est = parseDrawioStyle(n.style);
    edges.push({
      source, target, label, waypoints,
      exitX: est.exitX !== undefined ? parseFloat(est.exitX) : undefined,
      exitY: est.exitY !== undefined ? parseFloat(est.exitY) : undefined,
      entryX: est.entryX !== undefined ? parseFloat(est.entryX) : undefined,
      entryY: est.entryY !== undefined ? parseFloat(est.entryY) : undefined
    });
  });

  // Merge child labels into vertex titles when the block had no text of its own
  childLabels.forEach((labelText, parentId) => {
    const v = vertices.get(parentId);
    if (v && (!v.title || v.title === '')) v.title = labelText;
  });

  return { vertices, edges };
}

function parseDrawioXML(xmlString) {
  const xmlContent = decodeDrawioContent(xmlString);
  const parser = new DOMParser();
  const doc = parser.parseFromString(xmlContent, 'application/xml');

  const parseError = doc.querySelector('parsererror');
  if (parseError) throw new Error('Не валидный XML: ' + parseError.textContent.substring(0, 100));

  // Each <diagram> is a separate page (often RU and UZ)
  const diagrams = doc.querySelectorAll('diagram');
  const pages = [];
  if (diagrams.length) {
    diagrams.forEach(d => {
      const name = d.getAttribute('name') || '';
      const root = d.querySelector('root');
      if (!root) return;
      const parsed = parseDrawioPage(root);
      pages.push({ name, ...parsed });
    });
  } else {
    // No <diagram> wrapper — single page
    const root = doc.querySelector('root');
    if (!root) throw new Error('Не нашёл <root> в XML');
    pages.push({ name: '', ...parseDrawioPage(root) });
  }

  if (!pages.length || !pages[0].vertices.size) {
    throw new Error('В диаграмме нет блоков');
  }

  // ──── Identify language pages ─────────────────────
  // A typical Visio bilingual file has pages "RU" and "UZ"
  let pageRu = null, pageUz = null;
  pages.forEach(p => {
    const n = (p.name || '').toUpperCase();
    if (n === 'RU' || n.startsWith('RU')) pageRu = p;
    if (n === 'UZ' || n.startsWith('UZ')) pageUz = p;
  });
  // Default: first page = RU
  const mainPage = pageRu || pages[0];
  const otherPage = pageUz || (pages.length > 1 && pages[1] !== mainPage ? pages[1] : null);

  // ──── Build lookup of UZ texts ───
  // Try by mxId first; if pages use different IDs (common in Visio→Drawio),
  // fall back to matching by relative position on the page.
  const uzByMxId = new Map();
  let uzByPosition = null;
  if (otherPage) {
    otherPage.vertices.forEach((v, id) => {
      if (v.title) uzByMxId.set(id, v.title);
    });

    // Check how many IDs actually overlap between pages
    let overlap = 0;
    mainPage.vertices.forEach((_, id) => { if (uzByMxId.has(id)) overlap++; });

    // If little/no ID overlap, build a position-based matcher
    if (overlap < mainPage.vertices.size * 0.3) {
      // Normalize both pages to their own min-corner, then match nearest blocks
      const normBounds = (page) => {
        let minX = Infinity, minY = Infinity;
        page.vertices.forEach(v => { minX = Math.min(minX, v.x); minY = Math.min(minY, v.y); });
        return { minX: isFinite(minX) ? minX : 0, minY: isFinite(minY) ? minY : 0 };
      };
      const ruB = normBounds(mainPage);
      const uzB = normBounds(otherPage);
      // List of UZ blocks with normalized coords
      const uzList = [];
      otherPage.vertices.forEach((v, id) => {
        uzList.push({ id, nx: v.x - uzB.minX, ny: v.y - uzB.minY, title: v.title, used: false });
      });
      uzByPosition = (ruV) => {
        const rnx = ruV.x - ruB.minX;
        const rny = ruV.y - ruB.minY;
        let best = null, bestD = Infinity;
        for (const u of uzList) {
          if (u.used) continue;
          const d = Math.hypot(u.nx - rnx, u.ny - rny);
          if (d < bestD) { bestD = d; best = u; }
        }
        // Accept match only if reasonably close (within ~120px after normalization)
        if (best && bestD < 120) { best.used = true; return best.title; }
        return '';
      };
    }
  }

  // ──── Compute incoming/outgoing on main page ─────
  const incoming = new Map();
  const outgoing = new Map();
  mainPage.vertices.forEach((_, id) => { incoming.set(id, 0); outgoing.set(id, 0); });
  mainPage.edges.forEach(e => {
    if (mainPage.vertices.has(e.source)) outgoing.set(e.source, (outgoing.get(e.source) || 0) + 1);
    if (mainPage.vertices.has(e.target)) incoming.set(e.target, (incoming.get(e.target) || 0) + 1);
  });

  // ──── Drop orphan decorations: a vertex with NO text AND no edges is not a
  //      dialog block (logo pieces, background shapes from Visio). ──
  const droppedDecor = [];
  mainPage.vertices.forEach((v, mxId) => {
    const hasText = (v.title || '').trim().length > 0;
    const linked = (incoming.get(mxId) || 0) + (outgoing.get(mxId) || 0) > 0;
    if (!hasText && !linked) droppedDecor.push(mxId);
  });
  droppedDecor.forEach(id => mainPage.vertices.delete(id));

  // ──── Generate readable IDs and detect type ──────
  const usedIds = new Set();
  const blocksByMxId = new Map();
  mainPage.vertices.forEach((v, mxId) => {
    const title = v.title || '(без текста)';
    const id = makeIdFromTitle(title, usedIds);
    const type = detectBlockType(title, v.styleStr, incoming.get(mxId) || 0, outgoing.get(mxId) || 0);
    const ruText = v.title;
    const uzText = uzByMxId.get(mxId) || (uzByPosition ? uzByPosition(v) : '') || '';
    // If RU text contains "Здравствуйте" and UZ identical, try to extract slash-separated translation
    let cleanRu = ruText, cleanUz = uzText;
    if (ruText && ruText.includes('/') && !uzText) {
      // Common pattern "Assalomu aleykum/Здравствуйте" — Latin/Cyrillic split
      const parts = ruText.split('/').map(s => s.trim());
      if (parts.length === 2) {
        // Detect which is cyrillic
        const aIsCyrillic = /[а-яА-Я]/.test(parts[0]);
        const bIsCyrillic = /[а-яА-Я]/.test(parts[1]);
        if (aIsCyrillic && !bIsCyrillic) { cleanRu = parts[0]; cleanUz = parts[1]; }
        else if (!aIsCyrillic && bIsCyrillic) { cleanRu = parts[1]; cleanUz = parts[0]; }
      }
    }

    blocksByMxId.set(mxId, {
      id,
      sec: 's1',
      title: title.length > 60 ? title.substring(0, 57) + '…' : title.split('\n')[0],
      intent: '',
      type,
      ru: cleanRu,
      uz: cleanUz,
      branches: [],
      x: v.x,
      y: v.y,
      w: v.w,
      h: v.h,
      next_default: '', next_yes: '', next_no: ''
    });
  });

  // ──── Wire up edges → branches ──────
  mainPage.edges.forEach(e => {
    const fromBlock = blocksByMxId.get(e.source);
    const toBlock = blocksByMxId.get(e.target);
    if (!fromBlock || !toBlock) return;
    fromBlock.branches.push({
      id: branchId(),
      label: e.label || '',
      color: BRANCH_COLOR_DEFAULT,
      next: toBlock.id,
      // Preserve Draw.io routing geometry (waypoints) — used by edge renderer
      waypoints: (e.waypoints && e.waypoints.length) ? e.waypoints.map(p => ({ x: p.x, y: p.y })) : undefined,
      exitX: e.exitX, exitY: e.exitY, entryX: e.entryX, entryY: e.entryY
    });
  });

  // ──── Normalize coordinates: shift so leftmost x=80 ─────
  const blocks = [...blocksByMxId.values()];
  if (blocks.length) {
    let minX = Infinity, minY = Infinity;
    blocks.forEach(b => {
      if (typeof b.x === 'number') minX = Math.min(minX, b.x);
      if (typeof b.y === 'number') minY = Math.min(minY, b.y);
    });
    const shiftX = 80 - (isFinite(minX) ? minX : 0);
    const shiftY = 80 - (isFinite(minY) ? minY : 0);
    blocks.forEach(b => {
      b.x = (b.x || 0) + shiftX;
      b.y = (b.y || 0) + shiftY;
      // Shift branch waypoints by the same offset so routing stays aligned
      (b.branches || []).forEach(br => {
        if (br.waypoints && br.waypoints.length) {
          br.waypoints = br.waypoints.map(p => ({ x: p.x + shiftX, y: p.y + shiftY }));
        }
      });
    });
  }

  // Sync legacy next_*
  blocks.forEach(b => syncLegacyNext(b));

  return {
    blocks,
    stats: {
      vertices: mainPage.vertices.size,
      edges: mainPage.edges.length,
      pages: pages.length,
      hasUz: !!otherPage,
      pageNames: pages.map(p => p.name).filter(Boolean)
    }
  };
}

function importDrawio(e) {
  const file = e.target.files[0]; if (!file) return;
  const r = new FileReader();
  r.onload = (ev) => {
    try {
      const result = parseDrawioXML(ev.target.result);
      if (!result.blocks.length) throw new Error('Не нашёл блоков');

      const baseName = file.name.replace(/\.(drawio|xml|vsdx)$/i, '');
      const profileName = profiles[baseName] ? `${baseName} ${Date.now().toString().slice(-4)}` : baseName;

      snapshot('Импорт Draw.io');
      profiles[profileName] = {
        name: profileName,
        vars: { BANK_NAME: '', PHONE: '', AGENT_NAME: '', AMOUNT: '', DAY: '', MONTH: '' },
        sections: [{ id: 's1', label: 'Импортированные блоки' }],
        blocks: result.blocks
      };
      activeProfile = profileName;

      renderProfiles(); renderBlocks(); renderVars(); renderStats();
      canvasState.autoLaidOut.add(profileName);

      // Auto-apply edge labels as block titles (silent — no confirm dialog)
      const renamedCount = autoApplyEdgeLabelsAsTitles();

      const langInfo = result.stats.hasUz
        ? ' RU+UZ слиты.'
        : ' (UZ заполните вручную)';
      const renameInfo = renamedCount ? ` ${renamedCount} ${renamedCount === 1 ? 'блок' : 'блоков'} переименовано из лейблов стрелок.` : '';
      toast(`✓ ${result.stats.vertices} блоков, ${result.stats.edges} связей.${langInfo}${renameInfo}`);

      setTimeout(() => {
        const canvasTab = document.querySelector('[data-tab="canvas"]');
        if (canvasTab) switchTab('canvas', canvasTab);
      }, 600);
    } catch (err) {
      toast('Ошибка импорта Draw.io: ' + err.message, 'error');
    }
  };
  r.readAsText(file);
  e.target.value = '';
}

// Silent variant of applyEdgeLabelsAsTitles for auto-run on import.
// Always renames if there's at least 1 non-empty incoming label.
// Returns the number of blocks renamed.
function autoApplyEdgeLabelsAsTitles() {
  const d = data();
  if (!d || !d.blocks.length) return 0;

  // For each block, collect ALL incoming non-empty labels
  const incomingLabels = new Map();  // targetId → [labels]
  d.blocks.forEach(src => {
    ensureBranches(src);
    (src.branches || []).forEach(br => {
      if (!br.next) return;
      const lbl = (br.label || '').trim();
      if (!lbl) return;
      if (!incomingLabels.has(br.next)) incomingLabels.set(br.next, []);
      incomingLabels.get(br.next).push(lbl);
    });
  });

  let renamed = 0;
  d.blocks.forEach(b => {
    const labels = incomingLabels.get(b.id) || [];
    if (!labels.length) return;
    const unique = [...new Set(labels)];
    let newTitle;
    if (unique.length === 1) {
      newTitle = unique[0];
    } else {
      // Multiple distinct labels — pick the SHORTEST one (usually most concise/title-like)
      const sorted = [...unique].sort((a, b) => a.length - b.length);
      newTitle = sorted[0];
    }
    const cleanTitle = newTitle.replace(/\s+/g, ' ').trim();
    const finalTitle = cleanTitle.length > 50 ? cleanTitle.substring(0, 47) + '…' : cleanTitle;
    if (!finalTitle) return;
    b.title = finalTitle;
    renamed++;
  });
  return renamed;
}

// ═══════════════════════════════════════════════════════════════
// CANVAS FULLSCREEN — expand canvas tab to whole window
// ═══════════════════════════════════════════════════════════════
function toggleCanvasFullscreen() {
  const tab = document.getElementById('tab-canvas');
  if (!tab) return;
  const isFullscreen = tab.classList.contains('canvas-fullscreen');
  const btn = document.getElementById('btn-canvas-fullscreen');
  if (isFullscreen) {
    tab.classList.remove('canvas-fullscreen');
    document.body.classList.remove('canvas-fullscreen-active');
    if (btn) btn.innerHTML = '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px;margin-right:5px;"><path d="M8 3H5a2 2 0 0 0-2 2v3M21 8V5a2 2 0 0 0-2-2h-3M3 16v3a2 2 0 0 0 2 2h3M16 21h3a2 2 0 0 0 2-2v-3"/></svg>Полный экран';
  } else {
    tab.classList.add('canvas-fullscreen');
    document.body.classList.add('canvas-fullscreen-active');
    if (btn) btn.innerHTML = '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px;margin-right:5px;"><path d="M4 14h6v6M20 10h-6V4M14 10l7-7M3 21l7-7"/></svg>Свернуть';
  }
  // Re-fit after layout change
  setTimeout(() => {
    canvasRender();
    canvasFitToView();
  }, 100);
}

// Esc key exits fullscreen
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    const tab = document.getElementById('tab-canvas');
    if (tab && tab.classList.contains('canvas-fullscreen')) {
      toggleCanvasFullscreen();
    }
  }
});

// ═══════════════════════════════════════════════════════════════
// CANVAS-FIRST EXPORT MENU
// All exports use the Canvas layout (manual x/y coords) — NOT auto swim-lane
// ═══════════════════════════════════════════════════════════════
function canvasExportMenu(event) {
  const menu = document.getElementById('canvas-export-menu');
  if (!menu) return;
  if (menu.style.display === 'block') {
    menu.style.display = 'none';
    return;
  }
  // Position below the trigger button
  const btn = event.currentTarget;
  const r = btn.getBoundingClientRect();
  menu.style.display = 'block';
  menu.style.top = (r.bottom + 6) + 'px';
  menu.style.left = (r.right - 220) + 'px';
  // Close on next outside click
  setTimeout(() => {
    const closer = (e) => {
      if (!menu.contains(e.target) && e.target !== btn) {
        menu.style.display = 'none';
        document.removeEventListener('click', closer);
      }
    };
    document.addEventListener('click', closer);
  }, 0);
}

function canvasDownloadAs(format) {
  const menu = document.getElementById('canvas-export-menu');
  if (menu) menu.style.display = 'none';

  const d = data();
  if (!d.blocks.length) { toast('Нет блоков для экспорта', 'error'); return; }

  // Make sure ALL blocks have x,y. If not, bake the canvas layout first.
  const missingCoords = d.blocks.filter(b => typeof b.x !== 'number' || typeof b.y !== 'number');
  if (missingCoords.length) {
    canvasAutoLayout();
    toast('Применил авто-раскладку перед экспортом', 'info');
  }

  try {
    switch (format) {
      case 'pdf':  exportFlowchartPDF(); break;
      case 'svg':  exportSVG(); break;
      case 'png':  exportPNG(); break;
      case 'json': exportJSON(); break;
      case 'csv':  exportAllBlocksCSV(); break;
      case 'drawio': exportDrawio(); break;
      default: toast('Неизвестный формат: ' + format, 'error');
    }
  } catch (err) {
    toast('Ошибка экспорта: ' + err.message, 'error');
  }
}


// ═══════════════════════════════════════════════════════════════
// VALIDATION: find dead ends, unreachable nodes, broken links, empty text
// ═══════════════════════════════════════════════════════════════
function validateScript() {
  const d = data();
  const blocks = d.blocks;
  const byId = {};
  blocks.forEach(b => byId[b.id] = b);

  const issues = {
    deadEnds: [],      // normal/question/decision blocks without any outgoing connection
    unreachable: [],   // blocks no one points to (and not a start)
    brokenLinks: [],   // next_* references a non-existent block id
    emptyText: [],     // blocks with empty RU or UZ text
    noStart: [],       // no start block at all
    selfLoop: []       // block points to itself
  };

  // Find all blocks that have incoming edges
  const incoming = new Map();
  blocks.forEach(b => {
    ['next_default', 'next_yes', 'next_no'].forEach(k => {
      if (!b[k]) return;
      if (!incoming.has(b[k])) incoming.set(b[k], []);
      incoming.get(b[k]).push({ from: b.id, via: k });
    });
  });

  // Check each block
  blocks.forEach(b => {
    const type = b.type || 'normal';
    const connections = [b.next_default, b.next_yes, b.next_no].filter(Boolean);

    // Dead end: non-end block without any outgoing connection
    if (type !== 'end' && connections.length === 0) {
      issues.deadEnds.push({ id: b.id, title: b.title, type });
    }

    // Unreachable: no incoming AND not a start
    if (type !== 'start' && !incoming.has(b.id)) {
      issues.unreachable.push({ id: b.id, title: b.title, type });
    }

    // Broken links
    ['next_default', 'next_yes', 'next_no'].forEach(k => {
      if (b[k] && !byId[b[k]]) {
        issues.brokenLinks.push({ id: b.id, title: b.title, field: k, target: b[k] });
      }
      if (b[k] && b[k] === b.id) {
        issues.selfLoop.push({ id: b.id, title: b.title, field: k });
      }
    });

    // Empty text (skip start/end — they may be labels only)
    if (type !== 'start' && type !== 'end') {
      if (!b.ru || !b.ru.trim()) issues.emptyText.push({ id: b.id, title: b.title, lang: 'RU' });
      if (!b.uz || !b.uz.trim()) issues.emptyText.push({ id: b.id, title: b.title, lang: 'UZ' });
    }
  });

  // No start block
  const starts = blocks.filter(b => b.type === 'start');
  if (!starts.length) issues.noStart.push({ msg: 'В скрипте нет ни одного блока типа "Начало"' });

  return issues;
}

// ═══════════════════════════════════════════════════════════════
// INTENTS CRUD
// ═══════════════════════════════════════════════════════════════
let intentExpanded = new Set();

function renderIntents() {
  const d = data();
  const q = (document.getElementById('intent-search')?.value || '').trim().toLowerCase();
  const list = document.getElementById('intents-list');
  if (!list) return;

  // Collect intents with usage count and block references
  const usage = new Map();  // intent -> [blockId]
  d.blocks.forEach(b => {
    if (!b.intent) return;
    if (!usage.has(b.intent)) usage.set(b.intent, []);
    usage.get(b.intent).push(b.id);
  });

  // Also include intents stored in profile._customIntents (intents without blocks yet)
  if (d._customIntents) {
    d._customIntents.forEach(i => { if (!usage.has(i)) usage.set(i, []); });
  }

  let intents = Array.from(usage.keys()).sort();
  if (q) intents = intents.filter(i => i.toLowerCase().includes(q));

  if (!intents.length) {
    list.innerHTML = `<div class="empty">${q ? 'Ничего не найдено' : 'Нет интентов. Нажмите «+ Добавить intent».'}</div>`;
    return;
  }

  list.innerHTML = intents.map(intent => {
    const blockIds = usage.get(intent) || [];
    const count = blockIds.length;
    const usageClass = count === 0 ? 'unused' : 'used';
    const isExpanded = intentExpanded.has(intent);
    return `
      <div class="intent-card ${isExpanded ? 'expanded' : ''}">
        <div class="intent-name">${esc(intent)}</div>
        <div class="intent-usage ${usageClass}">${count === 0 ? 'Не используется' : 'В ' + count + ' ' + (count === 1 ? 'блоке' : 'блоках')}</div>
        <div class="intent-actions">
          ${count > 0 ? `<button class="intent-btn" onclick="toggleIntentExpand('${esc(intent)}')" title="Показать блоки">${isExpanded ? '▲' : '▼'}</button>` : ''}
          <button class="intent-btn" onclick="renameIntent('${esc(intent)}')" title="Переименовать">${csIcon('pen',12)}</button>
          <button class="intent-btn danger" onclick="deleteIntent('${esc(intent)}')" title="Удалить">×</button>
        </div>
        ${isExpanded && count > 0 ? `
          <div class="intent-blocks-list">
            ${blockIds.map(bid => {
              const b = d.blocks.find(x => x.id === bid);
              return `<span class="intent-block-chip" onclick="jumpToBlock('${esc(bid)}')" title="Открыть блок">${esc(b?.title || bid)}</span>`;
            }).join('')}
          </div>` : ''}
      </div>
    `;
  }).join('');
}

function toggleIntentExpand(intent) {
  if (intentExpanded.has(intent)) intentExpanded.delete(intent);
  else intentExpanded.add(intent);
  renderIntents();
}

function addIntent() {
  const name = prompt('Имя нового intent\'а (только латиница, цифры, _):', '');
  if (!name) return;
  if (!/^\w+$/.test(name)) { toast('Неверное имя. Разрешены только буквы, цифры, _', 'error'); return; }
  const existing = collectIntents();
  if (existing.includes(name)) { toast(`Intent «${name}» уже существует`, 'error'); return; }
  snapshot('Добавление intent\'а');
  const d = data();
  if (!d._customIntents) d._customIntents = [];
  d._customIntents.push(name);
  renderIntents();
  toast(`Intent «${name}» создан`);
}

function renameIntent(oldName) {
  const newName = prompt(`Новое имя intent'а «${oldName}»:`, oldName);
  if (!newName || newName === oldName) return;
  if (!/^\w+$/.test(newName)) { toast('Неверное имя', 'error'); return; }
  const existing = collectIntents();
  if (existing.includes(newName)) { toast(`Intent «${newName}» уже существует`, 'error'); return; }

  snapshot('Переименование intent\'а');
  const d = data();
  let count = 0;
  d.blocks.forEach(b => {
    if (b.intent === oldName) { b.intent = newName; count++; }
  });
  if (d._customIntents) {
    d._customIntents = d._customIntents.map(i => i === oldName ? newName : i);
  }
  renderIntents();
  renderStats();
  toast(`Intent «${oldName}» → «${newName}» (затронуто блоков: ${count})`);
}

function deleteIntent(name) {
  const d = data();
  const used = d.blocks.filter(b => b.intent === name);
  const msg = used.length
    ? `Intent «${name}» используется в ${used.length} блоках. Удалить? Поле intent в них станет пустым.`
    : `Удалить intent «${name}»?`;
  if (!confirm(msg)) return;
  snapshot('Удаление intent\'а');
  d.blocks.forEach(b => { if (b.intent === name) b.intent = ''; });
  if (d._customIntents) d._customIntents = d._customIntents.filter(i => i !== name);
  renderIntents();
  renderStats();
  toast(`Intent «${name}» удалён`);
}

function renderValidation() {
  const issues = validateScript();
  const total = Object.values(issues).reduce((acc, arr) => acc + arr.length, 0);
  const container = document.getElementById('validation-results');

  // Update tab badge
  const badge = document.getElementById('validate-badge');
  if (badge) {
    if (total === 0) {
      badge.textContent = '';            // clean -> no badge (notification style)
      badge.className = 'rail-badge';
    } else {
      badge.textContent = total > 99 ? '99+' : total;
      badge.className = 'rail-badge';    // small yellow corner badge
    }
  }

  if (total === 0) {
    container.innerHTML = `
      <div class="validation-empty">
        <div class="validation-empty-icon">✓</div>
        <div class="validation-empty-title">Всё в порядке!</div>
        <div class="validation-empty-sub">Проверено ${data().blocks.length} блоков. Проблем не найдено.</div>
      </div>`;
    return;
  }

  let html = '';

  const sections = [
    { key: 'noStart', title: 'Нет стартового блока', severity: 'err', desc: i => `<strong>${i.msg}</strong>. Добавьте блок с типом «Начало», иначе схема не соберётся.` },
    { key: 'brokenLinks', title: 'Битые ссылки', severity: 'err', desc: i => `Блок <strong>«${esc(i.title)}»</strong> ссылается на несуществующий блок <code>${esc(i.target)}</code> через <code>${esc(i.field)}</code>.` },
    { key: 'selfLoop', title: 'Блоки, ссылающиеся на себя', severity: 'err', desc: i => `Блок <strong>«${esc(i.title)}»</strong> ссылается сам на себя через <code>${esc(i.field)}</code> — это приведёт к бесконечному циклу.` },
    { key: 'deadEnds', title: 'Тупиковые блоки (нет выхода)', severity: 'warn', desc: i => `Блок <strong>«${esc(i.title)}»</strong> (тип «${i.type}») не имеет ни одной исходящей связи. Клиент застрянет здесь. Либо добавьте связь, либо смените тип на «Конец».` },
    { key: 'unreachable', title: 'Недостижимые блоки', severity: 'warn', desc: i => `К блоку <strong>«${esc(i.title)}»</strong> (${esc(i.id)}) никто не ведёт — клиент никогда в него не попадёт. Добавьте на него ссылку из другого блока или удалите.` },
    { key: 'emptyText', title: 'Пустой текст', severity: 'warn', desc: i => `У блока <strong>«${esc(i.title)}»</strong> не заполнен текст на <strong>${i.lang}</strong>.` }
  ];

  sections.forEach(sec => {
    const items = issues[sec.key];
    if (!items.length) return;
    const iconClass = sec.severity === 'err' ? 'err' : 'warn';
    const iconChar = sec.severity === 'err' ? '✕' : '!';
    html += `<div class="validation-section">
      <div class="validation-section-head">
        <div class="vs-icon ${iconClass}">${iconChar}</div>
        <div class="vs-title">${sec.title}</div>
        <div class="vs-count">${items.length}</div>
      </div>`;
    items.forEach(item => {
      const canJump = item.id !== undefined;
      html += `<div class="validation-item">
        ${canJump ? `<div class="vi-id">${esc(item.id)}</div>` : ''}
        <div class="vi-text">${sec.desc(item)}</div>
        ${canJump ? `<button class="vi-action" onclick="jumpToBlock('${esc(item.id)}')">→ открыть</button>` : ''}
      </div>`;
    });
    html += `</div>`;
  });

  container.innerHTML = html;
}

function jumpToBlock(id) {
  // Open the block in the editor tab
  const editorTab = document.querySelector('[data-tab="editor"]');
  if (editorTab) switchTab('editor', editorTab);
  openBlocks.add(id);
  renderBlocks();
  setTimeout(() => {
    const el = document.querySelector(`[onclick*="saveBlock('${id}')"]`);
    if (el) {
      el.closest('.block')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, 100);
}

// Update badge whenever data changes
function updateValidationBadge() {
  const issues = validateScript();
  const total = Object.values(issues).reduce((acc, arr) => acc + arr.length, 0);
  const badge = document.getElementById('validate-badge');
  if (!badge) return;
  if (total === 0) {
    badge.textContent = '';              // clean -> no badge (notification style)
    badge.className = 'rail-badge';
  } else {
    badge.textContent = total > 99 ? '99+' : total;
    badge.className = 'rail-badge';      // small yellow corner badge
  }
}

// ═══════════════════════════════════════════════════════════════
// MODAL: close on backdrop click + ESC
// ═══════════════════════════════════════════════════════════════
document.addEventListener('click', (e) => {
  const modal = document.getElementById('template-modal');
  if (e.target === modal) closeTemplateModal();
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    const modal = document.getElementById('template-modal');
    if (modal && modal.style.display !== 'none') closeTemplateModal();
  }
});

// ═══════════════════════════════════════════════════════════════
// CANVAS MODE — drag-n-drop editor
// ═══════════════════════════════════════════════════════════════
const canvasState = {
  selectedId: null,           // primary selection (last clicked) — used for sidebar
  selectedIds: new Set(),     // ALL selected blocks (multi-select)
  zoom: 1,
  panX: 0,
  panY: 0,
  dragging: null,             // { id, offsetX, offsetY, group: [{id, dx, dy}] }
  panning: null,
  boxSelect: null,            // { startX, startY, currentX, currentY, additive }
  autoLaidOut: new Set()
};

// ── Selection helpers ───────────────────────────────────────────
function isSelected(id) {
  return canvasState.selectedIds.has(id);
}
function selectOnly(id) {
  canvasState.selectedIds.clear();
  if (id) canvasState.selectedIds.add(id);
  canvasState.selectedId = id || null;
}
function selectToggle(id) {
  if (canvasState.selectedIds.has(id)) {
    canvasState.selectedIds.delete(id);
    if (canvasState.selectedId === id) {
      canvasState.selectedId = canvasState.selectedIds.size ? [...canvasState.selectedIds][0] : null;
    }
  } else {
    canvasState.selectedIds.add(id);
    canvasState.selectedId = id;
  }
}
function selectAll() {
  const d = data();
  if (!d || !d.blocks.length) return;
  canvasState.selectedIds.clear();
  d.blocks.forEach(b => canvasState.selectedIds.add(b.id));
  canvasState.selectedId = d.blocks[0].id;
  canvasRender();
  renderCanvasSidebar(canvasState.selectedId);
}
function selectClear() {
  canvasState.selectedIds.clear();
  canvasState.selectedId = null;
  canvasRender();
  renderCanvasSidebar(null);
}

// ── Ensure every block has x, y coordinates ─────────────────────
function ensureBlockCoords() {
  const d = data();
  const missing = d.blocks.filter(b => typeof b.x !== 'number' || typeof b.y !== 'number');
  if (!missing.length) return false;
  // If this profile has never been auto-laid-out, do it now
  canvasApplyAutoLayout();
  return true;
}

// ── Apply auto-layout (use buildLayout to position all blocks) ──
function canvasApplyAutoLayout() {
  const d = data();
  if (!d.blocks.length) return;
  const { rank, rowCells, laneOf } = buildLayout(d.blocks);

  const NW = 250, NH = 110;
  const HG = 30, VG = 90;
  const LG = 80;
  const PAD = 60;

  const rows = Object.keys(rowCells).map(Number).sort((a,b)=>a-b);
  let maxL = 0, maxC = 1, maxR = 0;
  rows.forEach(r => {
    maxL = Math.max(maxL, rowCells[r].left.length);
    maxC = Math.max(maxC, rowCells[r].center.length);
    maxR = Math.max(maxR, rowCells[r].right.length);
  });

  const laneW = {
    left:   maxL * NW + Math.max(0, maxL-1) * HG,
    center: maxC * NW + Math.max(0, maxC-1) * HG,
    right:  maxR * NW + Math.max(0, maxR-1) * HG
  };
  const laneX = {
    left:   PAD,
    center: PAD + (laneW.left ? laneW.left + LG : 0),
    right:  PAD + (laneW.left ? laneW.left + LG : 0) + laneW.center + (laneW.right ? LG : 0)
  };

  rows.forEach(r => {
    ['left','center','right'].forEach(ln => {
      const nodes = rowCells[r][ln];
      if (!nodes.length) return;
      const totalW = nodes.length * NW + Math.max(0, nodes.length-1) * HG;
      const colW = laneW[ln] || NW;
      const startX = laneX[ln] + (colW - totalW) / 2;
      const y = PAD + r * (NH + VG);
      nodes.forEach((id, i) => {
        const b = d.blocks.find(x => x.id === id);
        if (b) {
          b.x = startX + i * (NW + HG);
          b.y = y;
        }
      });
    });
  });
}

function canvasAutoLayout() {
  if (!confirm('Применить автоматическую раскладку? Ручные позиции блоков будут перезаписаны.')) return;
  snapshot('Авто-раскладка');
  canvasApplyAutoLayout();
  canvasState.autoLaidOut.add(activeProfile);
  canvasRender();
  canvasFitToView();
  toast('Автоматическая раскладка применена');
}

// ── Main render ────────────────────────────────────────────────
function canvasRender() {
  const d = data();
  const stage = document.getElementById('canvas-stage');
  const viewport = document.getElementById('canvas-viewport');
  if (!stage || !viewport) return;

  // Ensure all blocks have coords
  if (!canvasState.autoLaidOut.has(activeProfile)) {
    canvasApplyAutoLayout();
    canvasState.autoLaidOut.add(activeProfile);
  } else {
    ensureBlockCoords();
  }

  // Grid toggle
  const showGrid = document.getElementById('canvas-show-grid')?.checked ?? true;
  viewport.classList.toggle('no-grid', !showGrid);

  const lang = document.getElementById('canvas-lang')?.value || 'ru';
  const showText = document.getElementById('canvas-show-text')?.checked ?? true;

  // Compute stage bounds
  let maxX = 1000, maxY = 800;
  d.blocks.forEach(b => {
    if (typeof b.x === 'number') maxX = Math.max(maxX, b.x + 250);
    if (typeof b.y === 'number') maxY = Math.max(maxY, b.y + 150);
  });
  stage.style.width = (maxX + 200) + 'px';
  stage.style.height = (maxY + 200) + 'px';

  // Validation issues for node warning badges
  const issues = validateScript();
  const warnedIds = new Set();
  [...issues.deadEnds, ...issues.unreachable, ...issues.brokenLinks].forEach(i => {
    if (i.id) warnedIds.add(i.id);
  });

  // Clear and render
  stage.innerHTML = '';

  // Edges SVG layer
  const edgesSvg = buildCanvasEdges(d.blocks, { obstacleAware: true });
  stage.insertAdjacentHTML('beforeend', edgesSvg);

  // ─── Title header card on canvas (if meta filled) ───
  const meta = d.meta || {};
  const hasMeta = meta.author || meta.description || meta.goal || meta.version;
  if (hasMeta || d.name) {
    // Position above topmost block
    let minX = Infinity, minY = Infinity;
    d.blocks.forEach(b => {
      if (typeof b.x === 'number') minX = Math.min(minX, b.x);
      if (typeof b.y === 'number') minY = Math.min(minY, b.y);
    });
    if (!isFinite(minX)) { minX = 40; minY = 40; }
    const titleCard = document.createElement('div');
    titleCard.className = 'cv-title-card';
    titleCard.style.left = minX + 'px';
    titleCard.style.top = (minY - 200) + 'px';
    titleCard.innerHTML = `
      <div class="cv-title-brand">CYBERNET AI · Конструктор скриптов</div>
      <div class="cv-title-name">${esc(d.name || 'Скрипт')}</div>
      ${meta.version ? `<div class="cv-title-row"><b>Версия:</b> ${esc(meta.version)}</div>` : ''}
      ${meta.author ? `<div class="cv-title-row"><b>Автор:</b> ${esc(meta.author)}</div>` : ''}
      ${meta.description ? `<div class="cv-title-row"><b>Описание:</b> ${esc(meta.description)}</div>` : ''}
      ${meta.goal ? `<div class="cv-title-row"><b>Цель:</b> ${esc(meta.goal)}</div>` : ''}
    `;
    stage.appendChild(titleCard);
  }

  // Nodes
  d.blocks.forEach(b => {
    const x = typeof b.x === 'number' ? b.x : 40;
    const y = typeof b.y === 'number' ? b.y : 40;
    const type = b.type || 'normal';
    const text = showText ? interpolate(b[lang] || '', d.vars) : '';
    const hasWarn = warnedIds.has(b.id);

    const node = document.createElement('div');
    const colorClass = b.color ? ' cv-node-custom' : '';
    const selectedCls = isSelected(b.id) ? ' selected' : '';
    const primaryCls = (canvasState.selectedId === b.id && canvasState.selectedIds.size > 1) ? ' selected-primary' : '';
    node.className = 'cv-node cv-shape-' + type + colorClass + selectedCls + primaryCls;
    node.dataset.id = b.id;
    node.dataset.type = type;
    node.style.left = x + 'px';
    node.style.top = y + 'px';
    // Auto-size width by content length (Draw.io-like: longer text = wider block)
    const titleLen = (b.title || '').length;
    const bodyLen = (text || '').length;
    const contentLen = Math.max(titleLen * 1.5, bodyLen);
    let nodeW = 200;
    if (contentLen > 260) nodeW = 300;
    else if (contentLen > 160) nodeW = 270;
    else if (contentLen > 90) nodeW = 240;
    else if (contentLen > 40) nodeW = 210;
    else nodeW = 180;
    // decision/start/end tend to be shorter labels — keep compact
    if (type === 'decision') nodeW = Math.min(nodeW, 220);
    if (type === 'start' || type === 'end') nodeW = Math.min(nodeW, 200);
    if (typeof b.w === 'number' && b.w > 40) nodeW = Math.min(Math.max(b.w, 120), 600); // respect imported Draw.io width
    node.style.width = nodeW + 'px';
    // Respect imported Draw.io height so edge endpoints line up with the original layout
    if (typeof b.h === 'number' && b.h > 40) node.style.minHeight = Math.min(Math.max(b.h, 40), 600) + 'px';
    if (b.color) {
      node.style.background = b.color;
      node.style.setProperty('--user-color', b.color);  // CSS .cv-node-custom reads var(--user-color) !important
      const isDark = isColorDark(b.color);
      if (isDark) node.classList.add('cv-node-dark');
    }
    node.innerHTML = `
      ${hasWarn ? '<div class="cv-node-warn" title="Есть проблема — откройте вкладку «Валидация»">!</div>' : ''}
      <div class="cv-node-head" title="${esc(b.id)}">
        <div class="cv-node-title">${esc(b.title || '')}</div>
      </div>
      ${showText ? `<div class="cv-node-body">${esc(text || '— пусто —')}</div>` : ''}
    `;
    stage.appendChild(node);
    attachNodeHandlers(node, b.id);
  });

  // Apply zoom/pan
  applyCanvasTransform();
  updateZoomIndicator();

  // Re-apply path highlighting if a block is selected
  if (canvasState.selectedId && !simState.active) {
    applyPathHighlight(canvasState.selectedId);
  }

  // Re-apply simulator visuals if active
  if (simState.active) {
    simApplyVisuals();
  }
}

// ─── PATH HIGHLIGHTING: find upstream ancestors & downstream descendants ─
function findPathSets(focusId) {
  const blocks = data().blocks;
  const upstream = new Set();
  const downstream = new Set();

  // Upstream: BFS on reverse edges (find all blocks whose next_* leads to focusId)
  const reverseGraph = {};
  blocks.forEach(b => {
    [b.next_default, b.next_yes, b.next_no].forEach(to => {
      if (!to) return;
      if (!reverseGraph[to]) reverseGraph[to] = [];
      reverseGraph[to].push(b.id);
    });
  });

  const upQueue = [focusId];
  const upVisited = new Set([focusId]);
  while (upQueue.length) {
    const cur = upQueue.shift();
    (reverseGraph[cur] || []).forEach(parent => {
      if (!upVisited.has(parent)) {
        upVisited.add(parent);
        upstream.add(parent);
        upQueue.push(parent);
      }
    });
  }

  // Downstream: BFS on forward edges
  const forwardGraph = {};
  blocks.forEach(b => {
    forwardGraph[b.id] = [b.next_default, b.next_yes, b.next_no].filter(Boolean);
  });
  const downQueue = [focusId];
  const downVisited = new Set([focusId]);
  while (downQueue.length) {
    const cur = downQueue.shift();
    (forwardGraph[cur] || []).forEach(child => {
      if (!downVisited.has(child)) {
        downVisited.add(child);
        downstream.add(child);
        downQueue.push(child);
      }
    });
  }

  return { upstream, downstream };
}

function togglePathsCheckbox() {
  const on = document.getElementById('canvas-show-paths')?.checked;
  if (!on) {
    clearPathHighlight(true);
  } else if (canvasState.selectedId) {
    applyPathHighlight(canvasState.selectedId);
  }
}

function applyPathHighlight(focusId) {
  const showPaths = document.getElementById('canvas-show-paths')?.checked ?? true;
  if (!focusId || !showPaths) {
    clearPathHighlight(false);
    return;
  }

  const { upstream, downstream } = findPathSets(focusId);
  const allHighlighted = new Set([focusId, ...upstream, ...downstream]);

  document.querySelectorAll('.cv-node').forEach(node => {
    const nid = node.dataset.id;
    node.classList.remove('path-focus', 'path-upstream', 'path-downstream', 'path-dim');
    if (nid === focusId) {
      node.classList.add('path-focus');
    } else if (upstream.has(nid)) {
      node.classList.add('path-upstream');
    } else if (downstream.has(nid)) {
      node.classList.add('path-downstream');
    } else {
      node.classList.add('path-dim');
    }
  });

  // Dim edges not connected to highlighted nodes
  document.querySelectorAll('.canvas-edges path[data-from]').forEach(path => {
    const from = path.dataset.from;
    const to = path.dataset.to;
    path.classList.remove('edge-dim', 'edge-upstream', 'edge-downstream');
    if (allHighlighted.has(from) && allHighlighted.has(to)) {
      if (from === focusId || downstream.has(from)) {
        path.classList.add('edge-downstream');
      } else if (to === focusId || upstream.has(to)) {
        path.classList.add('edge-upstream');
      }
    } else {
      path.classList.add('edge-dim');
    }
  });

  // Show legend
  const legend = document.getElementById('path-legend');
  if (legend) legend.classList.add('show');
}

function clearPathHighlight(updateSelection = true) {
  document.querySelectorAll('.cv-node').forEach(node => {
    node.classList.remove('path-focus', 'path-upstream', 'path-downstream', 'path-dim');
  });
  document.querySelectorAll('.canvas-edges path').forEach(path => {
    path.classList.remove('edge-dim', 'edge-upstream', 'edge-downstream');
  });
  const legend = document.getElementById('path-legend');
  if (legend) legend.classList.remove('show');
  if (updateSelection) {
    canvasState.selectedId = null;
    renderCanvasSidebar(null);
  }
}


// ═══════════════════════════════════════════════════════════════
// MANUAL EDGE ROUTING — shared geometry + live editing helpers
// ═══════════════════════════════════════════════════════════════
function csBlockBox(b) {
  let w;
  if (typeof b.w === 'number' && b.w > 40) {
    w = Math.min(Math.max(b.w, 120), 600);
  } else {
    const titleLen = (b.title || '').length;
    const bodyLen = (b.ru || b.uz || '').length;
    const contentLen = Math.max(titleLen * 1.5, bodyLen);
    if (contentLen > 260) w = 300;
    else if (contentLen > 160) w = 270;
    else if (contentLen > 90) w = 240;
    else if (contentLen > 40) w = 210;
    else w = 180;
    if (b.type === 'decision') w = Math.min(w, 220);
    if (b.type === 'start' || b.type === 'end') w = Math.min(w, 200);
  }
  let h;
  if (typeof b.h === 'number' && b.h > 40) h = Math.min(Math.max(b.h, 40), 600);
  else if (b.type === 'start' || b.type === 'end') h = 60;
  else { const t = (b.ru || b.uz || '').length; h = t < 30 ? 80 : t < 80 ? 110 : t < 160 ? 150 : 200; }
  const x = b.x || 0, y = b.y || 0;
  return { x, y, w, h, cx: x + w / 2, cy: y + h / 2 };
}
function csEdgeGeom(from, to, branch) {
  const s = csBlockBox(from), t = csBlockBox(to);
  const wps = (branch && branch.waypoints) || [];
  const boxPoint = (bx, fx, fy) => ({ x: bx.x + bx.w * fx, y: bx.y + bx.h * fy });
  const anchorToward = (bx, tp) => {
    const dx = tp.x - bx.cx, dy = tp.y - bx.cy;
    if (dx === 0 && dy === 0) return { x: bx.cx, y: bx.y + bx.h };
    const sx = dx === 0 ? Infinity : (bx.w / 2) / Math.abs(dx);
    const sy = dy === 0 ? Infinity : (bx.h / 2) / Math.abs(dy);
    const k = Math.min(sx, sy);
    return { x: bx.cx + dx * k, y: bx.cy + dy * k };
  };
  const start = (branch && branch.exitX != null && branch.exitY != null)
    ? boxPoint(s, branch.exitX, branch.exitY)
    : anchorToward(s, wps[0] || { x: t.cx, y: t.cy });
  const end = (branch && branch.entryX != null && branch.entryY != null)
    ? boxPoint(t, branch.entryX, branch.entryY)
    : anchorToward(t, wps.length ? wps[wps.length - 1] : { x: s.cx, y: s.cy });
  return { start, end, poly: [start, ...wps, end] };
}
function csOrthoD(points) {
  if (!points.length) return '';
  let d = 'M' + points[0].x + ',' + points[0].y;
  for (let i = 1; i < points.length; i++) {
    const c = points[i - 1], n = points[i];
    if (Math.abs(n.x - c.x) < 2 || Math.abs(n.y - c.y) < 2) {
      d += ' L' + n.x + ',' + n.y;
    } else {
      d += ' L' + c.x + ',' + n.y + ' L' + n.x + ',' + n.y;
    }
  }
  return d;
}
function csEdgeD(from, to, branch) {
  return csOrthoD(csEdgeGeom(from, to, branch).poly);
}
function csNearestSeg(poly, P) {
  let best = 0, bestD = Infinity;
  for (let i = 0; i < poly.length - 1; i++) {
    const A = poly[i], B = poly[i + 1];
    const dx = B.x - A.x, dy = B.y - A.y;
    const len2 = dx * dx + dy * dy || 1;
    let t = ((P.x - A.x) * dx + (P.y - A.y) * dy) / len2;
    t = Math.max(0, Math.min(1, t));
    const cx = A.x + t * dx, cy = A.y + t * dy;
    const dist = (P.x - cx) * (P.x - cx) + (P.y - cy) * (P.y - cy);
    if (dist < bestD) { bestD = dist; best = i; }
  }
  return best;
}
function csFindBlock(id) { return (data().blocks || []).find(b => b.id === id) || null; }
function csGetBranch(fromId, toId) {
  const b = csFindBlock(fromId);
  return (b && b.branches) ? (b.branches.find(br => br.next === toId) || null) : null;
}
function csStagePoint(e) {
  const stage = document.getElementById('canvas-stage');
  const r = stage.getBoundingClientRect();
  const G = 10;
  return { x: Math.round((e.clientX - r.left) / canvasState.zoom / G) * G, y: Math.round((e.clientY - r.top) / canvasState.zoom / G) * G };
}
function csUpdateEdgeLive(ef, et) {
  const from = csFindBlock(ef), to = csFindBlock(et), br = csGetBranch(ef, et);
  if (!from || !to) return;
  const d = csEdgeD(from, to, br);
  document.querySelectorAll('.canvas-edges path[data-ef="' + CSS.escape(ef) + '"][data-et="' + CSS.escape(et) + '"]').forEach(el => el.setAttribute('d', d));
  if (canvasState.wpDrag && br && br.waypoints) {
    const wp = br.waypoints[canvasState.wpDrag.idx];
    const h = document.querySelector('.edge-wp[data-ef="' + CSS.escape(ef) + '"][data-et="' + CSS.escape(et) + '"][data-idx="' + canvasState.wpDrag.idx + '"]');
    if (h && wp) { h.setAttribute('cx', wp.x); h.setAttribute('cy', wp.y); }
  }
}
function csStraightenEdge() {
  if (!canvasState.selEdge) return;
  const br = csGetBranch(canvasState.selEdge.from, canvasState.selEdge.to);
  if (br && br.waypoints) { snapshot('Выпрямление стрелки'); br.waypoints = undefined; canvasRender(); saveToStorage(); renderCanvasSidebar(null); }
}

function buildCanvasEdges(blocks, opts = {}) {
  // Edge-label visibility toggle + theme-aware pill background
  const showEdgeLabels = document.getElementById('canvas-show-labels')?.checked !== false;
  const pillFill = (document.documentElement.getAttribute('data-theme') === 'dark') ? '#181822' : 'white';
  const obstacleAware = opts.obstacleAware !== false;  // default = true; pass false during drag
  const byId = {};
  blocks.forEach(b => byId[b.id] = b);
  const NW = 230;
  const approxH = (b) => {
    if (b.type === 'start' || b.type === 'end') return 60;
    const txt = (b.ru || b.uz || '').length;
    if (txt < 30) return 80;
    if (txt < 80) return 110;
    if (txt < 160) return 150;
    return 200;
  };

  const boxOf = (b) => {
    let w;
    if (typeof b.w === 'number' && b.w > 40) {
      w = Math.min(Math.max(b.w, 120), 600);
    } else {
      const titleLen = (b.title || '').length;
      const bodyLen = (b.ru || b.uz || '').length;
      const contentLen = Math.max(titleLen * 1.5, bodyLen);
      if (contentLen > 260) w = 300;
      else if (contentLen > 160) w = 270;
      else if (contentLen > 90) w = 240;
      else if (contentLen > 40) w = 210;
      else w = 180;
      if (b.type === 'decision') w = Math.min(w, 220);
      if (b.type === 'start' || b.type === 'end') w = Math.min(w, 200);
    }
    let h;
    if (typeof b.h === 'number' && b.h > 40) h = Math.min(Math.max(b.h, 40), 600);
    else h = approxH(b);
    const x = b.x || 0, y = b.y || 0;
    return { x, y, w, h, cx: x + w / 2, cy: y + h / 2 };
  };
  const boxPoint = (box, fx, fy) => ({ x: box.x + box.w * fx, y: box.y + box.h * fy });
  const anchorToward = (box, target) => {
    const dx = target.x - box.cx, dy = target.y - box.cy;
    if (dx === 0 && dy === 0) return { x: box.cx, y: box.y + box.h };
    const sx = dx === 0 ? Infinity : (box.w / 2) / Math.abs(dx);
    const sy = dy === 0 ? Infinity : (box.h / 2) / Math.abs(dy);
    const t = Math.min(sx, sy);
    return { x: box.cx + dx * t, y: box.cy + dy * t };
  };

  let maxX = 0, maxY = 0;
  blocks.forEach(b => {
    maxX = Math.max(maxX, (b.x || 0) + NW);
    maxY = Math.max(maxY, (b.y || 0) + 120);
  });

  // ─── C: count outgoing edges per source so we can fan them out ──
  const outCount = new Map();      // sourceId → total outgoing
  const outIndex = new Map();      // sourceId → next index when assigning
  const inCount = new Map();       // targetId → total incoming
  const inIndex = new Map();
  blocks.forEach(b => {
    ensureBranches(b);
    const branches = (b.branches || []).filter(br => br.next && byId[br.next]);
    outCount.set(b.id, branches.length);
    branches.forEach(br => {
      inCount.set(br.next, (inCount.get(br.next) || 0) + 1);
    });
  });

  // ─── Markers per color ────────────────────────────────────
  const colorSet = new Set([BRANCH_COLOR_DEFAULT]);
  blocks.forEach(b => (b.branches || []).forEach(br => { if (br.color) colorSet.add(br.color); }));
  const colorToMarkerId = {};
  Array.from(colorSet).forEach((c, i) => { colorToMarkerId[c] = `cvarr-${i}`; });

  let svg = `<svg class="canvas-edges" width="${maxX + 200}" height="${maxY + 200}" style="width:${maxX+200}px;height:${maxY+200}px;">`;
  svg += '<defs>';
  Object.entries(colorToMarkerId).forEach(([color, id]) => {
    svg += `<marker id="${id}" markerWidth="10" markerHeight="10" refX="9" refY="5" orient="auto"><path d="M0,0 L10,5 L0,10 Z" fill="${color}"/></marker>`;
  });
  svg += '</defs>';

  // ─── Build obstacle list (other blocks) for path avoidance ─────
  // Used in obstacleAware mode to detour around blocks the path would cross
  const obstacles = blocks.map(b => {
    const bx = boxOf(b);
    return { id: b.id, x1: bx.x - 8, y1: bx.y - 8, x2: bx.x + bx.w + 8, y2: bx.y + bx.h + 8 };
  });

  // Returns true if [x1,y1]→[x2,y2] horizontal/vertical segment crosses any block other than fromId/toId
  const segmentHitsBlock = (sx, sy, ex, ey, fromId, toId) => {
    const minX = Math.min(sx, ex), maxX_ = Math.max(sx, ex);
    const minY = Math.min(sy, ey), maxY_ = Math.max(sy, ey);
    for (const o of obstacles) {
      if (o.id === fromId || o.id === toId) continue;
      // Box-segment intersection (segments are axis-aligned)
      if (maxX_ < o.x1 || minX > o.x2) continue;
      if (maxY_ < o.y1 || minY > o.y2) continue;
      return o;
    }
    return null;
  };

  // Try to draw a 3-segment orthogonal path that avoids blocks
  // Returns SVG path string or null if can't easily route
  const routeAvoiding = (fx, fy, tx, ty, fromId, toId) => {
    // Try several candidate Y-mid values
    const candidates = [];
    if (ty > fy + 30) {
      const dy = ty - fy;
      // Default: bend at midpoint
      candidates.push((fy + ty) / 2);
      // Bend close to source (early turn)
      candidates.push(fy + 30);
      // Bend close to target (late turn)
      candidates.push(ty - 30);
      // 1/3 and 2/3 points
      candidates.push(fy + dy * 0.3);
      candidates.push(fy + dy * 0.7);
    } else {
      candidates.push((fy + ty) / 2);
    }
    for (const midY of candidates) {
      // Check 3 segments: fx,fy → fx,midY → tx,midY → tx,ty
      const hit1 = segmentHitsBlock(fx, fy, fx, midY, fromId, toId);
      const hit2 = segmentHitsBlock(fx, midY, tx, midY, fromId, toId);
      const hit3 = segmentHitsBlock(tx, midY, tx, ty, fromId, toId);
      if (!hit1 && !hit2 && !hit3) {
        return `M${fx},${fy} L${fx},${midY} L${tx},${midY} L${tx},${ty}`;
      }
    }
    return null; // none of the simple routes work
  };

  const drawEdge = (from, to, label, color, sourceIdx, sourceTotal, targetIdx, targetTotal, branch) => {
    if (!from || !to) return;
    const fh = approxH(from);

    // ── Selected edge OR edge with manual waypoints -> editable polyline ──
    const isSelEdge = canvasState.selEdge && canvasState.selEdge.from === from.id && canvasState.selEdge.to === to.id;
    const hasWps = branch && branch.waypoints && branch.waypoints.length;
    if (isSelEdge || hasWps) {
      const geom = csEdgeGeom(from, to, branch);
      const dpath = csOrthoD(geom.poly);
      const markerId2 = colorToMarkerId[color] || colorToMarkerId[BRANCH_COLOR_DEFAULT];
      svg += `<path d="${dpath}" fill="none" stroke="transparent" stroke-width="16" class="edge-hit" data-ef="${from.id}" data-et="${to.id}" style="pointer-events:stroke;cursor:pointer;"/>`;
      svg += `<path d="${dpath}" data-from="${from.id}" data-to="${to.id}" data-ef="${from.id}" data-et="${to.id}" stroke="${isSelEdge ? '#2563eb' : color}" stroke-width="${isSelEdge ? 2.6 : 1.8}" fill="none" marker-end="url(#${markerId2})" opacity="${isSelEdge ? 1 : 0.85}"/>`;
      if (isSelEdge) {
        ((branch && branch.waypoints) || []).forEach((pt, i) => {
          svg += `<circle cx="${pt.x}" cy="${pt.y}" r="6" fill="#2563eb" stroke="#ffffff" stroke-width="2" class="edge-wp" data-ef="${from.id}" data-et="${to.id}" data-idx="${i}" style="pointer-events:all;cursor:move;"/>`;
        });
      } else if (label && showEdgeLabels) {
        const pts = (branch && branch.waypoints) || [];
        const mid = pts[Math.floor(pts.length / 2)] || { x: (geom.start.x + geom.end.x) / 2, y: (geom.start.y + geom.end.y) / 2 };
        const cleanLabel = label.replace(/\n+/g, ' ').trim().slice(0, 40);
        const lblW = Math.max(36, cleanLabel.length * 7 + 14);
        svg += `<rect x="${mid.x - lblW/2}" y="${mid.y - 11}" width="${lblW}" height="22" rx="9" fill="${pillFill}" stroke="${color}" stroke-width="1.5"/>`;
        svg += `<text x="${mid.x}" y="${mid.y + 4}" text-anchor="middle" font-size="11" font-weight="700" fill="${color}">${esc(cleanLabel)}</text>`;
      }
      return;
    }

    // ─── C: exit point on source's bottom edge ──
    // Multiple OUTGOING arrows spread slightly (they go to different targets)
    const sBoxF = boxOf(from);
    const tBoxF = boxOf(to);
    const fxCenter = sBoxF.cx;
    const fyExit = sBoxF.y + sBoxF.h;
    let fx = fxCenter;
    if (sourceTotal > 1) {
      const usableW = sBoxF.w * 0.5;
      const step = usableW / (sourceTotal + 1);
      fx = sBoxF.x + (sBoxF.w - usableW) / 2 + step * (sourceIdx + 1);
    }

    // Entry point on target's top edge — all INCOMING arrows CONVERGE to the
    // same center point (like Draw.io), so they merge into one clean line.
    const txCenter = tBoxF.cx;
    const tyEntry = tBoxF.y;
    let tx = txCenter; // always center — no fan-out on entry

    let path = null;
    // Downward edge: route through a grid-snapped SHARED vertical channel, so parallel
    // arrows in the same corridor collapse into ONE trunk. Blocks are NOT moved.
    if (obstacleAware && tyEntry > fyExit + 16) {
      const STEP = 16;
      const yTopC = fyExit + 8, yBotC = tyEntry - 8;
      if (yBotC - yTopC >= 2) {
        // preferred channel = grid-snapped midpoint of the two centres (siblings merge)
        let chX = Math.round(((fxCenter + txCenter) / 2) / STEP) * STEP;
        if (segmentHitsBlock(chX, yTopC, chX, yBotC, from.id, to.id)) {
          // blocked (long / skip edge) -> scan for a clear grid-aligned corridor.
          // Scan RIGHT fully first, then LEFT, so parallel edges converge to the SAME
          // corridor (deterministic side) instead of splitting left/right.
          let found = null;
          for (let i = 1; i <= 60 && found === null; i++) {
            const r = chX + i * STEP;
            if (!segmentHitsBlock(r, yTopC, r, yBotC, from.id, to.id)) found = r;
          }
          for (let i = 1; i <= 60 && found === null; i++) {
            const l = chX - i * STEP;
            if (!segmentHitsBlock(l, yTopC, l, yBotC, from.id, to.id)) found = l;
          }
          chX = found;
        }
        if (chX !== null) {
          if (Math.abs(fxCenter - chX) < 2 && Math.abs(txCenter - chX) < 2) {
            path = `M${chX},${fyExit} L${chX},${tyEntry}`;
          } else {
            path = `M${fxCenter},${fyExit} L${fxCenter},${fyExit + 8} L${chX},${fyExit + 8} L${chX},${tyEntry - 8} L${txCenter},${tyEntry - 8} L${txCenter},${tyEntry}`;
          }
        }
      }
    }
    // Fallback: obstacle-aware Z-routing when the channel could not be placed
    if (!path && obstacleAware && tyEntry > fyExit + 30) {
      path = routeAvoiding(fx, fyExit, tx, tyEntry, from.id, to.id);
    }

    // Fallback: simple 3-segment path
    if (!path) {
      if (tyEntry > fyExit + 10) {
        const midY = (fyExit + tyEntry) / 2;
        path = `M${fx},${fyExit} L${fx},${midY} L${tx},${midY} L${tx},${tyEntry}`;
      } else {
        // Loop-back: detour around
        const sideX = tx > fx
          ? Math.max((from.x || 0) + NW + 50, (to.x || 0) + NW + 50)
          : Math.min((from.x || 0) - 50, (to.x || 0) - 50);
        const topY = Math.min((from.y || 0), (to.y || 0)) - 40;
        path = `M${fx},${fyExit} L${fx},${fyExit + 25} L${sideX},${fyExit + 25} L${sideX},${topY} L${tx},${topY} L${tx},${tyEntry}`;
      }
    }

    const markerId = colorToMarkerId[color] || colorToMarkerId[BRANCH_COLOR_DEFAULT];
    svg += `<path d="${path}" fill="none" stroke="transparent" stroke-width="16" class="edge-hit" data-ef="${from.id}" data-et="${to.id}" style="pointer-events:stroke;cursor:pointer;"/>`;
    svg += `<path d="${path}" data-from="${from.id}" data-to="${to.id}" stroke="${color}" stroke-width="1.8" fill="none" marker-end="url(#${markerId})" opacity="0.85"/>`;

    if (label && showEdgeLabels) {
      // Find midpoint of the path for label placement
      const ly = (fyExit + tyEntry) / 2;
      const lx = (fx + tx) / 2;
      const cleanLabel = label.replace(/\n+/g, ' ').trim();
      const maxCharsPerLine = 28;
      let lines = [cleanLabel];
      if (cleanLabel.length > maxCharsPerLine) {
        const words = cleanLabel.split(' ');
        lines = [];
        let cur = '';
        for (const w of words) {
          const next = cur ? cur + ' ' + w : w;
          if (next.length > maxCharsPerLine && cur) { lines.push(cur); cur = w; }
          else cur = next;
        }
        if (cur) lines.push(cur);
        if (lines.length > 3) { lines = lines.slice(0, 3); lines[2] += '…'; }
      }
      const lineH = 14;
      const longest = Math.max(...lines.map(l => l.length));
      const lblW = Math.max(36, longest * 7 + 14);
      const lblH = lines.length * lineH + 8;
      const startY = ly - lblH / 2;
      svg += `<rect x="${lx - lblW/2}" y="${startY}" width="${lblW}" height="${lblH}" rx="9" fill="${pillFill}" stroke="${color}" stroke-width="1.5"/>`;
      lines.forEach((line, i) => {
        const tY = startY + 4 + (i + 1) * lineH - lineH/3;
        svg += `<text x="${lx}" y="${tY}" text-anchor="middle" font-size="11" font-weight="700" fill="${color}">${esc(line)}</text>`;
      });
    }
  };

  const norm = (s) => (s || '').toLowerCase().replace(/\s+/g, '').replace(/[…\.,!?]/g, '');

  blocks.forEach(b => {
    ensureBranches(b);
    const branches = (b.branches || []).filter(br => br.next && byId[br.next]);
    const total = branches.length;
    branches.forEach((br, idx) => {
      const targetBlock = byId[br.next];
      let label = br.label || '';
      if (label && targetBlock) {
        const labelN = norm(label);
        const titleN = norm(targetBlock.title);
        if (labelN && titleN && (labelN === titleN || titleN.includes(labelN) || labelN.includes(titleN))) {
          label = '';
        }
      }
      // Compute target index among incoming
      const targetTotal = inCount.get(br.next) || 1;
      const tIdx = inIndex.get(br.next) || 0;
      inIndex.set(br.next, tIdx + 1);
      drawEdge(b, targetBlock, label, br.color || BRANCH_COLOR_DEFAULT, idx, total, tIdx, targetTotal, br);
    });
  });

  svg += '</svg>';
  return svg;
}

// ── Node drag handlers ────────────────────────────────────────
function attachNodeHandlers(node, id) {
  node.addEventListener('mousedown', (e) => {
    if (e.button !== 0) return;
    if (simState.active) return;
    e.stopPropagation();

    // Update selection BEFORE drag starts (so drag uses correct selection)
    if (e.shiftKey || e.ctrlKey || e.metaKey) {
      // Shift+click — toggle membership (light update, no full re-render to keep rects valid)
      selectToggle(id);
      document.querySelectorAll('.cv-node').forEach(n => {
        n.classList.toggle('selected', canvasState.selectedIds.has(n.dataset.id));
      });
      renderCanvasSidebar(canvasState.selectedId);
      return;
    } else if (!isSelected(id)) {
      // Select only this one — light visual update (DON'T canvasRender, it rebuilds the node
      // and invalidates getBoundingClientRect → block jumps)
      selectOnly(id);
      document.querySelectorAll('.cv-node').forEach(n => {
        n.classList.toggle('selected', n.dataset.id === id);
      });
      renderCanvasSidebar(id);
      applyPathHighlight(id);
    }

    const rect = node.getBoundingClientRect();
    const b = data().blocks.find(x => x.id === id);
    if (!b) return;
    // Ensure block has numeric coords (new blocks may lack them)
    if (typeof b.x !== 'number') b.x = 0;
    if (typeof b.y !== 'number') b.y = 0;

    // Build group of all selected blocks with their offsets relative to clicked block
    const group = [];
    canvasState.selectedIds.forEach(sid => {
      const sb = data().blocks.find(x => x.id === sid);
      if (sb) {
        if (typeof sb.x !== 'number') sb.x = 0;
        if (typeof sb.y !== 'number') sb.y = 0;
        group.push({ id: sid, dx: sb.x - b.x, dy: sb.y - b.y, origX: sb.x, origY: sb.y });
      }
    });

    canvasState.dragging = {
      id,
      startClientX: e.clientX,
      startClientY: e.clientY,
      offsetX: (e.clientX - rect.left) / canvasState.zoom,
      offsetY: (e.clientY - rect.top) / canvasState.zoom,
      moved: false,
      origX: b.x,
      origY: b.y,
      group
    };
    node.classList.add('dragging');
  });

  node.addEventListener('click', (e) => {
    if (simState.active) {
      e.stopPropagation();
      return;
    }
    // If was dragged — don't change selection
    if (canvasState.dragging && canvasState.dragging.moved) return;
    e.stopPropagation();
    // Selection already updated on mousedown
  });
}

// ── Viewport-level handlers (panning, box-select, dropping drag) ─────────
function initCanvasHandlers() {
  const viewport = document.getElementById('canvas-viewport');
  if (!viewport || viewport.dataset.handlersAttached) return;
  viewport.dataset.handlersAttached = '1';

  viewport.style.overflow = 'hidden'; // pan via transform only — no conflicting native scrollbars

  // Space-to-pan: track the Space key (ignored while typing in inputs)
  if (!window.__cvSpacePanBound) {
    window.__cvSpacePanBound = true;
    document.addEventListener('keydown', (e) => {
      if (e.code !== 'Space') return;
      const t = e.target;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
      canvasState.spaceHeld = true;
      const vp = document.getElementById('canvas-viewport');
      if (vp) { vp.style.cursor = 'grab'; e.preventDefault(); }
    });
    document.addEventListener('keyup', (e) => {
      if (e.code !== 'Space') return;
      canvasState.spaceHeld = false;
      const vp = document.getElementById('canvas-viewport');
      if (vp) vp.style.cursor = '';
    });
  }

  viewport.addEventListener('mousedown', (e) => {
    if (e.target.closest('.cv-node')) return;
    if (simState.active) return;

    // ── Manual edge editing (Draw.io-style): drag a bend, or grab the line
    //    anywhere to create a bend; a plain click just selects the edge. ──
    const _wp = e.target.closest('.edge-wp');
    const _hit = e.target.closest('.edge-hit');
    if (_wp) {
      e.preventDefault(); e.stopPropagation();
      const br = csGetBranch(_wp.dataset.ef, _wp.dataset.et);
      if (br && br.waypoints) { snapshot('Изгиб стрелки'); canvasState.wpDrag = { ef: _wp.dataset.ef, et: _wp.dataset.et, idx: +_wp.dataset.idx }; }
      return;
    }
    if (_hit) {
      e.preventDefault(); e.stopPropagation();
      canvasState.edgeGrab = { ef: _hit.dataset.ef, et: _hit.dataset.et, startX: e.clientX, startY: e.clientY };
      return;
    }
    if (canvasState.selEdge) { canvasState.selEdge = null; canvasRender(); renderCanvasSidebar(null); }

    // Pan the canvas: middle mouse button, or Space held + left drag
    if (e.button === 1 || (e.button === 0 && canvasState.spaceHeld)) {
      e.preventDefault();
      canvasState.panning = {
        startX: e.clientX, startY: e.clientY,
        origPanX: canvasState.panX, origPanY: canvasState.panY
      };
      viewport.classList.add('panning');
      return;
    }
    if (e.button !== 0) return;

    // Shift on empty area = additive box-select; plain click on empty = clear + box-select
    const stage = document.getElementById('canvas-stage');
    const stageRect = stage.getBoundingClientRect();
    const startX = (e.clientX - stageRect.left) / canvasState.zoom;
    const startY = (e.clientY - stageRect.top) / canvasState.zoom;

    if (e.shiftKey || e.ctrlKey || e.metaKey) {
      // Box-select additive
      canvasState.boxSelect = {
        startX, startY, currentX: startX, currentY: startY,
        additive: true,
        baseSelection: new Set(canvasState.selectedIds)
      };
    } else {
      // Plain mousedown on empty area: start box-select (we'll switch to pan if user holds for a while without moving)
      // For simplicity: empty-area drag = box-select; empty-area click = clear selection
      canvasState.boxSelect = {
        startX, startY, currentX: startX, currentY: startY,
        additive: false,
        baseSelection: new Set()
      };
    }
  });

  document.addEventListener('mousemove', (e) => {
    if (canvasState.edgeGrab) {
      const g = canvasState.edgeGrab;
      if (Math.abs(e.clientX - g.startX) < 4 && Math.abs(e.clientY - g.startY) < 4) return;
      const br = csGetBranch(g.ef, g.et);
      const from = csFindBlock(g.ef), to = csFindBlock(g.et);
      if (br && from && to) {
        snapshot('Изгиб стрелки');
        if (!br.waypoints) br.waypoints = [];
        const pt = csStagePoint(e);
        const seg = csNearestSeg(csEdgeGeom(from, to, br).poly, pt);
        br.waypoints.splice(seg, 0, pt);
        canvasState.selEdge = { from: g.ef, to: g.et };
        canvasState.selectedId = null; canvasState.selectedIds.clear();
        canvasState.wpDrag = { ef: g.ef, et: g.et, idx: seg };
        canvasState.edgeGrab = null;
        const edgesEl = document.querySelector('.canvas-edges');
        if (edgesEl) edgesEl.outerHTML = buildCanvasEdges(data().blocks, { obstacleAware: true });
      } else { canvasState.edgeGrab = null; }
      return;
    }
    if (canvasState.wpDrag) {
      const { ef, et, idx } = canvasState.wpDrag;
      const br = csGetBranch(ef, et);
      if (br && br.waypoints && br.waypoints[idx]) {
        br.waypoints[idx] = csStagePoint(e);
        csUpdateEdgeLive(ef, et);
      }
      return;
    }
    if (canvasState.dragging) {
      const { id, offsetX, offsetY, group } = canvasState.dragging;
      // Require a small real movement before starting to drag (prevents jump on plain click)
      if (!canvasState.dragging.moved) {
        const dxMove = Math.abs(e.clientX - canvasState.dragging.startClientX);
        const dyMove = Math.abs(e.clientY - canvasState.dragging.startClientY);
        if (dxMove < 4 && dyMove < 4) return;
      }
      canvasState.dragging.moved = true;
      const b = data().blocks.find(x => x.id === id);
      if (!b) return;
      const stage = document.getElementById('canvas-stage');
      const stageRect = stage.getBoundingClientRect();
      const newX = Math.round(((e.clientX - stageRect.left) / canvasState.zoom - offsetX) / 10) * 10;
      const newY = Math.round(((e.clientY - stageRect.top) / canvasState.zoom - offsetY) / 10) * 10;
      if (isNaN(newX) || isNaN(newY)) return;
      const dx = newX - (b.x || 0);
      const dy = newY - (b.y || 0);

      // Move all blocks in group
      (group || [{ id }]).forEach(g => {
        const sb = data().blocks.find(x => x.id === g.id);
        if (!sb) return;
        sb.x = (sb.x || 0) + dx;
        sb.y = (sb.y || 0) + dy;
        const nodeEl = document.querySelector(`.cv-node[data-id="${CSS.escape(g.id)}"]`);
        if (nodeEl) {
          nodeEl.style.left = sb.x + 'px';
          nodeEl.style.top = sb.y + 'px';
        }
      });
      // Re-render edges only — fast routing during drag (no obstacle avoidance)
      const edgesEl = document.querySelector('.canvas-edges');
      if (edgesEl) edgesEl.outerHTML = buildCanvasEdges(data().blocks, { obstacleAware: false });
    } else if (canvasState.boxSelect) {
      const stage = document.getElementById('canvas-stage');
      const stageRect = stage.getBoundingClientRect();
      canvasState.boxSelect.currentX = (e.clientX - stageRect.left) / canvasState.zoom;
      canvasState.boxSelect.currentY = (e.clientY - stageRect.top) / canvasState.zoom;
      drawBoxSelect();
      // Update selection live
      const bs = canvasState.boxSelect;
      const x1 = Math.min(bs.startX, bs.currentX);
      const x2 = Math.max(bs.startX, bs.currentX);
      const y1 = Math.min(bs.startY, bs.currentY);
      const y2 = Math.max(bs.startY, bs.currentY);
      const inBox = new Set();
      data().blocks.forEach(b => {
        const bx = b.x || 0, by = b.y || 0;
        // Block intersects rectangle if any corner is inside (we use top-left + size)
        const w = 230, h = 100;
        if (bx + w >= x1 && bx <= x2 && by + h >= y1 && by <= y2) {
          inBox.add(b.id);
        }
      });
      // Combine with base
      const newSel = new Set(bs.baseSelection);
      inBox.forEach(id => newSel.add(id));
      canvasState.selectedIds = newSel;
      canvasState.selectedId = newSel.size ? [...newSel][newSel.size - 1] : null;
      // Update visual selection state without full re-render
      document.querySelectorAll('.cv-node').forEach(n => {
        const nid = n.dataset.id;
        n.classList.toggle('selected', canvasState.selectedIds.has(nid));
      });
    } else if (canvasState.panning) {
      const dx = e.clientX - canvasState.panning.startX;
      const dy = e.clientY - canvasState.panning.startY;
      canvasState.panX = canvasState.panning.origPanX + dx;
      canvasState.panY = canvasState.panning.origPanY + dy;
      applyCanvasTransform();
    }
  });

  document.addEventListener('mouseup', (e) => {
    if (canvasState.edgeGrab) {
      const g = canvasState.edgeGrab;
      canvasState.edgeGrab = null;
      canvasState.selEdge = { from: g.ef, to: g.et };
      canvasState.selectedId = null; canvasState.selectedIds.clear();
      canvasRender();
      renderCanvasSidebar(null);
      return;
    }
    if (canvasState.wpDrag) {
      canvasState.wpDrag = null;
      canvasRender();
      saveToStorage();
      return;
    }
    if (canvasState.dragging) {
      if (canvasState.dragging.moved) {
        const { group } = canvasState.dragging;
        // Commit drag with snapshot
        const movedAny = group && group.some(g => {
          const sb = data().blocks.find(x => x.id === g.id);
          return sb && (sb.x !== g.origX || sb.y !== g.origY);
        });
        if (movedAny) {
          // Restore originals temporarily, snapshot, then restore new positions
          const newPositions = group.map(g => {
            const sb = data().blocks.find(x => x.id === g.id);
            return sb ? { id: g.id, newX: sb.x, newY: sb.y } : null;
          }).filter(Boolean);
          group.forEach(g => {
            const sb = data().blocks.find(x => x.id === g.id);
            if (sb) { sb.x = g.origX; sb.y = g.origY; }
          });
          snapshot(group.length > 1 ? `Перемещение ${group.length} блоков` : 'Перемещение блока');
          newPositions.forEach(p => {
            const sb = data().blocks.find(x => x.id === p.id);
            if (sb) { sb.x = p.newX; sb.y = p.newY; }
          });
        }
      }
      const nodeEl = document.querySelector(`.cv-node.dragging`);
      if (nodeEl) nodeEl.classList.remove('dragging');
      const wasMoved = canvasState.dragging.moved;
      const movedIds = new Set((canvasState.dragging.group || []).map(g => g.id));
      canvasState.dragging = null;
      // After release: re-render edges with FULL obstacle-aware routing
      if (wasMoved) {
        // Imported Draw.io waypoints were baked for the OLD positions; once an endpoint
        // moves they no longer line up (diagonal "floating" arrows). Drop waypoints ONLY
        // on edges touching a moved block so they re-route cleanly; untouched edges keep theirs.
        if (movedIds.size) {
          data().blocks.forEach(bl => (bl.branches || []).forEach(br => {
            if (br.waypoints && (movedIds.has(bl.id) || movedIds.has(br.next))) br.waypoints = undefined;
          }));
          saveToStorage();
        }
        const edgesEl = document.querySelector('.canvas-edges');
        if (edgesEl) edgesEl.outerHTML = buildCanvasEdges(data().blocks, { obstacleAware: true });
      }
    }
    if (canvasState.boxSelect) {
      // Detect: if it was just a click (no real drag), clear selection
      const bs = canvasState.boxSelect;
      const dx = Math.abs(bs.currentX - bs.startX);
      const dy = Math.abs(bs.currentY - bs.startY);
      const wasClick = dx < 4 && dy < 4;
      if (wasClick && !bs.additive) {
        // Plain click on empty — clear selection
        selectClear();
      } else {
        // Selection already updated live; just refresh sidebar
        renderCanvasSidebar(canvasState.selectedId);
      }
      removeBoxSelectVisual();
      canvasState.boxSelect = null;
    }
    if (canvasState.panning) {
      canvasState.panning = null;
      viewport.classList.remove('panning');
    }
  });

  // Wheel zoom (Ctrl+wheel only)
  viewport.addEventListener('dblclick', (e) => {
    const wp = e.target.closest('.edge-wp');
    if (!wp) return;
    e.preventDefault(); e.stopPropagation();
    const br = csGetBranch(wp.dataset.ef, wp.dataset.et);
    if (br && br.waypoints) {
      snapshot('Удаление изгиба');
      br.waypoints.splice(+wp.dataset.idx, 1);
      if (!br.waypoints.length) br.waypoints = undefined;
      canvasRender(); saveToStorage();
    }
  });

  viewport.addEventListener('wheel', (e) => {
    // No Ctrl/Cmd -> pan (trackpad two-finger swipe / mouse wheel). With Ctrl/Cmd -> zoom.
    if (!e.ctrlKey && !e.metaKey) {
      e.preventDefault();
      canvasState.panX -= e.deltaX;
      canvasState.panY -= e.deltaY;
      applyCanvasTransform();
      return;
    }
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    const newZoom = Math.max(0.25, Math.min(2, canvasState.zoom * delta));
    const rect = viewport.getBoundingClientRect();
    const cx = e.clientX - rect.left;
    const cy = e.clientY - rect.top;
    // Adjust pan so the point under cursor stays put
    canvasState.panX = cx - (cx - canvasState.panX) * (newZoom / canvasState.zoom);
    canvasState.panY = cy - (cy - canvasState.panY) * (newZoom / canvasState.zoom);
    canvasState.zoom = newZoom;
    applyCanvasTransform();
    updateZoomIndicator();
  }, { passive: false });

  // Click empty area = deselect
  viewport.addEventListener('click', (e) => {
    if (!e.target.closest('.cv-node')) {
      canvasState.selectedId = null;
      renderCanvasSidebar(null);
      document.querySelectorAll('.cv-node.selected').forEach(n => n.classList.remove('selected'));
      clearPathHighlight(false);
    }
  });
}

function applyCanvasTransform() {
  const stage = document.getElementById('canvas-stage');
  if (!stage) return;
  stage.style.transform = `translate(${canvasState.panX}px, ${canvasState.panY}px) scale(${canvasState.zoom})`;
}

function updateZoomIndicator() {
  const el = document.getElementById('canvas-zoom-indicator');
  if (el) el.textContent = Math.round(canvasState.zoom * 100) + '%';
}

function canvasResetZoom() {
  canvasState.zoom = 1;
  canvasState.panX = 0;
  canvasState.panY = 0;
  applyCanvasTransform();
  updateZoomIndicator();
}

function resetAllRouting() {
  const d = data();
  snapshot('Перерисовка связей');
  let n = 0;
  (d.blocks || []).forEach(b => (b.branches || []).forEach(br => { if (br.waypoints) { br.waypoints = undefined; n++; } }));
  canvasRender(); // canvasRender now uses obstacle-aware channel routing
  saveToStorage();
  toast(n ? `Связи перестроены (сброшено изгибов: ${n})` : 'Связи перестроены');
}

function canvasFitToView() {
  const d = data();
  if (!d.blocks.length) return;
  const viewport = document.getElementById('canvas-viewport');
  if (!viewport) return;

  // Bounding box of all blocks
  const xs = d.blocks.map(b => b.x || 0);
  const ys = d.blocks.map(b => b.y || 0);
  const minX = Math.min(...xs) - 40;
  const minY = Math.min(...ys) - 40;
  const maxX = Math.max(...xs) + 230;
  const maxY = Math.max(...ys) + 130;
  const contentW = maxX - minX;
  const contentH = maxY - minY;

  const vw = viewport.clientWidth;
  const vh = viewport.clientHeight;

  const scaleX = vw / contentW;
  const scaleY = vh / contentH;
  const zoom = Math.min(scaleX, scaleY, 1);

  canvasState.zoom = Math.max(0.25, zoom);
  canvasState.panX = -minX * canvasState.zoom + (vw - contentW * canvasState.zoom) / 2;
  canvasState.panY = -minY * canvasState.zoom + (vh - contentH * canvasState.zoom) / 2;
  applyCanvasTransform();
  updateZoomIndicator();
}

// ═══════════════════════════════════════════════════════════════
// SIMULATOR — walk through the script like an operator on Canvas
// ═══════════════════════════════════════════════════════════════
const simState = {
  active: false,
  currentId: null,
  history: [],  // [{ id, choice: 'yes'|'no'|'def' }]
  lang: 'ru'
};

function simToggle() {
  if (simState.active) simStop();
  else simStart();
}

function simStart() {
  const d = data();
  // Find start block (type='start' preferred, else first with no incoming edges)
  let startBlock = d.blocks.find(b => b.type === 'start');
  if (!startBlock) {
    const incoming = new Set();
    d.blocks.forEach(b => { ['next_default','next_yes','next_no'].forEach(k => { if (b[k]) incoming.add(b[k]); }); });
    startBlock = d.blocks.find(b => !incoming.has(b.id)) || d.blocks[0];
  }
  if (!startBlock) { toast('Нет блоков для симуляции', 'error'); return; }

  simState.active = true;
  simState.currentId = startBlock.id;
  simState.history = [];
  simState.lang = document.getElementById('canvas-lang')?.value || 'ru';

  document.getElementById('sim-status-bar').style.display = 'flex';
  document.getElementById('canvas-hint').style.display = 'none';
  const btn = document.getElementById('btn-sim-toggle');
  if (btn) {
    btn.classList.add('active');
    if (!btn.dataset.origHtml) btn.dataset.origHtml = btn.innerHTML;
    btn.innerHTML = '⏹ Остановить';
  }

  canvasRender();
  simApplyVisuals();
  renderSimSidebar();
  focusOnCurrentBlock();

  toast('Симулятор запущен');
}

function simStop() {
  simState.active = false;
  simState.currentId = null;
  simState.history = [];

  const bar = document.getElementById('sim-status-bar');
  if (bar) bar.style.display = 'none';
  const hint = document.getElementById('canvas-hint');
  if (hint) hint.style.display = '';
  const btn = document.getElementById('btn-sim-toggle');
  if (btn) { btn.classList.remove('active'); btn.innerHTML = btn.dataset.origHtml || '▶ Симулятор'; }

  // Clear all simulator classes
  document.querySelectorAll('.cv-node').forEach(n => {
    n.classList.remove('sim-active', 'sim-visited', 'sim-dimmed');
    const badge = n.querySelector('.sim-you-are-here');
    if (badge) badge.remove();
  });
  document.querySelectorAll('.canvas-edges path').forEach(p => {
    p.classList.remove('sim-walked', 'sim-faded');
  });

  // Reset sidebar
  renderCanvasSidebar(canvasState.selectedId);
}

function simReset() {
  if (!simState.active) return;
  simStart();
  toast('⏮ Возвращаемся к началу');
}

function simBack() {
  if (!simState.active || !simState.history.length) {
    toast('Некуда возвращаться', 'info');
    return;
  }
  const last = simState.history.pop();
  simState.currentId = last.id;
  simApplyVisuals();
  renderSimSidebar();
  focusOnCurrentBlock();
}

function simGoto(nextId, choice, color) {
  if (!simState.active || !nextId) return;
  simState.history.push({ id: simState.currentId, choice: choice || '→', color: color || '#9ca3af' });
  simState.currentId = nextId;
  simApplyVisuals();
  renderSimSidebar();
  focusOnCurrentBlock();
}

function simApplyVisuals() {
  const visitedIds = new Set(simState.history.map(h => h.id));

  document.querySelectorAll('.cv-node').forEach(node => {
    const nid = node.dataset.id;
    node.classList.remove('sim-active', 'sim-visited', 'sim-dimmed', 'path-focus', 'path-upstream', 'path-downstream', 'path-dim');
    const oldBadge = node.querySelector('.sim-you-are-here');
    if (oldBadge) oldBadge.remove();

    if (nid === simState.currentId) {
      node.classList.add('sim-active');
      const badge = document.createElement('div');
      badge.className = 'sim-you-are-here';
      badge.textContent = '▶ ВЫ ЗДЕСЬ';
      node.appendChild(badge);
    } else if (visitedIds.has(nid)) {
      node.classList.add('sim-visited');
    } else {
      node.classList.add('sim-dimmed');
    }
  });

  // Edge highlighting: walked paths = green, others = faded
  document.querySelectorAll('.canvas-edges path[data-from]').forEach(path => {
    path.classList.remove('sim-walked', 'sim-faded');
    const from = path.dataset.from;
    const to = path.dataset.to;

    // Check if this edge was walked: history contains {id: from, choice} where choice leads to `to`
    const walked = simState.history.some((step, i) => {
      if (step.id !== from) return false;
      const nextHistory = simState.history[i + 1] || { id: simState.currentId };
      return nextHistory.id === to;
    });

    if (walked) {
      path.classList.add('sim-walked');
    } else {
      path.classList.add('sim-faded');
    }
  });

  // Update status bar
  const stepLabel = document.getElementById('sim-step-label');
  if (stepLabel) stepLabel.textContent = `Шаг ${simState.history.length + 1}`;

  const backBtn = document.getElementById('btn-sim-back');
  if (backBtn) backBtn.disabled = !simState.history.length;
}

function focusOnCurrentBlock() {
  const d = data();
  const b = d.blocks.find(x => x.id === simState.currentId);
  if (!b || typeof b.x !== 'number') return;

  const viewport = document.getElementById('canvas-viewport');
  if (!viewport) return;

  // Center the current block in viewport
  const vw = viewport.clientWidth;
  const vh = viewport.clientHeight;
  const NW = 190, NH = 64;

  // Block center in stage coordinates
  const bcx = b.x + NW / 2;
  const bcy = b.y + NH / 2;

  // Target pan: bcx * zoom + panX = vw/2
  canvasState.panX = vw / 2 - bcx * canvasState.zoom;
  canvasState.panY = vh / 2 - bcy * canvasState.zoom;
  applyCanvasTransform();
}

function renderSimSidebar() {
  const sidebar = document.getElementById('canvas-sidebar');
  if (!sidebar) return;

  const d = data();
  const b = d.blocks.find(x => x.id === simState.currentId);
  if (!b) { simStop(); return; }
  ensureBranches(b);

  const type = b.type || 'normal';
  const lang = simState.lang;
  const text = interpolate(b[lang] || '(пусто)', d.vars);

  // Build choices from branches
  const choices = (b.branches || [])
    .filter(br => br.next && d.blocks.find(x => x.id === br.next))
    .map(br => ({
      label: br.label || 'Далее',
      color: br.color || BRANCH_COLOR_DEFAULT,
      target: d.blocks.find(x => x.id === br.next),
      branchId: br.id || '',
    }));

  const isEnd = type === 'end' || !choices.length;

  // Breadcrumbs
  let historyHtml = '';
  if (simState.history.length) {
    historyHtml = `<div class="sim-history">
      <div class="sim-history-title">${csIcon('scroll',13)} История разговора</div>
      <div class="sim-history-list">
        ${simState.history.map((step) => {
          const hb = d.blocks.find(x => x.id === step.id);
          return `<div class="sim-history-item">
            <span>${esc(hb?.title || step.id)}</span>
            <span class="sim-history-step" style="color:${step.color || '#9ca3af'}">${esc(step.choice || '→')}</span>
          </div>`;
        }).join('')}
      </div>
    </div>`;
  }

  let choicesHtml = '';
  if (isEnd) {
    choicesHtml = `<div class="sim-end-card">
      <div class="sim-end-card-icon">${type === 'end' ? csIcon('flag',36) : csIcon('warn',36)}</div>
      <div class="sim-end-card-title">${type === 'end' ? 'Разговор завершён' : 'Тупик!'}</div>
      <div class="sim-end-card-sub">${type === 'end' ? 'Клиент получил ответ и разговор закончился.' : 'У этого блока нет исходящих веток. Добавьте ветку в редакторе, либо поставьте тип «Конец».'}</div>
    </div>`;
  } else {
    choicesHtml = `<div class="sim-choices-label">Что отвечает клиент?</div>
      ${choices.map(c => `
        <button class="sim-choice-dynamic" style="border-color:${c.color};" onclick="simGoto('${esc(c.target.id)}', '${esc(c.label)}', '${c.color}')">
          <span class="sim-choice-label-dyn" style="background:${c.color}20; color:${c.color};">${esc(c.label)}</span>
          <span class="sim-choice-target">${esc(c.target.title)}</span>
        </button>
      `).join('')}`;
  }

  sidebar.innerHTML = `
    <div class="sim-card">
      <div class="sim-card-header">
        <div class="sim-card-badge">${csIcon('film',12)} СИМУЛЯТОР</div>
        <div class="sim-card-title">${esc(b.title || b.id)}</div>
        <div class="sim-card-id">${esc(b.id)}</div>
      </div>
      <div class="sim-lang-tabs">
        <button class="sim-lang-tab ${lang === 'ru' ? 'active' : ''}" onclick="simSetLang('ru')">RU</button>
        <button class="sim-lang-tab ${lang === 'uz' ? 'active' : ''}" onclick="simSetLang('uz')">UZ</button>
      </div>
      <div class="sim-card-text">${esc(text)}</div>
      ${choicesHtml}
    </div>
    ${historyHtml}
  `;
}

function simSetLang(lang) {
  simState.lang = lang;
  renderSimSidebar();
}

// ── Sidebar editor ────────────────────────────────────────────
function renderCanvasSidebar(id) {
  const sidebar = document.getElementById('canvas-sidebar');
  if (!sidebar) return;
  // While the simulator is running, the sidebar belongs to it: every re-render
  // path (block click, deselect, cloud sync, Esc) must keep the sim panel.
  if (simState.active && simState.currentId) { renderSimSidebar(); return; }
  if (id) canvasState.selEdge = null;
  if (canvasState.selEdge) {
    const fromB = csFindBlock(canvasState.selEdge.from), toB = csFindBlock(canvasState.selEdge.to);
    const br = csGetBranch(canvasState.selEdge.from, canvasState.selEdge.to);
    const nWp = (br && br.waypoints) ? br.waypoints.length : 0;
    sidebar.innerHTML = `
      <div class="canvas-sidebar-empty" style="text-align:left;">
        <div style="font-weight:700;font-size:15px;margin-bottom:10px;color:var(--tx-primary);">Стрелка выбрана</div>
        <div style="font-size:13px;color:var(--tx-secondary);line-height:1.7;">
          ${esc((fromB && (fromB.title || (fromB.ru || fromB.uz || '').replace(/\n/g, ' ').slice(0, 22))) || '?')} → ${esc((toB && (toB.title || (toB.ru || toB.uz || '').replace(/\n/g, ' ').slice(0, 22))) || '?')}<br><br>
          Точек изгиба: <b>${nWp}</b><br><br>
          • Тяни <b style="color:#2563eb;">синие</b> точки — гнёшь стрелку.<br>
          • Тяни белую точку на линии — добавляешь изгиб.<br>
          • Двойной клик по синей точке — удалить.<br>
          • Esc — снять выделение.
        </div>
        <button class="btn btn-sm btn-ghost" style="margin-top:14px;" onclick="csStraightenEdge()">Выпрямить (убрать изгибы)</button>
      </div>`;
    return;
  }

  // Multi-select panel — when 2+ blocks selected
  if (canvasState.selectedIds.size > 1) {
    const count = canvasState.selectedIds.size;
    sidebar.innerHTML = `
      <div class="cs-multi-panel">
        <div class="cs-multi-head">
          <div class="cs-multi-count">✓ Выделено ${count} ${count === 1 ? 'блок' : count < 5 ? 'блока' : 'блоков'}</div>
          <button class="btn btn-sm btn-ghost" onclick="selectClear()" title="Esc">Снять</button>
        </div>

        <div class="cs-multi-section">
          <label class="field-label">Изменить ЦВЕТ всех</label>
          <div class="cs-color-row">
            <input type="color" id="bulk-color" class="cs-color-picker" value="#ffffff">
            <button class="btn btn-sm btn-primary" onclick="bulkSetColor()">Применить</button>
          </div>
        </div>

        <div class="cs-multi-section">
          <label class="field-label">Изменить ТИП всех</label>
          <div style="display: flex; gap: 6px;">
            <select id="bulk-type" class="input" style="flex: 1;">
              <option value="normal">Прямоугольник (normal)</option>
              <option value="start">Начало (start)</option>
              <option value="question">Вопрос (question)</option>
              <option value="decision">Решение / ромб</option>
              <option value="end">Конец (end)</option>
            </select>
            <button class="btn btn-sm btn-primary" onclick="bulkSetType()">Применить</button>
          </div>
        </div>

        <div class="cs-multi-section">
          <button class="btn btn-danger" style="width: 100%;" onclick="deleteSelectedBlocks()">
            ${csIcon('trash',13)} Удалить ${count} ${count === 1 ? 'блок' : 'блоков'}
            <span style="opacity: 0.7; margin-left: 6px; font-size: 11px;">(Delete)</span>
          </button>
        </div>

        <div class="cs-multi-tip">
          ${csIcon('spark',11)} Перетащите любой выделенный блок — все переместятся вместе.<br>
          Shift+клик — снять/добавить в выделение.<br>
          Ctrl+A — выделить все.<br>
          Esc — снять выделение.
        </div>
      </div>
    `;
    return;
  }

  if (!id) {
    sidebar.innerHTML = `
      <div class="canvas-sidebar-empty">
        <div style="display:flex;justify-content:center;margin-bottom:12px;color:var(--tx-tertiary);"><svg viewBox="0 0 24 24" width="40" height="40" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M9 11V6a3 3 0 0 1 6 0v5"/><path d="M21 11a4 4 0 0 0-4-4h-2v8H9"/><path d="M9 15v3a3 3 0 0 0 6 0v-3"/><circle cx="12" cy="22" r="0.5" fill="currentColor"/></svg></div>
        <div style="font-weight: 600; color: #374151; margin-bottom: 6px;">Выберите блок</div>
        <div style="font-size: 13px; color: #6b7280; line-height: 1.5;">Кликните по любому блоку. Зажмите и тяните по пустому месту, чтобы выделить рамкой несколько блоков. Shift+клик — добавить к выделению.<br><br>Двигать холст: два пальца по тачпаду / колёсико мыши, либо <b>пробел</b> + перетаскивание (или средняя кнопка мыши). Ctrl/⌘ + колёсико — зум.<br><br>Кликни по <b>стрелке</b> — появятся точки, которыми её можно гнуть вручную (как в Draw.io).</div>
      </div>`;
    return;
  }

  const d = data();
  const b = d.blocks.find(x => x.id === id);
  if (!b) return;
  ensureBranches(b);

  const type = b.type || 'normal';
  const allIds = d.blocks.map(x => x.id).filter(x => x !== b.id);
  const optionsFor = (selected) => `
    <option value="">— выбрать блок —</option>
    ${allIds.map(oid => {
      const blk = d.blocks.find(x => x.id === oid);
      return `<option value="${esc(oid)}" ${selected === oid ? 'selected' : ''}>${esc(oid)} — ${esc(blk?.title || '')}</option>`;
    }).join('')}
  `;

  const blockColor = b.color || '';
  const intentsList = collectIntents();

  // Build branches editor rows
  const branchesHtml = (b.branches || []).map((br, idx) => `
    <div class="cs-branch-row" data-br-idx="${idx}">
      <input type="color" class="cs-branch-color" value="${br.color || BRANCH_COLOR_DEFAULT}" title="Цвет ветки и стрелки">
      <input type="text" class="cs-branch-label" value="${esc(br.label || '')}" placeholder="лейбл (да / rus / ...)" title="Что показывать на стрелке и кнопке">
      <select class="cs-branch-next">${optionsFor(br.next)}</select>
      <button class="cs-branch-del" onclick="removeBranch('${esc(b.id)}', ${idx})" title="Удалить ветку">×</button>
    </div>
  `).join('');

  sidebar.innerHTML = `
    <div class="cs-header">
      <div class="type-dot dot-${type}"></div>
      <h3>${esc(b.title || b.id)}</h3>
      <span class="block-id">${esc(b.id)}</span>
    </div>

    <div class="cs-field">
      <label class="field-label">Название</label>
      <input class="input" id="cs-title" value="${esc(b.title || '')}">
    </div>

    <div class="cs-field">
      <label class="field-label">Intent <span style="color:#9ca3af; font-weight:400;">(подсказки из существующих)</span></label>
      <input class="input" id="cs-intent" list="cs-intent-list" value="${esc(b.intent || '')}" placeholder="например: q_willpay, whoIsIt">
      <datalist id="cs-intent-list">
        ${intentsList.map(i => `<option value="${esc(i)}"></option>`).join('')}
      </datalist>
    </div>

    <div class="cs-row-2">
      <div class="cs-field">
        <label class="field-label">Тип узла</label>
        <select class="input" id="cs-type">
          <option value="start" ${type==='start'?'selected':''}>Начало</option>
          <option value="normal" ${type==='normal'?'selected':''}>Ответ бота</option>
          <option value="question" ${type==='question'?'selected':''}>Вопрос клиента</option>
          <option value="decision" ${type==='decision'?'selected':''}>Решение / ромб</option>
          <option value="end" ${type==='end'?'selected':''}>Конец</option>
        </select>
      </div>
      <div class="cs-field">
        <label class="field-label">Цвет блока</label>
        <div class="cs-color-row">
          <input type="color" class="cs-color-picker" id="cs-color" value="${blockColor || '#ffffff'}" title="Выбрать цвет" onchange="liveApplyBlockColor('${esc(id)}', this.value)">
          <button class="cs-color-reset" onclick="document.getElementById('cs-color').value='#ffffff'; liveApplyBlockColor('${esc(id)}', '#ffffff');" title="Сбросить (белый)">⟲</button>
        </div>
      </div>
    </div>

    <div class="cs-connections">
      <div class="cs-section-title">
        Ветки (связи со следующими блоками)
        <button class="cs-add-branch" onclick="addBranch('${esc(b.id)}')" title="Добавить новую ветку">+ ветка</button>
      </div>
      <div id="cs-branches-list">
        ${branchesHtml || '<div class="cs-branches-empty">Нет веток. Нажмите «+ ветка», чтобы добавить первую связь.</div>'}
      </div>
    </div>

    <div class="cs-field">
      <label class="field-label">Русский</label>
      <textarea class="textarea" id="cs-ru">${esc(b.ru || '')}</textarea>
    </div>

    <div class="cs-field">
      <label class="field-label">O'zbek</label>
      <textarea class="textarea" id="cs-uz">${esc(b.uz || '')}</textarea>
    </div>

    <div class="ai-block-group">
      <div class="ai-block-title">
        <span>${csIcon('robot',13)} AI-помощник</span>
        <span class="ai-status-badge" onclick="openLLMSettings()" title="Настроить API ключ">${csIcon('gear',12)}</span>
      </div>
      <div class="ai-buttons-grid">
        ${renderStyleButtons(b.id, 'improveBlockText')}
        <button class="ai-btn ai-btn-special" onclick="generateObjectionResponses('${esc(b.id)}')" style="grid-column: 1 / -1;">${csIcon('chat',12)} Ответы на возражение</button>
      </div>
    </div>

    <div class="cs-field">
      <label class="field-label">Переменные (справка)</label>
      <div style="font-size: 11px; color: #6b7280; line-height: 1.7;">${Object.keys(d.vars).map(v => `<span class="var-chip">{${v}}</span>`).join(' ')}</div>
    </div>

    <div class="cs-actions">
      <button class="btn btn-sm btn-danger" onclick="canvasDeleteBlock('${esc(b.id)}')">${csIcon('trash',12)} Удалить</button>
      <button class="btn btn-sm" onclick="canvasAddNextBlock('${esc(b.id)}')">+ Следующий</button>
      <button class="btn btn-sm btn-primary" onclick="canvasSaveBlock('${esc(b.id)}')">${csIcon('save',12)} Сохранить</button>
    </div>
  `;
}

// ── Branch CRUD helpers (live edit, not waiting for Save) ─────
function readBranchesFromDOM(blockId) {
  const b = data().blocks.find(x => x.id === blockId);
  if (!b) return [];
  const rows = document.querySelectorAll('.cs-branch-row');
  const branches = [];
  rows.forEach(row => {
    const color = row.querySelector('.cs-branch-color')?.value || BRANCH_COLOR_DEFAULT;
    const label = row.querySelector('.cs-branch-label')?.value || '';
    const next = row.querySelector('.cs-branch-next')?.value || '';
    branches.push({ id: branchId(), label, color, next });
  });
  return branches;
}

function addBranch(blockId) {
  const b = data().blocks.find(x => x.id === blockId);
  if (!b) return;
  snapshot('Добавление ветки');
  // Capture current DOM state first so we don't lose unsaved edits
  b.branches = readBranchesFromDOM(blockId);
  b.branches.push({ id: branchId(), label: '', color: BRANCH_COLOR_DEFAULT, next: '' });
  renderCanvasSidebar(blockId);
  canvasRender();
}

function resetAllBranchColors() {
  const d = data();
  let total = 0;
  d.blocks.forEach(b => {
    ensureBranches(b);
    (b.branches || []).forEach(br => {
      if ((br.color || '').toLowerCase() !== BRANCH_COLOR_DEFAULT) total++;
    });
  });
  if (!total) { toast('Все ветки уже серые', 'info'); return; }
  if (!confirm(`Сделать ${total} ${total === 1 ? 'ветку серой' : 'веток серыми'}? Это затронет все блоки текущего профиля.`)) return;
  snapshot('Сброс цветов веток');
  d.blocks.forEach(b => {
    (b.branches || []).forEach(br => { br.color = BRANCH_COLOR_DEFAULT; });
  });
  canvasRender();
  if (canvasState.selectedId) renderCanvasSidebar(canvasState.selectedId);
  toast(`✓ Все ветки теперь серые (${total})`);
}

// ─── Move edge labels into target block titles (always) ─────────────
// If multiple incoming edges with different labels: joins them with /
function applyEdgeLabelsAsTitles() {
  const d = data();
  if (!d || !d.blocks.length) { toast('Нет блоков', 'error'); return; }

  // For each target block, collect ALL incoming non-empty labels
  const incomingLabels = new Map();
  d.blocks.forEach(src => {
    ensureBranches(src);
    (src.branches || []).forEach(br => {
      if (!br.next) return;
      const lbl = (br.label || '').trim();
      if (!lbl) return;
      if (!incomingLabels.has(br.next)) incomingLabels.set(br.next, []);
      incomingLabels.get(br.next).push(lbl);
    });
  });

  // Determine new titles
  const candidates = [];
  d.blocks.forEach(b => {
    const labels = incomingLabels.get(b.id) || [];
    if (!labels.length) return;
    const unique = [...new Set(labels)];
    let newTitle;
    if (unique.length === 1) {
      newTitle = unique[0];
    } else {
      // Pick shortest unique label as title (more concise, typical question form)
      const sorted = [...unique].sort((a, b) => a.length - b.length);
      newTitle = sorted[0];
    }
    newTitle = newTitle.replace(/\s+/g, ' ').trim();
    if (newTitle.length > 50) newTitle = newTitle.substring(0, 47) + '…';
    if (!newTitle) return;
    candidates.push({ block: b, newTitle });
  });

  if (!candidates.length) {
    toast('Нет блоков с лейблами на входящих стрелках для переименования', 'info');
    return;
  }

  if (!confirm(`Переименовать ${candidates.length} ${candidates.length === 1 ? 'блок' : 'блоков'} по лейблам входящих стрелок?\n\nЕсли у блока несколько разных лейблов — они объединяются через «/».\n\nИзменится только название. Тексты RU/UZ и intent не трогаются.\n\nОтмена — через Ctrl+Z.`)) return;

  snapshot('Перенос лейблов в названия');

  candidates.forEach(({ block, newTitle }) => {
    block.title = newTitle;
  });

  canvasRender();
  if (canvasState.selectedId) renderCanvasSidebar(canvasState.selectedId);
  renderStats();
  toast(`✓ Переименовано ${candidates.length} ${candidates.length === 1 ? 'блок' : 'блоков'} (Ctrl+Z для отмены)`);
}

function removeBranch(blockId, idx) {
  const b = data().blocks.find(x => x.id === blockId);
  if (!b) return;
  snapshot('Удаление ветки');
  // Capture current DOM state first
  b.branches = readBranchesFromDOM(blockId);
  b.branches.splice(idx, 1);
  renderCanvasSidebar(blockId);
  canvasRender();
}


function canvasSaveBlock(id) {
  const b = data().blocks.find(x => x.id === id);
  if (!b) return;
  snapshot('Редактирование блока');
  const v = (k) => document.getElementById('cs-' + k)?.value;
  if (v('title') !== undefined) b.title = v('title');
  if (v('intent') !== undefined) b.intent = v('intent');
  if (v('type') !== undefined) b.type = v('type');
  if (v('ru') !== undefined) b.ru = v('ru');
  if (v('uz') !== undefined) b.uz = v('uz');
  // Color: '#ffffff' or empty = no override
  const color = v('color');
  b.color = (color && color.toLowerCase() !== '#ffffff') ? color : '';
  // Read branches from DOM
  b.branches = readBranchesFromDOM(id);
  syncLegacyNext(b);  // keep legacy fields for export/import
  canvasRender();
  renderCanvasSidebar(id);
  renderStats();
  toast(`Блок «${b.title}» сохранён`);
}

function liveApplyBlockColor(id, color) {
  const b = data().blocks.find(x => x.id === id);
  if (!b) return;
  b.color = (color && color.toLowerCase() !== '#ffffff') ? color : '';
  canvasRender();
  saveToStorage();
}

function canvasDeleteBlock(id) {
  if (!confirm('Удалить блок?')) return;
  snapshot('Удаление блока');
  const d = data();
  d.blocks = d.blocks.filter(b => b.id !== id);
  d.blocks.forEach(b => {
    ensureBranches(b);
    b.branches = (b.branches || []).filter(br => br.next !== id);
    if (b.next_default === id) b.next_default = '';
    if (b.next_yes === id) b.next_yes = '';
    if (b.next_no === id) b.next_no = '';
  });
  canvasState.selectedId = null;
  canvasRender();
  renderCanvasSidebar(null);
  renderStats();
  toast('Блок удалён');
}

function canvasAddNextBlock(afterId) {
  const d = data();
  const after = d.blocks.find(b => b.id === afterId);
  if (!after) return;
  snapshot('Добавление блока');
  ensureBranches(after);
  const newId = uid('b');
  const newBlock = {
    id: newId,
    sec: after.sec,
    title: 'Новый блок',
    intent: '',
    type: 'normal',
    ru: '',
    uz: '',
    branches: [],
    next_default: '', next_yes: '', next_no: '',
    x: (after.x || 100) + 60,
    y: (after.y || 100) + 140
  };
  d.blocks.push(newBlock);
  // Link via a new branch
  after.branches.push({ id: branchId(), label: '→', color: BRANCH_COLOR_DEFAULT, next: newId });
  syncLegacyNext(after);
  canvasState.selectedId = newId;
  canvasRender();
  renderCanvasSidebar(newId);
  renderStats();
  toast('Новый блок добавлен и связан');
}

// Initialize canvas handlers after DOM is ready
setTimeout(initCanvasHandlers, 100);

// ── Box-select visual + keyboard shortcuts ────────────────────
function drawBoxSelect() {
  const bs = canvasState.boxSelect;
  if (!bs) return;
  const stage = document.getElementById('canvas-stage');
  if (!stage) return;
  let box = document.getElementById('canvas-box-select');
  if (!box) {
    box = document.createElement('div');
    box.id = 'canvas-box-select';
    box.className = 'canvas-box-select';
    stage.appendChild(box);
  }
  const x = Math.min(bs.startX, bs.currentX);
  const y = Math.min(bs.startY, bs.currentY);
  const w = Math.abs(bs.currentX - bs.startX);
  const h = Math.abs(bs.currentY - bs.startY);
  box.style.left = x + 'px';
  box.style.top = y + 'px';
  box.style.width = w + 'px';
  box.style.height = h + 'px';
}

function removeBoxSelectVisual() {
  const box = document.getElementById('canvas-box-select');
  if (box) box.remove();
}

// Keyboard shortcuts on canvas (Ctrl+A, Delete, Esc)
document.addEventListener('keydown', (e) => {
  // Only when canvas tab is active
  const canvasTab = document.getElementById('tab-canvas');
  if (!canvasTab || canvasTab.style.display === 'none') return;
  // Don't interfere if user is typing in an input/textarea
  const tag = (e.target.tagName || '').toLowerCase();
  if (tag === 'input' || tag === 'textarea' || tag === 'select' || e.target.isContentEditable) return;

  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'a') {
    e.preventDefault();
    selectAll();
    return;
  }
  // Copy selected blocks
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'c' && canvasState.selectedIds.size > 0) {
    e.preventDefault();
    copySelectedBlocks();
    return;
  }
  // Paste copied blocks
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'v' && canvasClipboard.length) {
    e.preventDefault();
    pasteBlocks();
    return;
  }
  // Duplicate selected (Ctrl+D)
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'd' && canvasState.selectedIds.size > 0) {
    e.preventDefault();
    copySelectedBlocks();
    pasteBlocks();
    return;
  }
  if (e.key === 'Escape') {
    if (canvasState.selEdge) { canvasState.selEdge = null; canvasRender(); renderCanvasSidebar(null); e.preventDefault(); return; }
    if (canvasState.selectedIds.size > 0) {
      selectClear();
      e.preventDefault();
    }
    return;
  }
  if ((e.key === 'Delete' || e.key === 'Backspace') && canvasState.selectedIds.size > 0) {
    e.preventDefault();
    deleteSelectedBlocks();
  }
});

// ── Copy / Paste blocks ───────────────────────────────────────
let canvasClipboard = [];

function copySelectedBlocks() {
  const ids = [...canvasState.selectedIds];
  if (!ids.length) return;
  const d = data();
  canvasClipboard = ids.map(id => {
    const b = d.blocks.find(x => x.id === id);
    return b ? JSON.parse(JSON.stringify(b)) : null;
  }).filter(Boolean);
  toast(`Скопировано ${canvasClipboard.length} ${canvasClipboard.length === 1 ? 'блок' : 'блоков'} (Ctrl+V — вставить)`);
}

function pasteBlocks() {
  if (!canvasClipboard.length) return;
  const d = data();
  snapshot('Вставка блоков');

  // Build id remap so internal branches between copied blocks stay connected
  const idMap = {};
  canvasClipboard.forEach(b => {
    let newId = b.id + '_copy';
    let n = 1;
    while (d.blocks.some(x => x.id === newId) || idMap[b.id] === newId) {
      n++; newId = b.id + '_copy' + n;
    }
    idMap[b.id] = newId;
  });

  const offset = 40;
  const newBlocks = canvasClipboard.map(b => {
    const nb = JSON.parse(JSON.stringify(b));
    nb.id = idMap[b.id];
    nb.x = (typeof b.x === 'number' ? b.x : 100) + offset;
    nb.y = (typeof b.y === 'number' ? b.y : 100) + offset;
    // Remap branches that point to other copied blocks; keep external as-is
    (nb.branches || []).forEach(br => {
      if (idMap[br.next]) br.next = idMap[br.next];
      br.id = branchId();
    });
    if (idMap[nb.next_default]) nb.next_default = idMap[nb.next_default];
    if (idMap[nb.next_yes]) nb.next_yes = idMap[nb.next_yes];
    if (idMap[nb.next_no]) nb.next_no = idMap[nb.next_no];
    return nb;
  });

  d.blocks.push(...newBlocks);
  // Select the pasted blocks
  canvasState.selectedIds = new Set(newBlocks.map(b => b.id));
  canvasState.selectedId = newBlocks[0].id;
  canvasRender();
  renderCanvasSidebar(newBlocks.length === 1 ? newBlocks[0].id : null);
  renderStats();
  saveToStorage();
  toast(`✓ Вставлено ${newBlocks.length} ${newBlocks.length === 1 ? 'блок' : 'блоков'}`);
}

// ── Multi-select bulk actions ─────────────────────────────────
function deleteSelectedBlocks() {
  const ids = [...canvasState.selectedIds];
  if (!ids.length) return;
  if (!confirm(`Удалить ${ids.length} ${ids.length === 1 ? 'блок' : 'блоков'}? Их ветки тоже исчезнут.`)) return;
  snapshot(`Удаление ${ids.length} блоков`);
  const d = data();
  const idSet = new Set(ids);
  d.blocks = d.blocks.filter(b => !idSet.has(b.id));
  // Remove branches pointing to deleted blocks
  d.blocks.forEach(b => {
    ensureBranches(b);
    b.branches = (b.branches || []).filter(br => !idSet.has(br.next));
    if (idSet.has(b.next_default)) b.next_default = '';
    if (idSet.has(b.next_yes)) b.next_yes = '';
    if (idSet.has(b.next_no)) b.next_no = '';
  });
  canvasState.selectedIds.clear();
  canvasState.selectedId = null;
  canvasRender();
  renderCanvasSidebar(null);
  renderStats();
  toast(`✓ Удалено ${ids.length} ${ids.length === 1 ? 'блок' : 'блоков'}`);
}

function applyToSelected(updaterFn, label) {
  const ids = [...canvasState.selectedIds];
  if (!ids.length) return;
  snapshot(label || `Изменение ${ids.length} блоков`);
  const d = data();
  ids.forEach(id => {
    const b = d.blocks.find(x => x.id === id);
    if (b) updaterFn(b);
  });
  canvasRender();
  toast(`✓ ${label} (${ids.length})`);
}

function bulkSetColor() {
  const color = document.getElementById('bulk-color')?.value;
  if (!color) return;
  const apply = color.toLowerCase() === '#ffffff' ? '' : color;
  applyToSelected(b => { b.color = apply; }, apply ? 'Цвет' : 'Сброс цвета');
}

function bulkSetType() {
  const type = document.getElementById('bulk-type')?.value;
  if (!type) return;
  applyToSelected(b => { b.type = type; }, 'Тип: ' + type);
}

// ═══════════════════════════════════════════════════════════════
// AUTOSAVE to localStorage
// ═══════════════════════════════════════════════════════════════
const STORAGE_KEY = 'cybernet_script_builder_v1';
const autosave = {
  timer: null,
  lastSaveAt: null,
  enabled: true,
  dirty: false
};

// ═══════════════════════════════════════════════════════════════
// LOCAL VERSION HISTORY — rolling backups that SURVIVE page refresh
// (the in-memory undo stack does not; this does)
// ═══════════════════════════════════════════════════════════════
const HISTORY_STORE_KEY = 'cybernet_sb_history_v1';
const HISTORY_KEEP = 8;
const HISTORY_MIN_GAP_MS = 45000;
let _lastHistoryPush = 0;

function pushVersionBackup(reason) {
  try {
    const now = Date.now();
    if (now - _lastHistoryPush < HISTORY_MIN_GAP_MS) return;
    if (!Object.keys(profiles).length) return;
    const cleaned = {};
    Object.entries(profiles).forEach(([name, p]) => { const { _migrated, ...rest } = p; cleaned[name] = rest; });
    let arr = [];
    try { arr = JSON.parse(localStorage.getItem(HISTORY_STORE_KEY) || '[]'); } catch { arr = []; }
    // skip if identical to the newest backup (no real change)
    const last = arr[arr.length - 1];
    const sig = JSON.stringify(cleaned);
    if (last && JSON.stringify(last.profiles) === sig) { _lastHistoryPush = now; return; }
    arr.push({ ts: now, reason: reason || '', activeProfile, profiles: cleaned });
    while (arr.length > HISTORY_KEEP) arr.shift();
    let saved = false;
    while (!saved && arr.length) {
      try { localStorage.setItem(HISTORY_STORE_KEY, JSON.stringify(arr)); saved = true; }
      catch (e) { arr.shift(); } // quota -> drop oldest, retry
    }
    _lastHistoryPush = now;
  } catch (e) { /* backups are best-effort */ }
}

function getVersionBackups() {
  try { return JSON.parse(localStorage.getItem(HISTORY_STORE_KEY) || '[]'); } catch { return []; }
}

function restoreVersionBackup(ts) {
  const snap = getVersionBackups().find(s => s.ts === ts);
  if (!snap) { toast('Версия не найдена', 'error'); return; }
  if (!confirm('Восстановить эту версию? Текущее состояние будет заменено (его можно вернуть через Ctrl+Z).')) return;
  snapshot('Восстановление версии');
  Object.keys(profiles).forEach(k => delete profiles[k]);
  Object.entries(snap.profiles).forEach(([k, v]) => { profiles[k] = v; });
  activeProfile = profiles[snap.activeProfile] ? snap.activeProfile : Object.keys(profiles)[0];
  if (typeof renderProfiles === 'function') renderProfiles();
  if (typeof renderBlocks === 'function') renderBlocks();
  if (typeof renderVars === 'function') renderVars();
  if (typeof renderStats === 'function') renderStats();
  if (typeof canvasRender === 'function') canvasRender();
  saveToStorage();
  closeVersionHistory();
  toast('✓ Версия восстановлена');
}

function closeVersionHistory() {
  const m = document.getElementById('version-history-modal');
  if (m) m.remove();
}

function openVersionHistory() {
  closeVersionHistory();
  const arr = getVersionBackups().slice().reverse();
  const fmt = (ts) => {
    const d = new Date(ts);
    const mins = Math.round((Date.now() - ts) / 60000);
    const ago = mins < 1 ? 'только что' : mins < 60 ? mins + ' мин назад' : Math.round(mins / 60) + ' ч назад';
    return d.toLocaleString('ru-RU') + ' · ' + ago;
  };
  const rows = arr.length ? arr.map(s => {
    const nBlocks = ((s.profiles[s.activeProfile] || {}).blocks || []).length;
    return '<div style="display:flex;align-items:center;justify-content:space-between;gap:12px;padding:10px 12px;border:1px solid var(--bd-default);border-radius:8px;margin-bottom:8px;">'
      + '<div><div style="font-weight:600;font-size:13px;">' + fmt(s.ts) + '</div>'
      + '<div style="font-size:12px;color:var(--tx-tertiary);">Профиль: ' + esc(s.activeProfile || '—') + ' · блоков: ' + nBlocks + (s.reason ? ' · ' + esc(s.reason) : '') + '</div></div>'
      + '<button class="btn btn-sm btn-primary" onclick="restoreVersionBackup(' + s.ts + ')">Восстановить</button>'
      + '</div>';
  }).join('') : '<div style="color:var(--tx-tertiary);padding:20px;text-align:center;">Пока нет сохранённых версий. Они копятся автоматически по мере работы.</div>';
  const modal = document.createElement('div');
  modal.id = 'version-history-modal';
  modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;z-index:10000;';
  modal.innerHTML = '<div style="background:var(--bg-surface);color:var(--tx-primary);border-radius:12px;max-width:560px;width:92%;max-height:80vh;overflow:auto;padding:20px;box-shadow:0 20px 60px rgba(0,0,0,0.4);">'
    + '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;"><div style="font-weight:700;font-size:16px;">История версий</div>'
    + '<button class="btn btn-sm btn-ghost" onclick="closeVersionHistory()">✕</button></div>'
    + '<div style="font-size:12px;color:var(--tx-tertiary);margin-bottom:14px;">Автоматические резервные копии в этом браузере, переживают обновление страницы. Выбери версию и нажми «Восстановить» (текущее можно вернуть через Ctrl+Z). Для надёжного бэкапа используй «Скачать → JSON».</div>'
    + rows + '</div>';
  modal.addEventListener('click', (e) => { if (e.target === modal) closeVersionHistory(); });
  document.body.appendChild(modal);
}

function saveToStorage() {
  if (!autosave.enabled) return;
  try {
    // Strip transient fields before saving
    const cleaned = {};
    Object.entries(profiles).forEach(([name, p]) => {
      const { _migrated, ...rest } = p;
      cleaned[name] = rest;
    });
    const payload = {
      version: 1,
      savedAt: Date.now(),
      activeProfile,
      profiles: cleaned
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    autosave.lastSaveAt = Date.now();
    autosave.dirty = false;
    updateAutosaveIndicator('saved');
    pushVersionBackup('автосохранение');
    // Also sync to cloud (debounced, only if logged in)
    scheduleCloudSync();
  } catch (err) {
    // Likely QuotaExceededError
    console.error('Autosave failed:', err);
    updateAutosaveIndicator('error');
    // Show toast only once every 30s to avoid spam
    if (!autosave._errorToastShown || Date.now() - autosave._errorToastShown > 30000) {
      autosave._errorToastShown = Date.now();
      toast('Ошибка автосохранения: возможно, превышен лимит localStorage. Экспортируйте JSON вручную.', 'error');
    }
  }
}

function scheduleAutosave(label) {
  autosave.dirty = true;
  updateAutosaveIndicator('dirty');
  clearTimeout(autosave.timer);
  autosave.timer = setTimeout(saveToStorage, 800);
}

function loadFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return false;
    const payload = JSON.parse(raw);
    if (!payload || !payload.profiles || typeof payload.profiles !== 'object') return false;
    if (!Object.keys(payload.profiles).length) return false;

    profiles = payload.profiles;
    // Migrate on load
    Object.values(profiles).forEach(p => {
      delete p._migrated;
      ensureProfileBranches(p);
    });
    // CRITICAL: profiles with manual coords (e.g. imported Drawio) must NOT be re-auto-layouted
    // Mark them as already laid out so canvasRender doesn't overwrite x/y
    Object.entries(profiles).forEach(([name, p]) => {
      if (!p.blocks) return;
      const withCoords = p.blocks.filter(b => typeof b.x === 'number' && typeof b.y === 'number');
      if (withCoords.length >= p.blocks.length * 0.5) {
        canvasState.autoLaidOut.add(name);
      }
    });
    if (payload.activeProfile && profiles[payload.activeProfile]) {
      activeProfile = payload.activeProfile;
    } else {
      activeProfile = Object.keys(profiles)[0];
    }
    autosave.lastSaveAt = payload.savedAt || Date.now();
    return true;
  } catch (err) {
    console.error('Load from storage failed:', err);
    return false;
  }
}

function clearStorage() {
  if (!confirm('Очистить автосохранение? Все ваши профили в браузере будут удалены. Рекомендуем сначала экспортировать JSON.')) return;
  try {
    localStorage.removeItem(STORAGE_KEY);
    toast('✓ Автосохранение очищено. Перезагрузите страницу.', 'info');
  } catch (err) {
    toast('Ошибка очистки: ' + err.message, 'error');
  }
}

// ═══════════════════════════════════════════════════════════════
// CLOUD SYNC (Supabase) — поверх localStorage
// ═══════════════════════════════════════════════════════════════
let cloudSyncState = { syncing: false, lastSync: 0, timer: null };

// Загрузить профили из облака в локальную структуру
async function cloudPullProfiles() {
  if (typeof cloudLoadProfiles !== 'function') return false;
  const rows = await cloudLoadProfiles();
  if (!rows) return false; // облако недоступно
  if (!rows.length) return false; // нет облачных данных — оставляем локальные

  const myId = getCurrentUserId();
  const newProfiles = {};
  rows.forEach(row => {
    const p = row.data || {};
    p._cloudId = row.id;
    p._isShared = row.is_shared;
    p._ownerId = row.owner_id;
    p._readOnly = (row.owner_id !== myId); // чужой общий профиль — только чтение
    // Уникальное имя (у общего профиля коллеги может совпасть имя)
    let displayName = row.name;
    if (p._readOnly) displayName = row.name + ' (общий)';
    if (newProfiles[displayName]) displayName = displayName + ' #' + row.id.slice(0, 4);
    newProfiles[displayName] = p;
  });

  profiles = newProfiles;
  Object.values(profiles).forEach(p => { delete p._migrated; ensureProfileBranches(p); });
  Object.entries(profiles).forEach(([name, p]) => {
    if (!p.blocks) return;
    const withCoords = p.blocks.filter(b => typeof b.x === 'number' && typeof b.y === 'number');
    if (withCoords.length >= p.blocks.length * 0.5) canvasState.autoLaidOut.add(name);
  });
  activeProfile = Object.keys(profiles)[0];
  return true;
}

// Выгрузить текущие профили в облако (только свои, не read-only)
async function cloudPushProfiles() {
  if (typeof cloudSaveProfile !== 'function' || !getCurrentUserId()) return;
  if (cloudSyncState.syncing) return;
  cloudSyncState.syncing = true;
  try {
    for (const [name, p] of Object.entries(profiles)) {
      if (p._readOnly) continue; // чужой профиль не трогаем
      const { _cloudId, _isShared, _ownerId, _readOnly, _migrated, ...cleanData } = p;
      const cleanName = name.replace(/ \(общий\)$/, '').replace(/ #[0-9a-f]{4}$/, '');
      const saved = await cloudSaveProfile(cleanName, cleanData, _isShared || false, _cloudId);
      if (saved && saved.id && !p._cloudId) {
        p._cloudId = saved.id; // запомнить id для будущих upsert
      }
    }
    cloudSyncState.lastSync = Date.now();
  } finally {
    cloudSyncState.syncing = false;
  }
}

// Debounced sync to cloud
function scheduleCloudSync() {
  if (!getCurrentUserId()) return; // не залогинен — только локально
  clearTimeout(cloudSyncState.timer);
  cloudSyncState.timer = setTimeout(() => { cloudPushProfiles(); }, 1500);
}


function updateAutosaveIndicator(status) {
  const el = document.getElementById('autosave-indicator');
  if (!el) return;
  el.classList.remove('status-saved', 'status-dirty', 'status-error');
  if (status === 'saved') {
    const t = autosave.lastSaveAt ? new Date(autosave.lastSaveAt) : new Date();
    const hh = String(t.getHours()).padStart(2, '0');
    const mm = String(t.getMinutes()).padStart(2, '0');
    const ss = String(t.getSeconds()).padStart(2, '0');
    el.innerHTML = `<span class="ai-icon"><svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg></span> Сохранено <span class="ai-time">${hh}:${mm}:${ss}</span>`;
    el.classList.add('status-saved');
  } else if (status === 'dirty') {
    el.innerHTML = `<span class="ai-icon"><svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4z"/></svg></span> Изменения…`;
    el.classList.add('status-dirty');
  } else if (status === 'error') {
    el.innerHTML = `<span class="ai-icon"><svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg></span> Ошибка сохранения`;
    el.classList.add('status-error');
  } else if (status === 'off') {
    el.innerHTML = `<span class="ai-icon"><svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg></span> Автосохранение выкл.`;
    el.classList.add('status-error');
  }
}

// ─── Wrap snapshot() to also trigger autosave ───
const __origSnapshot = snapshot;
snapshot = function(label) {
  __origSnapshot(label);
  scheduleAutosave(label);
};

// ─── Warn on page unload if there are unsaved changes ───
window.addEventListener('beforeunload', (e) => {
  if (autosave.dirty) {
    // Try to force-save synchronously before leaving
    clearTimeout(autosave.timer);
    saveToStorage();
  }
});

// ═══════════════════════════════════════════════════════════════
// LLM (Gemini API) — helpers for all AI features
// ═══════════════════════════════════════════════════════════════
const LLM_SETTINGS_KEY = 'cybernet_llm_settings_v1';
const REFERENCES_KEY = 'cybernet_ai_references_v1';
const PROMPTS_KEY = 'cybernet_ai_prompts_v1';

// ─── Reference scripts (few-shot examples) ──────────────────
// Stored as: [{ id, name, niche, goal, tone, notes, profile, active }]
let aiReferences = [];

function loadReferences() {
  try {
    const raw = localStorage.getItem(REFERENCES_KEY);
    if (raw) aiReferences = JSON.parse(raw) || [];
  } catch (err) { console.error('References load failed:', err); }
}

function saveReferences() {
  try {
    localStorage.setItem(REFERENCES_KEY, JSON.stringify(aiReferences));
  } catch (err) {
    toast('Не удалось сохранить эталоны: ' + err.message, 'error');
  }
  // Sync to cloud (debounced)
  scheduleReferencesCloudSync();
}

let _refSyncTimer = null;
function scheduleReferencesCloudSync() {
  if (!getCurrentUserId()) return;
  clearTimeout(_refSyncTimer);
  _refSyncTimer = setTimeout(cloudPushReferences, 1500);
}

async function cloudPushReferences() {
  if (typeof cloudSaveReference !== 'function' || !getCurrentUserId()) return;
  for (const ref of aiReferences) {
    if (ref._readOnly) continue;
    const saved = await cloudSaveReference(ref, ref._isShared || false, ref._cloudId);
    if (saved && saved.id && !ref._cloudId) ref._cloudId = saved.id;
  }
}

async function cloudPullReferences() {
  if (typeof cloudLoadReferences !== 'function') return false;
  const rows = await cloudLoadReferences();
  if (!rows || !rows.length) return false;
  const myId = getCurrentUserId();
  aiReferences = rows.map(row => ({
    id: row.id,
    _cloudId: row.id,
    _isShared: row.is_shared,
    _readOnly: row.owner_id !== myId,
    name: row.name,
    scriptType: row.script_type,
    niche: row.niche,
    goal: row.goal,
    tone: row.tone,
    tags: row.tags || [],
    notes: row.notes,
    profile: row.profile_data,       // code uses r.profile everywhere
    profileData: row.profile_data,   // keep for cloud push
    active: row.is_active !== false, // generation filters by r.active
    isActive: row.is_active
  }));
  return true;
}

// ─── Editable prompts (user can override defaults) ───────────
const DEFAULT_PROMPTS = {
  generate_system: `Ты эксперт по написанию скриптов для колл-центра с AI-агентом (voice bot). Работаешь для банков Узбекистана. Создаёшь скрипты на русском и узбекском (латиница).

ВАЖНО про формат:
- Каждый блок имеет id (латиница+цифры+_, уникальный), title (короткое название), intent (для распознавания), type ("start"|"normal"|"question"|"decision"|"end"), ru (текст), uz (текст), branches (ветки к следующим блокам).
- Branches: массив объектов { label, next }. Label короткий (1-3 слова). Next — id следующего блока.
- Обязательно есть один блок type:"start" и минимум один type:"end".
- Используй переменные ТОЛЬКО в ФИГУРНЫХ скобках: {BANK_NAME}, {PHONE}, {AGENT_NAME}, {AMOUNT}, {DAY}, {MONTH} где это уместно. НИКОГДА не используй квадратные скобки [AMOUNT] — только фигурные {AMOUNT}.
- Для сложных сценариев используй счётчики: если клиент повторяет одно и то же — нужны блоки intent_2, intent_3 со всё более жёсткими формулировками.

🔴 КРИТИЧЕСКИ ВАЖНО про УЗБЕКСКИЙ ЯЗЫК (uz):
- Узбекский текст должен быть ЕСТЕСТВЕННЫМ, грамотным, на латинице (o', g', sh, ch).
- ТОЛЬКО ЛАТИНИЦА. Кириллица для узбекского ЗАПРЕЩЕНА полностью — ни одного кириллического символа в поле uz, даже если он "случайно проскочил" при генерации. Если сомневаешься — перепроверь каждое слово на скрипт перед тем как вернуть JSON.
- НЕ переводи дословно с русского — пиши так, как реально говорит узбекоязычный оператор.
- Используй правильную банковскую терминологию: "limit", "kredit", "ilova" (приложение), "to'lov" (платёж), "muddat" (срок), "foiz" (процент), "qarz" (долг), "shartnoma" (договор).
- Узбекский текст по смыслу = русскому, но звучит натурально для носителя.
- Если дан ЭТАЛОН с узбекскими текстами — изучи их стиль, терминологию и манеру, и пиши в ТОЧНО ТАКОМ ЖЕ стиле. Эталонные uz-тексты — это образец качества, на который надо равняться.
- Каждый блок ОБЯЗАТЕЛЬНО имеет непустой uz текст. Пустой uz недопустим.

🔴 ДЛИНА РЕПЛИК: это устная речь по телефону, а не текст для чтения. Каждая реплика (и ru, и uz) — максимум 25-30 слов. Если мысль не влезает — раздели на два блока, а не пиши одну длинную стену текста.

Возвращай строго валидный JSON формата:
{
  "name": "название скрипта",
  "vars": { "BANK_NAME": "значение по умолчанию", ... },
  "sections": [{ "id": "s1", "label": "раздел" }],
  "blocks": [
    { "id": "start", "sec": "s1", "title": "Старт", "intent": "start", "type": "start", "ru": "...", "uz": "...", "branches": [{ "label": "", "next": "greeting" }] }
  ]
}

Отвечай ТОЛЬКО самим JSON-объектом — без markdown-обёртки из тройных обратных кавычек, без пояснений до или после.`,
  generate_user: `Создай скрипт для колл-центра.

НИША/СФЕРА: {niche}
ЦЕЛЬ: {goal}
КАНАЛ: {channel}
ТОН ОБЩЕНИЯ: {tone}
РАЗМЕР: примерно {blockCount} блоков
ДОПОЛНИТЕЛЬНЫЕ ТРЕБОВАНИЯ: {extras}

Создай скрипт следующей структуры:
1. Приветствие и идентификация клиента
2. Основной вопрос по цели ({goal})
3. Обработка типичных возражений (минимум 3-4 разных)
4. Обработка вопросов клиента ("кто вы", "какая сумма", "как оплатить", "я не знаю", "вы робот" и т.п.)
5. Особые случаи (родственник взял трубку, не слышно, мошенничество)
6. Завершение разговора

Для каждого блока-обработчика возражений добавь счётчики (intent_2, intent_3) если клиент повторяет — формулировки должны становиться строже.

Тексты должны быть естественными, человечными, соответствовать тону "{tone}". Сразу оба языка.

ОТВЕТЬ ТОЛЬКО JSON, без пояснений.`,
  improve_system: `Ты помогаешь создавать скрипты для колл-центра банка в Узбекистане. Работаешь с двумя языками: русским и узбекским.

🔴 Узбекский (uz) — ТОЛЬКО ЛАТИНИЦА (o', g', sh, ch). Кириллица запрещена полностью, перепроверь каждое слово перед ответом. Пиши натурально, как говорит носитель, не переводи дословно с русского.
🔴 Это устная речь по телефону: каждая реплика (ru и uz) — максимум 25-30 слов.

Всегда возвращай JSON строго в формате: {"ru": "...", "uz": "..."}. Только сам JSON-объект — без markdown-обёртки из тройных обратных кавычек, без пояснений до или после.`,
  improve_user: `Блок скрипта: "{title}" (тип: {type}, intent: {intent}).
Текущий текст на русском: "{currentRu}"
Текущий текст на узбекском: "{currentUz}"

Задача: {task}.

Перепиши ОБА текста (ru и uz) с учётом этой задачи. Сохрани переменные в фигурных скобках как есть (например {BANK_NAME}, {AMOUNT}). Верни JSON: {"ru": "новый русский", "uz": "новый узбекский"}.`,
  review_system: `Ты эксперт по скриптам колл-центра в банках Узбекистана. Анализируешь готовый скрипт: даёшь общую оценку и находишь проблемы. Возвращаешь JSON: {"score": 7, "summary": "1-2 предложения: общий вывод о скрипте и главный приоритет доработки", "strengths": ["что сделано хорошо 1", "что сделано хорошо 2"], "issues": [{"severity": "high"|"medium"|"low", "blockId": "...", "type": "...", "message": "...", "suggestion": "..."}]}. score — целое 1-10 (10 = готов к продакшену без правок). strengths — 2-3 конкретных пункта. severity: high — критично, medium — важно, low — мелочи. Только сам JSON-объект, без markdown-обёртки из тройных обратных кавычек.`,
  review_user: `Проанализируй скрипт и найди до 10 самых важных проблем.

Что искать:
- Тупики (блоки без выхода, кроме end)
- Битые ссылки на несуществующие id
- Отсутствие счётчиков повторов в обработке возражений (intent_2, intent_3)
- Слишком формальный/официальный/роботизированный тон
- Несоответствие RU и UZ текстов
- Неестественные формулировки
- Отсутствие важных типичных интентов (мошенничество, не слышно, оператор)
- Слишком длинные тексты (более 30 слов на блок — плохо для звонка)
- Неиспользуемые переменные в vars
- Отсутствие type: end (разговор не завершается)
- Кириллица в узбекском тексте (uz должен быть ТОЛЬКО на латинице — o', g', sh, ch; любая кириллица в uz это высокая критичность)

ОБЯЗАТЕЛЬНЫЙ ЧЕК-ЛИСТ ИНТЕНТОВ — проверь, что скрипт обрабатывает КАЖДЫЙ пункт. Отсутствие обработки = отдельная проблема (medium, для мошенничества — high):
1. Мошенничество / недоверие («вы мошенники», «откуда у вас мой номер»)
2. Не слышно / плохая связь
3. Трубку взял другой человек (родственник, коллега)
4. Просьба перевести на живого оператора
5. Просьба перезвонить позже / неудобно говорить
6. Автоответчик / голосовая почта

Скрипт в JSON формате (имя: "{name}", блоков: {blockCount}):
{scriptJson}

{referencesSection}

Верни JSON со списком issues. Для каждой проблемы укажи blockId если применимо. Не более 10 issues. Не выдумывай — отвечай только если уверен.`
};

let aiPrompts = { ...DEFAULT_PROMPTS };

function loadPrompts() {
  try {
    const raw = localStorage.getItem(PROMPTS_KEY);
    if (raw) {
      const stored = JSON.parse(raw);
      // Merge with defaults so new prompts get added when we update the code
      aiPrompts = { ...DEFAULT_PROMPTS, ...stored };
    }
  } catch (err) { console.error('Prompts load failed:', err); }
}

function savePrompts() {
  try {
    localStorage.setItem(PROMPTS_KEY, JSON.stringify(aiPrompts));
  } catch (err) {
    toast('Не удалось сохранить промпты: ' + err.message, 'error');
  }
}

function fillTemplate(tpl, vars) {
  return tpl.replace(/\{(\w+)\}/g, (m, key) => vars[key] !== undefined ? vars[key] : m);
}

const llmSettings = {
  provider: 'gemini',        // 'gemini' | 'openai'
  apiKey: '',                // mirror of the ACTIVE provider's key (kept in sync — everything else in the app reads this)
  model: 'gemini-3.5-flash', // mirror of the ACTIVE provider's model
  geminiApiKey: '',
  geminiModel: 'gemini-3.5-flash',
  openaiApiKey: '',
  openaiModel: 'gpt-4o-mini',
  loaded: false
};
function csSyncActiveLLM() {
  if (llmSettings.provider === 'openai') { llmSettings.apiKey = llmSettings.openaiApiKey; llmSettings.model = llmSettings.openaiModel; }
  else { llmSettings.apiKey = llmSettings.geminiApiKey; llmSettings.model = llmSettings.geminiModel; }
}

function loadLLMSettings() {
  try {
    const raw = localStorage.getItem(LLM_SETTINGS_KEY);
    if (raw) {
      const s = JSON.parse(raw);
      // Migrate stale/deprecated Gemini model names that no longer work
      const migrations = {
        'gemini-1.5-flash': 'gemini-3.5-flash',
        'gemini-1.5-pro': 'gemini-3.1-pro-preview',
        'gemini-1.5-flash-latest': 'gemini-3.5-flash',
        'gemini-1.5-pro-latest': 'gemini-3.1-pro-preview',
        'gemini-1.5-flash-8b-latest': 'gemini-2.5-flash-lite',
        'gemini-2.0-flash-exp': 'gemini-3.5-flash',
        'gemini-2.0-flash': 'gemini-2.5-flash',      // shut down by Google
        'gemini-2.0-flash-lite': 'gemini-2.5-flash-lite', // shut down by Google
        'gemini-pro': 'gemini-3.5-flash'
      };
      if (s.provider) {
        // Current (multi-provider) shape
        llmSettings.provider = s.provider === 'openai' ? 'openai' : 'gemini';
        llmSettings.geminiApiKey = s.geminiApiKey || '';
        llmSettings.geminiModel = migrations[s.geminiModel] || s.geminiModel || 'gemini-3.5-flash';
        llmSettings.openaiApiKey = s.openaiApiKey || '';
        llmSettings.openaiModel = s.openaiModel || 'gpt-4o-mini';
      } else {
        // Legacy single-provider (Gemini-only) shape — migrate in place
        llmSettings.provider = 'gemini';
        llmSettings.geminiApiKey = s.apiKey || '';
        llmSettings.geminiModel = migrations[s.model] || s.model || 'gemini-3.5-flash';
      }
      csSyncActiveLLM();
      saveLLMSettings(); // persist migration/new shape
    }
  } catch (err) { console.error('LLM settings load failed:', err); }
  llmSettings.loaded = true;
}

function saveLLMSettings() {
  try {
    localStorage.setItem(LLM_SETTINGS_KEY, JSON.stringify({
      provider: llmSettings.provider,
      geminiApiKey: llmSettings.geminiApiKey,
      geminiModel: llmSettings.geminiModel,
      openaiApiKey: llmSettings.openaiApiKey,
      openaiModel: llmSettings.openaiModel
    }));
  } catch (err) { console.error('LLM settings save failed:', err); }
}

// ─── Call Gemini REST API ───────────────────────────────────
// Returns plain text response.
async function geminiGenerate(systemPrompt, userPrompt, opts = {}) {
  const apiKey = opts.apiKey || llmSettings.geminiApiKey;
  if (!apiKey) {
    throw new Error('API ключ Gemini не настроен. Нажмите "Настройки AI" чтобы его добавить.');
  }
  const model = opts.model || llmSettings.geminiModel || 'gemini-3.5-flash';
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

  const body = {
    contents: [
      { role: 'user', parts: [{ text: userPrompt }] }
    ],
    generationConfig: {
      temperature: opts.temperature ?? 0.7,
      topP: 0.95,
      maxOutputTokens: opts.maxTokens ?? 4096,
      responseMimeType: opts.json ? 'application/json' : 'text/plain'
    }
  };
  if (systemPrompt) {
    body.systemInstruction = { parts: [{ text: systemPrompt }] };
  }

  const resp = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
    body: JSON.stringify(body)
  });
  if (!resp.ok) {
    const errText = await resp.text();
    let msg = `Gemini API ${resp.status}`;
    try {
      const errJson = JSON.parse(errText);
      msg = errJson?.error?.message || msg;
    } catch {}
    throw new Error(msg);
  }
  const data = await resp.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
  if (!text) {
    const reason = data?.candidates?.[0]?.finishReason;
    throw new Error(reason === 'SAFETY' ? 'Модель заблокировала ответ по safety-фильтрам. Переформулируйте запрос.' : 'Пустой ответ от Gemini');
  }
  return text.trim();
}

// ─── Call OpenAI Chat Completions API ────────────────────────
// Returns plain text response. Same signature/shape as geminiGenerate.
async function openaiGenerate(systemPrompt, userPrompt, opts = {}) {
  const apiKey = opts.apiKey || llmSettings.openaiApiKey;
  if (!apiKey) {
    throw new Error('API ключ OpenAI не настроен. Нажмите "Настройки AI" чтобы его добавить.');
  }
  const model = opts.model || llmSettings.openaiModel || 'gpt-4o-mini';
  let sys = systemPrompt || '';
  // OpenAI's json_object mode requires the word "json" to appear in the prompt, or it 400s
  if (opts.json && !/json/i.test(sys) && !/json/i.test(userPrompt || '')) {
    sys += (sys ? '\n\n' : '') + 'Отвечай строго в формате JSON.';
  }
  const messages = [];
  if (sys) messages.push({ role: 'system', content: sys });
  messages.push({ role: 'user', content: userPrompt });
  const body = {
    model,
    messages,
    temperature: opts.temperature ?? 0.7,
    max_tokens: opts.maxTokens ?? 4096
  };
  if (opts.json) body.response_format = { type: 'json_object' };

  const resp = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + apiKey },
    body: JSON.stringify(body)
  });
  if (!resp.ok) {
    const errText = await resp.text();
    let msg = `OpenAI API ${resp.status}`;
    try {
      const errJson = JSON.parse(errText);
      msg = errJson?.error?.message || msg;
    } catch {}
    throw new Error(msg);
  }
  const data = await resp.json();
  const text = data?.choices?.[0]?.message?.content || '';
  if (!text) {
    const reason = data?.choices?.[0]?.finish_reason;
    throw new Error(reason === 'content_filter' ? 'Модель заблокировала ответ по content-фильтрам. Переформулируйте запрос.' : 'Пустой ответ от OpenAI');
  }
  return text.trim();
}

// ─── Provider router — every AI feature in the app calls THIS, never the two above directly ───
async function aiGenerate(systemPrompt, userPrompt, opts = {}) {
  const provider = opts.provider || llmSettings.provider || 'gemini';
  return provider === 'openai'
    ? openaiGenerate(systemPrompt, userPrompt, opts)
    : geminiGenerate(systemPrompt, userPrompt, opts);
}


// ─── Provider tabs inside the AI settings modal ──────────────
function activeModalProvider() {
  return document.getElementById('llm-tab-openai')?.classList.contains('btn-primary') ? 'openai' : 'gemini';
}
function setLLMProviderTab(provider) {
  const isOpenai = provider === 'openai';
  document.getElementById('llm-tab-gemini')?.classList.toggle('btn-primary', !isOpenai);
  document.getElementById('llm-tab-openai')?.classList.toggle('btn-primary', isOpenai);
  const gf = document.getElementById('llm-gemini-fields'), of = document.getElementById('llm-openai-fields');
  if (gf) gf.style.display = isOpenai ? 'none' : '';
  if (of) of.style.display = isOpenai ? '' : 'none';
  const gi = document.getElementById('llm-gemini-info'), oi = document.getElementById('llm-openai-info');
  if (gi) gi.style.display = isOpenai ? 'none' : '';
  if (oi) oi.style.display = isOpenai ? '' : 'none';
}

function openLLMSettings() {
  const modal = document.getElementById('llm-settings-modal');
  if (!modal) { toast('Окно настроек AI не найдено — обновите страницу (Ctrl+Shift+R)', 'error'); return; }
  // Null-safe: OpenAI fields exist only in the newer index.html. If the page's HTML
  // is older/cached, still open the modal with the Gemini tab instead of crashing.
  const gKey = document.getElementById('llm-key-input');
  const gModel = document.getElementById('llm-model-select');
  const oKey = document.getElementById('llm-openai-key-input');
  const oModel = document.getElementById('llm-openai-model-select');
  if (gKey) gKey.value = llmSettings.geminiApiKey;
  if (gModel) gModel.value = llmSettings.geminiModel;
  if (oKey) oKey.value = llmSettings.openaiApiKey;
  if (oModel) oModel.value = llmSettings.openaiModel;
  setLLMProviderTab(oKey ? llmSettings.provider : 'gemini');
  modal.style.display = 'flex';
  setTimeout(() => {
    const el = document.getElementById(llmSettings.provider === 'openai' && oKey ? 'llm-openai-key-input' : 'llm-key-input');
    if (el) el.focus();
  }, 50);
}

function closeLLMSettings() {
  document.getElementById('llm-settings-modal').style.display = 'none';
}

function saveLLMSettingsFromModal() {
  // Save BOTH providers' fields (whichever tab isn't active keeps its value, just hidden)
  llmSettings.geminiApiKey = (document.getElementById('llm-key-input')?.value || '').trim();
  llmSettings.geminiModel = document.getElementById('llm-model-select')?.value || llmSettings.geminiModel;
  llmSettings.openaiApiKey = (document.getElementById('llm-openai-key-input')?.value ?? llmSettings.openaiApiKey).trim();
  llmSettings.openaiModel = document.getElementById('llm-openai-model-select')?.value || llmSettings.openaiModel;
  llmSettings.provider = activeModalProvider();
  csSyncActiveLLM();
  saveLLMSettings();
  updateAIStatusBadge();
  closeLLMSettings();
  toast(llmSettings.apiKey ? `✓ Настройки сохранены (${llmSettings.provider === 'openai' ? 'OpenAI' : 'Gemini'})` : 'API ключ удалён');
}

async function testLLMKey() {
  const provider = activeModalProvider();
  const isOpenai = provider === 'openai';
  const keyInput = document.getElementById(isOpenai ? 'llm-openai-key-input' : 'llm-key-input');
  const modelSelect = document.getElementById(isOpenai ? 'llm-openai-model-select' : 'llm-model-select');
  const key = keyInput.value.trim();
  if (!key) { toast('Сначала введите ключ', 'error'); return; }
  const selectedModel = modelSelect?.value || (isOpenai ? 'gpt-4o-mini' : 'gemini-3.5-flash');
  const btn = document.getElementById('llm-test-btn');
  const origText = btn.textContent;
  btn.disabled = true;
  btn.textContent = 'Проверяю…';
  try {
    const result = isOpenai
      ? await openaiGenerate(null, 'Ответь одним словом "OK"', { maxTokens: 20, model: selectedModel, apiKey: key })
      : await geminiGenerate(null, 'Ответь одним словом "OK"', { maxTokens: 20, model: selectedModel, apiKey: key });
    toast(`✓ Ключ работает с моделью ${selectedModel}! Ответ: ${result.slice(0, 40)}`);
    // Persist on success so a subsequent AI action works even without hitting "Сохранить"
    if (isOpenai) { llmSettings.openaiApiKey = key; llmSettings.openaiModel = selectedModel; }
    else { llmSettings.geminiApiKey = key; llmSettings.geminiModel = selectedModel; }
  } catch (err) {
    toast('Ошибка: ' + err.message, 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = origText;
  }
}

// ─── List available models for the API key (per active provider tab) ─────
async function listAvailableModels() {
  const provider = activeModalProvider();
  const isOpenai = provider === 'openai';
  const keyInput = document.getElementById(isOpenai ? 'llm-openai-key-input' : 'llm-key-input');
  const key = keyInput.value.trim();
  if (!key) { toast('Сначала введите ключ', 'error'); return; }

  try {
    let models = [];
    if (isOpenai) {
      const resp = await fetch('https://api.openai.com/v1/models', { headers: { 'Authorization': 'Bearer ' + key } });
      if (!resp.ok) {
        const err = await resp.text();
        let msg = `Ошибка ${resp.status}`;
        try { msg = JSON.parse(err)?.error?.message || msg; } catch {}
        throw new Error(msg);
      }
      const data = await resp.json();
      const EXCLUDE = /embedding|whisper|tts|dall-e|davinci|babbage|ada|curie|moderation|realtime|audio|image|transcribe/i;
      models = (data.data || []).map(m => m.id).filter(id => !EXCLUDE.test(id)).sort();
    } else {
      const resp = await fetch('https://generativelanguage.googleapis.com/v1beta/models', { headers: { 'x-goog-api-key': key } });
      if (!resp.ok) {
        const err = await resp.text();
        let msg = `Ошибка ${resp.status}`;
        try { msg = JSON.parse(err)?.error?.message || msg; } catch {}
        throw new Error(msg);
      }
      const data = await resp.json();
      models = (data.models || [])
        .filter(m => (m.supportedGenerationMethods || []).includes('generateContent'))
        .map(m => m.name.replace('models/', ''));
    }

    if (!models.length) {
      toast('Нет доступных моделей. Возможно нужно подключить billing.', 'error');
      return;
    }

    const text = `Доступные модели для вашего ключа (${models.length}):\n\n${models.join('\n')}\n\nЕсли в выпадающем списке выше нет нужной модели — скопируйте её точное имя и сообщите разработчику.`;
    alert(text);

    const sel = document.getElementById(isOpenai ? 'llm-openai-model-select' : 'llm-model-select');
    if (sel) {
      Array.from(sel.querySelectorAll('option')).forEach(opt => {
        if (models.includes(opt.value)) {
          opt.textContent = '✓ ' + opt.textContent.replace(/^✓ /, '').replace(/^✗ /, '');
        } else {
          opt.textContent = '✗ ' + opt.textContent.replace(/^✓ /, '').replace(/^✗ /, '');
          opt.disabled = true;
        }
      });
    }
    toast(`✓ Найдено ${models.length} рабочих моделей. Заблокированные помечены ✗`);
  } catch (err) {
    toast('Ошибка: ' + err.message, 'error');
  }
}

function updateAIStatusBadge() {
  const badges = document.querySelectorAll('.ai-status-badge');
  badges.forEach(b => {
    if (llmSettings.apiKey) {
      b.classList.add('ai-on');
      b.title = `AI подключён (${llmSettings.model})`;
    } else {
      b.classList.remove('ai-on');
      b.title = 'AI не настроен — нажмите чтобы подключить';
    }
  });
}

// ═══════════════════════════════════════════════════════════════
// AI FEATURE 1: Improve block text
// ═══════════════════════════════════════════════════════════════
const IMPROVE_PROMPTS = {
  sell:     { label: 'Продающий',  desc: 'Сделать более убедительным, добавить выгоду' },
  short:    { label: 'Короче',     desc: 'Сократить до сути, убрать лишнее' },
  pressure: { label: 'Давление',    desc: 'Добавить срочность и последствия' },
  soft:     { label: 'Мягче',      desc: 'Смягчить тон, убрать давление' },
  fix:      { label: 'Исправить',   desc: 'Улучшить грамматику и стиль' }
};

// User-defined custom styles (saved to storage + cloud)
const CUSTOM_STYLES_KEY = 'cybernet_ai_styles_v1';
let customStyles = {};  // { styleId: { label, desc } }

function loadCustomStyles() {
  try {
    const raw = localStorage.getItem(CUSTOM_STYLES_KEY);
    if (raw) customStyles = JSON.parse(raw);
  } catch (e) { customStyles = {}; }
  // Seed a couple of useful Uzbek-focused defaults on first run
  if (!Object.keys(customStyles).length && !localStorage.getItem(CUSTOM_STYLES_KEY + '_seeded')) {
    customStyles = {
      uz_spoken: { label: 'Разговорный UZ', desc: 'Перепиши узбекский (uz) текст более живым, разговорным, естественным — как реально говорит человек, а не книжный/официальный язык. Русский (ru) оставь близким по смыслу. Сохрани суть.' },
      formal:    { label: 'Официальный',     desc: 'Сделать тон более официальным, деловым и уважительным на обоих языках.' }
    };
    try {
      localStorage.setItem(CUSTOM_STYLES_KEY, JSON.stringify(customStyles));
      localStorage.setItem(CUSTOM_STYLES_KEY + '_seeded', '1');
    } catch (e) {}
  }
}

function saveCustomStyles() {
  try { localStorage.setItem(CUSTOM_STYLES_KEY, JSON.stringify(customStyles)); } catch (e) {}
  // Sync to cloud settings if available
  if (typeof cloudSaveSettings === 'function' && getCurrentUserId()) {
    cloudSaveSettings(llmSettings, { ...aiPrompts, _customStyles: customStyles }, document.documentElement.getAttribute('data-theme'));
  }
}

// Get style info from either built-in or custom
function getStyleInfo(mode) {
  return IMPROVE_PROMPTS[mode] || customStyles[mode] || { label: mode, desc: mode };
}

// Render all style buttons (built-in + custom) for a block
function renderStyleButtons(blockId, handlerName) {
  const builtins = Object.entries(IMPROVE_PROMPTS).filter(([k]) => k !== 'fix');
  const customs = Object.entries(customStyles);
  let html = '';
  builtins.forEach(([k, v]) => {
    html += `<button class="ai-btn" onclick="${handlerName}('${esc(blockId)}', '${k}')">${v.label}</button>`;
  });
  customs.forEach(([k, v]) => {
    html += `<button class="ai-btn ai-btn-custom" onclick="${handlerName}('${esc(blockId)}', '${k}')">${esc(v.label)}</button>`;
  });
  // Fix style (full width) + Add style button
  html += `<button class="ai-btn" onclick="${handlerName}('${esc(blockId)}', 'fix')" style="grid-column: 1 / -1;">Исправить стиль</button>`;
  html += `<button class="ai-btn ai-btn-add" onclick="openStyleManager()" style="grid-column: 1 / -1;">+ Добавить свой стиль</button>`;
  return html;
}

// ── Custom AI Style Manager ───────────────────────────────────
function openStyleManager() {
  let modal = document.getElementById('style-manager-modal');
  if (modal) modal.remove();
  modal = document.createElement('div');
  modal.id = 'style-manager-modal';
  modal.className = 'modal-backdrop';
  modal.onclick = (e) => { if (e.target === modal) modal.remove(); };
  modal.innerHTML = `
    <div class="modal" style="max-width: 540px;">
      <div class="modal-head">
        <div class="modal-title">${csIcon('spark',14)} Мои стили AI</div>
        <button class="modal-x" onclick="document.getElementById('style-manager-modal').remove()">×</button>
      </div>
      <div class="modal-body">
        <div class="info-box" style="margin-bottom:16px;">
          Создайте свои стили переписывания текста. Например «Разговорный UZ» с описанием задачи для AI. Они появятся кнопками рядом со встроенными.
        </div>
        <div id="custom-styles-list"></div>
        <div style="border-top:1px solid var(--bd-subtle); margin-top:16px; padding-top:16px;">
          <div class="cs-field" style="margin-bottom:10px;">
            <label class="field-label">Название стиля (с эмодзи)</label>
            <input class="input" id="new-style-label" placeholder="Разговорный UZ">
          </div>
          <div class="cs-field" style="margin-bottom:10px;">
            <label class="field-label">Что должен сделать AI (описание задачи)</label>
            <textarea class="input" id="new-style-desc" rows="3" placeholder="Перепиши узбекский текст более живым, разговорным, естественным — как реально говорит человек. Русский оставь близким по смыслу."></textarea>
          </div>
          <button class="btn btn-primary btn-sm" onclick="addCustomStyle()">+ Добавить стиль</button>
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
  renderCustomStylesList();
}

function renderCustomStylesList() {
  const list = document.getElementById('custom-styles-list');
  if (!list) return;
  const entries = Object.entries(customStyles);
  if (!entries.length) {
    list.innerHTML = '<div style="color:var(--tx-tertiary); font-size:13px; padding:8px 0;">Пока нет своих стилей. Добавьте первый ниже.</div>';
    return;
  }
  list.innerHTML = entries.map(([k, v]) => `
    <div class="style-row">
      <div class="style-row-info">
        <div class="style-row-label">${esc(v.label)}</div>
        <div class="style-row-desc">${esc(v.desc)}</div>
      </div>
      <button class="style-row-del" onclick="deleteCustomStyle('${esc(k)}')" title="Удалить">×</button>
    </div>
  `).join('');
}

function addCustomStyle() {
  const label = document.getElementById('new-style-label')?.value.trim();
  const desc = document.getElementById('new-style-desc')?.value.trim();
  if (!label || !desc) { toast('Заполните название и описание', 'error'); return; }
  // Generate a unique key
  const key = 'custom_' + Date.now().toString(36);
  customStyles[key] = { label, desc };
  saveCustomStyles();
  document.getElementById('new-style-label').value = '';
  document.getElementById('new-style-desc').value = '';
  renderCustomStylesList();
  // Refresh open editors so new button appears
  if (canvasState.selectedId) renderCanvasSidebar(canvasState.selectedId);
  renderBlocks();
  toast('✓ Стиль добавлен');
}

function deleteCustomStyle(key) {
  if (!customStyles[key]) return;
  if (!confirm(`Удалить стиль «${customStyles[key].label}»?`)) return;
  delete customStyles[key];
  saveCustomStyles();
  renderCustomStylesList();
  if (canvasState.selectedId) renderCanvasSidebar(canvasState.selectedId);
  renderBlocks();
  toast('Стиль удалён');
}

async function improveBlockText(blockId, mode) {
  const d = data();
  const b = d.blocks.find(x => x.id === blockId);
  if (!b) return;
  if (!llmSettings.apiKey) { openLLMSettings(); toast('Сначала настройте API ключ', 'error'); return; }

  const sidebar = document.getElementById('canvas-sidebar');
  const loadingEl = sidebar.querySelector('#ai-loading');
  if (loadingEl) loadingEl.remove();

  // Insert loader
  const aiGroup = sidebar.querySelector('.ai-block-group');
  if (aiGroup) {
    const spinner = document.createElement('div');
    spinner.id = 'ai-loading';
    spinner.className = 'ai-loading';
    spinner.innerHTML = `<div class="ai-spinner"></div><span>Gemini думает...</span>`;
    aiGroup.appendChild(spinner);
  }

  const currentRu = document.getElementById('cs-ru')?.value || b.ru || '';
  const currentUz = document.getElementById('cs-uz')?.value || b.uz || '';

  await _doImproveBlock(b, mode, currentRu, currentUz, 'canvas');
}

// Variant for list-editor (Блоки tab)
async function improveBlockTextInList(blockId, mode) {
  const d = data();
  const b = d.blocks.find(x => x.id === blockId);
  if (!b) return;
  if (!llmSettings.apiKey) { openLLMSettings(); toast('Сначала настройте API ключ', 'error'); return; }

  const currentRu = document.getElementById('fr-' + blockId)?.value ?? b.ru ?? '';
  const currentUz = document.getElementById('fu-' + blockId)?.value ?? b.uz ?? '';

  toast('AI думает…', 'info');
  await _doImproveBlock(b, mode, currentRu, currentUz, 'list');
}

async function _doImproveBlock(b, mode, currentRu, currentUz, uiMode) {
  const modeInfo = getStyleInfo(mode);
  const systemPrompt = aiPrompts.improve_system;
  const userPrompt = fillTemplate(aiPrompts.improve_user, {
    title: b.title || '',
    type: b.type || 'normal',
    intent: b.intent || 'нет',
    currentRu: currentRu || '(пусто)',
    currentUz: currentUz || '(пусто)',
    task: modeInfo.desc
  });

  try {
    const raw = await aiGenerate(systemPrompt, userPrompt, { json: true, temperature: 0.6 });
    let parsed;
    try { parsed = JSON.parse(raw); } catch {
      const m = raw.match(/\{[\s\S]*\}/);
      if (m) parsed = JSON.parse(m[0]);
      else throw new Error('Не могу распарсить ответ AI');
    }
    if (!parsed.ru || !parsed.uz) throw new Error('AI не вернул оба языка');

    if (uiMode === 'canvas') {
      showAISuggestion(b.id, parsed.ru, parsed.uz, modeInfo.label);
    } else {
      // list mode — write directly to DOM inputs + block + snapshot
      snapshot('AI: ' + modeInfo.label);
      b.ru = parsed.ru;
      b.uz = parsed.uz;
      const ruEl = document.getElementById('fr-' + b.id);
      const uzEl = document.getElementById('fu-' + b.id);
      if (ruEl) ruEl.value = parsed.ru;
      if (uzEl) uzEl.value = parsed.uz;
      toast('✓ Текст обновлён. Нажмите "Сохранить" чтобы применить.');
    }
  } catch (err) {
    toast('Ошибка AI: ' + err.message, 'error');
  } finally {
    const ld = document.getElementById('ai-loading');
    if (ld) ld.remove();
  }
}

let _pendingAISuggestion = null;

function showAISuggestion(blockId, newRu, newUz, label) {
  const sidebar = document.getElementById('canvas-sidebar');
  const existing = sidebar.querySelector('#ai-suggestion');
  if (existing) existing.remove();

  // Store payload so the Apply button doesn't depend on inline-escaping
  _pendingAISuggestion = { blockId, newRu, newUz };

  const panel = document.createElement('div');
  panel.id = 'ai-suggestion';
  panel.className = 'ai-suggestion';
  panel.innerHTML = `
    <div class="ai-sugg-header">
      <span>${csIcon('spark',12)} ${esc(label)} — вариант AI</span>
      <button class="ai-sugg-close" onclick="document.getElementById('ai-suggestion').remove()">×</button>
    </div>
    <div class="ai-sugg-text">
      <div class="ai-sugg-lang">RU Русский</div>
      <div class="ai-sugg-content">${esc(newRu)}</div>
      <div class="ai-sugg-lang" style="margin-top:10px;">UZ O'zbek</div>
      <div class="ai-sugg-content">${esc(newUz)}</div>
    </div>
    <div class="ai-sugg-actions">
      <button class="btn btn-sm" onclick="document.getElementById('ai-suggestion').remove()">Отменить</button>
      <button class="btn btn-sm btn-primary" onclick="applyPendingAISuggestion()">✓ Применить</button>
    </div>
  `;

  const aiGroup = sidebar.querySelector('.ai-block-group');
  if (aiGroup) aiGroup.after(panel);
}

function applyPendingAISuggestion() {
  if (!_pendingAISuggestion) return;
  const { blockId, newRu, newUz } = _pendingAISuggestion;
  applyAISuggestion(blockId, newRu, newUz);
  _pendingAISuggestion = null;
}

function applyAISuggestion(blockId, newRu, newUz) {
  const b = data().blocks.find(x => x.id === blockId);
  if (!b) return;
  snapshot('AI: улучшение блока');
  b.ru = newRu;
  b.uz = newUz;
  // Update DOM inputs in real-time
  const ruInput = document.getElementById('cs-ru');
  const uzInput = document.getElementById('cs-uz');
  if (ruInput) ruInput.value = newRu;
  if (uzInput) uzInput.value = newUz;
  document.getElementById('ai-suggestion')?.remove();
  // Persist immediately so the change isn't lost
  saveToStorage();
  canvasRender();
  // Re-render sidebar so it shows the updated text
  renderCanvasSidebar(blockId);
  toast('✓ Текст обновлён и сохранён');
}

// ═══════════════════════════════════════════════════════════════
// AI FEATURE 2: Generate full script
// ═══════════════════════════════════════════════════════════════
function openGenScriptModal() {
  clearBrief();
  if (!llmSettings.apiKey) { openLLMSettings(); toast('Сначала настройте API ключ', 'error'); return; }
  document.getElementById('gen-script-modal').style.display = 'flex';
  renderGsRefsPicker();
  setTimeout(() => document.getElementById('gs-niche').focus(), 50);
}

function renderGsRefsPicker() {
  const picker = document.getElementById('gs-refs-picker');
  const counter = document.getElementById('gs-refs-count');
  if (!picker) return;
  if (!aiReferences.length) {
    picker.innerHTML = `<div class="gs-refs-empty">${csIcon('bookmark',13)} Эталонов пока нет. Создайте их на вкладке «Эталоны». Можно генерировать и без эталонов, но качество будет ниже.</div>`;
    if (counter) counter.textContent = '';
    return;
  }
  picker.innerHTML = aiReferences.map((r, idx) => {
    const blockCount = (getRefProfile(r)?.blocks || []).length;
    const typeLabel = REF_TYPE_LABELS[r.scriptType] || '';
    const tags = Array.isArray(r.tags) ? r.tags : [];
    return `
      <label class="gs-ref-item ${r.active ? 'active' : ''}">
        <input type="checkbox" class="gs-ref-cb" data-idx="${idx}" ${r.active ? 'checked' : ''} onchange="toggleGsRef(${idx}, this.checked)">
        <div class="gs-ref-content">
          <div class="gs-ref-name">${esc(r.name)}</div>
          <div class="gs-ref-meta">
            ${typeLabel ? `<span style="color:#7c3aed;font-weight:600;">${csIcon('clipboard',10)} ${esc(typeLabel)}</span>` : ''}
            ${r.niche ? `<span>${csIcon('building',10)} ${esc(r.niche)}</span>` : ''}
            ${r.goal ? `<span>${csIcon('target',10)} ${esc(r.goal)}</span>` : ''}
            ${tags.map(t => `<span style="color:#9ca3af;">#${esc(t)}</span>`).join('')}
            <span style="color:#9ca3af;">${blockCount} бл.</span>
          </div>
          ${r.notes ? `<div class="gs-ref-notes">${esc(r.notes.slice(0, 90))}${r.notes.length > 90 ? '…' : ''}</div>` : ''}
        </div>
      </label>
    `;
  }).join('');
  updateGsRefsCount();
}

function updateGsRefsCount() {
  const counter = document.getElementById('gs-refs-count');
  if (!counter) return;
  const active = aiReferences.filter(r => r.active).length;
  if (active === 0) {
    counter.innerHTML = `<span style="color:#dc2626;">${csIcon('warn',11)} ни один не выбран</span>`;
  } else {
    counter.textContent = `выбрано: ${active}`;
  }
  // Show/hide mode selector based on count
  const modeBox = document.getElementById('gs-mode-box');
  if (modeBox) {
    modeBox.style.display = active >= 2 ? 'block' : 'none';
  }
}

function toggleGsRef(idx, active) {
  if (!aiReferences[idx]) return;
  aiReferences[idx].active = active;
  saveReferences();
  // Update visual state on the label
  const labels = document.querySelectorAll('.gs-ref-item');
  if (labels[idx]) {
    labels[idx].classList.toggle('active', active);
  }
  updateGsRefsCount();
}

function closeGenScriptModal() {
  document.getElementById('gen-script-modal').style.display = 'none';
}

// Get the script profile object from a reference, regardless of which field it's stored in
function getRefProfile(r) {
  if (!r) return null;
  // Prefer whichever has actual blocks
  const candidates = [r.profile, r.profileData, r.data];
  for (const c of candidates) {
    if (c && Array.isArray(c.blocks) && c.blocks.length) return c;
  }
  // Fallback to first non-empty object
  return r.profile || r.profileData || r.data || null;
}

// ═══════════════════════════════════════════════════════════════
// CLIENT BRIEF (XLSX опросник) → structured Q&A for AI generation
// ═══════════════════════════════════════════════════════════════
let genBrief = null; // { fileName, items: [{section, q, a, hint}] }

function parseBriefWorkbook(wb) {
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1, raw: false, defval: '' });
  const norm = (v) => String(v == null ? '' : v).trim();
  const lower = (v) => norm(v).toLowerCase();

  // Detect header row: contains both "вопрос" and "ответ" → gives us q/a columns.
  let qcol = null, acol = null, hintcol = null, headerRowIdx = -1;
  for (let i = 0; i < Math.min(rows.length, 6); i++) {
    const low = (rows[i] || []).map(lower);
    const qi = low.findIndex(v => v.includes('вопрос'));
    const ai = low.findIndex(v => v.includes('ответ'));
    if (qi !== -1 && ai !== -1 && qi !== ai) {
      qcol = qi; acol = ai; headerRowIdx = i;
      const hi = low.findIndex(v => v.includes('комментар') || v.includes('подсказ'));
      if (hi !== -1) hintcol = hi;
      break;
    }
  }
  // Fallback (collection-style: question in col 0, answer in col 1)
  if (qcol === null) { qcol = 0; acol = 1; }

  const items = [];
  let section = '';
  for (let i = 0; i < rows.length; i++) {
    if (i === headerRowIdx) continue;
    const r = rows[i] || [];
    const q = norm(r[qcol]);
    const a = norm(r[acol]);
    const hint = hintcol !== null ? norm(r[hintcol]) : '';
    // Section text living in col 0 (telemarketing layout: col A = section, col B = question)
    if (qcol > 0 && norm(r[0])) section = norm(r[0]);
    if (!q) continue;
    const lowQ = q.toLowerCase();
    // Header-ish rows: "информация для ...", "анализ звонков", "ответы" as answer, etc.
    const isHeaderRow = (!a && !/^\d+[\.\)]/.test(q)) || lowQ === 'ответы' || a.toLowerCase() === 'ответы';
    if (isHeaderRow) { if (!/^\d+[\.\)]/.test(q)) { section = q; } continue; }
    items.push({ section, q, a, hint });
  }
  return items;
}

function handleBriefUpload(ev) {
  const file = ev.target.files && ev.target.files[0];
  if (!file) return;
  if (typeof XLSX === 'undefined') { toast('Библиотека XLSX не загрузилась — обновите страницу', 'error'); return; }
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const wb = XLSX.read(new Uint8Array(e.target.result), { type: 'array' });
      const items = parseBriefWorkbook(wb);
      if (!items.length) { toast('Не удалось распознать вопросы в файле. Проверьте формат брифа.', 'error'); return; }
      genBrief = { fileName: file.name, items };
      const answered = items.filter(it => it.a).length;
      const st = document.getElementById('gs-brief-status');
      if (st) st.textContent = `${file.name} · вопросов: ${items.length}, с ответами: ${answered}`;
      const clr = document.getElementById('gs-brief-clear');
      if (clr) clr.style.display = '';
      const pv = document.getElementById('gs-brief-preview');
      if (pv) {
        pv.style.display = '';
        pv.innerHTML = items.filter(it => it.a).slice(0, 8).map(it =>
          `<div style="margin-bottom:5px;"><b>${esc(it.q.slice(0, 70))}</b> — ${esc(it.a.slice(0, 90))}</div>`
        ).join('') || '<i>В брифе нет заполненных ответов — AI получит только список вопросов.</i>';
      }
      if (!answered) toast('В брифе не заполнен ни один ответ — это пустой шаблон?', 'error');
      else toast(`✓ Бриф загружен: ${answered} ответов`);
    } catch (err) {
      console.error('Brief parse failed:', err);
      toast('Ошибка чтения файла: ' + err.message, 'error');
    }
  };
  reader.readAsArrayBuffer(file);
  ev.target.value = ''; // allow re-uploading the same file
}

function clearBrief() {
  genBrief = null;
  const st = document.getElementById('gs-brief-status');
  if (st) st.textContent = 'не загружен';
  const clr = document.getElementById('gs-brief-clear');
  if (clr) clr.style.display = 'none';
  const pv = document.getElementById('gs-brief-preview');
  if (pv) { pv.style.display = 'none'; pv.innerHTML = ''; }
}

function buildBriefSection() {
  if (!genBrief || !genBrief.items.length) return '';
  const answered = genBrief.items.filter(it => it.a);
  const listed = (answered.length ? answered : genBrief.items).map(it => {
    let line = '';
    if (it.section) line += `[${it.section}] `;
    line += `${it.q}\n→ ${it.a || '(клиент не ответил)'}`;
    if (!it.a && it.hint) line += `\n(подсказка по вопросу: ${it.hint})`;
    return line;
  }).join('\n\n');
  return `\n\n═══ БРИФ КЛИЕНТА (заполненный опросник) ═══\n\nНиже — ответы клиента на опросник. Это ПЕРВОИСТОЧНИК фактов о продукте, условиях, аудитории и требованиях. При генерации скрипта:\n- Используй КОНКРЕТИКУ из брифа (название компании/продукта, условия, суммы, способы оплаты, контакты) вместо выдуманных значений.\n- Требования из брифа (стиль общения, перевод на оператора, обязательные фразы, SMS) — ОБЯЗАТЕЛЬНЫ к исполнению.\n- Если бриф противоречит полям формы (ниша/тон) — приоритет у брифа.\n- Не выдумывай факты, которых нет ни в брифе, ни в форме: для неизвестного используй переменные в фигурных скобках.\n\n${listed}\n\n═══ КОНЕЦ БРИФА ═══`;
}

async function generateScript() {
  const niche = document.getElementById('gs-niche').value.trim();
  const goal = document.getElementById('gs-goal').value;
  const channel = document.getElementById('gs-channel').value;
  const tone = document.getElementById('gs-tone').value;
  const size = document.getElementById('gs-size').value;
  const extras = document.getElementById('gs-extras').value.trim();

  if (!niche) { toast('Укажите нишу / сферу', 'error'); return; }

  const btn = document.getElementById('gs-generate-btn');
  const origText = btn.textContent;
  btn.disabled = true;
  btn.textContent = 'Генерирую скрипт... (30-60 сек)';

  const sizeMap = { small: '10-15', medium: '25-35', large: '50-70' };
  const blockCount = sizeMap[size] || '25-35';

  // Determine generation mode (exact copy vs blend)
  const modeEl = document.querySelector('input[name="gs-mode"]:checked');
  const genMode = modeEl ? modeEl.value : 'exact';

  // Build references section from active references
  const activeRefs = aiReferences.filter(r => r.active);
  let referencesSection = '';
  if (activeRefs.length) {
    const refsJson = activeRefs.map(r => {
      const compact = {
        name: r.name,
        scriptType: REF_TYPE_LABELS[r.scriptType] || r.scriptType || '',
        niche: r.niche || '',
        goal: r.goal || '',
        tone: r.tone || '',
        styleNotes: r.notes || '',
        blocks: (getRefProfile(r)?.blocks || []).map(b => ({
          id: b.id,
          title: b.title,
          intent: b.intent,
          type: b.type,
          ru: b.ru,
          uz: b.uz,
          branches: (b.branches || []).map(br => ({ label: br.label, next: br.next }))
        }))
      };
      return JSON.stringify(compact, null, 2);
    }).join('\n\n═══ СЛЕДУЮЩИЙ ЭТАЛОН ═══\n\n');

    let modeInstruction;
    if (activeRefs.length === 1 || genMode === 'exact') {
      modeInstruction = `КРИТИЧЕСКИ ВАЖНО — РЕЖИМ ТОЧНОГО КОПИРОВАНИЯ:
Возьми эталон ниже как ОБРАЗЕЦ и создай новый скрипт с ТОЙ ЖЕ логикой, структурой, набором интентов и тоном текста, но адаптированный под новую сферу/цель из запроса пользователя.
- Сохрани ТЕ ЖЕ типы блоков и их последовательность
- Сохрани ТУ ЖЕ структуру обработки возражений (счётчики повторов intent_2/intent_3 если они есть в эталоне)
- Сохрани ТОТ ЖЕ тон и манеру формулировок в текстах
- Сохрани ВСЕ важные интенты (мошенничество, не слышно, родственник, оператор и т.п.)
- Адаптируй только КОНКРЕТИКУ под новую сферу (название продукта, суммы, условия)
- Если эталон по взысканию, а просят продажу — переложи структуру взыскания на продажу, сохранив подход`;
    } else {
      modeInstruction = `РЕЖИМ СМЕШИВАНИЯ ЛУЧШЕГО:
Изучи ВСЕ эталоны ниже. Возьми лучшие практики из каждого — удачные формулировки, полезные интенты, эффективную структуру обработки возражений — и создай новый скрипт, объединяющий сильные стороны всех образцов, адаптированный под запрос пользователя.
- Используй самые полные наборы интентов из всех эталонов
- Бери лучшие формулировки текстов
- Сохрани общий тон, характерный для эталонов`;
    }

    referencesSection = `\n\n${modeInstruction}\n\n═══ ЭТАЛОННЫЕ СКРИПТЫ ═══\n\n${refsJson}\n\n═══ КОНЕЦ ЭТАЛОНОВ ═══`;
  }

  const briefSection = buildBriefSection();
  const systemPrompt = aiPrompts.generate_system + referencesSection + briefSection;
  const userPrompt = fillTemplate(aiPrompts.generate_user, {
    niche, goal, channel, tone, blockCount,
    extras: extras || '(нет)'
  });

  try {
    // ════════════════════════════════════════════════════════════
    // STRUCTURE MODE: 1 reference + exact → keep skeleton, rewrite only texts
    // ════════════════════════════════════════════════════════════
    if (activeRefs.length === 1 && genMode === 'exact') {
      const ref = activeRefs[0];
      const refProfile = getRefProfile(ref);
      const refBlocks = refProfile?.blocks || [];
      if (!refBlocks.length) throw new Error('В эталоне нет блоков');

      // Send AI a compact map of id→{title, ru, uz} and ask to rewrite texts only
      const textMap = refBlocks.map(b => ({
        id: b.id,
        title: b.title || '',
        ru: b.ru || '',
        uz: b.uz || ''
      }));

      const structPrompt = `Ты — эксперт по скриптам колл-центра. У тебя есть ЭТАЛОННЫЙ скрипт. Твоя задача — переписать ТОЛЬКО ТЕКСТЫ блоков (title, ru, uz) под новую сферу, СОХРАНИВ СМЫСЛ И РОЛЬ каждого блока. НЕ добавляй и НЕ удаляй блоки. НЕ меняй id.

НОВАЯ СФЕРА: ${niche}
ЦЕЛЬ: ${goal}
КАНАЛ: ${channel}
ТОН: ${tone}
ДОП. ТРЕБОВАНИЯ: ${extras || '(нет)'}

${briefSection ? briefSection + '\n\n' : ''}ПРАВИЛА:
- Для каждого блока перепиши title (краткое название), ru (русский текст реплики), uz (узбекский перевод) под новую сферу
- Узбекский (uz) — ТОЛЬКО ЛАТИНИЦА (o', g', sh, ch), кириллица запрещена
- Если есть БРИФ КЛИЕНТА выше — конкретика (названия, условия, суммы, контакты) берётся строго из него
- Служебные блоки («Ответ клиента», «Завершение звонка», «Молчание», «Автоответчик» и т.п.) — сохрани их роль, текст можешь оставить похожим
- Блоки-решения и вопросы — адаптируй под новую сферу
- Сохрани тот же тон и манеру
- Верни СТРОГО JSON-массив: [{"id":"...","title":"...","ru":"...","uz":"..."}, ...] для ВСЕХ ${textMap.length} блоков, ничего кроме JSON

ЭТАЛОННЫЕ ТЕКСТЫ (${textMap.length} блоков):
${JSON.stringify(textMap, null, 1)}`;

      const raw = await aiGenerate(structPrompt, 'Перепиши все тексты под новую сферу и верни JSON-массив.', {
        json: true, temperature: 0.7, maxTokens: 16000
      });
      let rewritten;
      try { rewritten = JSON.parse(raw); } catch {
        const m = raw.match(/\[[\s\S]*\]/);
        if (!m) throw new Error('Не могу распарсить ответ AI');
        rewritten = JSON.parse(m[0]);
      }
      const textById = {};
      rewritten.forEach(r => { if (r.id) textById[r.id] = r; });

      // Build new profile by DEEP-COPYING the reference structure, swapping texts
      const profileName = `${niche} (по эталону ${ref.name})`;
      const uniqueName = profiles[profileName] ? `${profileName} ${Date.now().toString().slice(-4)}` : profileName;
      const newProfile = {
        name: uniqueName,
        vars: JSON.parse(JSON.stringify(refProfile?.vars || { BANK_NAME: '', PHONE: '', AGENT_NAME: '' })),
        sections: JSON.parse(JSON.stringify(refProfile?.sections || [{ id: 's1', label: 'Основной раздел' }])),
        blocks: refBlocks.map(b => {
          const t = textById[b.id] || {};
          return {
            id: b.id,
            sec: b.sec || 's1',
            title: t.title || b.title || '',
            intent: b.intent || '',
            type: b.type || 'normal',
            ru: t.ru !== undefined ? t.ru : (b.ru || ''),
            uz: t.uz !== undefined ? t.uz : (b.uz || ''),
            color: b.color || '',
            x: b.x,  // keep exact coordinates
            y: b.y,
            w: b.w,
            branches: (b.branches || []).map(br => ({
              id: branchId(),
              label: br.label || '',
              color: br.color || BRANCH_COLOR_DEFAULT,
              next: br.next || ''
            })),
            next_default: '', next_yes: '', next_no: ''
          };
        })
      };
      newProfile.blocks.forEach(b => syncLegacyNext(b));

      snapshot('Генерация по структуре эталона');
      profiles[uniqueName] = newProfile;
      activeProfile = uniqueName;
      // Mark as having coords so auto-layout won't override
      const withCoords = newProfile.blocks.filter(b => typeof b.x === 'number').length;
      if (withCoords >= newProfile.blocks.length * 0.5) canvasState.autoLaidOut.add(uniqueName);
      closeGenScriptModal();
      renderProfiles(); renderBlocks(); renderVars(); renderStats();
      const canvasTab = document.querySelector('[data-tab="canvas"]');
      if (canvasTab) switchTab('canvas', canvasTab);
      saveToStorage();
      toast(`✓ Создан профиль "${uniqueName}" · ${newProfile.blocks.length} блоков (структура эталона сохранена)`);
      btn.disabled = false;
      btn.textContent = origText;
      return;
    }

    const raw = await aiGenerate(systemPrompt, userPrompt, {
      json: true,
      temperature: 0.8,
      maxTokens: 16000
    });
    let parsed;
    try { parsed = JSON.parse(raw); } catch {
      const m = raw.match(/\{[\s\S]*\}/);
      if (!m) throw new Error('Не могу распарсить JSON');
      parsed = JSON.parse(m[0]);
    }

    // Validate
    if (!parsed.blocks || !Array.isArray(parsed.blocks) || !parsed.blocks.length) {
      throw new Error('Скрипт пустой — AI не смог сгенерировать блоки');
    }

    // Build profile
    const profileName = parsed.name || `AI: ${niche} (${new Date().toLocaleDateString()})`;
    const uniqueName = profiles[profileName]
      ? `${profileName} ${new Date().getTime().toString().slice(-4)}`
      : profileName;

    const profile = {
      name: uniqueName,
      vars: parsed.vars || { BANK_NAME: '', PHONE: '', AGENT_NAME: '' },
      sections: parsed.sections?.length ? parsed.sections : [{ id: 's1', label: 'Основной раздел' }],
      blocks: parsed.blocks.map(b => ({
        id: b.id,
        sec: b.sec || parsed.sections?.[0]?.id || 's1',
        title: b.title || '(без названия)',
        intent: b.intent || '',
        type: b.type || 'normal',
        ru: b.ru || '',
        uz: b.uz || '',
        branches: (b.branches || []).map(br => ({
          id: branchId(),
          label: br.label || '',
          color: BRANCH_COLOR_DEFAULT,
          next: br.next || ''
        })),
        next_default: '', next_yes: '', next_no: ''
      }))
    };
    profile.blocks.forEach(b => syncLegacyNext(b));

    snapshot('Генерация скрипта AI');
    profiles[uniqueName] = profile;
    activeProfile = uniqueName;
    closeGenScriptModal();
    renderProfiles(); renderBlocks(); renderVars(); renderStats();

    // Switch to Canvas view to show the result
    const canvasTab = document.querySelector('[data-tab="canvas"]');
    if (canvasTab) switchTab('canvas', canvasTab);

    toast(`✓ Создан профиль "${uniqueName}" · ${profile.blocks.length} блоков`);
  } catch (err) {
    toast('Ошибка генерации: ' + err.message, 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = origText;
  }
}

// ═══════════════════════════════════════════════════════════════
// AI FEATURE 3: Objection responses (3 variants)
// ═══════════════════════════════════════════════════════════════
async function generateObjectionResponses(blockId) {
  const d = data();
  const b = d.blocks.find(x => x.id === blockId);
  if (!b) return;
  if (!llmSettings.apiKey) { openLLMSettings(); toast('Сначала настройте API ключ', 'error'); return; }

  const objection = prompt('Какое возражение клиента нужно обработать?\nНапример: "дорого", "я подумаю", "уже есть у другого банка"', b.title || '');
  if (!objection) return;

  const sidebar = document.getElementById('canvas-sidebar');
  const existing = sidebar.querySelector('#ai-objection');
  if (existing) existing.remove();

  const panel = document.createElement('div');
  panel.id = 'ai-objection';
  panel.className = 'ai-suggestion';
  panel.innerHTML = `
    <div class="ai-sugg-header">
      <span>${csIcon('chat',13)} Варианты ответа на: "${esc(objection)}"</span>
      <button class="ai-sugg-close" onclick="document.getElementById('ai-objection').remove()">×</button>
    </div>
    <div class="ai-loading"><div class="ai-spinner"></div><span>Gemini придумывает ответы...</span></div>
  `;
  const aiGroup = sidebar.querySelector('.ai-block-group');
  if (aiGroup) aiGroup.after(panel);

  const systemPrompt = `Ты эксперт по работе с возражениями в колл-центре банка Узбекистана. Работаешь с русским и узбекским (латиница).
Возвращаешь строго JSON: {"variants": [{"style": "мягкий", "ru": "...", "uz": "..."}, ...]}`;

  const userPrompt = `Контекст блока скрипта:
- Название: "${b.title}"
- Intent: "${b.intent || 'нет'}"
- Тип: ${b.type || 'normal'}

Клиент выражает возражение: "${objection}"

Сгенерируй 3 разных варианта ответа оператора на это возражение:
1. МЯГКИЙ — понимающий, без давления
2. АРГУМЕНТИРОВАННЫЙ — с фактами и логикой
3. ЖЁСТКИЙ — с напоминанием о последствиях

Каждый вариант на обоих языках (ru и uz). Используй переменные: {BANK_NAME}, {AMOUNT}, {PHONE}. Возвращай JSON.`;

  try {
    const raw = await aiGenerate(systemPrompt, userPrompt, { json: true, temperature: 0.8, maxTokens: 3000 });
    let parsed;
    try { parsed = JSON.parse(raw); } catch {
      const m = raw.match(/\{[\s\S]*\}/);
      if (!m) throw new Error('Не могу распарсить JSON');
      parsed = JSON.parse(m[0]);
    }
    if (!parsed.variants || !parsed.variants.length) throw new Error('AI не вернул варианты');

    // Store variants so Apply buttons don't depend on inline-escaping (apostrophes break onclick)
    _pendingObjectionVariants = { blockId, variants: parsed.variants };

    const variantsHtml = parsed.variants.map((v, i) => `
      <div class="ai-variant">
        <div class="ai-variant-head">
          <span class="ai-variant-style">${esc(v.style || 'вариант ' + (i+1))}</span>
        </div>
        <div class="ai-variant-body">
          <div class="ai-variant-lang">RU</div>
          <div class="ai-variant-text">${esc(v.ru || '')}</div>
          <div class="ai-variant-lang" style="margin-top:6px;">UZ</div>
          <div class="ai-variant-text">${esc(v.uz || '')}</div>
        </div>
        <button class="btn btn-sm btn-primary" onclick="applyPendingObjectionVariant(${i})">✓ Вставить в блок</button>
      </div>
    `).join('');

    panel.innerHTML = `
      <div class="ai-sugg-header">
        <span>${csIcon('chat',12)} "${esc(objection)}"</span>
        <button class="ai-sugg-close" onclick="document.getElementById('ai-objection').remove()">×</button>
      </div>
      <div class="ai-variants">${variantsHtml}</div>
    `;
  } catch (err) {
    panel.innerHTML = `
      <div class="ai-sugg-header">
        <span style="color:#dc2626;">${csIcon('warn',12)} Ошибка</span>
        <button class="ai-sugg-close" onclick="document.getElementById('ai-objection').remove()">×</button>
      </div>
      <div style="padding:12px; font-size:13px; color:#dc2626;">${esc(err.message)}</div>
    `;
  }
}

let _pendingObjectionVariants = null;
function applyPendingObjectionVariant(index) {
  if (!_pendingObjectionVariants) return;
  const { blockId, variants } = _pendingObjectionVariants;
  const v = variants[index];
  if (!v) return;
  applyObjectionVariant(blockId, v.ru || '', v.uz || '');
}

function applyObjectionVariant(blockId, newRu, newUz) {
  const b = data().blocks.find(x => x.id === blockId);
  if (!b) return;
  snapshot('AI: ответ на возражение');
  b.ru = newRu;
  b.uz = newUz;
  const ruInput = document.getElementById('cs-ru');
  const uzInput = document.getElementById('cs-uz');
  if (ruInput) ruInput.value = newRu;
  if (uzInput) uzInput.value = newUz;
  document.getElementById('ai-objection')?.remove();
  saveToStorage();
  canvasRender();
  renderCanvasSidebar(blockId);
  toast('✓ Текст обновлён и сохранён');
}

// ═══════════════════════════════════════════════════════════════
// AI REFERENCES — library of reference scripts (JSON files)
// ═══════════════════════════════════════════════════════════════
function renderReferences() {
  const list = document.getElementById('refs-list');
  if (!list) return;

  if (!aiReferences.length) {
    list.innerHTML = `
      <div class="refs-empty">
        <div style="font-size: 42px; margin-bottom: 12px;">${csIcon('bookmark',40)}</div>
        <h3>Нет эталонных скриптов</h3>
        <p>Загрузите JSON ваших качественных скриптов — Gemini будет использовать их как образец стиля при генерации новых.</p>
        <p style="font-size: 12px; color:#9ca3af; margin-top:10px;">${csIcon('spark',11)} Совет: используйте уже готовые AVO или Collection как первый эталон. Откройте профиль → Экспорт → JSON, потом загрузите этот файл сюда.</p>
      </div>
    `;
    return;
  }

  list.innerHTML = aiReferences.map((r, idx) => {
    const blockCount = (getRefProfile(r)?.blocks || []).length;
    const sizeKb = Math.round(JSON.stringify(r.profile).length / 1024);
    const typeLabel = REF_TYPE_LABELS[r.scriptType] || r.scriptType || '';
    const tags = Array.isArray(r.tags) ? r.tags : [];
    return `
      <div class="ref-card ${r.active ? 'active' : ''}">
        <div class="ref-card-toggle">
          <input type="checkbox" id="ref-active-${idx}" ${r.active ? 'checked' : ''} onchange="toggleRefActive(${idx}, this.checked)">
        </div>
        <div class="ref-card-body">
          <div class="ref-card-name">${esc(r.name || '(без названия)')}</div>
          <div class="ref-card-meta">
            ${typeLabel ? `<span class="ref-tag ref-tag-type">${csIcon('clipboard',10)} ${esc(typeLabel)}</span>` : ''}
            ${r.niche ? `<span class="ref-tag">${csIcon('building',10)} ${esc(r.niche)}</span>` : ''}
            ${r.goal ? `<span class="ref-tag">${csIcon('target',10)} ${esc(r.goal)}</span>` : ''}
            ${r.tone ? `<span class="ref-tag">${csIcon('swatch',10)} ${esc(r.tone)}</span>` : ''}
            ${tags.map(t => `<span class="ref-tag ref-tag-free">#${esc(t)}</span>`).join('')}
            <span class="ref-tag-mut">${blockCount} блоков · ${sizeKb} KB</span>
          </div>
          ${r.notes ? `<div class="ref-card-notes">${esc(r.notes)}</div>` : ''}
        </div>
        <div class="ref-card-actions">
          <button class="icon-btn" onclick="editReference(${idx})" title="Описание / стиль">${csIcon('pen',12)}</button>
          <button class="icon-btn" onclick="useReferenceAsProfile(${idx})" title="Загрузить как профиль">${csIcon('folder',12)}</button>
          <button class="icon-btn" onclick="deleteReference(${idx})" title="Удалить">×</button>
        </div>
      </div>
    `;
  }).join('');
}

// Script type taxonomy
const REF_TYPE_LABELS = {
  'pre_collection': 'Pre-collection (до просрочки)',
  'soft_collection': 'Soft collection (ранняя)',
  'hard_collection': 'Hard collection (жёсткая)',
  'legal_collection': 'Legal / судебная',
  'tm_sales': 'TM — продажа',
  'tm_retention': 'TM — удержание',
  'welcome': 'Welcome / онбординг',
  'reminder': 'Напоминание',
  'survey': 'Опрос / NPS',
  'other': 'Другое'
};

function toggleRefActive(idx, active) {
  if (!aiReferences[idx]) return;
  aiReferences[idx].active = active;
  saveReferences();
  renderReferences();
}

function importReferenceFromCurrentProfile() {
  const p = data();
  if (!p) return;
  const name = prompt('Название эталона:', p.name + ' (эталон)');
  if (!name) return;
  const profileCopy = JSON.parse(JSON.stringify(p));
  delete profileCopy._migrated;
  aiReferences.push({
    id: 'ref_' + Date.now(),
    name,
    scriptType: '', niche: '', goal: '', tone: '', tags: [], notes: '',
    profile: profileCopy,
    active: true
  });
  saveReferences();
  renderReferences();
  toast(`✓ Эталон "${name}" добавлен. Заполните тип/сферу для лучшей генерации.`);
  // Auto-open editor to fill metadata
  setTimeout(() => openRefEditModal(aiReferences.length - 1), 300);
}

function importReferenceFromFile(e) {
  const file = e.target.files[0];
  if (!file) return;
  const r = new FileReader();
  r.onload = (ev) => {
    try {
      const p = JSON.parse(ev.target.result);
      if (!p.blocks || !Array.isArray(p.blocks) || !p.blocks.length) {
        throw new Error('Неверный формат: нужен JSON профиля с блоками');
      }
      const name = prompt('Название эталона:', p.name || file.name.replace(/\.json$/, ''));
      if (!name) return;
      delete p._migrated;
      aiReferences.push({
        id: 'ref_' + Date.now(),
        name,
        scriptType: '', niche: '', goal: '', tone: '', tags: [], notes: '',
        profile: p,
        active: true
      });
      saveReferences();
      renderReferences();
      toast(`✓ Эталон "${name}" загружен (${p.blocks.length} блоков)`);
      setTimeout(() => openRefEditModal(aiReferences.length - 1), 300);
    } catch (err) {
      toast('Ошибка импорта: ' + err.message, 'error');
    }
  };
  r.readAsText(file);
  e.target.value = '';
}

function editReference(idx) {
  const r = aiReferences[idx];
  if (!r) return;
  openRefEditModal(idx);
}

function openRefEditModal(idx) {
  const r = aiReferences[idx];
  if (!r) return;
  const tags = Array.isArray(r.tags) ? r.tags.join(', ') : '';
  const typeOptions = Object.entries(REF_TYPE_LABELS).map(([val, label]) =>
    `<option value="${val}" ${r.scriptType === val ? 'selected' : ''}>${esc(label)}</option>`
  ).join('');

  const html = `
    <div class="modal" style="max-width: 540px;">
      <div class="modal-head">
        <div class="modal-title">${csIcon('pen',14)} Описание эталона</div>
        <button class="icon-btn" onclick="closeRefEditModal()">×</button>
      </div>
      <div class="modal-body">
        <div class="field">
          <label class="field-label">Название</label>
          <input type="text" id="ref-edit-name" class="input" value="${esc(r.name || '')}" style="width:100%;">
        </div>
        <div class="field" style="margin-top: 12px;">
          <label class="field-label">${csIcon('clipboard',12)} Тип скрипта</label>
          <select id="ref-edit-type" class="input" style="width:100%;">
            <option value="">— не указан —</option>
            ${typeOptions}
          </select>
        </div>
        <div style="display: flex; gap: 10px; margin-top: 12px;">
          <div class="field" style="flex:1;">
            <label class="field-label">${csIcon('building',12)} Сфера / ниша</label>
            <input type="text" id="ref-edit-niche" class="input" value="${esc(r.niche || '')}" placeholder="микрозайм, кредит, депозит..." style="width:100%;">
          </div>
          <div class="field" style="flex:1;">
            <label class="field-label">${csIcon('target',12)} Цель</label>
            <input type="text" id="ref-edit-goal" class="input" value="${esc(r.goal || '')}" placeholder="взыскание, продажа..." style="width:100%;">
          </div>
        </div>
        <div class="field" style="margin-top: 12px;">
          <label class="field-label">${csIcon('swatch',12)} Тон общения</label>
          <input type="text" id="ref-edit-tone" class="input" value="${esc(r.tone || '')}" placeholder="формальный / дружелюбный / настойчивый" style="width:100%;">
        </div>
        <div class="field" style="margin-top: 12px;">
          <label class="field-label"># Свободные теги (через запятую)</label>
          <input type="text" id="ref-edit-tags" class="input" value="${esc(tags)}" placeholder="avo, физлица, B2C, 2024" style="width:100%;">
        </div>
        <div class="field" style="margin-top: 12px;">
          <label class="field-label">${csIcon('pen',12)} Заметки про стиль (важно для AI!)</label>
          <textarea id="ref-edit-notes" class="textarea" style="min-height: 90px; width:100%;" placeholder="Что особенного в этом скрипте: счётчики повторов intent_2/intent_3, на 3-й попытке жёсткие формулировки с упоминанием суда, UZ всегда латиницей, использует {APP_NAME}...">${esc(r.notes || '')}</textarea>
        </div>
      </div>
      <div class="modal-actions">
        <button class="btn" onclick="closeRefEditModal()">Отмена</button>
        <button class="btn btn-primary" onclick="saveRefEdit(${idx})">${csIcon('save',12)} Сохранить</button>
      </div>
    </div>
  `;

  let modal = document.getElementById('ref-edit-modal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'ref-edit-modal';
    modal.className = 'modal-backdrop';
    document.body.appendChild(modal);
  }
  modal.innerHTML = html;
  modal.style.display = 'flex';
}

function closeRefEditModal() {
  const m = document.getElementById('ref-edit-modal');
  if (m) m.remove();
}

function saveRefEdit(idx) {
  const r = aiReferences[idx];
  if (!r) return;
  r.name = document.getElementById('ref-edit-name').value.trim() || r.name;
  r.scriptType = document.getElementById('ref-edit-type').value;
  r.niche = document.getElementById('ref-edit-niche').value.trim();
  r.goal = document.getElementById('ref-edit-goal').value.trim();
  r.tone = document.getElementById('ref-edit-tone').value.trim();
  const tagsRaw = document.getElementById('ref-edit-tags').value.trim();
  r.tags = tagsRaw ? tagsRaw.split(',').map(t => t.trim()).filter(Boolean) : [];
  r.notes = document.getElementById('ref-edit-notes').value.trim();
  saveReferences();
  renderReferences();
  closeRefEditModal();
  toast('✓ Эталон обновлён');
}

function deleteReference(idx) {
  const r = aiReferences[idx];
  if (!r) return;
  if (!confirm(`Удалить эталон "${r.name}"?`)) return;
  aiReferences.splice(idx, 1);
  saveReferences();
  renderReferences();
  toast('Эталон удалён');
}

function useReferenceAsProfile(idx) {
  const r = aiReferences[idx];
  if (!r) return;
  if (!confirm(`Загрузить эталон "${r.name}" как новый редактируемый профиль?`)) return;
  snapshot('Загрузка эталона как профиля');
  const profileCopy = JSON.parse(JSON.stringify(r.profile));
  let name = r.name;
  if (profiles[name]) name += ' ' + Date.now().toString().slice(-4);
  profileCopy.name = name;
  profiles[name] = profileCopy;
  activeProfile = name;
  renderProfiles(); renderBlocks(); renderVars(); renderStats();
  toast(`✓ Загружено как профиль "${name}"`);
}

// ═══════════════════════════════════════════════════════════════
// AI REVIEW — analyze current profile and suggest improvements
// ═══════════════════════════════════════════════════════════════
async function runAIReview() {
  if (!llmSettings.apiKey) {
    openLLMSettings();
    toast('Сначала настройте API ключ', 'error');
    return;
  }
  const d = data();
  if (!d.blocks.length) { toast('Профиль пустой — нечего проверять', 'error'); return; }

  // Show modal in loading state
  document.getElementById('ai-review-modal').style.display = 'flex';
  document.getElementById('review-content').innerHTML = `
    <div class="ai-loading" style="padding: 40px 20px;">
      <div class="ai-spinner"></div>
      <span>AI проверяет ваш скрипт... (15-30 сек)</span>
    </div>
  `;

  // Compact script: keep only what matters for review
  const compact = {
    name: d.name,
    vars: d.vars,
    blocks: d.blocks.map(b => ({
      id: b.id,
      title: b.title,
      intent: b.intent,
      type: b.type,
      ru: b.ru,
      uz: b.uz,
      branches: (b.branches || []).map(br => ({ label: br.label, next: br.next }))
    }))
  };

  // Active references (used as "good style examples")
  const activeRefs = aiReferences.filter(r => r.active);
  let refsSection = '';
  if (activeRefs.length) {
    const refsCompact = activeRefs.map(r => { const rp = getRefProfile(r); const bl = rp?.blocks || []; return `Эталон "${r.name}" (${r.notes || 'наш фирменный стиль'}): ${bl.length} блоков, intents: ${[...new Set(bl.map(b => b.intent).filter(Boolean))].slice(0, 20).join(', ')}`; }).join('\n');
    refsSection = `\n\nДля сравнения, наши эталонные скрипты:\n${refsCompact}\n\nЕсли проверяемый скрипт сильно отличается по структуре от эталонов (не хватает важных интентов, нет счётчиков повторов и т.п.) — отметь это.`;
  }

  const userPrompt = fillTemplate(aiPrompts.review_user, {
    name: d.name,
    blockCount: d.blocks.length,
    scriptJson: JSON.stringify(compact, null, 2),
    referencesSection: refsSection
  });

  try {
    const raw = await aiGenerate(aiPrompts.review_system, userPrompt, {
      json: true,
      temperature: 0.3,
      maxTokens: 8000
    });
    let parsed;
    try { parsed = JSON.parse(raw); } catch {
      const m = raw.match(/\{[\s\S]*\}/);
      if (!m) throw new Error('Не могу распарсить JSON');
      parsed = JSON.parse(m[0]);
    }
    renderReviewResults({
      issues: parsed.issues || [],
      summary: parsed.summary || '',
      score: parsed.score,
      strengths: Array.isArray(parsed.strengths) ? parsed.strengths : []
    });
  } catch (err) {
    document.getElementById('review-content').innerHTML = `
      <div style="padding: 30px; text-align:center; color:#dc2626;">
        <div style="font-size:42px;">${csIcon('warn',40)}</div>
        <h3>Ошибка проверки</h3>
        <p>${esc(err.message)}</p>
      </div>
    `;
  }
}

let lastReviewIssues = [];

function renderReviewResults(result) {
  // Back-compat: accept both the old array shape and the new verdict object
  const res = Array.isArray(result) ? { issues: result } : (result || {});
  const issues = res.issues || [];
  const sevLabels = { high: 'Критично', medium: 'Важно', low: 'Мелочь' };
  const sevIcons = { high: csSevDiamond('#dc2626'), medium: csSevDiamond('#f59e0b'), low: csSevDiamond('#9ca3af') };

  // Sort by severity FIRST, then remember: fix buttons reference indices in this array
  issues.sort((a, b) => {
    const order = { high: 0, medium: 1, low: 2 };
    return (order[a.severity] ?? 3) - (order[b.severity] ?? 3); // ?? not ||: high=0 is falsy!
  });
  lastReviewIssues = issues;

  // Verdict header: score + summary + strengths
  let head = '';
  const scoreNum = Number(res.score);
  const sc = Number.isFinite(scoreNum) ? Math.max(1, Math.min(10, Math.round(scoreNum))) : null;
  if (sc !== null || res.summary || (res.strengths && res.strengths.length)) {
    const scColor = sc === null ? 'var(--tx-tertiary)' : sc >= 8 ? '#16a34a' : sc >= 5 ? '#f59e0b' : '#dc2626';
    head = `
      <div style="display:flex; gap:14px; align-items:flex-start; padding:14px; border:1px solid var(--bd-default); border-radius:10px; margin-bottom:14px;">
        ${sc !== null ? `<div style="min-width:64px; text-align:center;"><div style="font-size:26px; font-weight:800; color:${scColor};">${sc}/10</div><div style="font-size:10px; color:var(--tx-tertiary); letter-spacing:0.4px;">ОЦЕНКА</div></div>` : ''}
        <div style="flex:1;">
          ${res.summary ? `<div style="font-size:13px; line-height:1.55;">${esc(res.summary)}</div>` : ''}
          ${(res.strengths || []).map(st => `<div style="font-size:12px; color:#16a34a; margin-top:4px;">✓ ${esc(st)}</div>`).join('')}
        </div>
      </div>`;
  }

  let html = '';
  if (!issues.length) {
    html = head + `
      <div style="padding: 30px 20px; text-align: center;">
        <div style="font-size: 56px; margin-bottom: 12px;">${csIcon('checkDiamond',48,'color:#16a34a;')}</div>
        <h3>Скрипт выглядит отлично!</h3>
        <p style="color:#6b7280;">AI не нашёл серьёзных проблем.</p>
      </div>
    `;
  } else {
    const counts = { high: 0, medium: 0, low: 0 };
    issues.forEach(i => { if (counts[i.severity] !== undefined) counts[i.severity]++; });

    html = head + `
      <div class="review-summary">
        ${counts.high ? `<span class="review-count high">${counts.high} критичных</span>` : ''}
        ${counts.medium ? `<span class="review-count medium">${counts.medium} важных</span>` : ''}
        ${counts.low ? `<span class="review-count low">${counts.low} мелких</span>` : ''}
      </div>
      <div class="review-list">
        ${issues.map((iss, i) => `
          <div class="review-issue sev-${iss.severity || 'low'}">
            <div class="review-issue-head">
              <span class="review-issue-icon">${sevIcons[iss.severity] || csSevDiamond('#9ca3af')}</span>
              <span class="review-issue-sev">${sevLabels[iss.severity] || 'Замечание'}</span>
              ${iss.blockId ? `<span class="review-issue-block" onclick="jumpToBlockFromReview('${esc(iss.blockId)}')">${csIcon('pin',10)} ${esc(iss.blockId)}</span>` : ''}
              ${iss.type ? `<span class="review-issue-type">${esc(iss.type)}</span>` : ''}
            </div>
            <div class="review-issue-msg">${esc(iss.message || '')}</div>
            ${iss.suggestion ? `<div class="review-issue-sugg">${csIcon('spark',11)} ${esc(iss.suggestion)}</div>` : ''}
            ${iss.blockId ? `<div style="margin-top:8px;"><button id="fix-issue-btn-${i}" class="btn btn-sm" onclick="fixIssueFromReview(${i})" title="AI перепишет тексты этого блока (ru и uz) с учётом проблемы. Откат — Ctrl+Z">${csIcon('spark',11)} Исправить</button></div>` : ''}
          </div>
        `).join('')}
      </div>
    `;
  }
  document.getElementById('review-content').innerHTML = html;
}

// One-click fix: rewrite the offending block's texts via the improve prompts,
// using the issue's message+suggestion as the task. Undo-able via Ctrl+Z.
async function fixIssueFromReview(idx) {
  const iss = lastReviewIssues[idx];
  if (!iss || !iss.blockId) return;
  const d = data();
  const b = d.blocks.find(x => x.id === iss.blockId);
  if (!b) { toast('Блок не найден: ' + iss.blockId, 'error'); return; }
  const btn = document.getElementById('fix-issue-btn-' + idx);
  if (btn) { btn.disabled = true; btn.innerHTML = 'Исправляю…'; }
  try {
    const task = (iss.message || 'Улучшить блок') + (iss.suggestion ? ('. Как исправить: ' + iss.suggestion) : '');
    const userPrompt = fillTemplate(aiPrompts.improve_user, {
      title: b.title || '',
      type: b.type || 'normal',
      intent: b.intent || '',
      currentRu: b.ru || '',
      currentUz: b.uz || '',
      task
    });
    const raw = await aiGenerate(aiPrompts.improve_system, userPrompt, { json: true, temperature: 0.6, maxTokens: 2500 });
    let parsed;
    try { parsed = JSON.parse(raw); } catch {
      const m = raw.match(/\{[\s\S]*\}/);
      if (!m) throw new Error('Не могу распарсить ответ AI');
      parsed = JSON.parse(m[0]);
    }
    if (!parsed.ru && !parsed.uz) throw new Error('AI не вернул новые тексты');
    snapshot('AI-исправление блока');
    if (parsed.ru) b.ru = parsed.ru;
    if (parsed.uz) b.uz = parsed.uz;
    saveToStorage();
    if (typeof renderBlocks === 'function') renderBlocks();
    if (typeof canvasRender === 'function') canvasRender();
    if (typeof renderStats === 'function') renderStats();
    if (btn) { btn.textContent = '✓ Исправлено'; }
    toast(`✓ Блок «${b.title || b.id}» переписан (Ctrl+Z — откатить)`);
  } catch (err) {
    toast('Ошибка исправления: ' + err.message, 'error');
    if (btn) { btn.disabled = false; btn.innerHTML = csIcon('spark',11) + ' Исправить'; }
  }
}

function closeAIReview() {
  document.getElementById('ai-review-modal').style.display = 'none';
}

function jumpToBlockFromReview(blockId) {
  closeAIReview();
  // Switch to canvas and select block
  const canvasTab = document.querySelector('[data-tab="canvas"]');
  if (canvasTab) switchTab('canvas', canvasTab);
  setTimeout(() => {
    canvasState.selectedId = blockId;
    canvasRender();
    renderCanvasSidebar(blockId);
    // Try to scroll to it
    const b = data().blocks.find(x => x.id === blockId);
    if (b && typeof b.x === 'number') {
      const viewport = document.getElementById('canvas-viewport');
      if (viewport) {
        canvasState.panX = viewport.clientWidth / 2 - (b.x + 95) * canvasState.zoom;
        canvasState.panY = viewport.clientHeight / 2 - (b.y + 32) * canvasState.zoom;
        applyCanvasTransform();
      }
    }
  }, 200);
}

// ═══════════════════════════════════════════════════════════════
// PROMPTS EDITOR — let user customize the prompts
// ═══════════════════════════════════════════════════════════════
function openPromptsEditor() {
  const modal = document.getElementById('prompts-modal');
  // Fill all textareas
  document.getElementById('pr-generate-system').value = aiPrompts.generate_system;
  document.getElementById('pr-generate-user').value = aiPrompts.generate_user;
  document.getElementById('pr-improve-system').value = aiPrompts.improve_system;
  document.getElementById('pr-improve-user').value = aiPrompts.improve_user;
  document.getElementById('pr-review-system').value = aiPrompts.review_system;
  document.getElementById('pr-review-user').value = aiPrompts.review_user;
  modal.style.display = 'flex';
}

function closePromptsEditor() {
  document.getElementById('prompts-modal').style.display = 'none';
}

function savePromptsFromEditor() {
  aiPrompts.generate_system = document.getElementById('pr-generate-system').value;
  aiPrompts.generate_user = document.getElementById('pr-generate-user').value;
  aiPrompts.improve_system = document.getElementById('pr-improve-system').value;
  aiPrompts.improve_user = document.getElementById('pr-improve-user').value;
  aiPrompts.review_system = document.getElementById('pr-review-system').value;
  aiPrompts.review_user = document.getElementById('pr-review-user').value;
  savePrompts();
  closePromptsEditor();
  toast('✓ Промпты сохранены');
}

function resetPromptsToDefault() {
  if (!confirm('Сбросить все промпты к значениям по умолчанию? Ваши изменения будут потеряны.')) return;
  aiPrompts = { ...DEFAULT_PROMPTS };
  savePrompts();
  openPromptsEditor();  // refresh textareas
  toast('Промпты сброшены к значениям по умолчанию');
}

function resetSinglePrompt(key) {
  if (!DEFAULT_PROMPTS[key]) return;
  if (!confirm(`Сбросить этот промпт к значению по умолчанию?`)) return;
  aiPrompts[key] = DEFAULT_PROMPTS[key];
  savePrompts();
  // Update textarea
  const tid = 'pr-' + key.replace('_', '-');
  const ta = document.getElementById(tid);
  if (ta) ta.value = aiPrompts[key];
  toast('Промпт сброшен');
}

// ═══════════════════════════════════════════════════════════════
// INIT — с проверкой авторизации
// ═══════════════════════════════════════════════════════════════

// Запускает само приложение (вызывается после успешной авторизации)
async function bootApp() {
  // 1. Сначала локальный кеш (быстро)
  let restored = loadFromStorage();
  pushVersionBackup('старт сессии');
  updateRailProfile();

  // 2. Пробуем подтянуть из облака (источник истины для команды)
  let fromCloud = false;
  try {
    fromCloud = await cloudPullProfiles();
  } catch (e) { console.error('Cloud pull failed:', e); }

  if (fromCloud) {
    restored = true;
    saveToStorage(); // обновить локальный кеш облачными данными
    setTimeout(() => {
      const count = Object.keys(profiles).length;
      toast(`Загружено из облака: ${count} ${count === 1 ? 'профиль' : 'профилей'}`, 'success');
    }, 300);
  } else if (restored) {
    setTimeout(() => {
      const count = Object.keys(profiles).length;
      const blockCount = data()?.blocks?.length || 0;
      toast(`✓ Восстановлено ${count} ${count === 1 ? 'профиль' : 'профиля'} · ${blockCount} блоков`, 'success');
    }, 300);
    // Локальные есть, облачных нет → выгрузить локальные в облако (первая синхронизация)
    if (getCurrentUserId()) setTimeout(cloudPushProfiles, 1500);
  }

  loadLLMSettings();
  loadReferences();
  loadPrompts();
  loadCustomStyles();
  // Pull cloud settings (API key, prompts, custom styles) so they sync across devices
  try {
    if (typeof cloudLoadSettings === 'function' && getCurrentUserId()) {
      const s = await cloudLoadSettings();
      if (s) {
        if (s.llm_settings && s.llm_settings.apiKey) {
          Object.assign(llmSettings, s.llm_settings);
          try { localStorage.setItem(LLM_SETTINGS_KEY, JSON.stringify(llmSettings)); } catch (e) {}
        }
        if (s.prompts) {
          if (s.prompts._customStyles && Object.keys(s.prompts._customStyles).length) {
            customStyles = s.prompts._customStyles;
            try { localStorage.setItem(CUSTOM_STYLES_KEY, JSON.stringify(customStyles)); } catch (e) {}
          }
          const { _customStyles, ...promptsOnly } = s.prompts;
          if (Object.keys(promptsOnly).length) {
            aiPrompts = { ...aiPrompts, ...promptsOnly };
          }
        }
      }
    }
  } catch (e) { console.error('Cloud settings load failed:', e); }
  // Подтянуть эталоны из облака
  try { await cloudPullReferences(); } catch (e) { console.error(e); }
  renderProfiles();
  renderStats();
  renderBlocks();
  updateAutosaveIndicator(autosave.lastSaveAt ? 'saved' : 'dirty');
  updateAIStatusBadge();
  if (!restored) setTimeout(saveToStorage, 1000);
}

function showAuthScreen() {
  document.getElementById('auth-screen').style.display = 'flex';
  document.getElementById('app-root').style.display = 'none';
}
function showApp() {
  document.getElementById('auth-screen').style.display = 'none';
  document.getElementById('app-root').style.display = '';
  const so = document.getElementById('signout-btn');
  if (so) so.style.display = 'flex';
}

function handlePasswordLogin() {
  const email = document.getElementById('auth-email').value.trim();
  const password = document.getElementById('auth-password').value;
  const hint = document.getElementById('auth-email-hint');
  if (!email || !email.includes('@')) {
    hint.textContent = 'Введите корректный email';
    hint.style.color = 'var(--err)';
    return;
  }
  if (!password) {
    hint.textContent = 'Введите пароль';
    hint.style.color = 'var(--err)';
    return;
  }
  hint.textContent = 'Вход...';
  hint.style.color = 'var(--tx-secondary)';
  signInWithPassword(email, password).then(res => {
    if (res.ok) {
      hint.textContent = '✓ Успешно';
      hint.style.color = 'var(--ok)';
      // onAuthChange покажет приложение
    } else {
      let msg = res.msg;
      if (/invalid login credentials/i.test(msg)) msg = 'Неверный email или пароль. Если вы не регистрировались — нажмите «Регистрация».';
      hint.textContent = msg;
      hint.style.color = 'var(--err)';
    }
  });
}

function handlePasswordSignup() {
  const email = document.getElementById('auth-email').value.trim();
  const password = document.getElementById('auth-password').value;
  const hint = document.getElementById('auth-email-hint');
  if (!email || !email.includes('@')) {
    hint.textContent = 'Введите корректный email';
    hint.style.color = 'var(--err)';
    return;
  }
  if (!password || password.length < 6) {
    hint.textContent = 'Пароль минимум 6 символов';
    hint.style.color = 'var(--err)';
    return;
  }
  hint.textContent = 'Регистрация...';
  hint.style.color = 'var(--tx-secondary)';
  signUpWithPassword(email, password).then(res => {
    if (res.ok) {
      if (res.needsConfirm) {
        hint.textContent = '✓ Аккаунт создан! Подтвердите email по ссылке из письма, затем войдите.';
        hint.style.color = 'var(--ok)';
      } else {
        hint.textContent = '✓ Аккаунт создан, входим...';
        hint.style.color = 'var(--ok)';
      }
    } else {
      let msg = res.msg;
      if (/already registered/i.test(msg)) msg = 'Этот email уже зарегистрирован — нажмите «Войти».';
      hint.textContent = msg;
      hint.style.color = 'var(--err)';
    }
  });
}

// ─── Старт: проверяем авторизацию ───
(async function startup() {
  initSupabase();
  if (!sb) {
    // Supabase не загрузился → локальный режим (без входа)
    showApp();
    bootApp();
    return;
  }

  const user = await checkAuthSession();
  if (user) {
    showApp();
    if (!window._appBooted) { window._appBooted = true; bootApp(); }
  } else {
    showAuthScreen();
  }

  // Реагируем на вход/выход (но bootApp — только один раз за сессию страницы)
  onAuthChange((event, u) => {
    if (event === 'SIGNED_IN' && u) {
      showApp();
      if (!window._appBooted) { window._appBooted = true; bootApp(); }
    } else if (event === 'SIGNED_OUT') {
      window._appBooted = false;
      showAuthScreen();
    }
    // TOKEN_REFRESHED, USER_UPDATED и пр. — игнорируем, чтобы не сбрасывать профиль
  });
})();
