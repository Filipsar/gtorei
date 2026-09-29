/**
 * PARADO em 29/09/2026. O app voltou ao logo anterior (o hexágono), porque é o
 * que o @gtorei já usa no Instagram. Este gerador e os dois SVG da coroa ficam
 * aqui para os ajustes que virão depois.
 *
 * ATENÇÃO: rodar isto agora SOBRESCREVE os PNG do logo atual pelos da coroa.
 *
 * Gera os arquivos da marca a partir de um SVG só.
 *
 * Fonte da verdade: src/assets/gtorei-coroa.svg. Tudo o mais nesta pasta é
 * derivado — se a coroa mudar, rode isto de novo em vez de editar PNG à mão.
 *
 *   node scripts/gerar-marca.cjs
 *
 * Precisa do Chrome instalado (mesmo caminho usado pelos outros geradores).
 */
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

const RAIZ = path.resolve(__dirname, '..');
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const OURO = '#FFB800';

const limpar = (arquivo) => fs.readFileSync(path.join(RAIZ, arquivo), 'utf8')
  .replace(/<!--[\s\S]*?-->/g, '')
  .replace(/^<\?xml[^>]*\?>\s*/, '');

const coroa = limpar('src/assets/gtorei-coroa.svg');
// Três dentes, sem joia: só para 16 e 20px, onde a principal empasta
const coroaReduzida = limpar('src/assets/gtorei-coroa-reduzida.svg');

const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'marca-'));
const url = (p) => 'file:///' + p.split(path.sep).join('/');

/** Fotografa um HTML num PNG do tamanho pedido, com fundo transparente */
function tirar(html, largura, altura, destino) {
  const arquivo = path.join(TMP, `${path.basename(destino, '.png')}.html`);
  fs.writeFileSync(arquivo, html);
  execFileSync(CHROME, [
    '--headless=new', '--disable-gpu', '--hide-scrollbars',
    '--force-device-scale-factor=1', `--window-size=${largura},${altura}`,
    '--default-background-color=00000000', '--allow-file-access-from-files',
    '--virtual-time-budget=3000', `--user-data-dir=${path.join(TMP, 'perfil')}`,
    `--screenshot=${destino}`, url(arquivo),
  ], { stdio: 'ignore', timeout: 60000 });
  const b = fs.readFileSync(destino);
  console.log(`  ${path.relative(RAIZ, destino)} — ${b.readUInt32BE(16)}×${b.readUInt32BE(20)}`);
}

/** Só a marca, sangrando até a borda com uma folga proporcional */
const soAMarca = (px, folga = 0.09, marca = coroa) => `<!doctype html><html><head><meta charset="utf-8"><style>
  *{margin:0;padding:0}
  html,body{width:${px}px;height:${px}px;background:transparent}
  body{display:flex;align-items:center;justify-content:center;color:${OURO}}
  svg{width:${Math.round(px * (1 - folga * 2))}px;height:${Math.round(px * (1 - folga * 2))}px}
</style></head><body>${marca}</body></html>`;

/** Cartão social: marca + nome + linha de apoio */
const cartaoSocial = `<!doctype html><html><head><meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;600;800&display=swap" rel="stylesheet">
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  body{width:1200px;height:630px;background:#141414;color:#f2f1ee;
       font-family:Inter,'Segoe UI',sans-serif;display:flex;flex-direction:column;
       align-items:center;justify-content:center;gap:12px;position:relative;overflow:hidden}
  .brilho{position:absolute;width:900px;height:900px;border-radius:50%;
    background:radial-gradient(circle,rgba(255,184,0,.13) 0%,transparent 62%);top:-340px;right:-260px}
  .marca{color:${OURO};width:172px;height:172px;position:relative;z-index:1}
  h1{font-size:82px;font-weight:800;letter-spacing:-.03em;position:relative;z-index:1}
  h1 span{color:${OURO}}
  p{font-size:31px;font-weight:300;color:#9c9c9c;position:relative;z-index:1}
  .selo{position:relative;z-index:1;margin-top:6px;font-size:21px;font-weight:600;color:${OURO};
        border:2px solid rgba(255,184,0,.4);border-radius:999px;padding:10px 26px}
</style></head><body>
  <div class="brilho"></div>
  <div class="marca">${coroa}</div>
  <h1>GTO<span>Rei</span></h1>
  <p>Treinador de pôquer GTO, em português</p>
  <div class="selo">Grátis</div>
</body></html>`;

console.log('Gerando a partir de src/assets/gtorei-coroa.svg\n');

// A 16px a marca principal empasta: os vãos ficam em 0,78px e os dentes se
// fundem. Nesse tamanho vale a reduzida, com folga menor para ganhar massa.
tirar(soAMarca(16, 0.03, coroaReduzida), 16, 16, path.join(RAIZ, 'public/icon-16.png'));

// Ícones e favicons — os nomes são os que o index.html já referencia
for (const [nome, px] of [['icon-32.png', 32], ['icon-192.png', 192], ['logo-128.png', 128]]) {
  tirar(soAMarca(px), px, px, path.join(RAIZ, 'public', nome));
}
tirar(soAMarca(1080), 1080, 1080, path.join(RAIZ, 'public/favicon-gtorei.png'));


// Cartão social
tirar(cartaoSocial, 1200, 630, path.join(RAIZ, 'public/og-gtorei.png'));
tirar(cartaoSocial, 1200, 630, path.join(RAIZ, 'public/og-image.png'));

fs.rmSync(TMP, { recursive: true, force: true });
console.log('\nPronto.');
