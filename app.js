(function(){
  document.documentElement.classList.add('js');

  // Scroll reveals
  var io = 'IntersectionObserver' in window ? new IntersectionObserver(function(es){
    es.forEach(function(e){ if(e.isIntersecting){ e.target.classList.add('in'); io.unobserve(e.target); } });
  },{threshold:.15}) : null;
  document.querySelectorAll('.reveal').forEach(function(el,i){
    el.style.transitionDelay = (i%4)*80+'ms';
    if(io) io.observe(el); else el.classList.add('in');
  });

  // Provisional covered postcode districts (check against borough boundaries before launch)
  var COVERED = ['EN1','EN2','EN3','EN4','EN5','N2','N3','N9','N11','N12','N13','N14','N18','N20','N21','NW4','NW7','NW9','NW11','HA8'];
  function normPC(v){ return (v||'').toUpperCase().replace(/\s+/g,' ').trim(); }
  function pcDistrict(v){ var m = normPC(v).replace(/\s/g,'').match(/^([A-Z]{1,2}\d[A-Z\d]?)(\d[A-Z]{2})$/); return m ? m[1] : null; }
  function formatPC(v){ var s = normPC(v).replace(/\s/g,''); return s.length>3 ? s.slice(0,-3)+' '+s.slice(-3) : s; }

  var ENDPOINT = 'https://lpwchckcpjmelytbqiux.supabase.co/functions/v1/submit-enquiry';
  var UTM = (function(){ var o={}, q=new URLSearchParams(location.search); ['utm_source','utm_medium','utm_campaign','utm_term','utm_content','gclid','fbclid'].forEach(function(k){ var v=q.get(k); if(v) o[k]=v.slice(0,120); }); return o; })();
  function utm(){ return UTM; }
  function post(payload){
    payload.source_url = location.href.slice(0,500); payload.utm = utm();
    var hp = document.getElementById('fw-website'); payload.website = hp ? hp.value : '';
    return fetch(ENDPOINT,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)})
      .then(function(r){ return r.json().catch(function(){return {ok:false};}).then(function(j){ if(!r.ok||!j.ok) throw new Error(j.error||'Sorry, something went wrong. Please try again.'); return j; }); });
  }
  var sending = false;

  var STEPS = [
    {id:'postcode', title:"What's your postcode?", help:"We use this to find builders who cover your area.", type:'postcode'},
    {id:'property', title:"What type of property is it?", type:'choice', options:['Semi-detached','Terraced','End-terrace','Detached','Bungalow','Flat or maisonette']},
    {id:'owner', title:"Do you own the property?", type:'choice', options:['Yes, I live there',"Yes, it's a rental I own",'No, I rent']},
    {id:'loft', title:"What type of loft conversion?", help:"Not sure? That's fine, your builder will advise you.", type:'choice', options:['Dormer','Hip-to-gable','Mansard','Velux or rooflight','Not sure yet']},
    {id:'use', title:"What will the space be used for?", type:'choice', options:['Bedroom','Bedroom + en-suite','Office','Other']},
    {id:'timing', title:"When would you like work to start?", type:'choice', options:['Within 3 months','3–6 months','6–12 months','Just researching']},
    {id:'budget', title:"Roughly what's your budget?", help:"This helps your builder suggest the right options. It isn't a commitment.", type:'choice', options:['Under £30k','£30k–£50k','£50k–£70k','£70k+','Not sure']},
    {id:'planning', title:"Do you have planning permission or drawings?", type:'choice', options:['I have drawings or permission','Not yet','Not sure']},
    {id:'details', title:"Your details", help:"So your matched builder can contact you about your quote.", type:'details'},
    {id:'consent', title:"Check and send", type:'consent'}
  ];

  var modal = document.getElementById('quote');
  var form = document.getElementById('quote-form');
  var body = form.querySelector('.q-body');
  var bar = modal.querySelector('.progress span');
  var count = modal.querySelector('.step-count');
  var backBtn = form.querySelector('[data-back]');
  var nextBtn = form.querySelector('[data-next]');
  var nav = form.querySelector('.q-nav');
  var data = {}, idx = 0, lastFocus = null, endState = null;

  function esc(s){ return String(s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];}); }
  function researching(){ return data.timing === 'Just researching'; }

  function open(pc){
    lastFocus = document.activeElement;
    data = {}; endState = null; idx = 0;
    if(pc){ data.postcode = formatPC(pc); idx = 1; }
    modal.hidden = false; document.body.style.overflow = 'hidden';
    render();
  }
  function close(){
    modal.hidden = true; document.body.style.overflow = '';
    if(lastFocus) lastFocus.focus();
  }

  function render(){
    nav.hidden = false;
    var s = STEPS[idx];
    bar.style.width = ((idx+1)/STEPS.length*100)+'%';
    count.textContent = 'Step '+(idx+1)+' of '+STEPS.length;
    backBtn.style.visibility = idx===0 ? 'hidden' : 'visible';
    nextBtn.textContent = s.type==='consent' ? (researching() ? 'Send me the cost guide' : 'Get my quote') : 'Continue';
    var h = '<h2 id="q-title" tabindex="-1">'+esc(s.title)+'</h2>' + (s.help ? '<p class="q-help">'+esc(s.help)+'</p>' : '');
    if(s.type==='postcode'){
      h += '<label class="field"><span>Postcode</span><input name="postcode" autocomplete="postal-code" placeholder="e.g. EN2 6XX" value="'+esc(data.postcode||'')+'" style="text-transform:uppercase"></label>';
    } else if(s.type==='choice'){
      h += '<div class="opts" role="radiogroup">'+s.options.map(function(o){
        return '<label class="opt"><input type="radio" name="'+s.id+'" value="'+esc(o)+'"'+(data[s.id]===o?' checked':'')+'>'+esc(o)+'</label>';
      }).join('')+'</div>';
    } else if(s.type==='details'){
      var d = data.details||{};
      h += '<div class="row2"><label class="field"><span>First name</span><input name="first" autocomplete="given-name" value="'+esc(d.first||'')+'"></label>'
        +'<label class="field"><span>Surname</span><input name="last" autocomplete="family-name" value="'+esc(d.last||'')+'"></label></div>'
        +'<label class="field"><span>Mobile</span><input name="mobile" type="tel" autocomplete="tel" placeholder="07..." value="'+esc(d.mobile||'')+'"></label>'
        +'<label class="field"><span>Email</span><input name="email" type="email" autocomplete="email" value="'+esc(d.email||'')+'"></label>'
        +'<p class="field"><span>Best time to call</span></p><div class="opts" style="grid-template-columns:repeat(3,1fr);margin-top:.35rem">'
        +['Morning','Afternoon','Evening'].map(function(t){return '<label class="opt"><input type="radio" name="calltime" value="'+t+'"'+(d.calltime===t?' checked':'')+'>'+t+'</label>';}).join('')+'</div>';
    } else if(s.type==='consent'){
      if(researching()){
        h += '<div class="consent-box">You told us you\'re just researching, so we won\'t pass your details to a builder. We\'ll email you our free loft conversion cost guide instead. You can ask for a quote whenever you\'re ready.</div>'
          +'<label class="check"><input type="checkbox" name="guide"> Email me the free cost guide and occasional loft planning tips. I can unsubscribe at any time. (required)</label>';
      } else {
        h += '<div class="consent-box"><strong>Who will contact you:</strong> By submitting, you ask Fairwright to pass your details to one vetted loft conversion firm covering your postcode. They\'ll contact you by phone, email or text about your loft conversion quote. See our <a href="#">privacy notice</a>.'
          +'<span class="note">Before launch: the names of the partner firms in your area will be listed here.</span></div>'
          +'<label class="check"><input type="checkbox" name="share"> I agree to my details being shared with this firm so they can contact me about my quote. (required)</label>'
          +'<label class="check"><input type="checkbox" name="tips"> Send me occasional loft planning tips by email. I can unsubscribe at any time. (optional)</label>';
      }
    }
    h += '<p class="q-error" aria-live="polite"></p>';
    body.innerHTML = h;
    var first = body.querySelector('input'); 
    var title = body.querySelector('#q-title');
    (first && s.type!=='choice' ? first : title).focus();
    if(s.type==='choice'){
      body.querySelectorAll('input[type=radio]').forEach(function(r){
        r.addEventListener('change',function(){ setTimeout(next,180); });
      });
    }
  }

  function err(msg){ body.querySelector('.q-error').textContent = msg; }

  function next(){
    var s = STEPS[idx];
    if(s.type==='postcode'){
      var v = body.querySelector('[name=postcode]').value;
      if(!/^[A-Z]{1,2}\d[A-Z\d]?\d[A-Z]{2}$/.test(normPC(v).replace(/\s/g,''))) return err('Please enter a full UK postcode, like EN2 6XX.');
      data.postcode = formatPC(v);
      if(COVERED.indexOf(pcDistrict(v))<0) return finish('outside');
    } else if(s.type==='choice'){
      var c = body.querySelector('input[name='+s.id+']:checked');
      if(!c) return err('Please choose an option.');
      data[s.id] = c.value;
      if(s.id==='property' && c.value==='Flat or maisonette') return finish('flat');
      if(s.id==='owner' && c.value==='No, I rent') return finish('tenant');
    } else if(s.type==='details'){
      var g = function(n){ return (body.querySelector('[name='+n+']').value||'').trim(); };
      var d = {first:g('first'), last:g('last'), mobile:g('mobile').replace(/[\s()-]/g,''), email:g('email')};
      var ct = body.querySelector('[name=calltime]:checked'); d.calltime = ct ? ct.value : '';
      if(!d.first || !d.last) return err('Please enter your first name and surname.');
      if(!/^(\+447|07)\d{9}$/.test(d.mobile)) return err('Please enter a UK mobile number, like 07700 900123.');
      if(!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(d.email)) return err('Please enter a valid email address.');
      if(!d.calltime) return err('Please choose the best time to call.');
      data.details = d;
    } else if(s.type==='consent'){
      if(researching()){
        if(!body.querySelector('[name=guide]').checked) return err('Please tick the box so we can email you the guide.');
        data.consent = {guide:true};
      } else {
        if(!body.querySelector('[name=share]').checked) return err('Please tick the first box so we can pass your details to the firm.');
        data.consent = {share:true, tips:body.querySelector('[name=tips]').checked};
      }
      if(sending) return;
      sending = true; nextBtn.disabled = true; backBtn.disabled = true; var lbl = nextBtn.textContent; nextBtn.textContent = 'Sending…'; err('');
      post({type:'enquiry', postcode:data.postcode, property:data.property, owner:data.owner, loft:data.loft, use:data.use, timing:data.timing, budget:data.budget, planning:data.planning, details:data.details, consent:data.consent})
        .then(function(){ finish('done'); })
        .catch(function(e){ err((e && e.message) || 'Sorry, something went wrong. Please check your connection and try again.'); nextBtn.textContent = lbl; })
        .then(function(){ sending = false; nextBtn.disabled = false; backBtn.disabled = false; });
      return;
    }
    idx++; render();
  }

  function grade(){
    if(researching()) return 'Researching: not sold, sent the cost guide';
    if(data.timing==='6–12 months') return 'Warm: sent to firm, lower price';
    return 'Hot: sent instantly, billable';
  }

  function finish(kind){
    endState = kind; nav.hidden = true;
    bar.style.width = '100%'; count.textContent = '';
    var h = '<div class="done">';
    if(kind==='outside'){
      h += '<h2 id="q-title" tabindex="-1">We\'re not in your area yet</h2><p class="q-help">Fairwright currently covers Enfield and Barnet, and '+esc(data.postcode)+' is outside our area. We\'re adding new areas soon.</p>'
        +'<label class="field"><span>Email me when you reach my area</span><input type="email" name="notify" placeholder="you@example.com"></label>'
        +'<div style="margin-top:1rem;display:flex;gap:.75rem;flex-wrap:wrap"><button type="button" class="btn" data-notify>Notify me</button><button type="button" class="link-btn" data-restart>Try another postcode</button></div><p class="q-error" aria-live="polite"></p>';
    } else if(kind==='flat'){
      h += '<h2 id="q-title" tabindex="-1">We can\'t help with flats just yet</h2><p class="q-help">Converting the loft above a flat usually needs the freeholder\'s permission, and often the agreement of other leaseholders. Our builders currently only take on houses and bungalows. If you own the freehold, we\'d suggest speaking to your freeholder or a surveyor first.</p>'
        +'<button type="button" class="btn" data-close-end>Back to the site</button>';
    } else if(kind==='tenant'){
      h += '<h2 id="q-title" tabindex="-1">You\'ll need the owner\'s go-ahead</h2><p class="q-help">A loft conversion has to be arranged by the property owner. If your landlord is interested, they\'re very welcome to get a quote through Fairwright.</p>'
        +'<button type="button" class="btn" data-close-end>Back to the site</button>';
    } else {
      var d = data.details;
      if(researching()){
        h += '<div class="tick"></div><h2 id="q-title" tabindex="-1">Thanks '+esc(d.first)+', your cost guide is on its way</h2><p class="q-help">We\'ll email it to '+esc(d.email)+'. We haven\'t passed your details to any builder. When you\'re ready for a quote, just come back and choose a start date.</p>';
      } else {
        h += '<div class="tick"></div><h2 id="q-title" tabindex="-1">Thanks '+esc(d.first)+', we\'re matching you now</h2>'
          +'<p class="q-help">Here\'s what happens next:</p><ul>'
          +'<li>We\'ve emailed you a confirmation. We\'ll also email you the name of the vetted firm you\'ve been matched with.</li>'
          +'<li>They\'ll call you in the '+esc(d.calltime.toLowerCase())+', usually within one working day, to arrange a survey.</li>'
          +'<li>After the survey they\'ll give you a written quote. There\'s no obligation to go ahead.</li></ul>';
      }
      h += ''
        +'<div style="margin-top:1.25rem"><button type="button" class="btn" data-close-end>Back to the site</button></div>';
    }
    h += '</div>';
    body.innerHTML = h;
    body.querySelector('#q-title').focus();
  }

  // Events
  form.addEventListener('submit',function(e){ e.preventDefault(); if(!endState) next(); });
  backBtn.addEventListener('click',function(){ if(idx>0){ idx--; render(); } });
  modal.addEventListener('click',function(e){
    var t = e.target;
    if(t===modal || t.closest('[data-close]') || t.closest('[data-close-end]')) return close();
    if(t.closest('[data-restart]')){ data={}; endState=null; idx=0; render(); return; }
    if(t.closest('[data-notify]')){
      var v = body.querySelector('[name=notify]').value.trim();
      var er = body.querySelector('.q-error');
      if(!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v)){ er.textContent='Please enter a valid email address.'; return; }
      var nb = t.closest('[data-notify]'); if(nb.disabled) return; nb.disabled = true; nb.textContent = 'Sending…'; er.textContent='';
      post({type:'waitlist', email:v, postcode:data.postcode}).then(function(){
        body.querySelector('.done').innerHTML = '<div class="tick"></div><h2 id="q-title" tabindex="-1">Thanks, we\'ll be in touch</h2><p class="q-help">We\'ll email '+esc(v)+' when Fairwright reaches your area.</p><button type="button" class="btn" data-close-end>Back to the site</button>';
        body.querySelector('#q-title').focus();
      }).catch(function(e){ er.textContent = (e && e.message) || 'Sorry, something went wrong. Please try again.'; nb.disabled = false; nb.textContent = 'Notify me'; });
    }
  });
  document.addEventListener('keydown',function(e){ if(e.key==='Escape' && !modal.hidden) close(); });

  document.querySelectorAll('[data-open-form]').forEach(function(b){ b.addEventListener('click',function(){ open(); }); });
  document.querySelectorAll('[data-postcode-start]').forEach(function(f){
    f.addEventListener('submit',function(e){
      e.preventDefault();
      var inp = f.querySelector('input'), er = f.querySelector('.pc-error');
      var v = normPC(inp.value).replace(/\s/g,'');
      if(!/^[A-Z]{1,2}\d[A-Z\d]?\d[A-Z]{2}$/.test(v)){ er.textContent='Please enter a full UK postcode, like EN2 6XX.'; inp.focus(); return; }
      er.textContent='';
      if(COVERED.indexOf(pcDistrict(v))<0){ open(); data.postcode = formatPC(v); finish('outside'); return; }
      open(v);
    });
  });
})();
