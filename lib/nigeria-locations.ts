// Data: Open Admin Data Nigeria Administrative Divisions (CC BY 4.0)
// https://github.com/open-admin-data/nigeria-administrative-divisions
import locations from "./nigeria-states-lgas.json";

export const NIGERIAN_LOCATIONS: Record<string, string[]> = locations;
export const NIGERIAN_STATES = Object.keys(locations);

function normalized(value: string) {
  return value.trim().replace(/\s+/g, " ").toLocaleLowerCase("en-NG");
}

export function canonicalState(value: string) {
  if (!value.trim()) return "";
  return NIGERIAN_STATES.find((state) => normalized(state) === normalized(value));
}

export function canonicalLga(state: string, value: string) {
  if (!value.trim()) return "";
  return NIGERIAN_LOCATIONS[state]?.find((lga) => normalized(lga) === normalized(value));
}

export function validateOrigin(stateValue: string, lgaValue: string) {
  const state = canonicalState(stateValue);
  if (state === undefined) return { error: `State of origin "${stateValue}" is not in the Nigerian states list.` };
  if (!state && lgaValue.trim()) return { error: "Choose a state of origin for the LGA." };
  const lga = state ? canonicalLga(state, lgaValue) : "";
  if (lga === undefined) return { error: `LGA "${lgaValue}" does not belong to ${state}.` };
  return { state, lga };
}
