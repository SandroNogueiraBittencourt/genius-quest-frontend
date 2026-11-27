import { beforeEach, describe, expect, it, vi } from 'vitest';
import { forgetRoomCode, readRoomCode, rememberRoomCode } from './savedRoom';

const anfitriao = '5af3c27d-6ed8-4850-8e4a-48642f38089c';
const convidado = '60b23d15-7c6b-4f92-b882-7b9615f1c6b3';
const codigo = '6ad4a771-b68f-4cb1-a279-61fb61ab5704';

beforeEach(() => sessionStorage.clear());

describe('retomada da sala real na mesma aba', () => {
  it('lembra apenas UUID da sala para o jogador correto', () => {
    rememberRoomCode(anfitriao, codigo.toUpperCase());
    expect(readRoomCode(anfitriao)).toBe(codigo);
    expect(readRoomCode(convidado)).toBeNull();
    expect(sessionStorage.length).toBe(1);
    const chave = sessionStorage.key(0);
    expect(chave).toContain(anfitriao);
    expect(sessionStorage.getItem(chave!)).toBe(codigo);
  });

  it('apaga código ao sair ou fechar a sala', () => {
    rememberRoomCode(anfitriao, codigo);
    forgetRoomCode(anfitriao);
    expect(readRoomCode(anfitriao)).toBeNull();
  });

  it('não aceita códigos demonstrativos ou valores inválidos', () => {
    expect(() => rememberRoomCode(anfitriao, 'GQ2026')).toThrow();
    expect(readRoomCode(anfitriao)).toBeNull();
    rememberRoomCode(null, codigo);
    expect(sessionStorage.length).toBe(0);
  });

  it('ignora código de sala corrompido e mantém isolamento entre usuários', () => {
    sessionStorage.setItem('gq-real-room-code-v1:' + anfitriao, 'codigo-ruim');
    rememberRoomCode(convidado, codigo);
    expect(readRoomCode(anfitriao)).toBeNull();
    expect(readRoomCode(convidado)).toBe(codigo);
  });
});

it('permite jogar quando o navegador bloqueia a sessão de armazenamento', () => {
  const falha = () => {
    throw new DOMException('Armazenamento indisponível', 'SecurityError');
  };
  const spies = [
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(falha),
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(falha),
    vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(falha),
  ];
  try {
    expect(readRoomCode(anfitriao)).toBeNull();
    expect(() => rememberRoomCode(anfitriao, codigo)).not.toThrow();
    expect(() => forgetRoomCode(anfitriao)).not.toThrow();
  } finally {
    spies.forEach((spy) => spy.mockRestore());
  }
});

it('esquecer a sala de um jogador preserva a de outro jogador', () => {
  const outraSala = '6ad4a771-b68f-4cb1-a279-61fb61ab5705';
  rememberRoomCode(anfitriao, codigo);
  rememberRoomCode(convidado, outraSala);

  forgetRoomCode(anfitriao.toUpperCase());

  expect(readRoomCode(anfitriao)).toBeNull();
  expect(readRoomCode(convidado)).toBe(outraSala);
});
