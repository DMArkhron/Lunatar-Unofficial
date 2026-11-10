const fauna = ["Instinto Animal", "Recebe um Trunfo nos testes de Instinto fora de combate."];
export const ORIGIN_TRAITS = {
  anfibio: fauna, ave: fauna, suino: fauna, canideo: fauna,
  humano: ["Versátil", "Uma Aptidão sem graduações passa a d8 na criação."],
  elohin: ["Sentidos da Penumbra", "Enxerga no escuro e ouve bem em locais fechados, sem os Fardos correspondentes."],
  fahadjin: ["Comerciante Nato", "Recebe um Trunfo em testes de diplomacia ou negociação."],
  yukkhan: ["Ku’Na", "Uma vez por dia, partilhe a tradição com outro Yuk’khan para ganhar um Trunfo em uma Aptidão até o fim do dia."]
};
export const ORIGIN_FEATS = {
  anfibio: [
    ["Dois Mundos", "Passiva", 0, "Nado de 10 m, fôlego dobrado e sem penalidade por superfícies escorregadias."],
    ["Golpe elástico", "Ação", 1, "Uma vez por cena, alcance um objeto livre a 5 m ou dispute Atletismo para Atordoar um alvo."],
    ["Triunfo do saltador", "Ação", 1, "Salte o dobro do Movimento e ganhe um Trunfo se houver teste."]
  ],
  ave: [
    ["Bote do Predador", "Ação", 1, "Uma vez por cena, adicione 1d6 de dano ao próximo acerto."],
    ["Conhecimento estrigforme", "Passiva", 0, "Aumente em uma graduação Natureza, Ocultismo ou Saber durante uma cena."],
    ["Sexto sentido", "Reação", 1, "Uma vez por cena, receba +3 de Defesa contra o próximo ataque."]
  ],
  suino: [
    ["Investida Imparável", "Ação", 2, "Uma vez por cena, mova mais de 3 m em terreno regular para ganhar um Trunfo e +2 de dano no próximo Ataque."],
    ["Lavagem", "Ação", 1, "Uma vez por cena, coma algo mastigável para curar 1d6 + Capacidade em PS."],
    ["Negociando com porcos", "Ação", 1, "Uma vez por cena, teste Manipulação com Trunfo. Se vencer, o alvo sofre um Fardo em testes sociais contra você na cena. Não acumula Impulsos."]
  ],
  canideo: [
    ["Astúcia da Raposa", "Ação", 1, "Uma vez por cena, faça um teste de Astúcia com Trunfo."],
    ["Emboscada", "Ação", 2, "Uma vez por cena, salte e finte para criar Abertura, atacar com um Trunfo e causar +2 de dano se acertar."],
    ["Passos sem som", "Ação", 1, "Uma vez por cena, faça Furtividade com um Trunfo, ou dois contra quem se guia pela audição."]
  ],
  humano: [
    ["Perseverança", "Livre", 0, "Uma vez por cena, refaça um teste de Aptidão que falhou e mantenha a nova rolagem."],
    ["Vontade de ferro", "Livre", 0, "Uma vez por sessão, recupere 1d6 PS ao cair a 0."]
  ],
  elohin: [
    ["Caçador Luminescente", "Ação", 2, "Uma vez por cena, ilumine sua arma para adicionar +2 de dano até o fim da cena."],
    ["Ecolocalização", "Ação", 1, "Uma vez por cena, um teste de percepção com Trunfo localiza inimigos a até 15 m e estima seu porte."],
    ["Pele de rocha", "Reação", 1, "Uma vez por cena, ganhe +2 de Defesa e 2 de Proteção contra o próximo ataque até o início do seu turno."]
  ],
  fahadjin: [
    ["Passos das Areias", "Ação", 1, "Uma vez por cena, receba um Trunfo em Sobrevivência para rastrear, achar comida ou montar acampamento."],
    ["Runas ancestrais", "Ação", 1, "Uma vez por cena, ative sua arma para receber +1 em Ataque e dano até o fim da cena."],
    ["Saberes do deserto", "Ação", 1, "Uma vez por cena, teste Saber com Trunfo mesmo sem a especialização. Se passar, receba duas pistas verdadeiras e uma falsa."]
  ],
  yukkhan: [
    ["Caçador Caçado", "Ação", 1, "Uma vez por cena, ganhe um Trunfo em Sobrevivência ou imponha um Fardo à oposição na disputa para encontrar ou se esconder."],
    ["Pelo legado!", "Livre", 0, "Uma vez por cena, faça uma Reação extra."],
    ["Um com a mata", "Ação", 1, "Uma vez por cena, fique oculto permanecendo imóvel em área de mata."]
  ]
};
export const CLASS_FEATS = {
  adepto: [["Arma do Eleito", "Ação", 1, "Durante a rodada, +1 em Ataque e +2 de dano sagrado. Os bônus aumentam nos níveis 5 e 9."]],
  combatente: [
    ["Contra-Atacar", "Reação", 1, "Reaja a uma Abertura causada por um ataque que errou você. Usos por cena iguais a metade da Agilidade, mínimo 1."],
    ["Golpe furioso", "Ação", 1, "−2 de Defesa e +1 em Ataque até o próximo turno, com +2 de dano. Consulte os limites e escalonamento na p. 34."],
    ["Golpe impactante", "Ação", 2, "Ataque os alvos em um raio de 2 m. Usos por cena iguais a metade do nível, mínimo 1."]
  ],
  mistico: [
    ["Barreira arcana", "Passiva", 0, "Ao conjurar, pode pagar 1 PM por +1 de Defesa até o próximo turno. A melhoria cresce nos níveis 5 e 9."],
    ["Grimório", "Passiva", 0, "Escolha uma Palavra com redução de 1 PM, mínimo 1. Escolha mais uma nos níveis 5 e 9."],
    ["Poder inato", "Passiva", 0, "Uma vez por cena, reduza Reflexo de uma Ampliação em 1, sem zerar. A redução aumenta nos níveis 5 e 9."]
  ],
  naturalista: [
    ["Sussurro dos espíritos", "Ação", 1, "Na natureza, +2 nas Defesas e −2 PM na próxima Formulação. Dura metade do Instinto em rodadas, uma vez por cena."],
    ["Impulso selvagem", "Ação", 1, "Uma vez por cena, por 2 rodadas, ganhe um Trunfo no próximo Ataque e +2 de dano no primeiro Ataque. Melhora nos níveis 5 e 9."],
    ["Postura da fera", "Ação", 1, "Por 2 rodadas, garras causam 1d6 + Destreza. Ganhe +1 de Defesa sem Armadura Média ou Pesada. O dano cresce nos níveis 5 e 9."]
  ],
  renegado: [
    ["Essa Passou Perto!", "Passiva", 0, "Um Trunfo em Esquiva e Razão e +2 em Iniciativa."],
    ["Esquiva das sombras", "Passiva", 0, "Sem escudo ou armadura pesada, some metade da Destreza à Defesa. Pode reagir a um erro para se mover 1 m sem Abertura."],
    ["Ataque duplo", "Livre", 0, "Armas Ágeis causam +2 de dano nos acertos da rodada. Limite de usos e escalonamento na p. 51."]
  ]
};
export const NATURE_TRAITS = {
  cacada: ["Caçada", "+3 m de Movimento."],
  conexao: ["Conexão", "+4 PS no nível 1 e +1 de Proteção sem armadura ou com armadura leve."],
  espiritualidade: ["Espiritualidade", "+2 PM no nível 1 e visão a 10 m na penumbra ou escuridão natural."]
};
