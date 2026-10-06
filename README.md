# تبيّن | Tabayyan

من النص إلى المصدر. تبيّن يساعدك على الوصول إلى الآيات القرآنية والأحاديث وأحكام المحدّثين، بالبحث بالنص أو المعنى، أو باستخراج النص من الصور ومقاطع الفيديو وروابط المنصات.

النصوص والأحكام من المصادر، والذكاء الاصطناعي يساعد على الوصول إليها.

## جرّب تبيّن

- [تحميل تطبيق الآيفون — IPA](https://github.com/roolxi/tabayan-server/releases/download/latest/Tabayyan.ipa)
- [تحميل تطبيق أندرويد — APK](https://github.com/roolxi/tabayan-server/releases/download/latest/Tabayyan.apk)
- [واجهة الويب](https://tabayyan.duckdns.org)

نسخة الآيفون بصيغة IPA غير موقّعة وتحتاج إلى التوقيع قبل التثبيت.

## المميزات

- البحث في القرآن الكريم والأحاديث بالنص أو المعنى.
- عرض مبسّط للأحاديث، ووضع متخصص للروايات والتخريج.
- استخراج الآيات والأحاديث من الصور ومقاطع الفيديو.
- التحقّق من روابط يوتيوب وتيك توك وإنستغرام، حتى 10 دقائق.
- عرض النصوص وأحكام المحدّثين مع روابط المصادر.
- تطبيق مشترك لـ iOS وأندرويد.

## المصادر

- **القرآن الكريم:** قاعدة نصوص [مشروع تنزيل](https://tanzil.net).
- **الأحاديث وأحكام المحدّثين:** [الدرر السنية](https://dorar.net/hadith).

تبيّن أداة للوصول إلى المصادر، وليس جهة إفتاء. عدم ظهور نتيجة لا يعني أن الحديث موضوع أو أن النص غير موجود.

## هيكل المشروع

| المسار | المحتوى |
|---|---|
| `server.py` | سيرفر API |
| `services/` | البحث ومعالجة الوسائط |
| `web/` | واجهة الويب |
| `app/` | تطبيق Expo لـ iOS وأندرويد |
| `tests/` | اختبارات السيرفر والويب |
| `.github/workflows/` | بناء تطبيقات الهاتف |

## تشغيل السيرفر

### المتطلبات

- Python 3.11 أو أحدث.
- FFmpeg وFFprobe.
- Node.js لمعالجة بعض روابط الفيديو.
- مفتاح OpenRouter لميزات الذكاء الاصطناعي.

تثبيت FFmpeg:

```sh
# Ubuntu / Debian
sudo apt install ffmpeg

# Windows
winget install Gyan.FFmpeg
```

### الإعداد والتشغيل

```sh
python -m venv .venv
```

فعّل البيئة:

```sh
# Linux / macOS
source .venv/bin/activate

# Windows PowerShell
.\.venv\Scripts\Activate.ps1
```

ثبّت المتطلبات وانسخ ملف الإعدادات:

```sh
pip install -r requirements.txt
```

انسخ `.env.example` إلى `.env`، ثم أضف مفتاح OpenRouter وشغّل السيرفر:

```sh
python server.py
```

افتح http://127.0.0.1:8000.

### إدارة خدمة Linux

إذا كانت خدمة `tabayyan` مثبتة:

```sh
sudo systemctl status tabayyan
sudo systemctl restart tabayyan
sudo journalctl -u tabayyan -f
```

## تشغيل تطبيق الهاتف

من جذر المشروع:

```sh
cd app
npm ci
npx expo start
```

لتغيير عنوان السيرفر، أضف إلى `app/.env`:

```env
EXPO_PUBLIC_API_BASE_URL=https://tabayyan.duckdns.org
```

يمكن تجربة الواجهة عبر Expo Go. استقبال المشاركة على أندرويد يحتاج إلى نسخة APK مبنية. ملفات البناء موجودة في تبويب **Actions** على GitHub.

## واجهات API

| الطلب | الوظيفة |
|---|---|
| `GET /api/health` | حالة السيرفر |
| `POST /api/quran/search` | البحث في القرآن |
| `POST /api/hadith/search` | البحث في الأحاديث |
| `POST /api/search/suggest` | اقتراح عبارات بحث بالمعنى |
| `POST /api/hadith/meaning-search` | البحث عن الأحاديث بالمعنى |
| `POST /api/media/extract` | استخراج النص من الصور والفيديو |
| `POST /api/media/url/jobs` | بدء معالجة رابط فيديو |
| `GET /api/media/url/jobs/{job_id}` | متابعة التقدّم والنتيجة |

## معالجة روابط الفيديو

من واجهة الويب، اختر **الوسائط والروابط ← ألصق رابطًا**.

- الحد الافتراضي للمقطع: **10 دقائق**.
- يمكن تعديله عبر `REMOTE_MEDIA_MAX_DURATION_SECONDS`.
- التقدّم يعرض مراحل المعالجة الفعلية.
- إلغاء المتابعة يوقف طلبات الواجهة؛ لا يلغي مهمة السيرفر التي بدأت.
- المهام محفوظة في الذاكرة؛ شغّل عامل Uvicorn واحدًا ما لم تستخدم مخزن مهام مشتركًا.