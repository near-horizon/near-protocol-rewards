Faça as seguintes modificações no código de lambda:
1. Quero que puxe os dados do data.json ao invés de um .env agora
2. Separe em arquivos as funções, de captação de dados OnChain e OffChain
3. Faça que ao invés de onchain_offchain_data.py seja um main.py onde só será para calcular os rewards e fazer a parte de orquestração
4. Na parte de offchain (Github) permitir que tenha N repositórios por projeto, e que no final o calculo seja pela soma de dados deles.
5. Não deve mudar nenhuma forma lógica de cálculo ou de parte base dos dados, apenas fazer as separações e adicionar a nova funcionalidade de N repositórios por projetos
6. Ao final, permitir que ele faça o cálculo pelo mês atual dinamicamente.