/* BBS Studio UI - v0.15.0 : BarWin brand : 51A hooks to the standard bend : compact bar shapes : beams, step 1: read the beam workbook, prove its totals, schedule and cost : closed links hooked at 135 degrees by default; vector PDF shop drawings : PDF downloads (standard form, full data, BOQ and cost) on A4 : real view (true sizes) and presentation view (uniform link and bar sizes), both in all four presentations : the approved shape-code figures, one engine for screen, drawings and DXF; four bar presentations */
(function () {
  'use strict';
  var B = window.BBS, esc = B.esc;
  function $(s, r) { return (r || document).querySelector(s); }
  function all(s, fn) { Array.prototype.forEach.call(document.querySelectorAll(s), fn); }
  var KEY = 'bbs-studio.walls.v7', OLDKEYS = ['bbs-studio.walls.v6', 'bbs-studio.walls.v5'], THEME_KEY = 'bbs-studio.theme';
  var TPL = $('#dxf-template').textContent.replace(/^\s*\n/, ''), MSP = $('#dxf-template').getAttribute('data-msp');
  var st = { p: null, c: null, plan: null, K: null, sel: 0, tab: 'review', view: 'dwg', zoom: 'fit', mode3: 'sel', solid: true, form: false, onlySel: false, pristine: true, hi: null, form: 'std', bar2d: 'outline', size2d: 'real' };
  var TABS = [['review', 'Review'], ['members', 'Members'], ['bbs', 'Schedule'], ['shapes', 'Shape codes'], ['cost', 'BOQ and cost'], ['rules', 'Rules'], ['out', 'Downloads']];

