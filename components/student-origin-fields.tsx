"use client";

import { useState } from "react";
import { NIGERIAN_LOCATIONS, NIGERIAN_STATES, canonicalLga, canonicalState } from "@/lib/nigeria-locations";

export default function StudentOriginFields({ initialState = "", initialLga = "" }: { initialState?: string; initialLga?: string }) {
  const [state, setState] = useState(canonicalState(initialState) ?? "");
  const lgas = NIGERIAN_LOCATIONS[state] ?? [];
  return <>
    <div className="field"><label>State of origin</label><select className="select" name="stateOfOrigin" value={state} onChange={(event) => setState(event.target.value)}>
      <option value="">Select state (optional)</option>
      {NIGERIAN_STATES.map((item) => <option key={item} value={item}>{item}</option>)}
    </select></div>
    <div className="field"><label>Local government area</label><select className="select" name="lgaOfOrigin" key={state} defaultValue={state === canonicalState(initialState) ? canonicalLga(state, initialLga) ?? "" : ""} disabled={!state}>
      <option value="">Select LGA (optional)</option>
      {lgas.map((item) => <option key={item} value={item}>{item}</option>)}
    </select></div>
  </>;
}
