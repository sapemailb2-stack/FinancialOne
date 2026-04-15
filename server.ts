import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import cors from "cors";
import sql from "mssql";
import dotenv from "dotenv";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

// SQL Server Configuration
const sqlConfig = {
  user: process.env.DB_USER || "svc_dbsap",
  password: process.env.DB_PASSWORD || "svc_8@#rskT@3!",
  database: process.env.DB_NAME || "DBSAP",
  server: process.env.DB_SERVER || "192.1.3.4",
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000
  },
  options: {
    encrypt: true, // for azure
    trustServerCertificate: process.env.DB_TRUST_SERVER_CERTIFICATE === "true" // change to true for local dev / self-signed certs
  }
};

let pool: sql.ConnectionPool | null = null;

async function getPool() {
  if (!pool) {
    try {
      pool = await sql.connect(sqlConfig);
      console.log("Connected to SQL Server");
    } catch (err) {
      console.error("SQL Connection Error:", err);
      throw err;
    }
  }
  return pool;
}

// API Routes
app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

// Mock Data Generator
const getMockData = (name: string) => {
  switch (name) {
    case 'spcJBCBalancete1':
      return [
        { Conta: '1.01.01', Descricao: 'CAIXA GERAL', SaldoAnterior: 15000, Debito: 5000, Credito: 2000, SaldoAtual: 18000 },
        { Conta: '1.01.02', Descricao: 'BANCO CONTA MOVIMENTO', SaldoAnterior: 450000, Debito: 120000, Credito: 150000, SaldoAtual: 420000 },
        { Conta: '2.01.01', Descricao: 'FORNECEDORES NACIONAIS', SaldoAnterior: -85000, Debito: 45000, Credito: 60000, SaldoAtual: -100000 },
      ];
    case 'spcIPTContasAPagarPorVencimento':
      return [
        { Vencimento: 'Hoje', Valor: 12500, Quantidade: 5, AcctName: 'FORNECEDORES DIVERSOS' },
        { Vencimento: '7 Dias', Valor: 45000, Quantidade: 12, AcctName: 'IMPOSTOS A RECOLHER' },
        { Vencimento: '15 Dias', Valor: 32000, Quantidade: 8, AcctName: 'SALARIOS A PAGAR' },
        { Vencimento: '30 Dias', Valor: 89000, Quantidade: 25, AcctName: 'FORNECEDORES DIVERSOS' },
      ];
    case 'spcIPTContasAPagarDetalhado':
      return [
        { Nome: 'FORNECEDOR A', Data: '2024-04-15', Valor: 5000.00, AcctName: 'FORNECEDORES DIVERSOS' },
        { Nome: 'FORNECEDOR B', Data: '2024-04-16', Valor: 7500.00, AcctName: 'FORNECEDORES DIVERSOS' },
        { Nome: 'IMPOSTO X', Data: '2024-04-18', Valor: 45000.00, AcctName: 'IMPOSTOS A RECOLHER' },
        { Nome: 'FOLHA A', Data: '2024-04-20', Valor: 32000.00, AcctName: 'SALARIOS A PAGAR' },
        { Nome: 'FORNECEDOR C', Data: '2024-04-22', Valor: 89000.00, AcctName: 'FORNECEDORES DIVERSOS' },
      ];
    case 'spcJBCContasAReceberPorVencimento':
      return [
        { Vencimento: 'Hoje', Valor: 28000, Quantidade: 15 },
        { Vencimento: '7 Dias', Valor: 62000, Quantidade: 22 },
        { Vencimento: '15 Dias', Valor: 41000, Quantidade: 18 },
        { Vencimento: '30 Dias', Valor: 156000, Quantidade: 45 },
      ];
    case 'spcJBCContasPagarUnificado':
    case 'spcJBCContasPagasPorFornecedor':
      return [
        { Nome: 'FORNECEDOR ALFA LTDA', Data: '2024-04-15', Valor: 5400.00 },
        { Nome: 'SERVICOS BETA S.A.', Data: '2024-04-16', Valor: 1200.50 },
        { Nome: 'GAMMA DISTRIBUIDORA', Data: '2024-04-18', Valor: 3500.00 },
        { Nome: 'DELTA ENERGIA', Data: '2024-04-20', Valor: 850.00 },
        { Nome: 'EPSILON TRANSPORTES', Data: '2024-04-22', Valor: 2100.00 },
      ];
    case 'spcJBCContasReceberUnificado':
    case 'spcJBCContasRecebidasPorCliente':
      return [
        { Nome: 'CLIENTE SOLUCOES ME', Data: '2024-04-15', Valor: 8900.00 },
        { Nome: 'INDUSTRIA OMEGA', Data: '2024-04-17', Valor: 15400.00 },
        { Nome: 'MERCADO SIGMA', Data: '2024-04-19', Valor: 3200.00 },
        { Nome: 'CONSTRUTORA ZETA', Data: '2024-04-21', Valor: 12000.00 },
        { Nome: 'TECNOLOGIA KAPPA', Data: '2024-04-25', Valor: 5600.00 },
      ];
    case 'spcJBCFluxoCaixa':
      return [
        { Data: '2024-04-01', Entradas: 15000, Saidas: 12000, Saldo: 3000 },
        { Data: '2024-04-02', Entradas: 22000, Saidas: 18000, Saldo: 7000 },
        { Data: '2024-04-03', Entradas: 18000, Saidas: 25000, Saldo: 0 },
        { Data: '2024-04-04', Entradas: 35000, Saidas: 20000, Saldo: 15000 },
        { Data: '2024-04-05', Entradas: 28000, Saidas: 15000, Saldo: 28000 },
      ];
    case 'spcJBCFluxoCaixa_CARGA_Analitico':
      return [
        { Data: '2024-04-01', Descricao: 'VENDA MERCADORIA', Tipo: 'Entrada', Valor: 5000, Banco: 'ITAU' },
        { Data: '2024-04-01', Descricao: 'PAGTO FORNECEDOR', Tipo: 'Saída', Valor: 2000, Banco: 'BRADESCO' },
        { Data: '2024-04-02', Descricao: 'RECEBIMENTO DUPLICATA', Tipo: 'Entrada', Valor: 8000, Banco: 'ITAU' },
        { Data: '2024-04-02', Descricao: 'PAGTO LUZ', Tipo: 'Saída', Valor: 500, Banco: 'CAIXA' },
        { Data: '2024-04-03', Descricao: 'VENDA SERVICO', Tipo: 'Entrada', Valor: 12000, Banco: 'SANTANDER' },
      ];
    case 'spcJBC_OrcadoRealizado':
      return [
        { Mes: 'Jan', Orcado: 450000, Realizado: 420000, Desvio: -30000, Percentual: 93.3 },
        { Mes: 'Fev', Orcado: 450000, Realizado: 465000, Desvio: 15000, Percentual: 103.3 },
        { Mes: 'Mar', Orcado: 480000, Realizado: 440000, Desvio: -40000, Percentual: 91.7 },
        { Mes: 'Abr', Orcado: 500000, Realizado: 512000, Desvio: 12000, Percentual: 102.4 },
        { Mes: 'Mai', Orcado: 500000, Realizado: 0, Desvio: 0, Percentual: 0 },
        { Mes: 'Jun', Orcado: 500000, Realizado: 0, Desvio: 0, Percentual: 0 },
      ];
    case 'view_dre':
      return [
        { Descricao: 'RECEITA BRUTA', Valor: 1500000, Ordem: 1 },
        { Descricao: 'DEDUCOES DA RECEITA', Valor: -250000, Ordem: 2 },
        { Descricao: 'RECEITA LIQUIDA', Valor: 1250000, Ordem: 3 },
        { Descricao: 'CUSTOS DOS PRODUTOS VENDIDOS', Valor: -700000, Ordem: 4 },
        { Descricao: 'LUCRO BRUTO', Valor: 550000, Ordem: 5 },
        { Descricao: 'DESPESAS OPERACIONAIS', Valor: -300000, Ordem: 6 },
        { Descricao: 'RESULTADO LIQUIDO', Valor: 250000, Ordem: 7 },
      ];
    default:
      return [];
  }
};

// Generic Procedure Execution
app.get("/api/procedure/:name", async (req, res) => {
  const { name } = req.params;
  const { db: targetDb, ...params } = req.query;

  // Check for mock mode
  if (process.env.USE_MOCK_DATA === "true") {
    return res.json(getMockData(name));
  }

  try {
    const pool = await getPool();
    const request = pool.request();

    // If a target database is provided, switch context
    if (targetDb) {
      await request.query(`USE [${targetDb}]`);
    }

    // If parameters are named p1, p2, p3... we treat them as positional for a raw query
    const paramKeys = Object.keys(params).sort();
    const isPositional = paramKeys.length > 0 && paramKeys.every(k => /^p\d+$/.test(k));

    if (isPositional) {
      const values = paramKeys.map(k => {
        const val = params[k] as string;
        // Basic sanitization for strings in raw query (very simple, ideally use request.input)
        return val === '*' ? "'*'" : `'${val.replace(/'/g, "''")}'`;
      });
      const query = `EXEC ${name} ${values.join(', ')}`;
      const result = await request.query(query);
      res.json(result.recordset);
    } else {
      // Standard named parameters
      for (const [key, value] of Object.entries(params)) {
        request.input(key, value);
      }
      const result = await request.execute(name);
      res.json(result.recordset);
    }
  } catch (err) {
    console.error(`Error executing procedure ${name}:`, err);
    
    // If connection fails and it's a DNS error, provide a more helpful message
    const errorMessage = err instanceof Error ? err.message : String(err);
    if (errorMessage.includes("EAI_AGAIN") || errorMessage.includes("getaddrinfo")) {
      res.status(503).json({ 
        error: "DNS_ERROR", 
        message: `Não foi possível resolver o nome do servidor '${sqlConfig.server}'. Verifique se o nome está correto ou tente usar o endereço IP.`,
        details: errorMessage
      });
    } else {
      res.status(500).json({ error: "DATABASE_ERROR", message: errorMessage });
    }
  }
});

// DRE View Endpoint
app.get("/api/dre", async (req, res) => {
  if (process.env.USE_MOCK_DATA === "true") {
    return res.json(getMockData('view_dre'));
  }

  try {
    const pool = await getPool();
    const result = await pool.request().query("SELECT * FROM [EVO_SA_PRD_2018].[dbo].[B1_DRE_1]");
    res.json(result.recordset);
  } catch (err) {
    console.error("Error fetching DRE view:", err);
    res.status(500).json({ error: "DATABASE_ERROR", message: err instanceof Error ? err.message : String(err) });
  }
});

async function startServer() {
  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("Failed to start server:", err);
});
