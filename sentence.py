import requests
from bs4 import BeautifulSoup
from pymongo import MongoClient

# MongoDB bağlantısı
client = MongoClient("mongodb://localhost:27017/")
db = client["vecizeler_db"]
collection = db["vecizeler"]

url = "https://sorularlarisale.com/tum-kategori/5094?nids=YTo0OTp7aTowO3M6NjoiMTEwNTQwIjtpOjE7czo2OiIxMDg3NTAiO2k6MjtzOjY6IjEwODE5MCI7aTozO3M6NjoiMTA3NzEzIjtpOjQ7czo2OiIxMDg3MjMiO2k6NTtzOjY6IjEwODY4NyI7aTo2O3M6NjoiMTA4NjU3IjtpOjc7czo2OiIxMDg2NzAiO2k6ODtzOjY6IjEwODcxMCI7aTo5O3M6NjoiMTEwNTQxIjtpOjEwO3M6NjoiMTEwNTQyIjtpOjExO3M6NjoiMTA3NDMyIjtpOjEyO3M6NjoiMTA3NDM4IjtpOjEzO3M6NjoiMTA3NzIzIjtpOjE0O3M6NjoiMTA3NDIyIjtpOjE1O3M6NjoiMTA3NjY1IjtpOjE2O3M6NjoiMTA3NTkzIjtpOjE3O3M6NjoiMTA3NzMwIjtpOjE4O3M6NjoiMTA3NDM2IjtpOjE5O3M6NjoiMTA3NDIzIjtpOjIwO3M6NjoiMTA3NDMxIjtpOjIxO3M6NjoiMTA3NzY2IjtpOjIyO3M6NjoiMTA3NDI2IjtpOjIzO3M6NjoiMTA5ODMzIjtpOjI0O3M6NjoiMTA3Njk3IjtpOjI1O3M6NjoiMTA3NzE5IjtpOjI2O3M6NjoiMTA3NDI3IjtpOjI3O3M6NjoiMTA3NDM5IjtpOjI4O3M6NjoiMTA5MDU0IjtpOjI5O3M6NjoiMTA3NjM4IjtpOjMwO3M6NjoiMTA3ODU4IjtpOjMxO3M6NjoiMTA4NTU4IjtpOjMyO3M6NjoiMTA3NDM1IjtpOjMzO3M6NjoiMTA3NDI5IjtpOjM0O3M6NjoiMTA3NDQ0IjtpOjM1O3M6NjoiMTA3NDQzIjtpOjM2O3M6NjoiMTA3NDMwIjtpOjM3O3M6NjoiMTA3OTg2IjtpOjM4O3M6NjoiMTA4MDUyIjtpOjM5O3M6NjoiMTA3NDQwIjtpOjQwO3M6NjoiMTA3NDI0IjtpOjQxO3M6NjoiMTA3NDMzIjtpOjQyO3M6NjoiMTA3NDM3IjtpOjQzO3M6NjoiMTA3NDI1IjtpOjQ0O3M6NjoiMTEwMTgyIjtpOjQ1O3M6NjoiMTA3NDQxIjtpOjQ2O3M6NjoiMTA3NDI4IjtpOjQ3O3M6NjoiMTA3NDM0IjtpOjQ4O3M6NjoiMTA3NDQyIjt9"


print(f"🔗 Sayfa indiriliyor: {url}")
response = requests.get(url)
response.raise_for_status()

soup = BeautifulSoup(response.text, "html.parser")

# content sınıflarını bul (#block-system-main > div > div.content)
content_blocks = soup.select("#block-system-main > div > div.content")
print(f"✅ {len(content_blocks)} adet .content bloğu bulundu")

kayit_sayisi = 0

for i, block in enumerate(content_blocks, start=1):
    # p ve blockquote içindeki p'leri birlikte al
    paragraphs = block.select("p, blockquote p")
    print(f"   📦 Blok {i}: {len(paragraphs)} paragraf bulundu")

    for p in paragraphs:
        text = p.get_text(strip=True)
        if text:
            collection.insert_one({"sentence": text})
            kayit_sayisi += 1
            print(f"      ➕ Kaydedildi: {text[:60]}...")

print(f"🎉 Toplam {kayit_sayisi} cümle kaydedildi.")
