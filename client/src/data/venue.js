// Venue knowledge base — the single grounding source for all three AI surfaces.
// Swapping in another WC26 stadium is a config change here, not a code change.

export const VENUE = {
  name: "Estadio Azteca — FIFA World Cup 2026",
  city: "Mexico City",
  sectors: ["A", "B", "C", "D", "E", "F", "G", "H"],
  gates: [
    { id: "Gate 1", serves: ["A", "B"], nearestTransit: "Metro Line 2 — Azteca station, 400m" },
    { id: "Gate 2", serves: ["B", "C"], nearestTransit: "Shuttle bus stop S2, 150m" },
    { id: "Gate 3", serves: ["C", "D"], nearestTransit: "Tren Ligero Estadio Azteca, 250m" },
    { id: "Gate 4", serves: ["E", "F"], nearestTransit: "Rideshare zone R1, 300m" },
    { id: "Gate 5", serves: ["F", "G"], nearestTransit: "Shuttle bus stop S5, 200m" },
    { id: "Gate 6", serves: ["G", "H"], nearestTransit: "Accessible drop-off + Metro elevator, 100m" },
  ],
  facilities: [
    { name: "First aid", locations: ["Concourse near Sector B", "Concourse near Sector F"] },
    { name: "Prayer / quiet room", locations: ["Level 2, behind Sector D"] },
    { name: "Family & nursing room", locations: ["Level 1, Sector A concourse"] },
    { name: "Accessible seating platforms", locations: ["Sectors C and G, level access from Gate 6"] },
    { name: "Water refill stations", locations: ["Every sector concourse — free, part of zero-waste program"] },
    { name: "Lost & found", locations: ["Gate 3 services desk"] },
    { name: "Sensory room", locations: ["Level 2, Sector H"] },
  ],
  food: [
    { stand: "Tacos al Pastor", sector: "B", avgQueueMin: 12 },
    { stand: "Tortas & Aguas Frescas", sector: "D", avgQueueMin: 6 },
    { stand: "World Fan Kitchen (veg/halal)", sector: "F", avgQueueMin: 8 },
    { stand: "Café & Churros", sector: "G", avgQueueMin: 4 },
  ],
  sustainability:
    "Zero single-use plastic. Cup deposit scheme (returns at every gate). Free water refills. Public transit is free with a match ticket for 4 hours before/after kickoff.",
  accessibility:
    "Gate 6 is the step-free entrance with elevators to all levels. Accessible platforms in Sectors C and G. Sensory room in Sector H. Volunteers in orange vests can assist; ask any of them.",
  stepFreePaths:
    "Step-free circulation runs along the Level 1 concourse ring. Elevators at Gates 3 and 6. Ramps between Sectors C–D and G–H.",
};

export const INCIDENT_POOL = [
  { sev: "info", text: "Shuttle S5 running 6 min behind schedule" },
  { sev: "warn", text: "Turnstile 4C offline at Gate 4 — manual scanning in effect" },
  { sev: "info", text: "Halftime in 12 minutes — concourse surge expected" },
  { sev: "warn", text: "Sector C concourse congestion above threshold" },
  { sev: "crit", text: "Medical assist requested, Sector F row 22" },
  { sev: "info", text: "Rain expected 21:30 — covered walkway to Metro advised" },
];

export const PLACES = [
  "Gate 1", "Gate 2", "Gate 3", "Gate 4", "Gate 5", "Gate 6",
  ...VENUE.sectors.map((s) => `Sector ${s}`),
  "First aid (Sector B)", "First aid (Sector F)", "Prayer room (Sector D, L2)",
  "Family room (Sector A)", "Sensory room (Sector H, L2)", "Lost & found (Gate 3)",
  "Metro station", "Rideshare zone",
];

export const QUICK_PROMPTS = [
  "¿Dónde está la entrada accesible?",
  "Which food stand has the shortest line?",
  "Comment rentrer en métro après le match ?",
  "أين غرفة الصلاة؟",
  "Where can I refill my water bottle?",
];
