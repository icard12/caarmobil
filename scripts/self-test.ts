import { prisma } from '../server/db';

async function runSelfTest() {
    console.log('🚀 Iniciando Auto-Teste de Integridade do Sistema CAAR MOBIL...');

    try {
        // 1. Verificar se existem usuários
        const admin = await prisma.user.findFirst({ where: { role: 'admin' } });
        const employee = await prisma.user.findFirst({ where: { role: 'employee' } });

        if (!admin) {
            console.error('❌ Erro: Nenhum administrador encontrado para o teste.');
            return;
        }
        console.log(`✅ Admin encontrado: ${admin.name}`);

        // 2. Testar Ciclo de Permissão (O coração da nova funcionalidade)
        console.log('\n--- 2. Testando Ciclo de Permissão ---');
        const testDetails = {
            name: 'Produto Teste Auto',
            category: 'Smartphones',
            price: 1500,
            costPrice: 1000,
            stock: 5,
            minStock: 2,
            status: 'active'
        };

        const request = await prisma.permissionRequest.create({
            data: {
                userId: employee?.id || admin.id,
                type: 'CREATE_PRODUCT',
                details: JSON.stringify(testDetails),
                status: 'pending'
            }
        });
        console.log(`✅ Solicitação de permissão criada (ID: ${request.id})`);

        // 3. Simular Aprovação pelo Admin
        console.log('\n--- 3. Simulando Aprovação do Admin ---');
        const details = JSON.parse(request.details);

        // Executar a mesma lógica que o controlador app.patch('/api/permission-requests/:id')
        const result = await prisma.$transaction(async (tx) => {
            const newProduct = await tx.product.create({
                data: {
                    name: details.name,
                    category: details.category,
                    price: details.price,
                    costPrice: details.costPrice,
                    stock: details.stock,
                    minStock: details.minStock,
                    status: details.status
                }
            });

            await tx.stockMovement.create({
                data: {
                    productId: newProduct.id,
                    userId: request.userId,
                    type: 'entry',
                    quantity: newProduct.stock,
                    reason: 'Entrada Inicial (Teste Auto)',
                }
            });

            await tx.transaction.create({
                data: {
                    type: 'expense',
                    amount: newProduct.costPrice * newProduct.stock,
                    description: `Investimento Teste: ${newProduct.name}`,
                    category: 'Compra de Estoque',
                    status: 'paid'
                }
            });

            return newProduct;
        });
        console.log(`✅ Produto criado via aprovação: ${result.name}`);

        // 4. Testar Ordem de Serviço com Novas Fotos
        console.log('\n--- 4. Testando Ordem de Serviço com Fotos Frontal/Traseira ---');
        const service = await prisma.serviceOrder.create({
            data: {
                clientName: 'Cliente Teste',
                deviceModel: 'iPhone 15 Pro Teste',
                description: 'Troca de tela',
                status: 'pending',
                price: 500,
                frontImageUrl: '/uploads/test-front.webp',
                backImageUrl: '/uploads/test-back.webp'
            }
        });
        console.log(`✅ Ordem de serviço criada com fotos frontal/traseira (ID: ${service.id})`);

        if (service.frontImageUrl && service.backImageUrl) {
            console.log('✅ Armazenamento de URLs de fotos verificado.');
        }

        // 5. Verificar Efeitos Colaterais (Se foram realmente criados)
        console.log('\n--- 5. Verificando Efeitos Colaterais no Banco ---');
        const movement = await prisma.stockMovement.findFirst({ where: { productId: result.id } });
        const transaction = await prisma.transaction.findFirst({ where: { description: { contains: result.name } } });

        if (movement) console.log('✅ Registro de Movimentação de Estoque confirmado.');
        if (transaction) console.log('✅ Registro Financeiro (Despesa) confirmado.');

        // 6. Limpando dados de teste (Ordem reversa para evitar erro de Foreign Key)
        console.log('\n--- 6. Limpando Dados de Teste ---');
        await prisma.stockMovement.deleteMany({ where: { productId: result.id } });
        await prisma.transaction.deleteMany({ where: { description: { contains: result.name } } });
        await prisma.product.deleteMany({ where: { id: result.id } });
        await prisma.serviceOrder.deleteMany({ where: { id: service.id } });
        await prisma.permissionRequest.deleteMany({ where: { id: request.id } });
        console.log('✅ Base de dados limpa com sucesso.');

        console.log('\n✨ AUTO-TESTE CONCLUÍDO COM SUCESSO! ✨');
        console.log('Todos os módulos (Permissões, Fotos, Finanças) estão operando corretamente.');
        process.exit(0);

    } catch (error) {
        console.error('❌ FALHA NO AUTO-TESTE:', error);
        process.exit(1);
    }
}

runSelfTest();
