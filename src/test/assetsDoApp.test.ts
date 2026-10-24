import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { LICOES, NIVEIS, fichaDaLicao, temFaceMedida } from '@/data/trilha';
import { poseDoComentario, SEQUENCIA_PARA_RIR, type PoseDoComentario } from '@/lib/explicacao';

// Toda imagem que o app pede precisa existir em public/: renomear um arquivo
// não pode virar buraco na tela
const existe = (url: string) => existsSync(join(process.cwd(), 'public', url));

describe('imagens da trilha e do Rei', () => {
  it('cada lição tem a ficha da sua cor, a cinza e (na mesa final) a dourada com o Rei', () => {
    for (const l of LICOES) {
      expect(existe(fichaDaLicao(l, false)), `${l.id}: ${fichaDaLicao(l, false)}`).toBe(true);
      expect(existe(fichaDaLicao(l, true)), `${l.id}: bloqueada`).toBe(true);
    }
    expect(fichaDaLicao(LICOES.find((l) => l.mesaFinal)!, false)).toBe('/trilha/ficha-final.webp');
  });

  it('toda ficha da trilha tem o miolo medido (é onde o rótulo vai)', () => {
    for (const l of LICOES) {
      expect(temFaceMedida(fichaDaLicao(l, false)), l.id).toBe(true);
      expect(temFaceMedida(fichaDaLicao(l, true)), l.id).toBe(true);
    }
  });

  it('cor da ficha segue a posição da lição', () => {
    const porId = (id: string) => fichaDaLicao(LICOES.find((l) => l.id === id)!, false);
    expect(porId('abrir-btn')).toBe('/trilha/ficha-verde.webp');
    expect(porId('abrir-hj')).toBe('/trilha/ficha-laranja.webp');
    expect(porId('abrir-cedo')).toBe('/trilha/ficha-vermelho.webp');
    expect(porId('abrir-sb')).toBe('/trilha/ficha-azul.webp');
  });

  it('ilustração, pose e baú de cada nível existem', () => {
    for (const n of NIVEIS) {
      expect(existe(`/trilha/${n.ilustracao}.webp`), n.id).toBe(true);
      expect(existe(`/mascote/rei-${n.rei}.webp`), n.id).toBe(true);
    }
    for (const f of ['bau-fechado', 'bau-aberto', 'pilha-alta']) expect(existe(`/trilha/${f}.webp`), f).toBe(true);
  });

  it('poses das telas fixas existem', () => {
    const poses = ['acenando', 'cochilando', 'lendo', 'bau', 'trofeu', 'subiu', 'triste', 'trono', 'dando-cartas', 'avatar'];
    for (const p of poses) expect(existe(`/mascote/rei-${p}.webp`), p).toBe(true);
  });

  it('toda pose do comentário existe', () => {
    const todas: PoseDoComentario[] = ['allin', 'rindo', 'ombros', 'acertou', 'joinha', 'susto', 'errou', 'explicando'];
    for (const p of todas) expect(existe(`/mascote/rei-${p}.webp`), p).toBe(true);
  });
});

describe('pose do Rei depois da mão', () => {
  const pose = (tipo: Parameters<typeof poseDoComentario>[0]['tipo'], suaAcao: 'fold' | 'raise' | 'allin' | 'call', sequencia = 0) =>
    poseDoComentario({ tipo, suaAcao, sequencia });

  it('acerto: all-in empurra fichas, sequência longa ri, fold dá de ombros', () => {
    expect(pose('best', 'allin', 9)).toBe('allin');
    expect(pose('best', 'raise', SEQUENCIA_PARA_RIR)).toBe('rindo');
    expect(pose('best', 'fold')).toBe('ombros');
    expect(pose('best', 'raise')).toBe('acertou');
    expect(pose('correct', 'call')).toBe('joinha');
  });

  it('erro: do susto à explicação, conforme o tamanho', () => {
    expect(pose('blunder', 'raise')).toBe('susto');
    expect(pose('mistake', 'call')).toBe('errou');
    expect(pose('inaccuracy', 'fold')).toBe('explicando');
  });
});
