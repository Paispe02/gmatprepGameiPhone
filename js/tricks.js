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

    // ── NUMBER THEORY ──
    {
      id: 'divRules',
      category: 'numberTheory',
      title: 'Divisibility Rules',
      rule: 'By 2: last digit even. By 3: digit sum ÷3. By 4: last two digits ÷4. By 5: ends in 0/5. By 6: ÷2 and ÷3. By 8: last three digits ÷8. By 9: digit sum ÷9.',
      example: '372: sum=12 (÷3 ✓), even (÷2 ✓), so ÷6 ✓. Last two 72÷4=18 ✓ so ÷4.',
      when: 'Checking divisibility without dividing',
    },
    {
      id: 'gcdLcm',
      category: 'numberTheory',
      title: 'GCD and LCM Relationship',
      rule: 'GCD(a,b) × LCM(a,b) = a × b. Find GCD by prime factorization or Euclidean algorithm.',
      example: 'GCD(12,18)=6, LCM=12×18/6=36. Check: 12=2²×3, 18=2×3², GCD=2×3=6, LCM=2²×3²=36.',
      when: 'GCD/LCM problems',
    },
    {
      id: 'lastDigit',
      category: 'numberTheory',
      title: 'Last Digit Patterns',
      rule: 'Powers cycle: 2→2,4,8,6 (cycle 4). 3→3,9,7,1 (cycle 4). 7→7,9,3,1. Find power mod 4.',
      example: '7^23: 23 mod 4 = 3 → third in cycle (7,9,3,1) → last digit = 3.',
      when: 'Finding last digit of large powers',
    },
    {
      id: 'remainder',
      category: 'numberTheory',
      title: 'Remainder Theorem',
      rule: 'Remainder of (a×b) ÷ n = (rem_a × rem_b) mod n. Break large products into remainders.',
      example: '47×53 mod 7: 47 mod 7=5, 53 mod 7=4, 5×4=20, 20 mod 7=6.',
      when: 'Remainder problems with products',
    },

    // ── ESTIMATION ──
    {
      id: 'orderMagnitude',
      category: 'estimation',
      title: 'Order of Magnitude',
      rule: 'Round aggressively to 1 significant figure. 487×312 ≈ 500×300 = 150,000.',
      example: '789 ÷ 23 ≈ 800 ÷ 25 = 32 (actual: 34.3)',
      when: 'Quick estimation to eliminate answer choices',
    },
    {
      id: 'sqrtEstimate',
      category: 'estimation',
      title: 'Square Root Estimation',
      rule: 'Find nearest perfect square. √50 is between √49=7 and √64=8, closer to 7 → ≈ 7.1.',
      example: '√200 ≈ √196 = 14 (actual: 14.14)',
      when: 'Estimating square roots',
    },

    // ── DATA SUFFICIENCY ──
    {
      id: 'dsStrategy',
      category: 'dataSufficiency',
      title: 'DS Answer Framework',
      rule: 'A: (1) alone. B: (2) alone. C: Together but not alone. D: Each alone. E: Neither even together.',
      example: 'Test each statement independently first, then combine only if both fail alone.',
      when: 'All data sufficiency questions',
    },
    {
      id: 'dsSufficiency',
      category: 'dataSufficiency',
      title: 'Sufficiency Test',
      rule: 'A statement is sufficient if it gives ONE definite answer. If you can find two different valid answers → insufficient.',
      example: 'Is x>0? Given: x²=4. x could be 2 or -2. Two answers → insufficient.',
      when: 'Testing if a statement is sufficient',
    },

    // ── QUANT STRATEGY ──
    {
      id: 'backsolve',
      category: 'quantStrategy',
      title: 'Backsolving',
      rule: 'Plug answer choices back into the problem. Start with middle value to determine direction.',
      example: 'If 2x+5=17, choices are 4,5,6,7. Try 6: 2(6)+5=17 ✓.',
      when: 'Multiple choice with numeric answers',
    },
    {
      id: 'smartNumbers',
      category: 'quantStrategy',
      title: 'Smart Number Picking',
      rule: 'For percent/ratio/fraction problems without specific values, pick easy numbers (100 for %, LCM for ratios).',
      example: 'What % of x is y if x:y=3:5? Pick x=30, y=50. Answer: 50/30×100 = 166.7%.',
      when: 'Abstract percent or ratio problems',
    },

    // ── ERROR DETECTION ──
    {
      id: 'commonErrors',
      category: 'errorDetection',
      title: 'Common Math Errors',
      rule: 'Watch for: (a+b)²≠a²+b², √(a+b)≠√a+√b, -(x²)≠(-x)², distributing over division, sign errors.',
      example: '(3+4)²=49, NOT 9+16=25. Always check if operations distribute.',
      when: 'Spotting algebraic errors',
    },

    // ── CONSTRAINT DEDUCTION ──
    {
      id: 'eliminationLogic',
      category: 'constraintDeduction',
      title: 'Elimination Strategy',
      rule: 'Start with the most constrained element (fewest options). Then propagate constraints.',
      example: 'If only one person can go in slot 3, place them first. Then update all other constraints.',
      when: 'Logic grid and constraint problems',
    },

    // ── SPEED RECOGNITION ──
    {
      id: 'perfectSquares',
      category: 'speedRecognition',
      title: 'Memorize Perfect Squares',
      rule: '1,4,9,16,25,36,49,64,81,100,121,144,169,196,225,256,289,324,361,400.',
      example: '17²=289, 18²=324, 19²=361, 20²=400.',
      when: 'Instant square recognition up to 20²',
    },
    {
      id: 'perfectCubes',
      category: 'speedRecognition',
      title: 'Memorize Perfect Cubes',
      rule: '1,8,27,64,125,216,343,512,729,1000.',
      example: '5³=125, 6³=216, 7³=343, 8³=512.',
      when: 'Instant cube recognition up to 10³',
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
