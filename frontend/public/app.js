(function(){
const e=React.createElement; const {useState,useEffect,useRef}=React;
function Stepper({step}){const steps=['Upload','Configure','EDA','Issues','Clean','Results']; return e('div',{className:'step-indicator'},steps.map((x,i)=>[e('div',{key:'s'+i,className:'step '+(i===step?'active':i<step?'done':'')},(i<step?'OK ':'')+x),i<steps.length-1?e('span',{key:'a'+i,className:'step-arrow'},'>'):null]).flat().filter(Boolean));}
function StatCards({items}){return e('div',{className:'row g-3 mb-3'},(items||[]).map((it,i)=>e('div',{key:i,className:'col-6 col-md-3'},e('div',{className:'stat-card'},e('div',{className:'value'},String(it.value)),e('div',{className:'label'},it.label)))));}
function CorrHeat({cols,matrix}){if(!cols||!matrix||cols.length<2)return e('p',{className:'text-muted'},'Not enough numeric columns for correlation.');const color=(v)=>{if(v==null||isNaN(v))return'#eee';const a=Math.abs(v);const r=v>=0?42:220,g=v>=0?82:53,b=v>=0?152:69;return'rgba('+r+','+g+','+b+','+(0.15+a*0.7)+')';};return e('div',{style:{overflow:'auto'}},e('table',{className:'table table-sm table-bordered mb-0',style:{fontSize:'0.78rem'}},e('thead',null,e('tr',null,[e('th',{key:'_'},'')].concat(cols.map(c=>e('th',{key:c},c))))),e('tbody',null,matrix.map((row,i)=>e('tr',{key:cols[i]},[e('th',{key:'h'},cols[i])].concat(row.map((v,j)=>e('td',{key:j,style:{background:color(v),textAlign:'center',minWidth:56}},v==null?'':Number(v).toFixed(2)))))))));}
function BarChart({id,labels,values,title,horizontal}){const ref=useRef(null),chartRef=useRef(null);useEffect(()=>{if(!ref.current||!labels||!labels.length)return;if(chartRef.current)chartRef.current.destroy();if(typeof Chart==='undefined')return;chartRef.current=new Chart(ref.current,{type:'bar',data:{labels,datasets:[{label:title||'Count',data:values,backgroundColor:'rgba(42,82,152,0.6)'}]},options:{indexAxis:horizontal?'y':'x',responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}}}});return ()=>{if(chartRef.current)chartRef.current.destroy()};},[labels,values,title,horizontal]);if(!labels||!labels.length)return e('p',{className:'text-muted small'},'No data.');return e('div',{className:'chart-container'},e('canvas',{ref,id}));}

function App(){
  const [step,setStep]=useState(0),[busy,setBusy]=useState(false),[err,setErr]=useState(''),[notice,setNotice]=useState('');
  const [dataset,setDataset]=useState(null),[target,setTarget]=useState(''),[task,setTask]=useState('');
  const [eda,setEda]=useState(null),[anomalies,setAnomalies]=useState(null),[accepted,setAccepted]=useState({});
  const [result,setResult]=useState(null),[comparison,setComparison]=useState(null);
  const resetUI=(msg)=>{setDataset(null);setTarget('');setTask('');setEda(null);setAnomalies(null);setAccepted({});setResult(null);setComparison(null);setStep(0);setErr(''); if(msg)setNotice(msg);};
  const onUpload=async(file)=>{if(!file) return; setErr('');setNotice('');setBusy(true); try{const res=await window.uploadFile(file); setDataset(res);setStep(1);setNotice('Uploaded: '+res.filename);}catch(ex){setErr(String(ex.message||ex));}finally{setBusy(false);}};
  const saveConfig=async()=>{if(!dataset) return; setErr('');setBusy(true); try{await window.api('/dataset/'+dataset.dataset_id+'/target',{method:'POST',body:JSON.stringify({target:target||null})}); if(task) await window.api('/dataset/'+dataset.dataset_id+'/task',{method:'POST',body:JSON.stringify({task})}); setDataset(d=>({...d,target:target||null,task:task||null})); setStep(2);}catch(ex){setErr(String(ex.message||ex));}finally{setBusy(false);}};
  const loadEda=async()=>{if(!dataset) return; setErr('');setBusy(true); try{setEda(await window.api('/dataset/'+dataset.dataset_id+'/eda'));}catch(ex){setErr(String(ex.message||ex));}finally{setBusy(false);}};
  const loadAnomalies=async()=>{if(!dataset) return; setErr('');setBusy(true); try{setAnomalies(await window.api('/dataset/'+dataset.dataset_id+'/anomalies')); setStep(3);}catch(ex){setErr(String(ex.message||ex));}finally{setBusy(false);}};
  useEffect(()=>{if(step===2&&dataset&&!eda) loadEda();},[step,dataset]);
  const acceptProblem=(key,p)=>{if(p.recommendation==='none') return; setAccepted(a=>({...a,[key]:{type:p.recommendation,feature:p.feature==='__rows__'?null:p.feature}}));};
  const rejectProblem=(key)=>{setAccepted(a=>{const n={...a}; delete n[key]; return n;});};
  const customProblem=(key,method,p)=>{if(!method) return; setAccepted(a=>({...a,[key]:{type:method,feature:p.feature==='__rows__'?null:p.feature}}));};
  const goClean=()=>setStep(4);
  const applyOps=async()=>{if(!dataset) return; setErr('');setBusy(true); try{const ops=Object.values(accepted); await window.api('/dataset/'+dataset.dataset_id+'/operations',{method:'POST',body:JSON.stringify({operations:ops})}); const r=await window.api('/dataset/'+dataset.dataset_id+'/apply',{method:'POST'}); setResult(r); setComparison(await window.api('/dataset/'+dataset.dataset_id+'/comparison')); setStep(5); setNotice('Applied '+ops.length+' operation(s).');}catch(ex){setErr(String(ex.message||ex));}finally{setBusy(false);}};
  const doReset=async()=>{if(!dataset) return; setErr('');setBusy(true); try{await window.api('/dataset/'+dataset.dataset_id+'/reset',{method:'POST'}); setResult(null);setComparison(null);setAccepted({});setAnomalies(null);setEda(null); setStep(2); setNotice('Reset to original.');}catch(ex){setErr(String(ex.message||ex));}finally{setBusy(false);}};
  const doDelete=async()=>{if(!dataset) return; setErr('');setBusy(true); try{await window.api('/dataset/'+dataset.dataset_id,{method:'DELETE'}); resetUI('Dataset deleted.');}catch(ex){setErr(String(ex.message||ex));}finally{setBusy(false);}};
  const exportRows=(rows,name)=>{window.download(name,window.csvFromRows(rows||[]),'text/csv');};
  return e('div',null,
    e('nav',{className:'navbar navbar-dark',style:{background:'linear-gradient(135deg,#1e3c72 0%,#2a5298 100%)'}},e('div',{className:'container-fluid'},e('span',{className:'navbar-brand mb-0 h1'},'ML Data Preprocessing & Cleaning'))),
    e('div',{className:'container py-4'},
      e(Stepper,{step}), err?e('div',{className:'alert alert-danger'},err):null, notice?e('div',{className:'alert alert-info py-2'},notice):null, busy?e('div',{className:'alert alert-secondary py-2'},'Working...'):null,
      step===0 && e('div',{className:'card'},e('div',{className:'card-header'},'1. Upload Dataset'),e('div',{className:'card-body'},e('div',{className:'dropzone',onDragOver:ev=>{ev.preventDefault();ev.currentTarget.classList.add('dragover');},onDragLeave:ev=>ev.currentTarget.classList.remove('dragover'),onDrop:ev=>{ev.preventDefault();ev.currentTarget.classList.remove('dragover'); if(ev.dataTransfer.files[0]) onUpload(ev.dataTransfer.files[0]);},onClick:()=>document.getElementById('fileIn').click()},e('p',{className:'mb-1 fw-semibold'},'Drop CSV, TSV, XLSX, or JSON here'),e('p',{className:'text-muted small mb-0'},'or click to browse (max 50 MB)'),e('input',{id:'fileIn',type:'file',accept:'.csv,.tsv,.txt,.xlsx,.xls,.json',style:{display:'none'},onChange:ev=>onUpload(ev.target.files[0])})))),
      step===1 && dataset && e('div',{className:'card'},e('div',{className:'card-header'},'2. Preview & Configuration'),e('div',{className:'card-body'},
        e(StatCards,{items:[{label:'Rows',value:dataset.rows},{label:'Columns',value:dataset.columns},{label:'File',value:dataset.filename},{label:'Size',value:Math.round((dataset.size_bytes||0)/1024)+' KB'}]}),
        e('h6',{className:'mt-2'},'Preview'), e(window.DataTable,{rows:dataset.preview,maxHeight:260}),
        e('div',{className:'row g-3 mt-2'},
          e('div',{className:'col-md-6'},e('label',{className:'form-label fw-semibold'},'Target column (optional)'),e('select',{className:'form-select',value:target,onChange:ev=>setTarget(ev.target.value)},e('option',{value:''},'(none)'),(dataset.column_names||[]).map(c=>e('option',{key:c,value:c},c)))),
          e('div',{className:'col-md-6'},e('label',{className:'form-label fw-semibold'},'Learning task'),e('select',{className:'form-select',value:task,onChange:ev=>setTask(ev.target.value)},e('option',{value:''},'Select...'),e('option',{value:'supervised'},'Supervised'),e('option',{value:'unsupervised'},'Unsupervised')))
        ),
        e('div',{className:'mt-3 d-flex gap-2'},e('button',{className:'btn btn-primary',onClick:saveConfig,disabled:busy},'Continue to EDA'),e('button',{className:'btn btn-outline-secondary',onClick:()=>resetUI()},'Start over'))
      )),
      step===2 && dataset && e('div',{className:'card'},e('div',{className:'card-header'},'3. Exploratory Data Analysis'),e('div',{className:'card-body'},
        !eda ? e('button',{className:'btn btn-primary',onClick:loadEda,disabled:busy},'Load EDA') : e('div',null,
          e(StatCards,{items:[{label:'Rows',value:eda.n_rows},{label:'Columns',value:eda.n_columns},{label:'Missing',value:eda.missing_total+' ('+eda.missing_pct+'%)'},{label:'Duplicates',value:eda.duplicate_rows+' ('+eda.duplicate_pct+'%)'}]}),
          e('h6',{className:'mt-2'},'Column types'), e(window.StatTable,{stats:eda.column_types}),
          e('h6',{className:'mt-3'},'Descriptive statistics'), e(window.StatTable,{stats:eda.statistics}),
          e('h6',{className:'mt-3'},'Missing values'), e(BarChart,{id:'missChart',labels:(eda.missing_values||[]).map(r=>r.column),values:(eda.missing_values||[]).map(r=>r.missing),title:'Missing',horizontal:true}),
          e('h6',{className:'mt-3'},'Correlation (numeric)'), e(CorrHeat,{cols:eda.correlation_columns,matrix:eda.correlation_matrix}),
          e('div',{className:'mt-3 d-flex gap-2 flex-wrap'},e('button',{className:'btn btn-primary',onClick:loadAnomalies,disabled:busy},'Detect issues'),e('button',{className:'btn btn-outline-secondary',onClick:doReset,disabled:busy},'Reset'),e('button',{className:'btn btn-outline-danger',onClick:doDelete,disabled:busy},'Delete'))
        )
      )),
      step===3 && dataset && e('div',{className:'card'},e('div',{className:'card-header'},'4. Issues & Recommendations'),e('div',{className:'card-body'},
        !anomalies ? e('p',null,'Loading...') : e('div',null,
          e('p',{className:'text-muted'},'Total issues: '+anomalies.total_problems+'. Accept, reject, or choose another method.'),
          e(window.ProblemsList,{problems:anomalies.problems,onAccept:acceptProblem,onReject:rejectProblem,onCustom:customProblem,acceptedIds:accepted}),
          e('div',{className:'mt-3 d-flex gap-2 flex-wrap'},e('button',{className:'btn btn-primary',onClick:goClean},'Review operations ('+Object.keys(accepted).length+')'),e('button',{className:'btn btn-outline-secondary',onClick:()=>setStep(2)},'Back'),e('button',{className:'btn btn-outline-secondary',onClick:doReset,disabled:busy},'Reset'),e('button',{className:'btn btn-outline-danger',onClick:doDelete,disabled:busy},'Delete'))
        )
      )),
      step===4 && dataset && e('div',{className:'card'},e('div',{className:'card-header'},'5. Apply Preprocessing'),e('div',{className:'card-body'},
        Object.keys(accepted).length===0 ? e('div',{className:'alert alert-warning'},'No operations selected. Accept or customize issues on the previous step.') : null,
        Object.keys(accepted).length===0 ? null : e('div',null,
          e('h6',null,'Selected operations'), e('ul',null,Object.entries(accepted).map(([k,op])=>e('li',{key:k}, op.type+' - '+(op.feature||'(rows/dataset)')))),
          e('div',{className:'d-flex gap-2 mt-2'},e('button',{className:'btn btn-primary',onClick:applyOps,disabled:busy},'Apply operations'))
        ),
        e('div',{className:'mt-3 d-flex gap-2'},e('button',{className:'btn btn-outline-secondary',onClick:()=>setStep(3)},'Back to Issues'),e('button',{className:'btn btn-primary',onClick:applyOps,disabled:busy||Object.keys(accepted).length===0},'Apply operations'))
      )),
      step===5 && dataset && e('div',{className:'card'},e('div',{className:'card-header'},'6. Results & Comparison'),e('div',{className:'card-body'},
        result && e('div',{className:'alert alert-success py-2 mb-3'},'Applied. Rows: '+result.rows+', Cols: '+result.columns+', Missing: '+result.missing_total+', Duplicates: '+result.duplicate_rows),
        comparison && e('div',null,
          e('div',{className:'row g-3 mb-3'},
            e('div',{className:'col-md-6'},e('div',{className:'card h-100'},e('div',{className:'card-body'},e('h6',null,'Original'),e(StatCards,{items:[{label:'Rows',value:comparison.original.rows},{label:'Cols',value:comparison.original.columns},{label:'Missing',value:comparison.original.missing_total},{label:'Dupes',value:comparison.original.duplicate_rows}]})))),
            e('div',{className:'col-md-6'},e('div',{className:'card h-100'},e('div',{className:'card-body'},e('h6',null,'Cleaned'),e(StatCards,{items:[{label:'Rows',value:comparison.cleaned.rows},{label:'Cols',value:comparison.cleaned.columns},{label:'Missing',value:comparison.cleaned.missing_total},{label:'Dupes',value:comparison.cleaned.duplicate_rows}]}))))
          ),
          e('h6',null,'Cleaned preview'), e(window.DataTable,{rows:(comparison.cleaned||{}).preview,maxHeight:280}),
          e('h6',{className:'mt-3'},'Applied log'), e('pre',{style:{background:'#f8f9fa',padding:12,borderRadius:8,maxHeight:220,overflow:'auto',fontSize:'0.8rem'}},JSON.stringify(comparison.log,null,2))
        ),
        e('div',{className:'d-flex gap-2 mt-3 flex-wrap'},
          comparison && e('button',{className:'btn btn-primary',onClick:()=>exportRows((comparison.cleaned||{}).preview,'cleaned_preview.csv')},'Export cleaned preview'),
          comparison && e('button',{className:'btn btn-outline-primary',onClick:()=>exportRows((comparison.original||{}).preview,'original_preview.csv')},'Export original preview'),
          e('button',{className:'btn btn-outline-secondary',onClick:doReset,disabled:busy},'Reset & re-clean'),
          e('button',{className:'btn btn-outline-danger',onClick:doDelete,disabled:busy},'Delete dataset'),
          e('button',{className:'btn btn-outline-secondary',onClick:()=>setStep(3)},'Back to issues')
        )
      ))
    ),
    e('div',{className:'footer'},'Generic Data Preprocessing & Cleaning Web Application for Machine Learning')
  );
}
ReactDOM.createRoot(document.getElementById('root')).render(e(App));
})();
