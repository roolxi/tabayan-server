# Tabayyan Server

سيرفر تبيّن للتحقق من صحة الآيات القرآنية والأحاديث النبوية. يوفر واجهة برمجية للبحث في نصوص القرآن عبر قاعدة بيانات محلية، والبحث في الأحاديث من الدرر السنية، والتعرف على النصوص من الصور ومقاطع الفيديو عبر الذكاء الاصطناعي.

- سيرفر العرض الحي (Live API): https://tabayyan.duckdns.org

---

## المتطلبات

- Python 3.10 أو أحدث
- FFmpeg (لمعالجة الصوت والفيديو)
  - Ubuntu/Debian: `sudo apt install ffmpeg`
  - Windows: `winget install Gyan.FFmpeg`

---

## التشغيل المحلي

```bash
# Create and activate virtual environment
python -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Set up environment file
cp .env.example .env

# Run server
python server.py
```

يعمل السيرفر محلياً على: `http://127.0.0.1:8000`

---

## التشغيل على السيرفر (Linux systemd)

الخدمة مهيأة للتشغيل التلقائي عبر systemd:

```bash
sudo systemctl status tabayyan   # Check status
sudo systemctl restart tabayyan  # Restart service
sudo journalctl -u tabayyan -f   # Follow logs
```

---

## واجهات API الأساسية

- `POST /api/quran/search` - فحص وبحث الآيات القرآنية
- `POST /api/hadith/search` - فحص والتحقق من صحة الأحاديث
- `POST /api/media/extract` - استخراج النصوص من الصور والمقاطع
- `POST /api/search/suggest` - البحث عن الآيات بالمعنى
- `POST /api/hadith/meaning-search` - البحث عن الأحاديث بالمعنى
- `POST /api/media/url/jobs` - بدء معالجة رابط يوتيوب أو تيك توك أو إنستغرام
- `GET /api/media/url/jobs/{job_id}` - متابعة المرحلة والتقدّم والنتيجة

في واجهة الويب، اختر «الوسائط والروابط» ثم «ألصق رابطًا» للتحقّق من مقطع.
حد الروابط الافتراضي 10 دقائق، ويمكن ضبطه عبر `REMOTE_MEDIA_MAX_DURATION_SECONDS`.
يعرض شريط التقدّم مراحل السيرفر الفعلية؛ إلغاء المتابعة يوقف طلبات الواجهة ولا يلغي مهمة السيرفر التي بدأت.
لا تحتاج هذه الميزة إلى إضافة متصفح.

تحتاج معالجة الروابط إلى FFmpeg وFFprobe وNode.js وإلى مفتاح OpenRouter في ملف `.env`.
لا تُرسل مفاتيح الخدمات إلى المتصفح. يشغّل التطبيق المهام في الذاكرة؛ استخدم عامل Uvicorn واحدًا
ما لم تستبدل مخزن المهام بمخزن مشترك بين العمال.
