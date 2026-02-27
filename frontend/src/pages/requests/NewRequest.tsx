import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Trash2, Send, CheckCircle, Search } from 'lucide-react';
import { requestsApi, materialsApi } from '../../services/api';
import type { Material } from '../../types';

const schema = z.object({
  items: z
    .array(
      z.object({
        materialId: z.string().min(1, 'Selecione um material'),
        requestedQty: z.coerce.number().min(1, 'Mínimo 1'),
        notes: z.string().optional(),
      })
    )
    .min(1, 'Adicione pelo menos um item'),
  desiredDate: z.string().min(1, 'Data desejada obrigatória'),
  justification: z
    .string()
    .min(10, 'Justificativa deve ter ao menos 10 caracteres'),
  notes: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

export default function NewRequest() {
  const qc = useQueryClient();
  const [success, setSuccess] = useState(false);
  const [search, setSearch] = useState('');

  const { data: materials = [] } = useQuery<Material[]>({
    queryKey: ['materials'],
    queryFn: () => materialsApi.list().then((r) => r.data),
  });

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
    watch,
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      items: [{ materialId: '', requestedQty: 1 }],
      desiredDate: '',
      justification: '',
    },
  });

  const { fields, append, remove } = useFieldArray({ control, name: 'items' });
  const watchedItems = watch('items');

  const filteredMaterials = useMemo(() => {
    if (!search.trim()) return materials;
    const lower = search.toLowerCase();
    return materials.filter(
      (m) =>
        m.name.toLowerCase().includes(lower) ||
        m.category.toLowerCase().includes(lower) ||
        m.sku?.toLowerCase().includes(lower)
    );
  }, [materials, search]);

  const mutation = useMutation({
    mutationFn: (data: FormData) => requestsApi.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['requests'] });
      reset();
      setSuccess(true);
      setTimeout(() => setSuccess(false), 8000);
    },
  });

  const today = new Date().toISOString().split('T')[0];

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Nova Requisição</h1>
        <p className="text-sm text-gray-500 mt-1">
          Solicite materiais ao almoxarifado — todos os campos marcados com * são obrigatórios.
        </p>
      </div>

      {success && (
        <div className="flex items-start gap-3 p-4 bg-green-50 border border-green-200 rounded-xl text-green-800">
          <CheckCircle className="shrink-0 mt-0.5" size={18} />
          <div>
            <p className="font-medium">Requisição enviada com sucesso!</p>
            <p className="text-sm text-green-700 mt-0.5">
              Seu pedido foi registrado e será analisado pelo almoxarife.
            </p>
          </div>
        </div>
      )}

      {mutation.isError && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
          {(mutation.error as { response?: { data?: { error?: string; details?: string[] } } })?.response?.data?.error ??
            'Erro ao enviar requisição.'}
          {(mutation.error as { response?: { data?: { details?: string[] } } })?.response?.data?.details && (
            <ul className="mt-2 list-disc list-inside">
              {(mutation.error as { response?: { data?: { details?: string[] } } })?.response?.data?.details?.map(
                (d, i) => <li key={i}>{d}</li>
              )}
            </ul>
          )}
        </div>
      )}

      <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="space-y-6">
        {/* ── Items Section ──────────────────────────────────────── */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-900">Itens Solicitados *</h2>
            <button
              type="button"
              className="btn-secondary text-xs py-1.5"
              onClick={() => append({ materialId: '', requestedQty: 1 })}
            >
              <Plus size={14} /> Adicionar Item
            </button>
          </div>

          {/* Search box */}
          <div className="relative mb-3">
            <Search className="absolute left-3 top-2.5 text-gray-400" size={16} />
            <input
              className="input pl-9 text-sm"
              placeholder="Pesquisar materiais por nome, categoria ou código..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {errors.items?.root && (
            <p className="text-red-500 text-xs mb-2">{errors.items.root.message}</p>
          )}

          <div className="space-y-3">
            {fields.map((field, index) => {
              const selectedId = watchedItems[index]?.materialId;
              const selectedMat = materials.find((m) => m.id === selectedId);

              return (
                <div
                  key={field.id}
                  className="flex gap-2 items-start p-3 bg-gray-50 rounded-xl border border-gray-100"
                >
                  <div className="flex-1 min-w-0">
                    <Controller
                      control={control}
                      name={`items.${index}.materialId`}
                      render={({ field: f }) => (
                        <select
                          {...f}
                          className={`input text-sm ${
                            errors.items?.[index]?.materialId ? 'border-red-400' : ''
                          }`}
                        >
                          <option value="">Selecione o material...</option>
                          {filteredMaterials.map((m) => (
                            <option key={m.id} value={m.id}>
                              {m.name} ({m.unit}) — Estoque: {m.currentStock}
                            </option>
                          ))}
                        </select>
                      )}
                    />
                    {selectedMat && selectedMat.currentStock <= selectedMat.minStock && (
                      <p className="text-amber-600 text-xs mt-1">
                        ⚠️ Estoque baixo: {selectedMat.currentStock} {selectedMat.unit} disponível(is)
                      </p>
                    )}
                    {errors.items?.[index]?.materialId && (
                      <p className="text-red-500 text-xs mt-1">
                        {errors.items[index]?.materialId?.message}
                      </p>
                    )}
                  </div>

                  <div className="w-24 shrink-0">
                    <input
                      type="number"
                      min={1}
                      className={`input text-sm text-center ${
                        errors.items?.[index]?.requestedQty ? 'border-red-400' : ''
                      }`}
                      placeholder="Qtd"
                      {...register(`items.${index}.requestedQty`)}
                    />
                    {errors.items?.[index]?.requestedQty && (
                      <p className="text-red-500 text-xs mt-1">
                        {errors.items[index]?.requestedQty?.message}
                      </p>
                    )}
                  </div>

                  {fields.length > 1 && (
                    <button
                      type="button"
                      onClick={() => remove(index)}
                      className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors shrink-0"
                      title="Remover item"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Delivery Info ──────────────────────────────────────── */}
        <div className="card space-y-4">
          <h2 className="font-semibold text-gray-900">Informações da Entrega</h2>

          <div>
            <label className="label">Data Desejada para Entrega *</label>
            <input
              type="date"
              className={`input ${errors.desiredDate ? 'border-red-400' : ''}`}
              min={today}
              {...register('desiredDate')}
            />
            {errors.desiredDate && (
              <p className="text-red-500 text-xs mt-1">{errors.desiredDate.message}</p>
            )}
          </div>

          <div>
            <label className="label">
              Justificativa *{' '}
              <span className="text-xs font-normal text-gray-400">(mínimo 10 caracteres)</span>
            </label>
            <textarea
              rows={4}
              className={`input resize-none ${errors.justification ? 'border-red-400' : ''}`}
              placeholder="Descreva o motivo da solicitação, para qual finalidade os materiais serão usados..."
              {...register('justification')}
            />
            {errors.justification && (
              <p className="text-red-500 text-xs mt-1">{errors.justification.message}</p>
            )}
          </div>

          <div>
            <label className="label">Observações (opcional)</label>
            <input
              className="input"
              placeholder="Informações adicionais para o almoxarife..."
              {...register('notes')}
            />
          </div>
        </div>

        {/* ── Submit ─────────────────────────────────────────────── */}
        <button
          type="submit"
          disabled={isSubmitting || mutation.isPending}
          className="btn-primary w-full py-3 text-base"
        >
          {mutation.isPending ? (
            <span className="flex items-center gap-2 justify-center">
              <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
              Enviando...
            </span>
          ) : (
            <span className="flex items-center gap-2 justify-center">
              <Send size={16} /> Enviar Requisição
            </span>
          )}
        </button>
      </form>
    </div>
  );
}
