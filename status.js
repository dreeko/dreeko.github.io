/* status.js — fill in the live status pills on dreeko.space.
 *
 * The service list itself is static HTML, so the page is a complete, useful directory
 * with JavaScript disabled or before this file loads. This only ever *adds* status.
 *
 * The data comes from status.dreeko.space, a tiny JSON file written every 60s by a
 * systemd timer on the edge VPS. The page is on GitHub Pages deliberately: every service
 * listed here is proxied through that same VPS, so a board hosted alongside them would go
 * dark in precisely the outage it exists to report.
 *
 * The failure this guards hardest against is not "red" -- it is stale green. A frozen
 * feed that keeps rendering yesterday's success is worse than no board at all, so
 * anything older than STALE_AFTER collapses the whole board to "unknown".
 */
(function () {
  'use strict';

  var FEED = 'https://status.dreeko.space/status.json';
  var REFRESH_MS = 60000;
  var STALE_MULTIPLIER = 3; // tolerate a couple of missed ticks, then stop trusting it

  var bar = document.getElementById('bar');
  var headline = document.getElementById('headline');
  var meta = document.getElementById('meta');

  function ago(seconds) {
    if (seconds < 10) return 'just now';
    if (seconds < 60) return Math.round(seconds) + 's ago';
    if (seconds < 3600) return Math.round(seconds / 60) + 'm ago';
    if (seconds < 86400) return Math.round(seconds / 3600) + 'h ago';
    return Math.round(seconds / 86400) + 'd ago';
  }

  function setAll(status, pillText) {
    var nodes = document.querySelectorAll('li.svc');
    for (var i = 0; i < nodes.length; i++) {
      nodes[i].setAttribute('data-status', status);
      var pill = nodes[i].querySelector('.pill');
      if (pill) pill.textContent = pillText;
    }
  }

  function render(data) {
    var nowSec = Date.now() / 1000;
    var age = nowSec - (data.generated_unix || 0);
    var interval = data.interval_seconds || 60;

    // Stale feed: the prober died, or the edge is wedged in a way that still serves
    // the last file. Refuse to present old results as current.
    if (age > interval * STALE_MULTIPLIER) {
      bar.setAttribute('data-state', 'unknown');
      headline.textContent = 'Status unknown';
      meta.textContent = 'feed last updated ' + ago(age) + ' — treating it as stale';
      setAll('unknown', 'unknown');
      return;
    }

    var services = data.services || [];
    var down = 0;

    for (var i = 0; i < services.length; i++) {
      var s = services[i];
      var li = document.querySelector('li.svc[data-id="' + s.id + '"]');
      if (!li) continue;
      li.setAttribute('data-status', s.ok ? 'up' : 'down');
      var pill = li.querySelector('.pill');
      if (pill) {
        pill.textContent = s.ok
          ? 'up · ' + s.code + ' · ' + s.ms + 'ms'
          : 'down · ' + (s.code === 0 ? 'no response' : 'HTTP ' + s.code + ', expected ' + s.expect);
      }
      if (!s.ok) down++;
    }

    if (down === 0) {
      bar.setAttribute('data-state', 'up');
      headline.textContent = 'All systems nominal';
    } else {
      bar.setAttribute('data-state', 'down');
      headline.textContent = down + ' of ' + services.length + ' service' +
        (services.length === 1 ? '' : 's') + ' down';
    }
    meta.textContent = 'checked ' + ago(age) + ' from ' + (data.probed_from || 'the edge');
  }

  function unreachable() {
    // Everything on this page is proxied through the host that serves the feed, so
    // failing to reach it is itself strong evidence, not merely an absence of data.
    bar.setAttribute('data-state', 'unknown');
    headline.textContent = 'Status feed unreachable';
    meta.textContent = 'every service here sits behind that endpoint — assume they are down too';
    setAll('unknown', 'unreachable');
  }

  function poll() {
    fetch(FEED, { cache: 'no-store', mode: 'cors' })
      .then(function (r) {
        if (!r.ok) throw new Error('HTTP ' + r.status);
        return r.json();
      })
      .then(render)
      .catch(unreachable);
  }

  poll();
  setInterval(poll, REFRESH_MS);

  // A tab left open for hours shouldn't show an hours-old board on return.
  document.addEventListener('visibilitychange', function () {
    if (!document.hidden) poll();
  });
})();
