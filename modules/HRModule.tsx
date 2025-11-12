import React, { useState, useMemo } from 'react';
import { Employee, HRView, PayrollEntry } from '../types';
import { useAppContext } from '../context/DataContext';
import { useToast } from '../context/ToastContext';
import { Modal } from '../components/Modal';
import { Icon, ICONS } from '../components/Icon';
import { StatCard } from '../components/StatCard';
import { formatCurrency, formatDate, parseDate } from '../utility';
import { PT_BR_MONTHS } from '../constants';

const StatusBadge: React.FC<{ status: 'active' | 'inactive' }> = ({ status }) => {
    const baseClasses = "px-2 py-1 text-xs font-semibold rounded-full inline-block";
    if (status === 'active') {
        return <span className={`${baseClasses} bg-emerald-100 text-emerald-800`}>Ativo</span>;
    }
    return <span className={`${baseClasses} bg-slate-200 text-slate-700`}>Inativo</span>;
};

// --- Employee Management ---
const EmployeeForm: React.FC<{
    employee: Omit<Employee, 'id'> | null;
    onSave: (employee: Employee) => void;
    onCancel: () => void;
}> = ({ employee, onSave, onCancel }) => {
    const INITIAL_FORM_STATE: Omit<Employee, 'id' | 'status'> = {
        name: '',
        position: '',
        admissionDate: formatDate(new Date()),
        salary: 0,
    };

    const [formData, setFormData] = useState(employee ? { ...employee, salary: employee.salary || 0 } : INITIAL_FORM_STATE);
    const { addToast } = useToast();

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: name === 'salary' ? parseFloat(value) || 0 : value }));
    };

    const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.value) return;
        const [year, month, day] = e.target.value.split('-').map(Number);
        const newDate = new Date(Date.UTC(year, month - 1, day));
        setFormData(prev => ({ ...prev, admissionDate: formatDate(newDate) }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.name.trim() || !formData.position.trim()) {
            addToast('Nome e Cargo são obrigatórios.', 'error');
            return;
        }
        if (formData.salary <= 0) {
            addToast('O salário deve ser maior que zero.', 'error');
            return;
        }
        onSave({
            id: (employee as Employee)?.id || `emp-${Date.now()}`,
            status: (employee as Employee)?.status || 'active',
            ...formData,
        });
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-slate-600 mb-1">Nome Completo</label>
                    <input type="text" name="name" value={formData.name} onChange={handleInputChange} className="w-full p-2 border border-slate-300 rounded-lg shadow-sm" required />
                </div>
                <div>
                    <label className="block text-sm font-medium text-slate-600 mb-1">Cargo</label>
                    <input type="text" name="position" value={formData.position} onChange={handleInputChange} className="w-full p-2 border border-slate-300 rounded-lg shadow-sm" required />
                </div>
                <div>
                    <label className="block text-sm font-medium text-slate-600 mb-1">Salário</label>
                    <input type="number" name="salary" step="0.01" value={formData.salary || ''} onChange={handleInputChange} className="w-full p-2 border border-slate-300 rounded-lg shadow-sm" placeholder="R$ 0,00" required />
                </div>
                <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-slate-600 mb-1">Data de Admissão</label>
                    <input type="date" name="admissionDate" value={parseDate(formData.admissionDate).toISOString().split('T')[0]} onChange={handleDateChange} className="w-full p-2 border border-slate-300 rounded-lg shadow-sm" required />
                </div>
            </div>
            <div className="flex justify-end gap-3 pt-4 mt-4 border-t border-slate-200">
                <button type="button" onClick={onCancel} className="bg-slate-200 text-slate-700 px-4 py-2 rounded-lg hover:bg-slate-300 font-semibold">Cancelar</button>
                <button type="submit" className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 font-semibold">Salvar</button>
            </div>
        </form>
    );
};

const EmployeeManagementView: React.FC = () => {
    const { data, dispatch } = useAppContext();
    const { employees } = data;
    const { addToast } = useToast();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);

    const handleOpenModal = (employee: Employee | null) => {
        setEditingEmployee(employee);
        setIsModalOpen(true);
    };

    const handleSaveEmployee = (employeeData: Employee) => {
        if (editingEmployee) {
            dispatch({ type: 'SET_EMPLOYEES', payload: prev => prev.map(e => e.id === employeeData.id ? employeeData : e) });
            addToast('Colaborador atualizado!', 'success');
        } else {
            dispatch({ type: 'SET_EMPLOYEES', payload: prev => [...prev, employeeData] });
            addToast('Colaborador adicionado!', 'success');
        }
        setIsModalOpen(false);
        setEditingEmployee(null);
    };
    
    const handleToggleStatus = (employeeId: string) => {
        dispatch({
            type: 'SET_EMPLOYEES',
            payload: prev => prev.map(e =>
                e.id === employeeId ? { ...e, status: e.status === 'active' ? 'inactive' : 'active' } : e
            )
        });
        addToast('Status do colaborador alterado.', 'info');
    };

    const summary = useMemo(() => {
        const activeEmployees = employees.filter(e => e.status === 'active');
        const totalSalary = activeEmployees.reduce((sum, e) => sum + Number(e.salary), 0);
        return {
            activeCount: activeEmployees.length,
            totalSalary,
        };
    }, [employees]);

    return (
        <div className="animate-fade-in space-y-6">
            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingEmployee ? 'Editar Colaborador' : 'Adicionar Colaborador'}>
                <EmployeeForm
                    employee={editingEmployee}
                    onSave={handleSaveEmployee}
                    onCancel={() => setIsModalOpen(false)}
                />
            </Modal>
            
            <h1 className="text-3xl font-bold text-slate-800">Colaboradores</h1>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard 
                    title="Colaboradores Ativos"
                    value={String(summary.activeCount)}
                    icon={<Icon path={ICONS.hr} className="w-6 h-6" />}
                    color="blue"
                />
                <StatCard 
                    title="Folha de Pagamento (Base)"
                    value={formatCurrency(summary.totalSalary, true)}
                    icon={<Icon path={ICONS.balance} className="w-6 h-6" />}
                    color="emerald"
                />
            </div>
            
            <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200/80">
                <div className="flex flex-wrap justify-between items-center gap-4 mb-4 px-2 pt-2 pb-4 border-b">
                    <h2 className="text-xl font-bold text-slate-700">Quadro de Colaboradores</h2>
                    <button onClick={() => handleOpenModal(null)} className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors shadow flex items-center gap-2 font-semibold">
                        <Icon path={ICONS.plus} className="w-5 h-5"/> Adicionar Colaborador
                    </button>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left text-slate-600">
                        <thead className="text-xs text-slate-500 uppercase bg-slate-100">
                             <tr>
                                <th className="px-4 py-3">Nome</th>
                                <th className="px-4 py-3">Cargo</th>
                                <th className="px-4 py-3">Data de Admissão</th>
                                <th className="px-4 py-3 text-right">Salário</th>
                                <th className="px-4 py-3 text-center">Status</th>
                                <th className="px-4 py-3 text-center">Ações</th>
                            </tr>
                        </thead>
                        <tbody>
                            {employees.map(emp => (
                                <tr key={emp.id} className="bg-white border-b hover:bg-slate-50/70">
                                    <td className="px-4 py-3 font-medium text-slate-800">{emp.name}</td>
                                    <td className="px-4 py-3">{emp.position}</td>
                                    <td className="px-4 py-3">{emp.admissionDate}</td>
                                    <td className="px-4 py-3 text-right font-semibold">{formatCurrency(emp.salary, true)}</td>
                                    <td className="px-4 py-3 text-center"><StatusBadge status={emp.status} /></td>
                                    <td className="px-4 py-3">
                                        <div className="flex justify-center items-center gap-2">
                                            <button onClick={() => handleOpenModal(emp)} title="Editar" className="p-1 text-slate-500 hover:text-indigo-600 transition-colors">
                                               <Icon path={ICONS.edit} className="w-5 h-5" />
                                            </button>
                                            <button onClick={() => handleToggleStatus(emp.id)} title={emp.status === 'active' ? 'Desativar' : 'Ativar'} className={`p-1 text-slate-500 transition-colors ${emp.status === 'active' ? 'hover:text-rose-600' : 'hover:text-emerald-600'}`}>
                                               <Icon path={emp.status === 'active' ? ICONS.close : ICONS.checkCircle} className="w-5 h-5" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {employees.length === 0 && (
                        <div className="text-center py-10 text-slate-500">
                            <Icon path={ICONS.hr} className="w-12 h-12 mx-auto text-slate-400" />
                            <h3 className="mt-2 font-semibold">Nenhum colaborador cadastrado.</h3>
                            <p>Clique em "Adicionar Colaborador" para começar.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

// --- Payroll Entries Management ---
const PayrollEntriesView: React.FC = () => {
    const { data, dispatch } = useAppContext();
    const { payrollEntries, employees } = data;
    const { addToast } = useToast();

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingEntry, setEditingEntry] = useState<PayrollEntry | null>(null);

    const handleSaveEntry = (entry: Omit<PayrollEntry, 'id'>) => {
        if (editingEntry) {
            dispatch({ type: 'SET_PAYROLL_ENTRIES', payload: prev => prev.map(p => p.id === editingEntry.id ? { ...editingEntry, ...entry } : p) });
            addToast('Lançamento atualizado!', 'success');
        } else {
            const newEntry: PayrollEntry = { ...entry, id: `pe-${Date.now()}` };
            dispatch({ type: 'SET_PAYROLL_ENTRIES', payload: prev => [...prev, newEntry] });
            addToast('Lançamento adicionado!', 'success');
        }
        setIsModalOpen(false);
        setEditingEntry(null);
    };

    const handleDeleteEntry = (id: string) => {
        if (window.confirm("Tem certeza que deseja excluir este lançamento?")) {
            dispatch({ type: 'SET_PAYROLL_ENTRIES', payload: prev => prev.filter(p => p.id !== id) });
            addToast('Lançamento excluído.', 'info');
        }
    };
    
    const EntryForm: React.FC<{
      onSave: (entry: Omit<PayrollEntry, 'id'>) => void;
      onCancel: () => void;
      entry: PayrollEntry | null;
    }> = ({ onSave, onCancel, entry }) => {
        const now = new Date();
        const [formData, setFormData] = useState({
            employeeId: entry?.employeeId || '',
            description: entry?.description || '',
            type: entry?.type || 'earning',
            value: entry?.value || 0,
            month: entry?.month || now.getUTCMonth() + 1,
            year: entry?.year || now.getUTCFullYear(),
        });
        
        const handleSubmit = (e: React.FormEvent) => {
            e.preventDefault();
            const selectedEmployee = employees.find(emp => emp.id === formData.employeeId);
            if (!selectedEmployee) {
                addToast('Selecione um colaborador.', 'error'); return;
            }
            if (!formData.description) {
                addToast('A descrição é obrigatória.', 'error'); return;
            }
            if (formData.value <= 0) {
                addToast('O valor deve ser positivo.', 'error'); return;
            }
            onSave({ ...formData, employeeName: selectedEmployee.name });
        };
        
        return (
            <form onSubmit={handleSubmit} className="space-y-4">
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-slate-600 mb-1">Colaborador</label>
                        <select name="employeeId" value={formData.employeeId} onChange={e => setFormData(p => ({...p, employeeId: e.target.value}))} className="w-full p-2 border border-slate-300 rounded-lg" required>
                            <option value="">Selecione...</option>
                            {employees.filter(e => e.status === 'active').map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-600 mb-1">Mês</label>
                        <select name="month" value={formData.month} onChange={e => setFormData(p => ({...p, month: parseInt(e.target.value)}))} className="w-full p-2 border border-slate-300 rounded-lg">
                           {PT_BR_MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
                        </select>
                    </div>
                     <div>
                        <label className="block text-sm font-medium text-slate-600 mb-1">Ano</label>
                        <input type="number" name="year" value={formData.year} onChange={e => setFormData(p => ({...p, year: parseInt(e.target.value)}))} className="w-full p-2 border border-slate-300 rounded-lg" />
                    </div>
                    <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-slate-600 mb-1">Tipo de Lançamento</label>
                        <select name="type" value={formData.type} onChange={e => setFormData(p => ({...p, type: e.target.value as any}))} className="w-full p-2 border border-slate-300 rounded-lg">
                            <option value="earning">Vencimento (Bônus, Hora Extra, etc)</option>
                            <option value="deduction">Desconto (Falta, Atraso, Adiantamento)</option>
                        </select>
                    </div>
                     <div>
                        <label className="block text-sm font-medium text-slate-600 mb-1">Descrição</label>
                        <input type="text" name="description" value={formData.description} onChange={e => setFormData(p => ({...p, description: e.target.value}))} className="w-full p-2 border border-slate-300 rounded-lg" required />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-600 mb-1">Valor</label>
                        <input type="number" name="value" step="0.01" value={formData.value || ''} onChange={e => setFormData(p => ({...p, value: parseFloat(e.target.value)}))} className="w-full p-2 border border-slate-300 rounded-lg" required />
                    </div>
                </div>
                 <div className="flex justify-end gap-3 pt-4 mt-4 border-t">
                    <button type="button" onClick={onCancel} className="bg-slate-200 text-slate-700 px-4 py-2 rounded-lg font-semibold">Cancelar</button>
                    <button type="submit" className="bg-indigo-600 text-white px-4 py-2 rounded-lg font-semibold">Salvar</button>
                </div>
            </form>
        );
    }
    
    return (
        <div className="animate-fade-in space-y-6">
            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingEntry ? 'Editar Lançamento' : 'Novo Lançamento'}>
                <EntryForm onSave={handleSaveEntry} onCancel={() => setIsModalOpen(false)} entry={editingEntry} />
            </Modal>
            <h1 className="text-3xl font-bold text-slate-800">Lançamentos da Folha</h1>
            <div className="bg-white p-4 rounded-xl shadow-sm border">
                 <div className="flex justify-between items-center mb-4 px-2 pt-2 pb-4 border-b">
                    <h2 className="text-xl font-bold text-slate-700">Lançamentos</h2>
                    <button onClick={() => { setEditingEntry(null); setIsModalOpen(true); }} className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 shadow flex items-center gap-2 font-semibold">
                        <Icon path={ICONS.plus} className="w-5 h-5"/> Novo Lançamento
                    </button>
                </div>
                 <table className="w-full text-sm">
                    <thead className="text-xs text-slate-500 uppercase bg-slate-100">
                        <tr>
                            <th className="px-4 py-3 text-left">Colaborador</th>
                            <th className="px-4 py-3 text-left">Competência</th>
                            <th className="px-4 py-3 text-left">Descrição</th>
                            <th className="px-4 py-3 text-left">Tipo</th>
                            <th className="px-4 py-3 text-right">Valor</th>
                            <th className="px-4 py-3 text-center">Ações</th>
                        </tr>
                    </thead>
                    <tbody>
                        {payrollEntries.sort((a,b) => b.year - a.year || b.month - a.month).map(entry => (
                        <tr key={entry.id} className="border-b hover:bg-slate-50">
                            <td className="px-4 py-2 font-medium">{entry.employeeName}</td>
                            <td className="px-4 py-2">{String(entry.month).padStart(2,'0')}/{entry.year}</td>
                            <td className="px-4 py-2">{entry.description}</td>
                            <td className="px-4 py-2">
                                <span className={`px-2 py-1 text-xs font-semibold rounded-full ${entry.type === 'earning' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
                                    {entry.type === 'earning' ? 'Vencimento' : 'Desconto'}
                                </span>
                            </td>
                            <td className={`px-4 py-2 text-right font-semibold ${entry.type === 'earning' ? 'text-emerald-700' : 'text-rose-700'}`}>
                                {formatCurrency(entry.value, true)}
                            </td>
                            <td className="px-4 py-2">
                                <div className="flex justify-center items-center gap-2">
                                    <button onClick={() => { setEditingEntry(entry); setIsModalOpen(true); }} title="Editar"><Icon path={ICONS.edit} className="w-5 h-5 text-slate-500 hover:text-indigo-600" /></button>
                                    <button onClick={() => handleDeleteEntry(entry.id)} title="Excluir"><Icon path={ICONS.close} className="w-5 h-5 text-slate-500 hover:text-rose-600" /></button>
                                </div>
                            </td>
                        </tr>
                        ))}
                    </tbody>
                </table>
                 {payrollEntries.length === 0 && <p className="text-center py-8 text-slate-500">Nenhum lançamento encontrado.</p>}
            </div>
        </div>
    );
};

// --- Payroll View ---
const calculateINSS = (baseSalary: number) => {
    if (baseSalary <= 1412.00) return baseSalary * 0.075;
    if (baseSalary <= 2666.68) return baseSalary * 0.09;
    if (baseSalary <= 4000.03) return baseSalary * 0.12;
    if (baseSalary <= 7786.02) return baseSalary * 0.14;
    return 908.85; // Teto
};

const calculateIRRF = (baseSalary: number, inssDeduction: number) => {
    const calcBase = baseSalary - inssDeduction;
    if (calcBase <= 2259.20) return 0;
    if (calcBase <= 2826.65) return (calcBase * 0.075) - 169.44;
    if (calcBase <= 3751.05) return (calcBase * 0.15) - 381.44;
    if (calcBase <= 4664.68) return (calcBase * 0.225) - 662.77;
    return (calcBase * 0.275) - 896.00;
};

const PayrollView: React.FC = () => {
    const { data } = useAppContext();
    const { employees, payrollEntries } = data;
    const now = new Date();
    const [selectedMonth, setSelectedMonth] = useState(now.getUTCMonth() + 1);
    const [selectedYear, setSelectedYear] = useState(now.getUTCFullYear());
    const [detailsModalOpen, setDetailsModalOpen] = useState(false);
    const [selectedEmployeeData, setSelectedEmployeeData] = useState<any>(null);

    const payrollData = useMemo(() => {
        return employees
            .filter(emp => emp.status === 'active')
            .map(emp => {
                const entries = payrollEntries.filter(p => p.employeeId === emp.id && p.month === selectedMonth && p.year === selectedYear);
                const totalEarnings = entries.filter(p => p.type === 'earning').reduce((sum, p) => sum + p.value, 0);
                const manualDeductions = entries.filter(p => p.type === 'deduction').reduce((sum, p) => sum + p.value, 0);

                const grossSalary = emp.salary + totalEarnings;
                const inss = calculateINSS(grossSalary);
                const irrf = calculateIRRF(grossSalary, inss);
                
                const totalDeductions = manualDeductions + inss + irrf;
                const netSalary = grossSalary - totalDeductions;
                
                return {
                    employee: emp,
                    grossSalary, totalDeductions, netSalary,
                    details: { earnings: entries.filter(p=>p.type==='earning'), manualDeductions: entries.filter(p=>p.type==='deduction'), inss, irrf }
                };
            });
    }, [employees, payrollEntries, selectedMonth, selectedYear]);

    const payrollSummary = useMemo(() => {
        return payrollData.reduce((acc, data) => {
            acc.gross += data.grossSalary;
            acc.deductions += data.totalDeductions;
            acc.net += data.netSalary;
            return acc;
        }, { gross: 0, deductions: 0, net: 0 });
    }, [payrollData]);

    const openDetailsModal = (data: any) => {
        setSelectedEmployeeData(data);
        setDetailsModalOpen(true);
    };

    const PayrollDetailsModal = () => {
        if (!selectedEmployeeData) return null;
        const { employee, grossSalary, totalDeductions, netSalary, details } = selectedEmployeeData;
        return (
            <Modal isOpen={detailsModalOpen} onClose={() => setDetailsModalOpen(false)} title={`Holerite - ${employee.name}`}>
                <div className="text-sm space-y-4">
                    <p><strong>Competência:</strong> {String(selectedMonth).padStart(2,'0')}/{selectedYear}</p>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-2 p-3 bg-slate-50 rounded-lg">
                        <div className="font-semibold">Cargo:</div> <div>{employee.position}</div>
                        <div className="font-semibold">Salário Base:</div> <div className="text-right">{formatCurrency(employee.salary, true)}</div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2 p-3 bg-emerald-50/50 rounded-lg border border-emerald-200">
                             <h4 className="font-bold text-emerald-800 border-b pb-1 mb-2">Vencimentos</h4>
                             <div className="flex justify-between"><p>Salário Base</p> <p>{formatCurrency(employee.salary, true)}</p></div>
                             {details.earnings.map((e: PayrollEntry) => (
                                 <div key={e.id} className="flex justify-between"><p>{e.description}</p> <p>{formatCurrency(e.value, true)}</p></div>
                             ))}
                        </div>
                         <div className="space-y-2 p-3 bg-rose-50/50 rounded-lg border border-rose-200">
                             <h4 className="font-bold text-rose-800 border-b pb-1 mb-2">Descontos</h4>
                             {details.manualDeductions.map((d: PayrollEntry) => (
                                 <div key={d.id} className="flex justify-between"><p>{d.description}</p> <p>{formatCurrency(d.value, true)}</p></div>
                             ))}
                             <div className="flex justify-between"><p>INSS</p> <p>{formatCurrency(details.inss, true)}</p></div>
                             <div className="flex justify-between"><p>IRRF</p> <p>{formatCurrency(details.irrf, true)}</p></div>
                        </div>
                    </div>
                    <div className="grid grid-cols-3 gap-2 mt-4 font-semibold text-center">
                        <div className="p-2 bg-slate-100 rounded">
                            <p className="text-slate-500 text-xs">Total Vencimentos</p>
                            <p>{formatCurrency(grossSalary, true)}</p>
                        </div>
                        <div className="p-2 bg-slate-100 rounded">
                            <p className="text-slate-500 text-xs">Total Descontos</p>
                            <p>{formatCurrency(totalDeductions, true)}</p>
                        </div>
                        <div className="p-2 bg-blue-100 rounded text-blue-800">
                            <p className="text-xs">Valor Líquido</p>
                            <p className="font-bold">{formatCurrency(netSalary, true)}</p>
                        </div>
                    </div>
                </div>
            </Modal>
        );
    }

    return (
        <div className="animate-fade-in space-y-6">
            <PayrollDetailsModal />
            <h1 className="text-3xl font-bold text-slate-800">Folha de Pagamento</h1>
             <div className="bg-white p-4 rounded-xl shadow-sm border flex items-center gap-4">
                <label className="font-semibold">Competência:</label>
                <select value={selectedMonth} onChange={e => setSelectedMonth(Number(e.target.value))} className="p-2 border rounded-lg">
                    {PT_BR_MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
                </select>
                <input type="number" value={selectedYear} onChange={e => setSelectedYear(Number(e.target.value))} className="p-2 border rounded-lg w-24"/>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <StatCard title="Total Bruto" value={formatCurrency(payrollSummary.gross, true)} icon={<Icon path={ICONS.trendingUp}/>} color="indigo"/>
                <StatCard title="Total Descontos" value={formatCurrency(payrollSummary.deductions, true)} icon={<Icon path={ICONS.trendingDown}/>} color="rose"/>
                <StatCard title="Total Líquido" value={formatCurrency(payrollSummary.net, true)} icon={<Icon path={ICONS.balance}/>} color="emerald"/>
            </div>
             <div className="bg-white p-4 rounded-xl shadow-sm border">
                 <h2 className="text-xl font-bold text-slate-700 mb-4 px-2 pt-2">Resumo da Folha</h2>
                 <table className="w-full text-sm">
                     <thead className="text-xs text-slate-500 uppercase bg-slate-100">
                        <tr>
                            <th className="px-4 py-3 text-left">Colaborador</th>
                            <th className="px-4 py-3 text-right">Salário Bruto</th>
                            <th className="px-4 py-3 text-right">Descontos</th>
                            <th className="px-4 py-3 text-right">Salário Líquido</th>
                            <th className="px-4 py-3 text-center">Ações</th>
                        </tr>
                    </thead>
                    <tbody>
                        {payrollData.map(data => (
                            <tr key={data.employee.id} className="border-b hover:bg-slate-50">
                                <td className="px-4 py-2 font-medium">{data.employee.name}</td>
                                <td className="px-4 py-2 text-right">{formatCurrency(data.grossSalary, true)}</td>
                                <td className="px-4 py-2 text-right text-rose-600">{formatCurrency(data.totalDeductions, true)}</td>
                                <td className="px-4 py-2 text-right font-bold text-emerald-700">{formatCurrency(data.netSalary, true)}</td>
                                <td className="px-4 py-2 text-center">
                                    <button onClick={() => openDetailsModal(data)} className="text-indigo-600 hover:underline text-xs font-semibold">Ver Detalhes</button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                 </table>
                  {payrollData.length === 0 && <p className="text-center py-8 text-slate-500">Nenhum colaborador ativo para esta competência.</p>}
             </div>
        </div>
    );
};


export default function HRModule() {
    const [hrView, setHrView] = useState<HRView>('employees');

    const NavItem = ({ targetView, icon, label }: { targetView: HRView, icon: React.ReactNode, label: string }) => (
        <li className="mb-1">
            <button onClick={() => setHrView(targetView)} className={`w-full flex items-center p-3 rounded-lg transition-all duration-200 ${hrView === targetView ? 'bg-[rgb(150,25,29)] text-white' : 'text-red-100 hover:bg-white/10 hover:text-white'}`}>
                {icon}
                <span className="ml-4 font-medium">{label}</span>
            </button>
        </li>
    );

    const renderView = () => {
        switch (hrView) {
            case 'employees':
                return <EmployeeManagementView />;
            case 'payrollEntries':
                return <PayrollEntriesView />;
            case 'payroll':
                return <PayrollView />;
            default:
                return <EmployeeManagementView />;
        }
    };

    return (
        <div className="flex flex-1 overflow-hidden">
            <aside className="w-64 bg-[rgb(150,25,29)] border-r border-red-900/50 p-4 flex flex-col justify-between shadow-lg shrink-0">
                <div>
                    <div className="flex items-center justify-between mb-8 px-2">
                        <span className="text-xl font-bold text-white">Departamento Pessoal</span>
                    </div>
                    <ul className="space-y-1">
                        <NavItem targetView="employees" icon={<Icon path={ICONS.hr} />} label="Colaboradores" />
                        <NavItem targetView="payrollEntries" icon={<Icon path={ICONS.transactions} className="w-6 h-6 transform rotate-180" />} label="Lançamentos" />
                        <NavItem targetView="payroll" icon={<Icon path={ICONS.bills} />} label="Folha de Pagamento" />
                    </ul>
                </div>
            </aside>
            <main className="flex-1 p-8 overflow-y-auto bg-slate-50">
                {renderView()}
            </main>
        </div>
    );
}
