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
