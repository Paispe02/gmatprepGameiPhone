/* ===== GMAT Math Trainer — Math Tricks Library ===== */

const Tricks = (() => {

  const library = [
    // ── MULTIPLICATION SHORTCUTS ──
    {
      id: 'mult9',
      category: 'multiplication',
      title: 'Multiply by 9',
      rule: 'Multiply by 10, then subtract the original number.',
      example: '7 × 9 = 7 × 10 − 7 = 70 − 7 = 63',
      when: 'Any number × 9',
    },
    {
      id: 'mult11',
      category: 'multiplication',
      title: 'Multiply a 2-digit number by 11',
      rule: 'Add the two digits and place the sum between them. If the sum ≥ 10, carry the 1.',
      example: '34 × 11 → 3_(3+4)_4 = 374 · 86 × 11 → 8_(8+6)_6 = 8_14_6 → carry → 946',
      when: 'Two-digit × 11',
    },
    {
      id: 'mult5',
      category: 'multiplication',
      title: 'Multiply by 5',
      rule: 'Divide the number by 2, then multiply by 10 (or append a 0).',
      example: '48 × 5 = 48 ÷ 2 × 10 = 24 × 10 = 240',
      when: 'Any number × 5',
    },
    {
      id: 'mult25',
      category: 'multiplication',
      title: 'Multiply by 25',
      rule: 'Divide by 4, then multiply by 100.',
      example: '36 × 25 = 36 ÷ 4 × 100 = 9 × 100 = 900',
      when: 'Any number × 25',
    },
    {
      id: 'mult4',
      category: 'multiplication',
      title: 'Multiply by 4',
      rule: 'Double the number twice.',
      example: '13 × 4 = 13 × 2 × 2 = 26 × 2 = 52',
      when: 'Any number × 4',
    },
    {
      id: 'mult8',
      category: 'multiplication',
      title: 'Multiply by 8',
      rule: 'Double three times.',
      example: '13 × 8 = 13 × 2 × 2 × 2 = 26 → 52 → 104',
      when: 'Any number × 8',
    },
    {
      id: 'squareEnding5',
      category: 'multiplication',
      title: 'Square a number ending in 5',
      rule: 'Take the tens digit n, compute n × (n+1), then append 25.',
      example: '35² → 3 × 4 = 12 → 1225 · 75² → 7 × 8 = 56 → 5625',
      when: 'Squaring numbers ending in 5',
    },
    {
      id: 'diffOfSquares',
      category: 'multiplication',
      title: 'Difference of Squares',
      rule: 'a² − b² = (a+b)(a−b). Use this to factor or multiply numbers near a round number.',
      example: '47 × 53 = (50−3)(50+3) = 50² − 3² = 2500 − 9 = 2491',
      when: 'Two numbers equidistant from a round number',
    },
    {
      id: 'nearBase',
      category: 'multiplication',
      title: 'Multiply numbers near 100',
      rule: 'Find deficits from 100. Cross-subtract, then multiply deficits. Combine.',
      example: '97 × 96 → deficits: 3, 4. 97−4 = 93. 3×4 = 12. Answer: 9312',
      when: 'Both numbers close to 100',
    },
    {
      id: 'breakApart',
      category: 'multiplication',
      title: 'Break Apart (Distributive)',
      rule: 'Split one factor into convenient parts: a × b = a × (c + d) = ac + ad.',
      example: '14 × 7 = 10×7 + 4×7 = 70 + 28 = 98',
      when: 'General mental multiplication',
    },

    // ── DIVISION SHORTCUTS ──
    {
      id: 'div4',
      category: 'arithmetic',
      title: 'Divide by 4',
      rule: 'Halve the number, then halve again.',
      example: '348 ÷ 4 = 174 ÷ 2 = 87',
      when: 'Dividing by 4',
    },
    {
      id: 'div5',
      category: 'arithmetic',
      title: 'Divide by 5',
      rule: 'Multiply by 2, then divide by 10.',
      example: '135 ÷ 5 = 270 ÷ 10 = 27',
      when: 'Dividing by 5',
    },
    {
      id: 'div8',
      category: 'arithmetic',
      title: 'Divide by 8',
      rule: 'Halve three times.',
      example: '256 ÷ 8 = 128 → 64 → 32',
      when: 'Dividing by 8',
    },
    {
      id: 'div25',
      category: 'arithmetic',
      title: 'Divide by 25',
      rule: 'Multiply by 4, then divide by 100.',
      example: '375 ÷ 25 = 1500 ÷ 100 = 15',
      when: 'Dividing by 25',
    },

    // ── ADDITION / SUBTRACTION ──
    {
      id: 'addRound',
      category: 'arithmetic',
      title: 'Add by Rounding',
      rule: 'Round one number to the nearest ten, add, then adjust.',
      example: '67 + 28 = 67 + 30 − 2 = 97 − 2 = 95',
      when: 'Adding numbers near a round number',
    },
    {
      id: 'subComplement',
      category: 'arithmetic',
      title: 'Subtract Using Complement',
      rule: 'Subtract from the next round number, then adjust.',
      example: '1000 − 683 = 1000 − 700 + 17 = 317',
      when: 'Subtracting from a round number',
    },

    // ── PERCENTAGES & FRACTIONS ──
    {
      id: 'pctSwap',
      category: 'percentages',
      title: 'x% of y = y% of x',
      rule: 'If one direction is easier, swap them.',
      example: '17% of 50 = 50% of 17 = 8.5',
      when: 'One of the two numbers makes an easier percentage',
    },
    {
      id: 'pct10',
      category: 'percentages',
      title: '10% Shortcut',
      rule: 'Move the decimal one place left. Build other percentages from 10%.',
      example: '10% of 450 = 45 → 5% = 22.5 → 15% = 45 + 22.5 = 67.5',
      when: 'Any percentage calculation',
    },
    {
      id: 'pct1',
      category: 'percentages',
      title: '1% Shortcut',
      rule: 'Move the decimal two places left. Scale up for any small percentage.',
      example: '3% of 800 = 8 × 3 = 24',
      when: 'Small percentages',
    },
    {
      id: 'pctChange',
      category: 'percentages',
      title: 'Percentage Change',
      rule: 'Change ÷ Original × 100. For increase: (New−Old)/Old × 100.',
      example: '40 → 50: change = 10, 10/40 × 100 = 25% increase',
      when: 'Finding % increase or decrease',
    },
    {
      id: 'pctReverse',
      category: 'percentages',
      title: 'Reverse Percentage',
      rule: 'If result after X% increase is R, then original = R ÷ (1 + X/100).',
      example: 'After 20% increase, price is $60 → original = 60 ÷ 1.2 = $50',
      when: 'Finding original value before percentage change',
    },
    {
      id: 'fractionTable',
      category: 'percentages',
      title: 'Common Fraction ↔ Percentage Table',
      rule: 'Memorize these: 1/2=50%, 1/3≈33.3%, 1/4=25%, 1/5=20%, 1/6≈16.7%, 1/7≈14.3%, 1/8=12.5%, 1/9≈11.1%, 1/10=10%, 1/12≈8.3%, 2/3≈66.7%, 3/4=75%, 3/8=37.5%, 5/8=62.5%, 7/8=87.5%',
      example: 'What is 12.5% of 80? → 1/8 of 80 = 10',
      when: 'Quick fraction/percentage conversions',
    },
    {
      id: 'ratioUnits',
      category: 'percentages',
      title: 'Ratio to Units',
      rule: 'If ratio is a:b and total is T, then parts = a+b, each unit = T/(a+b).',
      example: 'Ratio 3:5, total 40 → unit = 40/8 = 5 → parts are 15 and 25',
      when: 'Dividing a total in a given ratio',
    },

    // ── FINANCIAL ──
    {
      id: 'simpleInterest',
      category: 'percentages',
      title: 'Simple Interest Formula',
      rule: 'I = P × r × t (Principal × rate × time in years).',
      example: '$5000 at 4% for 3 years: I = 5000 × 0.04 × 3 = $600',
      when: 'Simple interest problems',
    },
    {
      id: 'compoundInterest',
      category: 'percentages',
      title: 'Compound Interest (Quick Estimate)',
      rule: 'A = P(1 + r)^t. For quick estimate: after t years at r%, total ≈ P × (1+r)^t. Use repeated multiplication for small t.',
      example: '$1000 at 10% for 3 years: 1000 → 1100 → 1210 → 1331',
      when: 'Compound interest problems',
    },
    {
      id: 'profitLoss',
      category: 'percentages',
      title: 'Profit & Loss',
      rule: 'Profit% = (Selling − Cost)/Cost × 100. Loss% = (Cost − Selling)/Cost × 100.',
      example: 'Cost $80, Sell $100 → Profit = 20/80 × 100 = 25%',
      when: 'Profit/loss calculations',
    },
    {
      id: 'discount',
      category: 'percentages',
      title: 'Successive Discounts',
      rule: 'Two discounts of a% and b% are NOT (a+b)%. Multiply: (1−a/100)(1−b/100).',
      example: '20% then 10% off $100: 100 × 0.8 × 0.9 = $72 (not $70)',
      when: 'Multiple discounts applied',
    },

    // ── WORD PROBLEM STRATEGIES ──
    {
      id: 'workRate',
      category: 'wordProblems',
      title: 'Work Rate Problems',
      rule: 'If A does job in a hours and B in b hours, together: 1/a + 1/b = 1/t → t = ab/(a+b).',
      example: 'A: 6 hours, B: 3 hours → together: 6×3/(6+3) = 18/9 = 2 hours',
      when: 'Combined work rate problems',
    },
    {
      id: 'distRateTime',
      category: 'wordProblems',
      title: 'Distance = Rate × Time',
      rule: 'd = r × t. When two objects: same direction → subtract speeds; opposite → add speeds.',
      example: 'Car A at 60mph, Car B at 40mph same direction: closing speed = 20mph',
      when: 'Distance/speed/time problems',
    },
    {
      id: 'mixture',
      category: 'wordProblems',
      title: 'Mixture / Alligation',
      rule: 'Use weighted average or the alligation cross method: cheaper–mean / mean–dearer = ratio of dearer to cheaper.',
      example: 'Mix $3/lb and $5/lb to get $3.50/lb → ratio dearer:cheaper = (3.50−3):(5−3.50) = 0.5:1.5 = 1:3',
      when: 'Mixing two concentrations or prices',
    },
    {
      id: 'avgSpeed',
      category: 'wordProblems',
      title: 'Average Speed (Two Legs)',
      rule: 'Average speed ≠ mean of speeds. Use: 2 × s1 × s2 / (s1 + s2) for equal distances.',
      example: '60 mph going, 40 mph return → avg = 2×60×40/(60+40) = 4800/100 = 48 mph',
      when: 'Average speed over a round trip',
    },

    // ── BRAIN TEASER STRATEGIES ──
    {
      id: 'balanceScale',
      category: 'brainTeasers',
      title: 'Balance Scale Strategy',
      rule: 'Divide into 3 equal groups. Weigh 2 groups: if balanced, odd item is in the 3rd group. Repeat recursively.',
      example: '9 coins, 1 heavier: split 3-3-3. Weigh first two groups. The heavier group (or remaining) has the coin. Split that group 1-1-1. 2 weighings total.',
      when: 'Find odd item with minimum weighings',
    },
    {
      id: 'pigeonhole',
      category: 'brainTeasers',
      title: 'Pigeonhole Principle',
      rule: 'If n items go into m containers and n > m, at least one container has ≥ 2 items.',
      example: 'In a group of 13 people, at least 2 share a birth month (13 people, 12 months).',
      when: 'Proving something must be true',
    },
    {
      id: 'workBackward',
      category: 'brainTeasers',
      title: 'Work Backward',
      rule: 'Start from the answer/end state and reverse each step.',
      example: 'After doubling and subtracting 10 three times, result is 10. Work back: (10+10)/2 = 10 → (10+10)/2 = 10 → (10+10)/2 = 10. Start = 10.',
      when: 'Multi-step transformation puzzles',
    },
    {
      id: 'invariant',
      category: 'brainTeasers',
      title: 'Invariant / Parity',
      rule: 'Find a quantity that never changes (or only changes in a predictable way) regardless of actions taken.',
      example: 'Chessboard with opposite corners removed: can you tile with dominoes? Each domino covers 1 black + 1 white. Removed corners are same color → impossible.',
      when: 'Impossibility proofs or strategy puzzles',
    },
  ];

  /** Get all tricks */
  function getAll() { return library; }

  /** Get tricks by category */
  function getByCategory(cat) { return library.filter(t => t.category === cat); }

  /** Get a specific trick by id */
  function getById(id) { return library.find(t => t.id === id); }

  /** Get relevant tricks for a question type */
  function getRelevant(module, questionMeta) {
    const byCategory = getByCategory(module);
    if (!questionMeta) return byCategory;

    // Try to find the most specific trick
    const specific = [];
    if (module === 'multiplication') {
      const { a, b } = questionMeta;
      if (a === 9 || b === 9) specific.push(getById('mult9'));
      if (a === 11 || b === 11) specific.push(getById('mult11'));
      if (a === 5 || b === 5) specific.push(getById('mult5'));
      if (a === 25 || b === 25) specific.push(getById('mult25'));
      if (a === 4 || b === 4) specific.push(getById('mult4'));
      if (a === 8 || b === 8) specific.push(getById('mult8'));
      if (a === b && a % 10 === 5) specific.push(getById('squareEnding5'));
      if (specific.length === 0) specific.push(getById('breakApart'));
    }
    if (module === 'arithmetic') {
      const { op, a, b } = questionMeta;
      if (op === '÷' && b === 4) specific.push(getById('div4'));
      if (op === '÷' && b === 5) specific.push(getById('div5'));
      if (op === '÷' && b === 8) specific.push(getById('div8'));
      if (op === '÷' && b === 25) specific.push(getById('div25'));
      if (op === '+') specific.push(getById('addRound'));
      if (op === '−') specific.push(getById('subComplement'));
    }
    if (module === 'percentages') {
      const { subtype } = questionMeta;
      if (subtype === 'pctOf') specific.push(getById('pctSwap'), getById('pct10'));
      if (subtype === 'pctChange') specific.push(getById('pctChange'));
      if (subtype === 'fracToPct' || subtype === 'pctToFrac') specific.push(getById('fractionTable'));
      if (subtype === 'ratio') specific.push(getById('ratioUnits'));
      if (subtype === 'simpleInterest') specific.push(getById('simpleInterest'));
      if (subtype === 'compoundInterest') specific.push(getById('compoundInterest'));
      if (subtype === 'profitLoss') specific.push(getById('profitLoss'));
      if (subtype === 'discount') specific.push(getById('discount'));
      if (subtype === 'reverse') specific.push(getById('pctReverse'));
    }
    return specific.filter(Boolean);
  }

  return { getAll, getByCategory, getById, getRelevant };
})();
