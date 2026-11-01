// Runs the same export job as the user-facing panel; never clicks browser UI.
const origin=process.env.ART_ORIGIN||'http://127.0.0.1:5175';
async function request(path,method='GET',data){const r=await fetch(origin+'/__art'+path,{method,headers:{Origin:origin,'Content-Type':'application/json'},body:data?JSON.stringify(data):undefined});const json=await r.json();if(!r.ok)throw Error(JSON.stringify(json));return json}
const info=await request('');if(info.project!=='leap-of-faith')throw Error('Wrong project');
const s=await request('/state');const task=await request('/exports','POST',{revision:s.revision,profile:process.argv[2]||'portrait-4k',idempotencyKey:crypto.randomUUID()});
console.log(JSON.stringify({jobId:task.jobId,status:task.status}));
let last='';while(true){await new Promise(r=>setTimeout(r,4000));const j=await request('/jobs/'+task.jobId);const status=`${j.stage||j.status}: ${Math.round(j.progress*100)}%`;if(status!==last){console.log(status);last=status}if(j.status==='completed'){console.log(JSON.stringify(j.files));break}if(['failed','canceled'].includes(j.status))throw Error(j.error||j.status)}
