Crie uma API em Typescript com a seguinte arquitetura:

src/
 - api (onde iremos montar a api, no momento somente com um endpoint de health)
 - calculator: onde teremos 2 arquivos, onchain.ts para os dados em NEAR e offchain.ts para os dados do github
 - collector: onde teremos 2 arquivos, onchain.ts para dos dados em NEAR e offchain.ts para os dados github 
 - types: para colocar todos os tipos usados e modelos 
 - validators: onde terá a lógica para validar os dados de ambos os casos
 - utils: funções padrões que são reutilizadas durante o código

- Inicialmente apenas crie os arquivos e pastas, mas deixem os mesmos VAZIOS, menos o de API. O repositório deve ser o mais enxuto possíve