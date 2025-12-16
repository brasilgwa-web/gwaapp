export const calculateStatus = (value, min, max, tolerancePercent = 10) => {
    if (value === null || value === undefined || value === '') return 'neutral';
    const val = parseFloat(value);
    const minVal = parseFloat(min);
    const maxVal = parseFloat(max);

    // console.log("Calc Status:", { val, minVal, maxVal, tolerancePercent }); // Debug log

    if (isNaN(val) || isNaN(minVal) || isNaN(maxVal)) return 'neutral';

    if (val < minVal || val > maxVal) return 'red';

    const range = maxVal - minVal;
    const safetyMargin = range * ((tolerancePercent || 10) / 100);

    if ((val - minVal) <= safetyMargin || (maxVal - val) <= safetyMargin) {
        return 'yellow';
    }

    return 'green';
};

export const getStatusColor = (status) => {
    switch (status) {
        case 'red': return 'bg-red-500 text-white border-red-600';
        case 'yellow': return 'bg-yellow-400 text-yellow-900 border-yellow-500';
        case 'green': return 'bg-green-500 text-white border-green-600';
        default: return 'bg-slate-100 text-slate-500 border-slate-200';
    }
};

export const getStatusIconColor = (status) => {
    switch (status) {
        case 'red': return 'text-red-500';
        case 'yellow': return 'text-yellow-500';
        case 'green': return 'text-green-500';
        default: return 'text-slate-300';
    }
}