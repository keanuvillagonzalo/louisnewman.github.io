/* Contact form: submits in the background and shows the result in place.
 * Without JavaScript the form still works as a normal POST to its action URL. */
(function () {
  'use strict';

  var form = document.getElementById('contact-form');
  var statusEl = document.getElementById('contact-status');
  if (!form || !statusEl) return;

  var button = form.querySelector('button[type="submit"]');
  var EMAIL = 'coach@thinkingcritically.us';

  function show(message, isError) {
    statusEl.textContent = '';
    statusEl.appendChild(document.createTextNode(message));
    if (isError) {
      statusEl.appendChild(document.createTextNode(' You can also email '));
      var a = document.createElement('a');
      a.href = 'mailto:' + EMAIL;
      a.textContent = EMAIL;
      statusEl.appendChild(a);
      statusEl.appendChild(document.createTextNode('.'));
    }
    statusEl.classList.toggle('is-error', !!isError);
    statusEl.hidden = false;
    statusEl.focus();
  }

  form.addEventListener('submit', function (e) {
    // Native required/email validation has already passed if this event fires.
    e.preventDefault();

    var data = new FormData(form);

    // Spam trap filled in: pretend it worked, send nothing.
    if (data.get('_gotcha')) {
      form.reset();
      show('Thank you! Your message has been sent.', false);
      return;
    }

    if (/YOUR_FORM_ID/.test(form.action)) {
      show('This form is not connected yet, so your message was not sent.', true);
      return;
    }

    button.disabled = true;
    button.setAttribute('aria-busy', 'true');
    var label = button.textContent;
    button.textContent = 'Sending…';

    fetch(form.action, {
      method: 'POST',
      body: data,
      headers: { Accept: 'application/json' }
    })
      .then(function (res) {
        if (!res.ok) throw new Error('HTTP ' + res.status);
        form.reset();
        show('Thank you! Your message has been sent.', false);
      })
      .catch(function () {
        show('Sorry, something went wrong and your message was not sent.', true);
      })
      .then(function () {
        button.disabled = false;
        button.removeAttribute('aria-busy');
        button.textContent = label;
      });
  });
})();
