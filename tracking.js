/* ============================================================================
   tracking.js  —  GA4 이벤트 추적 (랜딩페이지 4종 공용)
   ----------------------------------------------------------------------------
   이 파일 하나를 4개 랜딩페이지가 그대로 공유합니다.
   각 HTML은 </body> 앞에 <script src="tracking.js"></script> 한 줄만 있으면 됨.
   ★ HTML <head> 에 별도의 gtag 스니펫(<!-- Google tag -->)을 넣지 마세요.
     이 파일이 gtag 로드와 초기화(config)를 스스로 처리하므로,
     따로 넣으면 이중 로드되어 데이터가 꼬입니다.

   ▣ 담당자 배포 전 확인 (딱 2가지)
     1) 아래 GA4_ID 가 올바른 측정 ID 인지 확인 (기본값 이미 반영됨)
     2) 각 HTML <head> 에 tracking.js 보다 "먼저" 아래 한 줄이 있는지 확인
          <script>window.SITE_ID = 'fr-xxx';</script>
        - 이 SITE_ID 값이 GA(concept)와 DB(site 컬럼)를 동일하게 맞추는 유일한 기준.
        - HTML 의 payload( site: window.SITE_ID ) 와 GA concept 이 자동으로 같아짐.
        - 도메인을 바꿔 배포해도 여기는 손댈 필요 없음(도메인을 추측하지 않음).
        - SITE_ID 를 깜빡하면 예전 도메인 추측으로 폴백하며 콘솔에 경고를 남김.
        권장 SITE_ID 값(프랑스 세트):
          fr-protection / fr-ai-call-assistant / fr-factcheck / fr-soho-ai-answering

   ▣ 잡는 이벤트 (4개)
        page_view        - 페이지 도착 (GA가 자동으로 잡음, 코드 불필요)
        cta_click        - '#survey'로 가는 CTA 버튼 클릭 (설문 진입 의향)
        survey_start     - 설문 첫 답 클릭 (실제 설문 진입)
        survey_complete  - 설문 제출 성공 (전환 = 핵심 지표)
        └ 모든 이벤트에 concept(어느 랜딩인지) 가 자동으로 함께 전송됨
        └ survey_complete 에는 사용자가 고른 답(언어·응답값)도 함께 전송

   ▣ 동작 안 하는 경우
        - 측정 ID가 비정상(G-XXXXXXXXXX)이면 GA 전송을 건너뛰고 콘솔에만 로그.
        - localhost/파일 열기에서도 콘솔 로그로 확인 가능.
   ============================================================================ */

(function () {
  'use strict';

  /* ▼▼▼ GA4 측정 ID (4개 랜딩 공통 단일 속성) ▼▼▼ */
  var GA4_ID = 'G-0MH9230B7L';
  /* ▲▲▲ 여기만 바뀌면 전체 전송 대상이 바뀝니다 ▲▲▲ */

  /* ---- 컨셉(랜딩 정체) 판별 : HTML이 <head>에서 선언한 window.SITE_ID 를 그대로 사용 ----
     ★ 이 값이 DB(site 컬럼)와 GA(concept)를 동일하게 맞추는 유일한 기준점입니다.
       각 HTML <head> 에 tracking.js 보다 먼저 다음 한 줄이 있어야 함:
         <script>window.SITE_ID = 'fr-xxx';</script>
       도메인 문자열을 추측하지 않으므로, 도메인이 몇 개든/바뀌든 영향 없음.
     ── 안전장치: SITE_ID 선언을 깜빡한 경우에만 예전 도메인 추측으로 폴백(+콘솔 경고) ── */
  var CONCEPT = (typeof window.SITE_ID === 'string' && window.SITE_ID) ? window.SITE_ID : (function () {
    var host = (location.hostname || '').toLowerCase();
    var guess =
        host.indexOf('familyprotection') > -1 ? 'protection' :
        host.indexOf('soho')             > -1 ? 'soho_answering' :
        host.indexOf('factcheck')        > -1 ? 'factcheck' :
        host.indexOf('ai-call-assistant')> -1 ? 'ai_call_assistant' :
        'unknown';
    console.warn('[tracking] window.SITE_ID 미선언 → 도메인 추측값(' + guess + ') 사용. HTML <head>에 SITE_ID 선언을 추가하세요.');
    return guess;
  })();

  var idReady = /^G-[A-Z0-9]+$/i.test(GA4_ID) && GA4_ID !== 'G-XXXXXXXXXX';

  /* ---- GA4(gtag) 로드 : ID가 준비됐을 때만 ---- */
  window.dataLayer = window.dataLayer || [];
  function gtag(){ window.dataLayer.push(arguments); }

  if (idReady) {
    var s = document.createElement('script');
    s.async = true;
    s.src = 'https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(GA4_ID);
    document.head.appendChild(s);

    gtag('js', new Date());
    /* config 에도 concept 를 기본값으로 실어두면 page_view 에도 concept 가 붙음 */
    gtag('config', GA4_ID, { concept: CONCEPT });
  } else {
    console.warn('[tracking] GA4 측정 ID가 아직 없습니다. 이벤트는 콘솔에만 기록됩니다.');
  }

  /* ---- 이벤트 전송 헬퍼 : 모든 이벤트에 concept 자동 부착 ---- */
  function sendEvent(name, params) {
    params = params || {};
    params.concept = CONCEPT;
    if (idReady && typeof gtag === 'function') {
      gtag('event', name, params);
    }
    console.log('[tracking] ' + name, params);
  }

  /* ---- 페이지에서 실행 ---- */
  function init() {

    /* 1) CTA 클릭 : href가 #survey 로 가는 모든 버튼/링크 */
    document.querySelectorAll('a[href="#survey"]').forEach(function (el) {
      el.addEventListener('click', function () {
        sendEvent('cta_click', {
          location: el.closest('.mobile-sticky') ? 'sticky'
                  : el.closest('.hero')          ? 'hero'
                  : el.closest('.header')        ? 'header'
                  : el.closest('.final-cta')     ? 'final'
                  : 'other'
        });
      });
    });

    /* 2) 설문 시작 : 설문 영역 안의 옵션(.option)을 처음 누른 순간 1회만 */
    var surveyStarted = false;
    var surveyRoot = document.getElementById('survey');
    if (surveyRoot) {
      surveyRoot.addEventListener('click', function (e) {
        var opt = e.target.closest('.option');
        if (opt && !surveyStarted) {
          surveyStarted = true;
          sendEvent('survey_start', {});
        }
      });
    }

    /* 3) 설문 완료 : 성공 화면(#surveySuccess)이 표시되는 순간 감지
          - 템플릿은 완료 시 #surveySuccess 에 'show' 클래스를 추가함
          - 그 변화를 MutationObserver 로 관찰해 1회만 전송 */
    var success = document.getElementById('surveySuccess');
    if (success && 'MutationObserver' in window) {
      var fired = false;
      var mo = new MutationObserver(function () {
        if (!fired && success.classList.contains('show')) {
          fired = true;

          /* 완료 시점에 사용자가 고른 답을 함께 전송
             (요약 화면 #surveySummary 의 값들을 읽어 담음) */
          var params = { language: document.documentElement.lang || 'ko' };
          try {
            var rows = document.querySelectorAll('#surveySummary .summary-row');
            rows.forEach(function (row, i) {
              var val = row.querySelector('strong');
              if (val) params['answer_' + (i + 1)] = val.textContent.trim().slice(0, 90);
            });
          } catch (err) { /* 요약 못 읽어도 완료 자체는 기록 */ }

          sendEvent('survey_complete', params);
        }
      });
      mo.observe(success, { attributes: true, attributeFilter: ['class'] });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
