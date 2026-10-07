
const views = document.querySelectorAll('.view');
const navItems = document.querySelectorAll('.nav-item[data-view]:not(.locked)');

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


// DAYRIXA Data Analyst Beta — Interactive Analysis Builders
(() => {
  const fileInput=document.getElementById('dataFile'); if(!fileInput) return;
  const drop=document.getElementById('dataDrop'), status=document.getElementById('dataStatus'), workspace=document.getElementById('dataWorkspace');
  const kpis=document.getElementById('dataKpis'), profile=document.getElementById('dataProfile'), quality=document.getElementById('dataQuality'), suggestions=document.getElementById('dataSuggestions'), quickActions=document.getElementById('dataQuickActions'), quickConfig=document.getElementById('dataQuickConfig');
  const qInput=document.getElementById('dataQuestion'), askBtn=document.getElementById('dataAskBtn'), answer=document.getElementById('dataAnswer'), tableWrap=document.getElementById('dataTableWrap'), chartWrap=document.getElementById('dataChartWrap');
  let studio=null,originalSnapshot=null;
  let rows=[], originalRows=[], cols=[], types={}, chart=null, rawGrid=[], rawMerges=[], headerSuggestion=null;
  const loadScript=(src)=>new Promise((res,rej)=>{const s=document.createElement('script');s.src=src;s.onload=res;s.onerror=rej;document.head.appendChild(s)});
  const num=v=>{if(v===null||v===undefined||String(v).trim()==='')return NaN;const n=Number(String(v).replace(/[$,%£€¥,]/g,'').trim());return Number.isFinite(n)?n:NaN};
  const fmt=n=>Number.isFinite(n)?new Intl.NumberFormat(undefined,{maximumFractionDigits:2}).format(n):'—';
  const esc=s=>String(s??'').replace(/[&<>\"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[c]));
  const optionList=(arr,selected='')=>arr.map(c=>`<option value="${esc(c)}" ${c===selected?'selected':''}>${esc(c)}</option>`).join('');
  const looksDateValue=v=>{
    if(v instanceof Date&&!Number.isNaN(v.getTime()))return true;
    const s=String(v??'').trim();
    return !!s&&/(?:\d{4}[-/]\d{1,2}(?:[-/]\d{1,2})?|\d{1,2}[-/]\d{1,2}[-/]\d{2,4}|[A-Za-z]{3,9}\s+\d{1,2},?\s+\d{4})/.test(s)&&!Number.isNaN(Date.parse(s));
  };
  function showError(title,error){resetResult();answer.innerHTML=`<h3>${esc(title)}</h3><p>${esc(error?.message||error||'The analysis could not be completed.')}</p>`;}
  function safeRun(task,title='Analysis could not be completed'){
    try{const result=task();if(result&&typeof result.catch==='function')result.catch(error=>showError(title,error));return result;}
    catch(error){showError(title,error);return null;}
  }
  function parseCsvText(text){
    const grid=[];let row=[],cell='',quoted=false;
    for(let i=0;i<text.length;i++){
      const ch=text[i];
      if(quoted){if(ch==='"'&&text[i+1]==='"'){cell+='"';i++;}else if(ch==='"')quoted=false;else cell+=ch;}
      else if(ch==='"')quoted=true;
      else if(ch===','){row.push(cell);cell='';}
      else if(ch==='\n'){row.push(cell);grid.push(row);row=[];cell='';}
      else if(ch!=='\r')cell+=ch;
    }
    if(cell!==''||row.length){row.push(cell);grid.push(row);}
    return grid;
  }
  function uniqueHeaders(header,width){
    const used=new Set();return Array.from({length:width},(_,i)=>{let base=String(header[i]??'').trim()||`Unnamed_${i+1}`,name=base,n=2;while(used.has(name))name=`${base}_${n++}`;used.add(name);return name;});
  }
  function detectSmartHeader(grid, merges=[]){
    if(!Array.isArray(grid)||grid.length<2) return null;
    const maxC=Math.max(0,...grid.slice(0,8).map(r=>Array.isArray(r)?r.length:0)); if(!maxC) return null;
    const filled=(r)=>Array.from({length:maxC},(_,c)=>String((grid[r]||[])[c]??'').trim()).filter(Boolean).length;
    const numericShare=(r)=>{const a=Array.from({length:maxC},(_,c)=>(grid[r]||[])[c]).filter(v=>String(v??'').trim()!=='');return a.length?a.filter(v=>Number.isFinite(num(v))).length/a.length:0};
    const dateShare=(r)=>{const a=Array.from({length:maxC},(_,c)=>(grid[r]||[])[c]).filter(v=>String(v??'').trim()!=='');return a.length?a.filter(v=>!Number.isNaN(Date.parse(v))&&String(v).match(/[-/]|[A-Za-z]{3}/)).length/a.length:0};
    let dataStart=-1;
    for(let r=1;r<Math.min(grid.length,8);r++){ if(filled(r)>=Math.max(2,Math.ceil(maxC*.35)) && (numericShare(r)>.45||dateShare(r)>.25)){dataStart=r;break;} }
    if(dataStart<1||(dataStart===1&&!merges.length)) return null;
    const headerRows=Array.from({length:dataStart},(_,i)=>i);
    const expanded=headerRows.map(r=>{const out=Array(maxC).fill('');for(let c=0;c<maxC;c++)out[c]=String((grid[r]||[])[c]??'').trim();for(const m of merges||[]){if(m.s.r<=r&&r<=m.e.r){const v=String((grid[m.s.r]||[])[m.s.c]??'').trim();if(v)for(let c=m.s.c;c<=m.e.c&&c<maxC;c++)out[c]=v;}}return out;});
    const meta=[]; const used=new Set();
    for(let c=0;c<maxC;c++){const parts=[];for(const er of expanded){const v=er[c];if(v&&parts[parts.length-1]!==v)parts.push(v);}let display=parts.join(' — ')||`Column_${c+1}`;let base=display,k=2;while(used.has(display))display=`${base}_${k++}`;used.add(display);meta.push({column:c+1,display,parts});}
    const meaningful=meta.filter(m=>m.parts.length).length;
    return meaningful>=Math.max(1,Math.ceil(maxC*.4))?{headerRows,dataStart,meta}:null;
  }
  function rebuildFromSmartHeader(){
    const hs=headerSuggestion;if(!hs||!rawGrid.length)return false;
    const names=hs.meta.map(m=>m.display), data=rawGrid.slice(hs.dataStart);
    rows=data.filter(a=>(a||[]).some(v=>String(v??'').trim()!=='')).map(a=>Object.fromEntries(names.map((n,i)=>[n,(a||[])[i]??''])));
    cols=names.slice(); return !!rows.length;
  }
  function infer(){types={};cols.forEach(c=>{const vals=rows.slice(0,500).map(r=>r[c]).filter(v=>v!==''&&v!=null);const numeric=vals.filter(v=>Number.isFinite(num(v))).length;const dates=vals.filter(v=>!Number.isNaN(Date.parse(v))&&String(v).match(/[-/]|[A-Za-z]{3}/)).length;types[c]=vals.length&&numeric/vals.length>.8?'numeric':vals.length&&dates/vals.length>.75?'date':'category';});}
  const numericCols=()=>cols.filter(c=>types[c]==='numeric'); const catCols=()=>cols.filter(c=>types[c]==='category'); const dateCols=()=>cols.filter(c=>types[c]==='date');
  function bestMeasure(){return numericCols().find(c=>/sales|revenue|amount|profit|price|value|total|quantity|qty|units/i.test(c))||numericCols()[0];}
  function bestCategory(){return catCols().find(c=>/product|category|region|customer|segment|item|name|country|store/i.test(c))||catCols()[0];}
  function resetResult(){answer.className='data-answer';answer.innerHTML='';tableWrap.innerHTML='';chartWrap.classList.add('hidden');}
  function renderProfile(){const missing=cols.reduce((a,c)=>a+rows.filter(r=>r[c]===''||r[c]==null).length,0);kpis.innerHTML=[['Rows',rows.length],['Columns',cols.length],['Numeric fields',numericCols().length],['Missing cells',missing]].map(x=>`<div class="data-kpi"><small>${x[0]}</small><strong>${fmt(x[1])}</strong></div>`).join('');profile.innerHTML=`<div class="data-profile-list">${cols.slice(0,14).map(c=>`<div class="data-profile-row"><strong>${esc(c)}</strong><span>${types[c]}</span></div>`).join('')}${cols.length>14?`<div class="data-profile-row"><span>+ ${cols.length-14} more columns</span></div>`:''}</div>`;const dup=rows.length-new Set(rows.map(r=>JSON.stringify(r))).size;const missPct=rows.length*cols.length?100*missing/(rows.length*cols.length):0;quality.innerHTML=`<div class="data-profile-list"><div class="data-profile-row"><strong>Missing cells</strong><span>${fmt(missing)} (${missPct.toFixed(1)}%)</span></div><div class="data-profile-row"><strong>Duplicate rows</strong><span>${fmt(dup)}</span></div><div class="data-profile-row"><strong>Detected dates</strong><span>${dateCols().length}</span></div><div class="data-profile-row"><strong>Analysis readiness</strong><span class="${numericCols().length?'data-good':'data-warning'}">${numericCols().length?'Ready':'Limited — no numeric field detected'}</span></div></div>`;}
  function makeSuggestions(){const m=bestMeasure(),c=bestCategory(),d=dateCols()[0];let qs=[];if(m&&c)qs.push(`What are the top 5 ${c} by ${m}?`,`What are the bottom 5 ${c} by ${m}?`);if(m)qs.push(`What is the total ${m}?`,`What is the average ${m}?`);if(m&&d)qs.push(`Show the ${m} trend over time`);qs.push('Show missing values by column');if(numericCols().length>1)qs.push(`What is the correlation between ${numericCols()[0]} and ${numericCols()[1]}?`);suggestions.innerHTML=qs.slice(0,7).map(q=>`<button type="button" class="data-suggestion">${esc(q)}</button>`).join('');suggestions.querySelectorAll('button').forEach(b=>b.onclick=()=>{qInput.value=b.textContent;safeRun(()=>runQuestion(b.textContent),'Suggested question could not be completed')});}
  function renderQuickActions(){
    const actions=[['charts','▥','Charts'],['correlations','⌁','Correlations'],['descriptive','∑','Descriptive statistics'],['panel','▦','Panel statistics'],['regression','β','Regression'],['top','↑','Top values'],['bottom','↓','Bottom values'],['missing','!','Missing data'],['trends','↗','Trends'],['outliers','◇','Outliers'],['cleaning','✦','Data cleaning']];
    quickActions.innerHTML=actions.map(([id,icon,label])=>`<button type="button" class="data-quick-btn" data-analysis="${id}"><span class="data-quick-icon">${icon}</span>${label}</button>`).join('');
    quickActions.querySelectorAll('button').forEach(b=>b.addEventListener('click',()=>safeRun(()=>openBuilder(b.dataset.analysis),'This analysis tool could not be opened')));
  }
  function builderShell(title,text,body,button='Run analysis'){quickConfig.classList.remove('hidden');quickConfig.innerHTML=`<div class="data-builder-head"><div><strong>${title}</strong><p>${text}</p></div><button class="data-builder-close" type="button" aria-label="Close">×</button></div><div class="data-builder-grid">${body}</div>${button?`<div class="data-builder-actions"><button id="dataBuilderRun" class="primary" type="button">${button}</button></div>`:''}`;quickConfig.querySelector('.data-builder-close').onclick=()=>quickConfig.classList.add('hidden');}
  function field(label,id,options,selected=''){return `<label class="data-builder-field"><span>${label}</span><select id="${id}">${optionList(options,selected)}</select></label>`;}
  function openBuilder(kind){
    const ns=numericCols(), cs=catCols(), ds=dateCols(), m=bestMeasure()||ns[0], c=bestCategory()||cs[0];
    if(kind==='charts'){
      builderShell('Chart builder','Choose exactly what you want to compare. DAYRIXA will not choose or remove fields without your instruction.',field('X-axis','builderX',cols,c||cols[0])+field('Y-axis','builderY',ns,m)+field('Chart type','builderChart',['Auto','Bar','Line','Scatter'])+field('Data mode','builderAgg',['Original data (no aggregation)','Sum','Average','Count','Min','Max'],'Original data (no aggregation)'));
      document.getElementById('dataBuilderRun').onclick=()=>runChartBuilder(); return;
    }
    if(kind==='correlations'){
      builderShell('Correlation builder','Select two numeric variables. The result includes Pearson r and a plain-language interpretation.',field('Variable 1','builderA',ns,ns[0])+field('Variable 2','builderB',ns,ns[1]||ns[0]));
      document.getElementById('dataBuilderRun').onclick=()=>runCorrelationBuilder(); return;
    }
    if(kind==='descriptive'){
      const checks=ns.map((v,i)=>`<label class="data-variable-check"><input type="checkbox" class="desc-var" value="${esc(v)}" ${i<Math.min(5,ns.length)?'checked':''}> <span>${esc(v)}</span></label>`).join('');
      builderShell('Descriptive statistics','Select one or more numeric variables. Variables are rows and statistics are columns so the measures can be compared side by side.',`<div class="data-builder-field data-builder-wide"><span>Variables</span><div class="data-select-tools"><button type="button" id="descAll">Select all numeric</button><button type="button" id="descNone">Clear</button></div><div class="data-variable-list">${checks}</div></div>`);
      document.getElementById('descAll').onclick=()=>quickConfig.querySelectorAll('.desc-var').forEach(x=>x.checked=true);document.getElementById('descNone').onclick=()=>quickConfig.querySelectorAll('.desc-var').forEach(x=>x.checked=false);document.getElementById('dataBuilderRun').onclick=()=>runDescriptive();return;
    }
    if(kind==='regression'){
      const checks=ns.map((v,i)=>`<label class="data-variable-check"><input type="checkbox" class="reg-x" value="${esc(v)}" ${i>0&&i<Math.min(4,ns.length)?'checked':''}> <span>${esc(v)}</span></label>`).join('');
      builderShell('Regression','Define the dependent variable and explanatory variables yourself, or type a simple model formula such as Y ~ X1 + X2. This beta runs browser-side OLS on complete numeric observations.',field('Dependent variable (Y)','builderRegY',ns,ns[0])+`<div class="data-builder-field data-builder-wide"><span>Independent variables (X)</span><div class="data-variable-list">${checks}</div></div><label class="data-builder-field data-builder-wide"><span>Model formula (optional; overrides selections)</span><input id="builderRegFormula" placeholder="RI ~ Rm + Rf + Rb"><button type="button" id="regBuildFormula" class="secondary">Use selected variables as formula</button></label><div class="data-builder-wide"><p>Use full column names or the unique aliases below. Example: RI ~ Rm + Rf + Rb. Only additive OLS terms are supported.</p><div class="data-table-scroll"><table class="data-result-table"><thead><tr><th>Alias</th><th>Variable</th></tr></thead><tbody>${ns.map(v=>`<tr><td>${esc(aliasOf(v))}</td><td>${esc(v)}</td></tr>`).join('')}</tbody></table></div></div><label class="data-clean-option data-builder-wide"><input type="checkbox" id="builderRegIntercept" checked><span><strong>Include intercept</strong><small>Uncheck only when you intentionally want regression through the origin.</small></span></label>`);
      document.getElementById('regBuildFormula').onclick=()=>{
        const y=document.getElementById('builderRegY').value,xs=selectedValues('.reg-x').filter(x=>x!==y);
        document.getElementById('builderRegFormula').value=y+' ~ '+xs.join(' + ');
      };
      document.getElementById('builderRegY').onchange=()=>{const y=document.getElementById('builderRegY').value;quickConfig.querySelectorAll('.reg-x').forEach(el=>{el.disabled=el.value===y;if(el.disabled)el.checked=false;});};
      document.getElementById('builderRegY').onchange();
      document.getElementById('dataBuilderRun').onclick=()=>runRegression();return;
    }
    if(kind==='panel'){
      const idCandidates=[...cs,...ns].filter(c=>!ds.includes(c));
      const checks=ns.map((v,i)=>`<label class="data-variable-check"><input type="checkbox" class="panel-var" value="${esc(v)}" ${i<Math.min(3,ns.length)?'checked':''}> <span>${esc(v)}</span></label>`).join('');
      builderShell('Panel intelligence','Define the entity and time dimensions once, then explore panel structure, overall/between/within variation, entity means, or the cross-sectional mean through time.',field('Entity / ID field','builderPanelId',idCandidates.length?idCandidates:cols,idCandidates[0]||cols[0])+field('Time field','builderPanelTime',ds.length?ds:cols,ds[0]||cols[0])+field('Analysis','builderPanelMode',['Panel structure','Overall / Between / Within','Entity means','Cross-sectional mean over time'],'Panel structure')+`<div class="data-builder-field data-builder-wide"><span>Variables</span><div class="data-select-tools"><button type="button" id="panelAll">Select all numeric</button><button type="button" id="panelNone">Clear</button></div><div class="data-variable-list">${checks}</div><p class="data-builder-note">For structure diagnostics no variable is required. Other analyses use the selected variables. Nothing is changed in the uploaded data.</p></div>`);
      document.getElementById('panelAll').onclick=()=>quickConfig.querySelectorAll('.panel-var').forEach(x=>x.checked=true);document.getElementById('panelNone').onclick=()=>quickConfig.querySelectorAll('.panel-var').forEach(x=>x.checked=false);document.getElementById('dataBuilderRun').onclick=()=>runPanelIntelligence();return;
    }
    if(kind==='top'||kind==='bottom'){
      builderShell(kind==='top'?'Top values':'Bottom values','Group by is the category or ID whose unique values become ranked rows. Measure is summarized within each group using the aggregation you choose.',field('Group by (category / ID)','builderGroup',cs.length?cs:cols,c||cols[0])+field('Measure (numeric field)','builderMetric',ns,m)+field('Aggregation','builderAgg',['Sum','Average','Count','Min','Max'],'Sum')+field('Number of results','builderN',['5','10','15','20'],'5'));
      document.getElementById('dataBuilderRun').onclick=()=>safeRun(()=>runRanking(kind),'Ranking could not be completed');return;
    }
    if(kind==='trends'){
      builderShell('Trend builder','Choose a time field and the numeric measure to analyze.',field('Time field','builderDate',ds.length?ds:cols,ds[0]||cols[0])+field('Measure','builderMetric',ns,m)+field('Aggregation','builderAgg',['Sum','Average','Count'],'Sum'));
      document.getElementById('dataBuilderRun').onclick=()=>safeRun(()=>runTrend(),'Trend analysis could not be completed');return;
    }
    if(kind==='outliers'){
      builderShell('Outlier review','Choose a numeric field and an explicit action. The 1.5×IQR rule defines the lower and upper fences. Review does not change data; removal and winsorization change only the working copy.',field('Numeric field','builderMetric',ns,m)+field('Action','builderOutlierAction',['Review only','Remove flagged rows','Winsorize to IQR fences'],'Review only'));document.getElementById('dataBuilderRun').onclick=()=>safeRun(()=>runOutliers(),'Outlier analysis could not be completed');return;
    }
    if(kind==='missing'){safeRun(()=>runMissing(),'Missing-data analysis could not be completed');quickConfig.classList.add('hidden');return;}
    if(kind==='cleaning'){openCleaning();return;}
  }
  function pearsonFor(a,b){const pairs=rows.map(r=>[num(r[a]),num(r[b])]).filter(x=>x.every(Number.isFinite));if(pairs.length<3)return {r:NaN,n:pairs.length};const mean=x=>x.reduce((s,v)=>s+v,0)/x.length,ax=pairs.map(x=>x[0]),by=pairs.map(x=>x[1]),ma=mean(ax),mb=mean(by);const cov=pairs.reduce((s,x)=>s+(x[0]-ma)*(x[1]-mb),0),sa=Math.sqrt(pairs.reduce((s,x)=>s+(x[0]-ma)**2,0)),sb=Math.sqrt(pairs.reduce((s,x)=>s+(x[1]-mb)**2,0));return {r:sa&&sb?cov/(sa*sb):NaN,n:pairs.length};}
  function quantile(arr,q){const a=[...arr].sort((x,y)=>x-y);if(!a.length)return NaN;const p=(a.length-1)*q,b=Math.floor(p),r=p-b;return a[b+1]!==undefined?a[b]+r*(a[b+1]-a[b]):a[b];}
  function aggregate(cat,measure,method='Sum'){const map=new Map();rows.forEach(r=>{const key=String(r[cat]??'').trim()||'(blank)',v=num(r[measure]);if(method==='Count'){const z=map.get(key)||{sum:0,n:0,min:Infinity,max:-Infinity};z.n++;map.set(key,z);}else if(Number.isFinite(v)){const z=map.get(key)||{sum:0,n:0,min:Infinity,max:-Infinity};z.sum+=v;z.n++;z.min=Math.min(z.min,v);z.max=Math.max(z.max,v);map.set(key,z);}});return [...map.entries()].map(([k,z])=>[k,method==='Average'?z.sum/z.n:method==='Count'?z.n:method==='Min'?z.min:method==='Max'?z.max:z.sum]);}
  async function draw(labels,values,label,type='bar'){
    const canvas=document.getElementById('dataChart');if(!canvas||!labels.length||!values.length)return;
    const pairs=labels.map((x,i)=>[x,Number(values[i])]).filter(x=>Number.isFinite(x[1]));if(!pairs.length)return;
    chartWrap.classList.remove('hidden');
    const width=Math.max(640,Math.min(1200,chartWrap.clientWidth||900)),height=360,dpr=Math.max(1,Math.min(2,window.devicePixelRatio||1));
    canvas.width=width*dpr;canvas.height=height*dpr;canvas.style.width='100%';canvas.style.height=`${height}px`;
    const ctx=canvas.getContext('2d');ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,width,height);
    const margin={left:70,right:24,top:28,bottom:78},plotW=width-margin.left-margin.right,plotH=height-margin.top-margin.bottom;
    let min=Math.min(0,...pairs.map(x=>x[1])),max=Math.max(0,...pairs.map(x=>x[1]));if(min===max){min-=1;max+=1;}
    const xvals=pairs.map(p=>Number(p[0])),xmin=Math.min(...xvals),xmax=Math.max(...xvals);const y=v=>margin.top+(max-v)/(max-min)*plotH,x=i=>margin.left+(type==='scatter'?(xmax===xmin?plotW/2:(xvals[i]-xmin)/(xmax-xmin)*plotW):(pairs.length===1?plotW/2:i*plotW/Math.max(1,pairs.length-1)));
    ctx.font='12px system-ui, sans-serif';ctx.fillStyle='#9fb0c9';ctx.strokeStyle='rgba(159,176,201,.25)';ctx.lineWidth=1;
    for(let i=0;i<=4;i++){const val=max-(max-min)*i/4,yy=margin.top+plotH*i/4;ctx.beginPath();ctx.moveTo(margin.left,yy);ctx.lineTo(width-margin.right,yy);ctx.stroke();ctx.fillText(fmt(val),8,yy+4);}
    const zero=y(0);ctx.strokeStyle='rgba(230,237,246,.55)';ctx.beginPath();ctx.moveTo(margin.left,zero);ctx.lineTo(width-margin.right,zero);ctx.stroke();
    if(type==='line'||type==='scatter'){
      if(type==='line'){ctx.strokeStyle='#5eead4';ctx.lineWidth=2;ctx.beginPath();pairs.forEach((p,i)=>{const xx=x(i),yy=y(p[1]);i?ctx.lineTo(xx,yy):ctx.moveTo(xx,yy)});ctx.stroke();}
      ctx.fillStyle='#7dd3fc';pairs.forEach((p,i)=>{ctx.beginPath();ctx.arc(x(i),y(p[1]),3.5,0,Math.PI*2);ctx.fill();});
    }else{
      const gap=6,barW=Math.max(3,Math.min(54,plotW/Math.max(1,pairs.length)-gap));ctx.fillStyle='#5eead4';
      pairs.forEach((p,i)=>{const xx=margin.left+(i+.5)*plotW/pairs.length,yy=y(p[1]);ctx.fillRect(xx-barW/2,Math.min(yy,zero),barW,Math.max(1,Math.abs(zero-yy)));});
    }
    ctx.fillStyle='#cbd5e1';const every=Math.max(1,Math.ceil(pairs.length/10));pairs.forEach((p,i)=>{if(i%every)return;const xx=type==='bar'?margin.left+(i+.5)*plotW/pairs.length:x(i);ctx.save();ctx.translate(xx,height-margin.bottom+16);ctx.rotate(-Math.PI/6);const t=String(p[0]);ctx.fillText(t.length>22?t.slice(0,20)+'…':t,0,0);ctx.restore();});
    ctx.fillStyle='#e6edf6';ctx.font='600 13px system-ui, sans-serif';ctx.fillText(String(label||''),margin.left,16);
  }
  function restoreWorkingCopy(){return studio?studio.mutate('Restore original','Restored the initial uploaded working dataset',()=>legacyRestoreWorkingCopy()):legacyRestoreWorkingCopy();}
  function legacyRestoreWorkingCopy(){
    rows=originalRows.map(r=>({...r}));cols=originalSnapshot?.cols.slice()||(rows.length?Object.keys(rows[0]):[]);if(originalSnapshot){rawGrid=originalSnapshot.rawGrid;rawMerges=originalSnapshot.rawMerges;headerSuggestion=originalSnapshot.headerSuggestion;}infer();renderProfile();makeSuggestions();renderQuickActions();quickConfig.classList.add('hidden');resetResult();answer.innerHTML='<h3>Original working copy restored</h3><p>All cleaning and outlier changes from this session were reversed.</p>';
  }
  function restoreButton(){return '<button id="restoreOriginal" class="data-restore-btn" type="button">Restore original working copy</button>';}
  async function runRanking(kind){
    resetResult();const group=document.getElementById('builderGroup')?.value,metric=document.getElementById('builderMetric')?.value,method=document.getElementById('builderAgg')?.value||'Sum',n=Math.max(1,Math.min(20,Number(document.getElementById('builderN')?.value||5)));
    if(!group||!metric){answer.innerHTML='<h3>Choose ranking fields</h3><p>Select a Group by field and a numeric Measure.</p>';return;}
    let data=aggregate(group,metric,method).filter(x=>Number.isFinite(x[1])).sort((a,b)=>b[1]-a[1]);if(kind==='bottom')data.reverse();data=data.slice(0,n);
    if(!data.length){answer.innerHTML='<h3>No rankable observations</h3><p>No complete numeric observations were found for the selected grouping and measure.</p>';return;}
    await draw(data.map(x=>x[0]),data.map(x=>x[1]),`${method} ${metric}`,'bar');
    const heading=kind==='bottom'?'Bottom':'Top';answer.innerHTML=`<h3>${heading} ${data.length} ${esc(group)} by ${esc(method)} ${esc(metric)}</h3><p><strong>Group by</strong> creates one row for every unique ${esc(group)} value. DAYRIXA then calculates the ${method.toLowerCase()} of ${esc(metric)} inside each group and ranks those results. The leading result is <strong>${esc(data[0][0])}</strong> at <strong>${fmt(data[0][1])}</strong>.</p>`;
    tableWrap.innerHTML=`<div class="data-table-scroll"><table class="data-result-table"><thead><tr><th>Rank</th><th>${esc(group)}</th><th>${esc(method)} ${esc(metric)}</th></tr></thead><tbody>${data.map((x,i)=>`<tr><td>${i+1}</td><td>${esc(x[0])}</td><td>${fmt(x[1])}</td></tr>`).join('')}</tbody></table></div>`;
  }
  async function runTrend(){
    resetResult();const time=document.getElementById('builderDate')?.value,metric=document.getElementById('builderMetric')?.value,method=document.getElementById('builderAgg')?.value||'Sum';if(!time||!metric){answer.innerHTML='<h3>Choose trend fields</h3><p>Select a time field and numeric measure.</p>';return;}
    let data=aggregate(time,metric,method).filter(x=>Number.isFinite(x[1]));data.sort((a,b)=>{const da=panelDate(a[0]),db=panelDate(b[0]);return da&&db?da-db:String(a[0]).localeCompare(String(b[0]),undefined,{numeric:true});});
    if(!data.length){answer.innerHTML='<h3>No trend observations</h3><p>No complete time and numeric values were found for the selected fields.</p>';return;}
    await draw(data.map(x=>x[0]),data.map(x=>x[1]),`${method} ${metric}`,'line');answer.innerHTML=`<h3>${esc(metric)} trend over ${esc(time)}</h3><p>The chart contains <strong>${fmt(data.length)}</strong> distinct time values. At each time value, ${esc(metric)} is summarized using <strong>${esc(method)}</strong>.</p>`;table(data.slice(-250),time,`${method} ${metric}`);
  }
  async function runMissing(){
    resetResult();const data=cols.map(c=>{const n=rows.filter(r=>isBlank(r[c])).length;return [c,n,rows.length?100*n/rows.length:0];}).sort((a,b)=>b[1]-a[1]);const rowsMissing=rows.filter(r=>cols.some(c=>isBlank(r[c]))).length,total=data.reduce((s,x)=>s+x[1],0);
    answer.innerHTML=`<h3>Missing values by column</h3><p>The working dataset contains <strong>${fmt(total)}</strong> missing cells. <strong>${fmt(rowsMissing)}</strong> of ${fmt(rows.length)} rows contain at least one missing value; ${fmt(rows.length-rowsMissing)} rows are complete across all current columns.</p>`;
    tableWrap.innerHTML=`<div class="data-table-scroll"><table class="data-result-table"><thead><tr><th>Column</th><th>Missing cells</th><th>Missing %</th></tr></thead><tbody>${data.map(x=>`<tr><td><strong>${esc(x[0])}</strong></td><td>${fmt(x[1])}</td><td>${x[2].toFixed(1)}%</td></tr>`).join('')}</tbody></table></div>`;
    const shown=data.filter(x=>x[1]>0).slice(0,20);if(shown.length)await draw(shown.map(x=>x[0]),shown.map(x=>x[1]),'Missing cells','bar');
  }
  function runOutliers(){const detail=(document.getElementById('builderOutlierAction')?.value||'Review only')+' — '+(document.getElementById('builderMetric')?.value||'');return studio?studio.mutate('Outlier treatment',detail,()=>legacyRunOutliers()):legacyRunOutliers();}
  function legacyRunOutliers(){
    resetResult();const metric=document.getElementById('builderMetric')?.value,action=document.getElementById('builderOutlierAction')?.value||'Review only';if(!metric){answer.innerHTML='<h3>Choose a numeric field</h3><p>Select the variable to review.</p>';return;}
    const observations=rows.map((r,i)=>({row:i+1,value:num(r[metric])})).filter(x=>Number.isFinite(x.value));if(observations.length<4){answer.innerHTML='<h3>Not enough numeric observations</h3><p>At least four valid numeric values are required for an IQR review.</p>';return;}
    const values=observations.map(x=>x.value),q1=quantile(values,.25),q3=quantile(values,.75),iqr=q3-q1,lower=q1-1.5*iqr,upper=q3+1.5*iqr,flagged=observations.filter(x=>x.value<lower||x.value>upper),flaggedRows=new Set(flagged.map(x=>x.row-1));let change='No rows were changed.';
    if(action==='Remove flagged rows'&&flagged.length){rows=rows.filter((r,i)=>!flaggedRows.has(i));change=`${flagged.length} flagged row(s) were removed from the working copy.`;}
    if(action==='Winsorize to IQR fences'&&flagged.length){rows=rows.map((r,i)=>flaggedRows.has(i)?{...r,[metric]:Math.min(upper,Math.max(lower,num(r[metric])))}:r);change=`${flagged.length} flagged value(s) were capped at the lower or upper IQR fence in the working copy.`;}
    if(action!=='Review only'&&flagged.length){infer();renderProfile();makeSuggestions();renderQuickActions();quickConfig.classList.add('hidden');}
    answer.innerHTML=`<h3>Outlier review — ${esc(metric)}</h3><p>Using the 1.5×IQR rule: Q1 = <strong>${fmt(q1)}</strong>, Q3 = <strong>${fmt(q3)}</strong>, IQR = <strong>${fmt(iqr)}</strong>, lower fence = <strong>${fmt(lower)}</strong>, upper fence = <strong>${fmt(upper)}</strong>. DAYRIXA flagged <strong>${fmt(flagged.length)}</strong> of ${fmt(observations.length)} numeric observations.</p><p>${esc(change)}</p>${action!=='Review only'&&flagged.length?restoreButton():''}`;
    tableWrap.innerHTML=flagged.length?`<div class="data-table-scroll"><table class="data-result-table"><thead><tr><th>Working row</th><th>${esc(metric)}</th><th>Direction</th></tr></thead><tbody>${flagged.slice(0,250).map(x=>`<tr><td>${x.row}</td><td>${fmt(x.value)}</td><td>${x.value<lower?'Below lower fence':'Above upper fence'}</td></tr>`).join('')}</tbody></table></div>`:'<p class="data-builder-note">No observations fall outside the IQR fences.</p>';
    document.getElementById('restoreOriginal')?.addEventListener('click',restoreWorkingCopy);
  }
  async function runChartBuilder(){resetResult();const x=document.getElementById('builderX').value,y=document.getElementById('builderY').value,type=document.getElementById('builderChart').value,agg=document.getElementById('builderAgg').value;if(!x||!y)return;const rawMode=agg==='Original data (no aggregation)';let chartType=type==='Auto'?(types[x]==='date'?'line':types[x]==='numeric'?'scatter':'bar'):type.toLowerCase();if(rawMode){if(chartType==='scatter'){const pts=rows.map(r=>[num(r[x]),num(r[y])]).filter(p=>p.every(Number.isFinite));if(!pts.length){answer.innerHTML='<h3>Chart unavailable</h3><p>A scatter chart requires two numeric fields.</p>';return;}await draw(pts.map(p=>p[0]),pts.map(p=>p[1]),`${y} vs ${x} — original observations`,'scatter');answer.innerHTML=`<h3>${esc(y)} versus ${esc(x)} — original data</h3><p>No aggregation was applied. The chart uses ${pts.length} complete row-level observations from the working dataset; each point represents one original observation.</p>`;return;}const d=rows.map(r=>[String(r[x]??''),num(r[y])]).filter(v=>v[0]!==''&&Number.isFinite(v[1]));if(!d.length){answer.innerHTML='<h3>Chart unavailable</h3><p>No complete observations were found for the selected fields.</p>';return;}const shown=d.slice(0,500);await draw(shown.map(v=>v[0]),shown.map(v=>v[1]),`${y} — original observations`,chartType);answer.innerHTML=`<h3>${esc(y)} by ${esc(x)} — original data</h3><p>No aggregation was applied. The chart displays ${shown.length}${d.length>shown.length?` of ${d.length}`:''} row-level observations in their dataset order${d.length>shown.length?' to keep the browser chart responsive':''}.</p>`;return;}let d=aggregate(x,y,agg).sort((a,b)=>b[1]-a[1]);if(d.length>30)d=d.slice(0,30);if(chartType==='scatter')chartType='bar';await draw(d.map(v=>v[0]),d.map(v=>v[1]),`${agg} ${y}`,chartType);const max=d.reduce((a,b)=>b[1]>a[1]?b:a,d[0]),min=d.reduce((a,b)=>b[1]<a[1]?b:a,d[0]);answer.innerHTML=`<h3>${esc(agg)} ${esc(y)} by ${esc(x)}</h3><p>This is an aggregated view using ${agg.toLowerCase()}. The highest displayed value is <strong>${esc(max?.[0])}</strong> at <strong>${fmt(max?.[1])}</strong>, while the lowest is <strong>${esc(min?.[0])}</strong> at <strong>${fmt(min?.[1])}</strong>.</p>`;}
  async function runCorrelationBuilder(){resetResult();const a=document.getElementById('builderA').value,b=document.getElementById('builderB').value;if(a===b){answer.innerHTML='<h3>Choose two different variables</h3><p>Correlation is most useful when comparing two different numeric fields.</p>';return;}const p=pearsonFor(a,b),ar=Math.abs(p.r);let phrase=!Number.isFinite(p.r)?'could not be calculated':ar>=.7?'a strong':ar>=.4?'a moderate':ar>=.2?'a weak':'a very weak';let dir=p.r>=0?'positive':'negative';answer.innerHTML=`<h3>Correlation: ${esc(a)} vs ${esc(b)}</h3><p>Across ${p.n} complete observations, Pearson correlation is <strong>${Number.isFinite(p.r)?p.r.toFixed(3):'not available'}</strong>. This indicates ${phrase}${Number.isFinite(p.r)?` ${dir}`:''} linear association. Correlation does not establish causation.</p>`;const pts=rows.map(r=>[num(r[a]),num(r[b])]).filter(x=>x.every(Number.isFinite));if(pts.length)await draw(pts.map(x=>x[0]),pts.map(x=>x[1]),`${b} vs ${a}`,'scatter');}
  function selectedValues(selector){return [...quickConfig.querySelectorAll(selector+':checked')].map(x=>x.value);}
  function basicStats(f){const v=rows.map(r=>num(r[f])).filter(Number.isFinite);if(!v.length)return null;const n=v.length,mean=v.reduce((a,b)=>a+b,0)/n,sd=n>1?Math.sqrt(v.reduce((z,x)=>z+(x-mean)**2,0)/(n-1)):0;return {n,missing:rows.length-n,mean,median:quantile(v,.5),sd,min:Math.min(...v),q1:quantile(v,.25),q3:quantile(v,.75),max:Math.max(...v)};}
  function runDescriptive(){resetResult();const fs=selectedValues('.desc-var');if(!fs.length){answer.innerHTML='<h3>Select at least one variable</h3><p>Choose one or more numeric variables to build the descriptive-statistics table.</p>';return;}const data=fs.map(f=>[f,basicStats(f)]).filter(x=>x[1]);answer.innerHTML=`<h3>Descriptive statistics — ${data.length} variable${data.length===1?'':'s'}</h3><p>Each row is a selected variable. The columns report sample size, missing values, center, dispersion, quartiles and range from the current working dataset.</p>`;tableWrap.innerHTML=`<div class="data-table-scroll"><table class="data-result-table"><thead><tr><th>Variable</th><th>N</th><th>Missing</th><th>Mean</th><th>Median</th><th>SD</th><th>Q1 (25%)</th><th>Q3 (75%)</th><th>Min</th><th>Max</th></tr></thead><tbody>${data.map(([f,z])=>`<tr><td><strong>${esc(f)}</strong></td><td>${fmt(z.n)}</td><td>${fmt(z.missing)}</td><td>${fmt(z.mean)}</td><td>${fmt(z.median)}</td><td>${fmt(z.sd)}</td><td>${fmt(z.q1)}</td><td>${fmt(z.q3)}</td><td>${fmt(z.min)}</td><td>${fmt(z.max)}</td></tr>`).join('')}</tbody></table></div>`;}
  function sampleSd(a){if(a.length<2)return 0;const m=a.reduce((s,x)=>s+x,0)/a.length;return Math.sqrt(a.reduce((s,x)=>s+(x-m)**2,0)/(a.length-1));}
  function panelDate(v){const d=new Date(v);return Number.isNaN(d.getTime())?null:d;}
  function panelSetup(){const id=document.getElementById('builderPanelId')?.value,time=document.getElementById('builderPanelTime')?.value,fs=selectedValues('.panel-var');if(!id||!time||id===time){answer.innerHTML='<h3>Choose different panel identifiers</h3><p>The entity/ID field and time field must be different.</p>';return null;}return {id,time,fs};}
  function panelDiagnostics(id,time){const usable=rows.filter(r=>String(r[id]??'').trim()&&String(r[time]??'').trim());const byId=new Map(),keyCounts=new Map(),periodSet=new Set();for(const r of usable){const e=String(r[id]).trim(),t=String(r[time]).trim();periodSet.add(t);if(!byId.has(e))byId.set(e,new Set());byId.get(e).add(t);const k=e+'\u0000'+t;keyCounts.set(k,(keyCounts.get(k)||0)+1);}const lens=[...byId.values()].map(x=>x.size).sort((a,b)=>a-b),duplicateKeys=[...keyCounts.values()].filter(n=>n>1).length,maxT=lens.length?Math.max(...lens):0,minT=lens.length?Math.min(...lens):0,meanT=lens.length?lens.reduce((a,b)=>a+b,0)/lens.length:0,medianT=lens.length?quantile(lens,.5):0,balanced=lens.length>0&&minT===maxT;return {usable,byId,periodSet,lens,duplicateKeys,maxT,minT,meanT,medianT,balanced};}
  async function runPanelIntelligence(){resetResult();const cfg=panelSetup();if(!cfg)return;const {id,time,fs}=cfg,mode=document.getElementById('builderPanelMode')?.value||'Panel structure',d=panelDiagnostics(id,time);if(mode==='Panel structure'){const totalPossible=d.byId.size*d.periodSet.size,coverage=totalPossible?100*d.usable.length/totalPossible:0;answer.innerHTML=`<h3>Panel structure</h3><p>DAYRIXA found <strong>${fmt(d.byId.size)}</strong> entities and <strong>${fmt(d.periodSet.size)}</strong> distinct time values. The panel is <strong>${d.balanced?'balanced':'unbalanced'}</strong>. Entity-time keys are checked before any panel calculation.</p>`;tableWrap.innerHTML=`<div class="data-table-scroll"><table class="data-result-table"><thead><tr><th>Diagnostic</th><th>Result</th></tr></thead><tbody><tr><td>Entities</td><td>${fmt(d.byId.size)}</td></tr><tr><td>Distinct time values</td><td>${fmt(d.periodSet.size)}</td></tr><tr><td>Usable entity-time rows</td><td>${fmt(d.usable.length)}</td></tr><tr><td>Observations per entity — min</td><td>${fmt(d.minT)}</td></tr><tr><td>Observations per entity — median</td><td>${fmt(d.medianT)}</td></tr><tr><td>Observations per entity — mean</td><td>${fmt(d.meanT)}</td></tr><tr><td>Observations per entity — max</td><td>${fmt(d.maxT)}</td></tr><tr><td>Duplicate entity × time keys</td><td>${fmt(d.duplicateKeys)}</td></tr><tr><td>Rectangular coverage</td><td>${coverage.toFixed(1)}%</td></tr><tr><td>Structure</td><td>${d.balanced?'Balanced':'Unbalanced'}</td></tr></tbody></table></div>`;return;}
    if(!fs.length){answer.innerHTML='<h3>Select at least one variable</h3><p>Choose one or more numeric variables for this panel analysis.</p>';return;}
    if(mode==='Overall / Between / Within'){const result=[];for(const f of fs){const valid=rows.map(r=>({id:String(r[id]??'').trim(),v:num(r[f])})).filter(x=>x.id&&Number.isFinite(x.v));if(!valid.length)continue;const all=valid.map(x=>x.v),groups=new Map();valid.forEach(x=>{if(!groups.has(x.id))groups.set(x.id,[]);groups.get(x.id).push(x.v)});const means=[...groups.values()].map(a=>a.reduce((s,x)=>s+x,0)/a.length),within=[];for(const a of groups.values()){const m=a.reduce((s,x)=>s+x,0)/a.length;a.forEach(x=>within.push(x-m));}result.push([f,valid.length,groups.size,all.reduce((s,x)=>s+x,0)/all.length,sampleSd(all),sampleSd(means),sampleSd(within),Math.min(...all),Math.max(...all)]);}answer.innerHTML=`<h3>Overall / Between / Within statistics</h3><p><strong>Between SD</strong> measures dispersion in entity-specific time means; <strong>Within SD</strong> measures variation around each entity's own mean. This separates cross-entity and time-series variation.</p>`;tableWrap.innerHTML=`<div class="data-table-scroll"><table class="data-result-table"><thead><tr><th>Variable</th><th>N</th><th>Entities</th><th>Mean</th><th>Overall SD</th><th>Between SD</th><th>Within SD</th><th>Min</th><th>Max</th></tr></thead><tbody>${result.map(x=>`<tr><td><strong>${esc(x[0])}</strong></td>${x.slice(1).map(v=>`<td>${fmt(v)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;return;}
    if(mode==='Entity means'){const f=fs[0],groups=new Map();for(const r of rows){const e=String(r[id]??'').trim(),v=num(r[f]);if(!e||!Number.isFinite(v))continue;if(!groups.has(e))groups.set(e,[]);groups.get(e).push(v);}const vals=[...groups].map(([e,a])=>[e,a.reduce((s,x)=>s+x,0)/a.length,a.length]).sort((a,b)=>b[1]-a[1]),means=vals.map(x=>x[1]);answer.innerHTML=`<h3>Entity means — ${esc(f)}</h3><p>${fmt(vals.length)} entity-specific time-series means were calculated. The mean of entity means is <strong>${fmt(means.reduce((a,b)=>a+b,0)/means.length)}</strong>, with median <strong>${fmt(quantile(means,.5))}</strong>. The ranked table lets you inspect heterogeneity across entities.</p>`;tableWrap.innerHTML=`<div class="data-table-scroll"><table class="data-result-table"><thead><tr><th>Rank</th><th>${esc(id)}</th><th>Time-series mean</th><th>Observations</th></tr></thead><tbody>${vals.slice(0,100).map((x,i)=>`<tr><td>${i+1}</td><td>${esc(x[0])}</td><td>${fmt(x[1])}</td><td>${fmt(x[2])}</td></tr>`).join('')}</tbody></table></div>`;return;}
    if(mode==='Cross-sectional mean over time'){const f=fs[0],groups=new Map();for(const r of rows){const t=String(r[time]??'').trim(),v=num(r[f]);if(!t||!Number.isFinite(v))continue;if(!groups.has(t))groups.set(t,[]);groups.get(t).push(v);}let vals=[...groups].map(([t,a])=>[t,a.reduce((s,x)=>s+x,0)/a.length,a.length]);vals.sort((a,b)=>{const da=panelDate(a[0]),db=panelDate(b[0]);return da&&db?da-db:String(a[0]).localeCompare(String(b[0]));});await draw(vals.map(x=>x[0]),vals.map(x=>x[1]),`Average ${f}`,'line');answer.innerHTML=`<h3>Cross-sectional mean over time — ${esc(f)}</h3><p>For every time value, DAYRIXA averages ${esc(f)} across the entities observed at that time. This produces a panel-wide time series while retaining the number of contributing entities in the table.</p>`;tableWrap.innerHTML=`<div class="data-table-scroll"><table class="data-result-table"><thead><tr><th>${esc(time)}</th><th>Cross-sectional mean</th><th>Entities / observations</th></tr></thead><tbody>${vals.slice(-250).map(x=>`<tr><td>${esc(x[0])}</td><td>${fmt(x[1])}</td><td>${fmt(x[2])}</td></tr>`).join('')}</tbody></table></div>`;return;}}
  function suggestedGenericName(c){const vals=rows.slice(0,500).map(r=>r[c]).filter(v=>!isBlank(v));if(!vals.length)return 'Empty_Field';const dateShare=vals.filter(looksDateValue).length/vals.length;const numericShare=vals.filter(v=>Number.isFinite(num(v))).length/vals.length;if(dateShare>.7)return 'Date';if(numericShare>.8){const nums=vals.map(num).filter(Number.isFinite);const bounded=nums.length&&nums.filter(v=>v>=-1&&v<=1).length/nums.length>.8;return bounded?'Rate_or_Return':'Numeric_Variable';}return 'Category_or_Label';}
  function isBlank(v){return v===null||v===undefined||String(v).trim()==='';}
  function rawPreviewTable(){
    const maxR=Math.min(10,rawGrid.length), maxC=Math.min(10,Math.max(0,...rawGrid.slice(0,maxR).map(r=>r.length)));
    if(!maxR||!maxC)return '<p class="data-builder-note">Raw spreadsheet preview is unavailable for this file.</p>';
    let h='<div class="data-preview-wrap"><table class="data-preview-table"><thead><tr><th>Row</th>';
    for(let c=0;c<maxC;c++)h+=`<th>${String.fromCharCode(65+c)}</th>`; h+='</tr></thead><tbody>';
    for(let r=0;r<maxR;r++){h+=`<tr><th>${r+1}</th>`;for(let c=0;c<maxC;c++)h+=`<td>${esc((rawGrid[r]||[])[c]??'')}</td>`;h+='</tr>';}
    return h+'</tbody></table></div>';
  }
  function workingPreviewTable(){
    const showC=cols.slice(0,10),showR=rows.slice(0,10);if(!showC.length)return '<p class="data-builder-note">No working columns available.</p>';
    return `<div class="data-preview-wrap"><table class="data-preview-table"><thead><tr><th>#</th>${showC.map(c=>`<th>${esc(c)}</th>`).join('')}</tr></thead><tbody>${showR.map((r,i)=>`<tr><th>${i+1}</th>${showC.map(c=>`<td>${esc(r[c]??'')}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
  }
  function leadingEmptyRawRows(){let n=0;for(const r of rawGrid){if((r||[]).every(isBlank))n++;else break;}return n;}
  function fullyEmptyWorkingCols(){return cols.filter(c=>rows.every(r=>isBlank(r[c])));}
  function uniqueColName(base){let x=(base||'New_Column').trim()||'New_Column',n=2,name=x;while(cols.includes(name))name=`${x}_${n++}`;return name;}
  function openCleaning(){
    const missing=cols.reduce((a,c)=>a+rows.filter(r=>isBlank(r[c])).length,0),dup=rows.length-new Set(rows.map(r=>JSON.stringify(r))).size,unnamed=cols.filter(c=>/^__EMPTY(?:_\d+)?$/i.test(c)||/^Unnamed(?::|_)?\d*$/i.test(c));
    const hs=headerSuggestion,lead=leadingEmptyRawRows(),emptyCols=fullyEmptyWorkingCols();
    const headerBlock=hs?`<div class="data-clean-detect"><strong>Multi-level header structure detected</strong><p>DAYRIXA detected ${hs.headerRows.length} header ${hs.headerRows.length===1?'row':'rows'} before the data begins at spreadsheet row <b>${hs.dataStart+1}</b>. Nothing is changed automatically.</p><div class="data-header-preview">${hs.meta.slice(0,10).map(m=>`<span><b>Column ${m.column}</b>: ${esc(m.display)}</span>`).join('')}${hs.meta.length>10?`<span>+ ${hs.meta.length-10} more…</span>`:''}</div><label class="data-clean-option"><input type="checkbox" id="cleanSmartHeader"><span><strong>Use detected hierarchical headers</strong><small>Apply the detected parent → metric names to the working copy.</small></span></label></div>`:'';
    const renameBlock=unnamed.length?`<div class="data-clean-detect"><strong>Fallback names for fields with no usable header</strong><p>Edit any suggestion before applying.</p>${unnamed.slice(0,8).map((c,i)=>`<label class="data-rename-row"><span>${esc(c)}</span><input id="rename_${i}" data-old="${esc(c)}" value="${esc(suggestedGenericName(c))}_${i+1}"></label>`).join('')}<label class="data-clean-option"><input type="checkbox" id="cleanRenameUnnamed"><span><strong>Rename unnamed fields using edited suggestions</strong><small>Used only when no meaningful hierarchical header is available.</small></span></label></div>`:'';
    const colOptions=cols.map((c,i)=>`<option value="${i}">${i+1}. ${esc(c)}</option>`).join('');
    builderShell('Data cleaning','Inspect the raw spreadsheet and working dataset before making changes. Every edit applies only to the working copy and requires your approval.',`<div class="data-clean-summary"><div><strong>${missing}</strong><span>Missing cells</span></div><div><strong>${dup}</strong><span>Duplicate rows</span></div><div><strong>${unnamed.length}</strong><span>Unnamed columns</span></div></div>
    <div class="data-clean-detect"><strong>Data preview</strong><p>Raw spreadsheet view shows the first 10 rows × 10 columns before header interpretation.</p>${rawPreviewTable()}<details><summary>Working dataset preview</summary>${workingPreviewTable()}</details></div>
    ${headerBlock}${renameBlock}
    <div class="data-clean-detect"><strong>Rows & columns</strong><p>Detected leading empty rows: <b>${lead}</b>. Fully empty working columns: <b>${emptyCols.length}</b>.</p>
      <label class="data-clean-option"><input type="checkbox" id="cleanLeadingRows" ${lead?'':'disabled'}><span><strong>Remove leading empty rows</strong><small>${lead?`Remove the first ${lead} completely empty spreadsheet row(s) and rebuild the working dataset`:'No leading empty rows detected'}</small></span></label>
      <label class="data-clean-option"><input type="checkbox" id="cleanEmptyCols" ${emptyCols.length?'':'disabled'}><span><strong>Remove completely empty columns</strong><small>${emptyCols.length?`${emptyCols.length} completely empty column(s) detected`:'No completely empty working columns detected'}</small></span></label>
      <div class="data-inline-controls"><label><span>Remove a selected column</span><select id="cleanSelectedCol"><option value="">None</option>${colOptions}</select></label><label><span>Remove working row #</span><input id="cleanSelectedRow" type="number" min="1" max="${rows.length}" placeholder="e.g. 1"></label></div>
    </div>
    <div class="data-clean-detect"><strong>Add data structure</strong><p>Add a blank row or a new named column. Existing source data is not overwritten.</p>
      <div class="data-inline-controls"><label><span>New column name</span><input id="cleanNewColName" placeholder="e.g. Recession"></label><label><span>Initial value (optional)</span><input id="cleanNewColValue" placeholder="Blank by default"></label></div>
      <label class="data-clean-option"><input type="checkbox" id="cleanAddColumn"><span><strong>Add new column</strong><small>The chosen initial value is applied to every working row; leave blank for empty cells.</small></span></label>
      <label class="data-clean-option"><input type="checkbox" id="cleanAddRow"><span><strong>Add one blank row</strong><small>Adds an empty row at the end of the working dataset.</small></span></label>
    </div>
    <label class="data-clean-option"><input type="checkbox" id="cleanDuplicates" ${dup?'':'disabled'}><span><strong>Remove duplicate rows</strong><small>${dup?`${dup} duplicate rows detected`:'No duplicate rows detected'}</small></span></label>
    <label class="data-clean-option"><input type="checkbox" id="cleanMissingRows" ${missing?'':'disabled'}><span><strong>Remove rows containing missing cells</strong><small>${missing?'Rows with at least one missing value will be removed':'No missing cells detected'}</small></span></label>
    <div class="data-clean-warning">Original uploaded data remains preserved in memory for this session. Restore original working copy is available after applying changes.</div>`,'Preview & apply selected changes');
    document.getElementById('dataBuilderRun').onclick=()=>safeRun(()=>applyCleaning(),'Data cleaning could not be applied');
  }
  function applyCleaning(){const flags={cleanDuplicates:'Remove duplicate rows',cleanMissingRows:'Remove rows with missing cells',cleanSmartHeader:'Apply hierarchical header',cleanRenameUnnamed:'Rename fields',cleanLeadingRows:'Remove leading blank rows',cleanEmptyCols:'Remove empty columns',cleanAddColumn:'Add column',cleanAddRow:'Add blank row'};const actions=Object.entries(flags).filter(([id])=>document.getElementById(id)?.checked).map(([,label])=>label);const col=document.getElementById('cleanSelectedCol')?.value,row=document.getElementById('cleanSelectedRow')?.value;if(col!==undefined&&col!=='')actions.push('Remove column: '+cols[Number(col)]);if(Number(row)>0)actions.push('Remove working row: '+row);if(document.getElementById('cleanAddColumn')?.checked)actions.push('Name: '+document.getElementById('cleanNewColName')?.value+'; initial value: '+document.getElementById('cleanNewColValue')?.value);return studio?studio.mutate('Data cleaning',actions.join('; '),()=>legacyApplyCleaning()):legacyApplyCleaning();}
  function legacyApplyCleaning(){
    const beforeR=rows.length,beforeC=cols.length,doDup=document.getElementById('cleanDuplicates')?.checked,doMissing=document.getElementById('cleanMissingRows')?.checked,doSmart=document.getElementById('cleanSmartHeader')?.checked,doRename=document.getElementById('cleanRenameUnnamed')?.checked,doLead=document.getElementById('cleanLeadingRows')?.checked,doEmpty=document.getElementById('cleanEmptyCols')?.checked,doAddCol=document.getElementById('cleanAddColumn')?.checked,doAddRow=document.getElementById('cleanAddRow')?.checked;
    const selectedCol=document.getElementById('cleanSelectedCol')?.value,selectedRow=Number(document.getElementById('cleanSelectedRow')?.value||0);
    if(!doDup&&!doMissing&&!doSmart&&!doRename&&!doLead&&!doEmpty&&!doAddCol&&!doAddRow&&selectedCol===''&&!selectedRow){quickConfig.insertAdjacentHTML('beforeend','<div class="data-clean-warning">Select at least one cleaning action first.</div>');return;}
    let notes=[];const selectedName=selectedCol!==''?cols[Number(selectedCol)]:null;
    if(doLead){const n=leadingEmptyRawRows();if(n){rawGrid=rawGrid.slice(n);rawMerges=rawMerges.filter(m=>m.e.r>=n).map(m=>({s:{r:Math.max(0,m.s.r-n),c:m.s.c},e:{r:m.e.r-n,c:m.e.c}}));headerSuggestion=detectSmartHeader(rawGrid,rawMerges);notes.push(`${n} leading empty raw row(s) removed`);}}
    if(doSmart&&rebuildFromSmartHeader())notes.push(`Hierarchical header structure applied`);
    if(doRename&&!doSmart){const renames={};quickConfig.querySelectorAll('.data-rename-row input').forEach(inp=>{const old=inp.dataset.old,nw=inp.value.trim();if(old&&nw&&old!==nw)renames[old]=nw;});if(Object.keys(renames).length){if(new Set(cols.map(c=>renames[c]||c)).size!==cols.length)throw new Error('Renamed fields must have unique names.');cols=cols.map(c=>renames[c]||c);rows=rows.map(r=>{const o={};Object.entries(r).forEach(([k,v])=>o[renames[k]||k]=v);return o;});notes.push(`${Object.keys(renames).length} unnamed field(s) renamed`);}}
    if(doEmpty){const bad=new Set(fullyEmptyWorkingCols());if(bad.size){cols=cols.filter(c=>!bad.has(c));rows=rows.map(r=>Object.fromEntries(cols.map(c=>[c,r[c]])));notes.push(`${bad.size} completely empty column(s) removed`);}}
    if(selectedCol!==''){const c=selectedName,i=cols.indexOf(c);if(c!==undefined&&i>=0){cols.splice(i,1);rows=rows.map(r=>{const o={...r};delete o[c];return o;});notes.push(`Column “${c}” removed`);}}
    if(selectedRow>=1&&selectedRow<=rows.length){rows.splice(selectedRow-1,1);notes.push(`Working row ${selectedRow} removed`);}
    if(doDup){const seen=new Set();rows=rows.filter(r=>{const k=JSON.stringify(r);if(seen.has(k))return false;seen.add(k);return true;});notes.push('Duplicate rows removed');}
    if(doMissing){rows=rows.filter(r=>cols.every(c=>!isBlank(r[c])));notes.push('Rows containing missing cells removed');}
    if(doAddCol){const name=uniqueColName(document.getElementById('cleanNewColName')?.value),v=document.getElementById('cleanNewColValue')?.value??'';cols.push(name);rows=rows.map(r=>({...r,[name]:v}));notes.push(`New column “${name}” added`);}
    if(doAddRow){rows.push(Object.fromEntries(cols.map(c=>[c,''])));notes.push('One blank row added');}
    infer();renderProfile();makeSuggestions();renderQuickActions();quickConfig.classList.add('hidden');resetResult();answer.innerHTML=`<h3>Cleaning applied to working copy</h3><p>${notes.map(esc).join('. ')}.</p><p>The working dataset changed from <strong>${beforeR} rows × ${beforeC} columns</strong> to <strong>${rows.length} rows × ${cols.length} columns</strong>.</p><button id="restoreOriginal" class="data-restore-btn" type="button">Restore original working copy</button>`;
    document.getElementById('restoreOriginal').onclick=restoreWorkingCopy;
  }
  function matInv(A){const n=A.length,M=A.map((r,i)=>[...r,...Array.from({length:n},(_,j)=>i===j?1:0)]);for(let i=0;i<n;i++){let p=i;for(let r=i+1;r<n;r++)if(Math.abs(M[r][i])>Math.abs(M[p][i]))p=r;if(Math.abs(M[p][i])<1e-12)throw new Error('The model matrix is singular. Remove redundant or constant predictors.');[M[i],M[p]]=[M[p],M[i]];const d=M[i][i];for(let j=0;j<2*n;j++)M[i][j]/=d;for(let r=0;r<n;r++)if(r!==i){const f=M[r][i];for(let j=0;j<2*n;j++)M[r][j]-=f*M[i][j];}}return M.map(r=>r.slice(n));}
  function runRegression(){safeRun(()=>estimateRegression(),"Regression could not be estimated");}
  function estimateRegression(){
    resetResult();let y=document.getElementById('builderRegY')?.value,xs=selectedValues('.reg-x'),intercept=document.getElementById('builderRegIntercept')?.checked!==false;const formula=(document.getElementById('builderRegFormula')?.value||'').trim();
    if(formula){
      const parsed=parseModelFormula(formula,numericCols());y=parsed.y;xs=parsed.xs;
    }
    xs=[...new Set(xs.filter(x=>x&&x!==y))];if(!y||!xs.length){answer.innerHTML='<h3>Define a regression model</h3><p>Select one dependent variable and at least one independent variable.</p>';return;}
    const obs=[];for(const r of rows){const yy=num(r[y]),xx=xs.map(c=>num(r[c]));if(Number.isFinite(yy)&&xx.every(Number.isFinite))obs.push({y:yy,x:intercept?[1,...xx]:xx});}
    const n=obs.length,k=(intercept?1:0)+xs.length;if(n<=k){answer.innerHTML='<h3>Not enough complete observations</h3><p>The regression needs more complete observations than estimated coefficients.</p>';return;}
    try{const XtX=Array.from({length:k},()=>Array(k).fill(0)),Xty=Array(k).fill(0);for(const o of obs)for(let i=0;i<k;i++){Xty[i]+=o.x[i]*o.y;for(let j=0;j<k;j++)XtX[i][j]+=o.x[i]*o.x[j];}const inv=matInv(XtX),b=inv.map(r=>r.reduce((s,v,j)=>s+v*Xty[j],0));const ybar=obs.reduce((s,o)=>s+o.y,0)/n;let sse=0,sst=0;for(const o of obs){const yh=o.x.reduce((s,v,i)=>s+v*b[i],0);sse+=(o.y-yh)**2;sst+=(intercept?o.y-ybar:o.y)**2;}const df=n-k,s2=sse/df,se=inv.map((r,i)=>Math.sqrt(Math.max(0,s2*r[i]))),r2=sst>0?1-sse/sst:NaN,adj=Number.isFinite(r2)?1-(1-r2)*(n-(intercept?1:0))/(n-k):NaN;const names=intercept?['Intercept',...xs]:xs;answer.innerHTML=`<h3>OLS regression — ${esc(y)}</h3><p><strong>N = ${fmt(n)}</strong>, R² = <strong>${Number.isFinite(r2)?r2.toFixed(4):'—'}</strong>, adjusted R² = <strong>${Number.isFinite(adj)?adj.toFixed(4):'—'}</strong>. Model: <strong>${esc(y)} ~ ${esc(xs.join(' + '))}</strong>${intercept?' with intercept':' without intercept'}.</p><p>This is exploratory browser-side OLS. Standard errors below are conventional OLS standard errors; robust, clustered and panel fixed-effects estimators should be selected explicitly in a later econometrics layer.</p>`;tableWrap.innerHTML=`<div class="data-table-scroll"><table class="data-result-table"><thead><tr><th>Term</th><th>Coefficient</th><th>Std. error</th><th>t statistic</th></tr></thead><tbody>${names.map((nm,i)=>`<tr><td><strong>${esc(nm)}</strong></td><td>${statFmt(b[i])}</td><td>${statFmt(se[i])}</td><td>${se[i]>0?statFmt(b[i]/se[i]):'Undefined (zero SE)'}</td></tr>`).join('')}</tbody></table></div>`;
      const modelText=`${y} ~ ${xs.join(' + ')}`;
      answer.innerHTML=`<h3>OLS regression — ${esc(y)}</h3><p><strong>Model:</strong> ${esc(modelText)}</p><p>Conventional OLS standard errors. The t statistic tests a zero coefficient. These errors are not robust to heteroskedasticity or serial correlation.</p>`;
      const summary=[['Observations (N)',n],['Excluded incomplete rows',rows.length-n],['R²'+(intercept?'':' (uncentered)'),statFmt(r2)],['Adjusted R²'+(intercept?'':' (uncentered)'),statFmt(adj)],['Residual degrees of freedom',df],['Residual standard error',statFmt(Math.sqrt(s2))],['Intercept',intercept?'Included':'Excluded']];
      tableWrap.innerHTML=`<h4>Model summary</h4><table class="data-result-table"><thead><tr><th>Statistic</th><th>Value</th></tr></thead><tbody>${summary.map(([key,value])=>`<tr><td>${esc(key)}</td><td>${esc(value)}</td></tr>`).join('')}</tbody></table><h4>Coefficient estimates</h4>`+tableWrap.innerHTML;
    }catch(e){answer.innerHTML=`<h3>Regression could not be estimated</h3><p>${esc(e.message||e)}</p>`;}
  }
  function table(data,a,b){tableWrap.innerHTML=`<details class="data-result-details"><summary>Show data table (${data.length} displayed rows)</summary><div class="data-table-scroll"><table class="data-result-table"><thead><tr><th>${esc(a)}</th><th>${esc(b)}</th></tr></thead><tbody>${data.map(x=>`<tr><td>${esc(x[0])}</td><td>${fmt(x[1])}</td></tr>`).join('')}</tbody></table></div></details>`;}

  function normalizeWords(x){return String(x||'').toLowerCase().replace(/[_—–-]+/g,' ').replace(/[^a-z0-9% ]/g,' ').split(/\s+/).filter(w=>w.length>2&&!['the','and','for','what','happening','happened','show','give','value','values'].includes(w));}
  const statFmt=n=>Number.isFinite(n)?(n!==0&&Math.abs(n)<0.0001?n.toExponential(4):n.toFixed(4)):'Not defined';
  function aliasOf(name){return String(name).split(/\s+[—–-]\s+/).pop().trim();}
  function resolveVariable(name,candidates){
    name=name.trim().replace(/^`(.*)`$/,'$1');
    const exact=candidates.filter(c=>c.toLowerCase()===name.toLowerCase());
    if(exact.length===1)return exact[0];
    const aliases=candidates.filter(c=>aliasOf(c).toLowerCase()===name.toLowerCase());
    if(aliases.length===1)return aliases[0];
    throw new Error(aliases.length?'Ambiguous variable: '+name+'. Use the complete column name.':'Unknown variable: '+name+'. Select an existing numeric column or use its exact alias.');
  }
  function parseModelFormula(formula,candidates){
    const parts=formula.split('~');if(parts.length!==2||!parts[0].trim()||!parts[1].trim())throw new Error('Use Y ~ X1 + X2. Choose the intercept with the checkbox.');
    const y=resolveVariable(parts[0],candidates),xs=parts[1].split('+').map(v=>resolveVariable(v,candidates));
    if(xs.includes(y))throw new Error('The dependent variable cannot also be an explanatory variable.');
    return {y,xs:[...new Set(xs)]};
  }
  function mentionedColumn(q,candidates){
    const text=q.toLowerCase(),tokens=text.match(/[\p{L}\p{N}_/]+/gu)||[];
    const full=candidates.filter(c=>text.includes(c.toLowerCase()));
    if(full.length){const max=Math.max(...full.map(c=>c.length)),best=full.filter(c=>c.length===max);if(best.length===1)return best[0];}
    const aliases=candidates.filter(c=>tokens.includes(aliasOf(c).toLowerCase()));
    if(aliases.length===1)return aliases[0];
    if(aliases.length>1)return null;
    const qw=new Set(normalizeWords(q));let best=null,score=0,tied=false;
    for(const c of candidates){const words=normalizeWords(c).filter(w=>!['index'].includes(w)),n=words.filter(w=>qw.has(w)).length;if(n>score){score=n;best=c;tied=false;}else if(n&&n===score)tied=true;}
    return score&&!tied?best:null;
  }
  function yearFromRow(r,time){const d=panelDate(r[time]);if(d)return d.getFullYear();const m=String(r[time]??'').match(/(?:19|20)\d{2}/);return m?+m[0]:null;}
  async function runQuestion(q){
    q=(q||qInput.value).trim();const low=q.toLowerCase();
    if(/trend|over time|time series|روند/.test(low)){
      resetResult();const metric=mentionedColumn(q,numericCols()),time=mentionedColumn(q,dateCols())||dateCols()[0]||cols.find(c=>/date|time|year|month/i.test(c));
      if(!metric||!time){answer.innerHTML='<h3>Trend needs time and numeric fields</h3><p>DAYRIXA could not identify both a time field and a numeric measure in this dataset.</p>';return;}
      let data=aggregate(time,metric,'Average').filter(x=>Number.isFinite(x[1]));data.sort((a,b)=>{const da=panelDate(a[0]),db=panelDate(b[0]);return da&&db?da-db:String(a[0]).localeCompare(String(b[0]),undefined,{numeric:true});});
      if(!data.length){answer.innerHTML='<h3>No trend observations</h3><p>No complete time and numeric values were found.</p>';return;}
      await draw(data.map(x=>x[0]),data.map(x=>x[1]),`Average ${metric}`,'line');answer.innerHTML=`<h3>${esc(metric)} trend over ${esc(time)}</h3><p>Selected variable: <strong>${esc(metric)}</strong>. ${data.length} time periods; first period average ${fmt(data[0][1])}, last period average ${fmt(data[data.length-1][1])}. Each point is the average within its time period. The data table is optional below.</p>`;table(data.slice(-250),time,`Average ${metric}`);return;
    }
    const exact=numericCols().filter(c=>c.toLowerCase()===low||aliasOf(c).toLowerCase()===low);
    if(exact.length===1){resetResult();const z=basicStats(exact[0]);answer.innerHTML=`<h3>Summary — ${esc(exact[0])}</h3><p>${z?`N = ${z.n}; mean = ${statFmt(z.mean)}; standard deviation = ${statFmt(z.sd)}; min = ${statFmt(z.min)}; max = ${statFmt(z.max)}.`:'No valid numeric observations.'}</p><p>Ask for a trend, average, or correlation to explore this variable.</p>`;return;}
    return analyze(q);
  }
  async function answerYearQuestion(q,measure,year){const time=dateCols()[0]||cols.find(c=>/date|time|year|month/i.test(c));if(!time||!measure)return false;const yr=rows.filter(r=>yearFromRow(r,time)===year).map(r=>num(r[measure])).filter(Number.isFinite);if(!yr.length)return false;const mean=yr.reduce((a,b)=>a+b,0)/yr.length,med=quantile(yr,.5),sd=sampleSd(yr);const prev=rows.filter(r=>yearFromRow(r,time)===year-1).map(r=>num(r[measure])).filter(Number.isFinite),next=rows.filter(r=>yearFromRow(r,time)===year+1).map(r=>num(r[measure])).filter(Number.isFinite);const pm=prev.length?prev.reduce((a,b)=>a+b,0)/prev.length:NaN,nm=next.length?next.reduce((a,b)=>a+b,0)/next.length:NaN;const monthly=new Map();for(const r of rows){const d=panelDate(r[time]),v=num(r[measure]);if(d&&d.getFullYear()===year&&Number.isFinite(v)){const k=`${year}-${String(d.getMonth()+1).padStart(2,'0')}`;if(!monthly.has(k))monthly.set(k,[]);monthly.get(k).push(v);}}const trend=[...monthly].map(([k,a])=>[k,a.reduce((s,x)=>s+x,0)/a.length]);if(trend.length>1)await draw(trend.map(x=>x[0]),trend.map(x=>x[1]),`Average ${measure}`,'line');let comparison='';if(Number.isFinite(pm))comparison+=` Compared with ${year-1}, the mean changed by <strong>${fmt(mean-pm)}</strong>.`;if(Number.isFinite(nm))comparison+=` Compared with ${year+1}, it differs by <strong>${fmt(mean-nm)}</strong>.`;answer.innerHTML=`<h3>${esc(measure)} in ${year}</h3><p>There are <strong>${fmt(yr.length)}</strong> numeric observations in ${year}. Mean ${esc(measure)} is <strong>${fmt(mean)}</strong>, median is <strong>${fmt(med)}</strong>, and standard deviation is <strong>${fmt(sd)}</strong>.${comparison}</p>`;tableWrap.innerHTML=`<div class="data-table-scroll"><table class="data-result-table"><thead><tr><th>Period</th><th>N</th><th>Mean</th></tr></thead><tbody><tr><td>${year}</td><td>${fmt(yr.length)}</td><td>${fmt(mean)}</td></tr>${Number.isFinite(pm)?`<tr><td>${year-1}</td><td>${fmt(prev.length)}</td><td>${fmt(pm)}</td></tr>`:''}${Number.isFinite(nm)?`<tr><td>${year+1}</td><td>${fmt(next.length)}</td><td>${fmt(nm)}</td></tr>`:''}</tbody></table></div>`;return true;}
  async function analyze(q){q=(q||qInput.value).trim();if(!q)return;resetResult();const low=q.toLowerCase();let measure=mentionedColumn(q,numericCols());let cat=mentionedColumn(q,catCols())||catCols().find(c=>low.includes(c.toLowerCase()))||bestCategory();const ym=low.match(/\b(19|20)\d{2}\b/);if(ym&&measure&&await answerYearQuestion(q,measure,+ym[0]))return;if(/missing|null|empty/.test(low)){return runMissing();}if(/correlation|correlat/.test(low)&&numericCols().length>1){const cs=numericCols().filter(c=>mentionedColumn(q,[c])),a=cs[0],b=cs[1];if(cs.length!==2){answer.innerHTML='<h3>Specify two variables</h3><p>Use the complete names or unique aliases of two numeric columns.</p>';return;}const p=pearsonFor(a,b);answer.innerHTML=`<h3>Correlation: ${esc(a)} vs ${esc(b)}</h3><p>Pearson correlation across ${p.n} complete observations is <strong>${Number.isFinite(p.r)?p.r.toFixed(3):'not available'}</strong>. Correlation describes association, not causation.</p>`;return;}if(measure&&/total|sum/.test(low)){const vals=rows.map(r=>num(r[measure])).filter(Number.isFinite),v=vals.reduce((a,b)=>a+b,0);answer.innerHTML=`<h3>Total ${esc(measure)}</h3><p>Across ${vals.length} numeric observations, total ${esc(measure)} is <strong>${fmt(v)}</strong>.</p>`;return;}if(measure&&/average|mean/.test(low)){const vals=rows.map(r=>num(r[measure])).filter(Number.isFinite),v=vals.reduce((a,b)=>a+b,0)/vals.length;answer.innerHTML=`<h3>Average ${esc(measure)}</h3><p>Across ${vals.length} numeric observations, average ${esc(measure)} is <strong>${fmt(v)}</strong>.</p>`;return;}if(measure&&cat&&/(top|highest|best|most|bottom|lowest|least|worst)/.test(low)){let d=aggregate(cat,measure,'Sum').sort((a,b)=>b[1]-a[1]);const bottom=/(bottom|lowest|least|worst)/.test(low);if(bottom)d=d.reverse();const match=low.match(/\b(\d{1,2})\b/),n=match?Math.min(20,+match[1]):5;d=d.slice(0,n);await draw(d.map(x=>x[0]),d.map(x=>x[1]),measure,'bar');answer.innerHTML=`<h3>${bottom?'Lowest':'Top'} ${n} ${esc(cat)} by ${esc(measure)}</h3><p>${bottom?'The lowest':'The highest'} result is <strong>${esc(d[0]?.[0])}</strong> with aggregated ${esc(measure)} of <strong>${fmt(d[0]?.[1])}</strong>. The complete ranked list is shown below.</p>`;tableWrap.innerHTML=`<table class="data-result-table"><thead><tr><th>Rank</th><th>${esc(cat)}</th><th>${esc(measure)}</th></tr></thead><tbody>${d.map((x,i)=>`<tr><td>${i+1}</td><td>${esc(x[0])}</td><td>${fmt(x[1])}</td></tr>`).join('')}</tbody></table>`;return;}answer.innerHTML=`<h3>I need a more specific analytical question</h3><p>I can understand variable names or distinctive words inside long column names, years such as 2018, totals, averages, rankings, missing values and correlations. Panel-specific questions are also available through Panel intelligence.</p>`;}

  async function readDataset(file){
    if(file.size>100*1024*1024)throw Error('Dataset import limit is 100 MB.');
    let grid=[],merges=[];
    if(file.name.toLowerCase().endsWith('.csv'))grid=parseCsvText(await file.text());
    else if(/\.(xlsx|xls)$/i.test(file.name)){
      if(!window.XLSX)await loadScript('https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js');
      const wb=window.XLSX.read(await file.arrayBuffer(),{cellDates:true}),ws=wb.Sheets[wb.SheetNames[0]];
      grid=window.XLSX.utils.sheet_to_json(ws,{header:1,defval:'',raw:false});merges=(ws['!merges']||[]).map(m=>({s:{r:m.s.r,c:m.s.c},e:{r:m.e.r,c:m.e.c}}));
    }else throw Error('Choose a CSV, XLSX or XLS file.');
    // Ignore formatting-only cells beyond the last populated column.
    let populatedWidth=0;for(const row of grid)for(let c=row.length-1;c>=0;c--)if(!isBlank(row[c])){populatedWidth=Math.max(populatedWidth,c+1);break;}
    grid=grid.map(row=>row.slice(0,populatedWidth));merges=merges.filter(m=>m.s.c<populatedWidth).map(m=>({...m,e:{...m.e,c:Math.min(m.e.c,populatedWidth-1)}}));
    const h=grid.findIndex(r=>(r||[]).some(v=>!isBlank(v)));if(h<0)throw Error('No tabular rows found');
    const width=grid.slice(h).reduce((max,r)=>Math.max(max,r.length),0),headers=uniqueHeaders(grid[h]||[],width);
    const data=grid.slice(h+1).filter(r=>(r||[]).some(v=>!isBlank(v))).map(arr=>Object.fromEntries(headers.map((c,i)=>[c,arr[i]??''])));
    if(!data.length||!headers.length)throw Error('No tabular rows found');
    if(headers.length>2000||data.length>1000000)throw Error('Dataset exceeds the 2,000-column / 1,000,000-row prototype limit.');
    return {name:file.name,rows:data,cols:headers,rawGrid:grid,rawMerges:merges,headerSuggestion:detectSmartHeader(grid,merges)};
  }
  async function parseDatasetFile(file){
    status.textContent=`Reading ${file.name}…`;
    try{
      const dataset=await readDataset(file);putWorking(dataset);originalRows=rows.map(r=>({...r}));
      status.innerHTML=`<strong>${esc(file.name)}</strong> · ${fmt(rows.length)} rows · ${fmt(cols.length)} columns · ready for analysis${headerSuggestion?' · <span class="data-warning">smart header suggestion available</span>':''}`;drop.style.minHeight='110px';originalSnapshot=captureWorking();if(studio)studio.reset(file.name);
    }catch(error){status.innerHTML=`<span class="data-warning">Could not read this file: ${esc(error.message||error)}</span>`;}
  }

  function captureWorking(){return {rows:rows.slice(),cols:cols.slice(),types:{...types},rawGrid,rawMerges,headerSuggestion};}
  function putWorking(s){rows=s.rows.slice();cols=s.cols.slice();rawGrid=s.rawGrid||[];rawMerges=s.rawMerges||[];headerSuggestion=s.headerSuggestion||null;infer();renderProfile();makeSuggestions();renderQuickActions();quickConfig.classList.add('hidden');resetResult();workspace.classList.remove('hidden');status.textContent=rows.length+' working rows · '+cols.length+' columns';}
  if(window.createDAYRIXAStudio){studio=window.createDAYRIXAStudio({get:captureWorking,set:putWorking,readDataset,open:openBuilder,original:()=>originalSnapshot||captureWorking(),setOriginal:s=>{originalSnapshot=s;originalRows=s.rows.map(r=>({...r}));},resultText:()=>answer.textContent,figure:()=>chartWrap.classList.contains('hidden')?null:document.getElementById('dataChart').toDataURL('image/png')});}
  document.getElementById('studioReopen')?.addEventListener('change',e=>safeRun(async()=>{const file=e.target.files[0];if(!file)return;if(file.size>100*1024*1024)throw new Error('Project import limit is 100 MB.');studio.importProject(JSON.parse(await file.text()));},'Project could not be opened'));
  document.getElementById('studioDemo')?.addEventListener('click',()=>safeRun(()=>{if(rows.length&&!window.confirm('Replace the current dataset with a synthetic demo? Save your project first if needed.'))return;let csv='Date,Fund,RI,Rm,Rf,Rb,TNA\n';for(let i=0;i<60;i++){const date='2021-'+String(i%12+1).padStart(2,'0')+'-01',fund='Fund '+String.fromCharCode(65+Math.floor(i/12)),rm=Math.sin(i*.73)*3,rf=.1,rb=Math.cos(i*.43)*2,ri=.3+.8*rm+.2*rb+Math.sin(i*1.1)*.4;csv+=[date,fund,ri,rm,rf,i%17===0?'':rb,100+i*3].join(',')+'\n';}return parseDatasetFile({name:'Synthetic_finance_demo.csv',text:async()=>csv});},'Demo could not be loaded'));
  fileInput.addEventListener('change',e=>e.target.files[0]&&safeRun(()=>parseDatasetFile(e.target.files[0]),'File could not be read'));['dragenter','dragover'].forEach(ev=>drop.addEventListener(ev,e=>{e.preventDefault();drop.classList.add('drag')}));['dragleave','drop'].forEach(ev=>drop.addEventListener(ev,e=>{e.preventDefault();drop.classList.remove('drag')}));drop.addEventListener('drop',e=>e.dataTransfer.files[0]&&safeRun(()=>parseDatasetFile(e.dataTransfer.files[0]),'File could not be read'));askBtn.onclick=()=>safeRun(()=>runQuestion(),'Question could not be analyzed');qInput.addEventListener('keydown',e=>{if(e.key==='Enter')safeRun(()=>runQuestion(),'Question could not be analyzed')});
})();
