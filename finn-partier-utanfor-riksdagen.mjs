#!/usr/bin/env node
// Hittar partier som inte sitter i Riksdagen men som fick >= 2% av rösterna
// i minst en kommuns kommunfullmäktigeval 2026.
//
// Källa: Valmyndighetens resultatfiler, se
// https://www.val.se/valresultat-och-statistik/statistik-och-data/teknisk-beskrivning-av-resultatfiler
//
// Körs med: node finn-partier-utanfor-riksdagen.mjs [--kravSlutlig]
//   --kravSlutlig   hoppa över kommuner som ännu bara har preliminärt resultat
//                    istället för att falla tillbaka till preliminar-filen.

import AdmZip from "adm-zip";
import { writeFile } from "node:fs/promises";

const INDEX_URL = "https://resultat.val.se/resultatfiler/val2026/index.md5";
const BASE_URL = "https://resultat.val.se/resultatfiler/val2026/";

// Riksdagspartier per 2026-09-15. JUSTERA HÄR om riksdagens sammansättning
// ändras när slutresultatet för riksdagsvalet fastställs.
const RIKSDAGSPARTIER = new Set(["S", "M", "SD", "C", "V", "KD", "L", "MP"]);

const MIN_ANDEL_PROCENT = 2.0;
const REQUEST_DELAY_MS = 250;
const MAX_FORSOK = 5;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchMedRetry(url, forsok = 1) {
  const res = await fetch(url);
  if (res.status === 429 && forsok <= MAX_FORSOK) {
    const vantetid = Math.min(2 ** forsok * 1000, 30000);
    console.warn(`  429 Too Many Requests för ${url}, väntar ${vantetid}ms (försök ${forsok}/${MAX_FORSOK})`);
    await sleep(vantetid);
    return fetchMedRetry(url, forsok + 1);
  }
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} ${res.statusText} för ${url}`);
  }
  return res;
}

async function hamtaIndexRader() {
  const res = await fetchMedRetry(INDEX_URL);
  const text = await res.text();
  return text.split("\n").map((rad) => rad.trim()).filter(Boolean);
}

// Radformat i index.md5: "<md5sum>  ./p/kf/Val_2026_preliminar_0114_KF.zip"
// JUSTERA HÄR om Valmyndigheten ändrar formatet på indexraderna.
const INDEXRAD_REGEX = /^[0-9a-f]{32}\s+\.\/(.+)$/i;
const KF_FILNAMN_REGEX = /Val_2026_(preliminar|slutlig)_(\d{4})_KF\.zip$/;

function parseIndex(rader) {
  const perKommun = new Map(); // kommunkod -> { slutlig?: relPath, preliminar?: relPath }
  for (const rad of rader) {
    const radMatch = rad.match(INDEXRAD_REGEX);
    if (!radMatch) continue;
    const relativPath = radMatch[1];
    const filnamnMatch = relativPath.match(KF_FILNAMN_REGEX);
    if (!filnamnMatch) continue; // inte en KF-zip (vi bryr oss bara om kommunfullmäktige)
    const [, rakningstyp, kommunkod] = filnamnMatch;
    if (!perKommun.has(kommunkod)) perKommun.set(kommunkod, {});
    perKommun.get(kommunkod)[rakningstyp] = relativPath;
  }
  return perKommun;
}

function valjFil(entry, { kravSlutlig }) {
  if (entry.slutlig) return { relativPath: entry.slutlig, typ: "slutlig" };
  if (!kravSlutlig && entry.preliminar) return { relativPath: entry.preliminar, typ: "preliminar" };
  return null;
}

async function hamtaMandatfordelningJson(relativPath) {
  const url = BASE_URL + relativPath;
  const res = await fetchMedRetry(url);
  const buf = Buffer.from(await res.arrayBuffer());
  const zip = new AdmZip(buf);
  // JUSTERA HÄR: filen i zipen heter Val_2026_<typ>_mandatfordelning_<kod>_KF.json
  // — verifierat mot riktig nedladdad zip 2026-09-15.
  const entry = zip.getEntries().find((e) => /mandatfordelning.*\.json$/i.test(e.entryName));
  if (!entry) {
    throw new Error(`Hittade ingen mandatfördelnings-JSON i ${relativPath}`);
  }
  return JSON.parse(zip.readAsText(entry));
}

// Struktur verifierad mot riktig nedladdad fil (Upplands Väsby, 0114) 2026-09-15:
//   json.valomrade.rostfordelning.rosterPaverkaMandat.partiRoster[]
//     { partiforkortning, partibeteckning, antalRoster, andelRoster, ... }
// Mycket små partier som Valmyndigheten inte namnger separat klumpas ihop i
//   json.valomrade.rostfordelning.rosterPaverkaMandat.rosterOvrigaPartier
//     { antalRoster, andelRoster }
// JUSTERA HÄR om Valmyndigheten ändrar denna struktur.
function extractPartiRader(json) {
  const partiRoster = json?.valomrade?.rostfordelning?.rosterPaverkaMandat?.partiRoster ?? [];
  return partiRoster.map((p) => ({
    parti: p.partiforkortning,
    partinamn: p.partibeteckning,
    antalRoster: p.antalRoster,
    andelRoster: p.andelRoster,
    // Valmyndigheten levererar redan jämförelsen mot valet 2022 per parti;
    // andelRosterForegaendeVal saknas (null/undefined) om partiet inte
    // ställde upp i kommunen 2022 — då finns ingen förändring att visa.
    forandringAndelRoster: p.forandringAndelRoster ?? null,
    andelRosterForegaendeVal: p.andelRosterForegaendeVal ?? null,
  }));
}

function extractKommunInfo(json) {
  const vo = json?.valomrade ?? {};
  return {
    kommun: vo.namn,
    kommunkod: vo.kod,
    rakningstillfalle: json?.rakningstillfalle,
    antalValdistriktRaknade: vo.antalValdistriktRaknade,
    antalValdistriktSomSkaRaknas: vo.antalValdistriktSomSkaRaknas,
    ovrigaPartierAndel: vo?.rostfordelning?.rosterPaverkaMandat?.rosterOvrigaPartier?.andelRoster ?? null,
  };
}

async function main() {
  const kravSlutlig = process.argv.includes("--kravSlutlig");

  console.log("Hämtar index.md5...");
  const rader = await hamtaIndexRader();
  const perKommun = parseIndex(rader);
  const antalKommuner = perKommun.size;
  const antalMedSlutlig = [...perKommun.values()].filter((e) => e.slutlig).length;

  console.log(`Hittade ${antalKommuner} kommuner med KF-resultatfil i index.`);
  console.log(`Av dessa har ${antalMedSlutlig}/${antalKommuner} slutlig räkning tillgänglig.`);
  if (antalMedSlutlig < antalKommuner) {
    console.warn(
      `VARNING: ${antalKommuner - antalMedSlutlig} kommuner saknar fortfarande slutlig räkning. ` +
        (kravSlutlig
          ? "De hoppas över (--kravSlutlig)."
          : "De räknas preliminärt, där mycket små partier kan saknas från \"Övriga anmälda partier\".")
    );
  }

  const resultat = [];
  const varningar = [];
  let i = 0;

  for (const [kommunkod, entry] of perKommun) {
    i++;
    const val = valjFil(entry, { kravSlutlig });
    if (!val) {
      varningar.push({ kommunkod, varning: "Ingen slutlig fil tillgänglig och --kravSlutlig är satt; kommunen hoppades över." });
      continue;
    }

    process.stdout.write(`[${i}/${antalKommuner}] ${kommunkod} (${val.typ})... `);
    try {
      const json = await hamtaMandatfordelningJson(val.relativPath);
      const info = extractKommunInfo(json);
      const partier = extractPartiRader(json);

      if (
        info.antalValdistriktRaknade != null &&
        info.antalValdistriktSomSkaRaknas != null &&
        info.antalValdistriktRaknade < info.antalValdistriktSomSkaRaknas
      ) {
        varningar.push({
          kommunkod,
          kommun: info.kommun,
          varning: `Endast ${info.antalValdistriktRaknade}/${info.antalValdistriktSomSkaRaknas} valdistrikt räknade.`,
        });
      }
      if (info.ovrigaPartierAndel != null && info.ovrigaPartierAndel >= MIN_ANDEL_PROCENT) {
        varningar.push({
          kommunkod,
          kommun: info.kommun,
          varning: `"Övriga anmälda partier" utgör ${info.ovrigaPartierAndel}% av rösterna i denna kommun — ett enskilt parti kan ligga dolt däri med >= ${MIN_ANDEL_PROCENT}%. Bör verifieras mot slutlig räkning.`,
        });
      }

      for (const p of partier) {
        if (!p.parti || RIKSDAGSPARTIER.has(p.parti)) continue;
        if (p.andelRoster == null || p.andelRoster < MIN_ANDEL_PROCENT) continue;
        resultat.push({
          parti: p.parti,
          partinamn: p.partinamn,
          kommun: info.kommun,
          kommunkod: info.kommunkod,
          rostandelProcent: p.andelRoster,
          antalRoster: p.antalRoster,
          forandringProcentenheter: p.andelRosterForegaendeVal == null ? null : p.forandringAndelRoster,
          rakningstillfalle: info.rakningstillfalle,
        });
      }
      console.log("klart");
    } catch (err) {
      console.log(`FEL: ${err.message}`);
      varningar.push({ kommunkod, varning: `Misslyckades att hämta/tolka: ${err.message}` });
    }

    await sleep(REQUEST_DELAY_MS);
  }

  resultat.sort((a, b) => b.rostandelProcent - a.rostandelProcent);

  const output = {
    genererad: new Date().toISOString(),
    antalKommunerIIndex: antalKommuner,
    antalKommunerMedSlutligRakning: antalMedSlutlig,
    slutligKomplettForAllaKommuner: antalMedSlutlig === antalKommuner,
    riksdagspartierFiltrerade: [...RIKSDAGSPARTIER],
    minRostandelProcent: MIN_ANDEL_PROCENT,
    varningar,
    resultat,
  };

  await writeFile("resultat-partier-utanfor-riksdagen.json", JSON.stringify(output, null, 2));
  console.log(`\nKlart. ${resultat.length} träffar (parti/kommun) skrivna till resultat-partier-utanfor-riksdagen.json`);
  console.log(`${varningar.length} varningar — se fältet "varningar" i utfilen.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
