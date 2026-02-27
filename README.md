# seduclog
Applicativo de acompanhamento e gerenciamento de entregas.

## Stack de produção

| Componente  | Tecnologia          |
|-------------|---------------------|
| Web server  | LiteSpeed           |
| Banco de dados | MariaDB          |
| Linguagem   | PHP 8+              |

## Configuração rápida (desenvolvimento local com Docker)

1. Copie o arquivo de variáveis de ambiente:
   ```bash
   cp .env.example .env
   ```
2. Edite `.env` com as suas credenciais.

3. Suba os containers:
   ```bash
   docker compose up -d
   ```

4. Acesse `http://localhost` no navegador.  
   O painel de administração do LiteSpeed está disponível em `http://localhost:7080`.

## Implantação em produção (LiteSpeed + MariaDB)

1. Copie os arquivos da aplicação para o diretório raiz do virtual host configurado no LiteSpeed.
2. Copie `.env.example` para `.env` e preencha as variáveis com os dados reais do servidor.
3. Execute o script de inicialização do banco:
   ```bash
   mysql -u root -p seduclog < docker/mariadb/init.sql
   ```
4. Certifique-se de que o LiteSpeed está configurado para carregar `.htaccess`
   (`autoLoadHtaccess` habilitado no virtual host).
5. O arquivo `.htaccess` na raiz do projeto faz o roteamento para `index.php` e
   aplica cabeçalhos de segurança.

## Variáveis de ambiente

| Variável       | Descrição                         | Padrão         |
|----------------|-----------------------------------|----------------|
| `DB_HOST`      | Host do MariaDB                   | `127.0.0.1`    |
| `DB_PORT`      | Porta do MariaDB                  | `3306`         |
| `DB_DATABASE`  | Nome do banco de dados            | `seduclog`     |
| `DB_USERNAME`  | Usuário do banco                  | `seduclog_user`|
| `DB_PASSWORD`  | Senha do banco                    | _(obrigatório)_|
