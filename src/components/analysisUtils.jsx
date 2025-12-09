export const calculateStatus = (value, min, max, tolerancePercent = 10) => {
    if (value === null || value === undefined || value === '') return 'neutral';
    const val = parseFloat(value);
    if (isNaN(val)) return 'neutral';

    // Determine tolerance range
    // Logic: 
    // Green: [min + tol, max - tol]
    // Yellow: [min, min + tol) OR (max - tol, max]
    // Red: < min OR > max
    
    // Wait, the prompt says:
    // Green: [min, max]
    // Yellow: "close to limits" (e.g. 10% distance). 
    // This implies Yellow is INSIDE the accepted range but close to edge, OR slightly OUTSIDE?
    // Usually "Warning" (Yellow) is when you are approaching the limit but still safe, OR slightly off.
    // Prompt says: "Amarelo: valor medido próximo dos limites". 
    // Red: "Abaixo do minimo ou acima do maximo".
    // So RED is strictly OUTSIDE [min, max].
    // So YELLOW must be INSIDE [min, max] but close to edges.
    
    if (val < min || val > max) return 'red';

    const range = max - min;
    const safetyMargin = range * (tolerancePercent / 100); // e.g. 10% of the total range

    // If value is within the bottom 10% of the range or top 10% of the range
    if ((val - min) <= safetyMargin || (max - val) <= safetyMargin) {
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