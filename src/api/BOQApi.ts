import type { BOQResponse, CountryOption, MeasurementStandard } from "@/util/types";
import { GoogleGenAI } from "@google/genai";


const apiKey =  import.meta.env.VITE_GEMINI_API_KEY ||'';

const ai = apiKey ? new GoogleGenAI({ apiKey }) : null;

const createSystemPrompt = (country: CountryOption): string => {
    return `
    <system_prompt>
        <persona>
            you are a expert chief estimator and quantity surveyor with 20 years of experience in the construction industry, specializing in preparing detailed Bills of Quantities (BOQs) for a wide range of projects.
            You have an in-depth understanding of various measurement standards, including NRM1, NRM2, SMM7, CESMM4, and POMI, and are proficient in applying these standards to ensure accurate and comprehensive BOQ preparation.
            Your expertise extends to analyzing project descriptions, identifying relevant trades and items, and calculating quantities and costs based on current market rates. You are adept at providing clear assumptions and notes to accompany your BOQs, ensuring that all stakeholders have a thorough understanding of the basis for your estimates.
            **strict persona**
        </persona>
        <context>
            Location: ${country.name}
            Currency: ${country.currency} (${country.currencySymbol})
            Year: ${new Date().getFullYear()}
            Market awareness: You are aware of the current market conditions, including labor and material costs, supply chain issues, and economic factors that may impact construction projects in ${country.name}.
        </context>
        <preamble_and_assumptions>
            1. wall height : ASSUME 3.0m (Floor to floor) unless specified otherwise.
            2. foundation: 1.2m dept (rubble masonry or rcc footings) unless specified otherwise.
            3. slab thickness: 150mm for residential, 200mm for commercial unless specified otherwise.
            4. wall thickness: 225mm (9") for external walls, 112.5mm (4.5") for internal partition walls unless specified otherwise.
            5. openings: doors 0.9m x 2.1m, windows 1.5m x 1.5m unless specified otherwise.
            6. specifications: ASSUME standard/mid-range finishes (e.g., ceramic tiles, emulsion paint, standard fixtures) unless "luxury" is specified otherwise.
            7. rates: use current market rates for materials and labor in ${country.name}, adjusted for any known supply chain issues or economic factors.
        </preamble_and_assumptions>
        <instructions>
            <protocol_1_identification>
                IDENTIFY MATERIALS: Analyze the project description and the image if image given deeply. Extract all  elements and specifications, categorizing them strictly by trade.
            </protocol_1_identification>

            <protocole_2_pricing_strategy>
                 PRICING STRATEGY (CRITICAL - STRICT CONSISTENCY REQUIRED):
                    - USE LOCAL MARKET RATES: Use current market rates for ${country.name}. Never convert foreign currency.
                    - TRADE RATES: Use wholesale/contractor rates (not DIY/Retail prices).
                    - LABOR RATES: Use strictly local prevailing wages.
                    - OVERHEAD & PROFIT: Always include 15–20% if he country is in asia or gulf use 7% O&P in your calculations unless its mentioned.
                    - Donot give 0 for pricing and use best fit for ${country.name}            
            </protocole_2_pricing_strategy>

            <protocole_3_quantity_take_off>
                QUANTITY TAKE-OFF (DIM SHEET):
                    - You MUST populate the 'quanitityFormula' field for EVERY item.
                    - Format: "Length x Width x Height"
                    - If dimensions are missing, use values from <preamble_and_assumptions> and explicitly state them in the formula and 'remarks'.
                    - NEVER leave 'quanitityFormula' empty.
            </protocole_3_quantity_take_off>

            <protocole_4_sanity_check>
                TOTAL COST SANITY CHECK: 
                    - Before outputting, verify if the Total Cost is realistic for the project size in ${country.name}.
                    - Constraint: Variance between two runs for the same description must be &lt;10%.
            </protocole_4_sanity_check>

            <formate_constraints>
                - Returnn PURE JSON ONLY. NO conversational pros.
                - Ensure 'totalAmount' is mathematically correct (quantity * totalRate).
                - List all assumptions made in the "assumptions" array.
            </formate_constraints>

            <json_schema>
            {
                "projectSummary": {
                    "projectType": "string",
                    "structure": "string",
                    "floors": "string",
                    "measurementStandard": "string",
                    "currency": "string",
                    "currencySymbol": "string",
                    "totalEstimatedCost": number,
                    "notes": "string"
                },
                "boqItems": [
                    {
                    "tradeName": "string",
                    "tradeTotal": number,
                    "items": [
                        {
                        "id": "string",
                        "itemNo": "string",
                        "description": "string",
                        "unit": "string",
                        "quantity": number,
                        "quantityFormula": "string",
                        "rateMaterial": number,
                        "rateLabor": number,
                        "rateAnalysis": {
                            "baseMaterial": number,
                            "baseLabor": number,
                            "plantAndEquipment": number,
                            "overheadAndProfit": number,
                            "narrative": "string"
                        },
                        "totalRate": number,
                        "totalAmount": number,
                        "elementType": "Wall" | "Slab" | "Column" | "Beam" | "Foundation" | "Door" | "Window" | "Other",
                        "remarks": "string"
                        }
                    ]
                    }
                ],
                "assumptions": [ { "category": "string", "text": "string" } ],
                "recommendedSuppliers": [
                    {
                    "trade": "string",
                    "name": "string",
                    "phoneNumber": "string",
                    "email": "string",
                    "website": "string",
                    "location": "string",
                    "serviceLevel": "string",
                    "estimatedQuote": "string",
                    "specialization": "string",
                    "typicalProjectSize": "string",
                    "rating": "string",
                    "testimonial": "string"
                    }
                ],
                "isInsufficientInfo": boolean,
                "missingInfoReason": "string"
                }
            </json_schema>


        </instructions>

</system_prompt>
`;
};

export const generateBOQ = async (
    projectDescription: string,
    measurementStanderd: MeasurementStandard,
    country: CountryOption,
    file?: { mimeType: string; data: string }

): Promise<BOQResponse> => {

    if (!ai) {
        throw new Error("API Key is missing.");
    }

    const modelId = "gemini-2.5-flash-preview-09-2025";

    const textPrompt = `
        Project Scope Description:
        ${projectDescription}

        Standerd: ${measurementStanderd}

        TASK: 
            1. Identify all materials and trades required.
            2. **PRICING**: Search for TRADE/WHOLESALE unit prices in ${country.name} (${country.currency}).
            - IGNORE retail websites. Look for construction cost indices or trade supplier lists.
            3. **QUANTITIES & DIM SHEET**:
            - Calculate exact quantities based on the description/drawings.
            - **CRITICAL**: Fill 'quantityFormula' with the exact math. 
                - Good Example: "L: 15.0m x H: 3.0m = 45.0m2"
                - Good Example: "Vol: 10m x 0.6m x 0.6m = 3.6m3"
                - Bad Example: "Measured from drawing" (DO NOT USE THIS)
            - If dimensions are missing, ASSUME standard sizes (e.g. 3m floor height) and WRITE THAT in the formula.
            4. **VENDORS**: Find 3-5 real, top-rated suppliers in ${country.name}.
            5. Generate the DETAILED PRICED BOQ in strict JSON format.

            **MANDATORY BOQ STRUCTURE (Strict Adherence Required):**
            You must generate a COMPLETE BOQ with exactly these 10 sections in this order:
            
            1. **Preliminaries** (Site setup, insurance, temporary water/power)
            2. **Substructure** (Excavation, Earthwork support, Concrete Foundations, DPC)
            3. **Superstructure - Concrete/Frame** (Columns, Beams, Suspended Slabs, Stairs)
            4. **Superstructure - Walling** (External brick/block walls, Internal partitions)
            5. **Roofing** (Structure, Covering, Drainage/Gutters)
            6. **Openings** (Exterior Doors, Interior Doors, Windows)
            7. **Internal Finishes** (Floor finishes, Wall plaster/paint/tile, Ceiling finishes)
            8. **External Finishes** (Plaster, Paint, Cladding)
            9. **MEP Services** (Plumbing first fix/sanitaryware, Electrical first fix/accessories)
            10. **External Works** (Drainage, Paving, Fencing)

            **REQUIREMENT:**
            - Provide at least **3-5 specific line items** for EACH of the 10 sections above.
            - DO NOT provide "Lump Sum" for the whole trade. Break it down by m2, m3, nr, or lm.
            - **CONSISTENCY**: If I ask this again, the items and quantities must be nearly identical.
        `;

    const parts: any[] = [{ text: textPrompt }];

    if (file) {
        parts.push({
            inlineData: {
                mimeType: file.mimeType,
                data: file.data
            }
        })
    }

    const generateWithRetry = async (retries = 3, delay = 2000): Promise<any> => {
        try {
            return await ai.models.generateContent({
                model: modelId,
                contents: { parts: parts },
                config: {
                    systemInstruction: createSystemPrompt(country),
                    temperature: 0.05,
                    topP: 0.8,
                    tools: [{ googleSearch: {} }]
                }

            })

        } catch (err: any) {
            const msg = err.message || JSON.stringify(err);

            const isQuotaError = msg.includes('429') ||
                msg.includes('RESOURCE_EXHAUSTED') ||
                msg.includes('quota') ||
                msg.includes('Too Many Requests');

            if (isQuotaError && retries > 0) {
                console.warn(`⚠️ Quota exceeded. Retrying in ${delay}ms... (${retries} retries left)`);
                await new Promise(res => setTimeout(res, delay));
                // Exponential backoff: double the delay
                return generateWithRetry(retries - 1, delay * 2);
            }
            throw err;
        }
    };

    try {
        const response = await generateWithRetry();
        let text = response.text;

        if (!text) throw new Error("Empty response from AI model.");

        const jsonBlockMatch = text.match(/```json\s*([\s\S]*?)\s*```/);
        if (jsonBlockMatch) {
            text = jsonBlockMatch[1];
        } else {
            const startIndex = text.indexOf('{');
            const endIndex = text.lastIndexOf('}');
            if (startIndex !== -1 && endIndex !== -1) {
                text = text.substring(startIndex, endIndex + 1)
            }
        }

        let data: BOQResponse;

        try {
            data = JSON.parse(text) as BOQResponse;

        } catch (err) {
            console.error("Failed to pars Json:", text)
            throw new Error("AI returned invalid Json fromat. Please try again.");
        }

        if (data.projectSummary) {
            data.projectSummary.currency = country.currency;
            data.projectSummary.currencySymbol = country.currencySymbol;
        }

        const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
        if (groundingChunks) {
            data.sources = groundingChunks
                .filter((c: any) => c.web && c.web.uri && c.web.title)
                .map((c: any) => ({
                    title: c.web.title,
                    uri: c.web.uri
                }));
        }

        data.boqItems?.forEach((trade, tIdx) => {
            trade.items?.forEach((item, iIdx) => {
                if (!item.id) item.id = `item-${tIdx}-${iIdx}-${Math.random().toString(36).substring(2, 9)}`;
            })
        });

        return data;

    } catch (err: any) {
        console.error("Gemini API Error:", err);

        let msg = err.message || err.toString();

        // Check for nested JSON in error message (common with Google APIs)
        try {
            const jsonMatch = msg.match(/\{.*\}/);
            if (jsonMatch) {
                const parsed = JSON.parse(jsonMatch[0]);
                if (parsed.error && parsed.error.message) {
                    msg = parsed.error.message;
                }
            }
        } catch (e) {
            // ignore parse error
        }

        if (msg.includes('429') || msg.includes('quota') || msg.includes('RESOURCE_EXHAUSTED')) {
            throw new Error("⚠️ **Quota Exceeded**: The AI service is busy. We automatically retried 3 times but the limit persists. Please try again in 1-2 minutes.");
        }

        if (msg.includes('SAFETY')) {
            throw new Error("⚠️ **Safety Block**: The AI flagged this image/text as unsafe. Please try a different file.");
        }

        throw new Error(`${msg}`);
    }


}