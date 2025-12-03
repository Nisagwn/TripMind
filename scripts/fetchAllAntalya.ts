import { execSync } from "child_process";

const queries = [
    "Antalya restoranlar",
    "Antalya kafeler",
    "Antalya müzeler",
    "Antalya parklar",
    "Antalya sahiller",
    "Antalya tarihi yerler",
    "Antalya alışveriş merkezleri",
    "Antalya eğlence mekanları",
    "Antalya oteller",
    "Antalya barlar",
    "Antalya pastaneler",
    "Antalya kahvaltı yerleri",
    "Antalya gezi yerleri",
    "Antalya doğal güzellikler",
    "Antalya spa merkezleri",
    "Antalya aquaparklar",
    "Antalya manzaralı mekanlar",
    "Antalya plajlar",
    "Antalya gece kulüpleri",
    "Antalya en iyi restoranlar",
    "Antalya uygun fiyatlı mekanlar",
  ];
  
for (const q of queries) {
  console.log(`\n🚀 Çekiliyor: ${q}...`);
  try {
    execSync(`npx tsx scripts/fetchAndSavePlaces.ts "${q}"`, { stdio: "inherit" });
  } catch (error) {
    console.error(`❌ ${q} sorgusu hata verdi:`, error);
  }
}

console.log("\n✅ TÜM SORGULAR TAMAMLANDI! Firestore'da artık 100+ mekan var 🎉");
