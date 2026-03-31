const TOTAL_SEATS = 179;
const MAJORITY = 90;

const parties = [
  {
    id: "A",
    name: "Social Democrats",
    seats: 38,
    leader: "Mette Frederiksen",
    color: "#c62828",
    lrScore: 4.2,
  },
  {
    id: "F",
    name: "Green Left",
    seats: 20,
    leader: "Pia Olsen Dyhr",
    color: "#2e7d32",
    lrScore: 3.4,
  },
  {
    id: "V",
    name: "Venstre",
    seats: 18,
    leader: "Troels Lund Poulsen",
    color: "#1565c0",
    lrScore: 6.2,
  },
  {
    id: "I",
    name: "Liberal Alliance",
    seats: 16,
    leader: "Alex Vanopslagh",
    color: "#7b1fa2",
    lrScore: 8.2,
  },
  {
    id: "O",
    name: "Danish People's Party",
    seats: 16,
    leader: "Morten Messerschmidt",
    color: "#ff8f00",
    lrScore: 8.7,
  },
  {
    id: "M",
    name: "Moderates",
    seats: 14,
    leader: "Lars Lokke Rasmussen",
    color: "#00838f",
    lrScore: 5.3,
  },
  {
    id: "C",
    name: "Conservatives",
    seats: 13,
    leader: "Mona Juul",
    color: "#3949ab",
    lrScore: 6.8,
  },
  {
    id: "OE",
    name: "Red-Green Alliance",
    seats: 11,
    leader: "Pelle Dragsted",
    color: "#d81b60",
    lrScore: 2.0,
  },
  {
    id: "B",
    name: "Social Liberals",
    seats: 10,
    leader: "Martin Lidegaard",
    color: "#f4511e",
    lrScore: 4.8,
  },
  {
    id: "AE",
    name: "Denmark Democrats",
    seats: 10,
    leader: "Inger Stojberg",
    color: "#6d4c41",
    lrScore: 7.7,
  },
  {
    id: "AA",
    name: "The Alternative",
    seats: 5,
    leader: "Franciska Rosenkilde",
    color: "#43a047",
    lrScore: 2.8,
  },
  {
    id: "H",
    name: "Citizens' Party",
    seats: 4,
    leader: "Lars Boje Mathiesen",
    color: "#546e7a",
    lrScore: 9.1,
  },
  {
    id: "JF",
    name: "Social Democratic Party (Faroe Islands)",
    seats: 1,
    leader: "Aksel V. Johannesen",
    color: "#ef5350",
    lrScore: 4.5,
  },
  {
    id: "SF",
    name: "Union Party (Faroe Islands)",
    seats: 1,
    leader: "Bardur a Steig Nielsen",
    color: "#3f51b5",
    lrScore: 6.3,
  },
  {
    id: "IA",
    name: "Inuit Ataqatigiit (Greenland)",
    seats: 1,
    leader: "Mute Bourup Egede",
    color: "#26a69a",
    lrScore: 3.6,
  },
  {
    id: "N",
    name: "Naleraq (Greenland)",
    seats: 1,
    leader: "Pele Broberg",
    color: "#8d6e63",
    lrScore: 6.9,
  },
];

const likelyCoalitions = [
  {
    title: "Red-leaning coalition plus Moderates",
    partyIds: ["A", "F", "OE", "B", "AA", "M"],
    note: "Discussed as one mathematically stable route after the election, with Moderates as kingmaker.",
  },
  {
    title: "Broad center coalition (A + F + B + M + C)",
    partyIds: ["A", "F", "B", "M", "C"],
    note: "A compromise-oriented setup that combines center-left and center-right forces.",
  },
  {
    title: "Blue bloc attempt with external support",
    partyIds: ["V", "I", "O", "C", "AE", "M"],
    note: "Close to a governing base in public debate, but coalition chemistry and leadership questions matter.",
  },
];

const presetCoalitions = [
  { id: "none", label: "Clear all", partyIds: [] },
  { id: "red", label: "Red bloc", partyIds: ["A", "F", "OE", "B", "AA"] },
  { id: "blue", label: "Blue bloc", partyIds: ["V", "I", "O", "C", "AE", "H"] },
  {
    id: "svm",
    label: "Former SVM core",
    partyIds: ["A", "V", "M"],
  },
  {
    id: "red-plus-m",
    label: "Red + Moderates",
    partyIds: ["A", "F", "OE", "B", "AA", "M"],
  },
];

const state = {
  government: new Set(),
};

const governmentZone = document.querySelector("#government-zone");
const oppositionZone = document.querySelector("#opposition-zone");
const governmentBar = document.querySelector("#government-bar");
const oppositionBar = document.querySelector("#opposition-bar");
const governmentSeatTotal = document.querySelector("#government-seat-total");
const oppositionSeatTotal = document.querySelector("#opposition-seat-total");
const majorityMessage = document.querySelector("#majority-message");
const likelyMatch = document.querySelector("#likely-match");
const likelyList = document.querySelector("#likely-list");
const presetButtons = document.querySelector("#preset-buttons");

function seatsFor(ids) {
  return parties
    .filter((party) => ids.has(party.id))
    .reduce((sum, party) => sum + party.seats, 0);
}

function sortedParties(inGovernment) {
  return parties
    .filter((party) => (inGovernment ? state.government.has(party.id) : !state.government.has(party.id)))
    .sort((a, b) => a.lrScore - b.lrScore || b.seats - a.seats || a.name.localeCompare(b.name));
}

function lrLabel(score) {
  if (score <= 3) {
    return "left";
  }
  if (score < 6) {
    return "center-left";
  }
  if (score < 7.5) {
    return "center-right";
  }
  return "right";
}

function renderPartyList(target, inGovernment) {
  target.innerHTML = "";
  const list = sortedParties(inGovernment);

  for (const party of list) {
    const li = document.createElement("li");
    li.className = "party-item";
    li.style.setProperty("--party-color", party.color);
    li.draggable = true;
    li.dataset.partyId = party.id;

    li.addEventListener("dragstart", (event) => {
      event.dataTransfer.setData("text/plain", party.id);
      event.dataTransfer.effectAllowed = "move";
    });

    const button = document.createElement("button");
    button.type = "button";
    button.className = "party-btn";
    button.addEventListener("click", () => {
      toggleParty(party.id);
    });

    button.innerHTML = `
      <div class="party-top">
        <span class="party-name">${party.name}</span>
        <span class="party-seats">${party.seats} seats</span>
      </div>
      <div class="party-meta">${party.leader}</div>
      <div class="party-ideology">L/R: ${party.lrScore.toFixed(1)} (${lrLabel(party.lrScore)})</div>
    `;

    li.appendChild(button);
    target.appendChild(li);
  }
}

function renderStackedBar(target, inGovernment) {
  target.innerHTML = "";
  const list = sortedParties(inGovernment);
  const totalSeats = list.reduce((sum, party) => sum + party.seats, 0);

  if (totalSeats === 0) {
    return;
  }

  for (const party of list) {
    const segment = document.createElement("div");
    segment.className = "stack-segment";
    segment.style.width = `${(party.seats / totalSeats) * 100}%`;
    segment.style.backgroundColor = party.color;
    segment.dataset.short = party.id;
    segment.title = `${party.name}: ${party.seats} seats`;
    target.appendChild(segment);
  }
}

function renderMajority(seats) {
  governmentSeatTotal.textContent = String(seats);
  majorityMessage.classList.remove("strong-majority", "weak-majority", "no-majority");

  if (seats >= MAJORITY + 10) {
    majorityMessage.classList.add("strong-majority");
    majorityMessage.textContent = `Majority government: ${seats - MAJORITY} seats above the 90-seat threshold.`;
    return;
  }

  if (seats >= MAJORITY) {
    majorityMessage.classList.add("weak-majority");
    majorityMessage.textContent = `Narrow majority: ${seats - MAJORITY} seats above the 90-seat threshold.`;
    return;
  }

  majorityMessage.classList.add("no-majority");
  majorityMessage.textContent = `No majority yet: needs ${MAJORITY - seats} more seats to reach 90.`;
}

function renderLikelyCommentary() {
  likelyList.innerHTML = "";

  const selected = state.government;
  const exactMatch = likelyCoalitions.find((coalition) => {
    if (coalition.partyIds.length !== selected.size) {
      return false;
    }
    return coalition.partyIds.every((id) => selected.has(id));
  });

  if (exactMatch) {
    likelyMatch.textContent = `Your current coalition matches "${exactMatch.title}". ${exactMatch.note}`;
  } else if (selected.size === 0) {
    likelyMatch.textContent = "No coalition selected yet. Move parties into government to test scenarios.";
  } else {
    likelyMatch.textContent =
      "Current selection does not exactly match one of the highlighted scenarios, but you can still test its seat math.";
  }

  for (const coalition of likelyCoalitions) {
    const coalitionSeats = coalition.partyIds
      .map((id) => parties.find((party) => party.id === id))
      .reduce((sum, party) => sum + party.seats, 0);
    const reached = coalition.partyIds.filter((id) => selected.has(id)).length;

    const li = document.createElement("li");
    li.textContent = `${coalition.title} (${coalitionSeats} seats): ${coalition.note} [${reached}/${coalition.partyIds.length} selected]`;
    likelyList.appendChild(li);
  }
}

function renderPresetButtons() {
  if (!presetButtons) {
    return;
  }

  presetButtons.innerHTML = "";
  for (const preset of presetCoalitions) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "preset-btn";
    button.textContent = preset.label;
    button.addEventListener("click", () => {
      state.government = new Set(preset.partyIds);
      render();
    });
    presetButtons.appendChild(button);
  }
}

function render() {
  const governmentSeats = seatsFor(state.government);
  const oppositionSeats = TOTAL_SEATS - governmentSeats;
  if (oppositionSeatTotal) {
    oppositionSeatTotal.textContent = String(oppositionSeats);
  }
  renderPartyList(governmentZone, true);
  renderPartyList(oppositionZone, false);
  renderStackedBar(governmentBar, true);
  renderStackedBar(oppositionBar, false);
  renderMajority(governmentSeats);
  renderLikelyCommentary();
}

function toggleParty(partyId) {
  if (state.government.has(partyId)) {
    state.government.delete(partyId);
  } else {
    state.government.add(partyId);
  }
  render();
}

function movePartyToZone(partyId, zoneName) {
  if (!parties.some((party) => party.id === partyId)) {
    return;
  }

  if (zoneName === "government") {
    state.government.add(partyId);
  } else {
    state.government.delete(partyId);
  }
  render();
}

function setupZoneDnD(zoneElement) {
  zoneElement.addEventListener("dragover", (event) => {
    event.preventDefault();
    zoneElement.classList.add("drag-over");
  });

  zoneElement.addEventListener("dragleave", () => {
    zoneElement.classList.remove("drag-over");
  });

  zoneElement.addEventListener("drop", (event) => {
    event.preventDefault();
    zoneElement.classList.remove("drag-over");
    const partyId = event.dataTransfer.getData("text/plain");
    movePartyToZone(partyId, zoneElement.dataset.zone);
  });
}

setupZoneDnD(governmentZone);
setupZoneDnD(oppositionZone);
renderPresetButtons();
render();
