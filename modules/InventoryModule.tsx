import React, { useState, useMemo, useEffect } from 'react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend } from 'recharts';
import { ExpirationProduct } from '../types';
import { useAppContext } from '../context/DataContext';
import { useToast } from '../context/ToastContext';
import { Modal } from '../components/Modal';
import { Icon, ICONS } from '../components/Icon';
import { StatCard } from '../components/StatCard';
import { EmptyChartState } from '../components/EmptyChartState';
import { formatDate, parseDate, daysUntil } from '../utility';

const ProductForm: React.FC<{
    product: Omit<ExpirationProduct, 'id'> | null;
    onSave: (product: ExpirationProduct) => void;
    onCancel: () => void;
}> = ({ product, onSave, onCancel }) => {
    
    const INITIAL_FORM_STATE = {
        barcode: '',
        description: '',
        quantity: 1,
        expirationDate: formatDate(new Date()),
    };

    const [formData, setFormData] = useState(product || INITIAL_FORM_STATE);
    const { addToast } = useToast();

    useEffect(() => {
        setFormData(product || INITIAL_FORM_STATE);
    }, [product]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: name === 'quantity' ? parseInt(value, 10) || 0 : value }));
    };
    
    const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.value) return;
        const [year, month, day] = e.target.value.split('-').map(Number);
        const newDate = new Date(Date.UTC(year, month - 1, day));
        setFormData(prev => ({...prev, expirationDate: formatDate(newDate)}));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (!formData.barcode.trim() || !/^\d+$/.test(formData.barcode.trim())) {
            addToast('Código de barras inválido. Use apenas números.', 'error');
            return;
        }
        if (!formData.description.trim()) {
            addToast('A descrição é obrigatória.', 'error');
            return;
        }
        if (formData.quantity <= 0) {
            addToast('A quantidade deve ser maior que zero.', 'error');
            return;
        }

        const today = new Date();
        today.setUTCHours(0,0,0,0);
        if (parseDate(formData.expirationDate).getTime() < today.getTime()) {
            addToast('A data de vencimento não pode ser no passado.', 'error');
            return;
        }

        onSave({
            id: (product as ExpirationProduct)?.id || `exp-${Date.now()}`,
            ...formData,
        });
    };

    const todayStr = new Date().toISOString().split('T')[0];

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-slate-600 mb-1">Descrição do Produto</label>
                    <textarea name="description" value={formData.description} onChange={handleInputChange} maxLength={255} rows={3} className="w-full p-2 border border-slate-300 rounded-lg shadow-sm focus:ring-indigo-500 focus:border-indigo-500" placeholder="Ex: Leite Integral 1L" required />
                </div>
                <div>
                    <label className="block text-sm font-medium text-slate-600 mb-1">Código de Barras</label>
                    <input type="text" name="barcode" value={formData.barcode} onChange={handleInputChange} className="w-full p-2 border border-slate-300 rounded-lg shadow-sm focus:ring-indigo-500 focus:border-indigo-500" pattern="\d*" title="Apenas números são permitidos" placeholder="Apenas números" required />
                </div>
                <div>
                    <label className="block text-sm font-medium text-slate-600 mb-1">Quantidade</label>
                    <input type="number" name="quantity" value={formData.quantity || ''} onChange={handleInputChange} className="w-full p-2 border border-slate-300 rounded-lg shadow-sm focus:ring-indigo-500 focus:border-indigo-500" min="1" step="1" required />
                </div>
                <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-slate-600 mb-1">Data de Vencimento</label>
                    <input type="date" name="expirationDate" value={parseDate(formData.expirationDate).toISOString().split('T')[0]} onChange={handleDateChange} className="w-full p-2 border border-slate-300 rounded-lg shadow-sm focus:ring-indigo-500 focus:border-indigo-500" min={todayStr} required />
                </div>
            </div>
            <div className="flex justify-end gap-3 pt-4 mt-4 border-t border-slate-200">
                <button type="button" onClick={onCancel} className="bg-slate-200 text-slate-700 px-4 py-2 rounded-lg hover:bg-slate-300 transition-colors font-semibold">
                    Cancelar
                </button>
                <button type="submit" className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors font-semibold">
                    Salvar Produto
                </button>
            </div>
        </form>
    );
};

const StatusBadge: React.FC<{ date: string }> = ({ date }) => {
    const days = daysUntil(date);
    let badgeClass = 'bg-emerald-100 text-emerald-700';
    let text = `${days} dia(s)`;

    if (days < 0) {
        badgeClass = 'bg-rose-100 text-rose-700';
        text = `Vencido há ${Math.abs(days)} dia(s)`;
    } else if (days === 0) {
        badgeClass = 'bg-rose-100 text-rose-700 font-bold';
        text = 'Vence Hoje';
    } else if (days <= 30) {
        badgeClass = 'bg-amber-100 text-amber-700';
        text = `${days} dia(s)`;
    }

    return (
        <span className={`px-2 py-1 text-xs font-semibold rounded-full inline-flex items-center ${badgeClass}`}>
            {text}
        </span>
    );
};


export const InventoryModule: React.FC = () => {
    const { data, dispatch } = useAppContext();
    const { addToast } = useToast();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingProduct, setEditingProduct] = useState<ExpirationProduct | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<'all' | 'expired' | 'attention' | 'ok'>('all');

    const summaryData = useMemo(() => {
        const stats = {
            expired: 0,
            attention: 0,
            ok: 0,
            totalItems: 0,
            nextExpiration: null as string | null,
        };
        let closestFutureDate = Infinity;

        data.expirationProducts.forEach(p => {
            const days = daysUntil(p.expirationDate);
            stats.totalItems += p.quantity;

            if (days < 0) {
                stats.expired++;
            } else if (days <= 30) {
                stats.attention++;
            } else {
                stats.ok++;
            }
            
            const expDateTime = parseDate(p.expirationDate).getTime();
            if (days >= 0 && expDateTime < closestFutureDate) {
                closestFutureDate = expDateTime;
                stats.nextExpiration = p.expirationDate;
            }
        });
        
        const pieData = [
            { name: 'Vencidos', value: stats.expired, color: '#f43f5e' }, // rose-500
            { name: 'Atenção (≤ 30d)', value: stats.attention, color: '#f59e0b' }, // amber-500
            { name: 'OK (> 30d)', value: stats.ok, color: '#10b981' }, // emerald-500
        ].filter(d => d.value > 0);

        return { ...stats, pieData };
    }, [data.expirationProducts]);

    const handleOpenModal = (product: ExpirationProduct | null) => {
        setEditingProduct(product);
        setIsModalOpen(true);
    };

    const handleSaveProduct = (productData: ExpirationProduct) => {
        if (editingProduct) {
            dispatch({ type: 'SET_EXPIRATION_PRODUCTS', payload: prev => prev.map(p => p.id === productData.id ? productData : p) });
            addToast('Produto atualizado com sucesso!', 'success');
        } else {
            dispatch({ type: 'SET_EXPIRATION_PRODUCTS', payload: prev => [...prev, productData] });
            addToast('Produto adicionado com sucesso!', 'success');
        }
        setIsModalOpen(false);
        setEditingProduct(null);
    };

    const handleDeleteProduct = (id: string) => {
        if (window.confirm('Tem certeza que deseja excluir este produto?')) {
            dispatch({ type: 'SET_EXPIRATION_PRODUCTS', payload: prev => prev.filter(p => p.id !== id) });
            addToast('Produto excluído.', 'info');
        }
    };

    const filteredProducts = useMemo(() => {
        return data.expirationProducts
            .filter(p => {
                const termMatch = p.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                  p.barcode.includes(searchTerm);
                if (!termMatch) return false;

                if (statusFilter === 'all') return true;
                
                const days = daysUntil(p.expirationDate);
                if (statusFilter === 'expired') return days < 0;
                if (statusFilter === 'attention') return days >= 0 && days <= 30;
                if (statusFilter === 'ok') return days > 30;

                return false;
            })
            .sort((a, b) => {
                const daysA = daysUntil(a.expirationDate);
                const daysB = daysUntil(b.expirationDate);
                return daysA - daysB;
            });
    }, [data.expirationProducts, searchTerm, statusFilter]);
    
    const FilterButton: React.FC<{
        filterValue: 'all' | 'expired' | 'attention' | 'ok',
        label: string,
        count: number,
        activeColor: string
    }> = ({ filterValue, label, count, activeColor }) => (
         <button 
            onClick={() => setStatusFilter(filterValue)}
            className={`px-3 py-1.5 text-sm font-semibold rounded-md transition-colors flex items-center gap-2 ${statusFilter === filterValue ? `${activeColor}` : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
        >
            {label}
            <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${statusFilter === filterValue ? 'bg-white/20' : 'bg-slate-200 text-slate-500'}`}>{count}</span>
        </button>
    );

    return (
        <main className="flex-1 p-8 bg-slate-100 animate-fade-in space-y-6">
            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingProduct ? 'Editar Produto' : 'Adicionar Produto'}>
                <ProductForm
                    product={editingProduct}
                    onSave={handleSaveProduct}
                    onCancel={() => setIsModalOpen(false)}
                />
            </Modal>
            
            <h1 className="text-3xl font-bold text-slate-800">Dashboard de Vencimentos</h1>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard 
                    title="Produtos Vencidos"
                    value={String(summaryData.expired)}
                    icon={<Icon path={ICONS.close} className="w-6 h-6" />}
                    color="rose"
                />
                 <StatCard 
                    title="Atenção (Vence em 30 dias)"
                    value={String(summaryData.attention)}
                    icon={<Icon path={ICONS.cash} className="w-6 h-6" />}
                    color="amber"
                />
                 <StatCard 
                    title="Total de Itens"
                    value={String(summaryData.totalItems)}
                    icon={<Icon path={ICONS.inventory} className="w-6 h-6" />}
                    color="blue"
                />
                 <StatCard 
                    title="Próximo Vencimento"
                    value={summaryData.nextExpiration || 'N/A'}
                    icon={<Icon path={ICONS.recurring} className="w-6 h-6" />}
                    color="indigo"
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 bg-white p-6 rounded-xl shadow-sm border border-slate-200/80">
                    <div className="flex flex-wrap justify-between items-center gap-4 mb-4 pb-4 border-b">
                        <h2 className="text-xl font-bold text-slate-800">Lista de Produtos</h2>
                        <button onClick={() => handleOpenModal(null)} className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors shadow flex items-center gap-2 font-semibold">
                            <Icon path={ICONS.plus} className="w-5 h-5" /> Adicionar Produto
                        </button>
                    </div>

                    <div className="flex flex-wrap gap-4 mb-4">
                         <input
                            type="text"
                            placeholder="Buscar por descrição ou código..."
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            className="w-full sm:w-64 p-2 border border-slate-300 rounded-lg shadow-sm"
                        />
                        <div className="flex items-center gap-2 flex-wrap">
                            <FilterButton filterValue="all" label="Todos" count={data.expirationProducts.length} activeColor="bg-indigo-600 text-white" />
                            <FilterButton filterValue="expired" label="Vencidos" count={summaryData.expired} activeColor="bg-rose-600 text-white" />
                            <FilterButton filterValue="attention" label="Atenção" count={summaryData.attention} activeColor="bg-amber-500 text-white" />
                            <FilterButton filterValue="ok" label="OK" count={summaryData.ok} activeColor="bg-emerald-600 text-white" />
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left text-slate-600">
                            <thead className="text-xs text-slate-500 uppercase bg-slate-100">
                                <tr>
                                    <th className="px-4 py-3">Descrição</th>
                                    <th className="px-4 py-3">Código</th>
                                    <th className="px-4 py-3 text-center">Qtd.</th>
                                    <th className="px-4 py-3">Vencimento</th>
                                    <th className="px-4 py-3">Status</th>
                                    <th className="px-4 py-3 text-center">Ações</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredProducts.map(p => (
                                    <tr key={p.id} className="bg-white border-b hover:bg-slate-50/70">
                                        <td className="px-4 py-3 font-medium text-slate-800">{p.description}</td>
                                        <td className="px-4 py-3 font-mono">{p.barcode}</td>
                                        <td className="px-4 py-3 text-center font-semibold">{p.quantity}</td>
                                        <td className="px-4 py-3">{p.expirationDate}</td>
                                        <td className="px-4 py-3"><StatusBadge date={p.expirationDate} /></td>
                                        <td className="px-4 py-3">
                                            <div className="flex justify-center items-center gap-2">
                                                <button onClick={() => handleOpenModal(p)} title="Editar" className="p-1 text-slate-500 hover:text-indigo-600 transition-colors">
                                                    <Icon path={ICONS.edit} className="w-5 h-5" />
                                                </button>
                                                <button onClick={() => handleDeleteProduct(p.id)} title="Excluir" className="p-1 text-slate-500 hover:text-rose-600 transition-colors">
                                                    <Icon path={ICONS.close} className="w-5 h-5" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {filteredProducts.length === 0 && (
                            <div className="text-center py-10 text-slate-500">
                                <Icon path={ICONS.inventory} className="w-12 h-12 mx-auto text-slate-400" />
                                <h3 className="mt-2 font-semibold">Nenhum produto encontrado.</h3>
                                <p>{searchTerm ? "Tente ajustar sua busca ou filtro." : "Adicione um produto para começar."}</p>
                            </div>
                        )}
                    </div>
                </div>

                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200/80">
                    <h2 className="text-lg font-bold text-slate-700 mb-4">Composição do Estoque</h2>
                     <div className="h-80">
                        {summaryData.pieData.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie data={summaryData.pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={60} outerRadius={85} paddingAngle={3}>
                                        {summaryData.pieData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                                    </Pie>
                                    <Tooltip formatter={(value: number) => `${value} produto(s)`}/>
                                    <Legend layout="vertical" align="right" verticalAlign="middle" iconSize={10} wrapperStyle={{fontSize: "14px"}}/>
                                </PieChart>
                            </ResponsiveContainer>
                        ) : (
                            <EmptyChartState message="Adicione produtos para ver a composição do estoque." />
                        )}
                    </div>
                </div>
            </div>
        </main>
    );
};

export default InventoryModule;
