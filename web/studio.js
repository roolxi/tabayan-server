'use strict';
const $ = s => document.querySelector(s);
let mode = 'quran', controller = null, sequence = 0, file = null;
const drafts = { quran: '', hadith: '' };
const examples = {
  quran: ['فإن مع العسر يسرا', 'وقل رب زدني علما'],
  hadith: ['إنما الأعمال بالنيات', 'من كان يؤمن بالله واليوم الآخر']
};

function node(tag, cls, text) {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text !== undefined) n.textContent = text;
  return n;
}

function stop() {
  sequence++;
  if (controller) controller.abort();
  controller = null;
  $('#submit').disabled = false;
}

function selectMode(next) {
  drafts[mode] = $('#query').value;
  stop();
  mode = next;
  $('#results-section').hidden = true;
  document.querySelectorAll('[data-tab]').forEach(b => {
    const on = b.dataset.tab === mode;
    b.classList.toggle('active', on);
    b.setAttribute('aria-selected', on);
    b.tabIndex = on ? 0 : -1;
  });
  $('#search-panel').setAttribute('aria-labelledby', 'tab-' + mode);
  $('#text-fields').hidden = mode === 'image';
  $('#image-fields').hidden = mode !== 'image';
  $('#examples').hidden = mode === 'image';
  $('#query').value = drafts[mode] || '';
  $('#count').textContent = $('#query').value.length;
  $('.input-label').textContent = mode === 'hadith' ? 'اكتب الحديث أو جزءًا منه' : 'اكتب الآية أو جزءًا منها';
  $('#query').placeholder = 'مثال: ' + (examples[mode]?.[0] || '');
  $('#submit-label').textContent = mode === 'image' ? 'استخراج النص والتحقّق' : 'تبيّن من النص';
  $('#examples').replaceChildren(node('span', '', 'جرّب الآن'));
  (examples[mode] || []).forEach(t => {
    const b = node('button', '', t + ' ↖');
    b.type = 'button';
    b.onclick = () => {
      $('#query').value = t;
      $('#query').dispatchEvent(new Event('input'));
      $('#search-form').requestSubmit();
    };
    $('#examples').append(b);
  });
}

document.querySelectorAll('[data-tab]').forEach(b => {
  b.onclick = () => selectMode(b.dataset.tab);
  b.onkeydown = e => {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) return;
    e.preventDefault();
    const tabs = [...document.querySelectorAll('[data-tab]')];
    let i = tabs.indexOf(b);
    i = e.key === 'Home' ? 0 : e.key === 'End' ? 2 : (i + (e.key === 'ArrowLeft' ? 1 : 2)) % 3;
    selectMode(tabs[i].dataset.tab);
    tabs[i].focus();
  };
});

$('#query').oninput = () => {
  $('#count').textContent = $('#query').value.length;
};

function showStatus(message, error = false) {
  $('#results-section').hidden = false;
  $('#status').replaceChildren();
  $('#status').classList.toggle('error', error);
  $('#status').textContent = message;
}

function chooseFile(f) {
  if (!f) return;
  stop();
  const extension = f.name.split('.').pop().toLowerCase();
  const isImage = ['image/jpeg', 'image/png', 'image/webp'].includes(f.type) || (!f.type && ['jpg', 'jpeg', 'png', 'webp'].includes(extension));
  const isVideo = ['video/mp4', 'video/quicktime', 'video/webm'].includes(f.type) || (!f.type && ['mp4', 'mov', 'webm'].includes(extension));
  if ((!isImage && !isVideo) || f.size > (isVideo ? 40 : 8) * 1024 * 1024) {
    file = null;
    $('#image-file').value = '';
    $('#file-label').textContent = 'أضف صورة أو فيديو يحتوي على آية أو حديث';
    showStatus('اختر صورة JPG أو PNG أو WEBP حتى 8 MB، أو فيديو MP4 أو MOV أو WEBM حتى 40 MB و3 دقائق.', true);
    return;
  }
  file = f;
  $('#file-label').textContent = f.name;
}

$('#image-file').onchange = e => chooseFile(e.target.files[0]);
$('#dropzone').ondragover = e => {
  e.preventDefault();
  $('#dropzone').classList.add('drag');
};
$('#dropzone').ondragleave = () => $('#dropzone').classList.remove('drag');
$('#dropzone').ondrop = e => {
  e.preventDefault();
  $('#dropzone').classList.remove('drag');
  chooseFile(e.dataTransfer.files[0]);
};

function link(text, url) {
  const a = node('a', 'source-link', text);
  try {
    const u = new URL(url);
    if (!['https:', 'http:'].includes(u.protocol)) return node('span', '', text);
    a.href = u.href;
  } catch {
    return node('span', '', text);
  }
  a.target = '_blank';
  a.rel = 'noopener noreferrer';
  return a;
}

function records(card, items) {
  for (const r of items || []) {
    const d = node('div', 'record');
    d.append(node('strong', '', r.grade || 'راجع حكم المحدّث في المصدر'));
    if (r.scholar) d.append(node('div', '', 'المحدّث: ' + r.scholar));
    const details = node('details');
    details.append(node('summary', '', 'تفاصيل الرواية'));
    for (const [k, l] of [['narrator', 'الراوي'], ['book', 'المصدر'], ['reference', 'الصفحة أو الرقم'], ['takhrij', 'التخريج'], ['gradeExplanation', 'توضيح الحكم']]) {
      if (r[k]) details.append(node('p', '', l + ': ' + r[k]));
    }
    if (r.sourceUrl) details.append(link('عرض الرواية في المصدر ↗', r.sourceUrl));
    d.append(details);
    card.append(d);
  }
}

function card(text, type, meta, url, items) {
  const c = node('article', 'result-card');
  const head = node('div', 'result-meta');
  head.append(node('span', 'result-type', type === 'quran' ? 'القرآن الكريم' : 'الحديث الشريف'), node('span', '', meta));
  c.append(head, node('p', 'verse', text));
  if (items) records(c, items);
  const bottom = node('div', 'result-bottom');
  bottom.append(link('الرجوع إلى المصدر ↗', url));
  const copy = node('button', 'copy-button', 'نسخ النص');
  copy.type = 'button';
  copy.onclick = async () => {
    try {
      await navigator.clipboard.writeText(text + '\n' + meta + '\n' + url);
      copy.textContent = 'تم النسخ';
    } catch {
      copy.textContent = 'حدّد النص لنسخه';
    }
  };
  bottom.append(copy);
  c.append(bottom);
  $('#results').append(c);
}

function render(data, kind) {
  $('#results').replaceChildren();
  showStatus(data.message || '');
  $('#results-title').textContent = kind === 'image' ? 'النصوص المطابقة للمصادر' : 'نتائج البحث';
  if (kind === 'quran') {
    for (const r of data.results || []) {
      card(r.text_uthmani, 'quran', 'سورة ' + r.surah_name + ' · الآية ' + r.ayah, 'https://tanzil.net/#' + r.verse_key);
    }
  } else if (kind === 'image') {
    for (const r of data.results || []) {
      if (!r.verified || !r.displayText) continue;
      const s = r.source || {};
      card(r.displayText, r.type, r.type === 'quran' ? 'سورة ' + s.surahName + ' · الآية ' + s.ayah : 'الدرر السنية', r.type === 'quran' ? 'https://tanzil.net/#' + s.verseKey : s.url, r.records);
      if (r.mixedCategories) showStatus('توجد أحكام مختلفة بين الروايات؛ راجع تفاصيل كل رواية ومصدرها.');
    }
  } else {
    const p = data.simplePresentation;
    if (p?.selected) {
      card(p.selected.text, 'hadith', 'الدرر السنية', data.sourceUrl, p.selected.records);
      for (const a of p.alternates || []) {
        card(a.text, 'hadith', 'رواية أخرى · الدرر السنية', data.sourceUrl, a.records);
      }
    } else {
      for (const r of data.results || []) {
        card(r.text, 'hadith', 'الدرر السنية', r.sourceUrl || data.sourceUrl, [r]);
      }
    }
  }
  if (!$('#results').children.length && !data.message) {
    showStatus('لم نجد نصًا مطابقًا. جرّب كلمات أقصر؛ عدم ظهور نتيجة لا يُعدّ حكمًا على النص.');
  }
}

$('#search-form').onsubmit = async e => {
  e.preventDefault();
  const text = $('#query').value.trim();
  if (mode === 'image' ? !file : !text) {
    showStatus(mode === 'image' ? 'أضف صورة أو فيديو أولًا.' : 'اكتب عبارة للبحث أولًا.', true);
    return;
  }
  stop();
  const id = sequence;
  controller = new AbortController();
  const signal = controller.signal;
  const kind = mode;
  $('#results').replaceChildren();
  showStatus('');
  $('#results-title').textContent = 'نبحث في المصادر…';
  const loading = node('div', 'loader');
  loading.append(node('span', 'loader-ring'));
  const caption = node('div', '', kind === 'image' ? 'نستخرج النص من الوسائط ونطابقه بالمصادر…' : 'نبحث عن النص في المصدر…');
  caption.append(node('span', 'loading-detail', 'تظهر النتائج عند اكتمال الطلب.'));
  loading.append(caption);
  const cancel = node('button', 'cancel-button', 'إلغاء');
  cancel.type = 'button';
  cancel.onclick = () => {
    stop();
    showStatus('تم إلغاء البحث.');
  };
  loading.append(cancel);
  $('#status').append(loading);
  $('#submit').disabled = true;
  $('#results-section').scrollIntoView({
    behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
    block: 'start'
  });

  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    controller?.abort();
  }, 180000);

  try {
    let url, body, headers;
    if (kind === 'image') {
      url = '/api/media/extract';
      body = new FormData();
      body.append('file', file);
    } else {
      headers = { 'Content-Type': 'application/json' };
      url = '/api/' + kind + '/search';
      body = JSON.stringify(kind === 'hadith' ? { text, mode: 'simple' } : { text });
    }
    const response = await fetch(url, { method: 'POST', headers, body, signal });
    const data = await response.json();
    if (id !== sequence) return;
    if (!response.ok) {
      throw new Error(data.message || 'تعذّر إتمام الطلب. تأكّد من اتصال السيرفر وحاول مجددًا.');
    }
    render(data, kind);
  } catch (err) {
    if (id !== sequence) return;
    showStatus(timedOut ? (kind === 'image' ? 'استغرقت المعالجة وقتًا طويلًا. جرّب صورة أو مقطعًا أقصر.' : 'استغرق البحث وقتًا طويلًا. حاول بعبارة أقصر.') : err.name === 'AbortError' ? 'تم إلغاء البحث.' : err.message || 'تعذّر الاتصال بالسيرفر.', true);
  } finally {
    clearTimeout(timer);
    if (id === sequence) {
      controller = null;
      $('#submit').disabled = false;
    }
  }
};

$('#clear-results').onclick = () => {
  stop();
  $('#results-section').hidden = true;
  $('#query').focus();
};

$('#about-open').onclick = () => $('#about-dialog').showModal();
$('#about-close').onclick = () => $('#about-dialog').close();
$('#about-dialog').onclick = e => {
  if (e.target === $('#about-dialog')) {
    const r = e.target.getBoundingClientRect();
    if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) {
      e.target.close();
    }
  }
};

selectMode('quran');
