(function () {
  'use strict';
  var BS = window.BeamSections, KEY = 'bbs-beam-sections-v2', OLD_KEY = 'bbs-beam-sections-v1';
  var $ = function (s) { return document.querySelector(s); };
  /** Settings tabs: [id, label]; each group in the form names its tab in data-tab. */
  var TABS = [['geo', 'Geometry'], ['bars', 'Main bars'], ['top', 'Top bars'], ['bot', 'Bottom bars'], ['anch', 'Anchorage'], ['links', 'Links'], ['checks', 'Checks'], ['sheet', 'Sheet']];
  var vals = load();
  $('#ver').textContent = BS.VERSION;

