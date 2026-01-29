import { createContext, useContext, useState, ReactNode, useCallback, useMemo } from 'react';

type Language = 'pt' | 'en' | 'sw';

interface Translations {
    [key: string]: {
        [key in Language]: string;
    };
}

const translations: Translations = {
    // Brand
    brandName: { pt: 'CAAR MOBIL SISTEMA DE GESTAO', en: 'CAAR MOBIL MANAGEMENT SYSTEM', sw: 'CAAR MOBIL MFUMO WA USIMAMIZI' },

    // Navigation
    dashboard: { pt: 'Painel', en: 'Dashboard', sw: 'Dashibodi' },
    inventory: { pt: 'Inventário', en: 'Inventory', sw: 'Hesabu' },
    movements: { pt: 'Movimentações', en: 'Movements', sw: 'Mienendo' },
    services: { pt: 'Serviços do Dia', en: 'Daily Services', sw: 'Huduma za Kila Siku' },
    financials: { pt: 'Financeiro', en: 'Financials', sw: 'Fedha' },
    financesHub: { pt: 'Finanças & Fluxos', en: 'Finance Hub', sw: 'Kituo cha Fedha' },
    reports: { pt: 'Relatórios', en: 'Reports', sw: 'Ripoti' },
    analytics: { pt: 'Análise de Auditoria', en: 'Audit analysis', sw: 'Uchambuzi wa Ukaguzi' },
    team: { pt: 'Equipe', en: 'Team', sw: 'Timu' },
    audit: { pt: 'Auditoria', en: 'Audit', sw: 'Ukaguzi' },
    settings: { pt: 'Configurações', en: 'Settings', sw: 'Mipangilio' },
    whatsNew: { pt: 'Novidades', en: "What's New", sw: 'Nini Kipya' },
    about: { pt: 'Sobre', en: 'About', sw: 'Kuhusu' },
    support: { pt: 'Ajuda e Suporte', en: 'Help & Support', sw: 'Msaada na Usaidizi' },
    logout: { pt: 'Sair', en: 'Logout', sw: 'Ondoka' },

    // Roles
    admin: { pt: 'Administrador', en: 'Administrator', sw: 'Msimamizi' },
    manager: { pt: 'Gerente', en: 'Manager', sw: 'Meneja' },
    employee: { pt: 'Funcionário', en: 'Employee', sw: 'Mfanyakazi' },
    userLabel: { pt: 'Usuário', en: 'User', sw: 'Mtumiaji' },

    // Dashboard Specific
    commandCenter: { pt: 'CENTRO DE COMANDO', en: 'COMMAND CENTER', sw: 'KITUO CHA AMRI' },
    operationalManagement: { pt: 'Gestão Operacional de Ativos', en: 'Operational Asset Management', sw: 'Usimamizi wa Rasilimali' },
    newOperation: { pt: 'Nova Operação', en: 'New Operation', sw: 'Operesheni Mpya' },
    inventoryValue: { pt: 'Valor do Estoque', en: 'Inventory Value', sw: 'Thamani ya Hesabu' },
    revenue: { pt: 'Receitas', en: 'Revenue', sw: 'Mapato' },
    expenses: { pt: 'Despesas', en: 'Expenses', sw: 'Gharama' },
    netProfit: { pt: 'Lucro Líquido', en: 'Net Profit', sw: 'Faida Halisi' },
    recentOperations: { pt: 'Últimas Operações', en: 'Recent Operations', sw: 'Operesheni za Hivi Karibuni' },
    realTime: { pt: 'Tempo Real', en: 'Real Time', sw: 'Wakati Halisi' },
    viewAll: { pt: 'Ver todas', en: 'View all', sw: 'Tazama zote' },
    productsCount: { pt: 'produtos', en: 'products', sw: 'bidhaa' },
    totalReceived: { pt: 'Total recebido', en: 'Total received', sw: 'Jumla iliyopokelewa' },
    totalInvested: { pt: 'Total investido', en: 'Total invested', sw: 'Jumla iliyowekezwa' },
    positive: { pt: 'Positivo', en: 'Positive', sw: 'Chanya' },
    negative: { pt: 'Negativo', en: 'Negative', sw: 'Hasi' },
    noRecentOps: { pt: 'Nenhuma operação recente.', en: 'No recent operations.', sw: 'Hakuna operesheni za hivi karibuni.' },
    confirm: { pt: 'Confirmar', en: 'Confirm', sw: 'Thibitisha' },
    income: { pt: 'Entrada', en: 'Income', sw: 'Mapato' },
    expense: { pt: 'Saída', en: 'Expense', sw: 'Gharama' },
    value: { pt: 'Valor', en: 'Value', sw: 'Thamani' },
    description: { pt: 'Descrição', en: 'Description', sw: 'Maelezo' },
    descPlaceholder: { pt: 'Ex: Venda de IPhone, Pagamento de Luz...', en: 'Ex: iPhone Sale, Electricity Payment...', sw: 'Mfano: Mauzo ya iPhone, Malipo ya Umeme...' },
    opSuccess: { pt: 'Foi bom! Operação registrada com sucesso.', en: 'Great! Operation recorded successfully.', sw: 'Safi! Operesheni imerekodiwa kwa mafanikio.' },
    deleteConfirm: { pt: 'Deseja remover {count} itens do estoque?', en: 'Do you want to remove {count} items from stock?', sw: 'Je, unataka kuondoa bidhaa {count} kutoka kwenye hesabu?' },
    deleteTransactionConfirm: { pt: 'Tem certeza que deseja excluir esta transação?', en: 'Are you sure you want to delete this transaction?', sw: 'Je, una uhakika unataka kufuta muamala huu?' },

    // Table Headers
    sku: { pt: 'SKU', en: 'SKU', sw: 'SKU' },
    image: { pt: 'Imagem', en: 'Image', sw: 'Picha' },
    title: { pt: 'Título', en: 'Title', sw: 'Kichwa' },
    category: { pt: 'Categoria', en: 'Category', sw: 'Kundi' },
    qty: { pt: 'QTD', en: 'QTY', sw: 'Kiasi' },
    location: { pt: 'Localização', en: 'Location', sw: 'Mahali' },
    price: { pt: 'Preço', en: 'Price', sw: 'Bei' },
    syncDate: { pt: 'Sincronização', en: 'Sync', sw: 'Usawazishaji' },
    status: { pt: 'Status', en: 'Status', sw: 'Hali' },

    // Data Labels
    active: { pt: 'Ativo', en: 'Active', sw: 'Inafanya kazi' },
    syncedWarehouse: { pt: 'Sincronizado com Armazém', en: 'Synced with Warehouse', sw: 'Inasawazishwa na Ghala' },
    centralWarehouse: { pt: 'Armazém Central', en: 'Central Warehouse', sw: 'Ghala Kuu' },

    // Inventory Summary
    smartSummary: { pt: 'Resumo Inteligente', en: 'Smart Summary', sw: 'Muhtasari wa Akili' },
    performanceAnalysis: { pt: 'Análise de Performance', en: 'Performance Analysis', sw: 'Uchambuzi wa Utendaji' },
    topRanking: { pt: 'Top 3 Ranking', en: 'Top 3 Ranking', sw: 'Nafasi 3 za Juu' },
    unitsSold: { pt: 'unidades vendidas', en: 'units sold', sw: 'vifaa vilivyouzwa' },
    attentionNeeded: { pt: 'Atenção Necessária', en: 'Attention Needed', sw: 'Tahadhari Inahitajika' },
    stagnant: { pt: 'Estagnados', en: 'Stagnant', sw: 'Imekwama' },
    noMovement7d: { pt: 'Sem Giro (7d)', en: 'No Movement (7d)', sw: 'Hakuna Mauzo (Siku 7)' },

    // Products & Inventory Specific
    inventoryMotor: { pt: 'MOTOR DE ESTOQUE', en: 'STOCK MOTOR', sw: 'INJINI YA HESABU' },
    precisionCatalog: { pt: 'Gerenciamento de Catálogo de Precisão', en: 'Precision Catalog Management', sw: 'Usimamizi wa Katalogi kwa Usahihi' },
    addProduct: { pt: 'Adicionar Produto', en: 'Add Product', sw: 'Ongeza Bidhaa' },
    editProduct: { pt: 'Editar Produto', en: 'Edit Product', sw: 'Hariri Bidhaa' },
    deleteProductConfirm: { pt: 'Tem certeza que deseja excluir este produto?', en: 'Are you sure you want to delete this product?', sw: 'Je, una uhakika unataka kufuta bidhaa hii?' },
    stockAdjust: { pt: 'Ajustar Estoque', en: 'Adjust Stock', sw: 'Rekebisha Hesabu' },
    currentStock: { pt: 'Estoque Atual', en: 'Current Stock', sw: 'Hesabu ya Sasa' },
    minStock: { pt: 'Estoque Mínimo', en: 'Minimum Stock', sw: 'Hesabu ya Chini' },
    lowStock: { pt: 'Estoque Baixo', en: 'Low Stock', sw: 'Hesabu Chini' },
    outOfStock: { pt: 'Esgotado', en: 'Out of Stock', sw: 'Imeisha' },
    confirmMovement: { pt: 'Confirmar Movimentação', en: 'Confirm Movement', sw: 'Thibitisha Harakati' },
    reason: { pt: 'Motivo', en: 'Reason', sw: 'Sababu' },
    reasonPlaceholder: { pt: 'Ex: Compra de lote, Venda balcão, Perda...', en: 'Ex: Batch purchase, Counter sale, Loss...', sw: 'Mfano: Ununuzi wa jumla, Mauzo ya kaunta, Upotevu...' },

    // Financials Specific
    cashFlow: { pt: 'Fluxo de Caixa', en: 'Cash Flow', sw: 'Mtiririko wa Pesa' },
    proFinancialManagement: { pt: 'Gestão financeira profissional', en: 'Professional financial management', sw: 'Usimamizi wa kifedha wa kitaalamu' },
    newTransaction: { pt: 'Nova Transação', en: 'New Transaction', sw: 'Muamala Mpya' },
    consolidatedBalance: { pt: 'Saldo Consolidado', en: 'Consolidated Balance', sw: 'Salio Lililojumuishwa' },
    totalRevenue: { pt: 'Receitas Totais', en: 'Total Revenue', sw: 'Mapato Jumla' },
    totalExpenses: { pt: 'Despesas Totais', en: 'Total Expenses', sw: 'Gharama Jumla' },
    receivable: { pt: 'A Receber', en: 'Receivable', sw: 'Zinazotarajiwa' },
    payable: { pt: 'A Pagar', en: 'Payable', sw: 'Zinazopaswa kulipwa' },
    operationalMargin: { pt: 'Margem Operacional', en: 'Operational Margin', sw: 'Faida ya Operesheni' },
    allStatus: { pt: 'Todos Status', en: 'All Status', sw: 'Hali Zote' },
    paid: { pt: 'Pago', en: 'Paid', sw: 'Imelipwa' },
    pending: { pt: 'Pendente', en: 'Pending', sw: 'Inasubiri' },
    overdue: { pt: 'Atrasado', en: 'Overdue', sw: 'Imechelewa' },
    liquidated: { pt: 'Liquidado', en: 'Liquidated', sw: 'Imelipwa Kamili' },
    cash: { pt: 'Dinheiro', en: 'Cash', sw: 'Pesa taslimu' },
    card: { pt: 'Cartão', en: 'Card', sw: 'Kadi' },
    transfer: { pt: 'Transferência', en: 'Transfer', sw: 'Hamisha' },
    others: { pt: 'Outros', en: 'Others', sw: 'Nyinginezo' },
    searchPlaceholderFin: { pt: 'Buscar por descrição ou categoria...', en: 'Search by description or category...', sw: 'Tafuta kwa maelezo au kundi...' },
    noTransactions: { pt: 'Sem movimentações', en: 'No transactions', sw: 'Hakuna miamala' },
    refresh: { pt: 'Atualizar', en: 'Refresh', sw: 'Sasisha' },

    // Service Orders Specific
    serviceManagement: { pt: 'Gestão de Serviços', en: 'Service Management', sw: 'Usimamizi wa Huduma' },
    repairControl: { pt: 'Controle de reparos e manutenções', en: 'Repair and maintenance control', sw: 'Udhibiti wa ukarabati na matunzo' },
    newService: { pt: 'Novo Serviço', en: 'New Service', sw: 'Huduma Mpya' },
    client: { pt: 'Cliente', en: 'Client', sw: 'Mteja' },
    device: { pt: 'Aparelho', en: 'Device', sw: 'Kifaa' },
    deviceModel: { pt: 'Modelo do Aparelho', en: 'Device Model', sw: 'Aina ya Kifaa' },
    problemDescription: { pt: 'Descrição do Problema', en: 'Problem Description', sw: 'Maelezo ya Tatizo' },
    inProgress: { pt: 'Em Andamento', en: 'In Progress', sw: 'Inaendelea' },
    finished: { pt: 'Finalizado', en: 'Finished', sw: 'Imekamilika' },
    delivered: { pt: 'Entregue', en: 'Delivered', sw: 'Imetolewa' },
    noServiceFound: { pt: 'Nenhum serviço encontrado', en: 'No service found', sw: 'Hakuna huduma iliyopatikana' },
    clickToStart: { pt: 'Clique em "Novo Serviço" para começar.', en: 'Click "New Service" to start.', sw: 'Bonyeza "Huduma Mpya" kuanza.' },
    finish: { pt: 'Finalizar', en: 'Finish', sw: 'Kamilisha' },
    deliver: { pt: 'Entregar', en: 'Deliver', sw: 'Wasilisha' },
    deliverShort: { pt: 'ENTR', en: 'DELV', sw: 'WASI' },
    categoryExample: { pt: 'Ex: Aluguel, Internet', en: 'Ex: Rent, Internet', sw: 'Mfano: Kodi, Mtandao' },
    clientExample: { pt: 'Ex: João Silva', en: 'Ex: John Smith', sw: 'Mfano: John Juma' },

    // Finance Hub Hub
    financesHubTitle: { pt: 'Finanças & Fluxos', en: 'Finance Hub', sw: 'Kituo cha Fedha' },
    strategicManagement: { pt: 'Gestão Estratégica da Empresa', en: 'System Strategic Management', sw: 'Usimamizi wa Kimkakati' },
    flowTab: { pt: 'Fluxo de Caixa', en: 'Cash Flow', sw: 'Mtiririko wa Fedha' },
    pettyCashTab: { pt: 'Caixa Interno', en: 'Internal Cash', sw: 'Fedha ya Ndani' },
    reportsTab: { pt: 'Relatórios', en: 'Reports', sw: 'Ripoti' },
    intelligenceTab: { pt: 'Inteligência', en: 'Intelligence', sw: 'Akili' },
    flowSubtitle: { pt: 'Controle diário de entradas e saídas', en: 'Daily entry and exit control', sw: 'Udhibiti wa kuingia na kutoka kwa kila siku' },
    pettyCashSubtitle: { pt: 'Controle isolado de despesas miúdas', en: 'Isolated control of small expenses', sw: 'Udhibiti wa gharama ndogo' },
    reportsSubtitle: { pt: 'Análise de performance e períodos', en: 'Performance and period analysis', sw: 'Uchambuzi wa utendaji na vipindi' },
    intelligenceSubtitle: { pt: 'Projeções e velocidade de vendas', en: 'Projections and sales speed', sw: 'Makadirio na kasi ya mauzo' },

    // Petty Cash
    internalBalance: { pt: 'Saldo do Caixa Interno', en: 'Internal Cash Balance', sw: 'Salio la Fedha ya Ndani' },
    independentControl: { pt: 'Controlado Independente', en: 'Independently Controlled', sw: 'Inadhibitiwa Kando' },
    registerMovement: { pt: 'Registrar Movimento', en: 'Register Movement', sw: 'Andika Harakati' },
    last24h: { pt: 'Últimas 24h', en: 'Last 24h', sw: 'Saa 24 Zilizopita' },
    todayIncomes: { pt: 'Entradas de Hoje', en: "Today's Incomes", sw: 'Mapato ya Leo' },
    todayExpenses: { pt: 'Saídas de Hoje', en: "Today's Expenses", sw: 'Gharama za Leo' },
    cashHistory: { pt: 'Histórico do Caixa', en: 'Cash History', sw: 'Historia ya Fedha' },
    searchMovement: { pt: 'Buscar movimento...', en: 'Search movement...', sw: 'Tafuta harakati...' },
    depositEntry: { pt: 'Depósito / Entrada', en: 'Deposit / Entry', sw: 'Amana / Ingizo' },
    paymentExit: { pt: 'Pagamento / Saída', en: 'Payment / Exit', sw: 'Malipo / Toleo' },
    noMovementFound: { pt: 'Nenhuma movimentação encontrada', en: 'No movements found', sw: 'Hakuna harakati iliyopatikana' },
    newMovement: { pt: 'Novo Movimento', en: 'New Movement', sw: 'Harakati Mpya' },
    confirmPost: { pt: 'Confirmar Lançamento', en: 'Confirm Posting', sw: 'Thibitisha Chapisho' },
    pettyDescPlaceholder: { pt: 'Ex: Depósito para despesas de limpeza', en: 'Ex: Deposit for cleaning supplies', sw: 'Mfano: Amana kwa ajili ya usafi' },

    phoneNumberPlaceholder: { pt: 'Número / WhatsApp', en: 'Phone / WhatsApp', sw: 'Namba / WhatsApp' },
    part: { pt: 'Peça', en: 'Part', sw: 'Kipuri' },

    // UI Commons
    cancel: { pt: 'Cancelar', en: 'Cancel', sw: 'Ghairi' },
    save: { pt: 'Salvar', en: 'Save', sw: 'Hifadhi' },
    edit: { pt: 'Editar', en: 'Edit', sw: 'Hariri' },
    delete: { pt: 'Excluir', en: 'Delete', sw: 'Futa' },
    actions: { pt: 'Ações', en: 'Actions', sw: 'Vitendo' },
    dateStatus: { pt: 'Data / Status', en: 'Date / Status', sw: 'Tarehe / Hali' },
    method: { pt: 'Método', en: 'Method', sw: 'Njia' },
    online: { pt: 'Online', en: 'Online', sw: 'Kwenye Mtandao' },
    offline: { pt: 'Offline', en: 'Offline', sw: 'Nje ya Mtandao' },
    systemActive: { pt: 'SISTEMA ATIVO', en: 'SYSTEM ACTIVE', sw: 'MFUMO UNAFANYA KAZI' },
    robotGreeting: { pt: 'Olá Chefe! O sistema está operando com 100% de eficiência.', en: 'Hello Boss! The system is operating at 100% efficiency.', sw: 'Habari Boss! Mfumo unafanya kazi kwa asilimia 100.' },
    robotStatusActive: { pt: 'Status: Ativo', en: 'Status: Active', sw: 'Hali: Inatumika' },
    robotTitle: { pt: 'Auditoria Real-Time', en: 'Real-Time Audit', sw: 'Ukaguzi wa Wakati Halisi' },
    lowStockAlert: { pt: 'O produto {name} está com estoque baixo', en: 'The product {name} has low stock', sw: 'Bidhaa {name} ina akiba ndogo' },
    pendingServiceAlert: { pt: 'O serviço {name} está pendente há mais de 1 hora!', en: 'The service {name} has been pending for over 1 hour!', sw: 'Huduma {name} imesubiri kwa zaidi ya saa 1!' },
    robotModificationAlert: { pt: 'Uma modificação em {type} foi detectada agora.', en: 'A modification in {type} was just detected.', sw: 'Marekebisho katika {type} yamegunduliwa sasa.' },

    // Audit & Logs
    movementsAudit: { pt: 'Movimentações & Auditoria', en: 'Movements & Audit', sw: 'Mienendo na Ukaguzi' },
    totalTraceability: { pt: 'Rastreabilidade Total do Sistema', en: 'Total System Traceability', sw: 'Ufuatiliaji Kamili wa Mfumo' },
    stockMovementTab: { pt: 'Movimento de Estoque', en: 'Stock Movement', sw: 'Mwendo wa Hesabu' },
    systemLogsTab: { pt: 'Logs do Sistema', en: 'System Logs', sw: 'Kumbukumbu za Mfumo' },
    movementsSubtitle: { pt: 'Rastreio de entradas e saídas', en: 'Entry and exit tracking', sw: 'Ufuatiliaji wa kuingia na kutoka' },
    systemLogsSubtitle: { pt: 'Auditoria de ações de usuários', en: 'User action audit', sw: 'Ukaguzi wa hatua za watumiaji' },
    auditRecord: { pt: 'Registro de Auditoria', en: 'Audit Record', sw: 'Kumbukumbu ya Ukaguzi' },
    auditControlSubtitle: { pt: 'Controle total de entradas, saídas e responsáveis', en: 'Total control of entries, exits and responsible parties', sw: 'Udhibiti kamili wa kuingia, kutoka na wahusika' },
    searchAuditPlaceholder: { pt: 'Buscar por produto, usuário ou motivo...', en: 'Search by product, user or reason...', sw: 'Tafuta kwa bidhaa, mtumiaji au sababu...' },
    loadingHistory: { pt: 'Carregando histórico...', en: 'Loading history...', sw: 'Inapakia historia...' },
    noMovementsFound: { pt: 'Nenhuma movimentação encontrada', en: 'No movements found', sw: 'Hakuna mwendo uliopatikana' },
    date: { pt: 'Data', en: 'Date', sw: 'Tarehe' },
    op: { pt: 'Op', en: 'Op', sw: 'Op' },
    product: { pt: 'Produto', en: 'Product', sw: 'Bidhaa' },
    quant: { pt: 'Quant', en: 'Qty', sw: 'Kiasi' },
    responsible: { pt: 'Responsável', en: 'Responsible', sw: 'Mhusika' },
    entryShort: { pt: 'ENT', en: 'ENT', sw: 'ENT' },
    exitShort: { pt: 'SAÍ', en: 'EXT', sw: 'EXT' },
    noObs: { pt: 'Sem obs', en: 'No obs', sw: 'Hakuna maoni' },
    systemHistory: { pt: 'Histórico do Sistema', en: 'System History', sw: 'Historia ya Mfumo' },
    auditFullSubtitle: { pt: 'Auditoria completa de todas as atividades administrativas', en: 'Complete audit of all administrative activities', sw: 'Ukaguzi kamili wa shughuli zote za utawala' },
    searchLogs: { pt: 'Pesquisar logs...', en: 'Search logs...', sw: 'Tafuta kumbukumbu...' },
    all: { pt: 'Todos', en: 'All', sw: 'Zote' },
    accessingBlackBox: { pt: 'Acessando Caixa Preta...', en: 'Accessing Black Box...', sw: 'Inapata Sanduku Nyeusi...' },
    retrievingAudit: { pt: 'Recuperando registros de auditoria', en: 'Retrieving audit records', sw: 'Inapata rekodi za ukaguzi' },
    noEventsRegistered: { pt: 'Nenhum evento registrado', en: 'No events registered', sw: 'Hakuna tukio lililoandikwa' },
    adjustFilters: { pt: 'Tente ajustar seus filtros de pesquisa', en: 'Try adjusting your search filters', sw: 'Jaribu kurekebisha vichungi vyako vya utafutaji' },
    showingRecent: { pt: 'Exibindo {count} registros recentes', en: 'Showing {count} recent records', sw: 'Inaonyesha rekodi {count} za hivi karibuni' },
    syncNow: { pt: 'Sincronizar Agora', en: 'Sync Now', sw: 'Sawazisha Sasa' },

    // Log & Transaction Specific Patterns (Smart Translation)
    vendaRapida: { pt: 'Venda Rápida (1 un)', en: 'Quick Sale (1 unit)', sw: 'Mauzo ya Haraka (Kipengele 1)' },
    saidaEstoque: { pt: 'Saída de Estoque', en: 'Stock Exit', sw: 'Kutoka kwa Hesabu' },
    entradaEstoque: { pt: 'Entrada de Estoque', en: 'Stock Entry', sw: 'Kuingia kwa Hesabu' },
    vendaProduto: { pt: 'Venda de Produto', en: 'Product Sale', sw: 'Mauzo ya Bidhaa' },
    vendaInstantanea: { pt: 'Venda Instantânea (1-Clique)', en: 'Instant Sale (1-Click)', sw: 'Mauzo ya Papo hapo' },
    ajusteManualEntrada: { pt: 'Ajuste Manual (Entrada)', en: 'Manual Adjustment (Entry)', sw: 'Marekebisho ya Mwongozo (Ingizo)' },
    ajusteManualSaida: { pt: 'Ajuste Manual (Saída)', en: 'Manual Adjustment (Exit)', sw: 'Marekebisho ya Mwongozo (Toleo)' },
    entradaInicial: { pt: 'Entrada Inicial (Cadastro)', en: 'Initial Entry (Registration)', sw: 'Ingizo la Kwanza (Usajili)' },

    // About Page
    aboutTitle: { pt: 'Sobre o Sistema', en: 'About the System', sw: 'Kuhusu Mfumo' },
    aboutSubtitle: { pt: 'Informações e Créditos', en: 'Information and Credits', sw: 'Habari na Sifa' },
    developer: { pt: 'Desenvolvedor', en: 'Developer', sw: 'Msanidi Programu' },
    developedBy: { pt: 'Desenvolvido por', en: 'Developed by', sw: 'Imetengenezwa na' },
    redwallDescription: { pt: 'Redwall Security uma empresa especializada em segurança cibernética, RED TEAMING, Desenvolvimento de software, treinamento e gerenciamento de redes. O futuro está na informação.', en: 'Redwall Security, a company specialized in cybersecurity, RED TEAMING, software development, training, and network management. The future is in information.', sw: 'Redwall Security, kampuni inayojihusisha na usalama wa kimtandao, RED TEAMING, uundaji wa programu, mafunzo na usimamizi wa mitandao. Wakati ujao upo kwenye maelezo.' },
    specifications: { pt: 'Especificações', en: 'Specifications', sw: 'Maelezo' },
    version: { pt: 'Versão', en: 'Version', sw: 'Toleo' },
    build: { pt: 'Build', en: 'Build', sw: 'Jengo' },
    activated: { pt: 'Ativado', en: 'Activated', sw: 'Imewezeshwa' },
    supportLabel: { pt: 'Suporte', en: 'Support', sw: 'Msaada' },
    specialized: { pt: 'Especializado', en: 'Specialized', sw: 'Maalum' },
    systemNote: { pt: 'Nota do Sistema', en: 'System Note', sw: 'Maelezo ya Mfumo' },
    systemNoteDetail: { pt: 'Este sistema de gestão foi projetado exclusivamente para operações da CAAR MOBIL, integrando controle de estoque, ordens de serviço e fluxo financeiro em uma única interface inteligente.', en: 'This management system was designed exclusively for CAAR MOBIL operations, integrating inventory control, service orders and financial flow into a single intelligent interface.', sw: 'Mfumo huu wa usimamizi uliundwa mahsusi kwa ajili ya operesheni za CAAR MOBIL, ukijumuisha udhibiti wa hesabu, oda za huduma na mtiririko wa fedha katika kiolesura kimoja cha akili.' },

    // Notifications & Messages
    itemsRemoved: { pt: '{count} itens removidos com sucesso.', en: '{count} items removed successfully.', sw: 'bidhaa {count} zimeondolewa kwa mafanikio.' },
    errorRemovingItems: { pt: 'Erro ao remover itens.', en: 'Error removing items.', sw: 'Hitilafu wakati wa kuondoa bidhaa.' },
    errorFetchingProducts: { pt: 'Erro ao buscar produtos.', en: 'Error fetching products.', sw: 'Hitilafu wakati wa kutafuta bidhaa.' },
    insufficientStock: { pt: 'Estoque insuficiente para esta operação.', en: 'Insufficient stock for this operation.', sw: 'Bidhaa hazitoshi kwa operesheni hii.' },
    negativeStockError: { pt: 'Ajuste de saída resultaria em estoque negativo.', en: 'Exit adjustment would result in negative stock.', sw: 'Marekebisho yangesababisha bidhaa kuwa hasi.' },
    productUpdated: { pt: 'Produto atualizado.', en: 'Product updated.', sw: 'Bidhaa imesasishwa.' },
    productCreated: { pt: 'Produto criado.', en: 'Product created.', sw: 'Bidhaa imetengenezwa.' },
    errorSavingProduct: { pt: 'Erro ao salvar produto.', en: 'Error saving product.', sw: 'Hitilafu wakati wa kuhifadhi bidhaa.' },
    productDeleted: { pt: 'Produto excluído.', en: 'Product deleted.', sw: 'Bidhaa imefutwa.' },
    errorDeletingProduct: { pt: 'Erro ao excluir produto.', en: 'Error deleting product.', sw: 'Hitilafu wakati wa kufuta bidhaa.' },
    quickSellSuccess: { pt: 'Venda registrada e sincronizada!', en: 'Sale recorded and synced!', sw: 'Mauzo yameandikwa na kusawazishwa!' },
    quickSellError: { pt: 'Falha ao registrar venda.', en: 'Failed to record sale.', sw: 'Imeshindwa kuandika mauzo.' },

    // Status Labels
    available: { pt: 'Disponível', en: 'Available', sw: 'Inapatikana' },
    soldOut: { pt: 'Esgotado', en: 'Sold Out', sw: 'Imeisha' },

    // UI Elements
    quickAction: { pt: 'Ação Rápida', en: 'Quick Action', sw: 'Hatua ya Haraka' },
    marketplace: { pt: 'Marketplace', en: 'Marketplace', sw: 'Soko' },
    stockWarning: { pt: 'Atenção ao Estoque!', en: 'Stock Warning!', sw: 'Tahadhari ya Hesabu!' },
    lowStockMsg: { pt: 'Existem {count} produtos com nível de estoque baixo.', en: 'There are {count} products with low stock levels.', sw: 'Kuna bidhaa {count} zeníye kiwango cha chini.' },
    restockNow: { pt: 'Repor Agora', en: 'Restock Now', sw: 'Ongeza Sasa' },
    store: { pt: 'Loja', en: 'Store', sw: 'Duka' },
    servs: { pt: 'Servs', en: 'Servs', sw: 'Huduma' },
    activities: { pt: 'Atividades', en: 'Activities', sw: 'Shughuli' },
    sync: { pt: 'Sincronizar', en: 'Sync', sw: 'Sawazisha' },
    newRecord: { pt: 'Novo Registro', en: 'New Record', sw: 'Kumbukumbu Mpya' },
    manualRecord: { pt: 'Novo Registro Manual', en: 'New Manual Record', sw: 'Kumbukumbu ya Mwongozo' },
    type: { pt: 'Tipo', en: 'Type', sw: 'Aina' },
    clientNameOpt: { pt: 'Nome do Cliente (Opcional)', en: 'Client Name (Optional)', sw: 'Jina la Mteja (Hiari)' },
    confirmRecord: { pt: 'Confirmar Registro', en: 'Confirm Record', sw: 'Thibitisha Kumbukumbu' },
    availableBalance: { pt: 'Saldo Disponível', en: 'Available Balance', sw: 'Salio Linalopatikana' },
    totalFlow: { pt: 'Fluxo Total', en: 'Total Flow', sw: 'Mtiririko Jumla' },
    today: { pt: 'Hoje', en: 'Today', sw: 'Leo' },
    salesToday: { pt: 'Vendas (Hoje)', en: 'Sales (Today)', sw: 'Mauzo (Leo)' },
    items: { pt: 'Itens', en: 'Items', sw: 'Bidhaa' },
    generalInventory: { pt: 'Inventário Geral', en: 'General Inventory', sw: 'Hesabu Kuu' },
    quickSell: { pt: 'Venda Rápida', en: 'Quick Sell', sw: 'Mauzo ya Haraka' },
    selling: { pt: 'Vendendo...', en: 'Selling...', sw: 'Inauza...' },
    sell: { pt: 'Vender', en: 'Sell', sw: 'Uza' },
    costPrice: { pt: 'Preço de Custo', en: 'Cost Price', sw: 'Bei ya Gharama' },
    registerFinance: { pt: 'Registrar Financeiro', en: 'Register Financial', sw: 'Andika Fedha' },
    countAsExpense: { pt: 'Contar como Despesa', en: 'Count as Expense', sw: 'Hesabu kama Gharama' },
    countAsIncome: { pt: 'Contar como Receita', en: 'Count as Income', sw: 'Hesabu kama Mapato' },
    confirmSell: { pt: 'Confirmar Venda?', en: 'Confirm Sale?', sw: 'Thibitisha Mauzo?' },
    sureToSell: { pt: 'Tens certeza que queres vender {name} por {price}?', en: 'Are you sure you want to sell {name} for {price}?', sw: 'Je, una uhakika unataka kuuza {name} kwa {price}?' },
    yesSellNow: { pt: 'Sim, Vender Agora', en: 'Yes, Sell Now', sw: 'Ndiyo, Uza Sasa' },
    assetRegistry: { pt: 'Registro de Ativos Sincronizado', en: 'Synced Asset Registry', sw: 'Daftari la Rasilimali' },
    phone: { pt: 'Telefone', en: 'Phone', sw: 'Simu' },
    model: { pt: 'Modelo', en: 'Model', sw: 'Aina' },
    appliedParts: { pt: 'Peças Aplicadas', en: 'Applied Parts', sw: 'Vipuri Vilivyotumika' },
    addPart: { pt: 'Adicionar peça...', en: 'Add part...', sw: 'Ongeza kipuri...' },
    stockLabel: { pt: 'Estoque:', en: 'Stock:', sw: 'Hesabu:' },
    devicePhoto: { pt: 'Foto do Aparelho', en: 'Device Photo', sw: 'Picha ya Kifaa' },
    frontPhoto: { pt: 'Foto Frontal', en: 'Front Photo', sw: 'Picha ya Mbele' },
    backPhoto: { pt: 'Foto Traseira', en: 'Back Photo', sw: 'Picha ya Nyuma' },
    start: { pt: 'Iniciar', en: 'Start', sw: 'Anza' },

    // Permission System
    pendingDecisions: { pt: 'Centro de Decisões', en: 'Decision Center', sw: 'Kituo cha Uamuzi' },
    waitingYourAction: { pt: 'Aguardando sua autorização estratégica', en: 'Waiting your strategic authorization', sw: 'Inasubiri idhini yako ya kimkakati' },
    requester: { pt: 'SOLICITANTE', en: 'REQUESTER', sw: 'MWOMBAJI' },
    approve: { pt: 'Aprovar', en: 'Approve', sw: 'Kubali' },
    reject: { pt: 'Rejeitar', en: 'Reject', sw: 'Kataa' },
    newProduct: { pt: 'Novo Produto', en: 'New Product', sw: 'Bidhaa Mpya' },
    requestSent: { pt: 'Solicitação enviada com sucesso! Ao admin aguarde um instante', en: 'Request sent successfully! Admin will review shortly', sw: 'Ombi limetumwa kwa mafanikio! Msimamizi atalikagua hivi karibuni' },
    errorSendingRequest: { pt: 'Erro ao enviar solicitação', en: 'Error sending request', sw: 'Hitilafu kutuma ombi' },
    requestApproved: { pt: 'Solicitação aprovada!', en: 'Request approved!', sw: 'Ombi limekubaliwa!' },
    errorApproving: { pt: 'Erro ao aprovar solicitação', en: 'Error approving request', sw: 'Hitilafu kukubali ombi' },
    requestRejected: { pt: 'Solicitação rejeitada', en: 'Request rejected', sw: 'Ombi limekataliwa' },
    errorRejecting: { pt: 'Erro ao rejeitar solicitação', en: 'Error rejecting request', sw: 'Hitilafu kukataa ombi' },
};

interface LanguageContextType {
    language: Language;
    locale: string;
    setLanguage: (lang: Language) => void;
    t: (key: string) => string;
    smartTranslate: (text: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: ReactNode }) {
    const [language, setLanguageState] = useState<Language>(() => {
        const saved = localStorage.getItem('appLanguage');
        return (saved as Language) || 'pt';
    });

    const setLanguage = useCallback((lang: Language) => {
        setLanguageState(lang);
        localStorage.setItem('appLanguage', lang);
    }, []);

    const t = useCallback((key: string) => {
        return translations[key]?.[language] || key;
    }, [language]);

    const smartTranslate = useCallback((text: string) => {
        if (!text) return text;
        if (language === 'pt') return text;

        let translated = text;

        // Common Patterns from Server
        if (translated.includes('Saída de Estoque:')) {
            translated = translated.replace('Saída de Estoque:', t('saidaEstoque') + ':');
        }
        if (translated.includes('Entrada de Estoque:')) {
            translated = translated.replace('Entrada de Estoque:', t('entradaEstoque') + ':');
        }
        if (translated.includes('Venda de Produto')) {
            translated = translated.replace('Venda de Produto', t('vendaProduto'));
        }
        if (translated.includes('Venda Instantânea (1-Clique)')) {
            translated = translated.replace('Venda Instantânea (1-Clique)', t('vendaInstantanea'));
        }
        if (translated.includes('Ajuste Manual (Entrada)')) {
            translated = translated.replace('Ajuste Manual (Entrada)', t('ajusteManualEntrada'));
        }
        if (translated.includes('Ajuste Manual (Saída)')) {
            translated = translated.replace('Ajuste Manual (Saída)', t('ajusteManualSaida'));
        }
        if (translated.includes('Entrada Inicial (Cadastro)')) {
            translated = translated.replace('Entrada Inicial (Cadastro)', t('entradaInicial'));
        }
        if (translated.includes('O usuário') && translated.includes('editou o produto')) {
            // O usuário [Name] editou o produto [Product]...
            translated = translated
                .replace('O usuário', language === 'en' ? 'User' : 'Mtumiaji')
                .replace('editou o produto', language === 'en' ? 'edited product' : 'alihariri bidhaa');
        }
        if (translated.includes('Estoque alterado de')) {
            translated = translated
                .replace('Estoque alterado de', language === 'en' ? 'Stock changed from' : 'Hesabu imebadilishwa kutoka')
                .replace('para', language === 'en' ? 'to' : 'hadi')
                .replace('unidades', language === 'en' ? 'units' : 'bidhaa');
        }
        if (translated.includes('Registrou entrada de')) {
            translated = translated.replace('Registrou entrada de', language === 'en' ? 'Recorded entry of' : 'Ameandika ingizo la');
        }
        if (translated.includes('Registrou saída de')) {
            translated = translated.replace('Registrou saída de', language === 'en' ? 'Recorded exit of' : 'Ameandika toleo la');
        }

        return translated;
    }, [language, t]);

    const contextValue = useMemo(() => ({
        language,
        setLanguage,
        t,
        smartTranslate,
        locale: language === 'pt' ? 'pt-BR' : language === 'en' ? 'en-US' : 'sw-KE'
    }), [language, setLanguage, t, smartTranslate]);

    return (
        <LanguageContext.Provider value={contextValue}>
            {children}
        </LanguageContext.Provider>
    );
}

export function useLanguage() {
    const context = useContext(LanguageContext);
    if (context === undefined) {
        throw new Error('useLanguage must be used within a LanguageProvider');
    }
    return context;
}
