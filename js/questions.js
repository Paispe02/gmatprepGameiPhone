/* ===== GMAT Math Trainer — Question Generators & Data Loader ===== */
/*
 * Data architecture:
 *   data/word-problems/<cat>.json  → source of truth (easy to edit/add)
 *   data/brain-teasers/<cat>.json  → source of truth (easy to edit/add)
 *   js/questions-data.js          → auto-generated bundle (DO NOT EDIT)
 *
 * To add questions: edit the JSON files, then run:  python3 tools/build_data.py
 * Or just double-click the launcher which rebuilds automatically.
 */

const Questions = (() => {

  // ── HELPERS ──
  function rand(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
  function shuffle(arr) { const a = [...arr]; for (let i = a.length - 1; i > 0; i--) { const j = rand(0, i); [a[i], a[j]] = [a[j], a[i]]; } return a; }
  function round2(n) { return Math.round(n * 100) / 100; }
  function gcd(a, b) { return b === 0 ? a : gcd(b, a % b); }

  function generateDistractors(correct, count = 3, spread = null) {
    const s = spread || Math.max(Math.abs(correct) * 0.3, 3);
    const set = new Set(); set.add(correct);
    let attempts = 0;
    while (set.size < count + 1 && attempts < 100) {
      let d = correct + rand(-Math.ceil(s), Math.ceil(s));
      if (d !== correct && !set.has(d)) set.add(d);
      attempts++;
    }
    let fill = 1;
    while (set.size < count + 1) { set.add(correct + fill); fill++; }
    return shuffle([...set].filter(v => v !== correct)).slice(0, count);
  }

  // ──────────────────────────────────────────
  // MODULE 1: MULTIPLICATION TABLES (dynamic)
  // ──────────────────────────────────────────
  function generateMultiplication(tables = [2,3,4,5,6,7,8,9,10,11,12]) {
    const a = tables[rand(0, tables.length - 1)];
    const b = rand(2, 12);
    const answer = a * b;
    let explanation = `${a} × ${b} = ${answer}`;
    if (b === 9 || a === 9) { const o = a===9?b:a; explanation += `\n\nTrick (×9): ${o}×10=${o*10}, −${o} = ${answer}`; }
    if (b === 11 || a === 11) { const o = a===11?b:a; if(o>=10&&o<=99){const d1=Math.floor(o/10),d2=o%10,s=d1+d2; explanation += s<10?`\n\nTrick (×11): ${d1}_${s}_${d2}`:`\n\nTrick (×11): carry → ${d1+1}_${s-10}_${d2}`;} }
    if (b === 5 || a === 5) { const o=a===5?b:a; explanation += `\n\nTrick (×5): ${o}÷2=${o/2}, ×10=${answer}`; }
    if (b === 4 || a === 4) { const o=a===4?b:a; explanation += `\n\nTrick (×4): Double twice: ${o}→${o*2}→${answer}`; }
    if (b === 8 || a === 8) { const o=a===8?b:a; explanation += `\n\nTrick (×8): Triple-double: ${o}→${o*2}→${o*4}→${answer}`; }
    let row = `\n\nFull table of ${a}:`;
    for (let i = 1; i <= 12; i++) row += `\n  ${a} × ${i} = ${a*i}`;
    return { text: `${a} × ${b}`, type:'input', correctAnswer:answer, explanation:explanation+row, meta:{a,b,module:'multiplication'} };
  }

  // ──────────────────────────────────────────
  // MODULE 2: MENTAL ARITHMETIC (dynamic)
  // ──────────────────────────────────────────
  const OPS = ['+','−','×','÷'];
  function generateArithmetic(difficulty='easy') {
    const op = OPS[rand(0,3)];
    let a, b, answer, explanation;
    if (difficulty==='easy') { switch(op){case'+':a=rand(10,99);b=rand(10,99);break;case'−':a=rand(20,99);b=rand(10,a);break;case'×':a=rand(2,12);b=rand(2,12);break;case'÷':b=rand(2,12);answer=rand(2,12);a=b*answer;break;} }
    else if (difficulty==='medium') { switch(op){case'+':a=rand(100,999);b=rand(100,999);break;case'−':a=rand(200,999);b=rand(100,a);break;case'×':a=rand(10,99);b=rand(3,15);break;case'÷':b=rand(3,15);answer=rand(10,99);a=b*answer;break;} }
    else { switch(op){case'+':a=rand(1000,9999);b=rand(1000,9999);break;case'−':a=rand(2000,9999);b=rand(1000,a);break;case'×':a=rand(10,99);b=rand(10,99);break;case'÷':b=rand(5,25);answer=rand(10,99);a=b*answer;break;} }
    if (op!=='÷') { switch(op){case'+':answer=a+b;break;case'−':answer=a-b;break;case'×':answer=a*b;break;} }
    explanation = `${a} ${op} ${b} = ${answer}`;
    if (op==='+') { const r=Math.round(a/10)*10,d=a-r; explanation += `\n\nRound ${a}→${r}: ${r}+${b}=${r+b}, adjust ${d>0?'+':''}${d} = ${answer}`; }
    if (op==='−') { const r=Math.round(b/10)*10,d=b-r; explanation += `\n\nRound ${b}→${r}: ${a}−${r}=${a-r}, adjust ${d>0?'−':'+'}${Math.abs(d)} = ${answer}`; }
    if (op==='×') { const t=Math.floor(b/10)*10,u=b%10; if(t>0&&u>0) explanation += `\n\nBreak: ${a}×${t}+${a}×${u}=${a*t}+${a*u}=${answer}`; }
    if (op==='÷') { explanation += `\n\nCheck: ${b}×${answer}=${a} ✓`; if(b===4) explanation+=`\n\nHalve twice: ${a}→${a/2}→${answer}`; if(b===5) explanation+=`\n\n×2÷10: ${a*2}÷10=${answer}`; if(b===8) explanation+=`\n\nHalve ×3: ${a}→${a/2}→${a/4}→${answer}`; }
    return { text:`${a} ${op} ${b}`, type:'input', correctAnswer:answer, explanation, meta:{a,b,op,module:'arithmetic',difficulty} };
  }

  // ──────────────────────────────────────────
  // MODULE 3: PERCENTAGES & RATIOS (dynamic)
  // ──────────────────────────────────────────
  const FRACS = [
    {n:1,d:2,pct:50},{n:1,d:3,pct:33.33},{n:2,d:3,pct:66.67},{n:1,d:4,pct:25},{n:3,d:4,pct:75},
    {n:1,d:5,pct:20},{n:2,d:5,pct:40},{n:3,d:5,pct:60},{n:4,d:5,pct:80},{n:1,d:6,pct:16.67},
    {n:5,d:6,pct:83.33},{n:1,d:7,pct:14.29},{n:1,d:8,pct:12.5},{n:3,d:8,pct:37.5},
    {n:5,d:8,pct:62.5},{n:7,d:8,pct:87.5},{n:1,d:9,pct:11.11},{n:1,d:10,pct:10},
    {n:1,d:12,pct:8.33},{n:1,d:20,pct:5},
  ];

  function generatePercentage(difficulty='easy') {
    const subs = difficulty==='easy' ? ['fracToPct','pctOf','pctOf']
      : difficulty==='medium' ? ['fracToPct','pctToFrac','pctOf','pctChange','ratio','discount']
      : ['pctChange','reverse','simpleInterest','compoundInterest','profitLoss','discount','ratio'];
    const sub = subs[rand(0,subs.length-1)];
    let text, answer, explanation;
    const meta = {module:'percentages',subtype:sub,difficulty};

    switch(sub) {
      case 'fracToPct': { const f=FRACS[rand(0,FRACS.length-1)]; text=`Convert ${f.n}/${f.d} to a percentage`; answer=f.pct; explanation=`${f.n}/${f.d} = ${round2(f.n/f.d)} = ${f.pct}%\n\nMemorize: ${f.n}/${f.d} = ${f.pct}%`; break; }
      case 'pctToFrac': { const f=FRACS[rand(0,FRACS.length-1)]; text=`Convert ${f.pct}% to a simplified fraction (enter as n/d)`; answer=`${f.n}/${f.d}`; explanation=`${f.pct}% = ${f.pct}/100 = ${f.n}/${f.d}`; return {text,type:'input',correctAnswer:answer,explanation,meta}; }
      case 'pctOf': { const ps=difficulty==='easy'?[10,20,25,50]:[5,8,12,15,17,20,25,30,33,40,60,75]; const p=ps[rand(0,ps.length-1)]; const base=[40,50,60,80,100,120,150,200,250,300,400,500,800][rand(0,12)]; text=`What is ${p}% of ${base}?`; answer=round2(p*base/100); const t=base/10; explanation=`${p}% of ${base} = ${answer}\n\n10% of ${base} = ${t}.`; if(p===5) explanation+=` 5%=half=${t/2}`; else if(p===25) explanation+=` 25%=÷4=${answer}`; else if(p===50) explanation+=` 50%=÷2=${answer}`; else explanation+=` ${p}%=${p/10}×10%=${answer}`; explanation+=`\n\nSwap trick: ${p}% of ${base} = ${base}% of ${p}`; break; }
      case 'pctChange': { const orig=[40,50,60,75,80,100,120,150,200,250][rand(0,9)]; const inc=rand(0,1)===1; const cp=[10,15,20,25,30,40,50][rand(0,6)]; const ca=round2(orig*cp/100); const nv=inc?orig+ca:orig-ca; text=`Value goes from ${orig} to ${nv}. Percentage ${inc?'increase':'decrease'}?`; answer=cp; explanation=`Change=${ca}. %=(${ca}÷${orig})×100=${cp}%`; break; }
      case 'reverse': { const ov=[50,60,80,100,120,150,200][rand(0,6)]; const pu=[10,15,20,25,30][rand(0,4)]; const af=round2(ov*(1+pu/100)); text=`After ${pu}% increase, value is ${af}. Original?`; answer=ov; explanation=`X×${1+pu/100}=${af} → X=${af}÷${1+pu/100}=${ov}\n\nDon't subtract ${pu}% from ${af}! Divide by ${1+pu/100}.`; break; }
      case 'simpleInterest': { const P=[1000,2000,5000,8000,10000][rand(0,4)]; const r=[3,4,5,6,8,10][rand(0,5)]; const t=rand(2,5); answer=round2(P*r*t/100); text=`Simple interest on $${P.toLocaleString()} at ${r}%/yr for ${t} years?`; explanation=`I=P×r×t=${P}×${r/100}×${t}=$${answer}`; break; }
      case 'compoundInterest': { const P=[1000,2000,5000][rand(0,2)]; const r=[5,10,20][rand(0,2)]; const t=rand(2,3); let A=P; let s=`$${P}`; for(let y=0;y<t;y++){A=round2(A*(1+r/100));s+=` → $${A}`;} answer=round2(A-P); text=`Compound interest on $${P.toLocaleString()} at ${r}%/yr for ${t} years?`; explanation=`A=P(1+r)^t=${P}(${1+r/100})^${t}=$${round2(A)}\nCI=$${round2(A)}-$${P}=$${answer}\n\n${s}`; break; }
      case 'profitLoss': { const c=[40,50,60,80,100,120,150,200][rand(0,7)]; const m=[10,15,20,25,30,40,50][rand(0,6)]; const sp=round2(c*(1+m/100)); text=`Cost $${c}, Sell $${sp}. Profit %?`; answer=m; explanation=`Profit=$${round2(sp-c)}. %=(${round2(sp-c)}÷${c})×100=${m}%\n\nProfit% always based on COST.`; break; }
      case 'discount': { const pr=[50,80,100,120,150,200,250][rand(0,6)]; const d1=[10,15,20,25,30][rand(0,4)]; const d2=[5,10,15,20][rand(0,3)]; const a1=round2(pr*(1-d1/100)); const fin=round2(a1*(1-d2/100)); text=`Price $${pr}. Discounts: ${d1}% then ${d2}%. Final price?`; answer=fin; explanation=`After ${d1}%: $${a1}. After ${d2}%: $${fin}\n\n⚠️ NOT ${d1+d2}%! Effective: ${round2((1-(1-d1/100)*(1-d2/100))*100)}%`; break; }
      case 'ratio': { const a=rand(2,7),b=rand(2,7); const tot=(a+b)*rand(3,10); const pA=tot*a/(a+b); text=`Divide ${tot} in ratio ${a}:${b}. Larger part?`; answer=Math.max(pA,tot-pA); explanation=`Parts=${a+b}. Unit=${tot/(a+b)}. Larger=${answer}`; break; }
    }
    return {text,type:'input',correctAnswer:answer,explanation,meta};
  }

  // ──────────────────────────────────────────
  // DATA BANKS (loaded from questions-data.js bundle)
  // ──────────────────────────────────────────
  const WORD_PROBLEMS = (typeof QUESTIONS_DATA !== 'undefined' && QUESTIONS_DATA.wordProblems) || [];
  const BRAIN_TEASERS = (typeof QUESTIONS_DATA !== 'undefined' && QUESTIONS_DATA.brainTeasers) || [];
  const NUMBER_THEORY = (typeof QUESTIONS_DATA !== 'undefined' && QUESTIONS_DATA.numberTheory) || [];
  const ESTIMATION = (typeof QUESTIONS_DATA !== 'undefined' && QUESTIONS_DATA.estimation) || [];
  const DATA_SUFFICIENCY = (typeof QUESTIONS_DATA !== 'undefined' && QUESTIONS_DATA.dataSufficiency) || [];
  const ERROR_DETECTION = (typeof QUESTIONS_DATA !== 'undefined' && QUESTIONS_DATA.errorDetection) || [];
  const FAST_QUANT = (typeof QUESTIONS_DATA !== 'undefined' && QUESTIONS_DATA.fastQuant) || [];
  const QUANT_STRATEGY = (typeof QUESTIONS_DATA !== 'undefined' && QUESTIONS_DATA.quantStrategy) || [];
  const CONSTRAINT_DEDUCTION = (typeof QUESTIONS_DATA !== 'undefined' && QUESTIONS_DATA.constraintDeduction) || [];
  const MIM_QUANT = (typeof QUESTIONS_DATA !== 'undefined' && QUESTIONS_DATA.mimQuant) || [];
  const DATA_INSIGHTS_DATA = (typeof QUESTIONS_DATA !== 'undefined' && QUESTIONS_DATA.dataInsights) || [];
  const CRITICAL_REASONING = (typeof QUESTIONS_DATA !== 'undefined' && QUESTIONS_DATA.criticalReasoning) || [];
  const RIDDLES = (typeof QUESTIONS_DATA !== 'undefined' && QUESTIONS_DATA.riddles) || [];

  if (WORD_PROBLEMS.length === 0 && BRAIN_TEASERS.length === 0) {
    console.warn('No question data found. Run: python3 tools/build_data.py');
  } else {
    console.log(`Questions loaded: ${WORD_PROBLEMS.length} word problems, ${BRAIN_TEASERS.length} brain teasers, ${NUMBER_THEORY.length} number theory, ${ESTIMATION.length} estimation, ${DATA_SUFFICIENCY.length} data sufficiency, ${ERROR_DETECTION.length} error detection, ${FAST_QUANT.length} fast quant, ${QUANT_STRATEGY.length} quant strategy, ${CONSTRAINT_DEDUCTION.length} constraint deduction`);
  }

  // ──────────────────────────────────────────
  // SPEED RECOGNITION (procedural)
  // ──────────────────────────────────────────
  function generateSpeedRecognition(difficulty = 'easy') {
    const patterns = [];
    if (difficulty === 'easy') {
      patterns.push(
        () => { const a = rand(2,9), b = rand(2,9); return { text: `${a} × ${b}`, answer: a*b, expl: `${a}×${b}=${a*b}` }; },
        () => { const a = rand(1,9)*10, b = rand(1,9)*10; return { text: `${a} + ${b}`, answer: a+b, expl: `${a}+${b}=${a+b}` }; },
        () => { const n = rand(2,12); return { text: `${n}²`, answer: n*n, expl: `${n}²=${n*n}` }; },
        () => { const a = rand(11,99), b = 10; return { text: `${a} × ${b}`, answer: a*b, expl: `Append zero: ${a*b}` }; },
        () => { const p = [10,20,25,50][rand(0,3)], base = rand(2,20)*10; return { text: `${p}% of ${base}`, answer: p*base/100, expl: `${p}%=${p/100}, ×${base}=${p*base/100}` }; }
      );
    } else if (difficulty === 'medium') {
      patterns.push(
        () => { const a = rand(11,25), b = rand(3,9); return { text: `${a} × ${b}`, answer: a*b, expl: `${a}×${b}=${a*b}` }; },
        () => { const n = rand(11,20); return { text: `${n}²`, answer: n*n, expl: `${n}²=${n*n}` }; },
        () => { const a = rand(100,999), b = rand(100,999); return { text: `${a} + ${b}`, answer: a+b, expl: `${a}+${b}=${a+b}` }; },
        () => { const n = [4,8,9,16,25,27,32,36,49,64,81,100,121,125,144][rand(0,14)]; const r = Math.round(Math.sqrt(n)); return { text: `√${n}`, answer: r, expl: `√${n}=${r} because ${r}²=${n}` }; },
        () => { const a = rand(2,9), b = rand(2,9), c = rand(2,9); return { text: `${a} × ${b} × ${c}`, answer: a*b*c, expl: `${a}×${b}=${a*b}, ×${c}=${a*b*c}` }; }
      );
    } else {
      patterns.push(
        () => { const a = rand(12,30), b = rand(12,30); return { text: `${a} × ${b}`, answer: a*b, expl: `${a}×${b}=${a*b}` }; },
        () => { const n = rand(20,35); return { text: `${n}²`, answer: n*n, expl: `${n}²=${n*n}` }; },
        () => { const n = rand(2,10); return { text: `${n}³`, answer: n*n*n, expl: `${n}³=${n*n*n}` }; },
        () => { const a = rand(100,500), b = rand(10,99); return { text: `${a} − ${b}`, answer: a-b, expl: `${a}−${b}=${a-b}` }; },
        () => { const b = rand(3,12), ans = rand(5,25); const a = b*ans; return { text: `${a} ÷ ${b}`, answer: ans, expl: `${a}÷${b}=${ans}` }; }
      );
    }
    const gen = patterns[rand(0, patterns.length - 1)]();
    return {
      text: gen.text,
      type: 'input',
      correctAnswer: gen.answer,
      explanation: gen.expl + '\n\nSpeed Recognition: train instant recall, no calculation needed.',
      meta: { module: 'speedRecognition', difficulty }
    };
  }

  // ──────────────────────────────────────────
  // MEMORY CHUNKING (procedural)
  // ──────────────────────────────────────────
  function generateMemoryChunking(difficulty = 'easy') {
    let expression, answer, steps;
    if (difficulty === 'easy') {
      const a = rand(10,50), b = rand(10,50), op = ['+','−'][rand(0,1)];
      expression = `${a} ${op} ${b}`;
      answer = op === '+' ? a+b : a-b;
      steps = `${a} ${op} ${b} = ${answer}`;
    } else if (difficulty === 'medium') {
      const type = rand(0,2);
      if (type === 0) {
        const a = rand(10,99), b = rand(2,9), c = rand(10,50);
        expression = `${a} × ${b} + ${c}`;
        answer = a*b + c;
        steps = `${a}×${b}=${a*b}, +${c}=${answer}`;
      } else if (type === 1) {
        const a = rand(100,500), b = rand(50,200), c = rand(10,99);
        expression = `${a} + ${b} − ${c}`;
        answer = a + b - c;
        steps = `${a}+${b}=${a+b}, −${c}=${answer}`;
      } else {
        const a = rand(2,12), b = rand(2,12), c = rand(2,5);
        expression = `${a} × ${b} × ${c}`;
        answer = a*b*c;
        steps = `${a}×${b}=${a*b}, ×${c}=${answer}`;
      }
    } else {
      const type = rand(0,2);
      if (type === 0) {
        const a = rand(10,30), b = rand(10,30), c = rand(2,9), d = rand(10,50);
        expression = `(${a} + ${b}) × ${c} − ${d}`;
        answer = (a+b)*c - d;
        steps = `(${a}+${b})=${a+b}, ×${c}=${(a+b)*c}, −${d}=${answer}`;
      } else if (type === 1) {
        const a = rand(11,25), b = rand(11,25), c = rand(2,5), d = rand(2,5);
        expression = `${a} × ${b} + ${c} × ${d}`;
        answer = a*b + c*d;
        steps = `${a}×${b}=${a*b}, ${c}×${d}=${c*d}, sum=${answer}`;
      } else {
        const a = rand(2,9), b = rand(2,9), c = rand(2,9), d = rand(1,5);
        expression = `${a}² + ${b} × ${c} − ${d}`;
        answer = a*a + b*c - d;
        steps = `${a}²=${a*a}, ${b}×${c}=${b*c}, ${a*a}+${b*c}=${a*a+b*c}, −${d}=${answer}`;
      }
    }
    return {
      text: expression,
      type: 'memory',
      correctAnswer: answer,
      explanation: `Expression: ${expression}\n${steps}\n\nMemory training: chunk numbers and operations, solve step by step in your head.`,
      meta: { module: 'memoryChunking', difficulty }
    };
  }

  // ──────────────────────────────────────────
  // VISUAL-SPATIAL (procedural)
  // ──────────────────────────────────────────
  function generateVisualSpatial(difficulty = 'easy') {
    let text, answer, choices, explanation;
    if (difficulty === 'easy') {
      const type = rand(0,2);
      if (type === 0) {
        const start = rand(2,10), step = rand(2,5);
        const seq = Array.from({length:5}, (_,i) => start + step*i);
        text = `What comes next? ${seq.join(', ')}, ?`;
        answer = start + step*5;
        const distractors = generateDistractors(answer, 4);
        choices = shuffle([answer, ...distractors]).map(String);
        explanation = `Pattern: +${step} each time.\nNext: ${seq[4]}+${step}=${answer}`;
      } else if (type === 1) {
        const start = rand(2,5);
        const seq = Array.from({length:5}, (_,i) => start * Math.pow(2, i));
        text = `What comes next? ${seq.join(', ')}, ?`;
        answer = start * Math.pow(2, 5);
        const distractors = generateDistractors(answer, 4);
        choices = shuffle([answer, ...distractors]).map(String);
        explanation = `Pattern: ×2 each time.\nNext: ${seq[4]}×2=${answer}`;
      } else {
        const offset = rand(1,5);
        const seq = Array.from({length:5}, (_,i) => (i+offset)*(i+offset));
        text = `What comes next? ${seq.join(', ')}, ?`;
        answer = (5+offset)*(5+offset);
        const distractors = generateDistractors(answer, 4);
        choices = shuffle([answer, ...distractors]).map(String);
        explanation = `Pattern: perfect squares (${offset}²,${offset+1}²,...)\nNext: ${5+offset}²=${answer}`;
      }
    } else if (difficulty === 'medium') {
      const type = rand(0,2);
      if (type === 0) {
        const start = rand(2,8); const a = rand(2,4); const b = rand(1,3);
        const seq = [start];
        for(let i=0;i<5;i++) seq.push(i%2===0 ? seq[seq.length-1]*a : seq[seq.length-1]+b);
        text = `What comes next? ${seq.join(', ')}, ?`;
        answer = seq.length%2===1 ? seq[seq.length-1]*a : seq[seq.length-1]+b;
        const distractors = generateDistractors(answer, 4);
        choices = shuffle([answer, ...distractors]).map(String);
        explanation = `Pattern: alternating ×${a} then +${b}.\nNext: ${answer}`;
      } else if (type === 1) {
        const a = rand(1,5), b = rand(1,5);
        const seq = [a, b];
        for(let i=2;i<6;i++) seq.push(seq[i-1]+seq[i-2]);
        text = `What comes next? ${seq.join(', ')}, ?`;
        answer = seq[seq.length-1] + seq[seq.length-2];
        const distractors = generateDistractors(answer, 4);
        choices = shuffle([answer, ...distractors]).map(String);
        explanation = `Pattern: each number = sum of previous two.\n${seq[seq.length-2]}+${seq[seq.length-1]}=${answer}`;
      } else {
        const start = rand(1,5); const diffs = [2,3,5,8,13];
        const seq = [start];
        for(let i=0;i<5;i++) seq.push(seq[seq.length-1]+diffs[i]);
        text = `What comes next? ${seq.join(', ')}, ?`;
        answer = seq[seq.length-1] + 21;
        const distractors = generateDistractors(answer, 4);
        choices = shuffle([answer, ...distractors]).map(String);
        explanation = `Differences are Fibonacci: 2,3,5,8,13,21,...\nNext diff=21, so ${seq[seq.length-1]}+21=${answer}`;
      }
    } else {
      const type = rand(0,2);
      if (type === 0) {
        const base = rand(2,4);
        const seq = Array.from({length:5}, (_,i) => base*(i+1)*(i+1) - (i+1));
        text = `What comes next? ${seq.join(', ')}, ?`;
        answer = base*36 - 6;
        const distractors = generateDistractors(answer, 4);
        choices = shuffle([answer, ...distractors]).map(String);
        explanation = `Pattern: ${base}×n² − n for n=1,2,3,...\nNext (n=6): ${base}×36−6=${answer}`;
      } else if (type === 1) {
        const primes = [2,3,5,7,11,13,17,19,23,29,31];
        const start = rand(0,5);
        const seq = primes.slice(start, start+5);
        text = `What comes next? ${seq.join(', ')}, ?`;
        answer = primes[start+5];
        const distractors = generateDistractors(answer, 4);
        choices = shuffle([answer, ...distractors]).map(String);
        explanation = `Pattern: prime numbers.\nNext prime after ${seq[4]} is ${answer}`;
      } else {
        const base = rand(2,3);
        const seq = Array.from({length:5}, (_,i) => Math.pow(base, i+1));
        text = `What comes next? ${seq.join(', ')}, ?`;
        answer = Math.pow(base, 6);
        const distractors = generateDistractors(answer, 4);
        choices = shuffle([answer, ...distractors]).map(String);
        explanation = `Pattern: powers of ${base} (${base}¹,${base}²,...)\nNext: ${base}⁶=${answer}`;
      }
    }
    const correctIdx = choices.indexOf(String(answer));
    return {
      text,
      choices,
      correct: correctIdx,
      explanation,
      meta: { module: 'visualSpatial', difficulty }
    };
  }

  // ── PUBLIC API ──
  function getMultiplication(tables) { return generateMultiplication(tables); }
  function getArithmetic(difficulty) { return generateArithmetic(difficulty); }
  function getPercentage(difficulty) { return generatePercentage(difficulty); }

  function getWordProblem(difficulty) {
    let pool = WORD_PROBLEMS;
    if (difficulty && difficulty !== 'all') pool = pool.filter(p => p.difficulty === difficulty);
    if (pool.length === 0) return null;
    return pool[rand(0, pool.length - 1)];
  }

  function getBrainTeaser(category) {
    let pool = BRAIN_TEASERS;
    if (category && category !== 'all') pool = pool.filter(p => p.category === category);
    if (pool.length === 0) return null;
    return pool[rand(0, pool.length - 1)];
  }

  function getAllWordProblems() { return WORD_PROBLEMS; }
  function getAllBrainTeasers() { return BRAIN_TEASERS; }

  /** Get a specific question by index from the full pool */
  function getWordProblemByIndex(idx) { return WORD_PROBLEMS[idx] || null; }
  function getBrainTeaserByIndex(idx) { return BRAIN_TEASERS[idx] || null; }

  function getNumberTheory(difficulty) {
    let pool = NUMBER_THEORY;
    if (difficulty && difficulty !== 'all') pool = pool.filter(p => p.difficulty === difficulty);
    if (pool.length === 0) return null;
    return pool[rand(0, pool.length - 1)];
  }
  function getEstimation(difficulty) {
    let pool = ESTIMATION;
    if (difficulty && difficulty !== 'all') pool = pool.filter(p => p.difficulty === difficulty);
    if (pool.length === 0) return null;
    return pool[rand(0, pool.length - 1)];
  }
  function getDataSufficiency(difficulty) {
    let pool = DATA_SUFFICIENCY;
    if (difficulty && difficulty !== 'all') pool = pool.filter(p => p.difficulty === difficulty);
    if (pool.length === 0) return null;
    return pool[rand(0, pool.length - 1)];
  }
  function getErrorDetection(difficulty) {
    let pool = ERROR_DETECTION;
    if (difficulty && difficulty !== 'all') pool = pool.filter(p => p.difficulty === difficulty);
    if (pool.length === 0) return null;
    return pool[rand(0, pool.length - 1)];
  }
  function getFastQuant(difficulty) {
    let pool = FAST_QUANT;
    if (difficulty && difficulty !== 'all') pool = pool.filter(p => p.difficulty === difficulty);
    if (pool.length === 0) return null;
    return pool[rand(0, pool.length - 1)];
  }
  function getQuantStrategy(difficulty) {
    let pool = QUANT_STRATEGY;
    if (difficulty && difficulty !== 'all') pool = pool.filter(p => p.difficulty === difficulty);
    if (pool.length === 0) return null;
    return pool[rand(0, pool.length - 1)];
  }
  function getConstraintDeduction(difficulty) {
    let pool = CONSTRAINT_DEDUCTION;
    if (difficulty && difficulty !== 'all') pool = pool.filter(p => p.difficulty === difficulty);
    if (pool.length === 0) return null;
    return pool[rand(0, pool.length - 1)];
  }
  function getSpeedRecognition(difficulty) { return generateSpeedRecognition(difficulty); }
  function getMemoryChunking(difficulty) { return generateMemoryChunking(difficulty); }
  function getVisualSpatial(difficulty) { return generateVisualSpatial(difficulty); }

  function getAllNumberTheory() { return NUMBER_THEORY; }
  function getAllEstimation() { return ESTIMATION; }
  function getAllDataSufficiency() { return DATA_SUFFICIENCY; }
  function getAllErrorDetection() { return ERROR_DETECTION; }
  function getAllFastQuant() { return FAST_QUANT; }
  function getAllQuantStrategy() { return QUANT_STRATEGY; }
  function getAllConstraintDeduction() { return CONSTRAINT_DEDUCTION; }

  function getMimQuant(difficulty) {
    let pool = MIM_QUANT;
    if (difficulty && difficulty !== 'all') pool = pool.filter(p => p.difficulty === difficulty);
    if (pool.length === 0) return null;
    return pool[rand(0, pool.length - 1)];
  }
  function getDataInsights(difficulty) {
    let pool = DATA_INSIGHTS_DATA;
    if (difficulty && difficulty !== 'all') pool = pool.filter(p => p.difficulty === difficulty);
    if (pool.length === 0) return null;
    return pool[rand(0, pool.length - 1)];
  }
  function getCriticalReasoning(difficulty) {
    let pool = CRITICAL_REASONING;
    if (difficulty && difficulty !== 'all') pool = pool.filter(p => p.difficulty === difficulty);
    if (pool.length === 0) return null;
    return pool[rand(0, pool.length - 1)];
  }
  function getAllMimQuant() { return MIM_QUANT; }
  function getAllDataInsights() { return DATA_INSIGHTS_DATA; }
  function getAllCriticalReasoning() { return CRITICAL_REASONING; }
  function getAllRiddles() { return RIDDLES; }

  function getRiddles(difficulty) {
    let pool = RIDDLES;
    if (difficulty && difficulty !== 'all') pool = pool.filter(p => p.difficulty === difficulty);
    if (pool.length === 0) return null;
    return pool[rand(0, pool.length - 1)];
  }

  return {
    getMultiplication, getArithmetic, getPercentage,
    getWordProblem, getBrainTeaser,
    getAllWordProblems, getAllBrainTeasers,
    getWordProblemByIndex, getBrainTeaserByIndex,
    getNumberTheory, getEstimation, getDataSufficiency,
    getErrorDetection, getFastQuant, getQuantStrategy,
    getConstraintDeduction, getSpeedRecognition, getMemoryChunking, getVisualSpatial,
    getAllNumberTheory, getAllEstimation, getAllDataSufficiency,
    getAllErrorDetection, getAllFastQuant, getAllQuantStrategy, getAllConstraintDeduction,
    getMimQuant, getDataInsights, getCriticalReasoning, getRiddles,
    getAllMimQuant, getAllDataInsights, getAllCriticalReasoning, getAllRiddles,
  };
})();
