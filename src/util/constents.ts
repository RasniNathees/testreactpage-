import { type CountryOption, MeasurementStandard } from "@/util/types";

export const Mesurement_Standards: MeasurementStandard[] = [
    MeasurementStandard.NRM1,
    MeasurementStandard.NRM2,
    MeasurementStandard.SMM7,
    MeasurementStandard.CESMM4,
    MeasurementStandard.POMI,

];

export const COUNTRIES: CountryOption[] = [
    { code: 'LK', name: 'Sri Lanka', currency: 'LKR', currencySymbol: 'LKR' },
    { code: 'UK', name: 'United Kingdom', currency: 'GBP', currencySymbol: '£' },
    { code: 'US', name: 'United States', currency: 'USD', currencySymbol: '$' },
    { code: 'AE', name: 'United Arab Emirates', currency: 'AED', currencySymbol: 'AED' },
    { code: 'SA', name: 'Saudi Arabia', currency: 'SAR', currencySymbol: 'SAR' },
    { code: 'AU', name: 'Australia', currency: 'AUD', currencySymbol: 'A$' },
    { code: 'CA', name: 'Canada', currency: 'CAD', currencySymbol: 'C$' },
    { code: 'IN', name: 'India', currency: 'INR', currencySymbol: '₹' },
    { code: 'SG', name: 'Singapore', currency: 'SGD', currencySymbol: 'S$' },
    { code: 'ZA', name: 'South Africa', currency: 'ZAR', currencySymbol: 'R' },
    { code: 'QA', name: 'Qatar', currency: 'QAR', currencySymbol: 'QAR' },
   
];

export const sampleProjectDescription = `Project: Luxury Residential Villa (G+1) 
Total Built-up Area: Approx. 450 m²

Scope of Works:

1. Substructure
   - Excavation for strip foundations and pits: Estimated 650 m³ (Assumed normal soil).
   - Reinforced concrete for footings and ground beams: 180 m³ (C35/20).
   - Bituminous waterproofing to all substructure elements: 250 m².

2. Superstructure (Concrete & Masonry)
   - Reinforced concrete columns, beams, and slabs: 320 m³.
   - External walls (200mm insulated blockwork): 480 m².
   - Internal partition walls (100mm solid blocks): 650 m².

3. Finishes
   - Flooring (Ground Floor): Polished marble slabs (Crema Marfil): 200 m².
   - Flooring (First Floor): Engineered oak wood flooring: 180 m².
   - Flooring (Wet Areas): Non-slip ceramic tiles: 70 m².
   - Wall Finishes: 3-coat plaster + emulsion paint: 1,400 m².
   - Wall Tiling (Bathrooms/Kitchen): Ceramic glazed tiles: 240 m².
   - False Ceiling: Gypsum board with shadow gap: 380 m².

4. Doors & Windows
   - External Entrance Door (Solid Walnut, 2.4m high): 1 No.
   - Internal Flush Doors (Semi-solid, painted): 18 Nos.
   - Aluminum Sliding Windows (Double glazed, thermal break): 120 m².

5. External Works
   - Interlock paving for driveway: 150 m².
   - Boundary Wall (2m high, plastered): 60 m length.`;

export const mockBOQResponse = {
    projectSummary: {
        projectType: "Residential",
        structure: "Concrete Frame",
        floors: "G+1",
        measurementStandard: "NRM2",
        currency: "USD",
        currencySymbol: "$",
        totalEstimatedCost: 150000,
        notes: "Assumed standard finishes."
    },
    boqItems: [
        {
            tradeName: "Substructure",
            tradeTotal: 15000,
            items: [
                {
                    id: "1",
                    itemNo: "1.1",
                    description: "Excavation for foundations",
                    unit: "m3",
                    quantity: 150,
                    rateMaterial: 0,
                    rateLabor: 25,
                    totalRate: 25,
                    totalAmount: 3750,
                    remarks: "Assumed depth 1.5m"
                }
            ]
        }
    ],
    assumptions: [
        { category: "Site Condition", text: "Soil conditions assumed normal." },
        { category: "General", text: "Site is accessible." }
    ]
}

