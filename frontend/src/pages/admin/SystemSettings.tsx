export default function SystemSettings() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Configurações do Sistema</h1>
        <p className="text-sm text-gray-500 mt-1">Parâmetros gerais do sistema</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card space-y-4">
          <h2 className="font-semibold text-gray-800">Informações da Organização</h2>
          <div>
            <label className="label">Nome da Organização</label>
            <input className="input" defaultValue="SEDUC — Secretaria da Educação" />
          </div>
          <div>
            <label className="label">E-mail de Suporte</label>
            <input type="email" className="input" defaultValue="suporte@seduc.gov.br" />
          </div>
          <button className="btn-primary">Salvar</button>
        </div>

        <div className="card space-y-4">
          <h2 className="font-semibold text-gray-800">Notificações</h2>
          <label className="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" className="w-4 h-4 text-blue-600" defaultChecked />
            <span className="text-sm text-gray-700">Notificar operador ao aprovar pedido</span>
          </label>
          <label className="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" className="w-4 h-4 text-blue-600" defaultChecked />
            <span className="text-sm text-gray-700">Alertas de estoque mínimo</span>
          </label>
          <label className="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" className="w-4 h-4 text-blue-600" />
            <span className="text-sm text-gray-700">E-mail ao solicitante após entrega</span>
          </label>
          <button className="btn-primary">Salvar</button>
        </div>

        <div className="card space-y-4">
          <h2 className="font-semibold text-gray-800">Armazenamento</h2>
          <p className="text-sm text-gray-500">
            Configure o provedor de armazenamento para assinaturas e documentos.
          </p>
          <div>
            <label className="label">Provedor</label>
            <select className="input">
              <option>AWS S3</option>
              <option>Cloudinary</option>
              <option>Local</option>
            </select>
          </div>
          <button className="btn-primary">Salvar</button>
        </div>

        <div className="card space-y-4">
          <h2 className="font-semibold text-gray-800">Google Maps</h2>
          <div>
            <label className="label">API Key</label>
            <input type="password" className="input" placeholder="AIza..." />
          </div>
          <button className="btn-primary">Salvar</button>
        </div>
      </div>
    </div>
  );
}
