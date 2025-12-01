interface ParsedTransaction {
  amount: number;
  type: 'income' | 'expense' | 'transfer';
  merchant: string;
  description: string;
  source: 'sms';
  category_hint?: string;
  raw_data: {
    sms_text: string;
    source_app: string;
    parsed_at: string;
    bank_name?: string;
    reference?: string;
  };
}

const indianBankPatterns = {
  hdfc: {
    name: 'HDFC Bank',
    debit: /(?:Debit|Debited|Withdrawal).*?₹([\d,]+\.?\d*)|Account [A-Z0-9]+ debited (?:with |by )?₹([\d,]+\.?\d*)/i,
    credit: /(?:Credit|Credited|Deposit).*?₹([\d,]+\.?\d*)|Account [A-Z0-9]+ credited (?:with |by )?₹([\d,]+\.?\d*)/i,
    merchant: /(?:at|to|from)\s+([A-Za-z0-9\s&.,-]+?)(?:\s+Ref|\s+on|\s+INR|$)/i,
  },
  icici: {
    name: 'ICICI Bank',
    debit: /(?:Debit|Withdrawn|Debited).*?₹([\d,]+\.?\d*)|Acct\s+[A-Z0-9]+.*?debited.*?₹([\d,]+\.?\d*)/i,
    credit: /(?:Credit|Credited|Deposited).*?₹([\d,]+\.?\d*)|Acct\s+[A-Z0-9]+.*?credited.*?₹([\d,]+\.?\d*)/i,
    merchant: /(?:to|from|at)\s+([A-Za-z0-9\s&.,-]+?)(?:\s+Ref|\s+on|$)/i,
  },
  sbi: {
    name: 'State Bank of India',
    debit: /(?:Debited|Debit|Withdrawal).*?₹([\d,]+\.?\d*)|Account [A-Z0-9]+ debited (?:with |by )?₹([\d,]+\.?\d*)/i,
    credit: /(?:Credited|Credit|Deposit).*?₹([\d,]+\.?\d*)|Account [A-Z0-9]+ credited (?:with |by )?₹([\d,]+\.?\d*)/i,
    merchant: /(?:to|from|at)\s+([A-Za-z0-9\s&.,-]+?)(?:\s+Reference|\s+Ref|\s+on|$)/i,
  },
  axis: {
    name: 'Axis Bank',
    debit: /(?:Debited|Debit).*?₹([\d,]+\.?\d*)|Account [A-Z0-9]+ has been debited (?:with |by )?₹([\d,]+\.?\d*)/i,
    credit: /(?:Credited|Credit).*?₹([\d,]+\.?\d*)|Account [A-Z0-9]+ has been credited (?:with |by )?₹([\d,]+\.?\d*)/i,
    merchant: /(?:to|from|at)\s+([A-Za-z0-9\s&.,-]+?)(?:\s+Ref|\s+on|$)/i,
  },
  kotak: {
    name: 'Kotak Mahindra Bank',
    debit: /(?:Debited|Debit).*?₹([\d,]+\.?\d*)|Account [A-Z0-9]+ debited (?:with |by )?₹([\d,]+\.?\d*)/i,
    credit: /(?:Credited|Credit).*?₹([\d,]+\.?\d*)|Account [A-Z0-9]+ credited (?:with |by )?₹([\d,]+\.?\d*)/i,
    merchant: /(?:to|from|at)\s+([A-Za-z0-9\s&.,-]+?)(?:\s+on|$)/i,
  },
  upi: {
    name: 'UPI Transaction',
    debit: /(?:paid|sent|transferred).*?₹([\d,]+\.?\d*)/i,
    credit: /(?:received|credited).*?₹([\d,]+\.?\d*)/i,
    merchant: /to\s+([A-Za-z0-9\s&.,-]+?)(?:\s+on|\s+Ref|$)/i,
  },
};

const upiProviderPatterns = {
  phonepe: {
    debit: /PhonePe.*?(?:paid|sent|transferred).*?₹([\d,]+\.?\d*)/i,
    credit: /PhonePe.*?(?:received|credited).*?₹([\d,]+\.?\d*)/i,
    merchant: /to\s+([A-Za-z\s@.,-]+?)(?:\s+on|\s+via|$)/i,
  },
  googlepay: {
    debit: /Google Pay.*?(?:paid|sent|transferred).*?₹([\d,]+\.?\d*)/i,
    credit: /Google Pay.*?(?:received|credited).*?₹([\d,]+\.?\d*)/i,
    merchant: /to\s+([A-Za-z\s@.,-]+?)(?:\s+on|\s+via|$)/i,
  },
  paytm: {
    debit: /Paytm.*?(?:payment|transferred|paid|sent).*?₹([\d,]+\.?\d*)/i,
    credit: /Paytm.*?(?:received|credited).*?₹([\d,]+\.?\d*)/i,
    merchant: /to\s+([A-Za-z\s@.,-]+?)(?:\s+on|$)/i,
  },
  bhaalu: {
    debit: /Bharat QR.*?(?:paid|transferred).*?₹([\d,]+\.?\d*)/i,
    credit: /Bharat QR.*?(?:received|credited).*?₹([\d,]+\.?\d*)/i,
    merchant: /at\s+([A-Za-z\s&.,-]+?)(?:\s+on|$)/i,
  },
};

const categoryMappings: { [key: string]: string } = {
  atm: 'cash_withdrawal',
  groceries: 'groceries',
  fuel: 'transportation',
  petrol: 'transportation',
  uber: 'transportation',
  ola: 'transportation',
  zomato: 'food_dining',
  swiggy: 'food_dining',
  amazon: 'shopping',
  flipkart: 'shopping',
  netflix: 'entertainment',
  spotify: 'entertainment',
  gym: 'personal_care',
  hospital: 'healthcare',
  pharmacy: 'healthcare',
  electricity: 'bills',
  water: 'bills',
  internet: 'bills',
  insurance: 'insurance',
  rent: 'rent',
  salary: 'salary',
  wage: 'salary',
  freelance: 'freelance_income',
  dividend: 'investment_income',
};

function cleanAmount(amountStr: string): number {
  return parseFloat(amountStr.replace(/,/g, ''));
}

function extractFromPattern(text: string, pattern: RegExp): string | null {
  const match = text.match(pattern);
  return match ? (match[1] || match[2] || match[0]).trim() : null;
}

function detectBank(smsText: string): string | null {
  const textLower = smsText.toLowerCase();
  if (textLower.includes('hdfc')) return 'hdfc';
  if (textLower.includes('icici')) return 'icici';
  if (textLower.includes('sbi') || textLower.includes('state bank')) return 'sbi';
  if (textLower.includes('axis')) return 'axis';
  if (textLower.includes('kotak')) return 'kotak';
  return null;
}

function detectUPIProvider(smsText: string): string | null {
  const textLower = smsText.toLowerCase();
  if (textLower.includes('phonepe')) return 'phonepe';
  if (textLower.includes('google pay')) return 'googlepay';
  if (textLower.includes('paytm')) return 'paytm';
  if (textLower.includes('bharat qr') || textLower.includes('bhaalu')) return 'bhaalu';
  return null;
}

function detectCategory(merchant: string, smsText: string): string | undefined {
  const combined = (merchant + ' ' + smsText).toLowerCase();
  for (const [keyword, category] of Object.entries(categoryMappings)) {
    if (combined.includes(keyword)) {
      return category;
    }
  }
  return undefined;
}

export function parseSMSTransaction(smsText: string): ParsedTransaction | null {
  let bankName: string | null = null;
  let isDebit = false;
  let isCredit = false;
  let amountStr = '';
  let merchant = '';
  let source = 'bank';

  const upiProvider = detectUPIProvider(smsText);
  const detectedBank = detectBank(smsText);

  let patterns: any = {};

  if (upiProvider && upiProviderPatterns[upiProvider as keyof typeof upiProviderPatterns]) {
    patterns = upiProviderPatterns[upiProvider as keyof typeof upiProviderPatterns];
    source = upiProvider;
  } else if (detectedBank && indianBankPatterns[detectedBank as keyof typeof indianBankPatterns]) {
    const bankPattern = indianBankPatterns[detectedBank as keyof typeof indianBankPatterns];
    patterns = bankPattern;
    bankName = bankPattern.name;
    source = detectedBank;
  } else {
    patterns = indianBankPatterns.upi;
  }

  const debitMatch = smsText.match(patterns.debit);
  const creditMatch = smsText.match(patterns.credit);

  if (debitMatch) {
    isDebit = true;
    amountStr = debitMatch[1] || debitMatch[2] || '';
  } else if (creditMatch) {
    isCredit = true;
    amountStr = creditMatch[1] || creditMatch[2] || '';
  }

  if (amountStr && (isDebit || isCredit)) {
    merchant = extractFromPattern(smsText, patterns.merchant) || source;
    const categoryHint = detectCategory(merchant, smsText);

    try {
      const amount = cleanAmount(amountStr);

      return {
        amount,
        type: isDebit ? 'expense' : 'income',
        merchant: merchant.trim(),
        description: `${bankName || source.toUpperCase()} transaction`,
        source: 'sms',
        category_hint: categoryHint,
        raw_data: {
          sms_text: smsText,
          source_app: source,
          parsed_at: new Date().toISOString(),
          bank_name: bankName || undefined,
        },
      };
    } catch (error) {
      return null;
    }
  }

  return null;
}

export function detectDuplicateTransaction(
  newTransaction: ParsedTransaction,
  existingTransactions: any[]
): boolean {
  const timeWindow = 5 * 60 * 1000;
  const now = new Date().getTime();

  return existingTransactions.some((txn) => {
    const txnTime = new Date(txn.created_at).getTime();
    const timeDiff = Math.abs(now - txnTime);

    return (
      txn.amount === newTransaction.amount &&
      txn.type === newTransaction.type &&
      txn.merchant === newTransaction.merchant &&
      timeDiff < timeWindow
    );
  });
}

export function parseMultipleSMS(smsList: string[]): ParsedTransaction[] {
  return smsList
    .map(parseSMSTransaction)
    .filter((txn): txn is ParsedTransaction => txn !== null);
}
