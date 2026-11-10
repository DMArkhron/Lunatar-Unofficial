# Lunatar-Unofficial para Foundry VTT

**Versão 0.2.10** · Implementação independente em português para o playtest de Lunatar RPG, publicado pela New Order Editora. A interface tem arte vetorial original inspirada nas fichas das páginas 77 e 78 do playtest.

## Instalação manual no Foundry V13 ou V14

1. Na tela inicial do Foundry, abra **Configuração** e copie o **Caminho dos dados do usuário**. No Windows, o padrão é `%LOCALAPPDATA%\FoundryVTT`, mas a configuração do aplicativo prevalece.
2. Feche o Foundry por completo. Extraia o ZIP em uma pasta temporária e copie a pasta interna **lunatar-unofficial** para **Data/systems** dentro do caminho anotado. Ao atualizar uma versão anterior, substitua os arquivos na pasta `lunatar-unofficial` existente.
3. Confira que o caminho termina em `Data/systems/lunatar-unofficial/system.json`. Se o extrator criou uma pasta extra com o nome do ZIP, mova a pasta `lunatar-unofficial` para o lugar indicado.
4. Abra o Foundry e verifique **Sistemas de Jogo → Lunatar RPG**, versão **0.2.10**. Em **Mundos de Jogo**, selecione o sistema ao criar um mundo.


Se a entrada ainda estiver ausente, confira as linhas referentes a `lunatar-unofficial` ou `system.json` em `Logs/error.log` no caminho de dados anotado. Elas ajudam a distinguir um erro de leitura do manifesto de uma pasta que o Foundry não encontrou.

Para instalar em um servidor hospedado, envie a pasta `lunatar-unofficial` pela área de arquivos do host ou use o procedimento de instalação manual do provedor.

O identificador do sistema mudou de `lunatar` para `lunatar-unofficial`. Mundos existentes continuam associados ao identificador anterior. Mantenha uma cópia do sistema anterior para abrir esses mundos. Faça um backup do mundo antes de qualquer migração.

## Primeira sessão

Clique no retrato à esquerda para abrir a imagem. Quem pode editar a ficha também pode usar **Trocar imagem**.

Em **Ficha → Editar valores**, você pode fixar Defesa, Defesa Mágica, Proteção, Saúde máxima e Magia máxima. Deixe o campo em branco para usar o cálculo automático. Saúde e Magia atuais continuam editáveis nos respectivos cartões.

- **Criação.** Abra **Atores → Gerador de Personagem** e passe pelas seis etapas de nível 1: Identidade, Origem, Classe, Características, Aptidões e Revisão. Use **Voltar** para corrigir uma escolha. Nas distribuições, você pode ajustar a sugestão, restaurá-la ou sortear outra válida. A última tela resume a ficha e permite sortear o Signo Lunar com 1d12 ao criar o personagem.
- **Progressão.** Em **Classe, Proezas e Traços**, escolha a Classe Básica e consulte seus três caminhos. Ao atingir o nível 5, selecione a Classe Superior diretamente na ficha. Os registros do compêndio anexados ficam em uma seção separada.
- **Rolagens.** Em **Ficha → Aptidões**, clique no botão do dado para abrir a rolagem. A busca aceita nome, Característica ou Maestria, e pode ser combinada com os filtros de Característica e de Aptidões treinadas. Informe o Número-Alvo e ajuste Trunfos e Fardos pelos botões **−/+**. O dado efetivo e o modificador são atualizados na hora, com os ajustes automáticos discriminados. Para um Teste Oposto, role a oposição primeiro e use o total como NA no segundo teste. O card mostra sucesso ou falha, Impulso e Recuo. Use o botão de ajustes no card para ajustar a graduação ou a Maestria.
- **Equipamento e ataques.** Em **Equipamentos**, use **Catálogo** para adicionar armas, armaduras e escudos do playtest. A busca por nome ou propriedade e o filtro **Só equipados** ajudam a localizar itens. Use **Equipar** para marcar Mão Esquerda, Mão Direita ou Corpo conforme o item. Armas de Duas Mãos ocupam as duas mãos. Armas versáteis podem usar uma ou duas. Se o espaço estiver ocupado, o item anterior volta ao inventário. Use **Mover ou guardar** para liberar o espaço. Armaduras e escudos equipados somam seus efeitos conforme a ficha. Armas, armaduras, equipamentos, Aptidões, Classes, Proezas e Traços do catálogo têm ícones em SVG. O ícone pode ser trocado na ficha de um item editável. Com um token marcado como alvo, um ataque de arma recebe sua Defesa como NA. Use **Ajustar Saúde** na ficha do alvo para aplicar dano com Proteção, dano direto ou cura.
- **Combate.** Role Iniciativa pelo rastreador nativo. Ao avançar o turno, o cliente que o avançou repõe as ações do ator quando tem permissão. Na janela de teste, o gasto de ações pode ser ligado ou desligado. Com ele ligado, repetições da mesma Aptidão acumulam Fardos. **Repor** permite ajustar o controle à mesa.
- **Magia.** Abra **Formulações → Compor Forma + Palavra**, ou crie um registro personalizado. A lista reúne cartões com botões para conjurar e editar. O editor manual tem botões −/+, alternadores de tipo e resumo dos custos. O compositor mostra uma prévia de custo, Reflexo, ações, alcance e dano à medida que você faz as escolhas. Conjurar usa a Aptidão da classe ou Ataque Mágico e desconta PM. Reflexo causa 1d4 de dano direto por ponto. Para automatizar dano no chat, use uma fórmula como `1d8 + @formulacao`. O NA pode ser preenchido pela Defesa Mágica de um único token marcado como alvo.
- **Luas.** O mestre usa **Novo ciclo** na ficha de um personagem para sortear as Luas do céu e repor os Dados Lunares dos personagens pertencentes a jogadores. Na janela de teste, marque a opção lunar para decidir se quer rerrolar depois de ver o primeiro resultado. Bênçãos e outros usos podem ser anotados na ficha e lançados manualmente.
- **Ameaças.** Preencha Defesa, Defesa Mágica, Proteção, Movimento, Saúde e Ações diretamente. Use os modificadores Concreto e Abstrato do bloco da ameaça. Os mesmos registros de itens servem para ataques e Proezas.

## Critérios desta versão

- Empate no Teste Oposto favorece a oposição por padrão, conforme a subseção específica da p. 7. O mestre pode mudar para **Favorece a ação** nas configurações do sistema. Um empate contra NA fixo ou Defesa dá sucesso.
- O teto da Escala segue o nível. Trunfos que ultrapassam o teto são tratados como +2 por passo excedente, e Fardos abaixo do d4 como −2 por passo. Os Fardos e Trunfos da mesma jogada se compensam.
- Para **Saber**, a ficha usa Inteligência, conforme a descrição da p. 12. Para a Formulação de Naturalista, usa Natureza com Instinto, conforme a referência ao teste de Natureza na p. 71.
- A Saúde usa os valores da tabela da p. 16. A progressão registra o nível 5 como o primeiro da classe superior. Ações, PM e Reflexo são acompanhados na ficha. Efeitos específicos de Proezas, invocações, áreas, testes secundários, magias de Controle simultâneas, Impasses, duração de condições e dano no alvo são resolvidos pela mesa. Empates de Iniciativa após graduação e Agilidade usam a ordem do Foundry até o mestre decidir a rerrolagem.
- O gerador registra as opções de Religião, Técnica de Combate e Trilha da Natureza como Traços. As opções narrativas e os efeitos específicos de religião e técnica são resolvidos pela mesa. O equipamento inicial pode ser escolhido no compêndio e arrastado para a ficha. O catálogo contém nomes e parâmetros mecânicos para compor Formulações. Confira os efeitos e exceções no playtest.
- O pacote é voltado à instalação manual. O `system.json` já está na pasta do sistema. A instalação por URL requer hospedar o manifesto e o ZIP.

## Compêndios e macros

Abra **Compêndios → Lunatar RPG**. As pastas Arsenal, Técnicas e Proezas, Traços e Origens, Linhagens e Classes e Ferramentas e Macros usam cores diferentes. As subpastas dentro dos compêndios também têm cores por categoria.

- **Equipamentos** reúne armas corpo a corpo e à distância por categoria, armaduras, escudos e equipamento inicial.
- **Proezas** separa Origens e Classes. As Proezas de classe estão organizadas por nível, e os Instintos Selvagens e as Engenhocas têm pastas próprias.
- **Traços** separa Origens, Classes Básicas e Classes Superiores. **Classes** reúne as cinco classes básicas e as quinze superiores.
- **Macros de Lunatar** reúne rolagens, uso de itens, ajustes de recursos, descanso, reposição de Proezas por cena e início do ciclo lunar.

Abra qualquer entrada de item para ler sua descrição. Arraste a entrada para a ficha de um ator que você controla para criar uma cópia anexada. Uma classe anexada fica em **Classe, Proezas e Traços**. Use **Aplicar** para alterar a classe usada pelos cálculos da ficha. Classes superiores exigem a classe básica correspondente e nível 5 ou maior.

Para criar uma macro de item, arraste o item **já anexado** da ficha para um espaço livre da barra de macros. O atalho aponta para aquele item da ficha, inclusive para tokens não vinculados. Para as macros gerais, importe a entrada do compêndio e arraste a macro para a barra. Elas usam o token selecionado ou o personagem associado ao seu usuário. A criação e a execução de macros de script seguem as permissões do Foundry.

Os atalhos chamam as mesmas ações da ficha. Armas abrem o teste de ataque, armaduras e escudos alternam o estado de equipamento, e Proezas descontam as ações em combate e os usos cadastrados. **Repor Proezas por cena** renova as entradas marcadas para essa recarga. A descrição da Proeza ou do Traço é publicada no chat para resolver as condições, os alvos, os custos específicos da classe e outros efeitos de mesa.
