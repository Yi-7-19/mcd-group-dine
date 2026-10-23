(() => {
  'use strict';
  const summaryBreakdown = document.querySelector('.summary-breakdown');
  if (summaryBreakdown && matchMedia('(max-width: 640px)').matches) summaryBreakdown.open = false;
  const status = document.getElementById('action-status');
  let statusTimer;
  function announce(message) {
    clearTimeout(statusTimer);
    status.hidden = false;
    status.textContent = message;
    statusTimer = setTimeout(() => { status.hidden = true; }, 5000);
  }
  const copyButtons = [...document.querySelectorAll('[data-copy]')];
  const manual = document.getElementById('manual-copy');
  const copyText = document.getElementById('copy-text');
  const billText = JSON.parse(document.getElementById('bill-copy-data').textContent);
  copyText.value = billText;
  function legacyCopy() {
    const previous = document.activeElement;
    const y = window.scrollY;
    manual.hidden = false;
    copyText.focus({preventScroll:true});
    copyText.select();
    const copied = document.execCommand && document.execCommand('copy');
    if (copied) {
      manual.hidden = true;
      previous?.focus({preventScroll:true});
      window.scrollTo({top:y,behavior:'instant'});
    }
    return Boolean(copied);
  }
  async function copyBill(event) {
    const trigger = event.currentTarget;
    copyButtons.forEach(button => { button.disabled = true; button.setAttribute('aria-busy','true'); });
    announce('正在复制分账清单…');
    try {
      let copied = false;
      if (navigator.clipboard?.writeText) {
        try { await navigator.clipboard.writeText(billText); copied = true; } catch { /* file or permission fallback */ }
      }
      if (!copied) { try { copied = legacyCopy(); } catch { copied = false; } }
      if (copied) { manual.hidden = true; announce('分账清单已复制，可以粘贴分享。'); }
      else {
        manual.hidden = false;
        copyText.focus({preventScroll:true});
        copyText.scrollIntoView({block:'center',behavior:'instant'});
        copyText.select();
        announce('自动复制未完成，请在下方手动复制清单。');
      }
    } finally {
      copyButtons.forEach(button => { button.disabled = false; button.removeAttribute('aria-busy'); });
      if (manual.hidden) trigger.focus({preventScroll:true});
    }
  }
  copyButtons.forEach(button => button.addEventListener('click',copyBill));
  document.getElementById('close-manual').addEventListener('click',() => {
    manual.hidden = true;
    copyButtons[0]?.focus({preventScroll:true});
  });
  const printButtons = [...document.querySelectorAll('[data-print]')];
  let printDetails = [];
  let printTrigger = null;
  function preparePrint() {
    if (!printDetails.length) printDetails = [...document.querySelectorAll('details')].map(element => ({element,open:element.open}));
    printDetails.forEach(({element}) => { element.open = true; });
  }
  function finishPrint() {
    printDetails.forEach(({element,open}) => { element.open = open; });
    printDetails = [];
    printButtons.forEach(button => { button.disabled=false; button.removeAttribute('aria-busy'); });
    printTrigger?.focus({preventScroll:true});
    printTrigger = null;
  }
  window.addEventListener('beforeprint',preparePrint);
  window.addEventListener('afterprint',finishPrint);
  printButtons.forEach(button => button.addEventListener('click',() => {
    printTrigger = button;
    button.disabled=true;button.setAttribute('aria-busy','true');
    preparePrint();
    try {
      if (typeof window.print !== 'function') throw new Error('print unavailable');
      window.print();
      announce('已打开系统打印流程，可选择打印或保存为 PDF。');
    } catch {
      announce('暂时无法打开打印，请尝试浏览器菜单中的打印功能。');
    } finally { finishPrint(); }
  }));
  const nav = [...document.querySelectorAll('.nav a')];
  document.querySelectorAll('a[href^="#"]').forEach(link => link.addEventListener('click',() => {
    const target = document.getElementById(link.getAttribute('href').slice(1));
    if (target?.hasAttribute('tabindex')) setTimeout(() => target.focus({preventScroll:true}),0);
  }));
  if ('IntersectionObserver' in window) {
    const sections = nav.map(link => document.querySelector(link.getAttribute('href'))).filter(Boolean);
    const observer = new IntersectionObserver(entries => {
      const visible = entries.filter(entry => entry.isIntersecting).sort((a,b) => a.boundingClientRect.top-b.boundingClientRect.top)[0];
      if (!visible) return;
      nav.forEach(link => {
        if (link.hash === '#' + visible.target.id) link.setAttribute('aria-current','location');
        else link.removeAttribute('aria-current');
      });
    },{rootMargin:'-15% 0px -55% 0px',threshold:0});
    sections.forEach(section => observer.observe(section));
  }
})();
