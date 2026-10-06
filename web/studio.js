'use strict';
const $ = s => document.querySelector(s);
let mode = 'quran', searchType = 'text', hadithMode = 'simple', controller = null, sequence = 0, file = null, mediaSource = 'file';

const drafts = {
  quran: { text: '', meaning: '' },
  hadith: { text: '', meaning: '' }
};

const examples = {
  quran: {
    text: ['فإن مع العسر يسرا', 'وقل رب زدني علما'],
    meaning: ['آية عن اليسر بعد العسر', 'آية في طلب زيادة العلم']
  },
  hadith: {
    text: ['إنما الأعمال بالنيات', 'من كان يؤمن بالله واليوم الآخر'],
    meaning: ['حديث عن النية والعمل', 'حديث عن إكرام الجار والضيف']
  }
};

let hadithMeaningState = {
  baseQuery: '',
  clarifications: []
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

function saveCurrentDraft() {
  if (mode !== 'image') {
    drafts[mode][searchType] = $('#query').value;
  }
}

function syncInputs() {
  document.querySelectorAll('[data-search-type]').forEach(btn => {
    const on = btn.dataset.searchType === searchType;
    btn.classList.toggle('active', on);
    btn.setAttribute('aria-checked', on ? 'true' : 'false');
  });

  const hadithModeSelector = $('#hadith-mode-selector');
  if (hadithModeSelector) {
    hadithModeSelector.hidden = mode !== 'hadith' || searchType === 'meaning';
  }
  document.querySelectorAll('[data-hadith-mode]').forEach(btn => {
    const on = btn.dataset.hadithMode === hadithMode;
    btn.classList.toggle('active', on);
    btn.setAttribute('aria-checked', on ? 'true' : 'false');
  });

  if (mode === 'image') {
    $('#submit-label').textContent = mediaSource === 'url' ? 'تبيّن' : 'تبيّن';
    return;
  }

  if (searchType === 'meaning') {
    $('.input-label').textContent = 'صف المعنى الذي تتذكّره…';
    $('#query').placeholder = mode === 'hadith'
      ? 'مثال: حديث عن ثواب إماطة الأذى أو الإحسان للجار'
      : 'مثال: آية عن أن بعد الشدة فرج ويسر';
    $('#submit-label').textContent = 'تبيّن';
  } else {
    $('.input-label').textContent = mode === 'hadith' ? 'اكتب الحديث أو جزءًا منه' : 'اكتب الآية أو جزءًا منها';
    $('#query').placeholder = 'مثال: ' + (examples[mode].text[0] || '');
    $('#submit-label').textContent = 'تبيّن';
  }

  $('#examples').replaceChildren(node('span', '', 'جرّب الآن'));
  const list = examples[mode]?.[searchType] || [];
  list.forEach(t => {
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

function selectMode(next) {
  saveCurrentDraft();
  stop();
  mode = next;
  hadithMeaningState = { baseQuery: '', clarifications: [] };
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
  if (mode !== 'image') {
    $('#query').value = drafts[mode][searchType] || '';
    $('#count').textContent = $('#query').value.length;
  }
  syncInputs();
}

function selectSearchType(nextType) {
  if (searchType === nextType) return;
  saveCurrentDraft();
  stop();
  searchType = nextType;
  hadithMeaningState = { baseQuery: '', clarifications: [] };
  $('#results-section').hidden = true;
  $('#query').value = drafts[mode][searchType] || '';
  $('#count').textContent = $('#query').value.length;
  syncInputs();
  $('#query').focus();
}

document.querySelectorAll('[data-tab]').forEach(b => {
  b.onclick = () => selectMode(b.dataset.tab);
  b.onkeydown = e => {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) return;
    e.preventDefault();
    const tabs = [...document.querySelectorAll('[data-tab]')];
    let i = tabs.indexOf(b);
    i = e.key === 'Home' ? 0 : e.key === 'End' ? tabs.length - 1 : (i + (e.key === 'ArrowLeft' ? 1 : tabs.length - 1)) % tabs.length;
    selectMode(tabs[i].dataset.tab);
    tabs[i].focus();
  };
});

document.querySelectorAll('[data-search-type]').forEach(btn => {
  btn.onclick = () => selectSearchType(btn.dataset.searchType);
});

function selectHadithMode(nextHadithMode) {
  if (hadithMode === nextHadithMode) return;
  stop();
  hadithMode = nextHadithMode;
  syncInputs();
  if ($('#query').value.trim() && searchType === 'text') {
    $('#search-form').requestSubmit();
  }
}

document.querySelectorAll('[data-hadith-mode]').forEach(btn => {
  btn.onclick = () => selectHadithMode(btn.dataset.hadithMode);
});

$('#query').oninput = () => {
  $('#count').textContent = $('#query').value.length;
  if (mode === 'hadith' && searchType === 'meaning') {
    const current = $('#query').value.trim();
    if (hadithMeaningState.baseQuery && current !== hadithMeaningState.baseQuery) {
      hadithMeaningState = { baseQuery: '', clarifications: [] };
      const clarPanel = $('#results .clarification-panel');
      if (clarPanel) clarPanel.remove();
    }
  }
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
    details.append(node('summary', '', 'الراوي والتخريج'));
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
  const p = node('p', 'verse');
  p.textContent = text;
  c.append(head, p);
  if (items) records(c, items);
  const bottom = node('div', 'result-bottom');
  bottom.append(link('المصدر ↗', url));
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
  $('#results-title').textContent = kind === 'hadith' && data.mode === 'specialist' ? 'نتائج وضع المتخصص' : 'من المصدر إليك';
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
    const isSimple = data.mode === 'simple';
    const p = data.simplePresentation;
    if (isSimple) {
      if (p?.selected) {
        const disclaimer = node('aside', 'pro-disclaimer-card');
        const dIcon = node('span', 'disclaimer-icon', '✦');
        const dText = node('div', 'disclaimer-body');
        dText.append(
          node('strong', '', 'العرض المبسّط'),
          node('p', '', 'النتائج معروضة من الصفحة الأولى في المصدر. لمزيد من التثبت والروايات وأقوال المحدثين وتخريج الأسانيد، يُفضّل الاطلاع على العرض المتخصص.')
        );
        const proBtn = node('button', 'pro-switch-btn', 'استكشف الروايات والتخريج');
        proBtn.type = 'button';
        proBtn.onclick = () => {
          hadithMode = 'specialist';
          syncInputs();
          executeDirectSearch(data.query || $('#query').value.trim());
        };
        disclaimer.append(dIcon, dText, proBtn);
        $('#results').append(disclaimer);

        card(p.selected.text, 'hadith', 'الدرر السنية · العرض المبسّط', data.sourceUrl, p.selected.records);
        for (const a of p.alternates || []) {
          card(a.text, 'hadith', 'رواية أخرى · الدرر السنية', data.sourceUrl, a.records);
        }
      } else {
        const noResultBox = node('div', 'no-results-pro-box');
        const heading = node('h3', '', 'لم نجد نتيجة في العرض المبسّط');
        const desc = node('p', '', data.hint || 'قد يكون الحديث موجودًا في الموسوعة الحديثية المتخصصة بألفاظ أو روايات أخرى.');
        const btnRow = node('div', 'pro-action-row');

        const tryProBtn = node('button', 'submit try-pro-btn', 'استكشف الروايات والتخريج');
        tryProBtn.type = 'button';
        tryProBtn.onclick = () => {
          hadithMode = 'specialist';
          syncInputs();
          executeDirectSearch(data.query || $('#query').value.trim());
        };

        const returnBtn = node('button', 'return-btn', 'تعديل عبارة البحث ←');
        returnBtn.type = 'button';
        returnBtn.onclick = () => {
          $('#query').focus();
          window.scrollTo({ top: 0, behavior: 'smooth' });
        };

        btnRow.append(tryProBtn, returnBtn);
        noResultBox.append(heading, desc, btnRow);
        $('#results').append(noResultBox);
      }
    } else {
      const specHeader = node('div', 'specialist-notice');
      specHeader.append(
        node('span', '', 'الموسوعة الحديثية المتخصصة — ' + (data.results?.length || 0) + ' نتيجة من المصدر')
      );
      const backToSimple = node('button', 'back-simple-btn', 'العودة للعرض الميسّر ←');
      backToSimple.type = 'button';
      backToSimple.onclick = () => {
        hadithMode = 'simple';
        syncInputs();
        executeDirectSearch(data.query || $('#query').value.trim());
      };
      specHeader.append(backToSimple);
      $('#results').append(specHeader);

      for (const r of data.results || []) {
        card(r.text, 'hadith', 'الموسوعة الحديثية · الدرر السنية', r.sourceUrl || data.sourceUrl, [r]);
      }
      if (!data.results || data.results.length === 0) {
        showStatus(data.message || 'لم نجد نتائج لهذا البحث في العرض المتخصص. جرّب كلمات أخرى من الحديث.');
        const returnBtn = node('button', 'return-btn', 'تعديل عبارة البحث ←');
        returnBtn.type = 'button';
        returnBtn.onclick = () => {
          $('#query').focus();
          window.scrollTo({ top: 0, behavior: 'smooth' });
        };
        $('#results').append(returnBtn);
      }
    }
  }
  if (!$('#results').children.length && !data.message) {
    showStatus('لم نجد نصًا مطابقًا. جرّب كلمات أقصر؛ عدم ظهور نتيجة لا يُعدّ حكمًا على النص.');
  }
}

function renderQuranSuggestions(candidates) {
  $('#results').replaceChildren();
  $('#results-title').textContent = 'عبارات بحث مقترحة';
  showStatus('عبارات مقترحة للبحث، وليست نصوصًا موثّقة بعد. اختر عبارة لتأكيد نصها في المصحف:');
  candidates.forEach(cand => {
    const c = node('article', 'result-card candidate-card');
    const head = node('div', 'result-meta');
    head.append(node('span', 'result-type', 'اقتراح بحث'));
    const p = node('p', 'candidate-phrase');
    p.textContent = cand;
    const bottom = node('div', 'result-bottom');
    const btn = node('button', 'submit candidate-pick-btn', 'تحقّق من المصدر ←');
    btn.type = 'button';
    btn.onclick = () => {
      searchQuranCandidate(cand);
    };
    bottom.append(btn);
    c.append(head, p, bottom);
    $('#results').append(c);
  });
}

async function searchQuranCandidate(phrase) {
  stop();
  const id = sequence;
  controller = new AbortController();
  const signal = controller.signal;
  $('#results').replaceChildren();
  showStatus('');
  $('#results-title').textContent = 'نبحث في المصحف الشريف…';
  const loading = node('div', 'loader');
  loading.append(node('span', 'loader-ring'));
  const caption = node('div', '', 'نتحقق من نص الآية في قاعدة بيانات المصحف…');
  loading.append(caption);
  $('#status').append(loading);
  $('#submit').disabled = true;

  try {
    const response = await fetch('/api/quran/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: phrase }),
      signal
    });
    const data = await response.json();
    if (id !== sequence) return;
    if (!response.ok) {
      showStatus(data.message || 'تعذّر البحث في المصحف حاليًا.', true);
      return;
    }
    render(data, 'quran');
    if (data.results && data.results.length > 0) {
      showStatus('عُثر على ' + data.total + ' نتيجة للعبارة: ' + phrase);
    }
  } catch (err) {
    if (id !== sequence) return;
    showStatus(err.name === 'AbortError' ? 'تم إلغاء البحث.' : err.message || 'تعذّر البحث في المصحف حاليًا.', true);
  } finally {
    if (id === sequence) {
      controller = null;
      $('#submit').disabled = false;
    }
  }
}

function renderRetryButton(retryFn) {
  const panel = node('div', 'retry-panel');
  const btn = node('button', 'retry-btn', 'إعادة المحاولة ↻');
  btn.type = 'button';
  btn.onclick = retryFn;
  panel.append(btn);
  $('#results').append(panel);
}

function renderHadithCandidates(candidates) {
  $('#results').replaceChildren();
  $('#results-title').textContent = 'هل هذا النص المقصود؟';
  showStatus('هذه نصوص استُرجعت من الدرر السنية بناءً على المعنى، وليست حكمًا على صحة الحديث. اختر حديثًا للتحقق من حكمه وسنده في المصدر:');
  if (!candidates || candidates.length === 0) {
    showStatus('لم نتمكن من العثور على أحاديث مطابقة للوصف. جرّب كلمات أخرى.');
    return;
  }
  candidates.forEach(cand => {
    const text = typeof cand === 'object' && cand !== null ? cand.text : String(cand);
    const c = node('article', 'result-card candidate-card');
    const head = node('div', 'result-meta');
    head.append(node('span', 'result-type', 'الدرر السنية · نص مسترجع'));
    const p = node('p', 'candidate-phrase');
    p.textContent = text;
    const bottom = node('div', 'result-bottom');
    const btn = node('button', 'submit candidate-pick-btn', 'تحقّق من المصدر ←');
    btn.type = 'button';
    btn.onclick = () => {
      searchHadithCandidate(text);
    };
    bottom.append(btn);
    c.append(head, p, bottom);
    $('#results').append(c);
  });
}

function renderClarificationInput(data) {
  $('#results').replaceChildren();
  $('#results-title').textContent = 'مطلوب توضيح المعنى';
  showStatus(data.message || 'وضّح المعنى أكثر، واذكر الموقف أو أي كلمة تتذكرها.');

  const panel = node('div', 'clarification-panel');
  const attemptsText = data.attemptsRemaining === 1 ? 'المحاولة الأخيرة' : 'المحاولة ' + (data.attempt || 1);
  const h = node('h3', '', 'توضيح المعنى (' + attemptsText + ')');
  const desc = node('p', '', 'اذكر تفاصيل إضافية مثل راوي الحديث، أو الموقف الذي ورد فيه:');
  const row = node('div', 'clarification-row');
  const inp = node('input', 'clarification-input');
  inp.type = 'text';
  inp.maxLength = 500;
  inp.placeholder = 'أضف توضيحًا للمعنى هنا…';
  const btn = node('button', 'clarification-submit', 'إرسال التوضيح والبحث');
  btn.type = 'button';

  const submitClarification = () => {
    const val = inp.value.trim();
    if (!val) {
      inp.focus();
      return;
    }
    if (hadithMeaningState.clarifications.length >= 2) {
      showStatus('تم بلوغ الحد الأقصى للتوضيحات.', true);
      return;
    }
    hadithMeaningState.clarifications.push(val);
    executeHadithMeaningSearch(false);
  };

  btn.onclick = submitClarification;
  inp.onkeydown = e => {
    if (e.key === 'Enter') {
      e.preventDefault();
      submitClarification();
    }
  };

  row.append(inp, btn);
  panel.append(h, desc, row);
  $('#results').append(panel);
  inp.focus();
}

async function searchHadithCandidate(candidateText) {
  stop();
  const id = sequence;
  controller = new AbortController();
  const signal = controller.signal;
  $('#results').replaceChildren();
  showStatus('');
  $('#results-title').textContent = 'نتحقق من حكم الحديث في الدرر السنية…';
  const loading = node('div', 'loader');
  loading.append(node('span', 'loader-ring'));
  const caption = node('div', '', 'نبحث في الموسوعة الحديثية بالدرر السنية…');
  caption.append(node('span', 'loading-detail', 'نعرض حكم المحدث ومصدره كما ورد في المصدر.'));
  loading.append(caption);
  $('#status').append(loading);
  $('#submit').disabled = true;

  try {
    const response = await fetch('/api/hadith/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: candidateText, mode: hadithMode }),
      signal
    });
    const data = await response.json();
    if (id !== sequence) return;
    if (!response.ok) {
      showStatus(data.message || 'تعذّر الاتصال بالدرر السنية حاليًا.', true);
      return;
    }
    render(data, 'hadith');
  } catch (err) {
    if (id !== sequence) return;
    showStatus(err.name === 'AbortError' ? 'تم إلغاء البحث.' : err.message || 'تعذّر الاتصال بالدرر السنية حاليًا.', true);
  } finally {
    if (id === sequence) {
      controller = null;
      $('#submit').disabled = false;
    }
  }
}

async function executeHadithMeaningSearch(isRetry = false) {
  stop();
  const id = sequence;
  controller = new AbortController();
  const signal = controller.signal;
  $('#results').replaceChildren();
  showStatus('');
  $('#results-title').textContent = 'نبحث عن أحاديث محتملة…';
  const loading = node('div', 'loader');
  loading.append(node('span', 'loader-ring'));
  const caption = node('div', '', 'نبحث عن أحاديث مطابقة للمعنى في الدرر السنية…');
  caption.append(node('span', 'loading-detail', 'يتم استرجاع النصوص الأصلية والتحقق منها.'));
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

  try {
    const response = await fetch('/api/hadith/meaning-search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: hadithMeaningState.baseQuery,
        clarifications: hadithMeaningState.clarifications
      }),
      signal
    });
    const data = await response.json();
    if (id !== sequence) return;

    if (data.status === 'temporarily_unavailable' || !response.ok) {
      showStatus(data.message || 'تعذّر إكمال البحث حاليًا. حاول مرة أخرى.', true);
      renderRetryButton(() => executeHadithMeaningSearch(true));
      return;
    }

    if (data.status === 'candidates') {
      renderHadithCandidates(data.candidates || []);
    } else if (data.status === 'needs_clarification') {
      renderClarificationInput(data);
    } else if (data.status === 'not_found') {
      showStatus(data.message || 'لم نتمكن من تحديد الحديث من الوصف الذي أدخلته.');
      hadithMeaningState = { baseQuery: '', clarifications: [] };
    } else {
      showStatus(data.message || 'تعذّر إكمال البحث حاليًا. حاول مرة أخرى.', true);
      renderRetryButton(() => executeHadithMeaningSearch(true));
    }
  } catch (err) {
    if (id !== sequence) return;
    showStatus(err.name === 'AbortError' ? 'تم إلغاء البحث.' : err.message || 'تعذّر إكمال البحث حاليًا. حاول مرة أخرى.', true);
    renderRetryButton(() => executeHadithMeaningSearch(true));
  } finally {
    if (id === sequence) {
      controller = null;
      $('#submit').disabled = false;
    }
  }
}

async function executeQuranMeaningSearch(text) {
  stop();
  const id = sequence;
  controller = new AbortController();
  const signal = controller.signal;
  $('#results').replaceChildren();
  showStatus('');
  $('#results-title').textContent = 'نبحث عن الآيات بالمعنى…';
  const loading = node('div', 'loader');
  loading.append(node('span', 'loader-ring'));
  const caption = node('div', '', 'نقترح عبارات قرآنية محققة ومطابقة للمعنى…');
  caption.append(node('span', 'loading-detail', 'المصدر هو المرجع المعتمد للتحقق.'));
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

  try {
    const response = await fetch('/api/search/suggest', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, type: 'quran' }),
      signal
    });
    const data = await response.json();
    if (id !== sequence) return;
    if (!response.ok) {
      showStatus(data.message || 'تعذّر البحث بالمعنى حاليًا. يمكنك استخدام البحث العادي.', true);
      return;
    }
    if (!data.candidates || data.candidates.length === 0) {
      showStatus(data.message || 'لم نتمكن من اقتراح عبارة مناسبة. جرّب إضافة كلمات تتذكرها.');
      return;
    }
    renderQuranSuggestions(data.candidates);
  } catch (err) {
    if (id !== sequence) return;
    showStatus(err.name === 'AbortError' ? 'تم إلغاء البحث.' : err.message || 'تعذّر البحث بالمعنى حاليًا. يمكنك استخدام البحث العادي.', true);
  } finally {
    if (id === sequence) {
      controller = null;
      $('#submit').disabled = false;
    }
  }
}

async function executeDirectSearch(text) {
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
  const caption = node('div', '', 'نبحث عن النص في المصدر…');
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
    const headers = { 'Content-Type': 'application/json' };
    const url = '/api/' + kind + '/search';
    const body = JSON.stringify(kind === 'hadith' ? { text, mode: hadithMode } : { text });
    const response = await fetch(url, { method: 'POST', headers, body, signal });
    const data = await response.json();
    if (id !== sequence) return;
    if (!response.ok) {
      throw new Error(data.message || 'تعذّر إتمام الطلب. تأكّد من اتصال السيرفر وحاول مجددًا.');
    }
    render(data, kind);
  } catch (err) {
    if (id !== sequence) return;
    showStatus(timedOut ? 'استغرق البحث وقتًا طويلًا. حاول بعبارة أقصر.' : err.name === 'AbortError' ? 'تم إلغاء البحث.' : err.message || 'تعذّر الاتصال بالسيرفر.', true);
  } finally {
    clearTimeout(timer);
    if (id === sequence) {
      controller = null;
      $('#submit').disabled = false;
    }
  }
}

async function executeMediaSearch() {
  stop();
  const id = sequence;
  controller = new AbortController();
  const signal = controller.signal;
  $('#results').replaceChildren();
  showStatus('');
  $('#results-title').textContent = 'نستخرج النص من الوسائط ونطابقه بالمصادر…';
  const loading = node('div', 'loader');
  loading.append(node('span', 'loader-ring'));
  const caption = node('div', '', 'نستخرج النص من الوسائط ونطابقه بالمصادر…');
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
    const body = new FormData();
    body.append('file', file);
    const response = await fetch('/api/media/extract', { method: 'POST', body, signal });
    const data = await response.json();
    if (id !== sequence) return;
    if (!response.ok) {
      throw new Error(data.message || 'تعذّر إتمام الطلب. تأكّد من اتصال السيرفر وحاول مجددًا.');
    }
    render(data, 'image');
  } catch (err) {
    if (id !== sequence) return;
    showStatus(timedOut ? 'استغرقت المعالجة وقتًا طويلًا. جرّب صورة أو مقطعًا أقصر.' : err.name === 'AbortError' ? 'تم إلغاء البحث.' : err.message || 'تعذّر الاتصال بالسيرفر.', true);
  } finally {
    clearTimeout(timer);
    if (id === sequence) {
      controller = null;
      $('#submit').disabled = false;
    }
  }
}

$('#search-form').onsubmit = async e => {
  e.preventDefault();
  if (mode === 'image' && mediaSource === 'url') {
    executeUrlSearch();
    return;
  }
  const text = $('#query').value.trim();
  if (mode === 'image' ? !file : !text) {
    showStatus(mode === 'image' ? 'أضف صورة أو فيديو أولًا.' : (searchType === 'meaning' ? 'صف المعنى أولًا.' : 'اكتب عبارة للبحث أولًا.'), true);
    return;
  }

  if (mode === 'image') {
    executeMediaSearch();
    return;
  }

  if (searchType === 'text') {
    executeDirectSearch(text);
  } else if (mode === 'quran') {
    executeQuranMeaningSearch(text);
  } else if (mode === 'hadith') {
    hadithMeaningState.baseQuery = text;
    hadithMeaningState.clarifications = [];
    executeHadithMeaningSearch();
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

document.querySelectorAll('[data-media-source]').forEach(button => {
  button.onclick = () => {
    stop();
    mediaSource = button.dataset.mediaSource;
    document.querySelectorAll('[data-media-source]').forEach(b => {
      const selected = b.dataset.mediaSource === mediaSource;
      b.classList.toggle('active', selected);
      b.setAttribute('aria-checked', String(selected));
    });
    $('#media-upload').hidden = mediaSource !== 'file';
    $('#url-fields').hidden = mediaSource !== 'url';
    syncInputs();
  };
});

function extractVideoUrl(text) {
  for (const match of text.matchAll(/https?:\/\/[^\s<>"']+/gi)) {
    try {
      const url = new URL(match[0].replace(/[),،؛]+$/, ''));
      if (['youtube.com', 'www.youtube.com', 'm.youtube.com', 'youtu.be',
        'tiktok.com', 'www.tiktok.com', 'vm.tiktok.com', 'vt.tiktok.com',
        'instagram.com', 'www.instagram.com'].includes(url.hostname.toLowerCase()) &&
        url.protocol === 'https:' && !url.username && !url.password) return url.href;
    } catch {}
  }
  return null;
}

async function executeUrlSearch() {
  const url = extractVideoUrl($('#video-url').value);
  if (!url) {
    showStatus('ألصق رابطًا صالحًا من يوتيوب أو تيك توك أو إنستغرام.', true);
    return;
  }
  stop();
  const id = sequence;
  const localController = new AbortController();
  controller = localController;
  const signal = localController.signal;
  $('#results').replaceChildren();
  showStatus('');
  $('#results-title').textContent = 'التبيّن';
  const loading = node('div', 'url-progress');
  const caption = node('p', '', 'جارٍ إرسال الرابط…');
  const progress = document.createElement('progress');
  progress.max = 100;
  progress.value = 0;
  progress.setAttribute('aria-label', 'تقدّم معالجة المقطع');
  const detail = node('span', 'loading-detail', 'تهيئة الطلب');
  const cancel = node('button', 'cancel-button', 'إلغاء المتابعة');
  cancel.type = 'button';
  cancel.onclick = () => { stop(); showStatus('تم إلغاء المتابعة.'); };
  loading.append(caption, progress, detail, cancel);
  $('#status').append(loading);
  $('#submit').disabled = true;
  let timedOut = false;
  const timer = setTimeout(() => { timedOut = true; localController.abort(); }, 15 * 60 * 1000);
  try {
    const response = await fetch('/api/media/url/jobs', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url }), signal
    });
    const created = await response.json();
    if (!response.ok) throw Error(created.message || 'تعذّر بدء معالجة الرابط.');
    if (!created.jobId) throw Error('لم يُرجع الخادم رقم المهمة.');
    while (!signal.aborted && id === sequence) {
      const response = await fetch('/api/media/url/jobs/' + encodeURIComponent(created.jobId), { signal });
      const job = await response.json();
      if (id !== sequence) return;
      if (!response.ok) throw Error(job.message || 'تعذّرت متابعة المهمة.');
      caption.textContent = job.message || 'جارٍ معالجة المقطع…';
      progress.value = Math.max(0, Math.min(100, Number(job.progress) || 0));
      detail.textContent = Math.round(progress.value) + '% — مراحل المعالجة';
      if (job.status === 'failed') throw Error(job.error?.message || job.message || 'تعذّرت معالجة المقطع.');
      if (job.status === 'completed') { render(job.result || {}, 'image'); return; }
      await new Promise((resolve, reject) => {
        const abort = () => { clearTimeout(wait); reject(new DOMException('Cancelled', 'AbortError')); };
        const wait = setTimeout(() => { signal.removeEventListener('abort', abort); resolve(); }, 1500);
        signal.addEventListener('abort', abort, { once: true });
        if (signal.aborted) abort();
      });
    }
  } catch (error) {
    if (id !== sequence) return;
    showStatus(timedOut ? 'انتهت مهلة المتابعة. جرّب مقطعًا أقصر.' :
      error.name === 'AbortError' ? 'تم إلغاء المتابعة.' : error.message || 'تعذّر الاتصال بالسيرفر.', true);
    if (error.name !== 'AbortError') {
      const retry = node('button', 'retry-btn', 'إعادة المحاولة');
      retry.type = 'button';
      retry.onclick = executeUrlSearch;
      $('#status').append(retry);
    }
  } finally {
    clearTimeout(timer);
    if (id === sequence) { controller = null; $('#submit').disabled = false; }
  }
}

selectMode('quran');
