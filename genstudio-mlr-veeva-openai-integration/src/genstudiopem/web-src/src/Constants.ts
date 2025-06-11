/*
Copyright 2025 Adobe. All rights reserved.
This file is licensed to you under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License. You may obtain a copy
of the License at http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software distributed under
the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
OF ANY KIND, either express or implied. See the License for the specific language
governing permissions and limitations under the License.
*/
import { Claim } from "@adobe/genstudio-uix-sdk";
export const extensionId: string = "genstudio-mlr-claims-app";
export const extensionLabel: string = "MLR for Veeva";
export const ICON_DATA_URI: string =
  "data:image/svg+xml;base64,PHN2ZyBpZD0ic3ZnNDQ4NSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIiB2aWV3Qm94PSIwIDAgMzc4LjcgMzg2IiB3aWR0aD0iMjQ1MyIgaGVpZ2h0PSIyNTAwIj48c3R5bGU+LnN0MHtmaWxsOiNmZjkxMDB9LnN0MXtmaWxsOiM2YTY4NjV9PC9zdHlsZT48cGF0aCBpZD0icGF0aDQ0OTciIGNsYXNzPSJzdDAiIGQ9Ik0xNjMuNiAzMzMuNEMxNDAuMSAyODUuNyA2MS43IDEyNyAxNy40IDM3LjQgNy44IDE3LjkgMCAuNiAwIDBoNjQuMWM0Mi4yIDg0LjYgODQuMyAxNjkuMyAxMjYuNSAyNTMuOUMyMzYuMiAxNjIuNSAyNzggNzcgMzE1LjkgMGg2Mi43Yy02Ny41IDEzOS4xLTExMy45IDIzNC4xLTE3Ni45IDM2MS40TDE4OS41IDM4NmwtMjUuOS01Mi42eiIvPjxwYXRoIGlkPSJwYXRoNDUwMSIgY2xhc3M9InN0MSIgZD0iTTEwNC40LjFIMjc0YzAgLjgtODMuOCAxNjkuNC04NC4yIDE2OS40QzE2MS45IDExMi4xIDEyOC4yIDUxLjQgMTA0LjQuMXoiLz48L3N2Zz4=";
interface ClaimsLibrary {
  id: string;
  name: string;
  claims: Claim[];
}

export const TEST_CLAIMS: ClaimsLibrary[] = [
  {
    id: "efficacy-claims",
    name: "Efficacy Claims",
    claims: [
      {
        id: "claim1",
        description:
          "Clinically proven to reduce joint inflammation by up to 50%.",
      },
      {
        id: "claim2",
        description:
          "Alleviates chronic pain associated with Chronexa within 2 weeks.",
      },
      {
        id: "claim3",
        description:
          "Demonstrates a 60% improvement in joint mobility over 6 months.",
      },
    ],
  },
  {
    id: "safety-claims",
    name: "Safety and Tolerability Claims",
    claims: [
      {
        id: "claim4",
        description:
          "Demonstrated a favorable safety profile with over 95% adherence in trials.",
      },
      {
        id: "claim5",
        description:
          "No significant interactions with common NSAIDs and corticosteroids.",
      },
      {
        id: "claim6",
        description: "Approved for patients aged 16 to 80 years.",
      },
    ],
  },
  {
    id: "dosage-claims",
    name: "Dosage and Administration Claims",
    claims: [
      {
        id: "claim7",
        description: "Taken once daily for consistent symptom control.",
      },
      {
        id: "claim8",
        description: "Available in 100 mg and 200 mg tablet forms.",
      },
      {
        id: "claim9",
        description:
          "Can be taken with or without food for patient convenience.",
      },
    ],
  },
  {
    id: "side-effects-claims",
    name: "Side Effects Claims",
    claims: [
      {
        id: "claim10",
        description:
          "Most common side effect is mild fatigue, reported in fewer than 8% of patients.",
      },
      {
        id: "claim11",
        description: "No significant impact on cardiovascular health.",
      },
      {
        id: "claim12",
        description:
          "Mild headaches reported in less than 3% of patients, typically resolving within a week.",
      },
    ],
  },
];

export const VIOLATION_STATUS = {
  Valid: "valid",
  Violated: "violated",
  N_A: "n/a",
} as const;

export const VIOLATION_PREFIX = "Violated: ";
export const CLAIM_VIOLATION_PREFIX = "Violated claim: ";
export const POD_PREFIX = "pod";
