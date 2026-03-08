/**
 * Formats a currency amount for display
 * @param {string|number} amount - The amount to format
 * @param {number} decimals - Number of decimal places to show
 * @returns {string} Formatted amount
 */
export const formatCurrency = (amount, decimals = 4) => {
  if (amount === null || amount === undefined) return '0.00';
  
  const numericAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
  
  if (isNaN(numericAmount)) return '0.00';
  
  // If amount is 0, just show 0.00
  if (numericAmount === 0) return '0.00';
  
  // Format with fixed decimals
  let formatted = numericAmount.toFixed(decimals);
  
  // Remove trailing zeros if they are not needed (optional, keeping for now)
  // formatted = parseFloat(formatted).toString(); 
  
  return formatted;
};

/**
 * Formats a crypto balance for display with fallback for small amounts
 * @param {string|number} balance - The balance to format
 * @param {string} symbol - Currency symbol
 * @returns {string} Formatted string like "1,234.56 CTC"
 */
export const formatDisplayBalance = (balance, symbol = 'CTC') => {
  const amount = typeof balance === 'string' ? parseFloat(balance) : balance;
  
  if (!amount || isNaN(amount)) return `0.00 ${symbol}`;
  
  if (amount < 0.0001 && amount > 0) {
    return `< 0.0001 ${symbol}`;
  }
  
  // Use Intl.NumberFormat for commas and better formatting
  const formatter = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 4,
  });
  
  return `${formatter.format(amount)} ${symbol}`;
};
