/* ────────────────────────────────────────────────────────────
   editor.js — textarea 코드 에디터 보강
     - 자동 괄호/따옴표 페어링 (), [], {}, "", ''
     - 닫는 괄호 스킵 오버
     - Enter 자동 들여쓰기 + 블록 진입 시 한 단계 더 들여쓰기
     - { | } 사이에서 Enter → 빈 줄 + 들여쓰기
     - Tab / Shift+Tab — 단일 위치는 4칸 공백, 선택 영역은 줄 단위 들여쓰기
     - Backspace — 빈 짝 괄호( "|" 등)는 양쪽 함께 삭제
   외부 라이브러리 없이 contenteditable 도 사용하지 않음 → 기존
   textarea 의 selection/입력 이벤트 흐름과 호환.
──────────────────────────────────────────────────────────── */

(function () {
  if (window.enhanceCodeEditor) return;

  const INDENT = '    ';                                   // 4-space 들여쓰기
  const PAIRS  = { '(': ')', '[': ']', '{': '}', '"': '"', "'": "'" };
  const CLOSE  = new Set([')', ']', '}']);                 // 따옴표는 별도 처리
  const QUOTES = new Set(['"', "'"]);
  const OPEN_PAIR = new Set(['(', '[', '{']);

  function fireInput(el) {
    el.dispatchEvent(new Event('input', { bubbles: true }));
  }

  function setSel(el, start, end) {
    el.selectionStart = start;
    el.selectionEnd   = end == null ? start : end;
  }

  function leadingIndent(line) {
    const m = line.match(/^[\t ]*/);
    return m ? m[0] : '';
  }

  function getLineStart(val, pos) {
    return val.lastIndexOf('\n', pos - 1) + 1;
  }

  function getLineEnd(val, pos) {
    const i = val.indexOf('\n', pos);
    return i === -1 ? val.length : i;
  }

  window.enhanceCodeEditor = function enhanceCodeEditor(textarea) {
    if (!textarea || textarea.dataset.enhanced === '1') return;
    textarea.dataset.enhanced = '1';

    /* Tab 키가 폼 포커스를 이동하지 않도록 — 코드 에디터에선 들여쓰기로 동작. */
    textarea.addEventListener('keydown', function (e) {
      const val   = textarea.value;
      const start = textarea.selectionStart;
      const end   = textarea.selectionEnd;
      const sel   = start !== end;
      const prev  = val[start - 1];
      const next  = val[start];

      /* ── Tab — 들여쓰기 ── */
      if (e.key === 'Tab' && !e.shiftKey) {
        e.preventDefault();
        if (sel) {
          const ls = getLineStart(val, start);
          const block = val.slice(ls, end);
          const indented = block.replace(/^/gm, INDENT);
          textarea.value = val.slice(0, ls) + indented + val.slice(end);
          setSel(textarea, start + INDENT.length, ls + indented.length);
        } else {
          textarea.value = val.slice(0, start) + INDENT + val.slice(end);
          setSel(textarea, start + INDENT.length);
        }
        fireInput(textarea);
        return;
      }

      /* ── Shift+Tab — 들여쓰기 제거 ── */
      if (e.key === 'Tab' && e.shiftKey) {
        e.preventDefault();
        const ls = getLineStart(val, start);
        const le = getLineEnd(val, end);
        const block = val.slice(ls, le);
        const dedented = block.replace(
          new RegExp(`^( {1,${INDENT.length}}|\\t)`, 'gm'),
          ''
        );
        const removed = block.length - dedented.length;
        textarea.value = val.slice(0, ls) + dedented + val.slice(le);
        setSel(textarea, Math.max(ls, start - INDENT.length),
                          Math.max(ls, end - removed));
        fireInput(textarea);
        return;
      }

      /* ── Enter — 자동 들여쓰기 ── */
      if (e.key === 'Enter' && !e.shiftKey && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        const ls    = getLineStart(val, start);
        const line  = val.slice(ls, start);
        const indent = leadingIndent(line);
        /* 라인 끝(공백 무시)이 :, {, (, [ 로 끝나면 한 단계 더 들여쓰기 */
        const opensBlock = /[\(\[\{:]\s*$/.test(line);
        /* { | }, [ | ], ( | ) 사이라면 가운데 빈 줄 + 들여쓰기 */
        const pairAtCursor =
          (prev === '(' && next === ')') ||
          (prev === '[' && next === ']') ||
          (prev === '{' && next === '}');

        if (pairAtCursor) {
          const insert = '\n' + indent + INDENT + '\n' + indent;
          textarea.value = val.slice(0, start) + insert + val.slice(end);
          setSel(textarea, start + 1 + indent.length + INDENT.length);
        } else {
          const extra = opensBlock ? INDENT : '';
          const insert = '\n' + indent + extra;
          textarea.value = val.slice(0, start) + insert + val.slice(end);
          setSel(textarea, start + insert.length);
        }
        fireInput(textarea);
        return;
      }

      /* ── 자동 괄호/따옴표 페어링 ── */
      if (PAIRS[e.key]) {
        /* 선택 영역이 있으면 감싸기 */
        if (sel) {
          e.preventDefault();
          const selected = val.slice(start, end);
          const wrapped  = e.key + selected + PAIRS[e.key];
          textarea.value = val.slice(0, start) + wrapped + val.slice(end);
          setSel(textarea, start + 1, end + 1);
          fireInput(textarea);
          return;
        }

        /* 따옴표 — 같은 따옴표가 바로 다음에 있으면 스킵 오버 */
        if (QUOTES.has(e.key) && next === e.key) {
          e.preventDefault();
          setSel(textarea, start + 1);
          return;
        }

        /* 따옴표 — 단어 내부( 'abc|' 등)에서는 페어 만들지 않음 */
        if (QUOTES.has(e.key) && /[A-Za-z0-9_]/.test(prev || '')) {
          /* 기본 동작(따옴표 하나만 입력) 유지 */
          return;
        }

        e.preventDefault();
        const ins = e.key + PAIRS[e.key];
        textarea.value = val.slice(0, start) + ins + val.slice(end);
        setSel(textarea, start + 1);
        fireInput(textarea);
        return;
      }

      /* ── 닫는 괄호 스킵 오버 ── */
      if (!sel && CLOSE.has(e.key) && next === e.key) {
        e.preventDefault();
        setSel(textarea, start + 1);
        return;
      }

      /* ── Backspace — 빈 짝 괄호 함께 삭제 ── */
      if (e.key === 'Backspace' && !sel && OPEN_PAIR.has(prev) &&
          next === PAIRS[prev]) {
        e.preventDefault();
        textarea.value = val.slice(0, start - 1) + val.slice(start + 1);
        setSel(textarea, start - 1);
        fireInput(textarea);
        return;
      }
      if (e.key === 'Backspace' && !sel && QUOTES.has(prev) && next === prev) {
        e.preventDefault();
        textarea.value = val.slice(0, start - 1) + val.slice(start + 1);
        setSel(textarea, start - 1);
        fireInput(textarea);
        return;
      }
    });

    /* spellcheck 끄기 — 코드 입력 중 빨간 줄 방지 */
    textarea.setAttribute('spellcheck', 'false');
    textarea.setAttribute('autocomplete', 'off');
    textarea.setAttribute('autocorrect', 'off');
    textarea.setAttribute('autocapitalize', 'off');
  };
})();
