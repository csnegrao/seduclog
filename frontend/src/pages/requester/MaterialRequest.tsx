import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { requestsApi, materialsApi } from '../../services/api';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Trash2, Send, AlertCircle } from 'lucide-react';
import type { Material } from '../../types';

const schema = z.object({
  destination: z.string().min(1, 'Destino obrigatório'),
  priority: z.enum(['LOW', 'NORMAL', 'HIGH', 'URGENT']),
  notes: z.string().optional(),
  items: z.array(z.object({
    materialId: z.string().min(1, 'Selecione um material'),
    quantity: z.coerce.number().min(1, 'Quantidade mínima 1'),
  })).min(1, 'Adicione pelo menos um item'),
});
type FormData = z.infer<typeof schema>;

export default function MaterialRequest() {
  const qc = useQueryClient();
  const [success, setSuccess] = useState(false);

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
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      priority: 'NORMAL',
      items: [{ materialId: '', quantity: 1 }],
    },
  });

  const { fields, append, remove } = useFieldArray({ control, name: 'items' });

  const mutation = useMutation({
    mutationFn: (data: FormData) => requestsApi.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['requests'] });
      reset();
      setSuccess(true);
      setTimeout(() => setSuccess(false), 5000);
    },
  });

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Novo Pedido de Material</h1>
        <p className="text-sm text-gray-500 mt-1">Solicite materiais ao almoxarifado</p>
      </div>

      {success && (
        <div className="flex items-center gap-2 p-4 bg-green-50 border border-green-200 rounded-xl text-green-700">
          <AlertCircle size={18} />
          <p className="font-medium">Pedido enviado com sucesso! Aguarde aprovação.</p>
        </div>
      )}

      <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="card space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <label className="label">Destino / Local de Entrega *</label>
            <input
              className={`input ${errors.destination ? 'border-red-400' : ''}`}
              placeholder="Ex: Escola Municipal João Paulo, Rua..."
              {...register('destination')}
            />
            {errors.destination && (
              <p className="text-red-500 text-xs mt-1">{errors.destination.message}</p>
            )}
          </div>

          <div>
            <label className="label">Prioridade</label>
            <select className="input" {...register('priority')}>
              <option value="LOW">Baixa</option>
              <option value="NORMAL">Normal</option>
              <option value="HIGH">Alta</option>
              <option value="URGENT">Urgente</option>
            </select>
          </div>

          <div>
            <label className="label">Observações</label>
            <input className="input" placeholder="Informações adicionais..." {...register('notes')} />
          </div>
        </div>

        {/* Items */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <label className="label mb-0">Itens Solicitados *</label>
            <button
              type="button"
              className="btn-secondary text-xs py-1"
              onClick={() => append({ materialId: '', quantity: 1 })}
            >
              <Plus size={14} /> Adicionar Item
            </button>
          </div>

          {errors.items?.root && (
            <p className="text-red-500 text-xs mb-2">{errors.items.root.message}</p>
          )}

          <div className="space-y-3">
            {fields.map((field, index) => (
              <div key={field.id} className="flex gap-3 items-start p-3 bg-gray-50 rounded-xl">
                <div className="flex-1">
                  <select
                    className={`input text-sm ${errors.items?.[index]?.materialId ? 'border-red-400' : ''}`}
                    {...register(`items.${index}.materialId`)}
                  >
                    <option value="">Selecione o material...</option>
                    {materials.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name} ({m.unit}) — Estoque: {m.currentStock}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="w-24">
                  <input
                    type="number"
                    min={1}
                    className={`input text-sm ${errors.items?.[index]?.quantity ? 'border-red-400' : ''}`}
                    placeholder="Qtd"
                    {...register(`items.${index}.quantity`)}
                  />
                </div>
                {fields.length > 1 && (
                  <button
                    type="button"
                    onClick={() => remove(index)}
                    className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg"
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        <button
          type="submit"
          disabled={isSubmitting || mutation.isPending}
          className="btn-primary w-full py-3"
        >
          {mutation.isPending ? (
            <span className="flex items-center gap-2 justify-center">
              <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
              Enviando...
            </span>
          ) : (
            <span className="flex items-center gap-2 justify-center">
              <Send size={16} /> Enviar Pedido
            </span>
          )}
        </button>
      </form>
    </div>
  );
}
