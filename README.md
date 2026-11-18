# Gestão de Frotas

Aplicação web para o controle de veículos, motoristas, utilizações, abastecimentos e manutenções de uma frota. Concentra as informações, acompanha a disponibilidade dos veículos e apresenta indicadores de operação e de custos, incluindo o custo por quilometro, assim como pedido no arquivo oficial.

Projeto desenvolvido como desafio técnico e avaliativo. Autor: [John Kerry Dantas Silva].

## Tecnologias

| Camada | Tecnologia |
|---|---|
| Front-end | HTML5, CSS3 e JavaScript puro (sem frameworks) |
| Back-end | Node.js e Express (com CORS) |
| Banco de dados | MySQL 8 (driver `mysql2`) |
| Configuração | `dotenv` |

## Estrutura do projeto

```text
Gestão de Frotas/
├── banco/
│   └── schema.sql              # criação do banco e das tabelas
├── back-end/
│   ├── config/database.js      # conexão com o MySQL
│   ├── controllers/            # regras de negócio de cada módulo
│   ├── routes/                 # rotas da API
│   ├── .env.example            # modelo das variáveis de ambiente
│   └── server.js
└── front-end/
    ├── index.html
    ├── css/style.css           # arquivos para criação da interface
    └── js/                       da aplicação
```

## Como executar

### Pré-requisitos

- Node.js 18 ou superior
- MySQL 8 em execução

### 1. Criação do banco de dados

Execute o arquivo `banco/schema.sql` no MySQL. Pelo MySQL Workbench: **File > Open SQL Script**, escolha o arquivo e clique no ícone de raio. Pelo terminal:

```bash
mysql -u root -p < banco/schema.sql
```

### 2. Configuração e iniciação do back-end

```bash
cd back-end
npm install
```

Crie o arquivo `.env` a partir do modelo e informe a sua senha do MySQL:

```bash
cp .env.example .env
```

(No Windows, copie o arquivo `.env.example` e renomeie a cópia para `.env`.)

Inicie o servidor:

```bash
node server.js
```

A mensagem **"Banco de dados conectado com sucesso!"** informa que está tudo certo. A API fica em `http://localhost:3000`. Para reiniciar automaticamente a cada alteração durante o desenvolvimento, use `npx nodemon server.js`.

### 3. Abrir o front-end

Abra o arquivo `front-end/index.html` no navegador (ou use a extensão Live Server do VS Code). O painel acessa a API em `http://localhost:3000`, então o back-end precisa estar em execução.

## Funcionalidades

- **Veículos:** cadastrar, consultar, editar e excluir (placa, marca, modelo, ano, quilometragem, tipo de combustível e status).
- **Motoristas:** cadastrar, consultar, editar e excluir (nome, CNH, validade da CNH, telefone e status ativo/inativo). A CNH vencida aparece destacada.
- **Utilizações:** registrar a saída e o retorno de veículos, com histórico.
- **Abastecimentos:** registrar e consultar o histórico, com o total gasto por veículo.
- **Manutenções:** registrar manutenções preventivas e corretivas, acompanhar o status (pendente, em andamento, concluída) e ver o total gasto por veículo.
- **Dashboard:** veículos por status, gasto com combustível, gasto com manutenção, custo total, quantidade de utilizações e o indicador de **custo por km**.

## Regras de negócio implementadas

Todas as regras são aplicadas **no servidor**. A interface apenas facilita a escolha das opções, mas nunca é ela que decide.

| Regra | Como é garantida |
|---|---|
| Um veículo não pode ter duas utilizações abertas | Verificação dentro de uma transação, com bloqueio da linha do veículo |
| Um motorista não pode ter duas utilizações abertas | Verificação dentro de uma transação, com bloqueio da linha do motorista |
| Motorista inativo ou com CNH vencida não faz nova saída | Verificação na saída (a CNH vale até o fim do dia da validade) |
| Veículo em manutenção não inicia nova utilização | Verificação na saída |
| No retorno, a quilometragem final não pode ser menor que a inicial | Verificação no retorno; o sistema atualiza a quilometragem do veículo e o devolve para "Disponível" |
| Abastecimentos com litros e valor maiores que zero | Validação no servidor |
| Registros consistentes mesmo com operações inválidas | Transações (tudo ou nada) e validações antes de qualquer gravação |

Outras validações: placa (formato antigo e Mercosul), ano, quilometragem não negativa, CNH com 11 dígitos, validade da CNH como data real, datas de abastecimento e de manutenção concluída ou em andamento que não podem estar no futuro, tipo e status válidos, e bloqueio de exclusão de veículos e motoristas que já têm histórico.

## Indicador de custo por quilômetro

```text
Custo por km = (abastecimentos + manutenções concluídas) / km percorridos
```

O usuário escolhe uma **data inicial e uma data final** (o período é inclusivo) e o sistema mostra o resultado **por veículo**, mais o total da frota.

- **Gastos:** abastecimentos e manutenções **concluídas** cuja data cai dentro do período.
- **Km percorridos:** soma de (km final − km inicial) das utilizações **encerradas** cuja data de retorno cai no mesmo período. Utilizações em aberto não entram, porque ainda não têm quilometragem final.
- **Veículo sem km percorrido no período:** não há divisão por zero. A tela mostra "Sem km percorrido", e os gastos continuam visíveis.

## Decisões técnicas

1. **Stack simples.** HTML, CSS e JavaScript puro no front-end, e Node com Express no back-end, para manter o código fácil de ler, explicar e manter.

2. **Separação em camadas.** As rotas apenas direcionam as chamadas, os controllers concentram as regras de negócio, e o acesso ao banco passa por um pool de conexões. No front-end, cada tela tem o seu arquivo JavaScript.

3. **O servidor é a fonte da verdade.** As listas da interface (por exemplo, só veículos disponíveis na saída) são uma conveniência. Se a tela estiver desatualizada, o servidor consulta o estado real do banco e recusa a operação inválida.

4. **Transações e bloqueio de linhas.** Saídas, retornos e mudanças de status de manutenção alteram mais de uma tabela. Elas rodam em transações com `SELECT ... FOR UPDATE`, para que nunca fique um registro pela metade e para que duas pessoas usando o sistema ao mesmo tempo não consigam burlar as regras.

5. **Status do veículo controlado pelo sistema.** O status é uma consequência das utilizações e das manutenções, e não um campo editável. Veículo novo começa "Disponível"; a saída o coloca "Em uso"; o retorno o libera; a manutenção em andamento o coloca "Em manutenção"; e a conclusão da manutenção o libera.

6. **Menos digitação, menos inconsistência.** Na saída, a data e a hora vêm do servidor e a quilometragem inicial é a do veículo. No abastecimento, o tipo de combustível vem do cadastro do veículo e o valor por litro é calculado (valor pago ÷ litros).

7. **Histórico preservado.** Utilizações, abastecimentos e manutenções guardam a quilometragem do momento em que ocorreram, e editar o cadastro do veículo não reescreve o passado. Veículos e motoristas com histórico não podem ser excluídos, e o motorista pode ser inativado.

8. **Segurança básica.** Consultas SQL parametrizadas (contra injeção de SQL) e escape de HTML ao exibir dados (contra XSS).

9. **Datas sem erro de fuso horário.** O servidor formata as datas como texto antes de enviá-las ao navegador.

## API

| Módulo | Rotas |
|---|---|
| Veículos | `GET /api/veiculos`, `POST /api/veiculos`, `PUT /api/veiculos/:id`, `DELETE /api/veiculos/:id` |
| Motoristas | `GET /api/motoristas`, `POST /api/motoristas`, `PUT /api/motoristas/:id`, `DELETE /api/motoristas/:id` |
| Utilizações | `GET /api/utilizacoes`, `POST /api/utilizacoes` (saída), `PUT /api/utilizacoes/:id/retorno` |
| Abastecimentos | `GET /api/abastecimentos`, `GET /api/abastecimentos/totais`, `POST /api/abastecimentos` |
| Manutenções | `GET /api/manutencoes`, `GET /api/manutencoes/totais`, `POST /api/manutencoes`, `PUT /api/manutencoes/:id/status` |
| Dashboard | `GET /api/dashboard`, `GET /api/dashboard/custo-por-km?inicio=AAAA-MM-DD&fim=AAAA-MM-DD` |

## Testes realizados

Os testes foram feitos manualmente, com o Thunder Client (chamadas diretas à API) e pelo próprio painel: cadastros válidos e inválidos de todos os módulos, cada regra de negócio da saída e do retorno, o bloqueio de uma saída com a tela desatualizada, a mudança de status do veículo por utilizações e manutenções, e a conferência dos totais do dashboard com os valores das telas. Não há testes automatizados.

## Limitações e melhorias futuras

- Não há autenticação: o painel assume um usuário administrador.
- Utilizações, abastecimentos e manutenções não podem ser editados nem excluídos (apenas o status da manutenção avança). Isso preserva o histórico, mas uma correção exigiria uma nova funcionalidade.
- A quilometragem do cadastro do veículo pode ser editada para um valor menor. Isso é útil para corrigir digitação, mas permite que o hodômetro "volte atrás".
- Algumas colunas do banco (CPF, destino, observações, posto, oficina) existem na estrutura, mas não são usadas pela interface.
- O custo por km é apresentado em tabela, sem gráfico.
- Não há paginação nas listagens.
- Datas e horas usam o fuso horário da máquina em que o servidor roda.