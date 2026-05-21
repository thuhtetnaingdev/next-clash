import yaml from 'js-yaml';

const input = `proxies:
  - name: '''[🇨🇦]t.me/ConfigsHub'''
    type: 'trojan'
    server: '1.2.3.4'
    port: 443`;

const parsed = yaml.load(input);
console.log('Parsed:', JSON.stringify(parsed));

const cleanName = (name) => name.replace(/^'+|'+$/g, '').replace(/`+$/, '').trim();
const cleaned = parsed.proxies.map(p => ({...p, name: cleanName(p.name)}));
console.log('Cleaned:', JSON.stringify(cleaned));

const out = yaml.dump({proxies: cleaned}, {forceQuotes: true});
console.log('Output:', out);