import type { EventDoc, Party, Person } from "./types";

export function displayCoupleName(
  couple: { name?: string; memberIds: [string, string] },
  people: Person[],
): string {
  if (couple.name) return couple.name;
  const names = couple.memberIds.map(
    (id) => people.find((p) => p.id === id)?.name ?? "?",
  );
  return names.join(" & ");
}

/**
 * Settlement units: one per couple, plus one per person not in a couple.
 * Couples come from `event.couples`; a member id that no longer matches a
 * person is ignored so a stale couple can't hide someone from settlement.
 */
export function partiesFor(event: EventDoc): Party[] {
  const known = new Set(event.people.map((p) => p.id));
  const paired = new Set<string>();
  const parties: Party[] = [];

  for (const couple of event.couples) {
    const members = couple.memberIds.filter((id) => known.has(id));
    if (members.length === 0) continue;
    for (const id of members) paired.add(id);
    parties.push({
      id: couple.id,
      name: displayCoupleName(couple, event.people),
      kind: "couple",
      memberIds: members,
    });
  }

  for (const person of event.people) {
    if (paired.has(person.id)) continue;
    parties.push({
      id: person.id,
      name: person.name,
      kind: "person",
      memberIds: [person.id],
    });
  }

  return parties;
}

/** person id -> party id */
export function partyIndex(parties: Party[]): Map<string, string> {
  const index = new Map<string, string>();
  for (const party of parties) {
    for (const memberId of party.memberIds) index.set(memberId, party.id);
  }
  return index;
}
