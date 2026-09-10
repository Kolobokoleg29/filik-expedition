const compact = new Intl.NumberFormat('ru', {notation:'compact', maximumFractionDigits:1});
// Keep the complete balance in the button's accessible label and tooltip.
export const formatCoins = value => value < 10000 ? String(value) : compact.format(value);
