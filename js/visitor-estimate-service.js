(function () {
    function formatCompactNumber(value) {
        if (value >= 1000000) return (value / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
        if (value >= 1000) return (value / 1000).toFixed(1).replace(/\.0$/, '') + 'k';
        return Math.round(value).toLocaleString('en-IN');
    }

    function clamp(value, min, max) {
        return Math.min(max, Math.max(min, value));
    }

    const PROFILE_BY_CATEGORY = {
        urban: { minShare: 0.04, maxShare: 0.12, estimateLabel: 'Est. Active Now', detailLabel: 'Typical Active Footfall (est.)' },
        market: { minShare: 0.05, maxShare: 0.14, estimateLabel: 'Est. Active Now', detailLabel: 'Typical Active Footfall (est.)' },
        nightlife: { minShare: 0.06, maxShare: 0.18, estimateLabel: 'Est. Active Now', detailLabel: 'Typical Active Footfall (est.)' },
        beach: { minShare: 0.05, maxShare: 0.18, estimateLabel: 'Est. Count', detailLabel: 'Typical Visitors (est.)' },
        lake: { minShare: 0.05, maxShare: 0.16, estimateLabel: 'Est. Count', detailLabel: 'Typical Visitors (est.)' },
        dam: { minShare: 0.05, maxShare: 0.16, estimateLabel: 'Est. Count', detailLabel: 'Typical Visitors (est.)' },
        viewpoint: { minShare: 0.12, maxShare: 0.43, estimateLabel: 'Est. Count', detailLabel: 'Typical Visitors (est.)' },
        waterfall: { minShare: 0.08, maxShare: 0.24, estimateLabel: 'Est. Count', detailLabel: 'Typical Visitors (est.)' },
        garden: { minShare: 0.05, maxShare: 0.14, estimateLabel: 'Est. Count', detailLabel: 'Typical Visitors (est.)' },
        temple: { minShare: 0.08, maxShare: 0.28, estimateLabel: 'Est. Count', detailLabel: 'Typical Visitors (est.)' },
        religious: { minShare: 0.08, maxShare: 0.26, estimateLabel: 'Est. Count', detailLabel: 'Typical Visitors (est.)' },
        monument: { minShare: 0.07, maxShare: 0.22, estimateLabel: 'Est. Count', detailLabel: 'Typical Visitors (est.)' },
        fort: { minShare: 0.06, maxShare: 0.18, estimateLabel: 'Est. Count', detailLabel: 'Typical Visitors (est.)' },
        palace: { minShare: 0.06, maxShare: 0.18, estimateLabel: 'Est. Count', detailLabel: 'Typical Visitors (est.)' },
        museum: { minShare: 0.05, maxShare: 0.14, estimateLabel: 'Est. Count', detailLabel: 'Typical Visitors (est.)' },
        entertainment: { minShare: 0.06, maxShare: 0.18, estimateLabel: 'Est. Count', detailLabel: 'Typical Visitors (est.)' },
        wildlife: { minShare: 0.04, maxShare: 0.14, estimateLabel: 'Est. Count', detailLabel: 'Typical Visitors (est.)' },
        nationalpark: { minShare: 0.04, maxShare: 0.14, estimateLabel: 'Est. Count', detailLabel: 'Typical Visitors (est.)' },
        nature: { minShare: 0.04, maxShare: 0.12, estimateLabel: 'Est. Count', detailLabel: 'Typical Visitors (est.)' },
        adventure: { minShare: 0.04, maxShare: 0.14, estimateLabel: 'Est. Count', detailLabel: 'Typical Visitors (est.)' },
        cultural: { minShare: 0.05, maxShare: 0.14, estimateLabel: 'Est. Count', detailLabel: 'Typical Visitors (est.)' },
        heritage: { minShare: 0.05, maxShare: 0.14, estimateLabel: 'Est. Count', detailLabel: 'Typical Visitors (est.)' },
        default: { minShare: 0.05, maxShare: 0.15, estimateLabel: 'Est. Count', detailLabel: 'Typical Visitors (est.)' }
    };

    const VisitorEstimateService = {
        buildCurrentEstimate(destination, percentageFull) {
            const profile = PROFILE_BY_CATEGORY[destination.category] || PROFILE_BY_CATEGORY.default;
            const baseVisitors = Math.max(200, Number(destination.avgVisitors) || 5000);
            const normalizedPercent = clamp(Number(percentageFull) || 0, 0, 100);
            const concurrentShare = profile.minShare + (profile.maxShare - profile.minShare) * (normalizedPercent / 100);
            const modeledCapacity = Math.round(baseVisitors * profile.maxShare);
            const rawEstimate = Math.max(0, Math.round(baseVisitors * concurrentShare));
            const minEstimate = Math.max(0, Math.round(rawEstimate * 0.6));
            const maxEstimate = Math.max(minEstimate, Math.round(rawEstimate * 1.5));

            return {
                estimateLabel: profile.estimateLabel,
                detailLabel: profile.detailLabel,
                estimateDescription: 'Modeled from typical daily visitors and current crowd conditions.',
                currentEstimate: `${formatCompactNumber(minEstimate)} – ${formatCompactNumber(maxEstimate)}`,
                rawEstimate: { min: minEstimate, max: maxEstimate, midpoint: rawEstimate },
                concurrentShare: Math.round(concurrentShare * 1000) / 1000,
                modeledCapacity,
                percentageFull: normalizedPercent
            };
        }
    };

    if (typeof window !== 'undefined') {
        window.VisitorEstimateService = VisitorEstimateService;
    }
})();