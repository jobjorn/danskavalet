# Partier utanför Riksdagen med ≥2% i kommunfullmäktigevalet 2026

Skript: `finn-partier-utanfor-riksdagen.mjs`
Körs med: `npm install && node finn-partier-utanfor-riksdagen.mjs`

## Vad skriptet gör

1. Hämtar `https://resultat.val.se/resultatfiler/val2026/index.md5`.
2. Plockar ut de 290 kommunfullmäktige-zipfilerna (`_KF.zip`), och väljer
   `slutlig` per kommun om den finns, annars `preliminar`.
3. Laddar ner och packar upp varje zip, läser
   `Val_2026_<typ>_mandatfordelning_<kod>_KF.json`.
4. Plockar ut partiandelar från
   `valomrade.rostfordelning.rosterPaverkaMandat.partiRoster[]`.
5. Filtrerar bort riksdagspartierna (S, M, SD, C, V, KD, L, MP) och allt
   under 2 %.
6. Skriver `resultat-partier-utanfor-riksdagen.json` (med varningar) och
   `resultat-partier-utanfor-riksdagen.csv` (ren tabell, sorterad på
   röstandel fallande).

JSON-strukturen ovan är verifierad mot en verkligt nedladdad fil (Upplands
Väsby, kommunkod 0114) den 2026-09-15, inte bara gissad.

## Viktig brasklapp: körningen 2026-09-15 är PRELIMINÄR, inte slutlig

Vid körtillfället (två dagar efter valdagen 13 september 2026) fanns
**0 av 290** kommuner med `slutlig` räkning i index — alla 290 kommuner
räknades alltså med den preliminära filen. Det betyder konkret:

- **8 kommuner** har en "Övriga anmälda partier"-klump på ≥2 % av rösterna
  (se `varningar` i JSON-filen) — där kan ett enskilt parti med ≥2 % ligga
  dolt och saknas i resultatet nedan tills slutlig räkning finns. Dessa
  kommuner är: Flen, Katrineholm, Eskilstuna, Hultsfred, Nybro, Vellinge,
  Gullspång, Kungälv.
- Samtliga 290 kommuner hade minst ett oräknat valdistrikt vid
  körtillfället (helt normalt två dagar efter valdagen).
- **Skriptet bör köras om** när Valmyndigheten börjar publicera
  `slutlig`-filer (väntas komma in successivt under veckan efter
  valdagen, dvs. från ca 2026-09-14 och några dagar framåt). Kör om med
  samma kommando — det faller automatiskt tillbaka till `preliminar` bara
  för de kommuner som ännu saknar `slutlig`.
- Riksdagspartilistan (S, M, SD, C, V, KD, L, MP) är den som gällde innan
  valet 2026 och bör dubbelkollas mot det fastställda riksdagsresultatet
  (väntas ca en vecka efter valdagen) innan slutleverans.

## Resultat av körningen 2026-09-15 (preliminärt)

- **171 träffar** (parti × kommun) över 2 %, spridda på **141 unika
  partier**.
- Så när som på alla är renodlat lokala kommunlistor/bygdepartier.
  Undantag värda att notera eftersom de (i preliminär data) även
  ställde upp i riksdagsvalet utan att ta plats i Riksdagen:
  - **Medborgerlig Samling (MED)** — ≥2 % i 6 kommuner
  - **Sjukvårdspartiet (SJV)** och dess regionala varianter — ≥2 % i
    8+1 kommuner
  - **Landsbygdspartiet Oberoende (LPo)** — ≥2 % i 8 kommuner
  - **Norrlandspartiet (NorrP)** — ≥2 % i 7 kommuner

  Fullständig tabell: se `resultat-partier-utanfor-riksdagen.csv`.

## Öppen fråga: ska renodlat lokala partier filtreras bort?

Inte klargjort. Uppdragsbeskrivningens mål ("alla partier som inte sitter
i Riksdagen ... ≥2 % i minst en kommun") inkluderar per definition lokala
kommunlistor, och det är så nuvarande resultat är genererat — ingen
korsning mot `deltagande-partier.csv` (riksdagskandidatur) har gjorts. Om
bara riksdagspartier som föll under spärren men har lokala fästen önskas,
behöver listan filtreras ytterligare.
