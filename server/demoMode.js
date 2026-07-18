// Demo-mode responses used when no ANTHROPIC_API_KEY is configured.
// They mirror the exact JSON/text shapes the live model returns, so the
// frontend behaves identically in both modes.

export function demoResponse(kind, messages) {
  if (kind === "brief") {
    return JSON.stringify({
      summary:
        "Sector C is above 85% occupancy with congestion building on its concourse, while Gate 4 queues are elevated due to an offline turnstile. Overall bowl load is manageable, but halftime surge and possible rain at 21:30 require pre-positioning now.",
      riskLevel: "moderate",
      actions: [
        { priority: 1, team: "Crowd management", action: "Open the C–D ramp as one-way flow toward Sector D concourse and post 4 stewards at the Sector C vomitories", why: "Relieves the highest-density sector before the halftime surge" },
        { priority: 2, team: "Gate operations", action: "Redirect arriving ticket-holders for Sectors E–F from Gate 4 to Gate 5 via PA and digital signage", why: "Gate 4 queue is 3x Gate 5 with a turnstile down" },
        { priority: 3, team: "Guest services", action: "Deploy 2 multilingual volunteers to Gate 4 to assist manual scanning", why: "Manual checks are the throughput bottleneck" },
        { priority: 4, team: "Transport liaison", action: "Confirm covered-walkway signage to the Metro is lit before 21:15", why: "Rain forecast at 21:30 will push egress toward covered routes" }
      ]
    });
  }

  if (kind === "route") {
    return JSON.stringify({
      etaMin: 9,
      stepFree: true,
      steps: [
        "From your starting point, follow the Level 1 concourse ring clockwise",
        "At Gate 3, take the elevator to stay on step-free circulation",
        "Continue past Sectors D, E and F along the concourse",
        "Use the G–H ramp to reach the Sector G accessible platform entrance"
      ],
      tip: "Gate 4 area is congested right now — the clockwise route past Gate 3 avoids it entirely."
    });
  }

  // Concierge chat: echo a helpful grounded answer (language-matching is a
  // live-mode capability; demo mode answers in English/Spanish samples).
  const last = messages[messages.length - 1]?.content?.toLowerCase?.() || "";
  if (last.includes("accesible") || last.includes("accessible")) {
    return "La entrada accesible es la Puerta 6 (Gate 6): tiene acceso a nivel, ascensores a todos los pisos y está a 100 m de la zona de descenso accesible. Los voluntarios con chaleco naranja pueden acompañarte. ⚽";
  }
  if (last.includes("food") || last.includes("line") || last.includes("eat")) {
    return "Right now the shortest line is Café & Churros in Sector G (~4 min), followed by Tortas & Aguas Frescas in Sector D (~6 min). If you want veg or halal options, World Fan Kitchen in Sector F is about 8 minutes.";
  }
  if (last.includes("water") || last.includes("refill")) {
    return "Free water refill stations are on every sector concourse — part of the stadium's zero-waste program. The nearest one is signposted in blue; bring any bottle or use a deposit cup from the gates.";
  }
  return "This is demo mode (no API key configured). With ANTHROPIC_API_KEY set, I answer any stadium question in your own language — try asking about gates, food, accessibility, transit or sustainability!";
}
