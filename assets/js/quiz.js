/* ==========================================================================
   HSHD1 Endocrine Course Companion — shared quiz engine

   Questions come from assets/data/endocrine_question_bank.json, which is the
   single source of truth. Nothing is duplicated into the HTML pages.

   Design notes
   - Option order is randomized by shuffling the option OBJECTS. Correctness is
     always `option.id === question.correct_answer`, so the answer key cannot be
     desynchronized by shuffling. Displayed letters are positional only.
   - Correctness data is held in a JS closure and never written into the DOM
     before submission. A static site cannot make answers truly secret; the goal
     here is retrieval practice, not exam administration.
   - No points, streaks, badges, timers, confetti, or completion pressure.
   ========================================================================== */
(function () {
  'use strict';

  var bankPromise = null;

  function loadBank() {
    if (bankPromise) return bankPromise;
    bankPromise = fetch('assets/data/endocrine_question_bank.json?v=20260816b')
      .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
      .catch(function () {
        // file:// fallback — assets/data/question-bank.js is generated from the
        // same JSON by tools/build.py and sets window.ENDO_QUESTION_BANK.
        return new Promise(function (resolve, reject) {
          if (window.ENDO_QUESTION_BANK) return resolve(window.ENDO_QUESTION_BANK);
          var s = document.createElement('script');
          s.src = 'assets/data/question-bank.js';
          s.onload = function () {
            if (window.ENDO_QUESTION_BANK) resolve(window.ENDO_QUESTION_BANK);
            else reject(new Error('fallback bank empty'));
          };
          s.onerror = function () { reject(new Error('fallback bank unavailable')); };
          document.head.appendChild(s);
        });
      });
    return bankPromise;
  }

  function shuffle(arr) {
    var a = arr.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }

  var LETTERS = 'ABCDEFGH';

  function el(tag, attrs, kids) {
    var n = document.createElement(tag);
    if (attrs) Object.keys(attrs).forEach(function (k) {
      if (k === 'text') n.textContent = attrs[k];
      else if (k === 'html') n.innerHTML = attrs[k];
      else if (attrs[k] !== null && attrs[k] !== undefined) n.setAttribute(k, attrs[k]);
    });
    (kids || []).forEach(function (c) { if (c) n.appendChild(c); });
    return n;
  }

  /* Toolbar controls need DOM ids so their <label for> works. A page can hold
     more than one quiz (cumulative practice has one bank per week), so the ids
     are suffixed per instance — otherwise every label would point at the first
     quiz's controls. */
  var instances = 0;

  /* ======================================================================= */
  function Quiz(host, bank, opts) {
    this.host = host;
    this.bank = bank;
    this.uid = ++instances;
    this.opts = opts || {};
    this.all = bank.questions.slice();
    if (this.opts.ids && this.opts.ids.length) {
      var want = this.opts.ids;
      this.all = want.map(function (id) {
        return bank.questions.filter(function (q) { return q.id === id; })[0];
      }).filter(Boolean);
    }
    if (this.opts.lecture) {
      var lec = this.opts.lecture;
      this.all = this.all.filter(function (q) { return q.lecture === lec; });
    }
    /* A set of lectures (data-quiz-lectures) is a scope, not a filter: it limits
       which questions exist for this mount, and the Lecture dropdown then offers
       only those. Used to split cumulative practice by week. */
    if (this.opts.lectures && this.opts.lectures.length) {
      var wanted = {};
      this.opts.lectures.forEach(function (l) { wanted[l] = 1; });
      this.all = this.all.filter(function (q) { return wanted[q.lecture]; });
    }
    this.state = {
      lecture: this.opts.lecture || 'all',
      topic: 'all',
      difficulty: 'all',
      randomOrder: this.opts.randomOrder !== false && !this.opts.ids,
      randomOptions: true,
      reviewMode: false
    };
    this.answers = {};   // questionId -> { chosenOptionId, correct }
    this.render();
  }

  /* Lecture and topic are two views of the same question set, so combining
     them with AND mostly yields nothing ("T2DM" AND "Insulin therapy" shares
     no question). They are unioned instead: pick a lecture and a topic and you
     get both sets. Difficulty is a modifier, so it still narrows the result.
     On a lecture page opts.lecture has already limited this.all, so that
     lecture is a fixed scope rather than one side of the union — otherwise
     choosing a topic there would widen back to the whole lecture. */
  Quiz.prototype.matching = function () {
    var s = this.state;
    var scoped = !!this.opts.lecture;
    return this.all.filter(function (q) {
      var byLecture = !scoped && s.lecture !== 'all';
      var byTopic = s.topic !== 'all';
      if (byLecture || byTopic) {
        var inEither = (byLecture && q.lecture === s.lecture) ||
                       (byTopic && q.topic === s.topic);
        if (!inEither) return false;
      }
      if (s.difficulty !== 'all' && q.difficulty !== s.difficulty) return false;
      return true;
    });
  };

  Quiz.prototype.buildDeck = function (keepAnswers) {
    var list = this.matching();
    if (this.state.reviewMode) {
      var ans = this.answers;
      list = list.filter(function (q) { return ans[q.id] && !ans[q.id].correct; });
    }
    this.deck = this.state.randomOrder ? shuffle(list) : list;
    this.index = 0;
    if (!keepAnswers) this.answers = {};
    this.submitted = null;
  };

  /* --------------------------------------------------------------- chrome */
  Quiz.prototype.render = function () {
    this.host.innerHTML = '';
    this.host.classList.add('quiz');
    if (this.opts.showToolbar !== false) this.host.appendChild(this.toolbar());
    this.live = el('p', { class: 'visually-hidden', role: 'status', 'aria-live': 'polite' });
    this.stage = el('div');
    this.host.appendChild(this.live);
    this.host.appendChild(this.stage);
    this.buildDeck();
    this.paint();
  };

  Quiz.prototype.toolbar = function () {
    var self = this;
    var bar = el('div', { class: 'quiz-toolbar' });

    function uniq(key) {
      var seen = {}, out = [];
      self.all.forEach(function (q) { if (!seen[q[key]]) { seen[q[key]] = 1; out.push(q[key]); } });
      return out.sort();
    }

    function select(name, label, values, valueKey, labelFor) {
      var id = name + '-' + self.uid;
      var sel = el('select', { id: id });
      sel.appendChild(el('option', { value: 'all', text: 'All' }));
      values.forEach(function (v) { sel.appendChild(el('option', { value: v, text: labelFor ? labelFor(v) : v })); });
      sel.value = self.state[valueKey];
      sel.addEventListener('change', function () {
        self.state[valueKey] = sel.value;
        self.state.reviewMode = false;
        self.buildDeck(true);
        self.paint();
        self.announce();
      });
      var field = el('div', { class: 'quiz-field' }, [el('label', { for: id, text: label }), sel]);
      return field;
    }

    if (!this.opts.lecture) {
      bar.appendChild(select('q-lecture', 'Lecture', uniq('lecture'), 'lecture'));
      bar.appendChild(select('q-topic', 'Topic (or lecture)', uniq('topic'), 'topic'));
    } else {
      bar.appendChild(select('q-topic', 'Topic', uniq('topic'), 'topic'));
    }
    bar.appendChild(select('q-difficulty', 'Difficulty', ['foundational', 'intermediate', 'advanced'], 'difficulty',
      function (v) { return v.charAt(0).toUpperCase() + v.slice(1); }));

    var randWrap = el('div', { class: 'quiz-field' });
    randWrap.appendChild(el('label', { text: 'Order' }));
    var randLabel = el('label', { class: 'quiz-check' });
    var randBox = el('input', { type: 'checkbox', id: 'q-random-' + this.uid });
    randBox.checked = this.state.randomOrder;
    randBox.addEventListener('change', function () {
      self.state.randomOrder = randBox.checked;
      self.buildDeck(true); self.paint(); self.announce();
    });
    randLabel.appendChild(randBox);
    randLabel.appendChild(document.createTextNode('Shuffle questions'));
    randWrap.appendChild(randLabel);
    bar.appendChild(randWrap);

    var optWrap = el('div', { class: 'quiz-field' });
    optWrap.appendChild(el('label', { text: 'Options' }));
    var optLabel = el('label', { class: 'quiz-check' });
    var optBox = el('input', { type: 'checkbox', id: 'q-randopts-' + this.uid });
    optBox.checked = this.state.randomOptions;
    optBox.addEventListener('change', function () {
      self.state.randomOptions = optBox.checked;
      self.paint();
    });
    optLabel.appendChild(optBox);
    optLabel.appendChild(document.createTextNode('Shuffle answer choices'));
    optWrap.appendChild(optLabel);
    bar.appendChild(optWrap);

    return bar;
  };

  Quiz.prototype.announce = function (msg) {
    if (!this.live) return;
    this.live.textContent = msg || ((this.deck.length ? 'Question ' + (this.index + 1) + ' of ' + this.deck.length : 'No questions match the current filters.'));
  };

  /* ---------------------------------------------------------------- paint */
  Quiz.prototype.paint = function () {
    var self = this;
    this.stage.innerHTML = '';

    if (!this.deck.length) {
      var msg = this.state.reviewMode
        ? 'Nothing to review — you have no incorrect answers in the current filter.'
        : 'No questions match the current filters. Widen a filter to see questions.';
      this.stage.appendChild(el('p', { class: 'quiz-empty', text: msg }));
      if (this.state.reviewMode) {
        var back = el('button', { type: 'button', class: 'btn', text: 'Back to all questions' });
        back.addEventListener('click', function () { self.state.reviewMode = false; self.buildDeck(true); self.paint(); });
        this.stage.appendChild(el('div', { class: 'quiz-nav' }, [back]));
      }
      return;
    }

    if (this.index >= this.deck.length) { this.paintSummary(); return; }

    var q = this.deck[this.index];
    var order = this.state.randomOptions ? shuffle(q.options) : q.options.slice();
    var submitted = this.answers[q.id] || null;

    /* meta line */
    var meta = el('div', { class: 'quiz-meta' });
    meta.appendChild(el('span', { text: 'Question ' + (this.index + 1) + ' of ' + this.deck.length }));
    meta.appendChild(el('span', { class: 'quiz-tag tag tag-gray', text: q.lecture }));
    meta.appendChild(el('span', { class: 'quiz-tag tag tag-blue', text: q.topic }));
    meta.appendChild(el('span', { class: 'quiz-tag tag tag-amber', text: q.difficulty }));
    this.stage.appendChild(meta);

    this.stage.appendChild(el('p', { class: 'quiz-stem', text: q.stem }));

    var optsWrap = el('div', { class: 'quiz-opts', role: 'group', 'aria-label': 'Answer choices' });
    var buttons = [];
    order.forEach(function (opt, i) {
      var b = el('button', { type: 'button', class: 'quiz-opt' });
      b.appendChild(el('span', { class: 'opt-key', 'aria-hidden': 'true', text: LETTERS[i] + '.' }));
      b.appendChild(el('span', { class: 'opt-text', text: opt.text }));
      b.appendChild(el('span', { class: 'opt-mark' }));
      buttons.push({ btn: b, opt: opt });
      b.addEventListener('click', function () { self.submit(q, opt, order, buttons); });
      optsWrap.appendChild(b);
    });
    this.stage.appendChild(optsWrap);

    this.feedback = el('div', { class: 'quiz-feedback' });
    this.stage.appendChild(this.feedback);

    this.stage.appendChild(this.navRow(q));

    if (submitted) {
      var chosen = null;
      order.forEach(function (o) { if (o.id === submitted.chosenOptionId) chosen = o; });
      if (chosen) this.reveal(q, chosen, buttons, false);
    }
  };

  Quiz.prototype.navRow = function (q) {
    var self = this;
    var row = el('div', { class: 'quiz-nav' });

    if (this.index > 0) {
      var prev = el('button', { type: 'button', class: 'btn', text: '← Previous' });
      prev.addEventListener('click', function () { self.index--; self.paint(); self.announce(); self.focusStage(); });
      row.appendChild(prev);
    }
    var next = el('button', { type: 'button', class: 'btn btn-primary' });
    next.textContent = this.index === this.deck.length - 1 ? 'Finish →' : 'Next →';
    next.addEventListener('click', function () { self.index++; self.paint(); self.announce(); self.focusStage(); });
    row.appendChild(next);

    var retry = el('button', { type: 'button', class: 'btn', text: '↺ Retry this question' });
    retry.addEventListener('click', function () {
      delete self.answers[q.id];
      self.paint();
      self.announce('Question reset. ' + 'Question ' + (self.index + 1) + ' of ' + self.deck.length);
      self.focusStage();
    });
    row.appendChild(retry);

    if (this.opts.showToolbar !== false) {
      var reset = el('button', { type: 'button', class: 'btn', text: '↺ Reset set' });
      reset.addEventListener('click', function () {
        self.state.reviewMode = false;
        self.buildDeck(false); self.paint(); self.announce('Set reset. Question 1 of ' + self.deck.length);
        self.focusStage();
      });
      row.appendChild(reset);
    }
    return row;
  };

  Quiz.prototype.focusStage = function () {
    var h = this.stage.querySelector('.quiz-stem, .quiz-empty, h3');
    if (h) { h.setAttribute('tabindex', '-1'); h.focus({ preventScroll: true }); }
  };

  Quiz.prototype.submit = function (q, chosen, order, buttons) {
    if (this.answers[q.id]) return;              // already answered
    var correct = chosen.id === q.correct_answer;
    this.answers[q.id] = { chosenOptionId: chosen.id, correct: correct };
    this.reveal(q, chosen, buttons, true);
  };

  Quiz.prototype.reveal = function (q, chosen, buttons, announce) {
    var correct = chosen.id === q.correct_answer;
    var correctOpt = null;
    q.options.forEach(function (o) { if (o.id === q.correct_answer) correctOpt = o; });

    buttons.forEach(function (b) {
      b.btn.disabled = true;
      var mark = b.btn.querySelector('.opt-mark');
      if (b.opt.id === q.correct_answer) {
        b.btn.classList.add('is-correct');
        mark.textContent = '✓ correct';
      } else if (b.opt.id === chosen.id) {
        b.btn.classList.add('is-chosen-wrong');
        mark.textContent = '✗ your answer';
      }
    });

    this.feedback.innerHTML = '';
    var verdict = el('p', { class: 'quiz-verdict ' + (correct ? 'correct' : 'incorrect') });
    verdict.appendChild(el('span', { class: 'verdict-mark', 'aria-hidden': 'true', text: correct ? '✓ ' : '✗ ' }));
    verdict.appendChild(document.createTextNode(
      correct ? 'Correct.' : 'Not correct. The correct answer is marked above.'
    ));
    this.feedback.appendChild(verdict);

    var yours = el('div', { class: 'quiz-explain' });
    yours.appendChild(el('h4', { text: 'Your answer — ' + chosen.text }));
    yours.appendChild(el('p', { text: chosen.explanation }));
    this.feedback.appendChild(yours);

    if (!correct && correctOpt) {
      var right = el('div', { class: 'quiz-explain' });
      right.appendChild(el('h4', { text: 'Correct answer — ' + correctOpt.text }));
      right.appendChild(el('p', { text: correctOpt.explanation }));
      this.feedback.appendChild(right);
    }

    var take = el('div', { class: 'quiz-takeaway' });
    take.appendChild(el('strong', { text: 'Takeaway: ' }));
    take.appendChild(document.createTextNode(q.takeaway));
    this.feedback.appendChild(take);

    var src = el('p', { class: 'quiz-source' });
    src.appendChild(document.createTextNode('Reference: '));
    if (q.citation) {
      src.appendChild(el('a', { href: q.citation.url, target: '_blank', rel: 'noopener noreferrer', text: q.citation.text }));
    }
    src.appendChild(document.createTextNode(' · Objective: ' + q.objective));
    this.feedback.appendChild(src);

    if (announce) {
      this.announce(
        (correct ? 'Correct. ' : 'Not correct. The correct answer is ' + (correctOpt ? correctOpt.text : '') + '. ') +
        q.takeaway
      );
    }
  };

  Quiz.prototype.paintSummary = function () {
    var self = this;
    var total = this.deck.length;
    var answered = 0, right = 0, wrong = [];
    this.deck.forEach(function (q) {
      var a = self.answers[q.id];
      if (!a) return;
      answered++;
      if (a.correct) right++; else wrong.push(q);
    });

    this.stage.appendChild(el('h3', { text: 'End of this set' }));
    this.stage.appendChild(el('p', { class: 'prose', text:
      'You answered ' + answered + ' of ' + total + ' question' + (total === 1 ? '' : 's') +
      (answered ? ', and got ' + right + ' right.' : '.') +
      ' There is no score kept and nothing is saved — this is just retrieval practice.' }));

    if (wrong.length) {
      this.stage.appendChild(el('h4', { text: 'Questions you missed' }));
      var ul = el('ul', { class: 'list quiz-summary' });
      wrong.forEach(function (q) {
        ul.appendChild(el('li', { text: q.topic + ' — ' + q.stem.slice(0, 110) + (q.stem.length > 110 ? '…' : '') }));
      });
      this.stage.appendChild(ul);
    }

    var row = el('div', { class: 'quiz-nav' });
    if (wrong.length) {
      var rev = el('button', { type: 'button', class: 'btn btn-primary', text: 'Review the ' + wrong.length + ' I missed' });
      rev.addEventListener('click', function () {
        self.state.reviewMode = true;
        self.buildDeck(true);
        // reviewing means re-attempting: clear those answers
        self.deck.forEach(function (q) { delete self.answers[q.id]; });
        self.paint(); self.announce(); self.focusStage();
      });
      row.appendChild(rev);
    }
    var back = el('button', { type: 'button', class: 'btn', text: '← Back to last question' });
    back.addEventListener('click', function () { self.index = Math.max(0, self.deck.length - 1); self.paint(); self.announce(); self.focusStage(); });
    row.appendChild(back);

    var reset = el('button', { type: 'button', class: 'btn', text: '↺ Start this set over' });
    reset.addEventListener('click', function () {
      self.state.reviewMode = false;
      self.buildDeck(false); self.paint(); self.announce(); self.focusStage();
    });
    row.appendChild(reset);
    this.stage.appendChild(row);
    this.announce('End of set. ' + right + ' of ' + answered + ' answered correctly.');
  };

  /* ====================================================================== */
  function mountAll() {
    var hosts = Array.prototype.slice.call(document.querySelectorAll('[data-quiz]'));
    if (!hosts.length) return;

    hosts.forEach(function (h) { h.textContent = 'Loading questions…'; });

    loadBank().then(function (bank) {
      hosts.forEach(function (h) {
        var idsAttr = h.getAttribute('data-quiz-ids');
        var lecturesAttr = h.getAttribute('data-quiz-lectures');
        var opts = {
          ids: idsAttr ? idsAttr.split(',').map(function (s) { return s.trim(); }).filter(Boolean) : null,
          lectures: lecturesAttr ? lecturesAttr.split(',').map(function (s) { return s.trim(); }).filter(Boolean) : null,
          lecture: h.getAttribute('data-quiz-lecture') || null,
          showToolbar: h.getAttribute('data-quiz-toolbar') !== 'false',
          randomOrder: h.getAttribute('data-quiz-shuffle') !== 'false'
        };
        try {
          new Quiz(h, bank, opts);
        } catch (err) {
          h.textContent = 'This question set could not be built.';
          if (window.console) window.console.error(err);
        }
      });
    }).catch(function () {
      hosts.forEach(function (h) {
        h.innerHTML = '<p class="quiz-empty"><strong>The question bank could not be loaded.</strong> ' +
          'If you opened these files directly from disk (a <code>file://</code> address), your browser blocks the request. ' +
          'Start a local web server instead — see the README — or view the published site.</p>';
      });
    });
  }

  window.EndoQuizLoad = loadBank;

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mountAll);
  else mountAll();
})();
