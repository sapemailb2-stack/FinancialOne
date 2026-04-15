import { 
  BalanceteItem, 
  ContasVencimento, 
  FluxoCaixa, 
  ContasUnificado,
  ContasFornecedorCliente,
  DREItem
} from '../types';

const API_BASE = '/api/procedure';

export async function fetchProcedure<T>(name: string, params: Record<string, string> = {}, db?: string): Promise<T[]> {
  const queryParams = { ...params };
  if (db) queryParams.db = db;
  
  const query = new URLSearchParams(queryParams).toString();
  const url = `${API_BASE}/${name}${query ? `?${query}` : ''}`;
  
  const response = await fetch(url);
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || `Failed to fetch ${name}`);
  }
  return response.json();
}

export const api = {
  getBalancete: (db?: string, status: string = 'N') => fetchProcedure<BalanceteItem>('spcJBCBalancete1', { p1: status }, db),
  getContasAPagarVencimento: (db: string | undefined, start: string, end: string) => 
    fetchProcedure<ContasVencimento>('spcIPTContasAPagarPorVencimento', { p1: '*', p2: start, p3: end, p4: 'V' }, db),
  getContasAReceberVencimento: (db: string | undefined, start: string, end: string) => 
    fetchProcedure<ContasVencimento>('spcJBCContasAReceberPorVencimento', { p1: '*', p2: start, p3: end, p4: 'V', p5: '*' }, db),
  getContasPagarUnificado: (db?: string) => fetchProcedure<ContasFornecedorCliente>('spcJBCContasPagarUnificado', {}, db),
  getContasReceberUnificado: (db?: string) => fetchProcedure<ContasFornecedorCliente>('spcJBCContasReceberUnificado', {}, db),
  getContasAPagarDetalhado: (db: string | undefined, acctName?: string) => 
    fetchProcedure<ContasFornecedorCliente>('spcIPTContasAPagarDetalhado', acctName ? { AcctName: acctName } : {}, db),
  getFluxoCaixa: (db?: string, date: string = '01-01-2050') => fetchProcedure<FluxoCaixa>('spcJBCFluxoCaixa', { p1: date }, db),
  getFluxoCaixaAnalitico: (db?: string, date: string = '2050-01-01') => 
    fetchProcedure<any>('spcJBCFluxoCaixa_CARGA_Analitico', { p1: date, p2: 'S', p3: 'N' }, db),
  getOrcadoRealizado: (db?: string) => fetchProcedure<any>('spcJBC_OrcadoRealizado', {}, db),
  getContasPagasFornecedor: (db?: string) => fetchProcedure<ContasFornecedorCliente>('spcJBCContasPagasPorFornecedor', {}, db),
  getContasRecebidasCliente: (db?: string) => fetchProcedure<ContasFornecedorCliente>('spcJBCContasRecebidasPorCliente', {}, db),
  getDRE: async (db?: string): Promise<DREItem[]> => {
    const url = db ? `/api/dre?db=${encodeURIComponent(db)}` : '/api/dre';
    const response = await fetch(url);
    if (!response.ok) throw new Error('Failed to fetch DRE');
    return response.json();
  },
};
