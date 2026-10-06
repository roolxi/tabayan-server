"""اختبار تبين على السيرفر الحي: يسجل الوقت والنتيجة لكل نص في tabayyan_results.csv
التشغيل: python tabayyan_eval.py   (بايثون 3 فقط، بدون مكتبات إضافية)
بعد التشغيل افتح الملف في Excel وعبّ عمود correct بـ 1 أو 0
"""
import csv, json, sys, time, urllib.request

try:
    sys.stdout.reconfigure(encoding="utf-8")
except Exception:
    pass

BASE = "https://tabayyan.duckdns.org"

# (النوع, نقطة الوصول, النص, المتوقع)
CASES = [
    ("hadith_exact", "/api/hadith/search", "إنما الأعمال بالنيات", "إنما الأعمال بالنيات — صحيح"),
    ("hadith_exact", "/api/hadith/search", "لا يؤمن أحدكم حتى يحب لأخيه ما يحب لنفسه", "صحيح"),
    ("hadith_exact", "/api/hadith/search", "الدين النصيحة", "الدين النصيحة — صحيح"),
    ("hadith_exact", "/api/hadith/search", "من حسن إسلام المرء تركه ما لا يعنيه", "من حسن إسلام المرء..."),
    ("hadith_exact", "/api/hadith/search", "تبسمك في وجه أخيك لك صدقة", "تبسمك في وجه أخيك..."),
    ("hadith_exact", "/api/hadith/search", "المسلم من سلم المسلمون من لسانه ويده", "صحيح"),
    ("hadith_approx", "/api/hadith/search", "الاعمال بالنية", "إنما الأعمال بالنيات"),
    ("hadith_approx", "/api/hadith/search", "لا يؤمن احدكم حتى يحب لاخيه", "لا يؤمن أحدكم..."),
    ("hadith_approx", "/api/hadith/search", "الكلمة الطيبة صدقه", "والكلمة الطيبة صدقة"),
    ("hadith_approx", "/api/hadith/search", "الراحمون يرحمهم الرحمن", "الراحمون يرحمهم الرحمن..."),
    ("hadith_mixed", "/api/hadith/search", "من كان يؤمن بالله واليوم الآخر فلا يروعن مسلما", "تنبيه اختلاف الأحكام"),
    ("hadith_weak", "/api/hadith/search", "اطلبوا العلم ولو بالصين", "حكم بالضعف أو أشد"),
    ("hadith_weak", "/api/hadith/search", "النظافة من الإيمان", "لا يوجد بهذا اللفظ أو حكم بالضعف — بدون اختراع نص"),
    ("meaning", "/api/hadith/meaning-search", "الحديث اللي يقول ابتسامتك في وجه أخوك صدقة", "تبسمك في وجه أخيك لك صدقة"),
    ("meaning", "/api/hadith/meaning-search", "حديث عن إن الأعمال على حسب النية", "إنما الأعمال بالنيات"),
    ("meaning", "/api/hadith/meaning-search", "الحديث اللي يقول المسلم الحقيقي ما يأذي الناس بلسانه ولا يده", "المسلم من سلم المسلمون..."),
    ("meaning", "/api/hadith/meaning-search", "حديث إن الله ما يطالع أشكالكم يطالع قلوبكم", "إن الله لا ينظر إلى صوركم..."),
    ("meaning", "/api/hadith/meaning-search", "حديث إن اللي يرحم الناس ربي يرحمه", "الراحمون يرحمهم الرحمن"),
    ("meaning", "/api/hadith/meaning-search", "حديث عن إن الدين نصيحة", "الدين النصيحة"),
]


def post(path, text):
    req = urllib.request.Request(BASE + path, data=json.dumps({"text": text}).encode(),
                                 headers={"Content-Type": "application/json"}, method="POST")
    t = time.perf_counter()
    try:
        with urllib.request.urlopen(req, timeout=120) as r:
            body = json.loads(r.read().decode())
    except Exception as e:
        body = {"error": str(e)}
    return body, time.perf_counter() - t


def top(body):
    for key in ("results", "candidates", "matches"):
        items = body.get(key)
        if isinstance(items, list) and items:
            return json.dumps(items[0], ensure_ascii=False)[:400]
    return json.dumps({k: body.get(k) for k in ("status", "message", "error", "found") if k in body}, ensure_ascii=False)


rows, times = [], []
for i, (kind, path, text, expected) in enumerate(CASES, 1):
    body, dt = post(path, text)
    times.append(dt)
    print(f"{i:02d}/{len(CASES)}  {kind:14s} {dt:5.1f}s")
    rows.append({"id": i, "kind": kind, "query": text, "expected": expected, "seconds": round(dt, 2),
                 "status": body.get("status", ""), "mixed": body.get("mixedCategories", ""),
                 "top_result": top(body), "correct": ""})
    time.sleep(4.5)  # السيرفر يسمح بـ 15 طلب في الدقيقة

with open("tabayyan_results.csv", "w", newline="", encoding="utf-8-sig") as f:
    w = csv.DictWriter(f, fieldnames=list(rows[0].keys()))
    w.writeheader(); w.writerows(rows)

print(f"\nCases: {len(rows)}  Average: {sum(times)/len(times):.1f}s  Max: {max(times):.1f}s")
print("Results saved to tabayyan_results.csv (open it in Excel)")
