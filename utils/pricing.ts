import { Item } from '../types';

export interface PricingRule {
    id: string;
    district: string;       // e.g., "Siddipet" (or "ALL")
    mandal: string;         // e.g., "Husnabad" (or "ALL")
    multiplier: number;     // e.g., 1.2 (20% increase)
    seasonName?: string;    // e.g., "Kharif Harvest"
    category?: string;      // Optional: Specific to "Tractors"
    isActive: boolean;
}

export const calculateDynamicPrice = (
    basePrice: number,
    item: Item | undefined | null,
    locationDetails: { district?: string, mandal?: string, city?: string } | null,
    rules: PricingRule[]
): { finalPrice: number, isSurgeApplied: boolean, multiplier: number } => {

    // Default result
    const result = { finalPrice: basePrice, isSurgeApplied: false, multiplier: 1.0 };

    if (!item || !item.autoPriceOptimization || !locationDetails || !rules || rules.length === 0) {
        return result;
    }

    // Normalize location inputs
    const district = locationDetails.district?.trim().toLowerCase() || '';
    const mandal = locationDetails.mandal?.trim().toLowerCase() || locationDetails.city?.trim().toLowerCase() || ''; // Fallback for Mandal usually city/town

    // Filter Active Rules
    const activeRules = rules.filter(r => r.isActive);

    // Find Matching Rules
    // Priority: 1. Exact Mandal Match -> 2. Exact District Match -> 3. Global (ALL/ALL)

    let matchedRule: PricingRule | null = null;

    // 1. Try Specific Mandal Rule
    const mandalRule = activeRules.find(r =>
        r.district.toLowerCase() === district &&
        r.mandal.toLowerCase() === mandal &&
        (!r.category || r.category === item.category)
    );

    if (mandalRule) {
        matchedRule = mandalRule;
    } else {
        // 2. Try District Rule (Mandal = 'ALL')
        const districtRule = activeRules.find(r =>
            r.district.toLowerCase() === district &&
            r.mandal === 'ALL' &&
            (!r.category || r.category === item.category)
        );

        if (districtRule) {
            matchedRule = districtRule;
        } else {
            // 3. Try Global Rule
            const globalRule = activeRules.find(r =>
                r.district === 'ALL' &&
                r.mandal === 'ALL' &&
                (!r.category || r.category === item.category)
            );
            if (globalRule) matchedRule = globalRule;
        }
    }

    if (matchedRule && matchedRule.multiplier > 1.0) {
        result.multiplier = matchedRule.multiplier;
        result.finalPrice = Math.round(basePrice * matchedRule.multiplier);
        result.isSurgeApplied = true;
    }

    return result;
};
