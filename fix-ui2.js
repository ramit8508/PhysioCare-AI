const fs = require('fs');

function walk(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach(function(file) {
        file = dir + '/' + file;
        const stat = fs.statSync(file);
        if (stat && stat.isDirectory()) { 
            results = results.concat(walk(file));
        } else { 
            if (file.endsWith('.tsx')) {
                results.push(file);
            }
        }
    });
    return results;
}

const files = [...walk('app'), ...walk('src')];

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');

  // Simple string replacements
  content = content.replaceAll('border-white/10 bg-white/5', 'border-slate-200 bg-slate-50');
  content = content.replaceAll('border-white/10', 'border-slate-200');
  content = content.replaceAll('bg-white/5', 'bg-slate-50');
  
  content = content.replaceAll('text-mutedForeground', 'text-slate-500');
  content = content.replaceAll('text-zinc-400', 'text-slate-500');
  content = content.replaceAll('text-zinc-300', 'text-slate-600');
  content = content.replaceAll('bg-zinc-900', 'bg-slate-50');
  content = content.replaceAll('bg-zinc-800', 'bg-white');
  content = content.replaceAll('border-zinc-800', 'border-slate-200');
  content = content.replaceAll('bg-black/20', 'bg-slate-100');
  content = content.replaceAll('text-white', 'text-slate-900'); 

  fs.writeFileSync(file, content);
});
console.log('Fixed UI in ' + files.length + ' files');
