import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { usersApi } from '../../services/api';
import { UserPlus, Pencil, Power, X } from 'lucide-react';
import type { User, Role } from '../../types';

const schema = z.object({
  name: z.string().min(2, 'Nome obrigatório'),
  email: z.string().email('E-mail inválido'),
  password: z.string().min(6, 'Mínimo 6 caracteres').optional().or(z.literal('')),
  role: z.enum(['ADMIN', 'WAREHOUSE_OPERATOR', 'DRIVER', 'REQUESTER', 'MANAGER']),
  school: z.string().optional(),
  sector: z.string().optional(),
  phone: z.string().optional(),
});
type FormData = z.infer<typeof schema>;

const ROLES: { value: Role; label: string }[] = [
  { value: 'ADMIN', label: 'Administrador' },
  { value: 'WAREHOUSE_OPERATOR', label: 'Operador de Almoxarifado' },
  { value: 'DRIVER', label: 'Motorista' },
  { value: 'REQUESTER', label: 'Solicitante' },
  { value: 'MANAGER', label: 'Gestor' },
];

function Modal({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h3 className="font-semibold text-gray-900">{title}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={20} />
          </button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}

export default function UsersManagement() {
  const qc = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<User | null>(null);

  const { data: users = [], isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: () => usersApi.list().then((r) => r.data),
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  const createMutation = useMutation({
    mutationFn: (data: FormData) =>
      usersApi.create({ ...data, password: data.password || 'changeme123' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['users'] });
      setModalOpen(false);
      reset();
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: FormData) =>
      usersApi.update(editing!.id, { ...data, ...(data.password ? { password: data.password } : {}) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['users'] });
      setModalOpen(false);
      setEditing(null);
      reset();
    },
  });

  const toggleMutation = useMutation({
    mutationFn: (user: User) => usersApi.update(user.id, { active: !user.active }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['users'] }),
  });

  const openCreate = () => {
    setEditing(null);
    reset({ name: '', email: '', password: '', role: 'REQUESTER', school: '', sector: '', phone: '' });
    setModalOpen(true);
  };

  const openEdit = (user: User) => {
    setEditing(user);
    reset({ name: user.name, email: user.email, password: '', role: user.role, school: user.school || '', sector: user.sector || '', phone: user.phone || '' });
    setModalOpen(true);
  };

  const onSubmit = (data: FormData) => {
    if (editing) updateMutation.mutate(data);
    else createMutation.mutate(data);
  };

  const roleBadge: Record<Role, string> = {
    ADMIN: 'bg-purple-100 text-purple-700',
    WAREHOUSE_OPERATOR: 'bg-blue-100 text-blue-700',
    DRIVER: 'bg-green-100 text-green-700',
    REQUESTER: 'bg-gray-100 text-gray-700',
    MANAGER: 'bg-amber-100 text-amber-700',
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Usuários</h1>
          <p className="text-sm text-gray-500 mt-1">Gerenciar contas e permissões</p>
        </div>
        <button className="btn-primary" onClick={openCreate}>
          <UserPlus size={16} /> Novo Usuário
        </button>
      </div>

      <div className="card p-0">
        <div className="table-container">
          {isLoading ? (
            <div className="p-8 text-center text-gray-400">Carregando...</div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Nome</th>
                  <th>E-mail</th>
                  <th>Perfil</th>
                  <th>Escola/Setor</th>
                  <th>Status</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id}>
                    <td className="font-medium">{user.name}</td>
                    <td className="text-gray-500">{user.email}</td>
                    <td>
                      <span className={`badge ${roleBadge[user.role]}`}>
                        {ROLES.find((r) => r.value === user.role)?.label}
                      </span>
                    </td>
                    <td className="text-gray-500">{user.school || user.sector || '—'}</td>
                    <td>
                      <span className={`badge ${user.active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {user.active ? 'Ativo' : 'Inativo'}
                      </span>
                    </td>
                    <td>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => openEdit(user)}
                          className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded"
                          title="Editar"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          onClick={() => toggleMutation.mutate(user)}
                          className={`p-1.5 rounded ${user.active ? 'text-gray-400 hover:text-red-600 hover:bg-red-50' : 'text-gray-400 hover:text-green-600 hover:bg-green-50'}`}
                          title={user.active ? 'Desativar' : 'Ativar'}
                        >
                          <Power size={14} />
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

      <Modal
        open={modalOpen}
        onClose={() => { setModalOpen(false); setEditing(null); }}
        title={editing ? 'Editar Usuário' : 'Novo Usuário'}
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="label">Nome</label>
              <input className={`input ${errors.name ? 'border-red-400' : ''}`} {...register('name')} />
              {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>}
            </div>
            <div className="col-span-2">
              <label className="label">E-mail</label>
              <input type="email" className={`input ${errors.email ? 'border-red-400' : ''}`} {...register('email')} />
              {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>}
            </div>
            <div className="col-span-2">
              <label className="label">Senha {editing && '(deixe em branco para manter)'}</label>
              <input type="password" className="input" {...register('password')} />
              {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password.message}</p>}
            </div>
            <div className="col-span-2">
              <label className="label">Perfil</label>
              <select className="input" {...register('role')}>
                {ROLES.map((r) => (
                  <option key={r.value} value={r.value}>{r.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Escola</label>
              <input className="input" {...register('school')} />
            </div>
            <div>
              <label className="label">Setor</label>
              <input className="input" {...register('sector')} />
            </div>
            <div>
              <label className="label">Telefone</label>
              <input className="input" {...register('phone')} />
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              className="btn-secondary flex-1"
              onClick={() => { setModalOpen(false); setEditing(null); }}
            >
              Cancelar
            </button>
            <button type="submit" disabled={isSubmitting} className="btn-primary flex-1">
              {isSubmitting ? 'Salvando...' : editing ? 'Salvar' : 'Criar'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
