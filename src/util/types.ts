
export enum MeasurementStandard {
  NRM1 = 'NRM1 (RICS New Rules of Measurement)',
  NRM2 = 'NRM2 (RICS New Rules of Measurement)',
  SMM7 = 'SMM7 (Standard Method of Measurement)',
  CESMM4 = 'CESMM4 (Civil Engineering)',
  POMI = 'POMI (Principles of Measurement International)',

}


export interface CountryOption{
    code: string;
    name: string;
    currency: string;
    currencySymbol: string;

}

export interface RateAnalysis {
    baseMaterial: number;
    baseLabor: number;
    plantAndEquipment: number;
    overheadAndProfit: number;
    narrative: string; // Detailed explanation of the rate analysis
}

export interface BOQItem {
    id: string;
    itemNo: string;
    description: string;
    quantity: number;
    unit: string;
    quantityFormula: string; // Formula or method used to calculate quantity

    rateMaterial: number;
    rateLabor: number;
    rateAnalysis?: RateAnalysis;

    totalRate: number; // Sum of all rates
    totalCost: number; // quantity * totalRate
    remarks?: string;
    userNotes?: string; // Additional notes added by the user
}

export interface TradeGroup{
    tradeName: string;
    items: BOQItem[];
    tradeTotal: number; // Sum of totalCost of all items in the trade

}

export interface ProjectSummary{
    projectType: string;
    structure: string;
    floor: string;
    measurementStandard: string ; 
    currency: string;
    currencySymbol: string;  
    totalEstimatedCost: number;
    notes?: string;
}

export interface Supplier{
    trade: string;
    name: string;
    phoneNumber: string;
    email: string;
    website?: string;
    location?: string;
    serviceLevel : string;
    estimatedQuote: number;
    specialization: string;
    ratings?: number; // Average rating out of 5
    typicalProjectSize?: string;
    testimonials?: string;

    
}

export interface Assumption{
 category: string;
 text: string;
}

export interface Source{
    title: string;
    uri: string;

}

export interface BOQResponse{
    projectSummary: ProjectSummary;
    boqItems: TradeGroup[];
    assumptions: Assumption[];
    recommendedSuppliers: Supplier[];
    sources?: Source[];
    isInsufficientInfo?: boolean;
    missingInfoReason?: string;
}

export interface GenerateorState{
    isLoding: boolean;
    data: BOQResponse | null;
    errror: string | null;
}