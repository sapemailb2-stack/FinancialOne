export interface BalanceteItem {
  Conta: string;
  Descricao: string;
  SaldoAnterior: number;
  Debito: number;
  Credito: number;
  SaldoAtual: number;
}

export interface ContasVencimento {
  Vencimento: string;
  Valor: number;
  Quantidade: number;
  AcctName?: string;
}

export interface ContasUnificado {
  Tipo: 'Pagar' | 'Receber';
  Status: string;
  Valor: number;
  Data: string;
}

export interface FluxoCaixa {
  Data: string;
  Entradas: number;
  Saidas: number;
  Saldo: number;
}

export interface ContasFornecedorCliente {
  Nome: string;
  Valor: number;
  Data: string;
  AcctName?: string;
}

export interface DREItem {
  Descricao: string;
  Valor: number;
  Ordem: number;
}
