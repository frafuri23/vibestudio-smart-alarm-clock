// Oggetti domestici comuni per la sfida foto
export const HOUSE_OBJECTS = [
  { name: "rubinetto", hint: "Trovalo in bagno o in cucina" },
  { name: "libro", hint: "Uno scaffale, un comodino, o un tavolo" },
  { name: "finestra", hint: "Guarda verso l'esterno" },
  { name: "sedia", hint: "Vicino al tavolo o alla scrivania" },
  { name: "tazza", hint: "In cucina o sul tavolo" },
  { name: "specchio", hint: "In bagno o in camera" },
  { name: "lampada", hint: "Su un comodino o sul pavimento" },
  { name: "cuscino", hint: "Sul divano o sul letto" },
  { name: "telecomando", hint: "Vicino al divano o alla TV" },
  { name: "bottiglia d'acqua", hint: "Sul tavolo o in cucina" },
  { name: "piatto", hint: "In cucina o nella credenza" },
  { name: "scarpa", hint: "Vicino all'ingresso o in camera" },
  { name: "orologio da muro", hint: "Guarda le pareti di casa" },
  { name: "presa elettrica", hint: "Sulle pareti di qualsiasi stanza" },
  { name: "pianta", hint: "Sul davanzale o in un angolo" },
  { name: "porta", hint: "Qualsiasi porta interna" },
  { name: "asciugamano", hint: "In bagno o in cucina" },
  { name: "bicchiere", hint: "In cucina o sul tavolo" },
];

export function getRandomObject() {
  return HOUSE_OBJECTS[Math.floor(Math.random() * HOUSE_OBJECTS.length)];
}
