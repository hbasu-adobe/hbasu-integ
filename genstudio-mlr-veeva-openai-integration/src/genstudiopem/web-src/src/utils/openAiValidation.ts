import { Configuration, OpenAIApi } from "openai";
import { Experience } from "@adobe/genstudio-uix-sdk";
import { ClaimResults, Violation } from "../types";
import { VIOLATION_STATUS } from "../Constants";

const configuration = new Configuration({
  apiKey: process.env.REACT_APP_OPENAI_API_KEY,
});

const openai = new OpenAIApi(configuration);

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

  const systemPrompt = `You are a medical claims validator for Stage 2 validation. Exact text matching has already been checked. Focus on claims that reference the same topic but have different critical details.

NOTE: You only provide warnings, not violations. All your findings will be shown as "Claim Warning" to users.

Rules:
- VALID: Content maintains the same meaning and all critical details as the claim
- WARNING: Content is about the same topic as the claim but changes critical details:
  * Different numbers (e.g., "50%" vs "40%", "2 weeks" vs "7 days")
  * Different timelines (e.g., "within 2 weeks" vs "within 7 days")  
  * Different quantities (e.g., "100mg" vs "200mg")
  * Different confidence levels (e.g., "proven" vs "may help")
- N/A: Content doesn't reference the claim topic at all

Be specific about what changed. Focus on factual differences, not minor wording variations.

Respond in this JSON format:
{
  "fieldName1": [
    { "status": "valid" | "warning" | "n/a", "violation": "..." },
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
        status: v.status === 'warning' ? VIOLATION_STATUS.Violated : v.status, // Convert warning to violated for consistency
        violation: v.violation ? `Claim Warning: ${v.violation}` : undefined,
      }));

      if (charLimitResult) {
        result[field].push(charLimitResult);
      }
    }
    return result;
  } catch (error) {
    console.error("Error in OpenAI validation:", error);
    // Return all fields as warning (not error since this is Stage 2)
    const result: ClaimResults = {};
    for (const fieldName of Object.keys(experienceFields)) {
      result[fieldName] = [
        {
          status: VIOLATION_STATUS.N_A,
          violation: "Claim Warning: Error during OpenAI validation",
        },
      ];
    }
    return result;
  }
} 