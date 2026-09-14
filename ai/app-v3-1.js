
const views = document.querySelectorAll('.view');
const navItems = document.querySelectorAll('.nav-item:not(.locked)');

function openView(name){
  views.forEach(v => v.classList.toggle('active', v.id === `view-${name}`));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.toggle('active', n.dataset.view === name));
  window.scrollTo({top:0, behavior:'smooth'});
}
navItems.forEach(n => n.addEventListener('click', () => openView(n.dataset.view)));
document.querySelectorAll('[data-open]').forEach(b => b.addEventListener('click', () => openView(b.dataset.open)));

document.getElementById('architectureBtn').addEventListener('click', () => {
  document.getElementById('architecture').scrollIntoView({behavior:'smooth'});
});

const input = document.getElementById('sentimentInput');
const count = document.getElementById('charCount');
input.addEventListener('input', () => count.textContent = `${input.value.length} / 1600`);

const emptyResult = document.getElementById('emptyResult');
const loadingResult = document.getElementById('loadingResult');
const finalResult = document.getElementById('finalResult');
const errorResult = document.getElementById('errorResult');
const loadingTitle = document.getElementById('loadingTitle');
const loadingText = document.getElementById('loadingText');
const modelState = document.getElementById('modelState');
const analyzeBtn = document.getElementById('analyzeBtn');
const retryBtn = document.getElementById('retryBtn');

let classifier = null;
let pipelineLoader = null;

function showOnly(target){
  [emptyResult,loadingResult,finalResult,errorResult].forEach(el => el.classList.add('hidden'));
  target.classList.remove('hidden');
}

async function getClassifier(){
  if(classifier) return classifier;
  if(!pipelineLoader){
    pipelineLoader = import('https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.7.2')
      .then(async mod => {
        modelState.textContent = 'Loading transformer model';
        loadingText.textContent = 'Downloading the sentiment model for browser inference…';
        return await mod.pipeline(
          'sentiment-analysis',
          'Xenova/distilbert-base-uncased-finetuned-sst-2-english'
        );
      });
  }
  classifier = await pipelineLoader;
  modelState.textContent = 'Model ready';
  return classifier;
}

async function analyze(){
  const text = input.value.trim();
  if(!text){
    input.focus();
    return;
  }
  analyzeBtn.disabled = true;
  analyzeBtn.textContent = 'Analyzing…';
  showOnly(loadingResult);
  loadingTitle.textContent = classifier ? 'Running inference…' : 'Loading AI model…';
  loadingText.textContent = classifier ? 'Analyzing your text locally in the browser.' : 'First run downloads model files. This can take a moment.';

  try{
    const model = await getClassifier();
    loadingTitle.textContent = 'Running inference…';
    loadingText.textContent = 'Analyzing your text locally in the browser.';
    const result = await model(text);
    const best = result[0];
    const label = String(best.label || '').toUpperCase();
    const score = Number(best.score || 0);

    const badge = document.getElementById('sentimentBadge');
    badge.textContent = label;
    badge.classList.toggle('negative', label.includes('NEGATIVE'));
    document.getElementById('confidenceValue').textContent = `${(score*100).toFixed(1)}%`;
    document.getElementById('confidenceBar').style.width = `${Math.max(0,Math.min(100,score*100))}%`;
    modelState.textContent = 'Browser AI · ready';
    showOnly(finalResult);
  }catch(err){
    console.error(err);
    modelState.textContent = 'Model unavailable';
    document.getElementById('errorText').textContent =
      'The browser AI model could not be loaded. Check your internet connection and open the prototype through a local web server rather than file:// if your browser blocks module loading.';
    showOnly(errorResult);
  }finally{
    analyzeBtn.disabled = false;
    analyzeBtn.textContent = 'Analyze with AI';
  }
}
analyzeBtn.addEventListener('click', analyze);
retryBtn.addEventListener('click', analyze);


const researchTopic = document.getElementById('researchTopic');
const buildResearchBtn = document.getElementById('buildResearchBtn');
const researchEmpty = document.getElementById('researchEmpty');
const researchResult = document.getElementById('researchResult');
const copyResearchBtn = document.getElementById('copyResearchBtn');
const clearResearchBtn = document.getElementById('clearResearchBtn');

function topicKeywords(topic){
  return topic.toLowerCase()
    .replace(/[^\p{L}\p{N}\s-]/gu,' ')
    .split(/\s+/)
    .filter(w => w.length > 3)
    .slice(0,8);
}

function buildQuestions(topic, depth, style){
  const base = [
    `What is the current state of "${topic}"?`,
    `What are the main drivers, mechanisms, or causes behind this topic?`,
    `What measurable evidence would support or contradict the strongest claims?`,
    `Who are the key stakeholders, institutions, firms, or researchers involved?`,
    `What are the main risks, limitations, counterarguments, or unresolved questions?`
  ];
  if(depth === 'deep'){
    base.push(
      `How has the topic changed over time, and which turning points matter most?`,
      `How do findings differ across countries, sectors, populations, or methodologies?`,
      `Which datasets, benchmarks, or primary documents could independently validate the conclusions?`
    );
  } else if(depth === 'quick'){
    return base.slice(0,3);
  }
  if(style === 'market') base.push(`What are the market size, adoption, competitive, and business-model implications?`);
  if(style === 'technical') base.push(`What technical architecture, performance constraints, and implementation trade-offs matter?`);
  if(style === 'academic') base.push(`What does the peer-reviewed literature agree on, and where is the evidence mixed?`);
  return base;
}

function sourceSet(style){
  if(style === 'academic'){
    return ['Peer-reviewed papers','Working papers','Systematic reviews','Official statistics','Primary datasets','Institutional reports'];
  }
  if(style === 'market'){
    return ['Company filings','Investor reports','Industry data','Official statistics','Regulator publications','High-quality financial press'];
  }
  return ['Official documentation','Technical papers','Benchmarks','GitHub / release notes','Standards bodies','Primary datasets'];
}

function buildResearch(){
  const topic = researchTopic.value.trim();
  if(!topic){ researchTopic.focus(); return; }
  const depth = document.getElementById('researchDepth').value;
  const style = document.getElementById('researchStyle').value;
  const questions = buildQuestions(topic, depth, style);
  const sources = sourceSet(style);
  const kws = topicKeywords(topic);

  document.getElementById('workingThesis').textContent =
    `A useful investigation should test whether the strongest claims around "${topic}" are supported by primary evidence, while separating observed facts from interpretation, forecasts, and stakeholder incentives.`;

  const qList = document.getElementById('coreQuestions');
  qList.innerHTML = '';
  questions.forEach(q => {
    const li = document.createElement('li');
    li.textContent = q;
    qList.appendChild(li);
  });

  const sourceBox = document.getElementById('sourceStrategy');
  sourceBox.innerHTML = '';
  sources.forEach(s => {
    const span = document.createElement('span');
    span.textContent = s;
    sourceBox.appendChild(span);
  });

  const body = document.getElementById('evidenceBody');
  body.innerHTML = '';
  questions.slice(0, Math.min(6,questions.length)).forEach((q, i) => {
    const tr = document.createElement('tr');
    const targets = [
      'Primary source or official dataset',
      'Independent empirical study',
      'Regulatory / institutional publication',
      'Comparable historical evidence',
      'Contradictory or null evidence',
      'Recent benchmark or market data'
    ];
    tr.innerHTML = `<td>${q}</td><td>${i===0?'Current baseline + trend data':'Direct evidence + counter-evidence'}</td><td>${targets[i % targets.length]}</td>`;
    body.appendChild(tr);
  });

  document.getElementById('citationTemplate').textContent =
`CLAIM:
[Write one precise claim]

EVIDENCE:
[Statistic, finding, mechanism, or quotation]

SOURCE:
[Author / institution — title — date]

LINK / IDENTIFIER:
[URL, DOI, report ID, filing, dataset]

WHY IT MATTERS:
[How this evidence changes the answer]

LIMITATION:
[Methodological, sample, date, conflict-of-interest, or scope limitation]

SEARCH KEYWORDS:
${kws.join(', ') || topic}`;

  researchEmpty.classList.add('hidden');
  researchResult.classList.remove('hidden');
}

buildResearchBtn.addEventListener('click', buildResearch);

copyResearchBtn.addEventListener('click', async () => {
  const text = [
    'DAYRIXA RESEARCH WORKSPACE',
    '',
    'Working thesis:',
    document.getElementById('workingThesis').textContent,
    '',
    'Core questions:',
    ...Array.from(document.querySelectorAll('#coreQuestions li')).map((el,i)=>`${i+1}. ${el.textContent}`),
    '',
    'Source strategy:',
    ...Array.from(document.querySelectorAll('#sourceStrategy span')).map(el=>`- ${el.textContent}`),
    '',
    'Citation template:',
    document.getElementById('citationTemplate').textContent
  ].join('\n');
  try{
    await navigator.clipboard.writeText(text);
    copyResearchBtn.textContent = 'Copied';
    setTimeout(()=>copyResearchBtn.textContent='Copy workspace',1200);
  }catch(e){
    copyResearchBtn.textContent = 'Copy failed';
    setTimeout(()=>copyResearchBtn.textContent='Copy workspace',1200);
  }
});

clearResearchBtn.addEventListener('click', () => {
  researchTopic.value = '';
  researchResult.classList.add('hidden');
  researchEmpty.classList.remove('hidden');
  researchTopic.focus();
});


const liveSearchBtn = document.getElementById('liveSearchBtn');
const liveSearchStatus = document.getElementById('liveSearchStatus');
const academicSources = document.getElementById('academicSources');
const sourceCount = document.getElementById('sourceCount');
const exportSourcesBtn = document.getElementById('exportSourcesBtn');

let lastAcademicResults = [];

function escHtml(s=''){
  return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

function stripJats(s=''){
  return String(s)
    .replace(/<[^>]+>/g,' ')
    .replace(/\s+/g,' ')
    .trim();
}

function trimText(s='', n=380){
  const t = stripJats(s);
  return t.length > n ? t.slice(0,n-1).trim() + '…' : t;
}

function yearFromCrossref(item){
  const parts = item?.published?.['date-parts'] || item?.issued?.['date-parts'] || item?.created?.['date-parts'];
  return parts?.[0]?.[0] || '';
}

function normalizeCrossref(item){
  const authors = (item.author || []).map(a => [a.given,a.family].filter(Boolean).join(' ')).filter(Boolean);
  const title = Array.isArray(item.title) ? item.title[0] : item.title;
  const container = Array.isArray(item['container-title']) ? item['container-title'][0] : item['container-title'];
  const doi = item.DOI || '';
  const url = item.URL || (doi ? `https://doi.org/${doi}` : '');
  return {
    provider:'Crossref',
    title:title || 'Untitled work',
    authors,
    year:yearFromCrossref(item),
    venue:container || item.publisher || '',
    doi,
    url,
    abstract:item.abstract ? trimText(item.abstract) : '',
    citedBy: item['is-referenced-by-count'] ?? null,
    workType: item.type || ''
  };
}

function reconstructOpenAlexAbstract(inv){
  if(!inv) return '';
  const pairs = [];
  for(const [word, positions] of Object.entries(inv)){
    for(const p of positions) pairs.push([p, word]);
  }
  pairs.sort((a,b)=>a[0]-b[0]);
  return trimText(pairs.map(x=>x[1]).join(' '));
}

function normalizeOpenAlex(item){
  const authors = (item.authorships || []).map(a => a.author?.display_name).filter(Boolean);
  const loc = item.primary_location || {};
  const src = loc.source || {};
  return {
    provider:'OpenAlex',
    title:item.display_name || item.title || 'Untitled work',
    authors,
    year:item.publication_year || '',
    venue:src.display_name || '',
    doi:(item.doi || '').replace(/^https?:\/\/doi\.org\//,''),
    url:item.doi || item.id || '',
    abstract:reconstructOpenAlexAbstract(item.abstract_inverted_index),
    citedBy:item.cited_by_count ?? null,
    workType:item.type || '',
    isRetracted:Boolean(item.is_retracted),
    hasFulltext:Boolean(item.has_fulltext)
  };
}

function dedupeSources(items){
  const out = [];
  const seen = new Set();
  for(const x of items){
    const key = (x.doi || x.title || '').toLowerCase().replace(/\s+/g,' ').trim();
    if(!key || seen.has(key)) continue;
    seen.add(key);
    out.push(x);
  }
  return out;
}


const STOPWORDS = new Set([
  'a','an','the','and','or','of','to','in','on','for','with','by','from','is','are','was','were',
  'be','been','being','how','what','why','who','which','when','where','this','that','these','those',
  'into','across','through','using','use','used','changing','change','changes'
]);

function tokenizeForRank(text=''){
  return String(text).toLowerCase()
    .normalize('NFKD')
    .replace(/[^\p{L}\p{N}\s-]/gu,' ')
    .split(/\s+/)
    .map(x=>x.trim())
    .filter(x=>x.length>2 && !STOPWORDS.has(x));
}

function relevanceFor(source, query){
  const qTokens = [...new Set(tokenizeForRank(query))];
  if(!qTokens.length) return {score:0, level:'Low', reason:'No usable query terms.'};

  const title = (source.title || '').toLowerCase();
  const abstract = (source.abstract || '').toLowerCase();
  const venue = (source.venue || '').toLowerCase();

  let titleHits = 0, abstractHits = 0, venueHits = 0;
  const matched = [];

  qTokens.forEach(t=>{
    let hit = false;
    if(title.includes(t)){ titleHits++; hit = true; }
    if(abstract.includes(t)){ abstractHits++; hit = true; }
    if(venue.includes(t)){ venueHits++; hit = true; }
    if(hit) matched.push(t);
  });

  const coverage = matched.length / qTokens.length;
  const titleCoverage = titleHits / qTokens.length;
  const abstractCoverage = abstractHits / qTokens.length;
  const venueCoverage = venueHits / qTokens.length;

  // Topical score only. Citation count is intentionally excluded so old/popular papers
  // do not outrank highly relevant new work simply because they have more citations.
  let score = Math.round(
    55 * titleCoverage +
    30 * abstractCoverage +
    5 * venueCoverage +
    10 * coverage
  );

  // Small phrase bonuses for finance/banking/risk/AI concepts when both query and source share them.
  const conceptGroups = [
    ['artificial intelligence','machine learning','ai'],
    ['risk','risk assessment','risk analysis','risk mitigation'],
    ['bank','banks','banking'],
    ['financial','finance']
  ];
  let conceptBonus = 0;
  const qLower = query.toLowerCase();
  const sourceText = `${title} ${abstract} ${venue}`;
  conceptGroups.forEach(group=>{
    const qHas = group.some(p=>qLower.includes(p));
    const sHas = group.some(p=>sourceText.includes(p));
    if(qHas && sHas) conceptBonus += 3;
  });
  score = Math.min(100, score + conceptBonus);

  const level = score >= 75 ? 'High' : score >= 45 ? 'Medium' : 'Low';
  const shown = [...new Set(matched)].slice(0,6);
  const reason = shown.length
    ? `Matched key terms: ${shown.join(', ')}${titleHits ? ` · ${titleHits} in title` : ''}${abstractHits ? ` · ${abstractHits} in abstract` : ''}.`
    : 'Few direct topical matches were detected.';

  return {score, level, reason};
}

function rankSources(items, query){
  return items.map(s=>enrichSourceIntelligence(s, query))
    .sort((a,b)=>{
      if(b.overall.score !== a.overall.score) return b.overall.score - a.overall.score;
      if(b.relevance.score !== a.relevance.score) return b.relevance.score - a.relevance.score;
      return (b.citedBy || 0) - (a.citedBy || 0);
    });
}



function normalizePublicationType(source){
  const raw = (source.workType || '').toLowerCase();
  const venue = (source.venue || '').toLowerCase();
  const doi = (source.doi || '').toLowerCase();

  if(raw === 'journal-article' || raw === 'article') return {label:'Journal Article', class:'formal'};
  if(raw === 'book-chapter' || raw === 'book-chapter') return {label:'Book Chapter', class:'formal'};
  if(raw === 'proceedings-article' || raw === 'proceedings') return {label:'Conference Paper', class:'formal'};
  if(raw === 'posted-content' || raw === 'preprint'){
    if(venue.includes('ssrn') || doi.includes('10.2139/ssrn')) return {label:'Working Paper / SSRN', class:'posted'};
    return {label:'Preprint / Posted Content', class:'posted'};
  }
  if(raw === 'report') return {label:'Report / Working Paper', class:'report'};
  if(raw === 'dissertation') return {label:'Dissertation', class:'other'};
  if(raw === 'book' || raw === 'monograph') return {label:'Book / Monograph', class:'formal'};
  if(raw === 'dataset') return {label:'Dataset', class:'data'};
  return {label: raw ? raw.replace(/-/g,' ').replace(/\b\w/g,c=>c.toUpperCase()) : 'Type unavailable', class:'unknown'};
}

function citationSignal(source){
  const n = Number(source.citedBy || 0);
  if(n >= 100) return {label:'Very high', detail:`${n} citations`};
  if(n >= 25) return {label:'High', detail:`${n} citations`};
  if(n >= 5) return {label:'Moderate', detail:`${n} citations`};
  if(n >= 1) return {label:'Early', detail:`${n} citation${n===1?'':'s'}`};
  return {label:'None / new', detail:'0 citations reported'};
}

function recencySignal(source){
  const y = Number(source.year || 0);
  if(!y) return {label:'Unknown', detail:'Year unavailable'};
  const age = Math.max(0, new Date().getFullYear() - y);
  if(age <= 1) return {label:'Very recent', detail:String(y)};
  if(age <= 3) return {label:'Recent', detail:String(y)};
  if(age <= 7) return {label:'Established', detail:String(y)};
  return {label:'Older', detail:String(y)};
}

function metadataConfidence(source){
  const checks = [
    Boolean(source.doi),
    Boolean(source.venue),
    Boolean(source.authors?.length),
    Boolean(source.abstract),
    Boolean(source.year),
    source.citedBy !== null && source.citedBy !== undefined,
    Boolean(source.workType)
  ];
  const count = checks.filter(Boolean).length;
  const score = Math.round(100 * count / checks.length);
  const level = score >= 85 ? 'High' : score >= 60 ? 'Medium' : 'Low';
  return {score, level};
}

function publicationIntelligence(source){
  return {
    publication: normalizePublicationType(source),
    citation: citationSignal(source),
    recency: recencySignal(source),
    metadata: metadataConfidence(source)
  };
}

function sourceQualityFor(source){
  // Conservative metadata/evidence readiness score; never a truth or peer-review score.
  const intel = publicationIntelligence(source);
  let score = 25;
  const factors = [];

  if(source.doi){ score += 10; factors.push('persistent identifier'); }
  if(source.venue){ score += 8; factors.push('venue metadata'); }
  if(source.authors?.length){ score += 7; factors.push('author metadata'); }
  if(source.abstract){ score += 8; factors.push('abstract metadata'); }
  if(source.year){ score += 5; factors.push('publication year'); }
  if(source.citedBy !== null && source.citedBy !== undefined){ score += 5; factors.push('citation metadata'); }
  if(source.workType){ score += 7; factors.push('publication type'); }

  // Modest publication-type signal only; do not infer peer review.
  if(intel.publication.class === 'formal'){ score += 7; factors.push('formally published type'); }
  else if(intel.publication.class === 'posted'){ factors.push('posted/preprint type'); }

  if(Number(source.citedBy || 0) >= 25){ score += 6; factors.push('substantial citation signal'); }
  else if(Number(source.citedBy || 0) >= 5){ score += 3; factors.push('some citation signal'); }

  if(source.isRetracted){ score = Math.min(score, 20); factors.push('retraction flag'); }

  score = Math.max(0, Math.min(100, score));
  const level = score >= 80 ? 'High metadata readiness' : score >= 60 ? 'Moderate metadata readiness' : 'Limited metadata readiness';
  return {
    score, level,
    reason: factors.length ? `Signals: ${factors.slice(0,7).join(', ')}.` : 'Limited metadata available.',
    factors,
    intelligence:intel
  };
}

function overallResearchFor(relevance, quality){
  // Discovery priority only: topical relevance dominates; metadata readiness is secondary.
  const score = Math.round(0.78 * relevance.score + 0.22 * quality.score);
  const level = score >= 80 ? 'Top discovery lead' : score >= 65 ? 'Strong lead' : score >= 45 ? 'Useful lead' : 'Weak lead';
  return {score, level};
}

function enrichSourceIntelligence(source, query){
  const relevance = relevanceFor(source, query);
  const quality = sourceQualityFor(source);
  const overall = overallResearchFor(relevance, quality);
  return {...source, relevance, quality, overall};
}

function renderSources(items){
  const ranked = rankSources(items, researchTopic.value.trim());
  lastAcademicResults = ranked;
  sourceCount.textContent = ranked.length ? `${ranked.length} source${ranked.length===1?'':'s'} found · ranked by discovery priority` : 'No sources found';
  exportSourcesBtn.disabled = !ranked.length;
  if(typeof synthesizeBtn !== 'undefined') synthesizeBtn.disabled = !ranked.length;
  if(typeof buildClaimsBtn !== 'undefined') buildClaimsBtn.disabled = !ranked.length;
  if(!ranked.length){
    academicSources.innerHTML = '<div class="source-placeholder">No matching scholarly metadata was returned. Try a shorter or more specific research question.</div>';
    return;
  }
  academicSources.innerHTML = ranked.map((s,i)=>{
    const authorText = s.authors?.length ? s.authors.slice(0,5).join(', ') + (s.authors.length>5?' et al.':'') : 'Author metadata unavailable';
    const meta = [authorText, s.year, s.venue].filter(Boolean).join(' · ');
    const links = [];
    if(s.url) links.push(`<a href="${escHtml(s.url)}" target="_blank" rel="noopener">Open source ↗</a>`);
    if(s.doi) links.push(`<a href="https://doi.org/${escHtml(s.doi)}" target="_blank" rel="noopener">DOI ↗</a>`);
    return `<article class="academic-source-card">
      <div class="source-card-top">
        <div class="source-title">${i+1}. ${escHtml(s.title)}</div>
        <div class="score-wrap">
          <span class="score-number">${s.overall.score}/100</span>
          <span class="score-level">${escHtml(s.overall.level)}</span>
          <span class="source-badge">${escHtml(s.provider)}</span>
        </div>
      </div>
      <div class="source-meta">${escHtml(meta)}${s.citedBy!==null ? ` · Cited by ${escHtml(s.citedBy)}`:''}</div>
      <div class="intelligence-grid">
        <div class="intel-chip">
          <div class="intel-label">Discovery Priority</div>
          <div class="intel-value">${s.overall.score}/100 <span class="intel-level">${escHtml(s.overall.level)}</span></div>
        </div>
        <div class="intel-chip">
          <div class="intel-label">Relevance</div>
          <div class="intel-value">${s.relevance.score}/100 <span class="intel-level">${escHtml(s.relevance.level)}</span></div>
        </div>
        <div class="intel-chip">
          <div class="intel-label">Metadata Readiness</div>
          <div class="intel-value">${s.quality.score}/100 <span class="intel-level">${escHtml(s.quality.level)}</span></div>
        </div>
      </div>
      <div class="evidence-intel">
        <div class="evidence-chip"><div class="evidence-label">Publication type</div><div class="evidence-value">${escHtml(s.quality.intelligence.publication.label)}</div></div>
        <div class="evidence-chip"><div class="evidence-label">Citation signal</div><div class="evidence-value">${escHtml(s.quality.intelligence.citation.label)} · ${escHtml(s.quality.intelligence.citation.detail)}</div></div>
        <div class="evidence-chip"><div class="evidence-label">Recency</div><div class="evidence-value">${escHtml(s.quality.intelligence.recency.label)} · ${escHtml(s.quality.intelligence.recency.detail)}</div></div>
        <div class="evidence-chip"><div class="evidence-label">Metadata confidence</div><div class="evidence-value">${s.quality.intelligence.metadata.score}/100 · ${escHtml(s.quality.intelligence.metadata.level)}</div></div>
      </div>
      <div class="relevance-reason"><strong>Relevance:</strong> ${escHtml(s.relevance.reason)}</div>
      <div class="quality-reason"><strong>Evidence metadata:</strong> ${escHtml(s.quality.reason)}</div>
      <div class="caution-note">Publication type and metadata signals do not establish peer review, methodological quality, or truth. Verify the underlying work before citing a claim.</div>
      ${s.quality.factors?.length ? `<div class="quality-breakdown">${s.quality.factors.slice(0,6).map(f=>`<span>${escHtml(f)}</span>`).join('')}</div>` : ''}
      ${s.abstract ? `<div class="source-abstract">${escHtml(s.abstract)}</div>`:''}
      <div class="source-links">${links.join('')}</div>
    </article>`;
  }).join('');
}


const synthesizeBtn = document.getElementById('synthesizeBtn');
const copySynthesisBtn = document.getElementById('copySynthesisBtn');
const synthesisOutput = document.getElementById('synthesisOutput');
const synthesisCount = document.getElementById('synthesisCount');
let lastSynthesisText = '';

function sentenceSplit(text=''){
  return String(text).replace(/\s+/g,' ').trim().split(/(?<=[.!?])\s+/).filter(s=>s.length>35);
}
function informativeSentences(source, query){
  const q=[...new Set(tokenizeForRank(query))];
  return sentenceSplit(source.abstract||'').map(s=>{
    const low=s.toLowerCase();
    const hits=q.filter(t=>low.includes(t));
    return {text:s,hits,score:hits.length};
  }).filter(x=>x.score>0).sort((a,b)=>b.score-a.score);
}
function sharedConcepts(sources, query){
  const q=[...new Set(tokenizeForRank(query))];
  return q.map(t=>({term:t,count:sources.filter(s=>(`${s.title||''} ${s.abstract||''}`).toLowerCase().includes(t)).length}))
    .filter(x=>x.count>=2).sort((a,b)=>b.count-a.count).slice(0,8);
}
function makeSynthesis(){
  const n=Math.min(Number(synthesisCount.value||5),lastAcademicResults.length);
  const sources=lastAcademicResults.slice(0,n);
  const query=researchTopic.value.trim();
  if(!sources.length) return;

  const findings=[];
  sources.forEach((s,i)=>{
    const best=informativeSentences(s,query)[0];
    if(best) findings.push({text:best.text,ref:i+1,title:s.title});
    else findings.push({text:`Metadata identifies this work as topically relevant, but no sufficiently informative abstract sentence was available for synthesis.`,ref:i+1,title:s.title});
  });

  const shared=sharedConcepts(sources,query);
  const agreement=shared.length
    ? `Across the selected records, recurring concepts include ${shared.map(x=>`${x.term} (${x.count}/${n})`).join(', ')}. This indicates thematic overlap, not proof that the studies reach the same empirical conclusion.`
    : `The retrieved abstracts do not provide enough repeated query concepts to infer a clear area of agreement.`;

  const withAbstract=sources.filter(s=>s.abstract).length;
  const types=[...new Set(sources.map(s=>s.quality?.intelligence?.publication?.label).filter(Boolean))];
  const gaps=[];
  if(withAbstract<n) gaps.push(`${n-withAbstract} of ${n} selected records lack usable abstract text.`);
  if(types.some(t=>/Working Paper|Preprint|Posted/i.test(t))) gaps.push('At least one selected source is working-paper/preprint-style material; publication status should be verified.');
  if(sources.some(s=>Number(s.citedBy||0)===0)) gaps.push('At least one selected work has no citations reported in the retrieved metadata; this may reflect recency rather than weakness.');
  gaps.push('Abstract metadata is insufficient for evaluating methods, sample design, robustness, limitations, or causal validity.');

  const disagreements=`No disagreement is asserted automatically unless contradictory claims are explicit in the retrieved abstracts. Full-text review is required for a defensible comparison of results.`;

  const notes=sources.map((s,i)=>`[${i+1}] ${s.authors?.slice(0,3).join(', ')||'Author unavailable'}${s.authors?.length>3?' et al.':''} (${s.year||'n.d.'}). ${s.title}. ${s.venue||'Venue unavailable'}. ${s.doi?`DOI: ${s.doi}`:(s.url||'')}`);

  synthesisOutput.className='';
  synthesisOutput.innerHTML=`<div class="synth-grid">
    <div class="synth-box synth-full"><h4>Key findings / abstract evidence</h4><ul>${findings.map(f=>`<li>${escHtml(f.text)} <span class="synth-cite">[${f.ref}]</span></li>`).join('')}</ul></div>
    <div class="synth-box"><h4>Shared themes</h4><div class="synth-cite">${escHtml(agreement)}</div></div>
    <div class="synth-box"><h4>Disagreements</h4><div class="synth-cite">${escHtml(disagreements)}</div></div>
    <div class="synth-box"><h4>Evidence gaps</h4><ul>${gaps.map(g=>`<li>${escHtml(g)}</li>`).join('')}</ul></div>
    <div class="synth-box"><h4>Coverage</h4><div class="synth-cite">${n} sources selected · ${withAbstract}/${n} with abstract text · Publication types: ${escHtml(types.join(', ')||'unavailable')}</div></div>
    <div class="synth-box synth-full"><h4>Citation-ready research notes</h4><ul>${notes.map(x=>`<li>${escHtml(x)}</li>`).join('')}</ul></div>
  </div>`;

  lastSynthesisText=[
    'DAYRIXA EVIDENCE SYNTHESIS',
    `Question: ${query}`,
    '',
    'KEY FINDINGS / ABSTRACT EVIDENCE',
    ...findings.map(f=>`[${f.ref}] ${f.text}`),
    '',
    'SHARED THEMES',agreement,
    '',
    'DISAGREEMENTS',disagreements,
    '',
    'EVIDENCE GAPS',...gaps.map(g=>`- ${g}`),
    '',
    'CITATION-READY RESEARCH NOTES',...notes
  ].join('\n');
  copySynthesisBtn.disabled=false;
}
if(synthesizeBtn) synthesizeBtn.addEventListener('click',makeSynthesis);
if(copySynthesisBtn) copySynthesisBtn.addEventListener('click',async()=>{
  if(!lastSynthesisText) return;
  await navigator.clipboard.writeText(lastSynthesisText);
  const old=copySynthesisBtn.textContent; copySynthesisBtn.textContent='Copied';
  setTimeout(()=>copySynthesisBtn.textContent=old,1200);
});


const buildClaimsBtn = document.getElementById('buildClaimsBtn');
const copyClaimsBtn = document.getElementById('copyClaimsBtn');
const claimOutput = document.getElementById('claimOutput');
const claimCount = document.getElementById('claimCount');
let lastClaimsText = '';

function cleanAbstractSentence(text=''){
  return String(text)
    .replace(/<[^>]*>/g,' ')
    .replace(/\s+/g,' ')
    .replace(/\s+([,.;:!?])/g,'$1')
    .trim();
}

function isTruncatedSentence(s=''){
  const t=s.trim();
  return /…$|\.\.\.$/.test(t) || (!/[.!?]["')\]]?$/.test(t) && t.length>80);
}


function conceptPresence(text=''){
  const low=String(text).toLowerCase();
  const groups={
    ai:['artificial intelligence','machine learning','deep learning',' ai ','algorithm','computational'],
    finance:['financial','finance','bank','banks','banking','credit','solvency','fintech'],
    risk:['risk','risks','fraud','default','compliance','liquidity','credit scoring','risk-factor'],
    mechanism:['detect','detection','predict','prediction','assess','assessment','analy','scor','monitor','model','enhance','improve','mitigat','identify']
  };
  const out={};
  Object.entries(groups).forEach(([k,vals])=>out[k]=vals.some(v=>low.includes(v)));
  return out;
}

function validateClaim(sentence, query){
  const qTokens=[...new Set(tokenizeForRank(query))];
  const low=sentence.toLowerCase();
  const matched=qTokens.filter(t=>low.includes(t));
  const coverage=qTokens.length ? matched.length/qTokens.length : 0;
  const c=conceptPresence(sentence);

  // For this research class, direct evidence should connect multiple substantive concepts,
  // not merely repeat generic finance/background language.
  const conceptCount=[c.ai,c.finance,c.risk,c.mechanism].filter(Boolean).length;
  let status='Background only', cls='background', score=0;

  if(conceptCount>=3 && c.risk && (c.ai || c.mechanism)){
    status='Directly useful'; cls='direct'; score=2;
  } else if(conceptCount>=2 && coverage>=0.25){
    status='Partially useful'; cls='partial'; score=1;
  }

  const reasonParts=[];
  if(c.ai) reasonParts.push('AI/analytics');
  if(c.finance) reasonParts.push('banking/finance');
  if(c.risk) reasonParts.push('risk');
  if(c.mechanism) reasonParts.push('mechanism');
  if(!reasonParts.length) reasonParts.push('few substantive query concepts');

  return {
    status, cls, score, coverage,
    reason:`Connects: ${reasonParts.join(', ')} · query-term coverage ${Math.round(coverage*100)}%.`
  };
}


function classifyClaimType(sentence=''){
  const s=String(sentence).toLowerCase();

  const objective=[
    /\b(this (paper|study|chapter|article|research) (examines|investigates|explores|studies|analyzes|analyses|assesses|aims|focuses|considers))\b/,
    /\bwe (examine|investigate|explore|study|analyze|analyse|assess|test)\b/,
    /\bthe (purpose|aim|objective) of (this|the) (paper|study|chapter|research)\b/
  ];
  const empirical=[
    /\b(we|the (study|results?|findings?|analysis)) (find|finds|found|show|shows|showed|indicate|indicates|demonstrate|demonstrates|reveal|reveals)\b/,
    /\b(significant|significantly|associated with|correlated with|inverted u-shaped|positive relationship|negative relationship)\b/
  ];
  const mechanism=[
    /\b(enhance|enhances|improve|improves|reduce|reduces|enable|enables|mitigate|mitigates|detect|detects|predict|predicts|increase|increases|decrease|decreases)\b/,
    /\b(by leveraging|through the use of|allows|allowing|helps|helping)\b/
  ];
  const background=[
    /\b(the past decade|in recent years|traditionally|historically|there has been|has seen|are increasingly|growing importance)\b/,
    /\b(face|faces|faced) (dynamic|growing|significant|new) (threats|challenges)\b/
  ];

  if(objective.some(r=>r.test(s)))
    return {type:'Study Objective', strength:'Context', reason:'The sentence describes what the study examines rather than reporting a result.'};

  if(empirical.some(r=>r.test(s)))
    return {type:'Empirical Finding', strength:'Evidence', reason:'The sentence uses result/finding language or reports an empirical relationship.'};

  if(mechanism.some(r=>r.test(s)))
    return {type:'Mechanism / Effect', strength:'Evidence candidate', reason:'The sentence describes an effect, capability, or mechanism relevant to the topic.'};

  if(background.some(r=>r.test(s)))
    return {type:'Background / Context', strength:'Context', reason:'The sentence mainly provides background or motivation.'};

  return {type:'Descriptive Claim', strength:'Needs verification', reason:'The sentence makes a substantive statement but its evidentiary role is not explicit from abstract text alone.'};
}

function claimCandidate(source, query){
  const sentences=sentenceSplit(cleanAbstractSentence(source.abstract||''));
  const q=[...new Set(tokenizeForRank(query))];

  const scored=sentences.map(sentence=>{
    const low=sentence.toLowerCase();
    const hits=q.filter(t=>low.includes(t));
    const claimVerbs=[
      'find','finds','found','show','shows','showed','suggest','suggests','indicate','indicates',
      'demonstrate','demonstrates','enhance','enhances','improve','improves','reduce','reduces',
      'increase','increases','decrease','decreases','affect','affects','impact','impacts',
      'offer','offers','enable','enables','challenge','challenges','associated','relationship'
    ];
    const verbBonus=claimVerbs.some(v=>new RegExp(`\\b${v}\\b`,'i').test(sentence)) ? 2 : 0;
    const completeBonus=isTruncatedSentence(sentence) ? -4 : 2;
    const validation=validateClaim(sentence,query);
    const validationBonus=validation.score*5;
    return {sentence,hits,validation,score:hits.length+verbBonus+completeBonus+validationBonus};
  }).sort((a,b)=>b.score-a.score);

  // Prefer direct claims, then partial claims. Do not promote background sentences.
  const best=scored.find(x=>x.validation.cls==='direct' && !isTruncatedSentence(x.sentence))
    || scored.find(x=>x.validation.cls==='direct')
    || scored.find(x=>x.validation.cls==='partial' && !isTruncatedSentence(x.sentence))
    || scored.find(x=>x.validation.cls==='partial');

  if(!best){
    const background=scored[0] || null;
    return background ? {
      claim:background.sentence,
      snippet:background.sentence,
      limitation:'Background-only sentence; not promoted as substantive evidence. Abstract-only evidence.',
      matched:background.hits,
      validation:background.validation,
      claimType:classifyClaimType(background.sentence),
      accepted:false
    } : null;
  }

  const limitation=[];
  if(isTruncatedSentence(best.sentence)) limitation.push('Retrieved abstract text appears truncated.');
  const p=source.quality?.intelligence?.publication?.label||'Type unavailable';
  if(/Working Paper|Preprint|Posted/i.test(p)) limitation.push('Publication status should be verified.');
  if(Number(source.citedBy||0)===0) limitation.push('No citations reported in retrieved metadata.');
  limitation.push('Abstract-only evidence; methods and full context not evaluated.');

  return {
    claim:best.sentence,
    snippet:best.sentence,
    limitation:limitation.join(' '),
    matched:best.hits,
    validation:best.validation,
    claimType:classifyClaimType(best.sentence),
    accepted:true
  };
}

function buildClaimTable(){
  const n=Math.min(Number(claimCount.value||5),lastAcademicResults.length);
  const sources=lastAcademicResults.slice(0,n);
  const query=researchTopic.value.trim();
  const rows=sources.map((s,i)=>({s,i:i+1,c:claimCandidate(s,query)}));

  claimOutput.className='';
  claimOutput.innerHTML=`<div class="claim-table-wrap"><table class="claim-table">
    <thead><tr>
      <th>Validation</th><th>Claim type</th><th>Claim</th><th>Evidence snippet</th><th>Source</th><th>Publication type</th><th>Relevance</th><th>Limitation</th>
    </tr></thead>
    <tbody>${rows.map(({s,i,c})=>{
      const authors=s.authors?.slice(0,2).join(', ')||'Author unavailable';
      const pub=s.quality?.intelligence?.publication?.label||'Type unavailable';
      if(!c) return `<tr>
        <td><span class="claim-status background">Insufficient</span></td>
        <td><span class="claim-type">Insufficient</span><div class="type-reason">No usable abstract sentence to classify.</div></td>
        <td class="claim-empty">No defensible abstract-level claim extracted.</td>
        <td class="claim-empty">No usable evidence sentence.</td>
        <td class="claim-source">[${i}] ${escHtml(authors)} (${escHtml(s.year||'n.d.')})</td>
        <td>${escHtml(pub)}</td>
        <td>${s.relevance?.score??'n/a'}/100</td>
        <td class="claim-limit">Abstract text insufficient for claim extraction.</td>
      </tr>`;
      return `<tr>
        <td><span class="claim-status ${escHtml(c.validation.cls)}">${escHtml(c.validation.status)}</span><div class="validation-reason">${escHtml(c.validation.reason)}</div></td>
        <td><span class="claim-type">${escHtml(c.claimType?.type||'Unclassified')}</span><div class="type-reason">${escHtml(c.claimType?.reason||'')}</div></td>
        <td class="${c.accepted?'claim-main':'claim-empty'}">${escHtml(c.claim)}</td>
        <td>${escHtml(c.snippet)} <span class="synth-cite">[${i}]</span></td>
        <td class="claim-source">[${i}] ${escHtml(authors)} (${escHtml(s.year||'n.d.')})<br>${escHtml(s.title)}</td>
        <td>${escHtml(pub)}</td>
        <td>${s.relevance?.score??'n/a'}/100 · ${escHtml(s.relevance?.level||'')}</td>
        <td class="claim-limit">${escHtml(c.limitation)}</td>
      </tr>`;
    }).join('')}</tbody>
  </table></div>`;

  lastClaimsText=[
    'DAYRIXA CLAIM & EVIDENCE TABLE',
    `Question: ${query}`,
    '',
    ...rows.map(({s,i,c})=>{
      const pub=s.quality?.intelligence?.publication?.label||'Type unavailable';
      if(!c) return `[${i}] CLAIM: No defensible abstract-level claim extracted.\nSOURCE: ${s.title}\nPUBLICATION TYPE: ${pub}\nRELEVANCE: ${s.relevance?.score??'n/a'}/100\nLIMITATION: Abstract text insufficient for claim extraction.`;
      return `[${i}] VALIDATION: ${c.validation?.status || 'Insufficient'} — ${c.validation?.reason || ''}\nCLAIM TYPE: ${c.claimType?.type || 'Unclassified'} — ${c.claimType?.reason || ''}\nCLAIM: ${c.claim}\nEVIDENCE SNIPPET: ${c.snippet}\nSOURCE: ${s.authors?.join(', ')||'Author unavailable'} (${s.year||'n.d.'}). ${s.title}. ${s.doi?`DOI: ${s.doi}`:(s.url||'')}\nPUBLICATION TYPE: ${pub}\nRELEVANCE: ${s.relevance?.score??'n/a'}/100\nLIMITATION: ${c.limitation}`;
    })
  ].join('\n\n');
  copyClaimsBtn.disabled=false;
}

if(buildClaimsBtn) buildClaimsBtn.addEventListener('click',buildClaimTable);
if(copyClaimsBtn) copyClaimsBtn.addEventListener('click',async()=>{
  if(!lastClaimsText) return;
  await navigator.clipboard.writeText(lastClaimsText);
  const old=copyClaimsBtn.textContent; copyClaimsBtn.textContent='Copied';
  setTimeout(()=>copyClaimsBtn.textContent=old,1200);
});

async function fetchCrossref(q){
  const url = `https://api.crossref.org/works?query.bibliographic=${encodeURIComponent(q)}&rows=6&select=DOI,title,author,published,issued,created,container-title,publisher,URL,abstract,is-referenced-by-count,type`;
  const r = await fetch(url, {headers:{'Accept':'application/json'}});
  if(!r.ok) throw new Error(`Crossref ${r.status}`);
  const data = await r.json();
  return (data.message?.items || []).map(normalizeCrossref);
}

async function fetchOpenAlex(q){
  const params = new URLSearchParams();
  params.set('search.exact', q);
  params.set('per_page', '6');

  const url = `https://api.openalex.org/works?${params.toString()}`;
  const r = await fetch(url, {headers:{'Accept':'application/json'}});

  if(!r.ok){
    let detail = '';
    try{
      const err = await r.json();
      detail = err?.message || err?.error || '';
    }catch(_){}
    throw new Error(`OpenAlex ${r.status}${detail ? ` — ${detail}` : ''}`);
  }

  const data = await r.json();
  return (data.results || []).map(normalizeOpenAlex);
}

async function runLiveSearch(){
  const q = researchTopic.value.trim();
  if(!q){ researchTopic.focus(); return; }

  liveSearchBtn.disabled = true;
  liveSearchStatus.textContent = 'Searching Crossref and OpenAlex…';
  liveSearchStatus.className = 'live-search-status loading';
  academicSources.innerHTML = '<div class="source-placeholder">Contacting scholarly metadata services…</div>';

  const results = await Promise.allSettled([fetchCrossref(q), fetchOpenAlex(q)]);
  const merged = [];
  const errors = [];
  results.forEach((res,idx)=>{
    if(res.status === 'fulfilled') merged.push(...res.value);
    else errors.push(idx===0 ? `Crossref: ${res.reason.message}` : `OpenAlex: ${res.reason.message}`);
  });

  const cleaned = dedupeSources(merged).slice(0,10);
  renderSources(cleaned);

  if(cleaned.length){
    liveSearchStatus.textContent = errors.length
      ? `Search completed with partial provider availability. ${errors.join(' · ')}`
      : 'Live academic search completed.';
    liveSearchStatus.className = errors.length ? 'live-search-status warn' : 'live-search-status ok';
  }else{
    liveSearchStatus.textContent = errors.length
      ? `Search could not retrieve results. ${errors.join(' · ')}`
      : 'No matching scholarly results were returned.';
    liveSearchStatus.className = 'live-search-status warn';
  }
  liveSearchBtn.disabled = false;
}

liveSearchBtn.addEventListener('click', runLiveSearch);

exportSourcesBtn.addEventListener('click', async ()=>{
  if(!lastAcademicResults.length) return;
  const text = lastAcademicResults.map((s,i)=>{
    const authors = s.authors?.length ? s.authors.join(', ') : 'Author unavailable';
    return `${i+1}. ${s.title}\nOverall Research Score: ${s.overall?.score ?? 'n/a'}/100 (${s.overall?.level ?? 'n/a'})\nRelevance: ${s.relevance?.score ?? 'n/a'}/100 (${s.relevance?.level ?? 'n/a'})\nSource Quality: ${s.quality?.score ?? 'n/a'}/100 (${s.quality?.level ?? 'n/a'})\nRelevance reason: ${s.relevance?.reason ?? 'n/a'}\nQuality signals: ${s.quality?.reason ?? 'n/a'}\nAuthors: ${authors}\nYear: ${s.year || 'n/a'}\nVenue: ${s.venue || 'n/a'}\nDOI: ${s.doi || 'n/a'}\nLink: ${s.url || 'n/a'}\nProvider: ${s.provider}`;
  }).join('\n\n');
  try{
    await navigator.clipboard.writeText(text);
    exportSourcesBtn.textContent = 'Copied';
    setTimeout(()=>exportSourcesBtn.textContent='Copy sources',1200);
  }catch(e){
    exportSourcesBtn.textContent = 'Copy failed';
    setTimeout(()=>exportSourcesBtn.textContent='Copy sources',1200);
  }
});


// v13.1 bilingual UI layer (English / Persian)
const langEN=document.getElementById('langEN');
const langFA=document.getElementById('langFA');
const FA={
  'DAYRIXA AI Hub':'هاب هوش مصنوعی DAYRIXA',
  'Research Agent':'عامل پژوهشی',
  'AI Sentiment Analyzer':'تحلیل‌گر احساسات هوش مصنوعی',
  'Data Analyst':'تحلیل‌گر داده',
  'Research workspace':'فضای کار پژوهشی',
  'Live academic search':'جست‌وجوی زنده دانشگاهی',
  'Search academic sources':'جست‌وجوی منابع علمی',
  'Search scholarly metadata, validate claims, classify claim type, and build a research-ready evidence table.':'فراداده علمی را جست‌وجو کنید، ادعاها را اعتبارسنجی و نوع آن‌ها را طبقه‌بندی کنید و جدول شواهد پژوهشی بسازید.',
  'Research question':'پرسش پژوهش',
  'Academic sources':'منابع علمی',
  'Evidence Synthesis':'ترکیب شواهد',
  'Synthesize evidence':'ترکیب شواهد',
  'Copy synthesis':'کپی ترکیب',
  'Claim & evidence table':'جدول ادعا و شواهد',
  'Build evidence table':'ساخت جدول شواهد',
  'Copy table':'کپی جدول',
  'Top 3':'۳ منبع برتر',
  'Top 5':'۵ منبع برتر',
  'Validation':'اعتبارسنجی',
  'Claim type':'نوع ادعا',
  'Claim':'ادعا',
  'Evidence snippet':'بخش شاهد',
  'Source':'منبع',
  'Publication type':'نوع انتشار',
  'Relevance':'ارتباط',
  'Limitation':'محدودیت',
  'Directly useful':'مستقیماً مفید',
  'Partially useful':'تا حدی مفید',
  'Background only':'فقط زمینه‌ای',
  'Insufficient':'ناکافی',
  'Mechanism / Effect':'سازوکار / اثر',
  'Empirical Finding':'یافته تجربی',
  'Study Objective':'هدف مطالعه',
  'Background / Context':'زمینه / بستر',
  'Descriptive Claim':'ادعای توصیفی',
  'Experimental prototype only.':'فقط نمونه اولیه آزمایشی.',
  'TESTNET ONLY':'فقط شبکه آزمایشی',
  'NO SALE':'بدون فروش',
  'NO REAL LIQUIDITY':'بدون نقدینگی واقعی',
  'NO MAINNET':'بدون شبکه اصلی',
  'NO FUNDRAISING':'بدون جذب سرمایه'
};
const ENREV=Object.fromEntries(Object.entries(FA).map(([k,v])=>[v,k]));
function translateTextNodes(root,dict){
  const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);
  const nodes=[]; while(walker.nextNode()) nodes.push(walker.currentNode);
  nodes.forEach(n=>{
    const raw=n.nodeValue, trim=raw.trim();
    if(!trim || !dict[trim]) return;
    n.nodeValue=raw.replace(trim,dict[trim]);
  });
}
function setLanguage(lang){
  const fa=lang==='fa';
  document.documentElement.lang=fa?'fa':'en';
  document.documentElement.dir=fa?'rtl':'ltr';
  translateTextNodes(document.body,fa?FA:ENREV);
  langFA.classList.toggle('active',fa); langEN.classList.toggle('active',!fa);
  localStorage.setItem('dayrixa-lang',lang);
}
langFA?.addEventListener('click',()=>setLanguage('fa'));
langEN?.addEventListener('click',()=>setLanguage('en'));
setLanguage(localStorage.getItem('dayrixa-lang')||'en');


// =========================================================
// DAYRIXA v3.2 — Collapsible Sidebar
// =========================================================
(() => {
  const STORAGE_KEY = "dayrixa-sidebar-collapsed";

  function initSidebarToggle() {
    const toggle = document.getElementById("sidebarToggle");
    if (!toggle) return;

    const icon = toggle.querySelector(".sidebar-toggle-icon");

    const applyState = (collapsed) => {
      document.body.classList.toggle("sidebar-collapsed", collapsed);
      toggle.setAttribute("aria-expanded", String(!collapsed));
      toggle.setAttribute("aria-label", collapsed ? "Expand sidebar" : "Collapse sidebar");
      toggle.setAttribute("title", collapsed ? "Expand sidebar" : "Collapse sidebar");
      if (icon) icon.textContent = collapsed ? "›" : "‹";
    };

    let saved = false;
    try {
      saved = localStorage.getItem(STORAGE_KEY) === "true";
    } catch (_) {}
    applyState(saved);

    toggle.addEventListener("click", () => {
      const collapsed = !document.body.classList.contains("sidebar-collapsed");
      applyState(collapsed);
      try {
        localStorage.setItem(STORAGE_KEY, String(collapsed));
      } catch (_) {}
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initSidebarToggle);
  } else {
    initSidebarToggle();
  }
})();
