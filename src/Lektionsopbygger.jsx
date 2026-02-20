import { useState, useRef, useCallback, useEffect } from "react";

// ─────────────────────────────────────────────────────────
// DATA: All modules, sections, and goals – split "both" into
// separate theory + practice draggable items
// ─────────────────────────────────────────────────────────

const MODULES_RAW = [
  {
    id: 1, title: "Grundlæggende trafikforståelse", color: "#2563EB",
    theory: 7, practice: 0, selfStudyAllowed: [3, 6],
    sections: [
      { id: "0", title: "Indledning", type: "theory", mustBeFirst: true,
        goals: ["Køreuddannelsens formål og grundprincipper", "Teori før praksis-princippet", "Progression fra lettere til sværere", "Aktiv dialog ved holdningsbearbejdelse"] },
      { id: "10.1.1", title: "Køreundervisning mv.", type: "theory", mustBeFirst: true,
        goals: ["Alderskrav og helbredsbetingelser", "Krav om førstehjælpskursus", "Undervisningens omfang og form", "Modulplanens funktion"] },
      { id: "3", title: "Køretøjers manøvreegenskaber", type: "theory", selfStudy: true,
        goals: ["3.1.1 Fartegenskaber", "3.1.2 Styreegenskaber", "3.1.3 Orienteringsvilkår", "3.2.1–3.2.8 Forskellige køretøjer"] },
      { id: "4", title: "Trafikantadfærd", type: "theory",
        goals: ["4.1 Opfattelse og reaktion", "4.2 Syn og bevægelse", "4.3 Afstand og hastighed", "4.4 Køreevne og helbred", "4.5 Andre trafikanters adfærd", "4.6 Bedømmelse af andre", "4.7 Egne holdninger"] },
      { id: "5.1", title: "Vejenes sikkerhedsmæssige udformning", type: "theory",
        goals: ["5.1.1 Grænser for vejes sikkerhed", "5.1.2 Benyttelse af vejene"] },
      { id: "6(1)", title: "Grundregler for færdsel (uddrag)", type: "theory", selfStudy: true,
        goals: ["6.1 Anvisninger for færdslen", "6.2.1 Grundregler", "6.2.2 Fare og ulempe", "6.2.9 Færdselsulykke", "6.2.10 Forsikringspligt", "6.2.11 Overladelse af køretøj"] },
    ],
  },
  {
    id: 2, title: "Forberedende teori- og kørselsmodul", color: "#059669",
    theory: 5, practice: 3, selfStudyAllowed: [1, 6],
    sections: [
      { id: "1", title: "Køretøjets indretning, udstyr, betjening", type: "theory", selfStudy: true,
        goals: ["1.1 Betjeningsudstyr og instrumenter", "1.1.6 Førerassistentsystemer", "1.2 Lovbestemmelser", "1.2.6 Energi- og miljørigtig kørsel", "1.2.10 Særlige køretøjer", "1.3 Køretøjets dokumenter"] },
      { id: "2", title: "Manøvrer på lukket øvelsesplads", type: "practice",
        goals: ["2.1 Forberedelse til kørsel", "2.2 Igangsætning og standsning", "2.3 Kørsel i 8-tal", "2.4 Forlæns/baglæns målbremsning", "2.5 Baglæns kørsel med svingning", "2.6 Forlæns/baglæns slalom", "2.7 Parkering ved vejkant", "2.8 Kørsel i 2. gear, højresving", "2.9 Vending"] },
      { id: "5.2", title: "Risikoforhold ved vejene", type: "theory",
        goals: ["5.2.1 Kendetegn på risikoforhold", "5.2.2 Vejens omgivelser", "5.2.3 Vejens udstyr", "5.2.4 Vejens forløb", "5.2.5 Vejens brug", "5.2.6 Vejens type"] },
      { id: "6(2)", title: "Grundregler for færdsel (fortsat)", type: "theory", selfStudy: true,
        goals: ["6.2.3 Signalgivning", "6.2.4 Tegngivning", "6.2.5 Brug af lys", "6.2.6 Fri passage", "6.2.7 Gods mv.", "6.2.8 Motorstop og slæbning"] },
    ],
  },
  {
    id: 3, title: "Grundlæggende kørsel på vej", color: "#D97706",
    theory: 8, practice: 6, selfStudyAllowed: [],
    gateIds: ["7.1", "7.2", "7.3", "7.6", "7.7", "7.8"],
    gateBlockedIds: ["7.4", "7.10", "7.11", "7.12", "7.13", "7.14", "7.15"],
    sections: [
      { id: "7.1", title: "Igangsætning og standsning", type: "both", mustBeFirst: true,
        goals: ["7.1.1 Ulykker", "7.1.2 Risikoforhold", "7.1.3 Orientering", "7.1.4 Manøvre", "7.1.5 Lovbestemmelser"] },
      { id: "7.2", title: "Placering under ligeudkørsel", type: "both", mustBeFirst: true,
        goals: ["7.2.1 Ulykker", "7.2.2 Risikoforhold", "7.2.3 Orientering", "7.2.4 Manøvre"] },
      { id: "7.3", title: "Hastighed under ligeudkørsel", type: "both", mustBeFirst: true,
        goals: ["7.3.1 Ulykker", "7.3.2 Risikoforhold", "7.3.3 Orientering", "7.3.4 Manøvre", "7.3.5 Lovbestemmelser"] },
      { id: "7.6", title: "Passage af holdende køretøjer", type: "both", mustBeFirst: true,
        goals: ["7.6.1 Ulykker", "7.6.2 Risikoforhold", "7.6.3 Orientering", "7.6.4 Manøvre"] },
      { id: "7.7", title: "Møde", type: "both", mustBeFirst: true,
        goals: ["7.7.1 Ulykker", "7.7.2 Risikoforhold", "7.7.3 Orientering", "7.7.4 Manøvre", "7.7.5 Lovbestemmelser"] },
      { id: "7.8", title: "Kørsel foran/efter andre", type: "both", mustBeFirst: true,
        goals: ["7.8.1 Ulykker", "7.8.2 Risikoforhold", "7.8.3 Orientering", "7.8.4 Manøvre", "7.8.5 Lovbestemmelser"] },
      { id: "7.4", title: "Vognbaneskift", type: "both", context: "Mindre trafikeret vej",
        goals: ["7.4.1 Ulykker", "7.4.2 Risikoforhold", "7.4.3 Orientering", "7.4.4 Manøvre", "7.4.5 Lovbestemmelser"] },
      { id: "7.10", title: "Trafiksanerede områder", type: "both",
        goals: ["7.10.1 Ulykker", "7.10.2 Risikoforhold", "7.10.3 Orientering", "7.10.4 Manøvre", "7.10.5 Lovbestemmelser"] },
      { id: "7.11", title: "Fremkørsel mod kryds", type: "both", context: "Mindre trafikeret vej",
        goals: ["7.11.1 Ulykker", "7.11.2 Risikoforhold", "7.11.3 Orientering", "7.11.4 Manøvre"] },
      { id: "7.12", title: "Ligeudkørsel i kryds", type: "both", context: "Mindre trafikeret vej",
        goals: ["7.12.1 Ulykker", "7.12.2 Risikoforhold", "7.12.3 Orientering", "7.12.4 Manøvre"] },
      { id: "7.13", title: "Højresving i kryds", type: "both", context: "Mindre trafikeret vej",
        goals: ["7.13.1 Ulykker", "7.13.2 Risikoforhold", "7.13.3 Orientering", "7.13.4 Manøvre"] },
      { id: "7.14", title: "Venstresving i kryds", type: "both", context: "Mindre trafikeret vej",
        goals: ["7.14.1 Ulykker", "7.14.2 Risikoforhold", "7.14.3 Orientering", "7.14.4 Manøvre"] },
      { id: "7.15", title: "Kørsel i rundkørsel", type: "both", context: "Mindre trafikeret vej",
        goals: ["7.15.1 Ulykker", "7.15.2 Risikoforhold", "7.15.3 Orientering", "7.15.4 Manøvre"] },
    ],
  },
  {
    id: 4, title: "Udvidet kørsel på vej", color: "#DC2626",
    theory: 9, practice: 6, practiceNote: "heraf min. 1 i mørke", selfStudyAllowed: [10],
    sections: [
      { id: "7.4*", title: "Vognbaneskift (tæt trafik)", type: "practice", context: "Genoptaget fra M3" },
      { id: "7.11*", title: "Fremkørsel mod kryds (tæt trafik)", type: "practice", context: "Genoptaget fra M3" },
      { id: "7.12*", title: "Ligeudkørsel i kryds (tæt trafik)", type: "practice", context: "Genoptaget fra M3" },
      { id: "7.13*", title: "Højresving i kryds (tæt trafik)", type: "practice", context: "Genoptaget fra M3" },
      { id: "7.14*", title: "Venstresving i kryds (tæt trafik)", type: "practice", context: "Genoptaget fra M3" },
      { id: "7.15*", title: "Kørsel i rundkørsel (tæt trafik)", type: "practice", context: "Genoptaget fra M3" },
      { id: "7.5", title: "Vending og baglænskørsel", type: "both",
        goals: ["7.5.1 Ulykker", "7.5.2 Risikoforhold", "7.5.3 Orientering", "7.5.4 Manøvre", "7.5.5 Lovbestemmelser"] },
      { id: "7.9", title: "Overhaling", type: "both",
        goals: ["7.9.1 Ulykker", "7.9.2 Risikoforhold", "7.9.3 Orientering", "7.9.4 Manøvre", "7.9.5 Lovbestemmelser"] },
      { id: "7.16", title: "Kørsel på motorvej", type: "both",
        goals: ["7.16.1 Ulykker", "7.16.2 Risikoforhold", "7.16.3 Orientering", "7.16.4 Manøvre", "7.16.5 Lovbestemmelser", "7.16.6 Motortrafikvej"] },
      { id: "7.17", title: "Kørsel ved siden af andre", type: "both",
        goals: ["7.17.1 Ulykker", "7.17.2 Risikoforhold", "7.17.3 Orientering", "7.17.4 Manøvre"] },
      { id: "7.18", title: "Standsning og parkering", type: "both",
        goals: ["7.18.1 Ulykker", "7.18.2 Risikoforhold", "7.18.3 Orientering", "7.18.4 Manøvre", "7.18.5 Lovbestemmelser"] },
      { id: "7.19", title: "Kørsel i mørke", type: "both", highlight: "Min. 1 lektion i mørke",
        goals: ["7.19.1 Ulykker", "7.19.2 Risikoforhold", "7.19.3 Orientering", "7.19.4 Manøvre", "7.19.5 Lovbestemmelser"] },
      { id: "7.20", title: "Kørsel i tunnel", type: "both",
        goals: ["7.20.1 Ulykker", "7.20.2 Risikoforhold", "7.20.3 Orientering", "7.20.4 Manøvre"] },
      { id: "7.21", title: "Kørsel ved letbane", type: "both",
        goals: ["7.21.1 Ulykker", "7.21.2 Risikoforhold", "7.21.3 Orientering"] },
      { id: "8", title: "Særlige risikoforhold", type: "theory",
        goals: ["8.1.1 Alkohol", "8.1.2 Narkotika", "8.1.3 Hastighed", "8.1.4 Sikkerhedssele", "8.2.1 Opmærksomhed", "8.2.2 Adfærd", "8.2.3 Kørselskompetencer"] },
      { id: "10(2)", title: "Kørekortregler (fortsat)", type: "theory", selfStudy: true,
        goals: ["10.1.2 Indstilling til køreprøve", "10.2 Køreprøvens gennemførelse", "10.3 Lovbestemmelser om kørekort"] },
    ],
  },
  {
    id: 5, title: "Afsluttende modul", color: "#7C3AED",
    theory: 1, practice: 9, practiceNote: "heraf 4 på KTA", selfStudyAllowed: [9],
    sections: [
      { id: "9", title: "Manøvrer på køreteknisk anlæg", type: "both", selfStudy: true, highlightPractice: "4 obligatoriske lektioner på KTA",
        goals: ["9.1 Vejgreb og belæsning", "9.2 Hastighed og bremselængde", "9.3 Hindringer og slalom", "9.4 Genvinding af vejgreb", "9.5 Kørsel over høj vejkant"] },
      { id: "7.22", title: "Afsluttende øvelseskørsel", type: "practice", repeatable: true,
        goals: ["7.22.1 Bilens indretning mv.", "7.22.2 Trafikantadfærd", "7.22.3 Vejforhold", "Selvstændig planlægning"] },
    ],
  },
];

// Build flat draggable items: split "both" into theory + practice items
function buildItems(modules) {
  const items = [];
  modules.forEach(mod => {
    mod.sections.forEach(sec => {
      if (sec.type === "both") {
        items.push({
          uid: `${mod.id}-${sec.id}-T`,
          moduleId: mod.id, sectionId: sec.id, mode: "theory",
          title: sec.title, goals: sec.goals || [],
          mustBeFirst: sec.mustBeFirst, selfStudy: sec.selfStudy,
          context: sec.context, highlight: sec.highlight || sec.highlightTheory,
        });
        items.push({
          uid: `${mod.id}-${sec.id}-P`,
          moduleId: mod.id, sectionId: sec.id, mode: "practice",
          title: sec.title, goals: sec.goals || [],
          mustBeFirst: sec.mustBeFirst,
          context: sec.context, highlight: sec.highlight || sec.highlightPractice,
        });
      } else {
        items.push({
          uid: `${mod.id}-${sec.id}-${sec.type === "theory" ? "T" : "P"}`,
          moduleId: mod.id, sectionId: sec.id, mode: sec.type,
          title: sec.title, goals: sec.goals || [],
          mustBeFirst: sec.mustBeFirst, selfStudy: sec.selfStudy,
          context: sec.context, highlight: sec.highlight,
          repeatable: sec.repeatable || false,
        });
      }
    });
  });
  return items;
}

const ALL_ITEMS = buildItems(MODULES_RAW);
const MODULES_MAP = Object.fromEntries(MODULES_RAW.map(m => [m.id, m]));

// Lookup helper: supports repeatable item copies (uid with #N suffix)
function findItem(uid) {
  return ALL_ITEMS.find(i => i.uid === uid) || ALL_ITEMS.find(i => i.uid === uid.replace(/#\d+$/, ""));
}

// ─────────────────────────────────────────────────────────
// VALIDATION ENGINE
// ─────────────────────────────────────────────────────────

function validateBlocks(blocks) {
  const warnings = [];
  const errors = [];

  // Gather all placed item UIDs grouped by module
  const placedByModule = {};
  const allPlacedUids = new Set();
  const blockOrder = []; // ordered list of { blockIdx, item }

  blocks.forEach((block, bIdx) => {
    block.items.forEach(uid => {
      allPlacedUids.add(uid);
      const item = findItem(uid);
      if (!item) return;
      if (!placedByModule[item.moduleId]) placedByModule[item.moduleId] = [];
      placedByModule[item.moduleId].push({ blockIdx: bIdx, item, blockType: block.type });
      blockOrder.push({ blockIdx: bIdx, item, blockType: block.type });
    });
  });

  // 0. Check: max 3 lessons for theory/practice blocks, max 4 for KTA
  blocks.forEach((block, bIdx) => {
    const isKTA = block.type === "practice" && block.items.some(uid => {
      const it = findItem(uid);
      return it && it.moduleId === 5 && it.sectionId === "9";
    });
    const maxLessons = isKTA ? 4 : 3;
    if (block.type === "theory" && block.lessons > 4) {
      errors.push(`"${block.name}" (blok ${bIdx + 1}): Max 4 teorilektioner pr. dag — du har sat ${block.lessons}.`);
    }
    if (block.type === "practice" && block.lessons > maxLessons) {
      errors.push(`"${block.name}" (blok ${bIdx + 1}): Max ${maxLessons} praktiske lektioner pr. dag${isKTA ? "" : ""} — du har sat ${block.lessons}.`);
    }
  });

  // 0b. Self-study: max 7 lessons total
  const totalSelfStudyLessons = blocks
    .filter(b => b.type === "selfStudy")
    .reduce((s, b) => s + b.lessons, 0);
  if (totalSelfStudyLessons > MAX_SELF_STUDY_LESSONS) {
    errors.push(`Selvstudium: Max ${MAX_SELF_STUDY_LESSONS} lektioner tilladt — du har ${totalSelfStudyLessons}.`);
  }

  // 0c. Self-study: only allowed sections
  blocks.forEach((block, bIdx) => {
    if (block.type !== "selfStudy") return;
    block.items.forEach(uid => {
      const item = findItem(uid);
      if (!item) return;
      if (item.mode !== "theory") {
        errors.push(`"${block.name}" (blok ${bIdx + 1}): "${item.title}" — kun teorimål kan være selvstudium.`);
        return;
      }
      if (!SELF_STUDY_ALLOWED_SECTIONS.has(item.sectionId)) {
        errors.push(`"${block.name}" (blok ${bIdx + 1}): Afsnit ${item.sectionId} "${item.title}" er IKKE tilladt som selvstudium. Kun afsnit 1, 3, 6, 9, 10.`);
      }
    });
  });

  // 1. Check: theory items only in theory/selfStudy blocks, practice only in practice
  blocks.forEach((block, bIdx) => {
    block.items.forEach(uid => {
      const item = findItem(uid);
      if (!item) return;
      if (block.type === "theory" && item.mode === "practice") {
        errors.push(`Blok ${bIdx + 1}: "${item.title}" (praksis) kan ikke placeres i en teoriaften.`);
      }
      if (block.type === "practice" && item.mode === "theory") {
        errors.push(`Blok ${bIdx + 1}: "${item.title}" (teori) kan ikke placeres i en praktisk øvelse.`);
      }
      if (block.type === "selfStudy" && item.mode === "practice") {
        errors.push(`Blok ${bIdx + 1}: "${item.title}" (praksis) kan ikke være selvstudium.`);
      }
    });
  });

  // 2. Check: theory before practice for "both" sections
  ALL_ITEMS.forEach(item => {
    if (item.mode === "practice") {
      // Find matching theory item
      const theoryUid = item.uid.replace(/-P$/, "-T");
      const theoryItem = findItem(theoryUid);
      if (!theoryItem) return;

      const practiceBlock = blocks.findIndex(b => b.items.includes(item.uid));
      const theoryBlock = blocks.findIndex(b => b.items.includes(theoryUid));

      if (practiceBlock !== -1 && theoryBlock === -1) {
        errors.push(`"${item.title}" praksis er placeret, men teori er ikke placeret endnu. Teori skal komme før praksis.`);
      } else if (practiceBlock !== -1 && theoryBlock !== -1 && theoryBlock > practiceBlock) {
        errors.push(`"${item.title}": Teori (blok ${theoryBlock + 1}) skal komme FØR praksis (blok ${practiceBlock + 1}).`);
      }
    }
  });

  // 3. Check M1: "0" and "10.1.1" must be first
  const m1Items = placedByModule[1] || [];
  const mustFirstM1 = m1Items.filter(p => p.item.mustBeFirst);
  const otherM1 = m1Items.filter(p => !p.item.mustBeFirst);
  if (mustFirstM1.length > 0 && otherM1.length > 0) {
    const maxFirst = Math.max(...mustFirstM1.map(p => p.blockIdx));
    const minOther = Math.min(...otherM1.map(p => p.blockIdx));
    if (maxFirst > minOther) {
      errors.push("Modul 1: Afsnit 0 og 10.1.1 SKAL gennemgås i en blok FØR de øvrige M1-emner.");
    }
  }

  // 3b. Check mustBeFirst items are at the TOP within their block
  blocks.forEach((block, bIdx) => {
    const itemsInBlock = block.items.map(uid => findItem(uid)).filter(Boolean);
    let lastMustFirstIdx = -1;
    let firstNonMustFirstIdx = -1;
    itemsInBlock.forEach((item, idx) => {
      if (item.mustBeFirst) lastMustFirstIdx = idx;
      if (!item.mustBeFirst && firstNonMustFirstIdx === -1) firstNonMustFirstIdx = idx;
    });
    if (lastMustFirstIdx > 0 && firstNonMustFirstIdx !== -1 && firstNonMustFirstIdx < lastMustFirstIdx) {
      errors.push(`"${block.name}" (blok ${bIdx + 1}): "Skal først"-mål (⚡) skal placeres øverst i blokken.`);
    }
  });

  // 4. Check M3 gate: 7.1-7.3 + 7.6-7.8 practice must be placed before 7.4/7.10-7.15 practice
  const mod3 = MODULES_MAP[3];
  if (mod3) {
    const gateIds = mod3.gateIds || [];
    const blockedIds = mod3.gateBlockedIds || [];
    const gatePracticeUids = gateIds.map(id => `3-${id}-P`);
    const blockedPracticeUids = blockedIds.map(id => `3-${id}-P`);

    const gatePlaced = gatePracticeUids.map(uid => blocks.findIndex(b => b.items.includes(uid)));
    const blockedPlaced = blockedPracticeUids.map(uid => blocks.findIndex(b => b.items.includes(uid)));

    const anyBlockedPlaced = blockedPlaced.filter(i => i !== -1);
    const anyGateNotPlaced = gatePlaced.filter(i => i === -1);

    if (anyBlockedPlaced.length > 0 && anyGateNotPlaced.length > 0) {
      errors.push("Modul 3: Alle gate-emner (7.1–7.3, 7.6–7.8) SKAL være placeret i praksis FØR kryds/rundkørsler (7.4, 7.10–7.15).");
    } else if (anyBlockedPlaced.length > 0) {
      const maxGate = Math.max(...gatePlaced);
      const minBlocked = Math.min(...anyBlockedPlaced);
      if (maxGate > minBlocked) {
        errors.push("Modul 3: Gate-emner (7.1–7.3, 7.6–7.8) praksis skal placeres i blokke FØR kryds/rundkørsler praksis.");
      }
    }
  }

  // 5. Check lesson counts per module
  [1, 2, 3, 4, 5].forEach(modId => {
    const mod = MODULES_MAP[modId];
    const placed = placedByModule[modId] || [];
    const theoryCount = blocks.reduce((sum, block) => {
      if (block.type !== "theory") return sum;
      const modItems = block.items.filter(uid => {
        const item = findItem(uid);
        return item && item.moduleId === modId;
      });
      return sum + modItems.length; // each item ~ approximate
    }, 0);
    // This is informational only since lesson count is set per block
  });

  // 6. Check module sequential order: all of module N must be in blocks before module N+1
  for (let m = 1; m <= 4; m++) {
    const mItems = placedByModule[m] || [];
    const nextItems = placedByModule[m + 1] || [];
    if (mItems.length > 0 && nextItems.length > 0) {
      const maxM = Math.max(...mItems.map(p => p.blockIdx));
      const minNext = Math.min(...nextItems.map(p => p.blockIdx));
      if (maxM > minNext) {
        errors.push(`Modul ${m} skal afsluttes FØR modul ${m + 1} påbegyndes (blokrækkefølge).`);
      }
    }
  }

  // 7. Lesson count tracking per module
  [1, 2, 3, 4, 5].forEach(modId => {
    const mod = MODULES_MAP[modId];
    let tCount = 0;
    let pCount = 0;
    blocks.forEach(block => {
      block.items.forEach(uid => {
        const item = findItem(uid);
        if (!item || item.moduleId !== modId) return;
      });
      // Use block lessons
      const modItemsInBlock = block.items.filter(uid => {
        const item = findItem(uid);
        return item && item.moduleId === modId;
      });
      if (modItemsInBlock.length > 0) {
        // Proportional allocation based on block lessons
        // Actually we track via block-level lesson assignment
      }
    });
  });

  return { errors, warnings };
}

// ─────────────────────────────────────────────────────────
// Lesson count per module from blocks
// ─────────────────────────────────────────────────────────
function getModuleLessonCounts(blocks) {
  const counts = {};
  [1, 2, 3, 4, 5].forEach(id => { counts[id] = { theory: 0, practice: 0, selfStudy: 0 }; });

  blocks.forEach(block => {
    if (block.items.length === 0) return;

    // Count items per module in this block
    const modItemCounts = {};
    block.items.forEach(uid => {
      const item = findItem(uid);
      if (!item) return;
      modItemCounts[item.moduleId] = (modItemCounts[item.moduleId] || 0) + 1;
    });

    const totalItems = block.items.length;

    // Distribute block.lessons proportionally by item count per module
    Object.entries(modItemCounts).forEach(([modId, itemCount]) => {
      const share = (itemCount / totalItems) * block.lessons;
      const mid = Number(modId);
      if (block.type === "selfStudy") {
        counts[mid].selfStudy += share;
        counts[mid].theory += share;
      } else if (block.type === "theory") {
        counts[mid].theory += share;
      } else {
        counts[mid].practice += share;
      }
    });
  });

  return counts;
}

// Auto-adjust lesson count on a block when all module items are placed
function autoAdjustBlockLessons(blocks, blockId) {
  const targetBlock = blocks.find(b => b.id === blockId);
  if (!targetBlock || targetBlock.items.length === 0) return blocks;

  const isKTA = targetBlock.type === "practice" && targetBlock.items.some(uid => {
    const it = findItem(uid);
    return it && it.moduleId === 5 && it.sectionId === "9";
  });
  const maxLessons = targetBlock.type === "selfStudy" ? MAX_SELF_STUDY_LESSONS : targetBlock.type === "theory" ? 4 : (isKTA ? 4 : 3);
  const blockType = targetBlock.type;
  const itemMode = blockType === "selfStudy" ? "theory" : blockType;

  // Find which modules have items in this block
  const modulesInBlock = new Set();
  targetBlock.items.forEach(uid => {
    const it = findItem(uid);
    if (it) modulesInBlock.add(it.moduleId);
  });

  // For each module, check if all items of this type are now placed
  let neededExtra = 0;
  const placedSet = new Set(blocks.flatMap(b => b.items));

  modulesInBlock.forEach(modId => {
    const mod = MODULES_MAP[modId];
    const required = itemMode === "theory" ? mod.theory : mod.practice;
    const allModItems = ALL_ITEMS.filter(i => i.moduleId === modId && i.mode === itemMode);
    const allModPlaced = allModItems.every(i =>
      placedSet.has(i.uid) || (i.repeatable && [...placedSet].some(u => u.startsWith(i.uid + "#")))
    );

    if (allModPlaced) {
      const counts = getModuleLessonCounts(blocks);
      const currentCount = blockType === "practice"
        ? (counts[modId]?.practice || 0)
        : (counts[modId]?.theory || 0);
      const deficit = required - currentCount;
      if (deficit > 0) neededExtra += deficit;
    }
  });

  if (neededExtra > 0) {
    const newLessons = Math.min(maxLessons, targetBlock.lessons + Math.ceil(neededExtra));
    if (newLessons > targetBlock.lessons) {
      return blocks.map(b => b.id === blockId ? { ...b, lessons: newLessons } : b);
    }
  }
  return blocks;
}

// ─────────────────────────────────────────────────────────
// COMPONENT
// ─────────────────────────────────────────────────────────

const BLOCK_COLORS = {
  theory: { bg: "#0C1929", accent: "#3B82F6", text: "#E0ECFF", headerBg: "#152238", badge: "#1E3A5F" },
  practice: { bg: "#0D1F12", accent: "#22C55E", text: "#D4FDDF", headerBg: "#142A18", badge: "#1A3D22" },
  selfStudy: { bg: "#150D22", accent: "#A78BFA", text: "#E8DCFF", headerBg: "#1C1233", badge: "#2E1A50" },
};

// Sections allowed for self-study per bekendtgørelsen §25
// Afsnit 1, 3, 6, 9, 10 — but NOT 10.1.1 in M1
const SELF_STUDY_ALLOWED_SECTIONS = new Set([
  "1", "3", "6(1)", "6(2)", "9", "10(2)",
]);
const MAX_SELF_STUDY_LESSONS = 7;

const MODULE_ICONS = { 1: "①", 2: "②", 3: "③", 4: "④", 5: "⑤" };

export default function Lektionsopbygger() {
  // blocks: array of { id, type: 'theory'|'practice', name, lessons, items: [uid...] }
  const [blocks, setBlocks] = useState([]);
  const [activeModule, setActiveModule] = useState(1);
  const [dragItem, setDragItem] = useState(null);
  const [dragOverBlock, setDragOverBlock] = useState(null);
  const [showGoals, setShowGoals] = useState({});
  const [showValidation, setShowValidation] = useState(false);
  const blockIdCounter = useRef(1);
  // Filter state for right panel
  const [filterModule, setFilterModule] = useState("all"); // "all" | 1 | 2 | 3 | 4 | 5
  const [filterType, setFilterType] = useState("all"); // "all" | "theory" | "practice" | "selfStudy"
  // View mode: "build" or "summary"
  const [viewMode, setViewMode] = useState("build");
  // Multi-select for bulk move
  const [selectedUids, setSelectedUids] = useState(new Set());
  // Toast notifications
  const [toast, setToast] = useState(null);
  const toastTimer = useRef(null);
  const showToast = (msg, type = "info") => {
    setToast({ msg, type });
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 4000);
  };

  // Saved plans (localStorage)
  const STORAGE_KEY = "lektionsopbygger_plans";
  const [savedPlans, setSavedPlans] = useState(() => {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}"); } catch { return {}; }
  });
  const [showPlanMenu, setShowPlanMenu] = useState(false);
  const [planNameInput, setPlanNameInput] = useState("");
  const [currentPlanName, setCurrentPlanName] = useState(null);

  const savePlan = (name) => {
    if (!name.trim()) return;
    const plan = {
      blocks,
      blockIdCounter: blockIdCounter.current,
      savedAt: new Date().toISOString(),
    };
    const updated = { ...savedPlans, [name.trim()]: plan };
    setSavedPlans(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    setCurrentPlanName(name.trim());
    setPlanNameInput("");
    setShowPlanMenu(false);
    showToast(`💾 "${name.trim()}" gemt`, "info");
  };

  const loadPlan = (name) => {
    const plan = savedPlans[name];
    if (!plan) return;
    setBlocks(plan.blocks);
    blockIdCounter.current = plan.blockIdCounter || (Math.max(0, ...plan.blocks.map(b => b.id)) + 1);
    setCurrentPlanName(name);
    setShowPlanMenu(false);
    setSelectedUids(new Set());
    showToast(`📂 "${name}" indlæst`, "info");
  };

  const deletePlan = (name, e) => {
    e.stopPropagation();
    const updated = { ...savedPlans };
    delete updated[name];
    setSavedPlans(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    if (currentPlanName === name) setCurrentPlanName(null);
    showToast(`🗑 "${name}" slettet`, "info");
  };

  const duplicatePlan = () => {
    const baseName = currentPlanName || "Plan";
    let n = 1;
    while (savedPlans[`${baseName} (kopi ${n})`]) n++;
    savePlan(`${baseName} (kopi ${n})`);
  };

  // Close plan menu on outside click
  const planMenuRef = useRef(null);
  useEffect(() => {
    if (!showPlanMenu) return;
    const handler = (e) => {
      if (planMenuRef.current && !planMenuRef.current.contains(e.target)) setShowPlanMenu(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showPlanMenu]);

  const addBlock = (type) => {
    const names = { theory: "Teoriaften", practice: "Køretime", selfStudy: "Selvstudium" };
    const defaultLessons = { theory: 4, practice: 2, selfStudy: 1 };
    const count = blocks.filter(b => b.type === type).length + 1;
    setBlocks(prev => [...prev, {
      id: blockIdCounter.current++,
      type,
      name: `${names[type]} ${count}`,
      lessons: defaultLessons[type],
      items: [],
    }]);
  };

  const removeBlock = (blockId) => {
    setBlocks(prev => prev.filter(b => b.id !== blockId));
  };

  const updateBlockLessons = (blockId, lessons) => {
    setBlocks(prev => prev.map(b => b.id === blockId ? { ...b, lessons } : b));
  };

  const updateBlockName = (blockId, name) => {
    setBlocks(prev => prev.map(b => b.id === blockId ? { ...b, name } : b));
  };

  // Get all placed UIDs. Repeatable items are marked placed only when
  // they have at least one copy placed AND the module's lesson requirement is met.
  const placedUidsRaw = new Set(blocks.flatMap(b => b.items));
  const moduleCounts = getModuleLessonCounts(blocks);
  const placedUids = new Set([...placedUidsRaw].filter(uid => {
    const item = findItem(uid);
    if (item && item.repeatable && !uid.includes("#")) return false;
    return true;
  }));
  // Add repeatable originals as placed when module requirement is satisfied
  ALL_ITEMS.filter(i => i.repeatable).forEach(item => {
    const hasCopy = [...placedUidsRaw].some(u => u.startsWith(item.uid + "#"));
    if (hasCopy) {
      const mod = MODULES_MAP[item.moduleId];
      const required = item.mode === "practice" ? mod.practice : mod.theory;
      const current = item.mode === "practice"
        ? (moduleCounts[item.moduleId]?.practice || 0)
        : (moduleCounts[item.moduleId]?.theory || 0);
      if (current >= required) placedUids.add(item.uid);
    }
  });

  // Filter items for current module and mode
  const currentModule = MODULES_MAP[activeModule];
  const moduleItems = ALL_ITEMS.filter(i => i.moduleId === activeModule);
  const theoryItems = moduleItems.filter(i => i.mode === "theory");
  const practiceItems = moduleItems.filter(i => i.mode === "practice");

  // Drag ghost ref — always mounted, positioned offscreen
  const dragGhostRef = useRef(null);
  const [ghostItems, setGhostItems] = useState([]);

  // Drag handlers
  const onDragStart = (uid, e) => {
    setDragItem(uid);
    const isMulti = selectedUids.has(uid) && selectedUids.size > 1;

    if (!selectedUids.has(uid)) {
      setSelectedUids(new Set());
    }

    // Build custom drag ghost for multi-select
    if (isMulti && e) {
      const items = [...selectedUids].map(u => findItem(u)).filter(Boolean);
      setGhostItems(items);
      // Need to wait for React to render the ghost before setDragImage
      // Use a pre-built offscreen element instead
      const ghost = document.createElement("div");
      ghost.style.cssText = "position:absolute;top:-1000px;left:-1000px;pointer-events:none;z-index:9999;display:flex;flex-direction:column;gap:2px;padding:8px;background:#1A1F2E;border:2px solid #60A5FA;border-radius:10px;box-shadow:0 8px 32px rgba(0,0,0,0.5);width:260px;font-family:system-ui,sans-serif;";

      const maxShow = Math.min(items.length, 5);
      for (let idx = 0; idx < maxShow; idx++) {
        const it = items[idx];
        const mod = MODULES_MAP[it.moduleId];
        const row = document.createElement("div");
        row.style.cssText = `display:flex;align-items:center;gap:6px;padding:5px 8px;border-radius:6px;font-size:12px;color:#E5E7EB;background:${it.mode === "theory" ? "#0F172A" : "#0B1A0F"};border:1px solid ${it.mode === "theory" ? "#1E3A5F55" : "#14532D55"};`;
        row.innerHTML = `<span style="flex-shrink:0">${it.mode === "theory" ? "📖" : "🚗"}</span><span style="font-family:monospace;font-size:10px;font-weight:700;color:${mod.color};flex-shrink:0">${it.sectionId}</span><span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${it.title}</span>`;
        ghost.appendChild(row);
      }
      if (items.length > maxShow) {
        const more = document.createElement("div");
        more.style.cssText = "text-align:center;font-size:10px;color:#9CA3AF;padding:2px 0;";
        more.textContent = `+ ${items.length - maxShow} mere`;
        ghost.appendChild(more);
      }
      // Count badge
      const badge = document.createElement("div");
      badge.style.cssText = "position:absolute;top:-10px;right:-10px;background:#3B82F6;color:#fff;font-size:13px;font-weight:900;border-radius:99px;min-width:24px;height:24px;display:flex;align-items:center;justify-content:center;padding:0 6px;font-family:monospace;box-shadow:0 2px 8px rgba(0,0,0,0.4);";
      badge.textContent = items.length;
      ghost.style.position = "relative";
      ghost.appendChild(badge);

      // Must be in DOM before setDragImage
      document.body.appendChild(ghost);
      // Force layout
      ghost.getBoundingClientRect();
      e.dataTransfer.setDragImage(ghost, 130, 20);
      // Remove after browser captures the image (needs ~100ms)
      setTimeout(() => { if (ghost.parentNode) document.body.removeChild(ghost); }, 100);
    }
  };
  const onDragEnd = () => { setDragItem(null); setDragOverBlock(null); setGhostItems([]); };

  // Generate next copy uid for a repeatable item
  const nextRepeatUid = (baseUid) => {
    const allPlaced = blocks.flatMap(b => b.items);
    let n = 1;
    while (allPlaced.includes(`${baseUid}#${n}`)) n++;
    return `${baseUid}#${n}`;
  };

  const onDropToBlock = (blockId, insertAtIndex) => {
    if (!dragItem) return;

    const rawUids = selectedUids.has(dragItem) && selectedUids.size > 0
      ? [...selectedUids]
      : [dragItem];

    // For repeatable items dragged from pool (original uid), create a copy uid
    const uidsToMove = rawUids.map(uid => {
      const item = findItem(uid);
      if (item && item.repeatable && !uid.includes("#")) {
        return nextRepeatUid(uid);
      }
      return uid;
    });
    // Track which raw uids are repeatable originals (should not be removed from blocks)
    const repeatableOriginals = new Set(rawUids.filter(uid => {
      const item = findItem(uid);
      return item && item.repeatable && !uid.includes("#");
    }));

    let didAutoSort = false;

    setBlocks(prev => {
      // Only remove non-repeatable-original items from existing blocks
      const toRemove = new Set(rawUids.filter(uid => !repeatableOriginals.has(uid)));
      const cleaned = prev.map(b => ({
        ...b,
        items: b.items.filter(uid => !toRemove.has(uid)),
      }));
      let result = cleaned.map(b => {
        if (b.id === blockId) {
          const existing = new Set(b.items);
          const toAdd = uidsToMove.filter(uid => !existing.has(uid));
          let items;
          if (insertAtIndex !== undefined && insertAtIndex >= 0) {
            items = [...b.items];
            items.splice(insertAtIndex, 0, ...toAdd);
          } else {
            items = [...b.items, ...toAdd];
          }
          // Auto-sort: mustBeFirst items float to top
          const mustFirst = items.filter(uid => { const it = findItem(uid); return it && it.mustBeFirst; });
          const rest = items.filter(uid => { const it = findItem(uid); return !it || !it.mustBeFirst; });
          const sorted = [...mustFirst, ...rest];
          if (sorted.some((uid, idx) => uid !== items[idx])) {
            didAutoSort = true;
          }
          return { ...b, items: sorted };
        }
        return b;
      });

      // Auto-adjust lessons when all module items are placed
      result = autoAdjustBlockLessons(result, blockId);

      return result;
    });

    if (didAutoSort) {
      showToast("⚡ Mål markeret \"Skal først\" er rykket til toppen — de skal gennemgås før øvrige emner iht. bekendtgørelsen.", "warn");
    }

    setDragItem(null);
    setDragOverBlock(null);
    setSelectedUids(new Set());
  };

  const onDropToPool = () => {
    if (!dragItem) return;

    const uidsToRemove = selectedUids.has(dragItem) && selectedUids.size > 0
      ? [...selectedUids]
      : [dragItem];
    const uidsSet = new Set(uidsToRemove);

    setBlocks(prev => prev.map(b => ({
      ...b,
      items: b.items.filter(uid => !uidsSet.has(uid)),
    })));
    setDragItem(null);
    setSelectedUids(new Set());
  };

  // Auto-create a new block of the right type when dropping onto the empty area
  const onDropToNewBlock = () => {
    if (!dragItem) return;

    const rawUids = selectedUids.has(dragItem) && selectedUids.size > 0
      ? [...selectedUids]
      : [dragItem];

    // For repeatable items from pool, create copy uids
    const uidsToMove = rawUids.map(uid => {
      const item = findItem(uid);
      if (item && item.repeatable && !uid.includes("#")) {
        return nextRepeatUid(uid);
      }
      return uid;
    });
    const repeatableOriginals = new Set(rawUids.filter(uid => {
      const item = findItem(uid);
      return item && item.repeatable && !uid.includes("#");
    }));

    const items = uidsToMove.map(u => findItem(u)).filter(Boolean);
    const theoryUids = uidsToMove.filter(u => { const it = findItem(u); return it && it.mode === "theory"; });
    const practiceUids = uidsToMove.filter(u => { const it = findItem(u); return it && it.mode === "practice"; });

    // Check if ALL theory items are selfStudy-eligible
    const theoryItems = theoryUids.map(u => findItem(u)).filter(Boolean);
    const allSelfStudy = theoryItems.length > 0 &&
      theoryItems.every(it => it.selfStudy && SELF_STUDY_ALLOWED_SECTIONS.has(it.sectionId));

    setBlocks(prev => {
      const toRemove = new Set(rawUids.filter(uid => !repeatableOriginals.has(uid)));
      let cleaned = prev.map(b => ({
        ...b,
        items: b.items.filter(uid => !toRemove.has(uid)),
      }));

      const newBlockIds = [];

      if (theoryUids.length > 0) {
        if (allSelfStudy && practiceUids.length === 0) {
          const ssCount = cleaned.filter(b => b.type === "selfStudy").length + 1;
          const newId = blockIdCounter.current++;
          newBlockIds.push(newId);
          cleaned = [...cleaned, {
            id: newId,
            type: "selfStudy",
            name: `Selvstudium ${ssCount}`,
            lessons: Math.min(MAX_SELF_STUDY_LESSONS, theoryUids.length),
            items: theoryUids,
          }];
        } else {
          const tCount = cleaned.filter(b => b.type === "theory").length + 1;
          const newId = blockIdCounter.current++;
          newBlockIds.push(newId);
          cleaned = [...cleaned, {
            id: newId,
            type: "theory",
            name: `Teoriaften ${tCount}`,
            lessons: Math.min(4, theoryUids.length),
            items: theoryUids,
          }];
        }
      }
      if (practiceUids.length > 0) {
        const pItems = practiceUids.map(u => findItem(u)).filter(Boolean);
        const pCount = cleaned.filter(b => b.type === "practice").length + 1;

        const hasKTA = pItems.some(it => it.moduleId === 5 && it.sectionId === "9");
        const hasManøvre = pItems.some(it => it.moduleId === 2 && it.sectionId === "2");

        let pName = `Køretime ${pCount}`;
        let pLessons = Math.min(3, practiceUids.length);

        if (hasKTA && pItems.every(it => it.moduleId === 5 && it.sectionId === "9")) {
          pName = `KTA`;
          pLessons = 4;
        } else if (hasManøvre && pItems.every(it => it.moduleId === 2 && it.sectionId === "2")) {
          pName = `Manøvrebane`;
          pLessons = 3;
        }

        const newId = blockIdCounter.current++;
        newBlockIds.push(newId);
        cleaned = [...cleaned, {
          id: newId,
          type: "practice",
          name: pName,
          lessons: pLessons,
          items: practiceUids,
        }];
      }

      // Auto-adjust lessons for each newly created block
      for (const bid of newBlockIds) {
        cleaned = autoAdjustBlockLessons(cleaned, bid);
      }

      return cleaned;
    });

    // Show toast for smart defaults
    const pItems = uidsToMove.map(u => findItem(u)).filter(Boolean);
    const hasKTA = pItems.some(it => it.mode === "practice" && it.moduleId === 5 && it.sectionId === "9");
    const hasManøvre = pItems.some(it => it.mode === "practice" && it.moduleId === 2 && it.sectionId === "2");
    if (hasKTA) showToast("🏎️ KTA-blok oprettet med 4 lektioner (obligatorisk krav iht. BEK 1150).", "info");
    else if (hasManøvre) showToast("🅿️ Manøvrebane-blok oprettet med 3 lektioner (anbefalet for lukket øvelsesplads).", "info");

    setDragItem(null);
    setDragOverBlock(null);
    setSelectedUids(new Set());
  };

  const removeFromBlock = (blockId, uid) => {
    setBlocks(prev => prev.map(b =>
      b.id === blockId ? { ...b, items: b.items.filter(u => u !== uid) } : b
    ));
  };

  // Reorder blocks via drag
  const [dragBlock, setDragBlock] = useState(null);
  const [dragOverNewBlock, setDragOverNewBlock] = useState(false);
  const [blockInsertIndex, setBlockInsertIndex] = useState(null);
  const onBlockDragStart = (blockId) => setDragBlock(blockId);
  const onBlockDrop = (insertIdx) => {
    if (!dragBlock) return;
    setBlocks(prev => {
      const fromIdx = prev.findIndex(b => b.id === dragBlock);
      if (fromIdx === -1) return prev;
      const arr = [...prev];
      const [moved] = arr.splice(fromIdx, 1);
      // Adjust insertion index if we removed from before
      const adjustedIdx = insertIdx > fromIdx ? insertIdx - 1 : insertIdx;
      arr.splice(adjustedIdx, 0, moved);
      return arr;
    });
    setDragBlock(null);
    setBlockInsertIndex(null);
  };
  const onBlockDragEnd = () => { setDragBlock(null); setBlockInsertIndex(null); };

  // Move item within/between blocks
  const moveItemInBlock = (blockId, uid, direction) => {
    setBlocks(prev => prev.map(b => {
      if (b.id !== blockId) return b;
      const idx = b.items.indexOf(uid);
      if (idx === -1) return b;
      const newIdx = idx + direction;
      if (newIdx < 0 || newIdx >= b.items.length) return b;
      const items = [...b.items];
      [items[idx], items[newIdx]] = [items[newIdx], items[idx]];
      return { ...b, items };
    }));
  };

  // Multi-select helpers
  const toggleSelect = (uid) => {
    setSelectedUids(prev => {
      const next = new Set(prev);
      if (next.has(uid)) next.delete(uid);
      else next.add(uid);
      return next;
    });
  };

  const selectAllInModule = (mode) => {
    // mode: "theory" (all theory incl selfStudy) | "theoryOnly" (theory excl selfStudy) | "practice" | "selfStudy" | "all"
    const items = ALL_ITEMS.filter(i => i.moduleId === activeModule && !placedUids.has(i.uid));
    const filtered = mode === "all" ? items
      : mode === "selfStudy" ? items.filter(i => i.mode === "theory" && i.selfStudy)
      : mode === "theoryOnly" ? items.filter(i => i.mode === "theory" && !i.selfStudy)
      : mode === "theoryAll" ? items.filter(i => i.mode === "theory")
      : items.filter(i => i.mode === mode);
    setSelectedUids(new Set(filtered.map(i => i.uid)));
  };

  const clearSelection = () => setSelectedUids(new Set());

  const bulkMoveToBlock = (blockId) => {
    if (selectedUids.size === 0) return;
    setBlocks(prev => {
      // Remove selected from any existing blocks
      let updated = prev.map(b => ({
        ...b,
        items: b.items.filter(uid => !selectedUids.has(uid)),
      }));
      // Add to target block
      return updated.map(b => {
        if (b.id === blockId) {
          const newItems = [...b.items, ...selectedUids].filter((v, i, a) => a.indexOf(v) === i);
          return { ...b, items: newItems };
        }
        return b;
      });
    });
    setSelectedUids(new Set());
  };

  const validation = validateBlocks(blocks);

  // Print PDF
  const printPlan = async () => {
    showToast("📄 Genererer PDF...", "info");

    // Dynamically load jsPDF + autoTable
    const loadScript = (src) => new Promise((resolve, reject) => {
      if (document.querySelector(`script[src="${src}"]`)) return resolve();
      const s = document.createElement("script");
      s.src = src;
      s.onload = resolve;
      s.onerror = reject;
      document.head.appendChild(s);
    });

    try {
      await loadScript("https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.2/jspdf.umd.min.js");
      await loadScript("https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.8.4/jspdf.plugin.autotable.min.js");
    } catch {
      showToast("❌ Kunne ikke hente PDF-bibliotek", "warn");
      return;
    }

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ unit: "mm", format: "a4" });
    const W = doc.internal.pageSize.getWidth();
    const M = 16; // margin
    let y = 20;

    const totalT = blocks.filter(b => b.type === "theory" || b.type === "selfStudy").reduce((s, b) => s + b.lessons, 0);
    const totalP = blocks.filter(b => b.type === "practice").reduce((s, b) => s + b.lessons, 0);
    const totalSS = blocks.filter(b => b.type === "selfStudy").reduce((s, b) => s + b.lessons, 0);
    const val = validation;

    // --- HEADER ---
    doc.setFontSize(20);
    doc.setFont("helvetica", "bold");
    doc.text("Modulplan \u00B7 Kategori B", W / 2, y, { align: "center" });
    y += 7;

    if (currentPlanName) {
      doc.setFontSize(13);
      doc.setTextColor(37, 99, 235);
      doc.text(currentPlanName, W / 2, y, { align: "center" });
      y += 6;
    }

    doc.setFontSize(9);
    doc.setTextColor(120);
    doc.setFont("helvetica", "normal");
    doc.text(
      `Undervisningsforl\u00F8b iht. BEK 1150 \u00B7 Genereret ${new Date().toLocaleDateString("da-DK", { day: "numeric", month: "long", year: "numeric" })}`,
      W / 2, y, { align: "center" }
    );
    y += 4;

    doc.setDrawColor(37, 99, 235);
    doc.setLineWidth(0.6);
    doc.line(M, y, W - M, y);
    y += 10;

    // --- STAT BOXES ---
    const stats = [
      { label: "Teori-lektioner", val: totalT, color: [37, 99, 235] },
      { label: "Praksis-lektioner", val: totalP, color: [22, 163, 74] },
      { label: "Heraf selvstudium", val: totalSS, color: [124, 58, 237] },
      { label: "Blokke i alt", val: blocks.length, color: [60, 60, 60] },
    ];
    const boxW = (W - 2 * M - 3 * 4) / 4;
    stats.forEach((s, i) => {
      const bx = M + i * (boxW + 4);
      doc.setFillColor(248, 249, 250);
      doc.setDrawColor(229, 231, 235);
      doc.roundedRect(bx, y, boxW, 18, 2, 2, "FD");
      doc.setFontSize(18);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...s.color);
      doc.text(String(s.val), bx + boxW / 2, y + 10, { align: "center" });
      doc.setFontSize(6);
      doc.setTextColor(120);
      doc.setFont("helvetica", "normal");
      doc.text(s.label.toUpperCase(), bx + boxW / 2, y + 15, { align: "center" });
    });
    y += 24;

    // --- MODULE TABLE ---
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(50);
    doc.text("Moduloversigt", M, y);
    y += 5;

    const modRows = [1, 2, 3, 4, 5].map(modId => {
      const mod = MODULES_MAP[modId];
      const c = moduleCounts[modId] || { theory: 0, practice: 0 };
      const tOk = Math.round(c.theory) >= mod.theory;
      const pOk = Math.round(c.practice) >= mod.practice;
      return [
        `M${modId}`,
        mod.title,
        `${Math.round(c.theory)} / ${mod.theory}T`,
        `${Math.round(c.practice)} / ${mod.practice}P`,
        tOk && pOk ? "OK" : "MANGLER",
      ];
    });

    doc.autoTable({
      startY: y,
      margin: { left: M, right: M },
      head: [["", "Modul", "Teori", "Praksis", "Status"]],
      body: modRows,
      styles: { fontSize: 8, cellPadding: 2.5, lineColor: [229, 231, 235], lineWidth: 0.2 },
      headStyles: { fillColor: [243, 244, 246], textColor: [100], fontStyle: "bold", fontSize: 7 },
      columnStyles: {
        0: { fontStyle: "bold", cellWidth: 14 },
        4: { fontStyle: "bold", halign: "center" },
      },
      didParseCell: (data) => {
        if (data.section === "body" && data.column.index === 4) {
          data.cell.styles.textColor = data.cell.raw === "OK" ? [22, 163, 74] : [220, 38, 38];
        }
        if (data.section === "body" && data.column.index === 2) {
          const mod = MODULES_MAP[data.row.index + 1];
          const c = moduleCounts[data.row.index + 1] || { theory: 0 };
          data.cell.styles.textColor = Math.round(c.theory) >= mod.theory ? [22, 163, 74] : [220, 38, 38];
        }
        if (data.section === "body" && data.column.index === 3) {
          const mod = MODULES_MAP[data.row.index + 1];
          const c = moduleCounts[data.row.index + 1] || { practice: 0 };
          data.cell.styles.textColor = Math.round(c.practice) >= mod.practice ? [22, 163, 74] : [220, 38, 38];
        }
      },
    });
    y = doc.lastAutoTable.finalY + 6;

    // --- VALIDATION ---
    if (val.errors.length > 0 || val.warnings.length > 0) {
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(220, 38, 38);
      doc.text("Validering", M, y);
      y += 5;
      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      val.errors.forEach(e => {
        if (y > 275) { doc.addPage(); y = 20; }
        doc.setTextColor(220, 38, 38);
        doc.text(`\u2716 ${e}`, M + 2, y);
        y += 4;
      });
      val.warnings.forEach(w => {
        if (y > 275) { doc.addPage(); y = 20; }
        doc.setTextColor(146, 64, 14);
        doc.text(`\u26A0 ${w}`, M + 2, y);
        y += 4;
      });
      y += 4;
    } else {
      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(22, 163, 74);
      doc.text("\u2705 Planen overholder alle krav", M, y);
      y += 8;
    }

    // --- BLOCKS ---
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(50);
    doc.text("Blokke", M, y);
    y += 6;

    const typeLabel = { theory: "Teoriaften", practice: "K\u00F8retime", selfStudy: "Selvstudium" };
    const typeColor = { theory: [37, 99, 235], practice: [22, 163, 74], selfStudy: [124, 58, 237] };
    const typeBg = { theory: [239, 246, 255], practice: [240, 253, 244], selfStudy: [245, 243, 255] };

    blocks.forEach((block, idx) => {
      const items = block.items.map(uid => findItem(uid)).filter(Boolean);
      const modules = [...new Set(items.map(i => i.moduleId))].sort();
      const color = typeColor[block.type];
      const bg = typeBg[block.type];

      // Estimate height: header (10) + items * 5 + padding
      const estHeight = 14 + items.length * 5 + 4;
      if (y + estHeight > 275) { doc.addPage(); y = 20; }

      // Block header background
      doc.setFillColor(...bg);
      doc.setDrawColor(...color);
      doc.setLineWidth(0.4);
      doc.roundedRect(M, y, W - 2 * M, 9, 1.5, 1.5, "FD");

      // Block number
      doc.setFillColor(229, 231, 235);
      doc.roundedRect(M + 2, y + 1.5, 7, 6, 1, 1, "F");
      doc.setFontSize(7);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(50);
      doc.text(String(idx + 1), M + 5.5, y + 5.5, { align: "center" });

      // Block name + type
      doc.setFontSize(9);
      doc.setTextColor(...color);
      doc.setFont("helvetica", "bold");
      doc.text(block.name, M + 12, y + 5.8);

      // Meta info
      doc.setFontSize(7);
      doc.setTextColor(140);
      doc.setFont("helvetica", "normal");
      const meta = `${typeLabel[block.type]} \u00B7 ${block.lessons} lekt. \u00B7 M${modules.join(", M")}`;
      doc.text(meta, W - M - 2, y + 5.8, { align: "right" });

      y += 10;

      // Block items table
      if (items.length > 0) {
        const itemRows = items.map(item => {
          let badges = "";
          if (item.mustBeFirst) badges += "\u26A1 ";
          if (item.selfStudy) badges += "\uD83D\uDCDA ";
          if (item.highlight) badges += item.highlight;
          return [
            `M${item.moduleId}`,
            item.sectionId,
            item.title,
            item.mode === "theory" ? "T" : "P",
            badges.trim(),
          ];
        });

        doc.autoTable({
          startY: y,
          margin: { left: M + 1, right: M + 1 },
          head: [["M", "Afsnit", "Emne", "", ""]],
          body: itemRows,
          styles: { fontSize: 7, cellPadding: 1.5, lineColor: [240, 240, 240], lineWidth: 0.15 },
          headStyles: { fillColor: [250, 250, 250], textColor: [160], fontStyle: "normal", fontSize: 6 },
          columnStyles: {
            0: { fontStyle: "bold", cellWidth: 10 },
            1: { cellWidth: 14, font: "courier" },
            3: { cellWidth: 8, fontStyle: "bold", halign: "center" },
            4: { cellWidth: 30, fontSize: 6, textColor: [130] },
          },
          didParseCell: (data) => {
            if (data.section === "body" && data.column.index === 0) {
              const modId = parseInt(data.cell.raw?.replace("M", ""));
              const mod = MODULES_MAP[modId];
              if (mod) {
                const c = mod.color;
                const r = parseInt(c.slice(1, 3), 16);
                const g = parseInt(c.slice(3, 5), 16);
                const b = parseInt(c.slice(5, 7), 16);
                data.cell.styles.textColor = [r, g, b];
              }
            }
          },
        });
        y = doc.lastAutoTable.finalY + 5;
      } else {
        y += 3;
      }
    });

    // --- FOOTER ---
    const addFooter = () => {
      const pages = doc.internal.getNumberOfPages();
      for (let i = 1; i <= pages; i++) {
        doc.setPage(i);
        doc.setFontSize(6.5);
        doc.setTextColor(170);
        doc.setFont("helvetica", "normal");
        const footY = doc.internal.pageSize.getHeight() - 10;
        doc.text("Lavet med DriveLoggers Forl\u00F8bsplanl\u00E6gger", W / 2, footY, { align: "center" });
        doc.text(
          "Fraskrivelse: DriveLogger fraskriver sig ethvert ansvar for eventuelle fejl ift. overholdelse af lovkrav til udformning af undervisningsforl\u00F8b.",
          W / 2, footY + 3, { align: "center" }
        );
        doc.text(
          `Det er k\u00F8rel\u00E6rerens ansvar at sikre, at den endelige undervisningsplan opfylder g\u00E6ldende bekendtg\u00F8relser.`,
          W / 2, footY + 6, { align: "center" }
        );
        doc.setTextColor(200);
        doc.text(`Side ${i} / ${pages}`, W - M, footY + 6, { align: "right" });
      }
    };

    addFooter();

    const filename = `modulplan-${(currentPlanName || "kategori-b").replace(/[^a-zæøå0-9]/gi, "-").toLowerCase()}.pdf`;
    doc.save(filename);
    showToast(`\uD83D\uDCC4 PDF downloadet: ${filename}`, "info");
  };

  return (
    <div style={{
      minHeight: "100vh",
      background: "#080B12",
      color: "#E5E7EB",
      fontFamily: "'DM Sans', 'Inter', system-ui, sans-serif",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;0,9..40,800&family=DM+Mono:wght@400;500&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        ::-webkit-scrollbar { width: 6px; height: 6px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #333; border-radius: 3px; }
        .drag-item { cursor: grab; user-select: none; transition: all 0.15s ease; }
        .drag-item:active { cursor: grabbing; }
        .drag-item:hover { transform: translateX(2px); }
        .dragging-along { opacity: 0.45; transform: scale(0.97); border-style: dashed !important; }
        .drag-over { outline: 2px dashed #3B82F6 !important; outline-offset: -2px; background: #111827 !important; }
        .block-drop { transition: outline 0.15s, background 0.15s; }
        .placed { opacity: 0.3; pointer-events: none; }
        .pool-item { border-radius: 8px; padding: 8px 12px; margin-bottom: 4px; font-size: 13px; display: flex; align-items: center; gap: 8px; }
        .btn { border: none; cursor: pointer; font-family: inherit; border-radius: 6px; font-weight: 600; transition: all 0.12s; }
        .btn:hover { filter: brightness(1.15); }
        .badge { display: inline-flex; align-items: center; gap: 3px; font-size: 10px; font-weight: 700; padding: 2px 7px; border-radius: 99px; letter-spacing: 0.03em; white-space: nowrap; }
        .block-card { border-radius: 12px; overflow: hidden; transition: all 0.2s; }
        .remove-btn { opacity: 0; transition: opacity 0.15s; }
        .pool-item:hover .remove-btn { opacity: 1; }
        .module-tab { padding: 10px 16px; border-radius: 8px; border: 1px solid transparent; cursor: pointer; font-weight: 600; font-size: 13px; transition: all 0.15s; font-family: inherit; }
        .module-tab:hover { filter: brightness(1.1); }
      `}</style>

      {/* Header */}
      <div style={{ padding: "24px 32px 16px", borderBottom: "1px solid #1A1F2E" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", maxWidth: 1400, margin: "0 auto" }}>
          <div>
            <h1 style={{
              fontSize: 22, fontWeight: 800, letterSpacing: "-0.03em",
              background: "linear-gradient(135deg, #60A5FA, #A78BFA, #F472B6)",
              WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
              marginBottom: 2,
            }}>
              Lektionsopbygger
            </h1>
            <p style={{ fontSize: 12, color: "#6B7280" }}>
              Træk mål ind i teoriaftener og køretimer · Modulplan Kategori B 2026
            </p>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            {/* Plan manager */}
            <div style={{ position: "relative" }} ref={planMenuRef}>
              <button className="btn" onClick={() => setShowPlanMenu(v => !v)} style={{
                padding: "8px 14px", fontSize: 12, background: "#1A1F2E", color: "#D1D5DB",
                border: "1px solid #333", display: "flex", alignItems: "center", gap: 6,
              }}>
                💾 {currentPlanName || "Gem / Indlæs"} ▾
              </button>

              {showPlanMenu && (
                <div style={{
                  position: "absolute", top: "100%", right: 0, marginTop: 6, zIndex: 999,
                  background: "#141820", border: "1px solid #333", borderRadius: 10,
                  width: 280, boxShadow: "0 12px 40px rgba(0,0,0,0.6)",
                  overflow: "hidden",
                }}>
                  {/* Save new */}
                  <div style={{ padding: "12px 14px", borderBottom: "1px solid #1F2937" }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: "#6B7280", textTransform: "uppercase", marginBottom: 6 }}>Gem plan</div>
                    <div style={{ display: "flex", gap: 4 }}>
                      <input
                        value={planNameInput}
                        onChange={(e) => setPlanNameInput(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && savePlan(planNameInput)}
                        placeholder={currentPlanName || "Navngiv plan..."}
                        style={{
                          flex: 1, background: "#0D0F16", border: "1px solid #333", borderRadius: 6,
                          padding: "6px 10px", fontSize: 12, color: "#E5E7EB", outline: "none",
                          fontFamily: "inherit",
                        }}
                      />
                      <button className="btn" onClick={() => savePlan(planNameInput || currentPlanName || "Unavngivet")} style={{
                        padding: "6px 12px", fontSize: 11, background: "#1E3A5F", color: "#93C5FD",
                      }}>Gem</button>
                    </div>
                    {currentPlanName && (
                      <div style={{ display: "flex", gap: 4, marginTop: 6 }}>
                        <button className="btn" onClick={() => savePlan(currentPlanName)} style={{
                          padding: "4px 10px", fontSize: 10, background: "#14532D33", color: "#86EFAC", flex: 1,
                        }}>💾 Overskriv "{currentPlanName}"</button>
                        <button className="btn" onClick={duplicatePlan} style={{
                          padding: "4px 10px", fontSize: 10, background: "#1A1F2E", color: "#9CA3AF", border: "1px solid #333",
                        }}>📋 Kopiér</button>
                      </div>
                    )}
                  </div>

                  {/* Saved plans list */}
                  <div style={{ maxHeight: 240, overflow: "auto" }}>
                    {Object.keys(savedPlans).length === 0 ? (
                      <div style={{ padding: "16px 14px", color: "#4B5563", fontSize: 12, textAlign: "center" }}>
                        Ingen gemte planer endnu
                      </div>
                    ) : (
                      Object.entries(savedPlans)
                        .sort((a, b) => (b[1].savedAt || "").localeCompare(a[1].savedAt || ""))
                        .map(([name, plan]) => (
                          <div
                            key={name}
                            onClick={() => loadPlan(name)}
                            style={{
                              padding: "10px 14px", cursor: "pointer",
                              display: "flex", alignItems: "center", gap: 8,
                              borderBottom: "1px solid #1A1F2E",
                              background: name === currentPlanName ? "#1E3A5F22" : "transparent",
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.background = "#1A1F2E"}
                            onMouseLeave={(e) => e.currentTarget.style.background = name === currentPlanName ? "#1E3A5F22" : "transparent"}
                          >
                            <span style={{ fontSize: 14 }}>{name === currentPlanName ? "📌" : "📄"}</span>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontSize: 12, fontWeight: 600, color: "#E5E7EB", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                {name}
                              </div>
                              <div style={{ fontSize: 10, color: "#6B7280" }}>
                                {plan.blocks.length} blokke · {plan.savedAt ? new Date(plan.savedAt).toLocaleDateString("da-DK", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : ""}
                              </div>
                            </div>
                            <button className="btn" onClick={(e) => deletePlan(name, e)} style={{
                              padding: "3px 6px", fontSize: 10, background: "transparent", color: "#6B7280",
                            }} title="Slet">✕</button>
                          </div>
                        ))
                    )}
                  </div>
                </div>
              )}
            </div>

            <button className="btn" onClick={printPlan} style={{
              padding: "8px 14px", fontSize: 12, background: "#1A1F2E", color: "#D1D5DB",
              border: "1px solid #333",
            }}>🖨 Eksportér</button>

            <button className="btn" onClick={() => setShowValidation(v => !v)} style={{
              padding: "8px 16px", fontSize: 12,
              background: validation.errors.length > 0 ? "#7F1D1D" : "#14532D",
              color: validation.errors.length > 0 ? "#FCA5A5" : "#86EFAC",
            }}>
              {validation.errors.length > 0 ? `⚠ ${validation.errors.length} fejl` : "✓ Ingen fejl"}
            </button>
          </div>
        </div>
      </div>

      {/* Validation panel */}
      {showValidation && (validation.errors.length > 0 || validation.warnings.length > 0) && (
        <div style={{ maxWidth: 1400, margin: "0 auto", padding: "12px 32px" }}>
          <div style={{
            background: validation.errors.length > 0 ? "#1C0A0A" : "#0A1C0D",
            border: `1px solid ${validation.errors.length > 0 ? "#7F1D1D" : "#14532D"}`,
            borderRadius: 10, padding: 16,
          }}>
            {validation.errors.map((e, i) => (
              <div key={i} style={{ fontSize: 12, color: "#FCA5A5", marginBottom: 4, display: "flex", gap: 6, alignItems: "flex-start" }}>
                <span>❌</span><span>{e}</span>
              </div>
            ))}
            {validation.warnings.map((w, i) => (
              <div key={i} style={{ fontSize: 12, color: "#FDE68A", marginBottom: 4, display: "flex", gap: 6, alignItems: "flex-start" }}>
                <span>⚠️</span><span>{w}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main layout */}
      <div style={{ display: "flex", maxWidth: 1400, margin: "0 auto", gap: 0, minHeight: "calc(100vh - 100px)" }}>

        {/* LEFT: Goal pool */}
        <div style={{
          width: 380, flexShrink: 0, borderRight: "1px solid #1A1F2E",
          display: "flex", flexDirection: "column", overflow: "hidden",
        }}
          onDragOver={e => e.preventDefault()}
          onDrop={onDropToPool}
        >
          {/* Module tabs */}
          <div style={{ padding: "16px 16px 0", display: "flex", gap: 4, flexWrap: "wrap" }}>
            {MODULES_RAW.map(mod => {
              const isActive = activeModule === mod.id;
              const modItemsAll = ALL_ITEMS.filter(i => i.moduleId === mod.id);
              const modPlaced = modItemsAll.filter(i => placedUids.has(i.uid)).length;
              const pct = modItemsAll.length > 0 ? Math.round(modPlaced / modItemsAll.length * 100) : 0;
              return (
                <button key={mod.id} className="module-tab" onClick={() => { setActiveModule(mod.id); setFilterModule(mod.id); setSelectedUids(new Set()); }} style={{
                  background: isActive ? mod.color + "22" : "#111318",
                  borderColor: isActive ? mod.color : "#1A1F2E",
                  color: isActive ? mod.color : "#6B7280",
                }}>
                  <span style={{ fontFamily: "'DM Mono', monospace", marginRight: 4 }}>M{mod.id}</span>
                  <span style={{
                    fontSize: 10, padding: "1px 5px", borderRadius: 99, marginLeft: 2,
                    background: pct === 100 ? "#14532D" : mod.color + "22",
                    color: pct === 100 ? "#86EFAC" : mod.color,
                  }}>{pct}%</span>
                </button>
              );
            })}
          </div>

          {/* Module info */}
          <div style={{ padding: "12px 16px 8px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
              <div style={{
                width: 28, height: 28, borderRadius: "50%", background: currentModule.color,
                color: "#fff", display: "flex", alignItems: "center", justifyContent: "center",
                fontWeight: 800, fontSize: 14, fontFamily: "'DM Mono', monospace",
              }}>{activeModule}</div>
              <span style={{ fontSize: 14, fontWeight: 700, color: "#F3F4F6" }}>{currentModule.title}</span>
            </div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              <span className="badge" style={{ background: "#1E3A5F", color: "#93C5FD" }}>📖 {currentModule.theory}T krævet</span>
              <span className="badge" style={{ background: "#1A3D22", color: "#86EFAC" }}>🚗 {currentModule.practice}P krævet</span>
              {currentModule.practiceNote && <span className="badge" style={{ background: "#422006", color: "#FCD34D" }}>⚠ {currentModule.practiceNote}</span>}
              <span className="badge" style={{
                background: moduleCounts[activeModule] ? "#111" : "#111",
                color: "#9CA3AF", border: "1px solid #333",
              }}>
                Tildelt: {Math.round(moduleCounts[activeModule]?.theory || 0)}T + {Math.round(moduleCounts[activeModule]?.practice || 0)}P
              </span>
            </div>
          </div>

          {/* Items pool - scrollable */}
          <div style={{ flex: 1, overflow: "auto", padding: "0 12px 16px" }}>

            {/* Compact select bar */}
            {(() => {
              const unplacedTheory = theoryItems.filter(i => !placedUids.has(i.uid));
              const unplacedTheoryOnly = theoryItems.filter(i => !placedUids.has(i.uid) && !i.selfStudy);
              const unplacedSelfStudy = theoryItems.filter(i => !placedUids.has(i.uid) && i.selfStudy);
              const unplacedPractice = practiceItems.filter(i => !placedUids.has(i.uid));
              const totalUnplaced = unplacedTheory.length + unplacedPractice.length;
              const allSelected = totalUnplaced > 0 && unplacedTheory.concat(unplacedPractice).every(i => selectedUids.has(i.uid));
              return (
                <div style={{ display: "flex", gap: 3, padding: "8px 2px 2px", alignItems: "center" }}>
                  <input type="checkbox"
                    checked={allSelected && totalUnplaced > 0}
                    onChange={() => allSelected ? clearSelection() : selectAllInModule("all")}
                    disabled={totalUnplaced === 0}
                    style={{ width: 13, height: 13, cursor: "pointer", accentColor: currentModule.color }}
                  />
                  <span style={{ fontSize: 10, color: "#6B7280", marginRight: 2 }}>Alle</span>
                  {unplacedTheory.length > 0 && unplacedSelfStudy.length > 0 && unplacedTheoryOnly.length > 0 && (
                    <button className="btn" onClick={() => selectAllInModule("theoryAll")} style={{
                      padding: "2px 6px", fontSize: 9, background: "#1E3A5F22", color: "#93C5FD", border: "1px solid #1E3A5F33",
                    }}>📖+📚 {unplacedTheory.length}</button>
                  )}
                  {unplacedTheoryOnly.length > 0 && (
                    <button className="btn" onClick={() => selectAllInModule("theoryOnly")} style={{
                      padding: "2px 6px", fontSize: 9, background: "#1E3A5F11", color: "#7DB4F0", border: "1px solid #1E3A5F22",
                    }}>📖 {unplacedTheoryOnly.length}</button>
                  )}
                  {unplacedSelfStudy.length > 0 && (
                    <button className="btn" onClick={() => selectAllInModule("selfStudy")} style={{
                      padding: "2px 6px", fontSize: 9, background: "#3B076422", color: "#C4B5FD", border: "1px solid #3B076433",
                    }}>📚 {unplacedSelfStudy.length}</button>
                  )}
                  {unplacedPractice.length > 0 && (
                    <button className="btn" onClick={() => selectAllInModule("practice")} style={{
                      padding: "2px 6px", fontSize: 9, background: "#14532D22", color: "#86EFAC", border: "1px solid #14532D33",
                    }}>🚗 {unplacedPractice.length}</button>
                  )}
                  {selectedUids.size > 0 && (
                    <button className="btn" onClick={clearSelection} style={{
                      padding: "2px 6px", fontSize: 9, background: "#33333366", color: "#9CA3AF", marginLeft: "auto",
                    }}>✕ {selectedUids.size}</button>
                  )}
                </div>
              );
            })()}

            {theoryItems.length > 0 && (
              <>
                <div style={{ fontSize: 10, fontWeight: 700, color: "#6B7280", textTransform: "uppercase", letterSpacing: "0.08em", padding: "8px 4px 6px" }}>
                  📖 Teorimål
                </div>
                {theoryItems.map(item => (
                  <PoolItem key={item.uid} item={item} placed={placedUids.has(item.uid)}
                    onDragStart={onDragStart} onDragEnd={onDragEnd}
                    moduleColor={currentModule.color} showGoals={showGoals}
                    toggleGoals={(uid) => setShowGoals(p => ({ ...p, [uid]: !p[uid] }))}
                    selected={selectedUids.has(item.uid)}
                    onToggleSelect={() => toggleSelect(item.uid)}
                    isDraggingAlong={dragItem && dragItem !== item.uid && selectedUids.has(item.uid) && selectedUids.has(dragItem)}
                    dragCount={dragItem === item.uid && selectedUids.has(item.uid) ? selectedUids.size : 0} />
                ))}
              </>
            )}
            {practiceItems.length > 0 && (
              <>
                <div style={{ fontSize: 10, fontWeight: 700, color: "#6B7280", textTransform: "uppercase", letterSpacing: "0.08em", padding: "16px 4px 6px" }}>
                  🚗 Praksismål
                </div>
                {practiceItems.map(item => (
                  <PoolItem key={item.uid} item={item} placed={placedUids.has(item.uid)}
                    onDragStart={onDragStart} onDragEnd={onDragEnd}
                    moduleColor={currentModule.color} showGoals={showGoals}
                    toggleGoals={(uid) => setShowGoals(p => ({ ...p, [uid]: !p[uid] }))}
                    selected={selectedUids.has(item.uid)}
                    onToggleSelect={() => toggleSelect(item.uid)}
                    isDraggingAlong={dragItem && dragItem !== item.uid && selectedUids.has(item.uid) && selectedUids.has(dragItem)}
                    dragCount={dragItem === item.uid && selectedUids.has(item.uid) ? selectedUids.size : 0} />
                ))}
              </>
            )}
          </div>

          {/* Bulk action bar — fixed at bottom of left panel */}
          {selectedUids.size > 0 && (
            <div style={{
              flexShrink: 0, borderTop: "1px solid #1A1F2E",
              background: "#111318", padding: "8px 12px",
              display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap",
            }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: "#F3F4F6" }}>
                {selectedUids.size} valgt
              </span>
              <button className="btn" onClick={clearSelection} style={{
                padding: "3px 8px", fontSize: 10, background: "#333", color: "#9CA3AF",
              }}>✕</button>
              <span style={{ fontSize: 10, color: "#6B7280" }}>→</span>
              {blocks.map((block, idx) => {
                const accent = BLOCK_COLORS[block.type]?.accent || "#666";
                return (
                  <button key={block.id} className="btn" onClick={() => bulkMoveToBlock(block.id)} style={{
                    padding: "3px 8px", fontSize: 10, background: accent + "22", color: accent,
                    border: `1px solid ${accent}44`,
                  }} title={block.name}>
                    {idx + 1}. {block.name.length > 12 ? block.name.slice(0, 12) + "…" : block.name}
                  </button>
                );
              })}
              {blocks.length === 0 && (
                <span style={{ fontSize: 10, color: "#6B7280", fontStyle: "italic" }}>Opret en blok først</span>
              )}
            </div>
          )}
        </div>
        <div style={{ flex: 1, overflow: "auto", padding: "16px 24px" }}>

          {/* View mode toggle */}
          <div style={{
            display: "flex", gap: 0, marginBottom: 16, background: "#111318", borderRadius: 10, padding: 3,
          }}>
            <button className="btn" onClick={() => setViewMode("build")} style={{
              flex: 1, padding: "9px 16px", fontSize: 13, borderRadius: 8,
              background: viewMode === "build" ? "#1A1F2E" : "transparent",
              color: viewMode === "build" ? "#F3F4F6" : "#6B7280",
              boxShadow: viewMode === "build" ? "0 1px 4px #0003" : "none",
            }}>
              🔧 Opbyg
            </button>
            <button className="btn" onClick={() => setViewMode("summary")} style={{
              flex: 1, padding: "9px 16px", fontSize: 13, borderRadius: 8,
              background: viewMode === "summary" ? "#1A1F2E" : "transparent",
              color: viewMode === "summary" ? "#F3F4F6" : "#6B7280",
              boxShadow: viewMode === "summary" ? "0 1px 4px #0003" : "none",
            }}>
              📊 Forløbsoversigt
            </button>
          </div>

          {viewMode === "build" ? (
            <>
              {/* Add block buttons */}
              <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
                <button className="btn" onClick={() => addBlock("theory")} style={{
                  padding: "10px 20px", fontSize: 13,
                  background: "linear-gradient(135deg, #1E3A5F, #1E40AF)", color: "#93C5FD",
                }}>+ Teoriaften</button>
                <button className="btn" onClick={() => addBlock("practice")} style={{
                  padding: "10px 20px", fontSize: 13,
                  background: "linear-gradient(135deg, #14532D, #166534)", color: "#86EFAC",
                }}>+ Køretime</button>
                <button className="btn" onClick={() => addBlock("selfStudy")} style={{
                  padding: "10px 20px", fontSize: 13,
                  background: "linear-gradient(135deg, #2E1A50, #5B21B6)", color: "#C4B5FD",
                }}>+ Selvstudium</button>
                <div style={{ flex: 1 }} />
                <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                  <span style={{ fontSize: 11, color: "#6B7280" }}>
                    {blocks.length} blokke · {blocks.reduce((s, b) => s + b.lessons, 0)} lektioner
                  </span>
                  {(() => {
                    const ssLessons = blocks.filter(b => b.type === "selfStudy").reduce((s, b) => s + b.lessons, 0);
                    const ok = ssLessons <= MAX_SELF_STUDY_LESSONS;
                    return ssLessons > 0 ? (
                      <span className="badge" style={{
                        background: ok ? "#2E1A50" : "#7F1D1D",
                        color: ok ? "#C4B5FD" : "#FCA5A5",
                        fontSize: 11, padding: "3px 8px",
                      }}>
                        📚 {ssLessons}/{MAX_SELF_STUDY_LESSONS} selvstudium {ok ? "" : "⚠ OVER MAX"}
                      </span>
                    ) : null;
                  })()}
                </div>
              </div>

              {/* Filter bar — single row */}
              <div style={{
                display: "flex", gap: 4, marginBottom: 12, alignItems: "center",
                overflowX: "auto", paddingBottom: 2,
              }}>
                <span style={{ fontSize: 10, fontWeight: 700, color: "#4B5563", textTransform: "uppercase", letterSpacing: "0.08em", marginRight: 2, flexShrink: 0 }}>
                  Vis:
                </span>
                {/* Module filter */}
                {[{ v: "all", label: "Alle moduler" }, ...MODULES_RAW.map(m => ({ v: m.id, label: `M${m.id}`, color: m.color }))].map(f => (
                  <button key={f.v} className="btn" onClick={() => setFilterModule(f.v)} style={{
                    padding: "4px 9px", fontSize: 11, borderRadius: 6, flexShrink: 0,
                    background: filterModule === f.v ? (f.color || "#1A1F2E") + (f.color ? "33" : "") : "#111318",
                    color: filterModule === f.v ? (f.color || "#F3F4F6") : "#6B7280",
                    border: `1px solid ${filterModule === f.v ? (f.color || "#333") + "66" : "#1A1F2E"}`,
                  }}>{f.label}</button>
                ))}
                <span style={{ width: 1, height: 18, background: "#1A1F2E", margin: "0 4px", flexShrink: 0 }} />
                {/* Type filter — same line */}
                {[
                  { v: "all", label: "Alle typer" },
                  { v: "theory", label: "📖 Teori", color: "#3B82F6" },
                  { v: "practice", label: "🚗 Praksis", color: "#22C55E" },
                  { v: "selfStudy", label: "📚 Selvstudium", color: "#A78BFA" },
                ].map(f => (
                  <button key={f.v} className="btn" onClick={() => setFilterType(f.v)} style={{
                    padding: "4px 9px", fontSize: 11, borderRadius: 6, flexShrink: 0,
                    background: filterType === f.v ? (f.color ? f.color + "22" : "#1A1F2E") : "#111318",
                    color: filterType === f.v ? (f.color || "#F3F4F6") : "#6B7280",
                    border: `1px solid ${filterType === f.v ? (f.color ? f.color + "66" : "#333") : "#1A1F2E"}`,
                  }}>{f.label}</button>
                ))}
              </div>

              {/* Module lesson overview */}
              <div style={{ display: "flex", gap: 6, marginBottom: 16, flexWrap: "wrap" }}>
                {MODULES_RAW.filter(mod => filterModule === "all" || mod.id === filterModule).map(mod => {
                  const tc = Math.round(moduleCounts[mod.id]?.theory || 0);
                  const pc = Math.round(moduleCounts[mod.id]?.practice || 0);
                  const ss = Math.round(moduleCounts[mod.id]?.selfStudy || 0);
                  const tOk = tc >= mod.theory;
                  const pOk = pc >= mod.practice;
                  return (
                    <div key={mod.id} style={{
                      background: "#111318", border: `1px solid ${mod.color}33`,
                      borderRadius: 8, padding: "6px 10px", fontSize: 11, minWidth: 130,
                    }}>
                      <div style={{ fontWeight: 700, color: mod.color, marginBottom: 2, fontFamily: "'DM Mono', monospace" }}>
                        M{mod.id}
                      </div>
                      <div style={{ color: tOk ? "#86EFAC" : "#FCA5A5" }}>
                        📖 {tc}/{mod.theory}T {tOk ? "✓" : ""} {ss > 0 ? `(${ss} selvst.)` : ""}
                      </div>
                      <div style={{ color: pOk ? "#86EFAC" : mod.practice === 0 ? "#6B7280" : "#FCA5A5" }}>
                        🚗 {pc}/{mod.practice}P {pOk ? "✓" : ""}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Filtered Blocks */}
              {(() => {
                const filtered = blocks.filter(block => {
                  // Type filter
                  if (filterType !== "all" && block.type !== filterType) return false;
                  // Module filter
                  if (filterModule !== "all") {
                    const hasModuleItem = block.items.some(uid => {
                      const item = findItem(uid);
                      return item && item.moduleId === filterModule;
                    });
                    // Show block if it has items from this module OR is empty (so you can drag into it)
                    if (!hasModuleItem && block.items.length > 0) return false;
                  }
                  return true;
                });
                const hiddenCount = blocks.length - filtered.length;

                return (
                  <>
                    {hiddenCount > 0 && (
                      <div style={{
                        padding: "8px 12px", marginBottom: 8, borderRadius: 8,
                        background: "#111318", border: "1px solid #1A1F2E",
                        fontSize: 11, color: "#6B7280", display: "flex", alignItems: "center", gap: 6,
                      }}>
                        <span>🔍</span>
                        <span>Viser {filtered.length} af {blocks.length} blokke — {hiddenCount} skjult af filter</span>
                        <button className="btn" onClick={() => { setFilterModule("all"); setFilterType("all"); }} style={{
                          padding: "3px 8px", fontSize: 10, background: "#1A1F2E", color: "#9CA3AF", marginLeft: "auto",
                        }}>Nulstil filter</button>
                      </div>
                    )}
                    {blocks.length === 0 && (
                      <div
                        onDragOver={(e) => { e.preventDefault(); setDragOverNewBlock(true); }}
                        onDragLeave={() => setDragOverNewBlock(false)}
                        onDrop={(e) => { e.preventDefault(); setDragOverNewBlock(false); onDropToNewBlock(); }}
                        style={{
                          padding: 60, textAlign: "center", color: dragOverNewBlock ? "#93C5FD" : "#4B5563",
                          border: `2px dashed ${dragOverNewBlock ? "#3B82F6" : "#1A1F2E"}`,
                          borderRadius: 16, background: dragOverNewBlock ? "#111827" : "#0D0F16",
                          transition: "all 0.15s",
                        }}
                      >
                        <div style={{ fontSize: 32, marginBottom: 8 }}>{dragOverNewBlock ? "➕" : "📋"}</div>
                        <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 4 }}>
                          {dragOverNewBlock ? "Slip for at oprette ny blok" : "Ingen blokke endnu"}
                        </div>
                        <div style={{ fontSize: 12 }}>Træk mål hertil — bloktype oprettes automatisk.</div>
                      </div>
                    )}
                    <div
                      style={{ display: "flex", flexDirection: "column", gap: 0 }}
                      onDragOver={(e) => { if (dragBlock) e.preventDefault(); }}
                      onDrop={(e) => {
                        if (dragBlock && blockInsertIndex !== null) {
                          e.preventDefault();
                          onBlockDrop(blockInsertIndex);
                        }
                      }}
                      onDragLeave={(e) => {
                        if (!e.currentTarget.contains(e.relatedTarget)) {
                          setBlockInsertIndex(null);
                        }
                      }}
                    >
                      {filtered.map((block, filteredIdx) => {
                        const globalIdx = blocks.findIndex(b => b.id === block.id);
                        const isBeingDragged = dragBlock === block.id;
                        const showGapBefore = dragBlock && blockInsertIndex === globalIdx && !isBeingDragged;
                        const showGapAfter = dragBlock && blockInsertIndex === globalIdx + 1 && filteredIdx === filtered.length - 1 && !isBeingDragged;

                        return (
                          <div key={block.id}
                            onDragOver={(e) => {
                              if (!dragBlock) return;
                              e.preventDefault();
                              const rect = e.currentTarget.getBoundingClientRect();
                              const midY = rect.top + rect.height / 2;
                              setBlockInsertIndex(e.clientY < midY ? globalIdx : globalIdx + 1);
                            }}
                            style={{ paddingBottom: 12 }}
                          >
                            {showGapBefore && (
                              <div style={{
                                height: 4, borderRadius: 4, margin: "0 8px 10px",
                                background: "linear-gradient(90deg, #3B82F6, #A78BFA)",
                                boxShadow: "0 0 12px #3B82F666",
                                transition: "all 0.15s",
                              }} />
                            )}
                            <div style={{
                              opacity: isBeingDragged ? 0.35 : 1,
                              transform: isBeingDragged ? "scale(0.98)" : "none",
                              transition: "opacity 0.15s, transform 0.15s",
                            }}>
                              <BlockCard
                                key={block.id} block={block} index={globalIdx}
                                onRemove={() => removeBlock(block.id)}
                                onUpdateLessons={(l) => updateBlockLessons(block.id, l)}
                                onUpdateName={(n) => updateBlockName(block.id, n)}
                                onDropItem={(insertIdx) => onDropToBlock(block.id, insertIdx)}
                                onRemoveItem={(uid) => removeFromBlock(block.id, uid)}
                                onMoveItem={(uid, dir) => moveItemInBlock(block.id, uid, dir)}
                                dragOverBlock={dragOverBlock} setDragOverBlock={setDragOverBlock}
                                dragItem={dragItem} onDragStart={onDragStart} onDragEnd={onDragEnd}
                                onBlockDragStart={() => onBlockDragStart(block.id)}
                                onBlockDragEnd={onBlockDragEnd}
                                dragBlock={dragBlock}
                              />
                            </div>
                            {showGapAfter && (
                              <div style={{
                                height: 4, borderRadius: 4, margin: "10px 8px 0",
                                background: "linear-gradient(90deg, #3B82F6, #A78BFA)",
                                boxShadow: "0 0 12px #3B82F666",
                                transition: "all 0.15s",
                              }} />
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {/* Drop zone to auto-create new block */}
                    {dragItem && (() => {
                      // Predict what block(s) will be created
                      const uids = selectedUids.has(dragItem) && selectedUids.size > 0
                        ? [...selectedUids] : [dragItem];
                      const ditems = uids.map(u => findItem(u)).filter(Boolean);
                      const tItems = ditems.filter(i => i.mode === "theory");
                      const pItems = ditems.filter(i => i.mode === "practice");
                      const allSS = tItems.length > 0 && pItems.length === 0 &&
                        tItems.every(it => it.selfStudy && SELF_STUDY_ALLOWED_SECTIONS.has(it.sectionId));

                      let previewParts = [];
                      if (tItems.length > 0) {
                        if (allSS) previewParts.push(`📚 Selvstudium (${tItems.length} mål)`);
                        else previewParts.push(`📖 Teoriaften (${tItems.length} mål)`);
                      }
                      if (pItems.length > 0) previewParts.push(`🚗 Køretime (${pItems.length} mål)`);
                      const previewText = previewParts.join(" + ");

                      const accentColor = allSS ? "#A78BFA" : tItems.length > 0 && pItems.length === 0 ? "#3B82F6" : pItems.length > 0 && tItems.length === 0 ? "#22C55E" : "#3B82F6";

                      return (
                        <div
                          onDragOver={(e) => { e.preventDefault(); setDragOverNewBlock(true); }}
                          onDragLeave={() => setDragOverNewBlock(false)}
                          onDrop={(e) => { e.preventDefault(); setDragOverNewBlock(false); onDropToNewBlock(); }}
                          style={{
                            marginTop: 12, padding: "32px 16px", textAlign: "center",
                            border: `2px dashed ${dragOverNewBlock ? accentColor : "#333"}`,
                            borderRadius: 12,
                            background: dragOverNewBlock ? accentColor + "11" : "transparent",
                            color: dragOverNewBlock ? accentColor : "#4B5563",
                            fontSize: 13, fontWeight: 600,
                            transition: "all 0.15s",
                          }}
                        >
                          {dragOverNewBlock
                            ? `➕ Slip → opretter ${previewText}`
                            : `➕ Slip her → opretter ${previewText}`}
                        </div>
                      );
                    })()}
                  </>
                );
              })()}

              {/* Rules footer */}
              <div style={{
                marginTop: 24, background: "#0D0F16", borderRadius: 12, padding: 20,
                border: "1px solid #1A1F2E", fontSize: 12, color: "#6B7280", lineHeight: 1.8,
              }}>
                <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8, color: "#4B5563" }}>
                  Regler · BEK 1150
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div>
                    <span style={{ color: "#93C5FD" }}>📖 Teoriaften:</span> Max 4 lektioner/dag<br />
                    <span style={{ color: "#86EFAC" }}>🚗 Køretime:</span> Max 3 lektioner/dag<br />
                    <span style={{ color: "#F472B6" }}>🏎️ KTA:</span> Max 4 lektioner/dag
                  </div>
                  <div>
                    <span style={{ color: "#FCA5A5" }}>⚡ Rækkefølge:</span> Teori FØR praksis altid<br />
                    <span style={{ color: "#FCA5A5" }}>⚡ M3 gate:</span> 7.1–7.8 praksis FØR kryds<br />
                    <span style={{ color: "#C4B5FD" }}>📚 Selvstudium:</span> Max 7 lektioner total<br />
                    <span style={{ color: "#9CA3AF" }}>📅 Min. 14 undervisningsdage</span>
                  </div>
                </div>
              </div>
            </>
          ) : (
            /* ═══════════════════════════════════════════════════
               SUMMARY VIEW
               ═══════════════════════════════════════════════════ */
            <SummaryView blocks={blocks} moduleCounts={moduleCounts} validation={validation} />
          )}
        </div>
      </div>

      {/* Toast notification */}
      {toast && (
        <div
          onClick={() => setToast(null)}
          style={{
            position: "fixed", bottom: 24, left: "50%", transform: "translateX(-50%)",
            zIndex: 9999, maxWidth: 480, width: "90%",
            padding: "12px 20px", borderRadius: 12,
            background: toast.type === "warn" ? "#422006" : "#1A1F2E",
            border: `1px solid ${toast.type === "warn" ? "#92400E" : "#333"}`,
            color: toast.type === "warn" ? "#FDE68A" : "#E5E7EB",
            fontSize: 13, fontWeight: 500, lineHeight: 1.5,
            boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
            cursor: "pointer",
            animation: "toast-in 0.25s ease",
            display: "flex", alignItems: "flex-start", gap: 10,
          }}
        >
          <span style={{ fontSize: 18, flexShrink: 0, marginTop: -1 }}>
            {toast.type === "warn" ? "⚡" : "ℹ️"}
          </span>
          <span style={{ flex: 1 }}>{toast.msg}</span>
          <span style={{ color: "#6B7280", fontSize: 11, flexShrink: 0, marginTop: 2 }}>✕</span>
        </div>
      )}

      <style>{`
        @keyframes toast-in {
          from { opacity: 0; transform: translateX(-50%) translateY(20px); }
          to { opacity: 1; transform: translateX(-50%) translateY(0); }
        }
      `}</style>
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// SUMMARY VIEW — full course overview
// ─────────────────────────────────────────────────────────

function SummaryView({ blocks, moduleCounts, validation }) {
  const totalT = blocks.filter(b => b.type === "theory" || b.type === "selfStudy").reduce((s, b) => s + b.lessons, 0);
  const totalP = blocks.filter(b => b.type === "practice").reduce((s, b) => s + b.lessons, 0);
  const totalSS = blocks.filter(b => b.type === "selfStudy").reduce((s, b) => s + b.lessons, 0);
  const totalAll = totalT + totalP;
  const hasErrors = validation.errors.length > 0;

  // Group blocks by module
  const blocksByModule = {};
  blocks.forEach((block, idx) => {
    const moduleIds = new Set();
    block.items.forEach(uid => {
      const item = findItem(uid);
      if (item) moduleIds.add(item.moduleId);
    });
    // Assign to primary module (first found), or "unassigned"
    const primaryModule = moduleIds.size > 0 ? Math.min(...moduleIds) : 0;
    if (!blocksByModule[primaryModule]) blocksByModule[primaryModule] = [];
    blocksByModule[primaryModule].push({ ...block, globalIdx: idx });
  });

  const typeIcon = { theory: "📖", practice: "🚗", selfStudy: "📚" };
  const typeLabel = { theory: "Teoriaften", practice: "Køretime", selfStudy: "Selvstudium" };
  const typeBg = { theory: "#0C1929", practice: "#0D1F12", selfStudy: "#150D22" };
  const typeAccent = { theory: "#3B82F6", practice: "#22C55E", selfStudy: "#A78BFA" };

  return (
    <div>
      {/* Status banner */}
      <div style={{
        padding: "16px 20px", borderRadius: 12, marginBottom: 20,
        background: hasErrors ? "#1C0A0A" : "#0A1C0D",
        border: `1px solid ${hasErrors ? "#7F1D1D" : "#14532D"}`,
        display: "flex", alignItems: "center", gap: 12,
      }}>
        <span style={{ fontSize: 24 }}>{hasErrors ? "⚠️" : "✅"}</span>
        <div>
          <div style={{ fontSize: 14, fontWeight: 700, color: hasErrors ? "#FCA5A5" : "#86EFAC" }}>
            {hasErrors ? `${validation.errors.length} regelfejl fundet` : "Forløbet overholder alle regler"}
          </div>
          <div style={{ fontSize: 11, color: "#6B7280", marginTop: 2 }}>
            {totalT} teori ({totalSS} selvstudium) + {totalP} praksis = {totalAll} lektioner
            {totalAll < 54 && <span style={{ color: "#FCA5A5" }}> — mangler {54 - totalAll} for at nå minimum 54</span>}
            {totalAll >= 54 && <span style={{ color: "#86EFAC" }}> ✓</span>}
          </div>
        </div>
      </div>

      {/* Overall stats grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8, marginBottom: 20 }}>
        {[
          { label: "Teoriaftener", value: blocks.filter(b => b.type === "theory").length, sub: `${blocks.filter(b => b.type === "theory").reduce((s, b) => s + b.lessons, 0)} lektioner`, icon: "📖", accent: "#3B82F6" },
          { label: "Køretimer", value: blocks.filter(b => b.type === "practice").length, sub: `${totalP} lektioner`, icon: "🚗", accent: "#22C55E" },
          { label: "Selvstudium", value: blocks.filter(b => b.type === "selfStudy").length, sub: `${totalSS}/${MAX_SELF_STUDY_LESSONS} lektioner`, icon: "📚", accent: "#A78BFA" },
          { label: "I alt", value: totalAll, sub: `${blocks.length} blokke`, icon: "Σ", accent: "#9CA3AF" },
        ].map(s => (
          <div key={s.label} style={{
            background: "#111318", borderRadius: 10, padding: "14px 16px",
            border: `1px solid ${s.accent}22`, textAlign: "center",
          }}>
            <div style={{ fontSize: 10, color: "#6B7280", marginBottom: 4 }}>{s.icon} {s.label}</div>
            <div style={{ fontSize: 24, fontWeight: 800, color: s.accent, fontFamily: "'DM Mono', monospace" }}>{s.value}</div>
            <div style={{ fontSize: 10, color: "#4B5563", marginTop: 2 }}>{s.sub}</div>
          </div>
        ))}
      </div>

      {/* Module breakdown */}
      <div style={{
        display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 6, marginBottom: 24,
      }}>
        {MODULES_RAW.map(mod => {
          const tc = Math.round(moduleCounts[mod.id]?.theory || 0);
          const pc = Math.round(moduleCounts[mod.id]?.practice || 0);
          const ss = Math.round(moduleCounts[mod.id]?.selfStudy || 0);
          const tOk = tc >= mod.theory;
          const pOk = pc >= mod.practice || mod.practice === 0;
          const allOk = tOk && pOk;
          return (
            <div key={mod.id} style={{
              background: allOk ? "#0A1C0D" : "#111318",
              border: `1px solid ${allOk ? "#14532D" : mod.color + "33"}`,
              borderRadius: 10, padding: "10px 12px",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
                <div style={{
                  width: 22, height: 22, borderRadius: "50%", background: mod.color,
                  color: "#fff", display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 11, fontWeight: 800, fontFamily: "'DM Mono', monospace",
                }}>{mod.id}</div>
                <span style={{ fontSize: 11, fontWeight: 700, color: mod.color }}>{mod.title}</span>
              </div>
              <div style={{ fontSize: 11, color: tOk ? "#86EFAC" : "#FCA5A5", marginBottom: 1 }}>
                📖 {tc}/{mod.theory}T {tOk ? "✓" : "✗"} {ss > 0 ? `(${ss} selvst.)` : ""}
              </div>
              <div style={{ fontSize: 11, color: pOk ? "#86EFAC" : mod.practice === 0 ? "#4B5563" : "#FCA5A5" }}>
                🚗 {pc}/{mod.practice}P {pOk ? "✓" : "✗"}
              </div>
              {mod.practiceNote && (
                <div style={{ fontSize: 10, color: "#FCD34D", marginTop: 2 }}>⚠ {mod.practiceNote}</div>
              )}
            </div>
          );
        })}
      </div>

      {/* Validation errors */}
      {hasErrors && (
        <div style={{
          background: "#1C0A0A", border: "1px solid #7F1D1D", borderRadius: 10,
          padding: 16, marginBottom: 20,
        }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: "#FCA5A5", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>
            Regelfejl
          </div>
          {validation.errors.map((e, i) => (
            <div key={i} style={{ fontSize: 12, color: "#FCA5A5", marginBottom: 4, display: "flex", gap: 6, alignItems: "flex-start" }}>
              <span>❌</span><span>{e}</span>
            </div>
          ))}
        </div>
      )}

      {/* Full block timeline by module */}
      <div style={{
        fontSize: 10, fontWeight: 700, color: "#4B5563", textTransform: "uppercase",
        letterSpacing: "0.08em", marginBottom: 10,
      }}>
        Forløbsplan — alle blokke i rækkefølge
      </div>

      {blocks.length === 0 ? (
        <div style={{
          padding: 40, textAlign: "center", color: "#4B5563",
          border: "2px dashed #1A1F2E", borderRadius: 16, background: "#0D0F16",
        }}>
          <div style={{ fontSize: 24, marginBottom: 6 }}>📋</div>
          <div style={{ fontSize: 13 }}>Ingen blokke oprettet endnu. Gå til "Opbyg" for at starte.</div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {/* Group by module visually */}
          {[1, 2, 3, 4, 5].map(modId => {
            const mod = MODULES_MAP[modId];
            const modBlocks = blocks.filter(block => {
              const itemModules = block.items.map(uid => {
                const item = findItem(uid);
                return item ? item.moduleId : null;
              }).filter(Boolean);
              return itemModules.includes(modId) || (block.items.length === 0);
            }).filter(block => {
              // Only include empty blocks once (in module 1)
              if (block.items.length === 0 && modId !== 1) return false;
              return true;
            });

            // Deduplicate: only show each block under its PRIMARY module
            const dedupedBlocks = blocks.filter(block => {
              if (block.items.length === 0) return modId === 1;
              const moduleIds = block.items.map(uid => {
                const item = findItem(uid);
                return item ? item.moduleId : 99;
              });
              return Math.min(...moduleIds) === modId;
            });

            if (dedupedBlocks.length === 0) return null;

            return (
              <div key={modId} style={{ marginBottom: 8 }}>
                {/* Module header */}
                <div style={{
                  display: "flex", alignItems: "center", gap: 8, padding: "8px 0 6px",
                  borderBottom: `2px solid ${mod.color}33`, marginBottom: 6,
                }}>
                  <div style={{
                    width: 24, height: 24, borderRadius: "50%", background: mod.color,
                    color: "#fff", display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 12, fontWeight: 800, fontFamily: "'DM Mono', monospace",
                  }}>{modId}</div>
                  <span style={{ fontSize: 13, fontWeight: 700, color: mod.color }}>Modul {modId}: {mod.title}</span>
                  <span style={{ fontSize: 11, color: "#6B7280", marginLeft: "auto" }}>
                    {mod.theory}T + {mod.practice}P krævet
                  </span>
                </div>

                {/* Blocks in this module */}
                {dedupedBlocks.map(block => {
                  const globalIdx = blocks.findIndex(b => b.id === block.id);
                  const accent = typeAccent[block.type];
                  return (
                    <div key={block.id} style={{
                      background: typeBg[block.type], border: `1px solid ${accent}33`,
                      borderRadius: 10, padding: "10px 14px", marginBottom: 4,
                    }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                        <span style={{
                          fontFamily: "'DM Mono', monospace", fontSize: 11, fontWeight: 800,
                          color: accent, background: accent + "22", padding: "2px 8px", borderRadius: 5,
                        }}>{globalIdx + 1}</span>
                        <span style={{ fontSize: 13, fontWeight: 700, color: "#E5E7EB" }}>{block.name}</span>
                        <span className="badge" style={{ background: accent + "22", color: accent }}>
                          {typeIcon[block.type]} {typeLabel[block.type]}
                        </span>
                        <span className="badge" style={{ background: "#1A1F2E", color: "#9CA3AF" }}>
                          {block.lessons}L
                        </span>
                      </div>
                      {block.items.length === 0 ? (
                        <div style={{ fontSize: 11, color: "#4B5563", fontStyle: "italic" }}>Ingen mål tildelt</div>
                      ) : (
                        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                          {block.items.map(uid => {
                            const item = findItem(uid);
                            if (!item) return null;
                            const itemMod = MODULES_MAP[item.moduleId];
                            return (
                              <div key={uid} style={{
                                display: "flex", alignItems: "center", gap: 6,
                                fontSize: 11, color: "#D1D5DB", padding: "2px 0",
                              }}>
                                <span style={{
                                  fontFamily: "'DM Mono', monospace", fontSize: 10,
                                  color: itemMod.color, minWidth: 44,
                                }}>{item.sectionId}</span>
                                <span>{item.title}</span>
                                <span className="badge" style={{
                                  background: item.mode === "theory" ? "#1E3A5F" : "#14532D",
                                  color: item.mode === "theory" ? "#93C5FD" : "#86EFAC",
                                  fontSize: 9, marginLeft: "auto",
                                }}>{item.mode === "theory" ? "T" : "P"}</span>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      )}

      {/* Milestones */}
      {blocks.length > 0 && (
        <div style={{
          marginTop: 20, display: "flex", gap: 12,
        }}>
          <div style={{
            flex: 1, background: "#1C0F05", border: "1px solid #92400E44",
            borderRadius: 10, padding: "14px 16px", textAlign: "center",
          }}>
            <div style={{ fontSize: 20, marginBottom: 4 }}>📝</div>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#FCD34D" }}>Teoriprøve</div>
            <div style={{ fontSize: 10, color: "#6B7280", marginTop: 2 }}>Efter modul 1–4 gennemført</div>
          </div>
          <div style={{
            flex: 1, background: "#0A1C0D", border: "1px solid #14532D",
            borderRadius: 10, padding: "14px 16px", textAlign: "center",
          }}>
            <div style={{ fontSize: 20, marginBottom: 4 }}>🏁</div>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#86EFAC" }}>Praktisk prøve</div>
            <div style={{ fontSize: 10, color: "#6B7280", marginTop: 2 }}>Alle 5 moduler + teoriprøve bestået</div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// POOL ITEM (left panel)
// ─────────────────────────────────────────────────────────

function PoolItem({ item, placed, onDragStart, onDragEnd, moduleColor, showGoals, toggleGoals, selected, onToggleSelect, isDraggingAlong, dragCount }) {
  const isTheory = item.mode === "theory";
  const bg = placed ? "#0D0F16" : selected ? "#1A1F2E" : (isTheory ? "#0F172A" : "#0B1A0F");
  const border = placed ? "#1A1F2E" : selected ? "#60A5FA" : (isTheory ? "#1E3A5F" : "#14532D");
  const textColor = placed ? "#4B5563" : "#E5E7EB";

  return (
    <div style={{ marginBottom: 4, position: "relative" }}>
      <div
        className={`pool-item drag-item ${placed ? "placed" : ""} ${isDraggingAlong ? "dragging-along" : ""}`}
        draggable={!placed}
        onDragStart={(e) => {
          onDragStart(item.uid, e);
        }}
        onDragEnd={onDragEnd}
        style={{ background: bg, border: `1px solid ${border}`, color: textColor }}
      >
        {/* Checkbox */}
        {!placed && (
          <input
            type="checkbox"
            checked={!!selected}
            onChange={onToggleSelect}
            onClick={(e) => e.stopPropagation()}
            style={{
              width: 14, height: 14, flexShrink: 0, cursor: "pointer",
              accentColor: moduleColor,
            }}
          />
        )}
        <span style={{ fontSize: 14, flexShrink: 0 }}>{isTheory ? "📖" : "🚗"}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 4, flexWrap: "wrap" }}>
            <span style={{
              fontFamily: "'DM Mono', monospace", fontSize: 11, fontWeight: 600,
              color: moduleColor, opacity: placed ? 0.4 : 1,
            }}>
              {item.sectionId}
            </span>
            <span style={{ fontSize: 12, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {item.title}
            </span>
          </div>
          <div style={{ display: "flex", gap: 3, marginTop: 3, flexWrap: "wrap" }}>
            {item.mustBeFirst && <span className="badge" style={{ background: "#7F1D1D", color: "#FCA5A5" }}>⚡ Skal først</span>}
            {item.selfStudy && <span className="badge" style={{ background: "#3B0764", color: "#C4B5FD" }}>📚 Selvstudium</span>}
            {item.context && <span className="badge" style={{ background: "#1F2937", color: "#9CA3AF" }}>{item.context}</span>}
            {item.highlight && <span className="badge" style={{ background: "#422006", color: "#FCD34D" }}>{item.highlight}</span>}
            {placed && <span className="badge" style={{ background: "#14532D", color: "#86EFAC" }}>✓ Placeret</span>}
          </div>
        </div>
        {/* Multi-drag count badge */}
        {dragCount > 1 && (
          <span style={{
            background: "#60A5FA", color: "#fff", fontSize: 11, fontWeight: 800,
            borderRadius: 99, padding: "2px 8px", flexShrink: 0,
            fontFamily: "'DM Mono', monospace",
          }}>
            {dragCount}
          </span>
        )}
        {!placed && item.goals.length > 0 && !dragCount && (
          <button onClick={(e) => { e.stopPropagation(); toggleGoals(item.uid); }} style={{
            background: "none", border: "none", color: "#6B7280", cursor: "pointer", fontSize: 12, padding: "2px 4px",
          }}>
            {showGoals[item.uid] ? "▲" : "▼"}
          </button>
        )}
      </div>
      {showGoals[item.uid] && !placed && (
        <div style={{
          padding: "6px 12px 8px 40px", fontSize: 11, color: "#9CA3AF", lineHeight: 1.6,
          background: isTheory ? "#0C1222" : "#081310", borderRadius: "0 0 8px 8px",
          marginTop: -4, borderLeft: `2px solid ${moduleColor}33`,
        }}>
          {item.goals.map((g, i) => (
            <div key={i} style={{ display: "flex", gap: 5, alignItems: "baseline" }}>
              <span style={{ color: moduleColor, fontSize: 6, marginTop: 4, flexShrink: 0 }}>●</span>
              <span>{g}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// BLOCK CARD (right panel)
// ─────────────────────────────────────────────────────────

function BlockCard({
  block, index, onRemove, onUpdateLessons, onUpdateName,
  onDropItem, onRemoveItem, onMoveItem,
  dragOverBlock, setDragOverBlock, dragItem,
  onDragStart, onDragEnd,
  onBlockDragStart, onBlockDragEnd, dragBlock,
}) {
  const colors = BLOCK_COLORS[block.type];
  const isDragOver = dragOverBlock === block.id && dragItem;
  const isBlockDragging = dragBlock === block.id;
  const isKTA = block.type === "practice" && block.items.some(uid => {
    const it = findItem(uid);
    return it && it.moduleId === 5 && it.sectionId === "9";
  });
  const [insertIndex, setInsertIndex] = useState(null);

  // Calculate insert index from mouse position over items area
  const itemsRef = useRef(null);

  const handleItemDragOver = (e, itemIndex) => {
    e.preventDefault();
    e.stopPropagation();
    if (!dragItem) return;
    setDragOverBlock(block.id);
    const rect = e.currentTarget.getBoundingClientRect();
    const midY = rect.top + rect.height / 2;
    setInsertIndex(e.clientY < midY ? itemIndex : itemIndex + 1);
  };

  const handleEmptyDragOver = (e) => {
    e.preventDefault();
    if (!dragItem) return;
    setDragOverBlock(block.id);
    setInsertIndex(0);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    if (dragItem) {
      e.stopPropagation();
      onDropItem(insertIndex !== null ? insertIndex : block.items.length);
      setInsertIndex(null);
    }
    // If dragBlock, don't stopPropagation — let parent container handle it
  };

  const handleDragLeave = (e) => {
    if (!e.currentTarget.contains(e.relatedTarget)) {
      if (dragItem) { setDragOverBlock(null); setInsertIndex(null); }
    }
  };

  return (
    <div
      className={`block-card block-drop`}
      style={{
        background: colors.bg,
        border: `1.5px solid ${isDragOver ? colors.accent : colors.accent + "33"}`,
      }}
      onDragOver={(e) => { e.preventDefault(); if (dragItem) setDragOverBlock(block.id); }}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Block header — draggable for reorder */}
      <div
        style={{
          display: "flex", alignItems: "center", gap: 10, padding: "12px 16px",
          background: colors.headerBg, cursor: "grab",
        }}
        draggable
        onDragStart={(e) => { e.stopPropagation(); onBlockDragStart(); }}
        onDragEnd={onBlockDragEnd}
      >
        <span style={{ color: colors.accent + "66", fontSize: 14, flexShrink: 0, cursor: "grab", userSelect: "none", letterSpacing: -2 }}>⠿</span>
        <div style={{
          width: 28, height: 28, borderRadius: 6,
          background: colors.accent + "33", color: colors.accent,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontWeight: 800, fontSize: 12, fontFamily: "'DM Mono', monospace",
          flexShrink: 0,
        }}>
          {index + 1}
        </div>

        <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 8 }}>
          <input
            value={block.name}
            onChange={(e) => onUpdateName(e.target.value)}
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "transparent", border: "none", color: colors.text,
              fontSize: 14, fontWeight: 700, fontFamily: "inherit",
              outline: "none", flex: 1, minWidth: 0,
            }}
          />
          <span className="badge" style={{
            background: block.type === "theory" ? "#1E3A5F" : block.type === "selfStudy" ? "#2E1A50" : "#14532D",
            color: block.type === "theory" ? "#93C5FD" : block.type === "selfStudy" ? "#C4B5FD" : "#86EFAC",
          }}>
            {block.type === "theory" ? "📖 Teori" : block.type === "selfStudy" ? "📚 Selvstudium" : "🚗 Praksis"}
          </span>
        </div>

        {/* Lesson count */}
        <div style={{ display: "flex", alignItems: "center", gap: 4, flexShrink: 0 }}>
          <span style={{ fontSize: 11, color: "#6B7280" }}>Lektioner:</span>
          <select
            value={block.lessons}
            onChange={(e) => onUpdateLessons(parseInt(e.target.value))}
            onClick={(e) => e.stopPropagation()}
            style={{
              background: colors.badge, border: `1px solid ${colors.accent}44`,
              color: colors.text, borderRadius: 5, padding: "3px 6px",
              fontSize: 12, fontWeight: 700, fontFamily: "'DM Mono', monospace",
              cursor: "pointer", outline: "none",
            }}
          >
            {(block.type === "theory" ? [1, 2, 3, 4] : block.type === "selfStudy" ? [1, 2, 3, 4, 5, 6, 7] : isKTA ? [1, 2, 3, 4] : [1, 2, 3]).map(n => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
        </div>

        <button className="btn" onClick={onRemove} style={{
          background: "#7F1D1D44", color: "#FCA5A5", padding: "4px 8px", fontSize: 11,
        }}>✕</button>
      </div>

      {/* Block items with live reorder preview */}
      <div ref={itemsRef} style={{ padding: "8px 12px 12px", minHeight: 50 }}>
        {block.items.length === 0 && (
          <div
            onDragOver={handleEmptyDragOver}
            style={{
              padding: 20, textAlign: "center", color: isDragOver ? colors.accent : "#4B5563",
              border: `1.5px dashed ${isDragOver ? colors.accent : colors.accent + "33"}`, borderRadius: 8,
              fontSize: 12, transition: "all 0.15s",
            }}
          >
            Træk {block.type === "theory" ? "teorimål" : block.type === "selfStudy" ? "selvstudium-teorimål (afsnit 1, 3, 6, 9, 10)" : "praksismål"} hertil
          </div>
        )}
        {block.items.map((uid, i) => {
          const item = findItem(uid);
          if (!item) return null;
          const mod = MODULES_MAP[item.moduleId];
          const wrongType = (block.type === "theory" && item.mode === "practice") ||
                           (block.type === "practice" && item.mode === "theory") ||
                           (block.type === "selfStudy" && item.mode === "practice");
          const wrongSection = block.type === "selfStudy" && !SELF_STUDY_ALLOWED_SECTIONS.has(item.sectionId);
          const isBeingDragged = dragItem === uid;
          const showGapBefore = isDragOver && insertIndex === i && !isBeingDragged;
          const showGapAfter = isDragOver && insertIndex === i + 1 && i === block.items.length - 1 && !isBeingDragged;

          return (
            <div key={uid}>
              {showGapBefore && (
                <div style={{
                  height: 30, borderRadius: 7, margin: "3px 0",
                  background: colors.accent + "12",
                  border: `2px dashed ${colors.accent}44`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 10, color: colors.accent + "99", fontWeight: 600,
                  transition: "height 0.15s ease, opacity 0.15s ease",
                }}>
                  ↕
                </div>
              )}
              <div
                className="drag-item"
                draggable
                onDragStart={(e) => onDragStart(uid, e)}
                onDragEnd={onDragEnd}
                onDragOver={(e) => handleItemDragOver(e, i)}
                style={{
                  display: "flex", alignItems: "center", gap: 8,
                  padding: "7px 10px", borderRadius: 7, marginBottom: 2,
                  background: (wrongType || wrongSection) ? "#7F1D1D22" : colors.accent + "11",
                  border: `1px solid ${(wrongType || wrongSection) ? "#7F1D1D" : colors.accent + "22"}`,
                  opacity: isBeingDragged ? 0.25 : 1,
                  transform: isBeingDragged ? "scale(0.97)" : "none",
                  transition: "opacity 0.15s, transform 0.15s",
                }}
              >
                <div style={{
                  width: 20, height: 20, borderRadius: "50%", background: mod.color + "33",
                  color: mod.color, display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 9, fontWeight: 800, flexShrink: 0, fontFamily: "'DM Mono', monospace",
                }}>
                  {item.moduleId}
                </div>
                <span style={{
                  fontFamily: "'DM Mono', monospace", fontSize: 10, fontWeight: 600,
                  color: mod.color, minWidth: 40, flexShrink: 0,
                }}>{item.sectionId}</span>
                <span style={{ fontSize: 12, fontWeight: 500, color: colors.text, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {item.title}
                </span>
                {wrongType && <span className="badge" style={{ background: "#7F1D1D", color: "#FCA5A5", fontSize: 9 }}>⚠ Forkert type</span>}
                {wrongSection && <span className="badge" style={{ background: "#7F1D1D", color: "#FCA5A5", fontSize: 9 }}>⚠ Ikke tilladt</span>}
                {item.selfStudy && <span className="badge" style={{ background: "#3B076422", color: "#C4B5FD", fontSize: 9 }}>📚</span>}
                {item.mustBeFirst && <span style={{ fontSize: 10, color: "#FCA5A5", flexShrink: 0 }}>⚡</span>}
                <span className="badge" style={{
                  background: item.mode === "theory" ? "#1E3A5F" : "#14532D",
                  color: item.mode === "theory" ? "#93C5FD" : "#86EFAC",
                  fontSize: 9, flexShrink: 0,
                }}>
                  {item.mode === "theory" ? "T" : "P"}
                </span>
                <button className="btn remove-btn" onClick={() => onRemoveItem(uid)} style={{
                  background: "transparent", color: "#FCA5A5", padding: "2px 4px", fontSize: 10,
                }} title="Fjern">✕</button>
              </div>
              {showGapAfter && (
                <div style={{
                  height: 30, borderRadius: 7, margin: "3px 0",
                  background: colors.accent + "12",
                  border: `2px dashed ${colors.accent}44`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 10, color: colors.accent + "99", fontWeight: 600,
                  transition: "height 0.15s ease, opacity 0.15s ease",
                }}>
                  ↕
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
