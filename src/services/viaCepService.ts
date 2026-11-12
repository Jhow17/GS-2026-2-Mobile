/**
 * Consulta de endereço por CEP via API pública gratuita ViaCEP
 * (https://viacep.com.br/ws/{cep}/json/).
 * Valida a resposta em tempo de execução com guarda de tipo (sem any).
 */
import axios from 'axios';

import type { ViaCepAddress } from '../types/auth';
import { formatCep, stripCep } from '../utils/formatters';
import { isRecord } from '../utils/validation';

interface RawViaCepResponse {
  cep?: string;
  logradouro?: string;
  bairro?: string;
  localidade?: string;
  uf?: string;
  erro?: boolean | string;
}

function isRawViaCepResponse(value: unknown): value is RawViaCepResponse {
  if (!isRecord(value)) {
    return false;
  }
  if (value.erro === true || value.erro === 'true') {
    return true;
  }
  return typeof value.localidade === 'string' && typeof value.uf === 'string';
}

export class ViaCepError extends Error {
  public readonly code: 'INVALID_FORMAT' | 'NOT_FOUND' | 'NETWORK';

  constructor(code: 'INVALID_FORMAT' | 'NOT_FOUND' | 'NETWORK', message: string) {
    super(message);
    this.name = 'ViaCepError';
    this.code = code;
  }
}

/**
 * Busca logradouro, bairro, cidade e UF a partir de um CEP de 8 dígitos.
 * Lança ViaCepError com mensagem amigável caso o CEP não exista ou a rede falhe.
 */
export async function lookupCep(rawCep: string): Promise<ViaCepAddress> {
  const digits = stripCep(rawCep);
  if (digits.length !== 8) {
    throw new ViaCepError('INVALID_FORMAT', 'Informe os 8 números do CEP.');
  }

  try {
    const response = await axios.get<unknown>(
      `https://viacep.com.br/ws/${digits}/json/`,
      { timeout: 8000 },
    );

    const data: unknown = response.data;
    if (!isRawViaCepResponse(data)) {
      throw new ViaCepError(
        'NETWORK',
        'Resposta inesperada ao consultar o CEP. Tente novamente.',
      );
    }

    if (data.erro === true || data.erro === 'true' || !data.localidade || !data.uf) {
      throw new ViaCepError(
        'NOT_FOUND',
        'CEP não encontrado. Confira os números digitados.',
      );
    }

    return {
      cep: formatCep(digits),
      street: (data.logradouro ?? '').trim(),
      neighborhood: (data.bairro ?? '').trim(),
      city: data.localidade.trim(),
      state: data.uf.trim().toUpperCase(),
    };
  } catch (err: unknown) {
    if (err instanceof ViaCepError) {
      throw err;
    }
    throw new ViaCepError(
      'NETWORK',
      'Não foi possível consultar o CEP agora. Verifique sua conexão com a internet.',
    );
  }
}
