# 🎲 Lunatar RPG — Foundry VTT

Leve suas aventuras de **Lunatar RPG** ao Foundry VTT com uma ficha temática, criação de personagens por etapas, compêndios organizados e ferramentas para testes, combate e Formulações mágicas.

Esta é uma **implementação independente e não oficial**, baseada no playtest de Lunatar RPG. **Os direitos de Lunatar e da obra original pertencem a Colucci e à New Order Editora.**

## ✨ Por que usar?

Crie personagens com orientação em cada etapa, organize armas e armaduras por espaço de equipamento e acompanhe Saúde, Magia, Ações e Dados Lunares na ficha. Ajuste Trunfos e Fardos com botões interativos, componha Formulações com prévia de custos e consulte Classes, Proezas e Traços sem sair do Foundry.

## 🎯 Principais recursos

- 🎨 **Fichas temáticas** — Interface em português com estética de pergaminho, retrato ampliado, abas com ícones e fichas para personagens e ameaças.
- 🧭 **Gerador de personagens** — Criação de nível 1 em seis etapas: Identidade, Origem, Classe, Características, Aptidões e Revisão. Permite revisar escolhas, ajustar distribuições e sortear o Signo Lunar.
- 🎲 **Testes interativos** — Botões de dados, busca de Aptidões, filtros e controles de Trunfos e Fardos com atualização do dado efetivo e do modificador.
- ❤️ **Recursos e defesas** — Controle de Saúde, Magia e Ações, descanso e ajustes manuais de Defesa, Defesa Mágica, Proteção e valores máximos de Saúde e Magia.
- ⚔️ **Inventário organizado** — Busca, filtro de itens equipados e espaços de Mão Esquerda, Mão Direita e Corpo. Armas de Uma Mão, Duas Mãos e versáteis têm tratamento próprio.
- ✨ **Compositor de Formulações** — Combine Forma e Palavra, escolha Ampliações e acompanhe a prévia de PM, Reflexo, ações, alcance e dano. Formulações salvas possuem botões para conjurar e editar.
- 📈 **Classes e progressão** — Escolha da Classe Básica, apresentação de seus caminhos e seleção da Classe Superior a partir do nível 5.
- 📚 **Compêndios organizados** — Equipamentos, Classes, Proezas, Traços e Macros com pastas coloridas para facilitar a consulta.
- 🌙 **Ciclo lunar** — Signo Lunar, Dados Lunares, sorteio das Luas do céu e opção de rejogada lunar após o resultado do teste.
- 💬 **Chat personalizado** — Cards de rolagem com sucesso ou falha, Impulso e Recuo, além da apresentação de itens, Proezas e Traços.
- 🖼️ **Ícones SVG** — Identificação visual de equipamentos, Aptidões, Classes, Proezas e Traços.
- 🛠️ **Macros de mesa** — Atalhos para rolagens, uso de itens, recursos, descanso, reposição de Proezas e início do ciclo lunar.

## ⚙️ Compatibilidade

| Requisito | Versão |
| --- | --- |
| Foundry VTT | 13 e 14 |
| Lunatar para Foundry | 0.2.11 |
| Idioma da interface | Português brasileiro |
| Material de referência | Playtest de Lunatar RPG |

O pacote funciona como **sistema de jogo próprio** do Foundry e não exige outro sistema instalado. A versão passou por testes isolados de regressão e do gerador; esses testes não substituem a validação completa em uma mesa nas duas versões do Foundry.

## 📦 Instalação

### Instalação manual

1. Baixe `lunatar-unofficial.zip` na [Release mais recente](https://github.com/DMArkhron/Lunatar-Unofficial/releases/latest) e feche o Foundry.
2. Crie a pasta `Data/systems/lunatar-unofficial`, no diretório de dados do Foundry, e extraia o conteúdo do ZIP diretamente nela.
3. Confira se o manifesto está em `Data/systems/lunatar-unofficial/system.json`, sem uma pasta extra entre eles.
4. Abra o Foundry, crie um mundo e selecione **Lunatar RPG** como sistema de jogo.
5. Inicie o mundo para acessar as fichas, os compêndios e o gerador.

Se baixar o código pelo GitHub, renomeie a pasta extraída para `lunatar-unofficial`. O nome do repositório é **Lunatar-Unofficial**, mas a pasta instalada deve usar o identificador em letras minúsculas.

### Instalação por manifesto

1. Na tela inicial do Foundry, abra **Sistemas de Jogo → Instalar Sistema**.
2. Cole o endereço abaixo no campo **Manifest URL**.
3. Clique em **Instalar** e crie um mundo com **Lunatar RPG**.

```text
https://github.com/DMArkhron/Lunatar-Unofficial/releases/latest/download/system.json
```

## 🎮 Primeiros passos

- Em **Atores → Gerador de Personagem**, siga as seis etapas e confira o resumo antes de criar a ficha.
- Explore **Compêndios → Lunatar RPG**. Abra os registros para consultar as descrições ou arraste-os para uma ficha que você controla.
- Na aba **Ficha**, clique em uma Aptidão para rolar. Informe o Número-Alvo e ajuste Trunfos e Fardos pelos botões **−/+**.
- Use **Editar valores** para definir manualmente defesas e recursos máximos. Deixe um campo em branco para retomar seu cálculo automático.
- Em **Equipamentos**, adicione itens pelo **Catálogo** e use **Equipar** para escolher o espaço ocupado. Armas de Duas Mãos ocupam as duas mãos.
- Em **Formulações → Compor Forma + Palavra**, monte a magia, confira seus custos e salve-a para usar pela ficha.
- Em **Classe, Proezas e Traços**, acompanhe sua Classe Básica e os caminhos disponíveis para a Classe Superior.
- Clique no retrato para visualizar a imagem. Usuários com permissão de edição também podem usar **Trocar imagem**.
- Arraste um item já anexado à ficha para a barra de macros para criar um atalho de uso.

## 📖 Automação e regras de mesa

O sistema acompanha rolagens, custos e recursos, mas efeitos específicos de Proezas, invocações, áreas, condições e outras decisões narrativas continuam sendo resolvidos pela mesa. Consulte o playtest para os efeitos e as exceções das regras.

Por padrão, empates em Testes Opostos favorecem a oposição; o mestre pode alterar essa opção nas configurações. Empates contra Número-Alvo fixo ou Defesa contam como sucesso. Para um Teste Oposto, role a oposição primeiro e utilize seu total como Número-Alvo do segundo teste.

O equipamento inicial deve ser escolhido no compêndio e adicionado à ficha. Para aplicar dano ou cura, use **Ajustar Saúde** na ficha do alvo.

## 🔄 Atualizações

Antes de atualizar o sistema ou migrar a versão do Foundry, faça uma cópia de segurança dos mundos. Com o Foundry fechado, substitua os arquivos da pasta `lunatar-unofficial` e consulte as notas da versão, quando disponíveis.

**Mundos de versões antigas:** o identificador mudou de `lunatar` para `lunatar-unofficial`. Mundos criados com o identificador anterior continuam associados a ele. Preserve uma cópia do sistema anterior para abri-los e faça backup antes de qualquer migração.

## 🐛 Problemas e sugestões

Encontrou um erro ou tem uma ideia de melhoria? Abra uma **Issue** no repositório, incluindo, quando possível:

- Uma captura de tela ou mensagem do console.
- As versões do Foundry e do sistema Lunatar utilizadas.
- Os passos para reproduzir o problema.
- Os módulos ativos no mundo.

## 👤 Créditos e direitos

**Implementação não oficial para Foundry VTT desenvolvida por DM Arkhron.**

**Lunatar RPG e sua obra original pertencem a Colucci, Smzinho e à New Order Editora.** Todos os direitos sobre a obra original, seus textos, regras, ilustrações e materiais relacionados permanecem com seus respectivos titulares.

Este projeto é uma adaptação independente para uso no Foundry VTT e não é uma publicação oficial de Colucci ou da New Order Editora. Materiais de terceiros conservam seus próprios direitos. O projeto não substitui o material original de Lunatar RPG.

## 🐉 Bestiário do playtest

Em **Compêndios → Lunatar RPG → Bestiário → Bestiário de Lunatar**, encontre as seis ameaças das páginas 73–75: **Aranha Gigante, Alpa Combatente, Conjurador, Devorado, Guardião da Culpa e Mercenário**. As fichas estão organizadas em Monstro, Profanado, Humanoide e Morto-vivo, com recursos, Aptidões, ataques e habilidades incorporados. Importe a criatura para Atores e arraste-a para a cena; os tokens são desvinculados para manter Saúde e recursos individuais.

O Conjurador possui suas Formas e Palavras registradas como Traço, para montar Formulações pelo compositor. Proezas condicionais, ações extras, condições e a ocupação de dois hexágonos da Aranha são resolvidas pelo mestre. As armas com Perfurante 1 oferecem a opção de dano perfurante na rolagem.

**Nota da fonte:** o Guardião da Culpa lista Resistência d16 e d10 no mesmo bloco. A ficha utiliza d16 e registra a divergência nas Anotações para revisão pelo mestre.

Para gerar o compêndio a partir do código-fonte, instale `@foundryvtt/foundryvtt-cli@3.0.5` e execute `node scripts/build-bestiary.mjs`. As Releases já incluem o compêndio compilado.
