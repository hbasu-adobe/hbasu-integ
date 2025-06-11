import { Configuration, OpenAIApi } from "openai";
import { Experience } from "@adobe/genstudio-uix-sdk";
import { ClaimResults, Violation } from "../types";
import { VIOLATION_STATUS } from "../Constants";

// Only for development; remove for production!

const configuration = new Configuration({
  //const OPENAI_KEY = process.env.OPENAI_KEY;
});

const openai = new OpenAIApi(configuration);
 

console.log("OpenAI client initialized with key:", "sk-proj-...");

// --- Character limit check logic ---
const maxCharacterLimits = {
  header: 80,
  pre_header: 100,
  body: 300,
};

function checkCharacterLimits(fieldName: string, text: string) {
  const limit = maxCharacterLimits[fieldName as keyof typeof maxCharacterLimits];
  if (limit && text.length > limit) {
    return {
      status: VIOLATION_STATUS.Violated,
      //violation: `Max character limit for ${fieldName} is ${limit}`,
    };
  }
  return null;
}
// --- End character limit check logic ---

export async function validateClaimsWithOpenAI(
  experience: Experience,
  claims: { id: string; description: string }[]
): Promise<ClaimResults> {
  console.log('OpenAI validation received claims:', JSON.stringify(claims, null, 2));
  const experienceFields = experience.experienceFields;

  // Build a prompt that includes all fields and their values
  const fieldsText = Object.entries(experienceFields)
    .filter(([, entry]) => typeof entry.fieldValue === "string")
    .map(([fieldName, entry]) => `"${fieldName}": "${entry.fieldValue}"`)
    .join(",\n");

  const claimsText = claims.map((claim, i) => `${i + 1}. ${claim.description}`).join("\n");
  console.log('Experience fields:', JSON.stringify(experienceFields, null, 2));
  console.log('Claims text being sent to OpenAI:', claimsText);

  const systemPrompt = `Instructions:

Only validate a claim if the email content explicitly mentions key elements (e.g., numbers, percentages, timelines, quantities, mechanisms).
General or vague mentions (like "reduces inflammation") must be ignored unless they match specific claim details.
If numbers, quantities, or timelines are mentioned, they must be an exact match.
Any numeric mismatch (e.g., 1-2 days vs. 2 weeks) must be flagged as a violation.
Do not infer, assume, or relax any conditions: only exact matching is allowed.
When validating:

If email explicitly matches all critical parts of the claim → mark it "valid."
If email mentions a critical part but changes any numbers, scope, timelines, mechanisms, even slightly → mark it "violated" and explain why.
If email does not reference a claim with sufficient specificity, skip validating that claim.

Respond in this JSON format:
{
  "fieldName1": [
    { "status": "valid" | "violated" | "n/a", "violation": "..." },
    ...
  ],
  "fieldName2": [
    ...
  ]
}
`;

  const userPrompt = `Experience fields:
{
${fieldsText}
}

Claims to check against:
${claimsText}

Validate each field against all claims and provide the results in the specified JSON format.`;

  try {
    console.log("Full prompt being sent to OpenAI:", {
      systemPrompt,
      userPrompt
    });
    const response = await openai.createChatCompletion({
      model: "gpt-3.5-turbo",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.1,
    });
    console.log("OpenAI claims check response:", response);
    
    const content = response.data.choices[0]?.message?.content;
    console.log("Response content:", content);
    
    if (!content) {
      console.error("No content received from OpenAI");
      return {};
    }

    const validationResult = JSON.parse(content);

    // Convert to ClaimResults type and append character limit check
    const result: ClaimResults = {};
    for (const [field, violations] of Object.entries(validationResult)) {
      const fieldValue = experienceFields[field]?.fieldValue;
      const charLimitResult = (typeof fieldValue === "string")
        ? checkCharacterLimits(field, fieldValue)
        : null;

      result[field] = (violations as any[]).map((v) => ({
        status: v.status,
        violation: v.violation || undefined,
      }));

      if (charLimitResult) {
        result[field].push(charLimitResult);
      }
    }
    return result;
  } catch (error) {
    console.error("Error in OpenAI validation:", error);
    // Return all fields as error
    const result: ClaimResults = {};
    for (const fieldName of Object.keys(experienceFields)) {
      result[fieldName] = [
        {
          status: VIOLATION_STATUS.N_A,
          violation: "Error during validation",
        },
      ];
    }
    return result;
  }
} 