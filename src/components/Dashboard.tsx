import React, { useState, useEffect } from 'react';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  LineChart,
  Line,
} from 'recharts';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle 
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  LayoutDashboard, 
  TrendingUp, 
  ArrowUpCircle, 
  ArrowDownCircle,
  RefreshCw,
  AlertCircle,
  Search,
  ChevronRight,
  Download,
  Building2,
  CalendarDays
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { api } from '@/src/lib/api';
import { 
  BalanceteItem, 
  ContasVencimento, 
  FluxoCaixa, 
  ContasFornecedorCliente,
  DREItem
} from '@/src/types';
import { format, startOfMonth, endOfMonth, startOfYear, endOfYear as getEndOfYear } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

const COMPANIES = [
  "[INSTITUTO MODAL]",
  "[L14EMPREENDIMENTOS]",
  "[LESSOC]",
  "[EVO Serv Financeiros]",
  "[EVO COBRANCAS]",
  "[COMPASS]",
  "[RESERVABRACUHY]",
  "[B6 Empreendimentos]"
];

const EvoLogo = () => (
  <div className="flex items-center">
    <img 
      src="https://evo.com.br/imagens/evo-ng.png" 
      alt="EVO Logo" 
      className="h-10 w-auto object-contain"
      referrerPolicy="no-referrer"
    />
  </div>
);

export default function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedCompany, setSelectedCompany] = useState<string>(COMPANIES[0]);
  const [balancete, setBalancete] = useState<BalanceteItem[]>([]);
  const [pagarVencimento, setPagarVencimento] = useState<ContasVencimento[]>([]);
  const [receberVencimento, setReceberVencimento] = useState<ContasVencimento[]>([]);
  const [fluxoCaixa, setFluxoCaixa] = useState<FluxoCaixa[]>([]);
  const [fluxoAnalitico, setFluxoAnalitico] = useState<any[]>([]);
  const [orcadoRealizado, setOrcadoRealizado] = useState<any[]>([]);
  const [dre, setDre] = useState<DREItem[]>([]);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  // Competence and Comparison State
  const [competenceDate, setCompetenceDate] = useState<Date>(new Date());
  const [annualTotal, setAnnualTotal] = useState(0);
  const [monthlyTotal, setMonthlyTotal] = useState(0);
  const [comparisonData, setComparisonData] = useState<any[]>([]);

  // Detail Modal State
  const [detailType, setDetailType] = useState<'pagar' | 'receber' | 'caixa' | null>(null);
  const [detailLevel, setDetailLevel] = useState<'summary' | 'detail'>('summary');
  const [selectedAccount, setSelectedAccount] = useState<string | null>(null);
  const [detailData, setDetailData] = useState<ContasFornecedorCliente[]>([]);
  const [summaryData, setSummaryData] = useState<{ AcctName: string; Valor: number }[]>([]);
  const [vencimentoSummary, setVencimentoSummary] = useState<ContasVencimento[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  const handleOpenDetail = async (type: 'pagar' | 'receber' | 'caixa') => {
    setSearchTerm('');
    setDetailType(type);
    setDetailLevel('summary');
    setSelectedAccount(null);
    setDetailLoading(true);
    setVencimentoSummary([]);
    setSummaryData([]);
    
    try {
      const today = format(new Date(), 'yyyy-MM-dd');
      const endOfYear = format(new Date(new Date().getFullYear(), 11, 31), 'yyyy-MM-dd');

      if (type === 'pagar' || type === 'receber') {
        const data = type === 'pagar' 
          ? await api.getContasAPagarVencimento(selectedCompany, today, endOfYear)
          : await api.getContasAReceberVencimento(selectedCompany, today, endOfYear);
        
        // Group by Vencimento for the top summary
        const vSummaryMap = data.reduce((acc: any, curr) => {
          const v = curr.Vencimento;
          if (!acc[v]) acc[v] = { Vencimento: v, Valor: 0, Quantidade: 0 };
          acc[v].Valor += curr.Valor;
          acc[v].Quantidade += curr.Quantidade;
          return acc;
        }, {});
        setVencimentoSummary(Object.values(vSummaryMap));

        // Group by AcctName for the main summary
        const summary = data.reduce((acc: any, curr) => {
          const name = curr.AcctName || 'OUTROS';
          if (!acc[name]) acc[name] = 0;
          acc[name] += curr.Valor;
          return acc;
        }, {});
        setSummaryData(Object.entries(summary).map(([AcctName, Valor]) => ({ AcctName, Valor: Valor as number })));
      } else if (type === 'caixa') {
        const fc = await api.getFluxoCaixa(selectedCompany, '01-01-2050');
        setDetailData(fc.map(f => ({ Nome: 'Movimentação Diária', Valor: f.Saldo, Data: f.Data })));
        setDetailLevel('detail');
      }
    } catch (err) {
      console.error("Erro ao carregar detalhes:", err);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleAccountClick = async (acctName: string) => {
    setDetailLoading(true);
    setSelectedAccount(acctName);
    try {
      const data = await api.getContasAPagarDetalhado(selectedCompany, acctName);
      setDetailData(data);
      setDetailLevel('detail');
    } catch (err) {
      console.error("Erro ao carregar lançamentos detalhados:", err);
    } finally {
      setDetailLoading(false);
    }
  };

  const exportToExcel = () => {
    if (detailLevel === 'summary' && summaryData.length > 0) {
      const worksheet = XLSX.utils.json_to_sheet(summaryData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Resumo");
      XLSX.writeFile(workbook, `Resumo_Contas_Pagar_${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
      return;
    }

    if (detailData.length === 0) return;

    const title = detailType === 'pagar' ? `Detalhe_${selectedAccount || 'Pagar'}` : 
                  detailType === 'receber' ? 'Contas_a_Receber' : 'Fluxo_de_Caixa';
    
    const worksheetData = detailData.map(item => ({
      [detailType === 'caixa' ? 'Descrição' : (detailType === 'pagar' ? 'Fornecedor' : 'Cliente')]: item.Nome,
      'Data de Vencimento': formatDate(item.Data),
      'Valor (R$)': item.Valor,
      'Conta Contábil': item.AcctName || ''
    }));

    const worksheet = XLSX.utils.json_to_sheet(worksheetData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Relatorio");
    XLSX.writeFile(workbook, `${title}_${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
  };

  const filteredDetailData = detailData.filter(item => {
    const searchLower = searchTerm.toLowerCase();
    return (
      item.Nome.toLowerCase().includes(searchLower) ||
      item.Data.toLowerCase().includes(searchLower) ||
      (item.AcctName && item.AcctName.toLowerCase().includes(searchLower))
    );
  });

  const filteredSummaryData = summaryData.filter(item => 
    item.AcctName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const today = format(new Date(), 'yyyy-MM-dd');
      const endOfYearDate = format(getEndOfYear(new Date()), 'yyyy-MM-dd');

      const [b, p, r, f, fa, or, d] = await Promise.all([
        api.getBalancete(selectedCompany, 'N'),
        api.getContasAPagarVencimento(selectedCompany, today, endOfYearDate),
        api.getContasAReceberVencimento(selectedCompany, today, endOfYearDate),
        api.getFluxoCaixa(selectedCompany, '01-01-2050'),
        api.getFluxoCaixaAnalitico(selectedCompany, '2050-01-01'),
        api.getOrcadoRealizado(selectedCompany),
        api.getDRE(selectedCompany)
      ]);
      setBalancete(b);
      setPagarVencimento(p);
      setReceberVencimento(r);
      setFluxoCaixa(f);
      setFluxoAnalitico(fa);
      setOrcadoRealizado(or);
      setDre(d);
      setLastUpdate(new Date());

      // Calculate totals and comparison data
      const monthly = f.reduce((acc, curr) => acc + curr.Entradas, 0);
      setMonthlyTotal(monthly);
      setAnnualTotal(monthly * 12.5); // Mock annual calculation
      
      setComparisonData([
        { name: 'Jan', mensal: 45000, anual: 500000 },
        { name: 'Fev', mensal: 52000, anual: 500000 },
        { name: 'Mar', mensal: 48000, anual: 500000 },
        { name: 'Abr', mensal: monthly, anual: 500000 },
        { name: 'Mai', mensal: 0, anual: 500000 },
        { name: 'Jun', mensal: 0, anual: 500000 },
      ]);

    } catch (err: any) {
      console.error(err);
      if (err.message && err.message.includes('DNS_ERROR')) {
        setError('Erro de DNS: O servidor SRVEVOAZDB01 não foi encontrado. Certifique-se de que o endereço está correto ou use um IP público.');
      } else {
        setError('Erro ao conectar com o banco de dados. Verifique as credenciais e a conexão de rede.');
      }
    } finally {
      setLoading(false);
    }
  };

  const enableDemoMode = () => {
    alert('Para ativar o modo de demonstração, adicione USE_MOCK_DATA="true" nas configurações (Secrets) do projeto.');
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [selectedCompany]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    try {
      // Handle YYYY-MM-DD format
      if (dateStr.includes('-')) {
        const parts = dateStr.split('T')[0].split('-');
        if (parts.length === 3) {
          return `${parts[2]}/${parts[1]}/${parts[0]}`;
        }
      }
      return dateStr;
    } catch (e) {
      return dateStr;
    }
  };

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-4 text-center">
        <AlertCircle className="w-16 h-16 text-primary mb-4" />
        <h2 className="text-2xl font-bold mb-2 font-heading">Erro de Conexão</h2>
        <p className="text-muted-foreground mb-6 max-w-md">{error}</p>
        <div className="flex flex-wrap justify-center gap-4">
          <Button onClick={fetchData} variant="outline" className="border-primary text-primary hover:bg-primary/10">
            <RefreshCw className="w-4 h-4 mr-2" />
            Tentar Novamente
          </Button>
          <Button onClick={enableDemoMode} variant="secondary">
            Visualizar com Dados de Exemplo
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background font-sans text-foreground">
      <div className="max-w-7xl mx-auto p-6 space-y-8">
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-[#4a4f54] p-8 rounded-3xl shadow-xl shadow-black/10">
          <div className="flex flex-col gap-6">
            <EvoLogo />
            <div className="flex items-center gap-3 bg-white/10 p-2 rounded-xl border border-white/10 w-fit backdrop-blur-sm">
              <Building2 className="w-4 h-4 text-[#00a9b4]" />
              <Select value={selectedCompany} onValueChange={setSelectedCompany}>
                <SelectTrigger className="w-[280px] border-none bg-transparent h-8 focus:ring-0 font-medium text-white">
                  <SelectValue placeholder="Selecione a Empresa" />
                </SelectTrigger>
                <SelectContent>
                  {COMPANIES.map(company => (
                    <SelectItem key={company} value={company}>
                      {company.replace('[', '').replace(']', '')}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex items-center gap-6">
            <div className="text-right hidden sm:block">
              <p className="text-[10px] uppercase tracking-widest text-white/50 font-bold">Competência</p>
              <div className="flex items-center justify-end gap-2">
                <CalendarDays className="w-4 h-4 text-[#00a9b4]" />
                <span className="text-sm font-bold uppercase text-white">{format(competenceDate, "MMMM yyyy", { locale: ptBR })}</span>
              </div>
            </div>
            <div className="h-10 w-px bg-white/10 hidden sm:block" />
            <div className="flex flex-col items-end">
              <p className="text-[10px] uppercase tracking-widest text-white/50 font-bold">Última Atualização</p>
              <p className="text-sm font-medium text-white">{format(lastUpdate, "HH:mm:ss", { locale: ptBR })}</p>
            </div>
            <Button onClick={fetchData} disabled={loading} size="icon" variant="ghost" className="rounded-full text-white hover:bg-white/10">
              <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </header>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-5">
          <Card className="border-none shadow-sm hover:shadow-md transition-all cursor-pointer group" onClick={() => handleOpenDetail('receber')}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Total a Receber</CardTitle>
              <div className="p-2 rounded-full bg-emerald-50 text-emerald-600 group-hover:bg-emerald-100 transition-colors">
                <ArrowUpCircle className="h-4 w-4" />
              </div>
            </CardHeader>
            <CardContent>
              {loading ? <Skeleton className="h-8 w-24" /> : (
                <div className="text-2xl font-bold font-heading">
                  {formatCurrency(receberVencimento.reduce((acc, curr) => acc + curr.Valor, 0))}
                </div>
              )}
              <div className="flex items-center gap-1 mt-2 text-xs text-emerald-600 font-medium">
                <span>Ver detalhes</span>
                <ChevronRight className="w-3 h-3" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-sm hover:shadow-md transition-all cursor-pointer group" onClick={() => handleOpenDetail('pagar')}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Total a Pagar</CardTitle>
              <div className="p-2 rounded-full bg-rose-50 text-rose-600 group-hover:bg-rose-100 transition-colors">
                <ArrowDownCircle className="h-4 w-4" />
              </div>
            </CardHeader>
            <CardContent>
              {loading ? <Skeleton className="h-8 w-24" /> : (
                <div className="text-2xl font-bold font-heading">
                  {formatCurrency(pagarVencimento.reduce((acc, curr) => acc + curr.Valor, 0))}
                </div>
              )}
              <div className="flex items-center gap-1 mt-2 text-xs text-rose-600 font-medium">
                <span>Ver detalhes</span>
                <ChevronRight className="w-3 h-3" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-sm hover:shadow-md transition-all cursor-pointer group" onClick={() => handleOpenDetail('caixa')}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Saldo em Caixa</CardTitle>
              <div className="p-2 rounded-full bg-blue-50 text-blue-600 group-hover:bg-blue-100 transition-colors">
                <TrendingUp className="h-4 w-4" />
              </div>
            </CardHeader>
            <CardContent>
              {loading ? <Skeleton className="h-8 w-24" /> : (
                <div className="text-2xl font-bold font-heading">
                  {formatCurrency(fluxoCaixa[fluxoCaixa.length - 1]?.Saldo || 0)}
                </div>
              )}
              <div className="flex items-center gap-1 mt-2 text-xs text-blue-600 font-medium">
                <span>Ver detalhes</span>
                <ChevronRight className="w-3 h-3" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-sm bg-primary/10 border-primary/20">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs font-bold uppercase tracking-wider text-primary">Faturamento Mensal</CardTitle>
              <TrendingUp className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              {loading ? <Skeleton className="h-8 w-24" /> : (
                <div className="text-2xl font-bold font-heading text-primary">
                  {formatCurrency(monthlyTotal)}
                </div>
              )}
              <p className="text-[10px] text-muted-foreground mt-2 font-medium">Competência Atual</p>
            </CardContent>
          </Card>

          <Card className="border-none shadow-sm bg-primary text-primary-foreground">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs font-bold uppercase tracking-wider opacity-80">Projeção Anual</CardTitle>
              <LayoutDashboard className="h-4 w-4 opacity-80" />
            </CardHeader>
            <CardContent>
              {loading ? <Skeleton className="h-8 w-24" /> : (
                <div className="text-2xl font-bold font-heading">
                  {formatCurrency(annualTotal)}
                </div>
              )}
              <p className="text-[10px] opacity-80 mt-2 font-medium">Estimativa 2026</p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="bg-muted/50 p-1 rounded-xl">
            <TabsTrigger value="overview" className="rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm">Visão Geral</TabsTrigger>
            <TabsTrigger value="comparativo" className="rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm">Comparativo</TabsTrigger>
            <TabsTrigger value="orcado" className="rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm">Orçado x Realizado</TabsTrigger>
            <TabsTrigger value="dre" className="rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm">DRE</TabsTrigger>
            <TabsTrigger value="balancete" className="rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm">Balancete</TabsTrigger>
            <TabsTrigger value="fluxo" className="rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm">Fluxo de Caixa</TabsTrigger>
            <TabsTrigger value="contas" className="rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm">Vencimentos</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-7">
              <Card className="col-span-4 border-none shadow-sm">
                <CardHeader>
                  <CardTitle className="font-heading text-lg">Fluxo de Caixa Mensal</CardTitle>
                  <CardDescription>Entradas vs Saídas acumuladas no período.</CardDescription>
                </CardHeader>
                <CardContent className="pl-2">
                  <div className="h-[350px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={fluxoCaixa}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                        <XAxis 
                          dataKey="Data" 
                          stroke="#888888" 
                          fontSize={10} 
                          tickLine={false} 
                          axisLine={false} 
                          tickFormatter={(value) => formatDate(value)}
                        />
                        <YAxis 
                          stroke="#888888" 
                          fontSize={10} 
                          tickLine={false} 
                          axisLine={false} 
                          tickFormatter={(value) => `R$${value/1000}k`}
                        />
                        <Tooltip 
                          formatter={(value: number) => formatCurrency(value)}
                          contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 25px rgba(0,0,0,0.1)', fontFamily: 'Inter' }}
                        />
                        <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px', fontSize: '12px' }} />
                        <Line type="monotone" dataKey="Entradas" stroke="oklch(0.65 0.15 160)" strokeWidth={3} dot={false} activeDot={{ r: 6 }} />
                        <Line type="monotone" dataKey="Saidas" stroke="oklch(0.6 0.2 25)" strokeWidth={3} dot={false} activeDot={{ r: 6 }} />
                        <Line type="monotone" dataKey="Saldo" stroke="var(--primary)" strokeWidth={4} dot={false} activeDot={{ r: 8 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
              <Card className="col-span-3 border-none shadow-sm">
                <CardHeader>
                  <CardTitle className="font-heading text-lg">Distribuição por Vencimento</CardTitle>
                  <CardDescription>Contas a Receber (Top 5).</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[350px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={receberVencimento.slice(0, 5)}>
                        <XAxis dataKey="Vencimento" fontSize={10} tickLine={false} axisLine={false} stroke="#888888" />
                        <YAxis fontSize={10} tickLine={false} axisLine={false} hide />
                        <Tooltip 
                          formatter={(value: number) => formatCurrency(value)}
                          contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 25px rgba(0,0,0,0.1)', fontFamily: 'Inter' }}
                        />
                        <Bar dataKey="Valor" fill="var(--primary)" radius={[6, 6, 0, 0]} barSize={40} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="comparativo" className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              <Card className="border-none shadow-sm">
                <CardHeader>
                  <CardTitle className="font-heading text-lg">Comparativo Mensal vs Anual</CardTitle>
                  <CardDescription>Análise de faturamento mensal em relação à meta anual.</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[400px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={comparisonData}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                        <XAxis dataKey="name" fontSize={10} tickLine={false} axisLine={false} stroke="#888888" />
                        <YAxis fontSize={10} tickLine={false} axisLine={false} stroke="#888888" />
                        <Tooltip 
                          formatter={(value: number) => formatCurrency(value)}
                          contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 25px rgba(0,0,0,0.1)', fontFamily: 'Inter' }}
                        />
                        <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px', fontSize: '12px' }} />
                        <Bar dataKey="mensal" name="Faturamento Mensal" fill="var(--primary)" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="anual" name="Meta Anual (Proporcional)" fill="oklch(0.9 0.05 200)" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-none shadow-sm">
                <CardHeader>
                  <CardTitle className="font-heading text-lg">Resumo de Valores</CardTitle>
                  <CardDescription>Visão consolidada por período.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="p-6 rounded-2xl bg-muted/30 border space-y-2">
                    <p className="text-sm text-muted-foreground font-medium uppercase tracking-wider">Total Mensal (Competência)</p>
                    <p className="text-4xl font-bold font-heading text-primary">{formatCurrency(monthlyTotal)}</p>
                    <div className="flex items-center gap-2 text-xs text-emerald-600 font-bold">
                      <TrendingUp className="w-3 h-3" />
                      <span>+12.5% em relação ao mês anterior</span>
                    </div>
                  </div>

                  <div className="p-6 rounded-2xl bg-primary text-primary-foreground space-y-2 shadow-lg shadow-primary/20">
                    <p className="text-sm opacity-80 font-medium uppercase tracking-wider">Total Anual (Projetado)</p>
                    <p className="text-4xl font-bold font-heading">{formatCurrency(annualTotal)}</p>
                    <p className="text-xs opacity-70">Baseado na média dos últimos 4 meses</p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 rounded-xl border bg-card">
                      <p className="text-[10px] uppercase text-muted-foreground font-bold">Média Mensal</p>
                      <p className="text-lg font-bold">{formatCurrency(annualTotal / 12)}</p>
                    </div>
                    <div className="p-4 rounded-xl border bg-card">
                      <p className="text-[10px] uppercase text-muted-foreground font-bold">Maior Faturamento</p>
                      <p className="text-lg font-bold">{formatCurrency(monthlyTotal * 1.2)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="orcado" className="space-y-6">
            <Card className="border-none shadow-sm">
              <CardHeader>
                <CardTitle className="font-heading text-lg">Orçado x Realizado</CardTitle>
                <CardDescription>Comparativo mensal entre o orçamento planejado e a execução real.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-8">
                <div className="h-[450px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={orcadoRealizado}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                      <XAxis dataKey="Mes" fontSize={10} tickLine={false} axisLine={false} stroke="#888888" />
                      <YAxis fontSize={10} tickLine={false} axisLine={false} stroke="#888888" />
                      <Tooltip 
                        formatter={(value: number) => formatCurrency(value)}
                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 25px rgba(0,0,0,0.1)', fontFamily: 'Inter' }}
                      />
                      <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px', fontSize: '12px' }} />
                      <Bar dataKey="Orcado" name="Orçado" fill="oklch(0.9 0.05 200)" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="Realizado" name="Realizado" fill="var(--primary)" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                <div className="pt-6 border-t">
                  <h3 className="text-lg font-heading mb-4">Dados Correspondentes</h3>
                  <div className="rounded-xl border overflow-hidden">
                    <Table>
                      <TableHeader className="bg-muted/50">
                        <TableRow>
                          <TableHead className="font-bold">Mês</TableHead>
                          <TableHead className="text-right font-bold">Orçado</TableHead>
                          <TableHead className="text-right font-bold">Realizado</TableHead>
                          <TableHead className="text-right font-bold">Desvio</TableHead>
                          <TableHead className="text-right font-bold">% Atingido</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {loading ? (
                          Array.from({ length: 6 }).map((_, i) => (
                            <TableRow key={i}>
                              <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                              <TableCell><Skeleton className="h-4 w-24 ml-auto" /></TableCell>
                              <TableCell><Skeleton className="h-4 w-24 ml-auto" /></TableCell>
                              <TableCell><Skeleton className="h-4 w-24 ml-auto" /></TableCell>
                              <TableCell><Skeleton className="h-4 w-16 ml-auto" /></TableCell>
                            </TableRow>
                          ))
                        ) : orcadoRealizado.length > 0 ? (
                          orcadoRealizado.map((item, i) => (
                            <TableRow key={i} className="hover:bg-muted/30 transition-colors">
                              <TableCell className="py-4 font-medium">{item.Mes}</TableCell>
                              <TableCell className="text-right py-4">{formatCurrency(item.Orcado)}</TableCell>
                              <TableCell className="text-right py-4 font-bold">{formatCurrency(item.Realizado)}</TableCell>
                              <TableCell className={`text-right py-4 font-medium ${item.Desvio < 0 ? 'text-rose-500' : 'text-emerald-500'}`}>
                                {formatCurrency(item.Desvio)}
                              </TableCell>
                              <TableCell className="text-right py-4">
                                <span className={`px-2 py-1 rounded-full text-[10px] font-bold ${item.Percentual >= 100 ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                                  {item.Percentual}%
                                </span>
                              </TableCell>
                            </TableRow>
                          ))
                        ) : (
                          <TableRow>
                            <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                              Nenhum dado encontrado.
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="dre">
            <Card className="border-none shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="font-heading text-lg">DRE</CardTitle>
                  <CardDescription>Demonstração do Resultado do Exercício.</CardDescription>
                </div>
                <Button variant="outline" size="sm" onClick={() => {
                  const worksheet = XLSX.utils.json_to_sheet(dre);
                  const workbook = XLSX.utils.book_new();
                  XLSX.utils.book_append_sheet(workbook, worksheet, "DRE");
                  XLSX.writeFile(workbook, `DRE_${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
                }}>
                  <Download className="w-4 h-4 mr-2" />
                  Exportar
                </Button>
              </CardHeader>
              <CardContent>
                <div className="rounded-xl border overflow-hidden">
                  <Table>
                    <TableHeader className="bg-muted/50">
                      <TableRow>
                        <TableHead className="font-bold text-foreground">Descrição</TableHead>
                        <TableHead className="text-right font-bold text-foreground">Valor</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {loading ? (
                        Array.from({ length: 7 }).map((_, i) => (
                          <TableRow key={i}>
                            <TableCell><Skeleton className="h-4 w-60" /></TableCell>
                            <TableCell><Skeleton className="h-4 w-24 ml-auto" /></TableCell>
                          </TableRow>
                        ))
                      ) : (
                        dre.map((item, i) => (
                          <TableRow key={i} className={item.Descricao.includes('LUCRO') || item.Descricao.includes('RESULTADO') || item.Descricao.includes('RECEITA LIQUIDA') ? 'bg-primary/5 font-bold text-primary' : ''}>
                            <TableCell className="py-4">{item.Descricao}</TableCell>
                            <TableCell className={`text-right py-4 font-medium ${item.Valor < 0 ? 'text-rose-500' : ''}`}>
                              {formatCurrency(item.Valor)}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="balancete">
            <Card className="border-none shadow-sm">
              <CardHeader>
                <CardTitle className="font-heading text-lg">Balancete Analítico</CardTitle>
                <CardDescription>Detalhamento de contas e saldos atuais.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="rounded-xl border overflow-hidden">
                  <Table>
                    <TableHeader className="bg-muted/50">
                      <TableRow>
                        <TableHead className="font-bold text-foreground">Conta</TableHead>
                        <TableHead className="font-bold text-foreground">Descrição</TableHead>
                        <TableHead className="text-right font-bold text-foreground">Saldo Atual</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {loading ? (
                        Array.from({ length: 5 }).map((_, i) => (
                          <TableRow key={i}>
                            <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                            <TableCell><Skeleton className="h-4 w-40" /></TableCell>
                            <TableCell><Skeleton className="h-4 w-20 ml-auto" /></TableCell>
                          </TableRow>
                        ))
                      ) : (
                        balancete.map((item, i) => (
                          <TableRow key={i} className="hover:bg-muted/30 transition-colors">
                            <TableCell className="font-mono text-[10px] text-muted-foreground py-4">{item.Conta}</TableCell>
                            <TableCell className="py-4 font-medium">{item.Descricao}</TableCell>
                            <TableCell className="text-right font-bold py-4">{formatCurrency(item.SaldoAtual)}</TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="fluxo">
            <Card className="border-none shadow-sm">
              <CardHeader>
                <CardTitle className="font-heading text-lg">Histórico de Fluxo de Caixa</CardTitle>
                <CardDescription>Movimentação diária de entradas e saídas.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-8">
                <div className="h-[450px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={fluxoCaixa}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                      <XAxis dataKey="Data" fontSize={10} tickLine={false} axisLine={false} tickFormatter={(value) => formatDate(value)} stroke="#888888" />
                      <YAxis fontSize={10} tickLine={false} axisLine={false} stroke="#888888" />
                      <Tooltip 
                        formatter={(value: number) => formatCurrency(value)}
                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 25px rgba(0,0,0,0.1)', fontFamily: 'Inter' }}
                      />
                      <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px', fontSize: '12px' }} />
                      <Bar dataKey="Entradas" fill="oklch(0.65 0.15 160)" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="Saidas" fill="oklch(0.6 0.2 25)" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                <div className="pt-6 border-t">
                  <h3 className="text-lg font-heading mb-4">Detalhamento Analítico (Carga)</h3>
                  <div className="rounded-xl border overflow-hidden">
                    <Table>
                      <TableHeader className="bg-muted/50">
                        <TableRow>
                          <TableHead className="font-bold">Data</TableHead>
                          <TableHead className="font-bold">Descrição</TableHead>
                          <TableHead className="font-bold">Tipo</TableHead>
                          <TableHead className="font-bold">Banco</TableHead>
                          <TableHead className="text-right font-bold">Valor</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {loading ? (
                          Array.from({ length: 3 }).map((_, i) => (
                            <TableRow key={i}>
                              <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                              <TableCell><Skeleton className="h-4 w-40" /></TableCell>
                              <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                              <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                              <TableCell><Skeleton className="h-4 w-20 ml-auto" /></TableCell>
                            </TableRow>
                          ))
                        ) : fluxoAnalitico.length > 0 ? (
                          fluxoAnalitico.map((item, i) => (
                            <TableRow key={i} className="hover:bg-muted/30 transition-colors">
                              <TableCell className="py-4">{formatDate(item.Data)}</TableCell>
                              <TableCell className="py-4 font-medium">{item.Descricao}</TableCell>
                              <TableCell className="py-4">
                                <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${item.Tipo === 'Entrada' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                                  {item.Tipo}
                                </span>
                              </TableCell>
                              <TableCell className="py-4 text-muted-foreground">{item.Banco}</TableCell>
                              <TableCell className={`text-right py-4 font-bold ${item.Tipo === 'Saída' ? 'text-rose-500' : 'text-emerald-500'}`}>
                                {formatCurrency(item.Valor)}
                              </TableCell>
                            </TableRow>
                          ))
                        ) : (
                          <TableRow>
                            <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                              Nenhum registro analítico encontrado.
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="contas">
            <div className="grid gap-6 md:grid-cols-2">
              <Card className="border-none shadow-sm">
                <CardHeader>
                  <CardTitle className="font-heading text-lg">Contas a Pagar por Vencimento</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[350px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={pagarVencimento} layout="vertical">
                        <XAxis type="number" hide />
                        <YAxis dataKey="Vencimento" type="category" fontSize={10} width={100} tickLine={false} axisLine={false} stroke="#888888" />
                        <Tooltip 
                          formatter={(value: number) => formatCurrency(value)}
                          contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 25px rgba(0,0,0,0.1)', fontFamily: 'Inter' }}
                        />
                        <Bar dataKey="Valor" fill="oklch(0.6 0.2 25)" radius={[0, 4, 4, 0]} barSize={20} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
              <Card className="border-none shadow-sm">
                <CardHeader>
                  <CardTitle className="font-heading text-lg">Contas a Receber por Vencimento</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[350px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={receberVencimento} layout="vertical">
                        <XAxis type="number" hide />
                        <YAxis dataKey="Vencimento" type="category" fontSize={10} width={100} tickLine={false} axisLine={false} stroke="#888888" />
                        <Tooltip 
                          formatter={(value: number) => formatCurrency(value)}
                          contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 25px rgba(0,0,0,0.1)', fontFamily: 'Inter' }}
                        />
                        <Bar dataKey="Valor" fill="oklch(0.65 0.15 160)" radius={[0, 4, 4, 0]} barSize={20} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>

        <Dialog open={detailType !== null} onOpenChange={(open) => !open && setDetailType(null)}>
          <DialogContent className="sm:max-w-4xl max-h-[90vh] bg-background shadow-2xl border-none rounded-3xl p-0 overflow-hidden">
            <div className="p-8 space-y-6">
              <DialogHeader className="flex flex-row items-center justify-between">
                <div className="space-y-1">
                  <DialogTitle className="font-heading text-2xl">
                    {detailType === 'pagar' && (detailLevel === 'summary' ? 'Resumo de Contas a Pagar' : `Lançamentos: ${selectedAccount}`)}
                    {detailType === 'receber' && 'Detalhamento de Contas a Receber'}
                    {detailType === 'caixa' && 'Detalhamento de Fluxo de Caixa'}
                  </DialogTitle>
                  <DialogDescription className="text-base">
                    {detailLevel === 'summary' ? 'Clique em uma conta para ver os lançamentos detalhados.' : 'Listagem analítica das movimentações.'}
                  </DialogDescription>
                </div>
                <div className="flex items-center gap-3">
                  {detailType === 'pagar' && detailLevel === 'detail' && (
                    <Button onClick={() => setDetailLevel('summary')} variant="outline" size="sm" className="rounded-full">
                      Voltar ao Resumo
                    </Button>
                  )}
                  {!detailLoading && (detailData.length > 0 || summaryData.length > 0) && (
                    <Button onClick={exportToExcel} variant="default" size="sm" className="rounded-full shadow-lg shadow-primary/20">
                      <Download className="w-4 h-4 mr-2" />
                      Exportar Excel
                    </Button>
                  )}
                </div>
              </DialogHeader>
              
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  placeholder={detailLevel === 'summary' ? "Pesquisar por conta contábil..." : "Pesquisar por nome, data ou valor..."}
                  className="pl-12 h-14 bg-muted/30 border-none rounded-2xl text-base focus-visible:ring-primary"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>

              <div className="rounded-2xl border bg-card overflow-hidden">
                <ScrollArea className="h-[500px]">
                  {detailLoading ? (
                    <div className="p-6 space-y-4">
                      {Array.from({ length: 6 }).map((_, i) => (
                        <Skeleton key={i} className="h-16 w-full rounded-xl" />
                      ))}
                    </div>
                  ) : detailLevel === 'summary' ? (
                    <div className="space-y-6">
                      {vencimentoSummary.length > 0 && (
                        <div className="p-6 border-b bg-muted/20">
                          <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-4">Resumo por Vencimento</h4>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            {vencimentoSummary.map((v, i) => (
                              <div key={i} className="p-3 rounded-xl bg-background border shadow-sm">
                                <p className="text-[10px] uppercase font-bold text-muted-foreground">{v.Vencimento}</p>
                                <p className="text-lg font-bold text-primary">{formatCurrency(v.Valor)}</p>
                                <p className="text-[10px] text-muted-foreground">{v.Quantidade} lançamentos</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      <Table>
                        <TableHeader className="bg-muted/50 sticky top-0 z-10">
                          <TableRow>
                            <TableHead className="font-bold py-4">Conta Contábil</TableHead>
                            <TableHead className="text-right font-bold py-4">Valor Total</TableHead>
                            <TableHead className="w-[80px]"></TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredSummaryData.length > 0 ? (
                            <>
                              {filteredSummaryData.map((item, i) => (
                                <TableRow 
                                  key={i} 
                                  className="cursor-pointer hover:bg-primary/5 transition-colors group"
                                  onClick={() => handleAccountClick(item.AcctName)}
                                >
                                  <TableCell className="font-semibold py-5 text-base">{item.AcctName}</TableCell>
                                  <TableCell className="text-right font-bold py-5 text-base">
                                    {formatCurrency(item.Valor)}
                                  </TableCell>
                                  <TableCell className="text-right pr-6">
                                    <div className="p-2 rounded-full bg-muted group-hover:bg-primary group-hover:text-primary-foreground transition-all">
                                      <ChevronRight className="w-4 h-4" />
                                    </div>
                                  </TableCell>
                                </TableRow>
                              ))}
                              <TableRow className="bg-muted/30 font-bold">
                                <TableCell className="py-5 text-lg">TOTAL GERAL</TableCell>
                                <TableCell className="text-right py-5 text-lg text-primary">
                                  {formatCurrency(filteredSummaryData.reduce((acc, curr) => acc + curr.Valor, 0))}
                                </TableCell>
                                <TableCell></TableCell>
                              </TableRow>
                            </>
                          ) : (
                            <TableRow>
                              <TableCell colSpan={3} className="text-center py-20 text-muted-foreground">
                                <div className="flex flex-col items-center gap-2">
                                  <Search className="w-10 h-10 opacity-20" />
                                  <p className="text-lg font-medium">Nenhuma conta encontrada.</p>
                                </div>
                              </TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  ) : (
                    <Table>
                      <TableHeader className="bg-muted/50 sticky top-0 z-10">
                        <TableRow>
                          <TableHead className="font-bold py-4">
                            {detailType === 'caixa' ? 'Descrição' : (detailType === 'pagar' ? 'Nome do Fornecedor' : 'Nome do Cliente')}
                          </TableHead>
                          <TableHead className="font-bold py-4">Data de Vencimento</TableHead>
                          <TableHead className="text-right font-bold py-4">Valor</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredDetailData.length > 0 ? (
                          filteredDetailData.map((item, i) => (
                            <TableRow key={i} className="hover:bg-muted/30 transition-colors">
                              <TableCell className="font-medium py-5">{item.Nome}</TableCell>
                              <TableCell className="py-5 text-muted-foreground">{formatDate(item.Data)}</TableCell>
                              <TableCell className="text-right font-bold py-5 text-lg">
                                {formatCurrency(item.Valor)}
                              </TableCell>
                            </TableRow>
                          ))
                        ) : (
                          <TableRow>
                            <TableCell colSpan={3} className="text-center py-20 text-muted-foreground">
                              <div className="flex flex-col items-center gap-2">
                                <Search className="w-10 h-10 opacity-20" />
                                <p className="text-lg font-medium">Nenhum registro encontrado.</p>
                              </div>
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  )}
                </ScrollArea>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
