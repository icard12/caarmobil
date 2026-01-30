import express from 'express';
import cors from 'cors';
import { prisma } from './db.ts';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import bcrypt from 'bcryptjs';
import nodemailer from 'nodemailer';
import crypto from 'crypto';
import { createServer } from 'http';
import { Server } from 'socket.io';

import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { analyzeProducts, getAnalyticsSummary, invalidateAnalyticsCache } from './analytics.ts';

const _projectRoot = process.cwd();

const PORT = process.env.PORT || 3000;
const HOST = '0.0.0.0';

console.log(`[Startup] Initializing server on ${HOST}:${PORT}...`);

const app = express();

// --- CRITICAL: Healthcheck at the very top ---
app.get('/api/status', (req, res) => {
    res.status(200).json({
        status: 'online',
        version: '1.0.1',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development'
    });
});

const httpServer = createServer(app);
const io = new Server(httpServer, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

// Online users tracking
const onlineUsers = new Map<string, { userId: string; userName: string; socketId: string; lastSeen: Date }>();

// Socket.io connection handling
io.on('connection', (socket) => {
    console.log('Client connected to real-time updates:', socket.id);

    // User announces they are online
    socket.on('user-online', (userData: { userId: string; userName: string }) => {
        console.log(`[Presence] User ${userData.userName} is now ONLINE`);
        onlineUsers.set(userData.userId, {
            userId: userData.userId,
            userName: userData.userName,
            socketId: socket.id,
            lastSeen: new Date()
        });

        // Broadcast updated online users list to all clients
        io.emit('online-users-updated', Array.from(onlineUsers.values()).map(u => ({
            userId: u.userId,
            userName: u.userName,
            lastSeen: u.lastSeen
        })));
    });

    // User heartbeat to keep presence alive
    socket.on('user-heartbeat', (userId: string) => {
        const user = onlineUsers.get(userId);
        if (user) {
            user.lastSeen = new Date();
        }
    });

    socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id);

        // Find and remove the user by socket ID
        for (const [userId, userData] of onlineUsers.entries()) {
            if (userData.socketId === socket.id) {
                console.log(`[Presence] User ${userData.userName} is now OFFLINE`);
                onlineUsers.delete(userId);

                // Broadcast updated list
                io.emit('online-users-updated', Array.from(onlineUsers.values()).map(u => ({
                    userId: u.userId,
                    userName: u.userName,
                    lastSeen: u.lastSeen
                })));
                break;
            }
        }
    });
});

// Cleanup stale connections every 2 minutes
setInterval(() => {
    const now = new Date();
    let changed = false;

    for (const [userId, userData] of onlineUsers.entries()) {
        const timeSinceLastSeen = now.getTime() - userData.lastSeen.getTime();
        if (timeSinceLastSeen > 120000) { // 2 minutes
            console.log(`[Presence] Removing stale user: ${userData.userName}`);
            onlineUsers.delete(userId);
            changed = true;
        }
    }

    if (changed) {
        io.emit('online-users-updated', Array.from(onlineUsers.values()).map(u => ({
            userId: u.userId,
            userName: u.userName,
            lastSeen: u.lastSeen
        })));
    }
}, 120000);

// Helper for system logs
async function createLog(userId: string, action: string, category: string, details: string) {
    try {
        if (userId && userId.length > 20) { // Simple check for UUID-like length
            const log = await prisma.systemLog.create({
                data: {
                    userId,
                    action,
                    category,
                    details
                },
                include: {
                    user: {
                        select: { name: true, role: true, avatar: true }
                    }
                }
            });

            // Broadcast the log to all connected clients in real-time
            io.emit('new-log', log);
            console.log(`[Real-time] Broadcasted log: ${action} - ${details}`);
        } else {
            console.warn(`Skipping log creation: Invalid or missing userId (${userId})`);
        }
    } catch (error) {
        console.error('Error creating system log:', error);
    }
}

// Helper to check current financial balance
async function getCurrentBalance(): Promise<number> {
    const transactions = await prisma.transaction.findMany({
        where: { status: 'paid' }
    });

    const income = transactions
        .filter(t => t.type === 'income')
        .reduce((sum, t) => sum + t.amount, 0);

    const expenses = transactions
        .filter(t => t.type === 'expense')
        .reduce((sum, t) => sum + t.amount, 0);

    return income - expenses;
}

// Ensure uploads directory exists
const uploadDir = path.join(_projectRoot, 'uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// Configure Multer
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({ storage: storage });

app.use(cors());
app.use(express.json());
// Serve uploaded files statically
app.use('/uploads', express.static(uploadDir));

// Serve static files from the React app build
const distDir = path.join(_projectRoot, 'dist');
if (fs.existsSync(distDir)) {
    console.log(`[Server] Serving frontend from: ${distDir}`);
    app.use(express.static(distDir));
}

// Global Logging Middleware
app.use((req, res, next) => {
    // Skip logging for static files to avoid clutter
    if (req.url.startsWith('/api') || req.url === '/') {
        console.log(`[Request] ${req.method} ${req.url}`);
    }
    next();
});

// Logging middleware (detailed)
app.use((req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
        const duration = Date.now() - start;
        console.log(`[Finish] ${req.method} ${req.originalUrl} ${res.statusCode} ${duration}ms`);
    });
    next();
});

app.post('/api/test-ping', (req, res) => {
    console.log('[TestPing] Body:', req.body);
    res.json({ success: true, received: req.body });
});

// Redundant status for legacy path
app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

// --- Upload API ---
app.post('/api/upload', upload.single('file'), (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }
        // Return relative path. The proxy (frontend) or direct access (if served statically) will handle it.
        // We use /uploads/filename because we are serving matching path: app.use('/uploads', express.static(uploadDir));
        const fileUrl = `/uploads/${req.file.filename}`;
        res.json({ url: fileUrl });
    } catch (error) {
        console.error('Upload error:', error);
        res.status(500).json({ error: 'Error uploading file' });
    }
});

// --- Products API ---
app.get('/api/products', async (req, res) => {
    try {
        const products = await prisma.product.findMany({
            where: { isDeleted: false },
            orderBy: { created_at: 'desc' },
        });
        res.json(products);
    } catch (error) {
        console.error('Error fetching products:', error);
        res.status(500).json({ error: 'Error fetching products' });
    }
});

app.post('/api/products', async (req, res) => {
    try {
        const creatorId = req.headers['x-user-id'] as string;
        if (!creatorId) return res.status(401).json({ error: 'Usuário não identificado' });

        const user = await prisma.user.findUnique({ where: { id: creatorId } });
        if (user?.role !== 'admin') {
            return res.status(403).json({ error: 'Somente administradores podem adicionar produtos diretamente' });
        }

        const { name, price, costPrice, stock, ...rest } = req.body;
        const stockQty = parseInt(stock) || 0;
        const unitCost = parseFloat(costPrice) || 0;
        const totalInvestment = stockQty * unitCost;

        // Validation: No negative stock
        if (stockQty < 0) {
            return res.status(400).json({ error: 'O estoque inicial não pode ser negativo' });
        }

        // Validation: No negative balance (Investment check)
        if (totalInvestment > 0) {
            const currentBalance = await getCurrentBalance();
            if (currentBalance < totalInvestment) {
                return res.status(400).json({
                    error: `Saldo insuficiente para investimento inicial. Saldo: MT ${currentBalance.toFixed(2)} | Necessário: MT ${totalInvestment.toFixed(2)}`
                });
            }
        }

        const productData = {
            ...rest,
            name,
            price: parseFloat(price) || 0,
            costPrice: unitCost,
            stock: stockQty,
            status: stockQty > 0 ? 'active' : 'out_of_stock'
        };

        const [product] = await prisma.$transaction(async (tx) => {
            // 1. Create the product
            const newProduct = await tx.product.create({
                data: productData
            });

            // 2. If initial stock > 0, create movement and transaction
            if (newProduct.stock > 0) {
                const totalValue = newProduct.price * newProduct.stock;

                // Get a valid fallback userId if creatorId is missing or invalid
                let validUserId = creatorId;
                if (!validUserId || validUserId.length < 10) {
                    const fallbackUser = await tx.user.findFirst({ where: { role: 'admin' } });
                    validUserId = fallbackUser?.id || '';
                }

                // Initial Movement
                await tx.stockMovement.create({
                    data: {
                        productId: newProduct.id,
                        userId: validUserId,
                        type: 'entry',
                        quantity: newProduct.stock,
                        reason: 'Entrada Inicial (Cadastro)',
                    }
                });

                // Financial Record (Investment)
                const totalCost = newProduct.costPrice * newProduct.stock;
                if (totalCost > 0) {
                    await tx.transaction.create({
                        data: {
                            type: 'expense',
                            amount: totalCost,
                            description: `Investimento Inicial: ${newProduct.name} (${newProduct.stock} un)`,
                            category: 'Compra de Estoque',
                            status: 'paid',
                            date: new Date(),
                            dueDate: new Date()
                        }
                    });
                }
            }

            return [newProduct];
        });

        // Create log outside transaction
        if (creatorId) {
            const totalValue = product.price * product.stock;
            await createLog(
                creatorId,
                'PRODUCT_CREATE',
                'INVENTORY',
                `Cadastrou: ${product.name} | Inicial: ${product.stock} un | Valor: MT ${totalValue.toFixed(2)}`
            );
        }

        invalidateAnalyticsCache();
        io.emit('data-updated', { type: 'products', action: 'create' });
        res.json(product);
    } catch (error) {
        console.error('Error creating product:', error);
        res.status(500).json({ error: 'Erro ao cadastrar produto' });
    }
});

app.patch('/api/products/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const updaterId = req.headers['x-user-id'] as string;
        if (!updaterId) return res.status(401).json({ error: 'Usuário não identificado' });

        const user = await prisma.user.findUnique({ where: { id: updaterId } });
        if (user?.role !== 'admin') {
            return res.status(403).json({ error: 'Somente administradores podem editar produtos' });
        }

        const { name, price, costPrice, stock, minStock, ...rest } = req.body;

        const result = await prisma.$transaction(async (tx) => {
            const currentProduct = await tx.product.findUnique({ where: { id } });
            if (!currentProduct) throw new Error('Produto não encontrado');

            const newStock = stock !== undefined ? parseInt(stock) : currentProduct.stock;
            const newPrice = price !== undefined ? parseFloat(price) : currentProduct.price;
            const newCostPrice = costPrice !== undefined ? parseFloat(costPrice) : currentProduct.costPrice;
            const stockDiff = newStock - currentProduct.stock;

            if (newStock < 0) throw new Error('O estoque não pode ser negativo');

            // 1. Update the product
            const updatedProduct = await tx.product.update({
                where: { id },
                data: {
                    ...rest,
                    name: name || currentProduct.name,
                    price: newPrice,
                    costPrice: newCostPrice,
                    stock: newStock,
                    minStock: minStock !== undefined ? parseInt(minStock) : currentProduct.minStock,
                    status: newStock > 0 ? 'active' : 'out_of_stock'
                }
            });

            // 2. Create StockMovement and Transaction if stock changed
            if (stockDiff !== 0) {
                const qty = Math.abs(stockDiff);
                const totalValue = newPrice * qty;

                // Get a valid fallback userId
                let validUserId = updaterId;
                if (!validUserId || validUserId.length < 10) {
                    const fallbackUser = await tx.user.findFirst({ where: { role: 'admin' } });
                    validUserId = fallbackUser?.id || '';
                }

                await tx.stockMovement.create({
                    data: {
                        productId: id,
                        userId: validUserId,
                        type: stockDiff > 0 ? 'entry' : 'exit',
                        quantity: qty,
                        reason: stockDiff > 0 ? 'Ajuste Manual (Entrada)' : 'Ajuste Manual (Saída)',
                        date: new Date()
                    }
                });

                // Removed automatic financial transaction from PATCH. 
                // Stock adjustments should be done via /adjust-stock for financial tracking.
            }

            const user = updaterId ? await tx.user.findUnique({ where: { id: updaterId } }) : null;
            const userName = user ? user.name : 'Sistema/Admin';
            const oldStock = currentProduct.stock;

            return { product: updatedProduct, oldStock, userName };
        });

        if (updaterId) {
            await createLog(
                updaterId,
                'PRODUCT_UPDATE',
                'INVENTORY',
                `O usuário ${result.userName} editou o produto ${result.product.name}. Estoque alterado de ${result.oldStock} para ${result.product.stock} unidades.`
            );
        }

        invalidateAnalyticsCache();
        io.emit('data-updated', { type: 'products', action: 'update' });
        res.json(result);
    } catch (error) {
        console.error('Error updating product:', error);
        res.status(500).json({ error: error instanceof Error ? error.message : 'Error updating product' });
    }
});

app.post('/api/products/adjust-stock', async (req, res) => {
    try {
        const requesterId = req.headers['x-user-id'] as string;
        const { productId, userId, type, quantity, reason, isFinancial } = req.body;

        if (!requesterId) return res.status(401).json({ error: 'Usuário não identificado' });
        const requester = await prisma.user.findUnique({ where: { id: requesterId } });

        // Block manual adjustments for non-admins
        // Note: Quick Sell in frontend uses adjust-stock with type='exit'. 
        // If the user wants NO changes, we should block this too or handle it carefully.
        // For now, let's enforce admin for EVERYTHING in adjust-stock as requested.
        if (requester?.role !== 'admin') {
            return res.status(403).json({ error: 'Apenas administradores podem ajustar o estoque diretamente' });
        }

        if (!productId || !userId || !type || quantity === undefined) {
            return res.status(400).json({ error: 'Campos obrigatórios ausentes' });
        }

        const qty = parseInt(quantity);
        if (isNaN(qty) || qty <= 0) {
            return res.status(400).json({ error: 'Quantidade inválida' });
        }

        const result = await prisma.$transaction(async (tx) => {
            // 1. Get product and user info
            const product = await tx.product.findUnique({ where: { id: productId } });
            if (!product) throw new Error('Produto não encontrado');

            const user = await tx.user.findUnique({ where: { id: userId } });
            const userName = user ? user.name : 'Desconhecido';
            const oldStock = product.stock;

            // 2. Block if trying to sell (exit) more than available
            if (type === 'exit' && product.stock < qty) {
                throw new Error(`Estoque insuficiente. Disponível: ${product.stock}`);
            }

            const adjustment = type === 'entry' ? qty : -qty;
            const totalValue = product.price * qty;
            const totalCost = (product.costPrice || 0) * qty;

            // Check balance if it is a purchase (entry with financial record)
            if (type === 'entry' && isFinancial && totalCost > 0) {
                const currentBalance = await getCurrentBalance();
                if (currentBalance < totalCost) {
                    throw new Error(`Saldo insuficiente para compra de estoque. Saldo: MT ${currentBalance.toFixed(2)} | Necessário: MT ${totalCost.toFixed(2)}`);
                }
            }

            // 3. Update Product Stock
            const updatedProduct = await tx.product.update({
                where: { id: productId },
                data: {
                    stock: { increment: adjustment }
                }
            });

            // 4. Final Status Check
            const finalP = await tx.product.update({
                where: { id: productId },
                data: {
                    status: updatedProduct.stock > 0 ? 'active' : 'out_of_stock'
                }
            });

            // 5. Create Movement Record
            const m = await tx.stockMovement.create({
                data: {
                    productId,
                    userId,
                    type,
                    quantity: qty,
                    reason: reason || (type === 'exit' ? 'Venda/Saída' : 'Entrada/Ajuste'),
                }
            });

            // 6. Create Financial Transaction (Only if requested)
            // type='exit' (stock removal) is typically a Sale (Income)
            // type='entry' (stock addition) is typically a Purchase (Expense)
            if (isFinancial) {
                await tx.transaction.create({
                    data: {
                        type: type === 'exit' ? 'income' : 'expense',
                        amount: type === 'exit' ? totalValue : totalCost,
                        costAmount: type === 'exit' ? totalCost : 0,
                        description: reason || (type === 'exit' ? `Venda: ${finalP.name} (${qty} un)` : `Compra de Estoque: ${finalP.name} (${qty} un)`),
                        category: type === 'exit' ? 'Venda de Produto' : 'Compra de Estoque',
                        status: 'paid',
                        date: new Date(),
                        dueDate: new Date()
                    }
                });
            }

            return { finalP, m, oldStock, userName };
        });

        const { finalP: finalProduct, m: movement, oldStock: initialStock, userName: actorName } = result;

        // Log outside transaction
        try {
            await createLog(
                userId,
                'STOCK_ADJUST',
                'INVENTORY',
                `O usuário ${actorName} alterou ${finalProduct.name} de ${initialStock} unidades para ${finalProduct.stock} unidades. (${type === 'entry' ? '+' : '-'}${quantity})`
            );
        } catch (logError) {
            console.warn('Log failed', logError);
        }

        invalidateAnalyticsCache();
        io.emit('data-updated', { type: 'products', action: 'adjust-stock' });
        res.json({ product: finalProduct, movement });
    } catch (error) {
        console.error('adjust-stock error:', error);
        res.status(500).json({ error: error instanceof Error ? error.message : 'Erro ao ajustar estoque' });
    }
});

app.delete('/api/products', async (req, res) => {
    try {
        const { ids } = req.body; // Expecting { ids: ["id1", "id2"] }
        const deleterId = req.headers['x-user-id'] as string;

        if (!deleterId) return res.status(401).json({ error: 'Usuário não identificado' });

        const user = await prisma.user.findUnique({ where: { id: deleterId } });
        if (user?.role !== 'admin') {
            return res.status(403).json({ error: 'Somente administradores podem excluir produtos' });
        }

        if (!ids || !Array.isArray(ids)) {
            return res.status(400).json({ error: "Invalid IDs format" });
        }

        // Transaction to ensure atomicity
        await prisma.product.updateMany({
            where: { id: { in: ids } },
            data: { isDeleted: true }
        });

        invalidateAnalyticsCache();
        io.emit('data-updated', { type: 'products', action: 'delete' });
        res.json({ success: true });
    } catch (error) {
        console.error('Error deleting products:', error);
        res.status(500).json({ error: 'Error deleting products', details: error instanceof Error ? error.message : String(error) });
    }
});

// --- Permission Requests API ---
app.get('/api/permission-requests', async (req, res) => {
    try {
        const userId = req.headers['x-user-id'] as string;
        const user = await prisma.user.findUnique({ where: { id: userId } });

        // Admins see all pending requests, others see only their own
        const where = user?.role === 'admin' ? {} : { userId };

        const requests = await prisma.permissionRequest.findMany({
            where,
            include: {
                user: { select: { name: true, role: true } }
            },
            orderBy: { createdAt: 'desc' }
        });
        res.json(requests);
    } catch (error) {
        res.status(500).json({ error: 'Erro ao buscar solicitações' });
    }
});

app.post('/api/permission-requests', async (req, res) => {
    try {
        const userId = req.headers['x-user-id'] as string;
        const { type, details, targetId } = req.body;

        if (!userId || !type || !details) {
            return res.status(400).json({ error: 'Campos obrigatórios ausentes' });
        }

        // Prevent duplicate pending requests for the same target and type
        if (targetId) {
            const existingPending = await prisma.permissionRequest.findFirst({
                where: {
                    targetId,
                    type,
                    status: 'pending'
                }
            });

            if (existingPending) {
                return res.status(400).json({ error: 'Já existe uma solicitação pendente para este item. Aguarde a aprovação do administrador.' });
            }
        }

        const request = await prisma.permissionRequest.create({
            data: {
                userId,
                type,
                details: typeof details === 'string' ? details : JSON.stringify(details),
                targetId,
                status: 'pending'
            }
        });

        const user = await prisma.user.findUnique({ where: { id: userId } });

        const labels: Record<string, string> = {
            'CREATE_PRODUCT': 'Criação de Produto',
            'UPDATE_PRODUCT': 'Edição de Produto',
            'DELETE_PRODUCT': 'Exclusão de Produto',
            'CREATE_SERVICE': 'Criação de Serviço',
            'UPDATE_SERVICE': 'Edição de Serviço',
            'DELETE_SERVICE': 'Exclusão de Serviço',
            'UPDATE_SERVICE_STATUS': 'Alteração de Status de Serviço'
        };

        const actionLabel = labels[type] || type;
        const detailsObj = typeof details === 'string' ? JSON.parse(details) : details;
        const targetName = detailsObj.name || detailsObj.clientName || detailsObj.deviceModel || targetId || '---';

        await createLog(
            userId,
            'PERMISSION_REQUEST',
            'SYSTEM',
            `Nova solicitação: ${actionLabel} - Destino: ${targetName} (Solicitante: ${user?.name})`
        );

        io.emit('new-permission-request', request);
        io.emit('data-updated', { type: 'permission-requests', action: 'create' });
        res.json(request);
    } catch (error) {
        console.error('Error creating permission request:', error);
        res.status(500).json({ error: 'Erro ao criar solicitação' });
    }
});

app.patch('/api/permission-requests/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body; // 'approved' or 'rejected'
        const adminId = req.headers['x-user-id'] as string;

        const admin = await prisma.user.findUnique({ where: { id: adminId } });
        if (admin?.role !== 'admin') {
            return res.status(403).json({ error: 'Apenas administradores podem aprovar solicitações' });
        }

        const request = await prisma.permissionRequest.findUnique({ where: { id } });
        if (!request) return res.status(404).json({ error: 'Solicitação não encontrada' });

        if (request.status !== 'pending') {
            return res.status(400).json({ error: 'Esta solicitação já foi processada anteriormente.' });
        }

        if (status === 'approved') {
            const details = JSON.parse(request.details);

            // Execute the requested action using a transaction for consistency
            await prisma.$transaction(async (tx) => {
                if (request.type === 'CREATE_PRODUCT') {
                    // Extract fields safely
                    const { name, category, price, costPrice, stock, minStock, image_url } = details;
                    const newProduct = await tx.product.create({
                        data: {
                            name,
                            category,
                            price: parseFloat(price),
                            costPrice: parseFloat(costPrice || '0'),
                            stock: parseInt(stock),
                            minStock: parseInt(minStock || '5'),
                            image_url: image_url || '',
                            status: parseInt(stock) > 0 ? 'active' : 'out_of_stock'
                        }
                    });

                    // Side effect: Initial stock movement if > 0
                    if (newProduct.stock > 0) {
                        await tx.stockMovement.create({
                            data: {
                                productId: newProduct.id,
                                userId: request.userId,
                                type: 'entry',
                                quantity: newProduct.stock,
                                reason: 'Entrada Inicial (Solicitação Aprovada)',
                            }
                        });

                        // Side effect: Financial record if costPrice > 0
                        if (newProduct.costPrice > 0) {
                            await tx.transaction.create({
                                data: {
                                    type: 'expense',
                                    amount: newProduct.costPrice * newProduct.stock,
                                    description: `Investimento: ${newProduct.name} (Aprovado)`,
                                    category: 'Compra de Estoque',
                                    status: 'paid',
                                    date: new Date(),
                                    dueDate: new Date()
                                }
                            });
                        }
                    }
                } else if (request.type === 'UPDATE_PRODUCT' && request.targetId) {
                    const oldProduct = await tx.product.findUnique({ where: { id: request.targetId } });

                    if (oldProduct) {
                        // Use details directly but exclude internal keys
                        const { _reason, id, ...updateFields } = details;

                        // Parse numeric fields if they come as strings
                        if (updateFields.price) updateFields.price = parseFloat(updateFields.price);
                        if (updateFields.costPrice) updateFields.costPrice = parseFloat(updateFields.costPrice);
                        if (updateFields.stock) updateFields.stock = parseInt(updateFields.stock);
                        if (updateFields.minStock) updateFields.minStock = parseInt(updateFields.minStock);

                        // Ensure status updates if stock changes to 0 or positive
                        if (updateFields.stock !== undefined) {
                            updateFields.status = updateFields.stock > 0 ? 'active' : 'out_of_stock';
                        }

                        const updatedProduct = await tx.product.update({
                            where: { id: request.targetId },
                            data: updateFields
                        });

                        const stockDiff = (updatedProduct.stock || 0) - (oldProduct.stock || 0);
                        if (stockDiff !== 0) {
                            const qty = Math.abs(stockDiff);
                            const type = stockDiff > 0 ? 'entry' : 'exit';
                            const reason = details._reason || (type === 'entry' ? 'Ajuste Aprovado (+)' : 'Ajuste Aprovado (-)');

                            await tx.stockMovement.create({
                                data: {
                                    productId: request.targetId,
                                    userId: request.userId,
                                    type,
                                    quantity: qty,
                                    reason,
                                    date: new Date()
                                }
                            });

                            // Side effect: Financial record for sales (exit) or purchases (entry if reason suggests)
                            const isQuickSell = details._reason?.toLowerCase().includes('venda') || details._reason?.toLowerCase().includes('sell');
                            if (type === 'exit' || isQuickSell) {
                                await tx.transaction.create({
                                    data: {
                                        type: 'income',
                                        amount: (updatedProduct.price || 0) * qty,
                                        costAmount: (updatedProduct.costPrice || 0) * qty,
                                        description: `Venda Aprovada: ${updatedProduct.name} (${qty} un)`,
                                        category: 'Venda de Produto',
                                        status: 'paid',
                                        date: new Date(),
                                        dueDate: new Date()
                                    }
                                });
                            } else if (type === 'entry') {
                                // For entries we might want to record investment
                                await tx.transaction.create({
                                    data: {
                                        type: 'expense',
                                        amount: (updatedProduct.costPrice || 0) * qty,
                                        description: `Compra de Estoque Aprovada: ${updatedProduct.name} (${qty} un)`,
                                        category: 'Compra de Estoque',
                                        status: 'paid',
                                        date: new Date(),
                                        dueDate: new Date()
                                    }
                                });
                            }
                        }
                    }
                } else if (request.type === 'DELETE_PRODUCT' && request.targetId) {
                    await tx.product.update({
                        where: { id: request.targetId },
                        data: { isDeleted: true }
                    });
                } else if (request.type === 'CREATE_SERVICE') {
                    // Use details directly as sanitizedDetails filters out service fields
                    const { parts, price, clientName, deviceModel, description, ...serviceData } = details;

                    // 1. Calculate parts total cost
                    let totalPartsCost = 0;
                    const servicePartsData = [];

                    if (parts && Array.isArray(parts)) {
                        for (const part of parts) {
                            const product = await tx.product.findUnique({ where: { id: part.productId } });
                            if (!product) throw new Error(`Produto não encontrado: ${part.productId}`);
                            if (product.stock < part.quantity) throw new Error(`Estoque insuficiente para: ${product.name}`);

                            // Deduct stock
                            await tx.product.update({
                                where: { id: part.productId },
                                data: { stock: { decrement: part.quantity } }
                            });

                            // Create stock movement
                            await tx.stockMovement.create({
                                data: {
                                    productId: part.productId,
                                    userId: request.userId,
                                    type: 'exit',
                                    quantity: part.quantity,
                                    reason: `Uso em Serviço: ${deviceModel} (${clientName})`
                                }
                            });

                            totalPartsCost += (product.costPrice * part.quantity);
                            servicePartsData.push({
                                productId: part.productId,
                                quantity: part.quantity,
                                unitPrice: product.price,
                                unitCost: product.costPrice
                            });
                        }
                    }

                    // 2. Create Service Order
                    const serviceOrder = await tx.serviceOrder.create({
                        data: {
                            clientName,
                            deviceModel,
                            description,
                            price: parseFloat(price),
                            cost: totalPartsCost,
                            status: 'pending',
                            imageUrl: details.imageUrl,
                            frontImageUrl: details.frontImageUrl,
                            backImageUrl: details.backImageUrl,
                            parts: {
                                create: servicePartsData
                            }
                        }
                    });

                    // 3. Create automatic financial transaction
                    if (serviceOrder.price > 0) {
                        await tx.transaction.create({
                            data: {
                                type: 'income',
                                amount: serviceOrder.price,
                                costAmount: totalPartsCost,
                                description: `Serviço [ID:${serviceOrder.id}]: ${serviceOrder.deviceModel} - ${serviceOrder.clientName}`,
                                clientName: serviceOrder.clientName,
                                category: 'Serviço de Reparo',
                                status: 'pending',
                                date: new Date(),
                                dueDate: new Date()
                            }
                        });
                    }
                } else if (request.type === 'UPDATE_SERVICE' && request.targetId) {
                    const { clientName, deviceModel, description, price, imageUrl, frontImageUrl, backImageUrl, status } = details;

                    const oldService = await tx.serviceOrder.findUnique({ where: { id: request.targetId } });

                    if (oldService) {
                        const updatedService = await tx.serviceOrder.update({
                            where: { id: request.targetId },
                            data: {
                                clientName: clientName || oldService.clientName,
                                deviceModel: deviceModel || oldService.deviceModel,
                                description: description || oldService.description,
                                price: price !== undefined ? parseFloat(price) : oldService.price,
                                imageUrl: imageUrl || oldService.imageUrl,
                                frontImageUrl: frontImageUrl || oldService.frontImageUrl,
                                backImageUrl: backImageUrl || oldService.backImageUrl,
                                status: status || oldService.status,
                                delivered_at: (status === 'delivered' && oldService.status !== 'delivered') ? new Date() : oldService.delivered_at
                            }
                        });

                        // Sync Financial Transaction
                        const oldDescriptionBase = `${oldService.deviceModel} - ${oldService.clientName}`;
                        const transUpdateData: any = {};

                        // Update description/amount/client if changed
                        if (deviceModel || clientName || price !== undefined) {
                            const newModel = deviceModel || updatedService.deviceModel;
                            const newClient = clientName || updatedService.clientName;
                            transUpdateData.description = `Serviço [ID:${updatedService.id}]: ${newModel} - ${newClient}`;
                            transUpdateData.clientName = newClient;
                            if (price !== undefined) transUpdateData.amount = parseFloat(price);
                        }

                        // Update status if delivered
                        if (status === 'delivered') {
                            transUpdateData.status = 'paid';
                            transUpdateData.date = new Date();
                        }

                        if (Object.keys(transUpdateData).length > 0) {
                            const targetTransaction = await tx.transaction.findFirst({
                                where: {
                                    description: { contains: `ID:${updatedService.id}` },
                                    category: 'Serviço de Reparo',
                                    status: 'pending'
                                }
                            });

                            if (targetTransaction) {
                                await tx.transaction.update({
                                    where: { id: targetTransaction.id },
                                    data: transUpdateData
                                });
                            }
                        }
                    }
                } else if (request.type === 'DELETE_SERVICE' && request.targetId) {
                    await tx.servicePart.deleteMany({
                        where: { serviceOrderId: request.targetId }
                    });
                    await tx.serviceOrder.delete({
                        where: { id: request.targetId }
                    });
                } else if (request.type === 'UPDATE_SERVICE_STATUS' && request.targetId) {
                    const { status } = details;
                    const service = await tx.serviceOrder.update({
                        where: { id: request.targetId },
                        data: {
                            status,
                            delivered_at: status === 'delivered' ? new Date() : undefined
                        }
                    });

                    if (status === 'delivered') {
                        const targetTransaction = await tx.transaction.findFirst({
                            where: {
                                description: { contains: `ID:${request.targetId}` },
                                category: 'Serviço de Reparo',
                                status: 'pending'
                            }
                        });

                        if (targetTransaction) {
                            await tx.transaction.update({
                                where: { id: targetTransaction.id },
                                data: {
                                    status: 'paid',
                                    date: new Date()
                                }
                            });
                        }
                    }
                }
            });

            const labels: Record<string, string> = {
                'CREATE_PRODUCT': 'Criação de Produto',
                'UPDATE_PRODUCT': 'Edição de Produto',
                'DELETE_PRODUCT': 'Exclusão de Produto',
                'CREATE_SERVICE': 'Criação de Serviço',
                'UPDATE_SERVICE': 'Edição de Serviço',
                'DELETE_SERVICE': 'Exclusão de Serviço',
                'UPDATE_SERVICE_STATUS': 'Alteração de Status de Serviço'
            };

            const actionLabel = labels[request.type] || request.type;
            const targetName = details.name || details.clientName || details.deviceModel || request.targetId || '---';
            const requester = await prisma.user.findUnique({ where: { id: request.userId } });

            await createLog(
                adminId,
                'PERMISSION_APPROVED',
                'SYSTEM',
                `APROVOU: ${actionLabel} - Destino: ${targetName} (Solicitante: ${requester?.name})`
            );
        } else {
            const labels: Record<string, string> = {
                'CREATE_PRODUCT': 'Criação de Produto',
                'UPDATE_PRODUCT': 'Edição de Produto',
                'DELETE_PRODUCT': 'Exclusão de Produto',
                'CREATE_SERVICE': 'Criação de Serviço',
                'UPDATE_SERVICE': 'Edição de Serviço',
                'DELETE_SERVICE': 'Exclusão de Serviço',
                'UPDATE_SERVICE_STATUS': 'Alteração de Status de Serviço'
            };

            const actionLabel = labels[request.type] || request.type;
            const targetName = details.name || details.clientName || details.deviceModel || request.targetId || '---';
            const requester = await prisma.user.findUnique({ where: { id: request.userId } });

            await createLog(
                adminId,
                'PERMISSION_REJECTED',
                'SYSTEM',
                `REJEITOU: ${actionLabel} - Destino: ${targetName} (Solicitante: ${requester?.name})`
            );
        }

        const updatedRequest = await prisma.permissionRequest.update({
            where: { id },
            data: { status },
            include: { user: { select: { name: true, role: true } } }
        });

        invalidateAnalyticsCache();
        io.emit('permission-request-updated', updatedRequest);
        io.emit('data-updated', { type: 'permission-requests', action: 'update' });
        io.emit('data-updated', { type: 'products', action: 'update' });
        io.emit('data-updated', { type: 'services', action: 'update' });
        io.emit('data-updated', { type: 'transactions', action: 'update' });

        res.json(updatedRequest);
    } catch (error) {
        console.error('Error updating permission request:', error);
        res.status(500).json({ error: 'Erro ao processar solicitação' });
    }
});

// --- Transactions API ---
app.get('/api/transactions', async (req, res) => {
    try {
        const transactions = await prisma.transaction.findMany({
            orderBy: { date: 'desc' },
            take: 50
        });
        res.json(transactions);
    } catch (error) {
        res.status(500).json({ error: 'Error fetching transactions' });
    }
});

app.post('/api/transactions', async (req, res) => {
    try {
        const { amount, date, dueDate, ...rest } = req.body;
        const transactionAmount = parseFloat(amount);

        if (rest.type === 'expense') {
            const currentBalance = await getCurrentBalance();
            if (currentBalance < transactionAmount) {
                return res.status(400).json({
                    error: `Saldo insuficiente para esta despesa. Saldo: MT ${currentBalance.toFixed(2)} | Valor: MT ${transactionAmount.toFixed(2)}`
                });
            }
        }

        const transaction = await prisma.transaction.create({
            data: {
                ...rest,
                amount: transactionAmount,
                clientName: rest.clientName || null,
                date: date ? new Date(date) : new Date(),
                dueDate: dueDate ? new Date(dueDate) : new Date()
            },
        });

        const actorId = req.headers['x-user-id'] as string;
        if (actorId) {
            await createLog(actorId, 'FINANCE_CREATE', 'FINANCE', `Registrou ${transaction.type === 'income' ? 'entrada' : 'saída'} de MT ${transaction.amount.toFixed(2)}: ${transaction.description}`);
        }

        io.emit('data-updated', { type: 'transactions', action: 'create' });
        res.json(transaction);
    } catch (error) {
        console.error('Error creating transaction:', error);
        res.status(500).json({ error: 'Error creating transaction' });
    }
});

app.patch('/api/transactions/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const requesterId = req.headers['x-user-id'] as string;
        const requester = await prisma.user.findUnique({ where: { id: requesterId || '' } });

        if (requester?.role !== 'admin') {
            return res.status(403).json({ error: 'Acesso negado: Somente administradores podem editar transações financeiras' });
        }

        const { amount, date, dueDate, description, category, type, status, paymentMethod, clientName } = req.body;

        const oldTransaction = await prisma.transaction.findUnique({ where: { id } });
        if (!oldTransaction) return res.status(404).json({ error: 'Transação não encontrada' });

        const transactionAmount = amount !== undefined ? parseFloat(amount) : undefined;

        // Validation for expenses outpacing balance is complex on update, skipping strict check for admin edits to allow corrections

        const updatedTransaction = await prisma.transaction.update({
            where: { id },
            data: {
                amount: transactionAmount,
                description,
                category,
                type,
                status,
                paymentMethod,
                clientName,
                date: date ? new Date(date) : undefined,
                dueDate: dueDate ? new Date(dueDate) : undefined
            }
        });

        if (requesterId) {
            let changes = [];
            if (oldTransaction.amount !== updatedTransaction.amount) changes.push(`Valor: ${oldTransaction.amount} -> ${updatedTransaction.amount}`);
            if (oldTransaction.description !== updatedTransaction.description) changes.push(`Desc: ${updatedTransaction.description}`);
            if (oldTransaction.status !== updatedTransaction.status) changes.push(`Status: ${oldTransaction.status} -> ${updatedTransaction.status}`);

            await createLog(
                requesterId,
                'FINANCE_UPDATE',
                'FINANCE',
                `Editou transação: ${changes.join(' | ') || 'Detalhes gerais'}`
            );
        }

        io.emit('data-updated', { type: 'transactions', action: 'update' });
        res.json(updatedTransaction);
    } catch (error) {
        console.error('Error updating transaction:', error);
        res.status(500).json({ error: 'Erro ao atualizar transação' });
    }
});

app.delete('/api/transactions/:id', async (req, res) => {
    try {
        const requesterId = req.headers['x-user-id'] as string;
        const requester = await prisma.user.findUnique({ where: { id: requesterId || '' } });
        if (requester?.role !== 'admin') {
            return res.status(403).json({ error: 'Acesso negado: Somente administradores podem remover transações financeiras' });
        }

        const { id } = req.params;
        const transaction = await prisma.transaction.findUnique({ where: { id } });

        if (!transaction) {
            return res.status(404).json({ error: 'Transação não encontrada' });
        }

        await prisma.transaction.delete({
            where: { id }
        });

        const deleterId = req.headers['x-user-id'] as string;
        if (deleterId) {
            await createLog(
                deleterId,
                'FINANCE_DELETE',
                'FINANCE',
                `Removeu transação: ${transaction.description} (MT ${transaction.amount.toFixed(2)})`
            );
        }

        io.emit('data-updated', { type: 'transactions', action: 'delete' });
        res.json({ success: true });
    } catch (error) {
        console.error('Error deleting transaction:', error);
        res.status(500).json({ error: 'Erro ao deletar transação' });
    }
});

// --- Petty Cash API (Isolated Internal Cash) ---
app.get('/api/petty-cash', async (req, res) => {
    try {
        const transactions = await prisma.pettyCash.findMany({
            orderBy: { date: 'desc' }
        });
        res.json(transactions);
    } catch (error) {
        res.status(500).json({ error: 'Erro ao buscar caixa interno' });
    }
});

app.post('/api/petty-cash', async (req, res) => {
    try {
        const requesterId = req.headers['x-user-id'] as string;
        const requester = await prisma.user.findUnique({ where: { id: requesterId || '' } });
        if (requester?.role !== 'admin') {
            return res.status(403).json({ error: 'Acesso negado: Somente administradores podem operar o caixa interno' });
        }

        const { type, amount, description } = req.body;
        const transaction = await prisma.pettyCash.create({
            data: {
                type,
                amount: parseFloat(amount),
                description,
                date: new Date()
            }
        });

        const actorId = req.headers['x-user-id'] as string;
        if (actorId) {
            await createLog(actorId, 'PETTY_CASH_CREATE', 'FINANCE', `Registrou ${type === 'deposit' ? 'depósito' : 'despesa'} no caixa interno: MT ${transaction.amount.toFixed(2)} - ${transaction.description}`);
        }

        io.emit('data-updated', { type: 'petty-cash', action: 'create' });
        res.json(transaction);
    } catch (error) {
        res.status(500).json({ error: 'Erro ao registrar movimentação no caixa interno' });
    }
});

// --- Stock Movements API ---
app.get('/api/stock-movements', async (req, res) => {
    console.log('Fetching all stock movements...');
    try {
        const movements = await prisma.stockMovement.findMany({
            include: {
                product: {
                    select: { name: true, category: true }
                },
                user: {
                    select: { name: true }
                }
            },
            orderBy: { date: 'desc' }
        });
        console.log(`Successfully fetched ${movements.length} movements`);
        res.json(movements);
    } catch (error) {
        console.error('Error fetching stock movements:', error);
        res.status(500).json({ error: 'Error fetching stock movements' });
    }
});

// --- Services API ---
app.get('/api/services', async (req, res) => {
    console.log('GET /api/services - Fetching orders');
    try {
        const services = await prisma.serviceOrder.findMany({
            include: {
                parts: {
                    include: {
                        product: {
                            select: { name: true }
                        }
                    }
                }
            },
            orderBy: { created_at: 'desc' }
        });
        console.log(`Found ${services.length} services`);

        // Map backend field names to match frontend expectation
        const mappedServices = services.map(s => ({
            ...s,
            id: s.id,
            clientName: s.clientName,
            clientPhone: s.clientPhone,
            deviceModel: s.deviceModel,
            description: s.description,
            status: s.status,
            price: s.price,
            imageUrl: s.imageUrl,
            frontImageUrl: s.frontImageUrl,
            backImageUrl: s.backImageUrl,
            createdAt: s.created_at.toISOString(),
            deliveredAt: s.delivered_at ? s.delivered_at.toISOString() : null
        }));

        res.json(mappedServices);
    } catch (error) {
        console.error('CRITICAL ERROR fetching services:', error);
        res.status(500).json({
            error: 'Erro ao buscar ordens de serviço',
            details: error instanceof Error ? error.message : String(error)
        });
    }
});

app.post('/api/services', async (req, res) => {
    try {
        const { clientName, clientPhone, deviceModel, description, status, price, imageUrl, frontImageUrl, backImageUrl, parts } = req.body;
        const creatorId = req.headers['x-user-id'] as string;

        const result = await prisma.$transaction(async (tx) => {
            // 1. Calculate parts total cost
            let totalPartsCost = 0;
            const servicePartsData = [];

            if (parts && Array.isArray(parts)) {
                for (const part of parts) {
                    const product = await tx.product.findUnique({ where: { id: part.productId } });
                    if (!product) throw new Error(`Produto não encontrado: ${part.productId}`);
                    if (product.stock < part.quantity) throw new Error(`Estoque insuficiente para: ${product.name}`);

                    // Deduct stock
                    await tx.product.update({
                        where: { id: part.productId },
                        data: { stock: { decrement: part.quantity } }
                    });

                    // Update status if out of stock
                    const updatedProduct = await tx.product.findUnique({ where: { id: part.productId } });
                    if (updatedProduct && updatedProduct.stock <= 0) {
                        await tx.product.update({
                            where: { id: part.productId },
                            data: { status: 'out_of_stock' }
                        });
                    }

                    // Create stock movement
                    await tx.stockMovement.create({
                        data: {
                            productId: part.productId,
                            userId: creatorId || (await tx.user.findFirst({ where: { role: 'admin' } }))?.id || '',
                            type: 'exit',
                            quantity: part.quantity,
                            reason: `Uso em Serviço: ${deviceModel} (${clientName})`
                        }
                    });

                    totalPartsCost += (product.costPrice * part.quantity);
                    servicePartsData.push({
                        productId: part.productId,
                        quantity: part.quantity,
                        unitPrice: product.price,
                        unitCost: product.costPrice
                    });
                }
            }

            // 2. Create Service Order
            const serviceOrder = await tx.serviceOrder.create({
                data: {
                    clientName,
                    clientPhone,
                    deviceModel,
                    description,
                    status,
                    price: parseFloat(price),
                    imageUrl,
                    frontImageUrl,
                    backImageUrl,
                    cost: totalPartsCost,
                    parts: {
                        create: servicePartsData
                    }
                },
                include: {
                    parts: true
                }
            });

            // 3. Create automatic financial transaction
            if (serviceOrder.price > 0) {
                await tx.transaction.create({
                    data: {
                        type: 'income',
                        amount: serviceOrder.price,
                        costAmount: totalPartsCost,
                        description: `Serviço [ID:${serviceOrder.id}]: ${serviceOrder.deviceModel} - ${serviceOrder.clientName}`,
                        clientName: serviceOrder.clientName,
                        category: 'Serviço de Reparo',
                        status: status === 'delivered' ? 'paid' : 'pending',
                        date: new Date(),
                        dueDate: new Date()
                    }
                });
            }

            return serviceOrder;
        });

        // Create log
        if (creatorId) {
            await createLog(
                creatorId,
                'SERVICE_CREATE',
                'SERVICES',
                `Criou serviço: ${result.deviceModel} para ${result.clientName} | Valor: MT ${result.price.toFixed(2)}`
            );
        }

        invalidateAnalyticsCache();
        io.emit('data-updated', { type: 'services', action: 'create' });
        io.emit('data-updated', { type: 'products', action: 'update' });
        res.json({ ...result, createdAt: result.created_at.toISOString() });
    } catch (error) {
        console.error('Error creating service:', error);
        res.status(500).json({ error: error instanceof Error ? error.message : 'Erro ao criar ordem de serviço' });
    }
});

// Update service order
app.patch('/api/services/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { status, clientName, clientPhone, deviceModel, description, price, imageUrl, frontImageUrl, backImageUrl } = req.body;
        const updaterId = req.headers['x-user-id'] as string;

        const result = await prisma.$transaction(async (tx) => {
            // 1. Fetch current service state to identify related transactions
            const oldService = await tx.serviceOrder.findUnique({ where: { id } });
            if (!oldService) throw new Error('Serviço não encontrado');

            // 2. Update service
            const updatedService = await tx.serviceOrder.update({
                where: { id },
                data: {
                    status,
                    clientName,
                    clientPhone,
                    deviceModel,
                    description,
                    price: price !== undefined ? parseFloat(price) : undefined,
                    imageUrl,
                    frontImageUrl,
                    backImageUrl,
                    delivered_at: status === 'delivered' ? new Date() : undefined
                }
            });

            // 3. Sync Financial Transaction
            // We search for the transaction using the OLD details to ensure we find it even if details changed
            // We search for both authorized and regular variants
            const oldDescriptionBase = `${oldService.deviceModel} - ${oldService.clientName}`;

            const transUpdateData: any = {};

            // If details changed, update transaction description and amount
            if (deviceModel || clientName || price !== undefined) {
                const newModel = deviceModel || updatedService.deviceModel;
                const newClient = clientName || updatedService.clientName;
                transUpdateData.description = `Serviço: ${newModel} - ${newClient}`;
                transUpdateData.clientName = newClient;
                if (price !== undefined) {
                    transUpdateData.amount = parseFloat(price);
                }
            }

            // If status changed to delivered, mark as paid
            if (status === 'delivered') {
                transUpdateData.status = 'paid';
                transUpdateData.date = new Date(); // Update date to now when paid
            }

            if (Object.keys(transUpdateData).length > 0) {
                // Find and update a SINGLE pending transaction to prevent bulk updates
                const targetTransaction = await tx.transaction.findFirst({
                    where: {
                        description: { contains: oldDescriptionBase },
                        category: 'Serviço de Reparo',
                        status: 'pending'
                    }
                });

                if (targetTransaction) {
                    await tx.transaction.update({
                        where: { id: targetTransaction.id },
                        data: transUpdateData
                    });
                }
            }

            return { service: updatedService, oldService };
        });

        const { service, oldService } = result;

        // Broadcast updates
        if (status === 'delivered') {
            io.emit('data-updated', { type: 'transactions', action: 'update' });
        }
        io.emit('data-updated', { type: 'services', action: 'update' });

        // Create log for status change
        if (updaterId) {
            let logDetails = `Atualizou serviço ${service.deviceModel}`;
            if (status && status !== oldService.status) {
                logDetails += ` | Status: ${oldService.status} -> ${status}`;
                if (status === 'delivered') logDetails += ` (Receita Contabilizada: MT ${service.price})`;
            }
            if (price && parseFloat(price) !== oldService.price) {
                logDetails += ` | Preço: ${oldService.price} -> ${price}`;
            }

            await createLog(
                updaterId,
                'SERVICE_UPDATE',
                'SERVICES',
                logDetails
            );
        }

        res.json({ ...service, createdAt: service.created_at.toISOString() });
    } catch (error) {
        console.error('Error updating service:', error);
        res.status(500).json({ error: 'Erro ao atualizar serviço' });
    }
});

// Delete service order (Admin only)
app.delete('/api/services/:id', async (req, res) => {
    try {
        const requesterId = req.headers['x-user-id'] as string;
        const requester = await prisma.user.findUnique({ where: { id: requesterId || '' } });

        if (requester?.role !== 'admin') {
            return res.status(403).json({ error: 'Acesso negado: Somente administradores podem excluir serviços' });
        }

        const { id } = req.params;
        const service = await prisma.serviceOrder.findUnique({
            where: { id },
            include: { parts: true }
        });

        if (!service) {
            return res.status(404).json({ error: 'Serviço não encontrado' });
        }

        // We use a transaction because we need to perform multiple deletes
        await prisma.$transaction(async (tx) => {
            // Delete related parts first
            await tx.servicePart.deleteMany({
                where: { serviceOrderId: id }
            });

            // Delete the service order
            await tx.serviceOrder.delete({
                where: { id }
            });
        });

        if (requesterId) {
            await createLog(
                requesterId,
                'SERVICE_DELETE',
                'SERVICES',
                `Excluiu serviço: ${service.deviceModel} para ${service.clientName}`
            );
        }

        invalidateAnalyticsCache();
        io.emit('data-updated', { type: 'services', action: 'delete' });
        res.json({ success: true });
    } catch (error) {
        console.error('Error deleting service:', error);
        res.status(500).json({ error: 'Erro ao excluir serviço' });
    }
});

// --- Statistics API ---
// Test endpoint
app.get('/api/test', (req, res) => {
    res.json({ message: 'Test endpoint works!' });
});

console.log('Registering /api/stats endpoint...');
app.get('/api/stats', async (req, res) => {
    try {
        const [products, transactions, services] = await Promise.all([
            prisma.product.findMany({ where: { isDeleted: false } }),
            prisma.transaction.findMany(), // Fetch all to include pending/overdue in metrics
            prisma.serviceOrder.findMany()
        ]);

        const inventoryValue = products.reduce((sum, p) => sum + (p.price * p.stock), 0);
        const inventoryCostValue = products.reduce((sum, p) => sum + (p.costPrice * p.stock), 0);

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // All transactions for today (including pending/overdue to show "activity")
        const todayTransactions = transactions.filter(t => new Date(t.date) >= today);

        // Cumulative Metrics (Usually focus on REALized flow)
        const paidTransactions = transactions.filter(t => t.status === 'paid');

        const serviceRevenue = paidTransactions
            .filter(t => t.category === 'Serviço de Reparo')
            .reduce((sum, t) => sum + t.amount, 0);

        const productRevenue = paidTransactions
            .filter(t => t.category === 'Venda de Produto')
            .reduce((sum, t) => sum + t.amount, 0);

        const todayServiceRevenue = todayTransactions
            .filter(t => t.type === 'income' && t.category === 'Serviço de Reparo' && t.status === 'paid')
            .reduce((sum, t) => sum + t.amount, 0);

        const todayProductRevenue = todayTransactions
            .filter(t => t.type === 'income' && t.category === 'Venda de Produto' && t.status === 'paid')
            .reduce((sum, t) => sum + t.amount, 0);

        const otherIncome = transactions
            .filter(t => t.type === 'income' && !['Serviço de Reparo', 'Venda de Produto'].includes(t.category) && t.status === 'paid')
            .reduce((sum, t) => sum + t.amount, 0);

        const totalIncome = paidTransactions
            .filter(t => t.type === 'income')
            .reduce((sum, t) => sum + t.amount, 0);

        const totalExpenses = paidTransactions
            .filter(t => t.type === 'expense' && t.category !== 'Compra de Estoque')
            .reduce((sum, t) => sum + t.amount, 0);

        const totalInvestment = paidTransactions
            .filter(t => t.type === 'expense' && t.category === 'Compra de Estoque')
            .reduce((sum, t) => sum + t.amount, 0);

        const totalCOGS = paidTransactions
            .filter(t => t.type === 'income')
            .reduce((sum, t) => sum + (t.costAmount || 0), 0);

        const pendingServices = services.filter(s => ['pending', 'in_progress'].includes(s.status)).length;
        const completedServices = services.filter(s => s.status === 'delivered').length;

        const todayIncome = todayTransactions
            .filter(t => t.type === 'income' && t.status === 'paid')
            .reduce((sum, t) => sum + t.amount, 0);

        const todayExpenses = todayTransactions
            .filter(t => t.type === 'expense')
            .reduce((sum, t) => sum + t.amount, 0);

        const todayCOGS = todayTransactions
            .filter(t => t.type === 'income')
            .reduce((sum, t) => sum + (t.costAmount || 0), 0);

        console.log(`[Stats] Today: ${todayTransactions.length} trans, Income: ${todayIncome}, ProdRev: ${todayProductRevenue}, ServRev: ${todayServiceRevenue}`);

        res.json({
            inventoryValue,
            inventoryCostValue,
            totalIncome,
            productRevenue,
            serviceRevenue,
            otherIncome,
            totalExpenses,
            totalInvestment,
            totalCOGS,
            totalBalance: totalIncome - (totalExpenses + totalInvestment),
            netProfit: totalIncome - totalExpenses - totalCOGS,
            todayServiceRevenue,
            todayProductRevenue,
            todayIncome,
            todayNetProfit: todayIncome - todayExpenses - todayCOGS,
            activeProducts: products.filter(p => p.stock > 0).length,
            totalProducts: products.length,
            pendingServices,
            completedServices,
            totalServices: services.length,
            lowStockProducts: products.filter(p => p.stock <= p.minStock).length
        });
    } catch (error) {
        console.error('Stats fetch error:', error);
        res.status(500).json({ error: 'Erro ao buscar estatísticas' });
    }
});
console.log('/api/stats endpoint registered successfully');

// --- Analytics API ---
app.get('/api/analytics/products', async (req, res) => {
    try {
        const analytics = await analyzeProducts();
        res.json(analytics);
    } catch (error) {
        console.error('Error fetching product analytics:', error);
        res.status(500).json({ error: 'Erro ao buscar análises de produtos' });
    }
});

app.get('/api/analytics/summary', async (req, res) => {
    try {
        const summary = await getAnalyticsSummary();
        res.json(summary);
    } catch (error) {
        console.error('Error fetching analytics summary:', error);
        res.status(500).json({ error: 'Erro ao buscar resumo de análises' });
    }
});

// --- Users API ---
app.post('/api/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await prisma.user.findUnique({
            where: { email }
        });

        if (!user || user.isDeleted || !await bcrypt.compare(password, user.password)) {
            return res.status(401).json({ error: 'Credenciais inválidas' });
        }

        if (!user.isActive) {
            return res.status(401).json({ error: 'Sua conta está desativada. Contacte o administrador.' });
        }

        const { password: _, ...userWithoutPassword } = user;

        await createLog(user.id, 'LOGIN', 'AUTH', `Usuário ${user.name} acessou o sistema`);

        res.json(userWithoutPassword);
    } catch (error) {
        res.status(500).json({ error: 'Erro ao fazer login' });
    }
});

app.get('/api/logs', async (req, res) => {
    try {
        const logs = await prisma.systemLog.findMany({
            include: {
                user: {
                    select: { name: true, role: true }
                }
            },
            orderBy: { createdAt: 'desc' },
            take: 100
        });
        res.json(logs);
    } catch (error) {
        res.status(500).json({ error: 'Erro ao buscar logs' });
    }
});

app.get('/api/users', async (req, res) => {
    try {
        const requesterId = req.headers['x-user-id'] as string;
        if (!requesterId) return res.status(401).json({ error: 'Não autorizado' });

        const requester = await prisma.user.findUnique({ where: { id: requesterId } });
        if (!requester || requester.role !== 'admin') {
            return res.status(403).json({ error: 'Acesso negado' });
        }

        const users = await prisma.user.findMany({
            where: { isDeleted: false },
            orderBy: { createdAt: 'desc' },
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                avatar: true,
                createdAt: true
            }
        });
        res.json(users);
    } catch (error) {
        res.status(500).json({ error: 'Erro ao buscar usuários' });
    }
});

app.post('/api/users', async (req, res) => {
    try {
        const requesterId = req.headers['x-user-id'] as string;
        const requester = await prisma.user.findUnique({ where: { id: requesterId || '' } });
        if (requester?.role !== 'admin') {
            return res.status(403).json({ error: 'Acesso negado: Somente administradores podem criar usuários' });
        }

        const { password, ...userData } = req.body;
        const hashedPassword = await bcrypt.hash(password, 10);
        const user = await prisma.user.create({
            data: {
                ...userData,
                password: hashedPassword
            }
        });
        const { password: _, ...userWithoutPassword } = user;
        res.json(userWithoutPassword);
    } catch (error) {
        res.status(500).json({ error: 'Erro ao criar usuário' });
    }
});

app.delete('/api/users/:id', async (req, res) => {
    try {
        const requesterId = req.headers['x-user-id'] as string;
        const requester = await prisma.user.findUnique({ where: { id: requesterId || '' } });
        if (requester?.role !== 'admin') {
            return res.status(403).json({ error: 'Acesso negado: Somente administradores podem remover usuários' });
        }

        const { id } = req.params;
        const user = await prisma.user.findUnique({ where: { id } });

        if (!user) {
            return res.status(404).json({ error: 'Usuário não encontrado' });
        }

        await prisma.user.update({
            where: { id },
            data: { isDeleted: true, isActive: false }
        });

        await createLog(requesterId, 'USER_DELETE', 'AUTH', `Marcou o usuário como deletado: ${user.name}`);

        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Erro ao deletar usuário' });
    }
});

app.put('/api/users/:id', async (req, res) => {
    try {
        const requesterId = req.headers['x-user-id'] as string;
        const requester = await prisma.user.findUnique({ where: { id: requesterId || '' } });

        const { id } = req.params;
        // Allow user to update their own profile OR admin update anyone
        if (requester?.role !== 'admin' && requesterId !== id) {
            return res.status(403).json({ error: 'Acesso negado: Você só pode atualizar seu próprio perfil' });
        }

        const { password, ...updateData } = req.body;

        if (password) {
            updateData.password = await bcrypt.hash(password, 10);
        }

        const user = await prisma.user.update({
            where: { id },
            data: updateData
        });

        const updaterId = req.headers['x-user-id'] as string;
        if (updaterId) {
            await createLog(updaterId, 'USER_UPDATE', 'TEAM', `Atualizou o usuário: ${user.name} (${user.role})`);
        }

        const { password: _, ...userWithoutPassword } = user;
        res.json(userWithoutPassword);
    } catch (error) {
        res.status(500).json({ error: 'Erro ao atualizar usuário' });
    }
});

// Configure Nodemailer
const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_PORT === '465',
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
    },
});

app.post('/api/auth/forgot-password', async (req, res) => {
    try {
        const { email } = req.body;
        const cleanEmail = email ? email.trim().toLowerCase() : '';
        console.log(`[Auth] Forgot password request for: "${cleanEmail}" (Original: "${email}")`);

        const user = await prisma.user.findUnique({ where: { email: cleanEmail } });

        if (!user) {
            console.warn(`[Auth] User NOT FOUND in database for email: "${cleanEmail}"`);
            return res.status(404).json({ error: 'Usuário não encontrado' });
        }
        console.log(`[Auth] User found: ${user.name} (${user.id})`);

        const token = crypto.randomBytes(4).toString('hex').toUpperCase(); // 8 characters token
        const expiry = new Date(Date.now() + 3600000); // 1 hour expiry

        await prisma.user.update({
            where: { id: user.id },
            data: {
                resetToken: token,
                resetTokenExpiry: expiry
            }
        });

        const mailOptions = {
            from: `"CAAR MOBIL" <${process.env.SMTP_USER}>`,
            to: email,
            subject: 'Recuperação de Senha - CAAR MOBIL',
            html: `
                <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; rounded: 24px;">
                    <h2 style="color: #FF4700; font-weight: 900; text-transform: uppercase;">Recuperação de Senha</h2>
                    <p style="color: #475569; font-weight: 600;">Olá ${user.name},</p>
                    <p style="color: #475569;">Você solicitou a recuperação de sua senha. Use o código abaixo para redefinir suas credenciais:</p>
                    <div style="background: #f8fafc; padding: 20px; text-align: center; border-radius: 16px; margin: 24px 0;">
                        <span style="font-size: 32px; font-weight: 900; letter-spacing: 0.2em; color: #0f172a;">${token}</span>
                    </div>
                    <p style="color: #94a3b8; font-size: 12px;">Este código expira em 1 hora. Se você não solicitou isso, desconsidere este e-mail.</p>
                </div>
            `
        };

        await transporter.sendMail(mailOptions);
        res.json({ success: true, message: 'Código de recuperação enviado para o seu e-mail' });
    } catch (error) {
        console.error('Forgot password error:', error);
        res.status(500).json({ error: 'Erro ao processar solicitação' });
    }
});

app.post('/api/auth/reset-password', async (req, res) => {
    try {
        const { email, token, newPassword } = req.body;
        const user = await prisma.user.findUnique({ where: { email } });

        if (!user || user.resetToken !== token || !user.resetTokenExpiry || user.resetTokenExpiry < new Date()) {
            return res.status(400).json({ error: 'Código inválido ou expirado' });
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);
        await prisma.user.update({
            where: { id: user.id },
            data: {
                password: hashedPassword,
                resetToken: null,
                resetTokenExpiry: null
            }
        });

        await createLog(user.id, 'PASSWORD_RESET', 'AUTH', `O usuário ${user.name} redefiniu sua senha via e-mail.`);

        res.json({ success: true, message: 'Senha redefinida com sucesso' });
    } catch (error) {
        console.error('Reset password error:', error);
        res.status(500).json({
            error: 'Erro ao redefinir senha',
            details: error instanceof Error ? error.message : String(error)
        });
    }
});

app.post('/api/users/update-account', async (req, res) => {
    console.log('[UpdateAccount] Request received:', JSON.stringify(req.body, (k, v) => k === 'currentPassword' || k === 'newPassword' ? '***' : v));
    try {
        const { currentPassword, newEmail, newPassword } = req.body;
        const userId = req.headers['x-user-id'] as string;
        console.log('[UpdateAccount] UserID from header:', userId);

        if (!userId) {
            return res.status(401).json({ error: 'Não autorizado' });
        }

        const user = await prisma.user.findUnique({
            where: { id: userId }
        });

        if (!user) {
            return res.status(404).json({ error: 'Usuário não encontrado' });
        }

        const isMatch = await bcrypt.compare(currentPassword, user.password);
        if (!isMatch) {
            return res.status(400).json({ error: 'Senha atual incorreta' });
        }

        const updateData: any = {};
        if (newEmail) {
            // Check if email is already taken
            const existingUser = await prisma.user.findFirst({
                where: { email: newEmail, NOT: { id: userId } }
            });
            if (existingUser) {
                return res.status(400).json({ error: 'Email já está em uso' });
            }
            updateData.email = newEmail;
        }

        if (newPassword) {
            updateData.password = await bcrypt.hash(newPassword, 10);
        }

        if (Object.keys(updateData).length === 0) {
            return res.status(400).json({ error: 'Nenhum dado para atualizar' });
        }

        const updatedUser = await prisma.user.update({
            where: { id: userId },
            data: updateData
        });

        await createLog(userId, 'ACCOUNT_UPDATE', 'AUTH', `O usuário ${user.name} atualizou suas credenciais (Email ou Senha).`);

        const { password: _, ...userWithoutPassword } = updatedUser;
        res.json({ success: true, user: userWithoutPassword, message: 'Conta atualizada com sucesso' });
    } catch (error) {
        console.error('Error updating account:', error);
        res.status(500).json({
            error: 'Erro ao atualizar conta',
            details: error instanceof Error ? error.message : String(error)
        });
    }
});

// Global Error Handler
app.use((err: any, req: any, res: any, next: any) => {
    console.error('Uncaught error:', err);
    res.status(500).json({
        error: 'Erro interno no servidor',
        message: err.message
    });
});

// 404 Handler for API (Fallback)
app.post('/api/admin/reset', async (req, res) => {
    try {
        const requesterId = req.headers['x-user-id'] as string;
        // Verify if requester is admin (simple check, full mitigation would use middleware)
        if (requesterId) {
            const user = await prisma.user.findUnique({ where: { id: requesterId } });
            if (user && user.role !== 'admin') {
                return res.status(403).json({ error: 'Acesso negado' });
            }
        }

        console.log('STARTING FACTORY RESET...');

        await prisma.$transaction([
            // 1. Delete dependent data first
            prisma.stockMovement.deleteMany(),
            prisma.transaction.deleteMany(),
            prisma.serviceOrder.deleteMany(),
            prisma.systemLog.deleteMany(),

            // 2. Delete main entities
            prisma.product.deleteMany(),

            // 3. Delete users (except maybe the one requesting? No, user asked for full zero. 
            // We will recreate default admin immediately after)
            prisma.user.deleteMany()
        ]);

        console.log('All data deleted.');

        // 4. Recreate Default Admin
        const hashedPassword = await bcrypt.hash('admin', 10);
        await prisma.user.create({
            data: {
                name: 'Administrador',
                email: 'caarmobilei@gmail.com',
                password: hashedPassword,
                role: 'admin',
                avatar: ''
            }
        });
        console.log('Default admin restored.');

        invalidateAnalyticsCache();
        io.emit('data-updated', { type: 'system', action: 'reset' });
        res.json({ success: true, message: 'Sistema restaurado com sucesso.' });
    } catch (error) {
        console.error('CRITICAL ERROR DURING RESET:', error);
        res.status(500).json({ error: 'Erro ao restaurar sistema', details: error instanceof Error ? error.message : String(error) });
    }
});

// --- Backup & Restore API ---
app.get('/api/admin/backup', async (req, res) => {
    try {
        const requesterId = req.headers['x-user-id'] as string;
        if (!requesterId) return res.status(401).json({ error: 'Não autorizado' });

        const user = await prisma.user.findUnique({ where: { id: requesterId } });
        if (!user || user.role !== 'admin') return res.status(403).json({ error: 'Acesso negado' });

        const [products, transactions, services, users, movements, logs] = await Promise.all([
            prisma.product.findMany(),
            prisma.transaction.findMany(),
            prisma.serviceOrder.findMany(),
            prisma.user.findMany(),
            prisma.stockMovement.findMany(),
            prisma.systemLog.findMany()
        ]);

        const backupData = {
            version: '1.0.0',
            timestamp: new Date().toISOString(),
            data: {
                products,
                transactions,
                services,
                users,
                movements,
                logs
            }
        };

        await createLog(requesterId, 'SYSTEM_BACKUP', 'SYSTEM', 'Backup do sistema realizado com sucesso.');

        res.json(backupData);
    } catch (error) {
        console.error('Backup error:', error);
        res.status(500).json({ error: 'Erro ao gerar backup' });
    }
});

app.post('/api/admin/restore', async (req, res) => {
    try {
        const requesterId = req.headers['x-user-id'] as string;
        if (!requesterId) return res.status(401).json({ error: 'Não autorizado' });

        const user = await prisma.user.findUnique({ where: { id: requesterId } });
        if (!user || user.role !== 'admin') return res.status(403).json({ error: 'Acesso negado' });

        const { data } = req.body;
        if (!data) return res.status(400).json({ error: 'Dados de backup ausentes' });

        console.log('STARTING RESTORE FROM BACKUP...');

        await prisma.$transaction(async (tx) => {
            // 1. Clear existing data
            await tx.stockMovement.deleteMany();
            await tx.transaction.deleteMany();
            await tx.serviceOrder.deleteMany();
            await tx.systemLog.deleteMany();
            await tx.product.deleteMany();
            await tx.user.deleteMany();

            // 2. Restore Users (ensure passwords stay hashed)
            if (data.users && data.users.length > 0) {
                await tx.user.createMany({ data: data.users });
            }

            // 3. Restore Products
            if (data.products && data.products.length > 0) {
                await tx.product.createMany({ data: data.products });
            }

            // 4. Restore Transactions
            if (data.transactions && data.transactions.length > 0) {
                await tx.transaction.createMany({
                    data: data.transactions.map((t: any) => ({
                        ...t,
                        date: new Date(t.date),
                        dueDate: new Date(t.dueDate)
                    }))
                });
            }

            // 5. Restore Services
            if (data.services && data.services.length > 0) {
                await tx.serviceOrder.createMany({
                    data: data.services.map((s: any) => ({
                        ...s,
                        created_at: new Date(s.created_at),
                        updated_at: new Date(s.updated_at),
                        delivered_at: s.delivered_at ? new Date(s.delivered_at) : null
                    }))
                });
            }

            // 6. Restore Movements
            if (data.movements && data.movements.length > 0) {
                await tx.stockMovement.createMany({
                    data: data.movements.map((m: any) => ({
                        ...m,
                        date: new Date(m.date)
                    }))
                });
            }

            // 7. Restore Logs
            if (data.logs && data.logs.length > 0) {
                await tx.systemLog.createMany({
                    data: data.logs.map((l: any) => ({
                        ...l,
                        createdAt: new Date(l.createdAt)
                    }))
                });
            }
        });

        invalidateAnalyticsCache();
        io.emit('data-updated', { type: 'system', action: 'restore' });
        res.json({ success: true, message: 'Dados restaurados com sucesso.' });
    } catch (error) {
        console.error('Restore error:', error);
        res.status(500).json({ error: 'Erro ao restaurar dados', details: error instanceof Error ? error.message : String(error) });
    }
});

app.use('/api', (req, res) => {
    console.warn(`404 NOT FOUND: ${req.method} ${req.originalUrl}`);
    res.status(404).json({ error: `Rota não encontrada: ${req.originalUrl}` });
});


// --- Database Health Check ---
async function checkDatabaseHealth() {
    try {
        console.log('🔍 Verificando integridade do banco de dados...');

        // Verify DATABASE_URL
        if (!process.env.DATABASE_URL) {
            throw new Error('DATABASE_URL não configurada em .env');
        }

        // Test connection by fetching user count or simple query
        await prisma.$queryRaw`SELECT 1`;
        console.log('✅ Banco de dados conectado e saudável.');
    } catch (error) {
        console.error('❌ ERRO NO BANCO DE DADOS:', error);
    }
}

// Fallback for React Router (SPA)
app.get('*', (req, res, next) => {
    // Skip if it is an API or Uploads path
    if (req.url.startsWith('/api') || req.url.startsWith('/uploads')) {
        return next();
    }

    const indexPath = path.join(distDir, 'index.html');
    if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
    } else {
        next();
    }
});

// Start Server
const server = httpServer.listen(Number(PORT), HOST, () => {
    console.log(`🚀 SERVER IS LIVE!`);
    console.log(`📍 URL: http://${HOST}:${PORT}`);
    console.log(`🏠 Mode: ${process.env.NODE_ENV || 'production'}`);

    // Run database health check and sync in background
    setTimeout(async () => {
        await checkDatabaseHealth();

        // If we are in production and it's a fresh deploy, try a push in background
        if (process.env.RAILWAY_ENVIRONMENT || process.env.RENDER) {
            console.log('[Database] Running background schema sync...');
            try {
                const { exec } = await import('child_process');
                exec('npx prisma db push --accept-data-loss', (err, stdout, stderr) => {
                    if (err) console.error('[Database] Background sync error:', err.message);
                    else console.log('[Database] Background sync complete.');
                });
            } catch (e) {
                console.error('[Database] Failed to trigger background sync.');
            }
        }
    }, 1000);

    // Ensure default admin exists
    try {
        const adminExists = await prisma.user.findFirst({
            where: { role: 'admin' }
        });
        if (!adminExists) {
            const hashedPassword = await bcrypt.hash('admin', 10);
            await prisma.user.create({
                data: {
                    name: 'Administrador',
                    email: 'caarmobilei@gmail.com',
                    password: hashedPassword,
                    role: 'admin',
                    avatar: ''
                }
            });
            console.log('Default admin created: caarmobilei@gmail.com / admin');
        }
    } catch (error) {
        console.error('Error creating default admin:', error);
    }
});

server.on('error', (e: any) => {
    if (e.code === 'EADDRINUSE') {
        console.error(`\n[FATAL] A porta ${PORT} já está em uso.`);
        console.error(`O servidor não pôde iniciar porque outro processo já está usando a porta ${PORT}.`);
        console.error(`Tente fechar outros terminais ou processos node e tente novamente.\n`);
        process.exit(1);
    }
});

// Graceful shutdown
const shutdown = async (signal: string) => {
    console.log(`\nRecebido ${signal}. Encerrando graciosamente...`);
    server.close(async () => {
        console.log('HTTP server encerrado.');
        try {
            await prisma.$disconnect();
            console.log('Conexão com banco de dados encerrada.');
        } catch (err) {
            console.error('Erro ao desconectar do banco:', err);
        }
        process.exit(0);
    });

    // Forçar encerramento após 5 segundos se travar
    setTimeout(() => {
        console.error('Falha ao encerrar conexões a tempo, forçando saída.');
        process.exit(1);
    }, 5000);
};

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
// Extra signal for Windows (Ctrl+Break)
process.on('SIGBREAK', () => shutdown('SIGBREAK'));
// Handle unhandled rejections/exceptions to prevent "zombie" processes
process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});
process.on('uncaughtException', (err) => {
    console.error('Uncaught Exception:', err);
    shutdown('uncaughtException');
});
