import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { materialsApi, movementsApi } from '../../services/api';
import { Plus, ArrowLeftRight, Pencil, X, AlertTriangle } from 'lucide-react';
import type { Material, MovementType } from '../../types';

const materialSchema = z.object({
  name: z.string().min(2),
  description: z.string().optional(),
  unit: z.string().min(1),
  category: z.string().min(1),
  currentStock: z.coerce.number().min(0),
  minStock: z.coerce.number().min(0),
  maxStock: z.coerce.number().optional(),
  sku: z.string().optional(),
});
type MaterialForm = z.infer<typeof materialSchema>;

const movementSchema = z.object({
  type: z.enum(['IN', 'OUT', 'ADJUSTMENT']),
  quantity: z.coerce.number().min(1),
  reason: z.string().optional(),
});
type MovementForm = z.infer<typeof movementSchema>;

function Modal({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: React.ReactNode }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white">
          <h3 className="font-semibold text-gray-900">{title}</h3>
          <button onClick={onClose}><X size={20} className="text-gray-400" /></button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}

export default function StockManagement() {
  const qc = useQueryClient();
  const [matModal, setMatModal] = useState(false);
  const [movModal, setMovModal] = useState(false);
  const [editing, setEditing] = useState<Material | null>(null);
  const [selectedMat, setSelectedMat] = useState<Material | null>(null);
  const [search, setSearch] = useState('');

  const { data: materials = [], isLoading } = useQuery({
    queryKey: ['materials'],
    queryFn: () => materialsApi.list().then((r) => r.data),
  });

  const { register: regMat, handleSubmit: hsMat, reset: resetMat, formState: { errors: matErrors } } = useForm<MaterialForm>({ resolver: zodResolver(materialSchema) });
  const { register: regMov, handleSubmit: hsMov, reset: resetMov } = useForm<MovementForm>({ resolver: zodResolver(movementSchema) });

  const createMat = useMutation({
    mutationFn: (d: MaterialForm) => materialsApi.create(d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['materials'] }); setMatModal(false); resetMat(); },
  });

  const updateMat = useMutation({
    mutationFn: (d: MaterialForm) => {
      if (!editing) throw new Error('No material selected for editing');
      return materialsApi.update(editing.id, d);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['materials'] }); setMatModal(false); setEditing(null); resetMat(); },
  });

  const createMov = useMutation({
    mutationFn: (d: MovementForm) =>
      movementsApi.create({ materialId: selectedMat!.id, type: d.type as MovementType, quantity: d.quantity, reason: d.reason }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['materials'] }); setMovModal(false); setSelectedMat(null); resetMov(); },
  });

  const openCreate = () => { setEditing(null); resetMat({ name: '', unit: '', category: '', currentStock: 0, minStock: 0 }); setMatModal(true); };
  const openEdit = (m: Material) => { setEditing(m); resetMat({ name: m.name, description: m.description || '', unit: m.unit, category: m.category, currentStock: m.currentStock, minStock: m.minStock, maxStock: m.maxStock, sku: m.sku || '' }); setMatModal(true); };
  const openMovement = (m: Material) => { setSelectedMat(m); resetMov({ type: 'IN', quantity: 1 }); setMovModal(true); };

  const filtered = materials.filter((m) =>
    m.name.toLowerCase().includes(search.toLowerCase()) ||
    m.category.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gestão de Estoque</h1>
          <p className="text-sm text-gray-500 mt-1">Materiais e movimentações</p>
        </div>
        <button className="btn-primary" onClick={openCreate}>
          <Plus size={16} /> Novo Material
        </button>
      </div>

      <div className="flex gap-3">
        <input
          className="input max-w-xs"
          placeholder="Buscar materiais..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="card p-0">
        <div className="table-container">
          {isLoading ? (
            <div className="p-8 text-center text-gray-400">Carregando...</div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Material</th>
                  <th>Categoria</th>
                  <th>Unidade</th>
                  <th>Estoque</th>
                  <th>Mínimo</th>
                  <th>Status</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((m) => (
                  <tr key={m.id}>
                    <td>
                      <div>
                        <p className="font-medium text-gray-900">{m.name}</p>
                        {m.sku && <p className="text-xs text-gray-400">SKU: {m.sku}</p>}
                      </div>
                    </td>
                    <td><span className="badge bg-gray-100 text-gray-700">{m.category}</span></td>
                    <td className="text-gray-500">{m.unit}</td>
                    <td>
                      <span className={`font-semibold ${m.currentStock <= m.minStock ? 'text-red-600' : 'text-gray-900'}`}>
                        {m.currentStock}
                      </span>
                    </td>
                    <td className="text-gray-500">{m.minStock}</td>
                    <td>
                      {m.currentStock <= m.minStock ? (
                        <span className="badge bg-red-100 text-red-700 flex items-center gap-1 w-fit">
                          <AlertTriangle size={10} /> Crítico
                        </span>
                      ) : (
                        <span className="badge bg-green-100 text-green-700">Normal</span>
                      )}
                    </td>
                    <td>
                      <div className="flex gap-2">
                        <button
                          onClick={() => openMovement(m)}
                          className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded"
                          title="Movimentar estoque"
                        >
                          <ArrowLeftRight size={14} />
                        </button>
                        <button
                          onClick={() => openEdit(m)}
                          className="p-1.5 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded"
                          title="Editar material"
                        >
                          <Pencil size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Material Modal */}
      <Modal open={matModal} onClose={() => { setMatModal(false); setEditing(null); }} title={editing ? 'Editar Material' : 'Novo Material'}>
        <form onSubmit={hsMat((d) => editing ? updateMat.mutate(d) : createMat.mutate(d))} className="space-y-3">
          <div>
            <label className="label">Nome *</label>
            <input className={`input ${matErrors.name ? 'border-red-400' : ''}`} {...regMat('name')} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Unidade *</label>
              <input className="input" placeholder="un, kg, cx..." {...regMat('unit')} />
            </div>
            <div>
              <label className="label">Categoria *</label>
              <input className="input" {...regMat('category')} />
            </div>
            <div>
              <label className="label">Estoque Atual</label>
              <input type="number" className="input" {...regMat('currentStock')} />
            </div>
            <div>
              <label className="label">Estoque Mínimo</label>
              <input type="number" className="input" {...regMat('minStock')} />
            </div>
            <div>
              <label className="label">Estoque Máximo</label>
              <input type="number" className="input" {...regMat('maxStock')} />
            </div>
            <div>
              <label className="label">SKU</label>
              <input className="input" {...regMat('sku')} />
            </div>
          </div>
          <div>
            <label className="label">Descrição</label>
            <textarea className="input resize-none h-20" {...regMat('description')} />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" className="btn-secondary flex-1" onClick={() => { setMatModal(false); setEditing(null); }}>Cancelar</button>
            <button type="submit" className="btn-primary flex-1">Salvar</button>
          </div>
        </form>
      </Modal>

      {/* Movement Modal */}
      <Modal open={movModal} onClose={() => { setMovModal(false); setSelectedMat(null); }} title={`Movimentar: ${selectedMat?.name}`}>
        <form onSubmit={hsMov((d) => createMov.mutate(d))} className="space-y-4">
          <div>
            <label className="label">Tipo</label>
            <select className="input" {...regMov('type')}>
              <option value="IN">Entrada</option>
              <option value="OUT">Saída</option>
              <option value="ADJUSTMENT">Ajuste</option>
            </select>
          </div>
          <div>
            <label className="label">Quantidade</label>
            <input type="number" className="input" {...regMov('quantity')} />
          </div>
          <div>
            <label className="label">Motivo</label>
            <input className="input" {...regMov('reason')} />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" className="btn-secondary flex-1" onClick={() => { setMovModal(false); setSelectedMat(null); }}>Cancelar</button>
            <button type="submit" className="btn-primary flex-1">Registrar</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
