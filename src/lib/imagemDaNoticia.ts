// Imagem do GTORei para a notícia sem imagem própria: 1200x630 (o tamanho do
// compartilhamento e do Google Discover), desenhada no navegador do admin com
// o título, o Rei lendo e a marca, e enviada ao Storage em JPEG. A foto do
// feed não serve: ela é da agência ou do site de origem.

const LARGURA = 1200;
const ALTURA = 630;
const OURO = '#F5B900';
const MARGEM = 72;

function carregarImagem(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

/** Quebra o título em linhas que cabem na largura; devolve null se passar do máximo */
function quebrar(ctx: CanvasRenderingContext2D, texto: string, largura: number, maxLinhas: number): string[] | null {
  const linhas: string[] = [];
  let atual = '';
  for (const palavra of texto.split(/\s+/).filter(Boolean)) {
    const tentativa = atual ? `${atual} ${palavra}` : palavra;
    if (ctx.measureText(tentativa).width <= largura || !atual) atual = tentativa;
    else {
      linhas.push(atual);
      atual = palavra;
    }
  }
  if (atual) linhas.push(atual);
  return linhas.length <= maxLinhas ? linhas : null;
}

export async function gerarImagemDaNoticia(titulo: string): Promise<Blob> {
  const canvas = document.createElement('canvas');
  canvas.width = LARGURA;
  canvas.height = ALTURA;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('sem canvas');

  // A fonte do site (Inter, carregada pelo @fontsource); sem ela, a do sistema
  await Promise.all([document.fonts.load('700 60px Inter'), document.fonts.load('600 24px Inter')]).catch(() => undefined);
  const rei = await carregarImagem('/mascote/rei-lendo.webp');

  // Fundo grafite com brilho dourado atrás do Rei e o filete da marca
  ctx.fillStyle = '#111111';
  ctx.fillRect(0, 0, LARGURA, ALTURA);
  const brilho = ctx.createRadialGradient(LARGURA * 0.82, ALTURA * 0.62, 30, LARGURA * 0.82, ALTURA * 0.62, 460);
  brilho.addColorStop(0, 'rgba(245, 185, 0, 0.30)');
  brilho.addColorStop(1, 'rgba(245, 185, 0, 0)');
  ctx.fillStyle = brilho;
  ctx.fillRect(0, 0, LARGURA, ALTURA);
  ctx.fillStyle = OURO;
  ctx.fillRect(0, 0, 14, ALTURA);

  // O Rei no tamanho dele (sem ampliar a arte), apoiado no rodapé
  const alturaDoRei = Math.min(rei.height, 440);
  const larguraDoRei = (rei.width * alturaDoRei) / rei.height;
  ctx.drawImage(rei, LARGURA - larguraDoRei - 56, ALTURA - alturaDoRei - 28, larguraDoRei, alturaDoRei);

  // Pílula da seção
  ctx.font = '600 24px Inter, system-ui, sans-serif';
  const pilula = 'NOTÍCIAS';
  const larguraDaPilula = ctx.measureText(pilula).width + 40;
  ctx.strokeStyle = OURO;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(MARGEM, 70, larguraDaPilula, 46, 23);
  ctx.stroke();
  ctx.fillStyle = OURO;
  ctx.textBaseline = 'middle';
  ctx.fillText(pilula, MARGEM + 20, 94);

  // Título: começa grande e diminui até caber em 4 linhas
  const larguraDoTexto = LARGURA - MARGEM - larguraDoRei - 110;
  let tamanho = 64;
  let linhas: string[] | null = null;
  while (tamanho >= 36) {
    ctx.font = `700 ${tamanho}px Inter, system-ui, sans-serif`;
    linhas = quebrar(ctx, titulo, larguraDoTexto, 4);
    if (linhas) break;
    tamanho -= 4;
  }
  if (!linhas) {
    // Título enorme: corta na quarta linha
    linhas = (quebrar(ctx, titulo, larguraDoTexto, 99) ?? [titulo]).slice(0, 4);
    linhas[3] = `${linhas[3].replace(/\s+\S*$/, '')}…`;
  }
  ctx.fillStyle = '#FFFFFF';
  ctx.textBaseline = 'alphabetic';
  const entrelinha = Math.round(tamanho * 1.18);
  const topo = 170 + tamanho;
  linhas.forEach((linha, i) => ctx.fillText(linha, MARGEM, topo + i * entrelinha));

  // Assinatura
  ctx.font = '700 30px Inter, system-ui, sans-serif';
  ctx.fillStyle = OURO;
  ctx.fillText('GTO', MARGEM, ALTURA - 64);
  const gto = ctx.measureText('GTO').width;
  const marca = gto + ctx.measureText('Rei').width;
  ctx.fillStyle = '#FFFFFF';
  ctx.fillText('Rei', MARGEM + gto, ALTURA - 64);
  ctx.font = '500 22px Inter, system-ui, sans-serif';
  ctx.fillStyle = '#9A9A9A';
  ctx.fillText('gtorei.com.br/noticias', MARGEM + marca + 40, ALTURA - 66);

  // JPEG: o PNG desta arte passava de 500 KB; o JPEG fica perto de 100 KB e
  // toda rede social aceita
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('sem imagem'))), 'image/jpeg', 0.9)
  );
}
