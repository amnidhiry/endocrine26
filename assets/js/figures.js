/* ==========================================================================
   HSHD1 Endocrine Course Companion — interactive figures

   Every figure mounts into <div data-fig="name"> and is keyboard operable.
   SVGs carry <title>/<desc>, and every chart is mirrored by a real table or
   by prose, so nothing depends on seeing the graphic.

   Charts re-render with a narrower, taller geometry and larger type below
   780px, because a 700-unit-wide viewBox squeezed into a 300px phone screen
   makes 12-unit labels render at about 5px.

   Quantitative curves are deliberately drawn as *relative* shapes with
   approximate ranges — see the orientation note printed with each figure.
   ========================================================================== */
(function () {
  'use strict';

  var SVGNS = 'http://www.w3.org/2000/svg';

  function el(tag, attrs, kids) {
    var n = document.createElement(tag);
    apply(n, attrs); (kids || []).forEach(function (c) { if (c) n.appendChild(c); });
    return n;
  }
  function svg(tag, attrs, kids) {
    var n = document.createElementNS(SVGNS, tag);
    apply(n, attrs); (kids || []).forEach(function (c) { if (c) n.appendChild(c); });
    return n;
  }
  function apply(n, attrs) {
    if (!attrs) return;
    Object.keys(attrs).forEach(function (k) {
      if (k === 'text') n.textContent = attrs[k];
      else if (k === 'html') n.innerHTML = attrs[k];
      else if (attrs[k] !== null && attrs[k] !== undefined) n.setAttribute(k, attrs[k]);
    });
  }
  function path(points, attrs) {
    var a = attrs || {};
    a.d = 'M' + points.map(function (p) { return p[0].toFixed(1) + ' ' + p[1].toFixed(1); }).join(' L');
    a.fill = 'none';
    return svg('path', a);
  }

  var narrowMQ = window.matchMedia('(max-width: 780px)');
  function onWidthChange(fn) {
    if (narrowMQ.addEventListener) narrowMQ.addEventListener('change', fn);
    else if (narrowMQ.addListener) narrowMQ.addListener(fn);
  }

  /* Build an HTML legend so series names wrap and stay readable at any width. */
  function legend(items) {
    var wrap = el('ul', { class: 'legend', style: 'list-style:none' });
    items.forEach(function (it) {
      var li = el('li', { class: 'legend-item' });
      var sw = el('span', { class: 'legend-swatch', 'aria-hidden': 'true' });
      sw.style.background = 'var(--' + it.color + ')';
      if (it.dash) { sw.style.background = 'none'; sw.style.borderTop = '3px dashed var(--' + it.color + ')'; sw.style.height = '0'; }
      li.appendChild(sw);
      li.appendChild(document.createTextNode(it.label));
      wrap.appendChild(li);
    });
    return wrap;
  }

  var FIGS = {};

  /* ===================================================================== */
  /* Shared: a small multiple-choice exercise                              */
  /* ===================================================================== */
  function exercise(cfg) {
    // cfg: { host, title, options, cases:[{setup(fn), answer, why, extra}], onDraw(i) }
    var i = 0, done = false;
    var head = el('p', { class: 'figure-title', text: cfg.title });
    var stage = el('div');
    var stem = el('p', { class: 'quiz-stem' });
    var opts = el('div', { class: 'quiz-opts', role: 'group', 'aria-label': cfg.question || 'Answer choices' });
    var fb = el('div', { class: 'quiz-feedback' });
    var live = el('p', { class: 'visually-hidden', role: 'status', 'aria-live': 'polite' });
    var next = el('button', { type: 'button', class: 'btn btn-primary', text: cfg.nextLabel || 'Next →' });
    var again = el('button', { type: 'button', class: 'btn', text: '↺ Retry this one' });

    function draw(announce) {
      done = false;
      var c = cfg.cases[i];
      if (cfg.onDraw) cfg.onDraw(i, stage);
      stem.textContent = cfg.stemFor ? cfg.stemFor(c, i) : c.stem;
      opts.innerHTML = ''; fb.innerHTML = '';
      cfg.options.forEach(function (o, n) {
        var b = el('button', { type: 'button', class: 'quiz-opt' });
        b.appendChild(el('span', { class: 'opt-key', 'aria-hidden': 'true', text: 'ABCDEFGHIJ'[n] + '.' }));
        b.appendChild(el('span', { class: 'opt-text', text: o }));
        b.appendChild(el('span', { class: 'opt-mark' }));
        b.addEventListener('click', function () { pick(o); });
        opts.appendChild(b);
      });
      if (announce) { live.textContent = announce; stem.setAttribute('tabindex', '-1'); stem.focus({ preventScroll: true }); }
    }
    function pick(o) {
      if (done) return; done = true;
      var c = cfg.cases[i], ok = o === c.answer;
      Array.prototype.forEach.call(opts.children, function (b) {
        b.disabled = true;
        var t = b.querySelector('.opt-text').textContent, m = b.querySelector('.opt-mark');
        if (t === c.answer) { b.classList.add('is-correct'); m.textContent = '✓ correct'; }
        else if (t === o) { b.classList.add('is-chosen-wrong'); m.textContent = '✗ your answer'; }
      });
      fb.innerHTML = '';
      fb.appendChild(el('p', { class: 'quiz-verdict ' + (ok ? 'correct' : 'incorrect'),
        text: ok ? '✓ Correct.' : '✗ Not correct — the correct answer is marked above.' }));
      var ex = el('div', { class: 'quiz-explain' });
      if (c.label) ex.appendChild(el('h4', { text: c.label }));
      ex.appendChild(el('p', { text: c.why }));
      fb.appendChild(ex);
      if (cfg.principle) {
        var t = el('div', { class: 'quiz-takeaway' });
        t.appendChild(el('strong', { text: cfg.principleLabel || 'The principle: ' }));
        t.appendChild(document.createTextNode(cfg.principle));
        fb.appendChild(t);
      }
      live.textContent = (ok ? 'Correct. ' : 'Not correct. The correct answer is: ' + c.answer + '. ') + c.why;
    }
    next.addEventListener('click', function () { i = (i + 1) % cfg.cases.length; draw('Item ' + (i + 1) + ' of ' + cfg.cases.length + ' loaded.'); });
    again.addEventListener('click', function () { draw('Reset.'); });

    cfg.host.appendChild(head);
    cfg.host.appendChild(stage);
    cfg.host.appendChild(stem);
    cfg.host.appendChild(opts);
    cfg.host.appendChild(fb);
    cfg.host.appendChild(live);
    cfg.host.appendChild(el('div', { class: 'quiz-nav' }, [next, again]));
    draw(null);
    return { redraw: function () { if (cfg.onDraw) cfg.onDraw(i, stage); } };
  }

  /* ===================================================================== */
  /* Thyroid — localize the defect from TSH / free T4                      */
  /* ===================================================================== */
  FIGS['thyroid-localizer'] = function (host) {
    var CASES = [
      { stem: 'Labs show ↑ TSH with ↓ free T4. Where is the defect?',
        answer: 'Primary hypothyroidism', label: '↑ TSH, ↓ free T4',
        why: 'TSH moves opposite the failing hormone. The gland cannot make T4, negative feedback is lost, and TSH climbs — the Hashimoto pattern, and the pattern congenital primary hypothyroidism shows on newborn screening.' },
      { stem: 'Labs show ↓ or inappropriately normal TSH with ↓ free T4. Where is the defect?',
        answer: 'Central (secondary or tertiary) hypothyroidism', label: 'Low or normal TSH with a low free T4',
        why: 'A low T4 that fails to drive TSH up means the break is upstream — pituitary or hypothalamus. "Inappropriately normal" is the trap: a normal TSH is abnormal when free T4 is low.' },
      { stem: 'Labs show ↓ TSH with ↑ free T4 and ↑ free T3. Where is the defect?',
        answer: 'Primary hyperthyroidism', label: '↓ TSH, ↑ free T4 and T3',
        why: 'Excess hormone made by the gland appropriately suppresses TSH — Graves disease, a hyperfunctioning nodule, or a toxic multinodular goiter. The radioactive iodine uptake pattern then separates those three.' },
      { stem: 'Labs show ↑ TSH together with ↑ free T4. Where is the defect?',
        answer: 'A pituitary problem — think TSH-secreting (thyrotroph) adenoma', label: 'Both TSH and T4 elevated',
        why: 'Both elevated breaks the feedback rule, so the gland is not the driver. A thyrotroph adenoma secretes TSH autonomously; it accounts for under 1% of adenomas and is an extremely rare cause of hyperthyroidism.' },
      { stem: 'A well term newborn has a low total T4 with a normal TSH, and a normal free T4. Where is the defect?',
        answer: 'Nowhere in the axis — this is a binding-protein effect', label: 'Low total T4, normal free T4, normal TSH',
        why: 'Total T4 tracks thyroxine-binding globulin. With a normal TSH and a normal free T4 the axis is intact — the classic newborn-screen picture of TBG deficiency, which needs no treatment.' },
      { stem: 'A patient in the intensive care unit has a low T3, a normal-to-low TSH, and a normal-to-low T4. Where is the defect?',
        answer: 'Nowhere in the thyroid — nonthyroidal illness (sick euthyroid) syndrome', label: 'Abnormal numbers in a systemically ill patient',
        why: 'Systemic illness perturbs the axis and peripheral conversion without primary thyroid disease. Treat the underlying illness; re-check once the patient recovers rather than chasing the numbers.' }
    ];
    exercise({
      host: host,
      title: 'Try it — localize the defect from the pattern',
      question: 'Where is the defect?',
      nextLabel: 'Next pattern →',
      options: [
        'Primary hypothyroidism',
        'Central (secondary or tertiary) hypothyroidism',
        'Primary hyperthyroidism',
        'A pituitary problem — think TSH-secreting (thyrotroph) adenoma',
        'Nowhere in the axis — this is a binding-protein effect',
        'Nowhere in the thyroid — nonthyroidal illness (sick euthyroid) syndrome'
      ],
      cases: CASES,
      principleLabel: 'The rule underneath all six: ',
      principle: 'read TSH against free T4, not either alone. In primary disease they move in opposite directions; in central disease TSH fails to respond; when both move the same way, or when the free hormone is normal, the problem is not a failing gland.'
    });
  };

  /* ===================================================================== */
  /* Pituitary — AVP disorders and the desmopressin response               */
  /* ===================================================================== */
  FIGS['avp-desmopressin'] = function (host) {
    var TRACES = [
      { key: 'siadh', label: 'SIADH', color: 'red', dash: null,
        pre: [[-3, 700], [-1.5, 720], [0, 710]], post: [[0, 710], [1, 722], [2, 726], [3, 720]],
        note: 'The urine is already concentrated, because AVP is acting when it should not be. Desmopressin changes essentially nothing and is not a diagnostic step here — giving it would deepen the hyponatremia. It is drawn only for contrast.' },
      { key: 'avpd', label: 'AVP deficiency (central)', color: 'blue', dash: null,
        pre: [[-3, 105], [-1.5, 120], [0, 130]], post: [[0, 130], [0.75, 380], [1.5, 610], [2.25, 680], [3, 690]],
        note: 'The kidney is normal and simply starved of hormone. Supply the hormone and the collecting duct concentrates — urine osmolality climbs substantially. This is the response that confirms the deficiency is central.' },
      { key: 'avpr', label: 'AVP resistance (renal)', color: 'teal', dash: '6 4',
        pre: [[-3, 100], [-1.5, 115], [0, 125]], post: [[0, 125], [0.75, 140], [1.5, 150], [2.25, 152], [3, 150]],
        note: 'The kidney cannot respond to AVP, so supplying more of it accomplishes little. The urine stays dilute. This is the step that separates the two AVP disorders, which are otherwise clinically almost identical.' }
    ];

    var revealed = false;
    var shown = { siadh: true, avpd: true, avpr: true };

    var controls = el('div', { class: 'fig-controls' });
    var revealBtn = el('button', { type: 'button', class: 'btn btn-primary', text: 'Give desmopressin →' });
    controls.appendChild(revealBtn);
    TRACES.forEach(function (tr) {
      var b = el('button', { type: 'button', class: 'toggle-chip', 'aria-pressed': 'true' });
      b.appendChild(el('span', { class: 'chip-dot', 'aria-hidden': 'true' }));
      b.appendChild(document.createTextNode(tr.label));
      b.style.color = 'var(--' + tr.color + ')';
      b.addEventListener('click', function () {
        shown[tr.key] = !shown[tr.key];
        b.setAttribute('aria-pressed', shown[tr.key] ? 'true' : 'false');
        paint();
        status.textContent = tr.label + (shown[tr.key] ? ' shown.' : ' hidden.');
      });
      controls.appendChild(b);
    });

    var chart = svg('svg', { role: 'img', 'aria-labelledby': 'avp-t avp-d' });
    chart.appendChild(svg('title', { id: 'avp-t', text: 'Urine osmolality before and after desmopressin in three AVP disorders' }));
    chart.appendChild(svg('desc', { id: 'avp-d', text:
      'Before desmopressin, SIADH shows a concentrated urine of roughly 700 mOsm per kilogram, while both AVP deficiency and AVP resistance sit near 100 to 130 — very dilute. After desmopressin, AVP deficiency rises steeply to about 690, AVP resistance rises only slightly to about 150, and SIADH stays near 720.' }));
    var plot = svg('g'); chart.appendChild(plot);

    var status = el('p', { class: 'visually-hidden', role: 'status', 'aria-live': 'polite' });
    var notes = el('div');

    function paint() {
      var narrow = narrowMQ.matches;
      var W = narrow ? 400 : 700, H = narrow ? 330 : 320;
      var L = narrow ? 52 : 66, R = narrow ? 14 : 22, T = narrow ? 34 : 30, B = narrow ? 58 : 58;
      var fs = narrow ? 15 : 12.5, fsm = narrow ? 13.5 : 11.5;
      var x0 = L, x1 = W - R, y0 = T, y1 = H - B;
      function X(t) { return x0 + ((t + 3) / 6) * (x1 - x0); }
      function Y(o) { return y1 - (o / 1000) * (y1 - y0); }

      chart.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
      plot.innerHTML = '';

      [0, 300, 600, 900].forEach(function (o) {
        plot.appendChild(svg('line', { x1: x0, x2: x1, y1: Y(o), y2: Y(o), class: 'gridline' }));
        plot.appendChild(svg('text', { x: x0 - 6, y: Y(o) + fsm / 3, 'font-size': fsm, fill: 'var(--text3)', 'font-family': 'var(--font)', 'text-anchor': 'end', text: o }));
      });
      plot.appendChild(svg('line', { x1: x0, x2: x1, y1: y1, y2: y1, class: 'axis' }));
      plot.appendChild(svg('line', { x1: x0, x2: x0, y1: y0, y2: y1, class: 'axis' }));
      plot.appendChild(svg('text', { x: (x0 + x1) / 2, y: H - 20, 'font-size': fs, fill: 'var(--text2)', 'font-family': 'var(--font)', 'text-anchor': 'middle', text: 'Hours relative to desmopressin' }));
      plot.appendChild(svg('text', { x: 13, y: (y0 + y1) / 2, 'font-size': fs, fill: 'var(--text2)', 'font-family': 'var(--font)', 'text-anchor': 'middle', transform: 'rotate(-90 13 ' + ((y0 + y1) / 2) + ')', text: 'Urine osmolality (mOsm/kg)' }));
      (narrow ? [-3, 0, 3] : [-3, -2, -1, 0, 1, 2, 3]).forEach(function (t) {
        plot.appendChild(svg('text', { x: X(t), y: y1 + fs + 5, 'font-size': fsm, fill: 'var(--text3)', 'font-family': 'var(--font)', 'text-anchor': 'middle', text: t > 0 ? '+' + t : String(t) }));
      });

      plot.appendChild(svg('line', { x1: X(0), x2: X(0), y1: y0, y2: y1, class: 'inhibit' }));
      plot.appendChild(svg('text', { x: X(0), y: y0 - 8, 'font-size': fsm, fill: 'var(--accent)', 'font-family': 'var(--mono)', 'text-anchor': 'middle', text: 'desmopressin' }));

      TRACES.forEach(function (tr) {
        if (!shown[tr.key]) return;
        var attrs = { stroke: 'var(--' + tr.color + ')', 'stroke-width': 2.4 };
        if (tr.dash) attrs['stroke-dasharray'] = tr.dash;
        plot.appendChild(path(tr.pre.map(function (p) { return [X(p[0]), Y(p[1])]; }), Object.assign({}, attrs)));
        if (revealed) {
          plot.appendChild(path(tr.post.map(function (p) { return [X(p[0]), Y(p[1])]; }), Object.assign({}, attrs)));
        }
      });

      if (!revealed) {
        plot.appendChild(svg('text', { x: (X(0) + x1) / 2, y: (y0 + y1) / 2, 'font-size': fsm, fill: 'var(--text3)', 'font-family': 'var(--font)', 'text-anchor': 'middle', text: 'Predict, then reveal' }));
      }

      notes.innerHTML = '';
      if (revealed) {
        TRACES.forEach(function (tr) {
          if (!shown[tr.key]) return;
          var n = el('div', { class: 'note note-' + tr.color });
          n.appendChild(el('span', { class: 'note-kind', text: tr.label }));
          n.appendChild(el('p', { text: tr.note }));
          notes.appendChild(n);
        });
      }
    }

    revealBtn.addEventListener('click', function () {
      revealed = !revealed;
      revealBtn.textContent = revealed ? '↺ Hide the response' : 'Give desmopressin →';
      paint();
      status.textContent = revealed
        ? 'Revealed. After desmopressin, urine osmolality rises steeply in AVP deficiency, barely moves in AVP resistance, and stays high in SIADH.'
        : 'Response hidden. Predict each trace before revealing.';
    });
    onWidthChange(paint);

    host.appendChild(el('p', { class: 'figure-title', text: 'Urine osmolality across the desmopressin step' }));
    host.appendChild(controls);
    host.appendChild(chart);
    host.appendChild(legend(TRACES.map(function (t) { return { label: t.label, color: t.color, dash: !!t.dash }; })));
    host.appendChild(status);
    host.appendChild(notes);
    host.appendChild(el('p', { class: 'figcaption', html:
      'Original figure. The curves are <strong>illustrative</strong>: they show the direction and the relative size of each change, not values to memorize. ' +
      'The axis is anchored so that about 300 mOsm/kg is roughly plasma and higher means more concentrated; it is orientation only, not a quiz threshold. ' +
      'Desmopressin is drawn for SIADH only to contrast the physiology; it is not a diagnostic step in SIADH.' }));
    paint();
  };

  /* ===================================================================== */
  /* T1DM — classification reasoning cases                               */
  /* ===================================================================== */
  FIGS['dm-classifier'] = function (host) {
    exercise({
      host: host,
      title: 'Classification practice — weigh the features together',
      question: 'Which form of diabetes?',
      nextLabel: 'Next case →',
      options: ['T1DM', 'T2DM', 'Monogenic diabetes (MODY)', 'Neonatal diabetes', 'Cystic fibrosis–related diabetes', 'Medication-induced diabetes'],
      cases: [
        { stem: 'A 46-year-old begins high-dose glucocorticoids for an inflammatory flare and develops new hyperglycemia, most marked after meals, with no prior history of diabetes.',
          answer: 'Medication-induced diabetes', label: 'Temporal link to a drug that raises glucose',
          why: 'Glucocorticoids increase insulin resistance and drive both gluconeogenesis and glycogen breakdown. Other named causes include L-asparaginase, cyclosporine, and tacrolimus (direct beta-cell toxicity or interference with secretion), plus atypical antipsychotics and anti-seizure medications.' },
        { stem: 'A 12-year-old has three weeks of polyuria, polydipsia, and 6 kg of weight loss despite eating more. Glucose 412 mg/dL, ketones in the urine. GAD-65 and IA-2 (ICA-512) antibodies are positive; C-peptide is low.',
          answer: 'T1DM', label: 'Autoantibodies positive, C-peptide low, catabolic presentation',
          why: 'Positive islet autoantibodies with a low C-peptide in a ketosis-prone, catabolic presentation is the T1DM pattern: autoimmune beta-cell destruction producing absolute insulin deficiency. The low C-peptide is what tells you endogenous insulin production has failed rather than merely become ineffective.' },
        { stem: 'A 19-year-old has mild fasting hyperglycemia found on a routine panel: no ketosis, normal weight, no acanthosis, negative antibodies, preserved C-peptide — and a father, paternal grandmother, and sister all diagnosed with diabetes in their twenties.',
          answer: 'Monogenic diabetes (MODY)', label: 'Dominant inheritance without autoimmunity or resistance',
          why: 'A single-gene beta-cell defect inherited in a dominant pattern across three generations, appearing in adolescence or young adulthood, with neither autoimmunity nor an insulin-resistance phenotype. MODY accounts for about 1–5% of people diagnosed with diabetes — often enough to matter, and frequently mislabeled as T1DM or T2DM.' },
        { stem: 'A 17-year-old with cystic fibrosis and worsening nutritional status develops progressive hyperglycemia over several months.',
          answer: 'Cystic fibrosis–related diabetes', label: 'Diabetes secondary to pancreatic disease',
          why: 'Progressive pancreatic damage in cystic fibrosis is its own category in the standard classification, sitting alongside chronic pancreatitis and medication-induced diabetes under "other specific types." The context does the classifying here.' },
        { stem: 'A 15-year-old has a BMI at the 97th percentile, acanthosis nigricans on the neck, and a strong family history of diabetes. A1c is 7.4%. Autoantibodies are negative; C-peptide is elevated.',
          answer: 'T2DM', label: 'Insulin-resistance phenotype, antibodies negative, C-peptide high',
          why: 'Acanthosis nigricans, obesity, and family history make up the classic insulin-resistance phenotype. Negative antibodies with a raised C-peptide say endogenous insulin is present in quantity but is not working — resistance with relative, not absolute, deficiency.' },
        { stem: 'A 3-week-old infant has persistent glucose readings above 120 mg/dL, present since the first days of life and requiring insulin for the past two and a half weeks.',
          answer: 'Neonatal diabetes', label: 'Onset in the first month of life',
          why: 'Neonatal diabetes is defined by exactly this picture: glucose above 120 mg/dL, occurring in the first month of life, lasting at least two weeks, and requiring insulin. It is monogenic and may be transient or permanent. T1DM essentially does not present this early.' }
      ],
      principleLabel: 'The reasoning habit: ',
      principle: 'no single feature settles the classification. Antibodies, C-peptide, the insulin-resistance phenotype, age and context, family history, cystic fibrosis, and medication exposure are weighed together. People with T2DM can present in ketoacidosis, and people with T1DM can have obesity — so treat any one feature as evidence, never as proof.'
    });
  };

  /* ===================================================================== */
  /* Insulin — action curves                                               */
  /* ===================================================================== */
  var INSULINS = [
    { key: 'rapid', label: 'Rapid-acting', examples: 'lispro, aspart, glulisine', color: 'red', dash: null,
      onset: '~15 minutes', peak: '~1–2 hours', duration: '2–4 hours',
      pts: [[0,0],[0.25,0.08],[0.5,0.35],[1,0.85],[1.5,1.0],[2,0.85],[2.5,0.62],[3,0.38],[3.5,0.16],[4,0]] },
    { key: 'regular', label: 'Regular (short-acting)', examples: 'regular human insulin (R)', color: 'amber', dash: null,
      onset: '~30–60 minutes', peak: '~2–4 hours', duration: '6–8 hours',
      pts: [[0,0],[0.5,0.05],[1,0.28],[1.5,0.48],[2,0.66],[3,0.82],[4,0.76],[5,0.58],[6,0.36],[7,0.17],[8,0]] },
    { key: 'nph', label: 'NPH (intermediate)', examples: 'NPH (N)', color: 'purple', dash: null,
      onset: '~1–2 hours', peak: 'broad, ~4–8 hours', duration: '12–16 hours',
      pts: [[0,0],[1,0.05],[2,0.24],[3,0.44],[4,0.60],[5,0.68],[6,0.71],[7,0.70],[8,0.66],[10,0.53],[12,0.35],[14,0.18],[16,0]] },
    { key: 'long', label: 'Long-acting (basal)', examples: 'glargine, detemir', color: 'blue', dash: null,
      onset: '~1–2 hours', peak: 'relatively flat', duration: 'glargine about 24 hours; detemir about 20–24 hours and dose-dependent',
      pts: [[0,0],[1,0.14],[2,0.28],[3,0.35],[4,0.37],[6,0.38],[8,0.38],[12,0.37],[16,0.34],[20,0.27],[22,0.17],[24,0.04]] },
    { key: 'ultra', label: 'Ultra-long-acting', examples: 'degludec', color: 'teal', dash: '2 4',
      onset: '~1 hour', peak: 'essentially peakless', duration: 'beyond 24 hours, so doses carry over between days',
      pts: [[0,0],[1,0.10],[2,0.19],[4,0.26],[6,0.28],[8,0.29],[12,0.29],[16,0.29],[20,0.29],[24,0.28]] },
    { key: 'premix', label: 'Premixed', examples: '70/30, 75/25', color: 'gray', dash: '7 4',
      onset: 'two components in one injection', peak: 'an early rapid or short peak, then a later NPH peak', duration: '~10–16 hours',
      pts: [[0,0],[0.5,0.14],[1,0.34],[1.5,0.40],[2,0.38],[3,0.42],[4,0.52],[5,0.57],[6,0.57],[8,0.50],[10,0.39],[12,0.26],[14,0.14],[16,0.04],[17,0]] }
  ];

  FIGS['insulin-curves'] = function (host) {
    var on = { rapid: true, regular: false, nph: false, long: true, ultra: false, premix: false };
    var MAXT = 24;

    var controls = el('div', { class: 'fig-controls', role: 'group', 'aria-label': 'Show or hide insulin categories' });
    INSULINS.forEach(function (ins) {
      var b = el('button', { type: 'button', class: 'toggle-chip', 'aria-pressed': on[ins.key] ? 'true' : 'false' });
      b.appendChild(el('span', { class: 'chip-dot', 'aria-hidden': 'true' }));
      b.appendChild(document.createTextNode(ins.label));
      b.style.color = 'var(--' + ins.color + ')';
      b.addEventListener('click', function () {
        on[ins.key] = !on[ins.key];
        b.setAttribute('aria-pressed', on[ins.key] ? 'true' : 'false');
        paint();
        status.textContent = ins.label + (on[ins.key] ? ' shown.' : ' hidden.');
      });
      controls.appendChild(b);
    });

    var chart = svg('svg', { role: 'img', 'aria-labelledby': 'ins-t ins-d' });
    chart.appendChild(svg('title', { id: 'ins-t', text: 'Approximate insulin action curves on a shared 24-hour axis' }));
    chart.appendChild(svg('desc', { id: 'ins-d', text: 'Relative insulin action over 24 hours. Rapid-acting rises and falls within about four hours with an early sharp peak. Regular acts later and longer. NPH has a broad mid-range peak lasting most of a half-day. Long-acting and ultra-long-acting are comparatively flat and extend across the whole day. Premixed insulin shows two humps. Exact onset, peak, and duration for each are given in the table below the figure.' }));
    var plot = svg('g'); chart.appendChild(plot);
    var status = el('p', { class: 'visually-hidden', role: 'status', 'aria-live': 'polite' });

    function paint() {
      var narrow = narrowMQ.matches;
      var W = narrow ? 400 : 700, H = narrow ? 300 : 320;
      var L = narrow ? 44 : 56, R = narrow ? 14 : 20, T = narrow ? 18 : 20, B = narrow ? 56 : 56;
      var fs = narrow ? 15 : 12.5, fsm = narrow ? 13.5 : 11.5;
      var x0 = L, x1 = W - R, y0 = T, y1 = H - B;
      function X(t) { return x0 + (Math.min(t, MAXT) / MAXT) * (x1 - x0); }
      function Y(v) { return y1 - v * (y1 - y0); }

      chart.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
      plot.innerHTML = '';
      var ticks = narrow ? [0, 6, 12, 18, 24] : [0, 4, 8, 12, 16, 20, 24];
      ticks.forEach(function (t) {
        plot.appendChild(svg('line', { x1: X(t), x2: X(t), y1: y0, y2: y1, class: 'gridline' }));
        plot.appendChild(svg('text', { x: X(t), y: y1 + fs + 5, 'font-size': fsm, fill: 'var(--text3)', 'font-family': 'var(--font)', 'text-anchor': 'middle', text: t + 'h' }));
      });
      plot.appendChild(svg('line', { x1: x0, x2: x1, y1: y1, y2: y1, class: 'axis' }));
      plot.appendChild(svg('line', { x1: x0, x2: x0, y1: y0, y2: y1, class: 'axis' }));
      plot.appendChild(svg('text', { x: (x0 + x1) / 2, y: H - 18, 'font-size': fs, fill: 'var(--text2)', 'font-family': 'var(--font)', 'text-anchor': 'middle', text: 'Hours after injection' }));
      plot.appendChild(svg('text', { x: 13, y: (y0 + y1) / 2, 'font-size': fs, fill: 'var(--text2)', 'font-family': 'var(--font)', 'text-anchor': 'middle', transform: 'rotate(-90 13 ' + ((y0 + y1) / 2) + ')', text: 'Relative insulin action' }));

      var any = false;
      INSULINS.forEach(function (ins) {
        if (!on[ins.key]) return;
        any = true;
        var a = { stroke: 'var(--' + ins.color + ')', 'stroke-width': 2.4 };
        if (ins.dash) a['stroke-dasharray'] = ins.dash;
        plot.appendChild(path(ins.pts.map(function (p) { return [X(p[0]), Y(p[1])]; }), a));
      });
      if (!any) {
        plot.appendChild(svg('text', { x: (x0 + x1) / 2, y: (y0 + y1) / 2, 'font-size': fs, fill: 'var(--text3)', 'font-family': 'var(--font)', 'text-anchor': 'middle', text: 'Select a category above' }));
      }
    }
    onWidthChange(paint);

    host.appendChild(el('p', { class: 'figure-title', text: 'Insulin action curves — toggle categories to compare' }));
    host.appendChild(controls);
    host.appendChild(chart);
    host.appendChild(legend(INSULINS.map(function (i) { return { label: i.label, color: i.color, dash: !!i.dash }; })));
    host.appendChild(status);

    var wrap = el('div', { class: 'table-wrap', tabindex: '0', role: 'region', 'aria-label': 'Insulin categories as a table' });
    var tbl = el('table');
    tbl.innerHTML =
      '<caption>The same information in words. Ranges are approximate — read the note below before trusting any number here.</caption>' +
      '<thead><tr><th scope="col">Category</th><th scope="col">Examples</th><th scope="col">Onset</th><th scope="col">Peak</th><th scope="col">Duration</th></tr></thead>' +
      '<tbody>' + INSULINS.map(function (i) {
        return '<tr><th scope="row">' + i.label + '</th><td>' + i.examples + '</td><td>' + i.onset + '</td><td>' + i.peak + '</td><td>' + i.duration + '</td></tr>';
      }).join('') + '</tbody>';
    wrap.appendChild(tbl);
    host.appendChild(wrap);

    host.appendChild(el('p', { class: 'citation-line', html:
      'Ranges are approximate and vary with dose, site, and activity — reason about which insulin is acting, not exact timings. ' +
      '<cite>Thota S, Akbar A. <em>Insulin.</em> StatPearls [Internet]. Treasure Island (FL): StatPearls Publishing. <a href="https://www.ncbi.nlm.nih.gov/books/NBK560688/" target="_blank" rel="noopener noreferrer">ncbi.nlm.nih.gov/books/NBK560688</a></cite>'
    }));
    paint();
  };

  /* ===================================================================== */
  /* Insulin — educational dose calculator                                 */
  /* ===================================================================== */
  FIGS['dose-calc'] = function (host) {
    var EX = [
      { kind: 'Carbohydrate coverage', icr: 10, carbs: 60, glucose: null, target: null, cf: null,
        prompt: 'The patient in this exercise uses an insulin-to-carbohydrate ratio of 1 unit per 10 g. The meal contains 60 g of carbohydrate, and the pre-meal glucose is already in range, so no correction is needed. How many units cover the meal?' },
      { kind: 'Correction dose', icr: null, carbs: null, glucose: 260, target: 120, cf: 50,
        prompt: 'The patient corrects with 1 unit for every 50 mg/dL above a target of 120 mg/dL. The glucose reads 260 mg/dL and the patient is not eating. How many units of correction?' },
      { kind: 'Combined meal dose', icr: 15, carbs: 75, glucose: 210, target: 120, cf: 30,
        prompt: 'Insulin-to-carbohydrate ratio 1 unit per 15 g; correction 1 unit per 30 mg/dL above a target of 120 mg/dL. The meal has 75 g of carbohydrate and the pre-meal glucose is 210 mg/dL. What is the total dose?' },
      { kind: 'Combined meal dose', icr: 8, carbs: 40, glucose: 96, target: 120, cf: 40,
        prompt: 'Insulin-to-carbohydrate ratio 1 unit per 8 g; correction 1 unit per 40 mg/dL above a target of 120 mg/dL. The meal has 40 g of carbohydrate and the pre-meal glucose is 96 mg/dL. What is the total dose — and what is the correction component doing here?' },
      { kind: 'Carbohydrate coverage', icr: 5, carbs: 80, glucose: null, target: null, cf: null,
        prompt: 'A stronger ratio of 1 unit per 5 g of carbohydrate, an 80 g meal, and an in-range glucose. How many units cover the meal?' },
      { kind: 'Correction dose', icr: null, carbs: null, glucose: 320, target: 150, cf: 85,
        prompt: 'A patient has a correction factor of 1 unit per 85 mg/dL above a target of 150 mg/dL. The glucose reads 320 mg/dL between meals. How many units of correction?' }
    ];
    var i = 0;

    var warn = el('div', { class: 'note note-red' });
    warn.appendChild(el('span', { class: 'note-kind', text: 'Course practice only — never for dosing anyone' }));
    warn.appendChild(el('p', { html: '<strong>This calculator exists so you can practice the arithmetic behind an exam question. It must not be used to decide a real insulin dose — not for yourself, not for a patient, not for a family member.</strong> Real dosing depends on the whole clinical picture, on insulin still active from an earlier dose, and on judgement that belongs to the treating clinician. Every case below is fictional.' }));

    var kind = el('p', { class: 'eyebrow' });
    var prompt = el('p', { class: 'quiz-stem' });
    var params = el('div', { class: 'grid' });
    var fieldWrap = el('div', { class: 'quiz-field', style: 'max-width:240px' });
    var input = el('input', { id: 'dose-input', type: 'text', inputmode: 'decimal', autocomplete: 'off',
      style: 'min-height:44px;padding:10px;font-family:var(--font);font-size:15px;border:1px solid var(--border2);border-radius:7px;background:var(--bg2);color:var(--text)' });
    fieldWrap.appendChild(el('label', { for: 'dose-input', text: 'Your answer, in units' }));
    fieldWrap.appendChild(input);

    var submit = el('button', { type: 'button', class: 'btn btn-primary', text: 'Submit, then show the working' });
    var nextBtn = el('button', { type: 'button', class: 'btn', text: 'Next exercise →' });
    var out = el('div', { class: 'quiz-feedback' });
    var live = el('p', { class: 'visually-hidden', role: 'status', 'aria-live': 'polite' });

    function compute(e) {
      var carbDose = (e.icr && e.carbs !== null) ? e.carbs / e.icr : 0;
      var corrDose = (e.cf && e.glucose !== null) ? (e.glucose - e.target) / e.cf : 0;
      return { carbDose: carbDose, corrDose: corrDose, total: carbDose + corrDose };
    }

    function draw() {
      var e = EX[i];
      kind.textContent = 'Exercise ' + (i + 1) + ' of ' + EX.length + ' · ' + e.kind;
      prompt.textContent = e.prompt;
      params.innerHTML = '';
      function chip(label, value) {
        var b = el('div', { class: 'block' });
        b.appendChild(el('div', { class: 'block-label', text: label }));
        b.appendChild(el('div', { class: 'block-text', text: value }));
        params.appendChild(b);
      }
      if (e.icr) chip('Insulin-to-carbohydrate ratio', '1 unit per ' + e.icr + ' g');
      if (e.carbs !== null) chip('Meal carbohydrate', e.carbs + ' g');
      if (e.cf) chip('Correction factor', '1 unit per ' + e.cf + ' mg/dL above target');
      if (e.glucose !== null) chip('Glucose now / target', e.glucose + ' / ' + e.target + ' mg/dL');
      input.value = ''; input.disabled = false;
      submit.disabled = false;
      out.innerHTML = '';
    }

    function show() {
      var e = EX[i], r = compute(e);
      var typed = input.value.trim();
      if (typed === '' || isNaN(parseFloat(typed))) {
        out.innerHTML = '';
        out.appendChild(el('p', { class: 'quiz-verdict incorrect', text: 'Enter a number first — the working stays hidden until you commit to an answer.' }));
        live.textContent = 'Enter a numeric answer before revealing the working.';
        input.focus();
        return;
      }
      input.disabled = true; submit.disabled = true;
      var mine = parseFloat(typed);
      var close = Math.abs(mine - r.total) < 0.55;

      out.innerHTML = '';
      out.appendChild(el('p', { class: 'quiz-verdict ' + (close ? 'correct' : 'incorrect'),
        text: close ? '✓ That matches the worked calculation.' : '✗ That differs from the worked calculation below — find the step where it diverged.' }));

      var work = el('div', { class: 'quiz-explain' });
      work.appendChild(el('h4', { text: 'Worked calculation' }));
      var ul = el('ul', { class: 'list' });
      if (e.icr) ul.appendChild(el('li', { html: '<strong>Carbohydrate coverage</strong> = carbohydrate ÷ ratio = ' + e.carbs + ' ÷ ' + e.icr + ' = <strong>' + r.carbDose.toFixed(2) + ' units</strong>' }));
      if (e.cf) {
        var above = e.glucose - e.target;
        ul.appendChild(el('li', { html: '<strong>Correction</strong> = (glucose − target) ÷ correction factor = (' + e.glucose + ' − ' + e.target + ') ÷ ' + e.cf + ' = ' + above + ' ÷ ' + e.cf + ' = <strong>' + r.corrDose.toFixed(2) + ' units</strong>' + (above < 0 ? ' — a <em>negative</em> number, because the glucose is below target' : '') }));
      }
      ul.appendChild(el('li', { html: '<strong>Total</strong> = <strong>' + r.total.toFixed(2) + ' units</strong>' }));
      work.appendChild(ul);
      out.appendChild(work);

      var take = el('div', { class: 'quiz-takeaway' });
      take.appendChild(el('strong', { text: 'What this one is teaching: ' }));
      if (e.cf && e.glucose !== null && e.glucose < e.target) {
        take.appendChild(document.createTextNode('a glucose below target makes the correction term negative, so it subtracts from the meal dose instead of adding to it. Seeing the two components as separate ideas — one covers the food, one moves the glucose toward target — is the whole point.'));
      } else if (e.icr && e.cf) {
        take.appendChild(document.createTextNode('a mealtime dose is two separate ideas added together: insulin for the food, and insulin to bring an out-of-range glucose back toward target. Keep them apart in your head and the arithmetic stops being confusing.'));
      } else if (e.icr) {
        // Optional after the quiz: the course slide gives ICR = 540 ÷ total daily dose.
        take.appendChild(document.createTextNode('the ratio reads "1 unit per X grams", so a larger X is a weaker ratio and gives a smaller dose for the same meal.'));
      } else {
        // Optional after the quiz: correction factor may be estimated with 1800 ÷ TDD (1500 for regular insulin).
        take.appendChild(document.createTextNode('the correction factor reads "1 unit lowers glucose by X mg/dL", so divide the distance above target by X.'));
      }
      out.appendChild(take);
      out.appendChild(el('p', { class: 'quiz-source', text: 'Rounding to what the pen or pump can actually deliver, minimum and maximum doses, insulin still active from an earlier dose, and the clinical context all change a real decision. This exercise deliberately covers only the underlying arithmetic.' }));
      live.textContent = (close ? 'Your answer matches. ' : 'Your answer differs. ') + 'The worked total is ' + r.total.toFixed(2) + ' units.';
    }

    submit.addEventListener('click', show);
    input.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); show(); } });
    nextBtn.addEventListener('click', function () {
      i = (i + 1) % EX.length; draw();
      prompt.setAttribute('tabindex', '-1'); prompt.focus({ preventScroll: true });
      live.textContent = 'Exercise ' + (i + 1) + ' of ' + EX.length + ' loaded.';
    });

    host.appendChild(warn);
    host.appendChild(kind); host.appendChild(prompt); host.appendChild(params);
    host.appendChild(fieldWrap);
    host.appendChild(el('div', { class: 'btn-row' }, [submit, nextBtn]));
    host.appendChild(out); host.appendChild(live);
    draw();
  };

  /* ===================================================================== */
  /* Insulin — glucose pattern lab                                         */
  /* ===================================================================== */
  FIGS['pattern-lab'] = function (host) {
    var PATTERNS = [
      { name: 'Fasting hyperglycemia', regimen: 'MDI — long-acting basal at bedtime, rapid-acting with meals',
        trace: [[0,180],[2,196],[4,210],[6,232],[8,150],[10,130],[12,145],[14,120],[16,128],[18,150],[20,124],[22,150],[24,175]],
        answer: 'The overnight basal insulin',
        why: 'Glucose climbs steadily through the night and is highest on waking, while the daytime values after each bolus are acceptable. The insulin acting across that overnight window is the basal, so the basal is what gets evaluated.' },
      { name: 'Breakfast-related rise', regimen: 'MDI — long-acting basal at bedtime, rapid-acting with meals',
        trace: [[0,120],[2,112],[4,108],[6,110],[7,115],[9,268],[10,250],[12,150],[14,130],[16,126],[18,140],[20,132],[22,124],[24,120]],
        answer: 'The breakfast bolus — the mealtime ratio at breakfast',
        why: 'Fasting is fine and the rest of the day is fine. The abnormality is confined to the hours after breakfast, so the insulin acting across that window — the breakfast mealtime dose — is what gets evaluated. Insulin needs are commonly higher at breakfast than at other meals.' },
      { name: 'Pre-dinner hyperglycemia', regimen: 'MDI — long-acting basal at bedtime, rapid-acting with meals',
        trace: [[0,118],[4,110],[6,112],[8,130],[10,140],[12,132],[14,190],[16,235],[18,258],[19,150],[21,135],[24,120]],
        answer: 'The lunch bolus',
        why: 'The rise begins after lunch and peaks just before dinner. Work backwards to the insulin that was acting across that stretch — the lunchtime dose — rather than reaching for the dinner dose, which has not acted yet.' },
      { name: 'Bedtime hyperglycemia', regimen: 'MDI — long-acting basal at bedtime, rapid-acting with meals',
        trace: [[0,140],[4,120],[6,115],[8,128],[12,132],[14,126],[16,130],[18,140],[20,215],[22,262],[23,240],[24,180]],
        answer: 'The dinner bolus',
        why: 'The pattern appears only in the hours between dinner and bedtime. The insulin that should have covered that meal is the dinner mealtime dose.' },
      { name: 'Overnight hypoglycemia with a morning rebound', regimen: 'Twice-daily NPH mixed with rapid-acting insulin',
        trace: [[0,105],[1,86],[2,64],[3,52],[4,68],[5,110],[6,168],[7,205],[9,160],[12,140],[15,150],[18,145],[21,130],[24,105]],
        answer: 'The evening NPH — the insulin peaking overnight',
        why: 'The low sits in the early hours, exactly where evening NPH peaks, and the morning high follows it. That counter-regulatory rebound after an overnight low is the classic Somogyi effect. Whatever you call the rebound, the insulin acting before the repeated low is the evening NPH — and treating the morning high by adding insulin would make the overnight low worse.' },
      { name: 'Exercise-related hypoglycemia', regimen: 'MDI — pattern appears on afternoon training days only',
        trace: [[0,124],[6,118],[8,130],[12,140],[14,128],[16,74],[17,58],[18,70],[20,120],[22,130],[24,122]],
        answer: 'The insulin acting during and after the activity — but this is a context pattern rather than a wrong standing dose',
        why: 'The lows appear only on training days and only around the activity. That is a pattern tied to a repeated context, not to a standing dose that is wrong on every day. The insulin acting across the exercise window is what gets looked at, alongside carbohydrate intake around the activity.' },
      { name: 'A missed bolus on a single day', regimen: 'MDI — long-acting basal at bedtime, rapid-acting with meals',
        trace: [[0,120],[6,112],[8,124],[12,130],[13,138],[15,315],[17,290],[19,200],[21,150],[24,126]],
        answer: 'Nothing yet — one isolated excursion is not a pattern',
        why: 'A single large post-meal spike on one day with an otherwise ordinary trace is far more likely a missed or late bolus than a wrong dose. Changing a standing dose on the strength of one day risks causing hypoglycemia on all the others. Wait for the abnormality to repeat before attributing it to an insulin period.' },
      { name: 'Pump interruption', regimen: 'Insulin pump (CSII) — rapid-acting insulin only',
        trace: [[0,118],[2,120],[4,124],[6,130],[8,180],[9,240],[10,300],[11,352],[12,388],[13,410]],
        answer: 'Not a dosing pattern — suspect interrupted insulin delivery',
        why: 'A pump delivers rapid-acting insulin only, so there is no long-acting depot to fall back on when delivery stops. A rapid, unrelenting rise over a few hours points to a delivery failure — set, site, occlusion, or reservoir — and carries a real risk of ketosis within hours. This is a troubleshooting problem, not a ratio problem.' }
    ];

    var OPTIONS = [
      'The overnight basal insulin',
      'The breakfast bolus — the mealtime ratio at breakfast',
      'The lunch bolus',
      'The dinner bolus',
      'The evening NPH — the insulin peaking overnight',
      'The insulin acting during and after the activity — but this is a context pattern rather than a wrong standing dose',
      'Nothing yet — one isolated excursion is not a pattern',
      'Not a dosing pattern — suspect interrupted insulin delivery'
    ];

    var chart = svg('svg', { role: 'img', 'aria-labelledby': 'pl-t pl-d' });
    var ttl = svg('title', { id: 'pl-t' }), dsc = svg('desc', { id: 'pl-d' });
    chart.appendChild(ttl); chart.appendChild(dsc);
    var plot = svg('g'); chart.appendChild(plot);
    var caption = el('p', { class: 'figure-title' });
    var currentIndex = 0;

    function paint(idx) {
      currentIndex = idx;
      var p = PATTERNS[idx];
      var narrow = narrowMQ.matches;
      var W = narrow ? 400 : 700, H = narrow ? 270 : 260;
      var L = narrow ? 44 : 50, R = narrow ? 12 : 16, T = narrow ? 16 : 16, B = narrow ? 52 : 48;
      var fs = narrow ? 15 : 12.5, fsm = narrow ? 13 : 11.5;
      var x0 = L, x1 = W - R, y0 = T, y1 = H - B;
      function X(h) { return x0 + (h / 24) * (x1 - x0); }
      function Y(g) { return y1 - (Math.min(g, 420) / 420) * (y1 - y0); }

      chart.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
      plot.innerHTML = '';
      plot.appendChild(svg('rect', { x: x0, y: Y(180), width: x1 - x0, height: Y(70) - Y(180), fill: 'var(--teal-t)' }));
      [70, 180, 300, 420].forEach(function (g) {
        plot.appendChild(svg('line', { x1: x0, x2: x1, y1: Y(g), y2: Y(g), class: 'gridline' }));
        plot.appendChild(svg('text', { x: x0 - 6, y: Y(g) + fsm / 3, 'font-size': fsm, fill: 'var(--text3)', 'font-family': 'var(--font)', 'text-anchor': 'end', text: g }));
      });
      plot.appendChild(svg('line', { x1: x0, x2: x1, y1: y1, y2: y1, class: 'axis' }));
      plot.appendChild(svg('line', { x1: x0, x2: x0, y1: y0, y2: y1, class: 'axis' }));
      var marks = narrow ? [[0, '12a'], [8, 'B'], [13, 'L'], [18, 'D'], [24, '12a']]
                         : [[0, '12a'], [6, '6a'], [8, 'B'], [12, '12p'], [13, 'L'], [18, 'D'], [22, 'bed'], [24, '12a']];
      marks.forEach(function (m) {
        plot.appendChild(svg('text', { x: X(m[0]), y: y1 + fs + 3, 'font-size': fsm, fill: 'var(--text3)', 'font-family': 'var(--font)', 'text-anchor': 'middle', text: m[1] }));
      });
      plot.appendChild(svg('text', { x: (x0 + x1) / 2, y: H - 12, 'font-size': fs, fill: 'var(--text2)', 'font-family': 'var(--font)', 'text-anchor': 'middle', text: 'Time of day — B breakfast, L lunch, D dinner' }));
      plot.appendChild(svg('text', { x: 12, y: (y0 + y1) / 2, 'font-size': fs, fill: 'var(--text2)', 'font-family': 'var(--font)', 'text-anchor': 'middle', transform: 'rotate(-90 12 ' + ((y0 + y1) / 2) + ')', text: 'Glucose (mg/dL)' }));

      var pts = p.trace.map(function (t) { return [X(t[0]), Y(t[1])]; });
      plot.appendChild(path(pts, { stroke: 'var(--accent)', 'stroke-width': 2.4 }));
      pts.forEach(function (pt) { plot.appendChild(svg('circle', { cx: pt[0], cy: pt[1], r: 2.6, fill: 'var(--accent)' })); });

      caption.textContent = 'Trace ' + (idx + 1) + ' of ' + PATTERNS.length + ', repeated across several days · ' + p.regimen +
        ' · shaded band = 70–180 mg/dL';
      ttl.textContent = 'Fictional daily glucose trace: ' + p.name;
      dsc.textContent = 'A fictional 24-hour glucose trace on this regimen. Readings, as hour and glucose in mg/dL: ' +
        p.trace.map(function (t) { return t[0] + ':00 about ' + t[1]; }).join(', ') + '.';
    }
    onWidthChange(function () { paint(currentIndex); });

    host.appendChild(el('p', { class: 'figure-title', text: 'Glucose pattern lab — which insulin period would you evaluate?' }));
    host.appendChild(caption);
    host.appendChild(chart);

    exercise({
      host: host,
      title: '',
      question: 'Which insulin period would you evaluate?',
      nextLabel: 'Next trace →',
      options: OPTIONS,
      cases: PATTERNS.map(function (p) {
        return { stem: 'Which insulin period would you evaluate?', answer: p.answer, why: p.why, label: p.name };
      }),
      onDraw: function (i) { paint(i); },
      principleLabel: 'The principle: ',
      principle: 'evaluate the insulin that acted before the repeated abnormal pattern. Confirm the pattern repeats over several days first, because a single bad day is usually a missed dose or an unusual meal rather than a wrong regimen — and never change your own or anyone else\'s insulin on the strength of this exercise.'
    });

    host.appendChild(el('p', { class: 'figcaption', text: 'All traces are fictional and drawn for teaching. They are not patient data, and they are not a template for adjusting anyone\'s insulin.' }));
    // remove the empty title node the exercise helper inserts
    Array.prototype.forEach.call(host.querySelectorAll('.figure-title'), function (n) { if (!n.textContent) n.remove(); });
  };

  /* ===================================================================== */
  /* T2DM — progression graph                                            */
  /* ===================================================================== */
  FIGS['t2dm-progression'] = function (host) {
    var SERIES = [
      { key: 'ir',   label: 'Insulin resistance', color: 'purple', dash: null,
        pts: [[0,18],[15,30],[30,48],[45,62],[60,72],[75,78],[100,84]] },
      { key: 'ins',  label: 'Insulin secretion',  color: 'blue',   dash: null,
        pts: [[0,38],[15,55],[28,76],[38,84],[46,80],[55,66],[70,46],[85,30],[100,20]] },
      { key: 'beta', label: 'Beta-cell function', color: 'teal',   dash: '6 4',
        pts: [[0,96],[20,90],[35,80],[50,64],[65,48],[80,34],[100,22]] },
      { key: 'glu',  label: 'Glucose',            color: 'red',    dash: null,
        pts: [[0,18],[20,20],[35,24],[45,30],[55,42],[65,58],[80,74],[100,86]] }
    ];
    var STAGES = [{ at: 22, label: 'Compensation' }, { at: 52, label: 'Prediabetes' }, { at: 84, label: 'T2DM' }];

    var chart = svg('svg', { role: 'img', 'aria-labelledby': 'prog-t prog-d' });
    chart.appendChild(svg('title', { id: 'prog-t', text: 'The progression from insulin resistance to T2DM' }));
    chart.appendChild(svg('desc', { id: 'prog-d', text:
      'Four curves against time. Insulin resistance rises steadily from the start. Insulin secretion rises with it at first — compensatory hyperinsulinemia — peaks, then falls away. Beta-cell function declines throughout. Glucose stays near normal for as long as compensation holds, drifts upward through prediabetes as secretion begins to fail, then rises steeply once beta-cell function can no longer keep pace.' }));
    var plot = svg('g'); chart.appendChild(plot);

    function paint() {
      var narrow = narrowMQ.matches;
      var W = narrow ? 400 : 700, H = narrow ? 290 : 300;
      var L = narrow ? 34 : 48, R = narrow ? 12 : 18, T = narrow ? 16 : 18, B = narrow ? 56 : 56;
      var fs = narrow ? 15 : 12.5, fsm = narrow ? 12.5 : 11.5;
      var x0 = L, x1 = W - R, y0 = T, y1 = H - B;
      function X(t) { return x0 + (t / 100) * (x1 - x0); }
      function Y(v) { return y1 - (v / 100) * (y1 - y0); }

      chart.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
      plot.innerHTML = '';
      STAGES.forEach(function (s) {
        plot.appendChild(svg('line', { x1: X(s.at), x2: X(s.at), y1: y0, y2: y1, class: 'gridline' }));
        plot.appendChild(svg('text', { x: X(s.at), y: y1 + fs + 3, 'font-size': fsm, fill: 'var(--text3)', 'font-family': 'var(--font)', 'text-anchor': 'middle', text: s.label }));
      });
      plot.appendChild(svg('line', { x1: x0, x2: x1, y1: y1, y2: y1, class: 'axis' }));
      plot.appendChild(svg('line', { x1: x0, x2: x0, y1: y0, y2: y1, class: 'axis' }));
      plot.appendChild(svg('text', { x: (x0 + x1) / 2, y: H - 14, 'font-size': fs, fill: 'var(--text2)', 'font-family': 'var(--font)', 'text-anchor': 'middle', text: 'Time — years, not to scale' }));
      plot.appendChild(svg('text', { x: 12, y: (y0 + y1) / 2, 'font-size': fs, fill: 'var(--text2)', 'font-family': 'var(--font)', 'text-anchor': 'middle', transform: 'rotate(-90 12 ' + ((y0 + y1) / 2) + ')', text: 'Relative level' }));

      SERIES.forEach(function (ser) {
        var a = { stroke: 'var(--' + ser.color + ')', 'stroke-width': 2.4 };
        if (ser.dash) a['stroke-dasharray'] = ser.dash;
        plot.appendChild(path(ser.pts.map(function (p) { return [X(p[0]), Y(p[1])]; }), a));
      });
    }
    onWidthChange(paint);

    host.appendChild(el('p', { class: 'figure-title', text: 'Insulin resistance → compensation → beta-cell failure → hyperglycemia' }));
    host.appendChild(chart);
    host.appendChild(legend(SERIES.map(function (s) { return { label: s.label, color: s.color, dash: !!s.dash }; })));
    host.appendChild(el('p', { class: 'figcaption', html:
      'Original schematic of the progression described above. Both axes are <strong>relative and unscaled</strong> — the shape of the four curves against each other is the teaching point, not any value or duration. ' +
      'The consequence that matters clinically: glucose moves <em>last</em>. By the time a fasting glucose crosses a diagnostic threshold, resistance and beta-cell decline have been under way for years, which is the argument for screening people at risk rather than waiting for symptoms.' }));
    paint();
  };

  /* ===================================================================== */
  /* mount                                                                 */
  /* ===================================================================== */
  function mount() {
    Array.prototype.forEach.call(document.querySelectorAll('[data-fig]'), function (host) {
      var name = host.getAttribute('data-fig');
      var fn = FIGS[name];
      if (!fn) { if (window.console) window.console.warn('Unknown figure: ' + name); return; }
      try { fn(host); }
      catch (err) {
        host.textContent = 'This interactive figure could not be built. The surrounding text covers the same material.';
        if (window.console) window.console.error(name, err);
      }
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount);
  else mount();
})();
