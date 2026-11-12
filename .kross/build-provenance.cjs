const fs=require('fs'),path=require('path'),crypto=require('crypto'),cp=require('child_process');
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
const node=process.versions.node,npm=cp.execFileSync('npm',['--version'],{encoding:'utf8'}).trim();
if(node!=="22.16.0"||npm!=="10.9.2")throw Error('Build runtime mismatch');
const files={};
function walk(d){for(const name of fs.readdirSync(d).sort()){const p=path.join(d,name);const st=fs.lstatSync(p);if(st.isSymbolicLink())throw Error('Linked build output');if(st.isDirectory())walk(p);else {const relative=path.relative('dist',p).split(path.sep).join('/');if(relative!==".kross-build.json")files[relative]=hash(fs.readFileSync(p));}}}
walk('dist');
const input=crypto.createHash('sha256');
for(const p of ['package.json','package-lock.json','.npmrc','.env','.env.local','.env.production','.env.production.local']){if(fs.existsSync(p)){input.update(p);input.update(fs.readFileSync(p));}}
const proof={version:1,environment:"linux-x64-node22.16.0-npm10.9.2-v1",node,npm,lock:hash(fs.readFileSync('package-lock.json')),inputs:input.digest('hex'),files};
fs.writeFileSync('dist/.kross-build.json',JSON.stringify(proof));
console.log('KROSS_BUILD_ENVIRONMENT '+proof.environment);
