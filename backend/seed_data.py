"""Seed data for MISSÃO APROV CONCURSO."""
from datetime import datetime, timezone
import uuid


def _id():
    return str(uuid.uuid4())


CONCURSOS = [
    {
        "id": "inss-2025",
        "nome": "INSS - Técnico do Seguro Social",
        "orgao": "INSS - Instituto Nacional do Seguro Social",
        "cargo": "Técnico do Seguro Social",
        "banca": "CESPE/Cebraspe",
        "estado": "Nacional",
        "vagas": 1000,
        "salario": 5905.79,
        "escolaridade": "Nível Médio",
        "situacao": "Previsto",
        "data_prova": "2026-08-15",
        "disciplinas": ["portugues", "raciocinio-logico", "informatica", "direito-constitucional", "direito-administrativo", "direito-previdenciario", "atualidades", "etica"],
        "area": "Previdência Social",
    },
    {
        "id": "pf-agente-2025",
        "nome": "Polícia Federal - Agente",
        "orgao": "Polícia Federal",
        "cargo": "Agente de Polícia Federal",
        "banca": "CESPE/Cebraspe",
        "estado": "Nacional",
        "vagas": 1500,
        "salario": 12522.50,
        "escolaridade": "Nível Superior",
        "situacao": "Autorizado",
        "data_prova": "2026-11-20",
        "disciplinas": ["portugues", "raciocinio-logico", "informatica", "direito-constitucional", "direito-administrativo", "direito-penal", "direito-processo-penal", "atualidades"],
        "area": "Polícia",
    },
    {
        "id": "prf-2025",
        "nome": "PRF - Polícia Rodoviária Federal",
        "orgao": "Polícia Rodoviária Federal",
        "cargo": "Policial Rodoviário Federal",
        "banca": "CESPE/Cebraspe",
        "estado": "Nacional",
        "vagas": 1500,
        "salario": 10357.88,
        "escolaridade": "Nível Superior",
        "situacao": "Inscrições Abertas",
        "data_prova": "2026-06-15",
        "disciplinas": ["portugues", "raciocinio-logico", "informatica", "direito-constitucional", "direito-administrativo", "direito-penal", "atualidades"],
        "area": "Polícia",
    },
    {
        "id": "trt-analista-2025",
        "nome": "TRT - Analista Judiciário",
        "orgao": "Tribunal Regional do Trabalho",
        "cargo": "Analista Judiciário - Área Judiciária",
        "banca": "FCC",
        "estado": "SP",
        "vagas": 100,
        "salario": 13202.62,
        "escolaridade": "Nível Superior",
        "situacao": "Previsto",
        "data_prova": "2026-09-10",
        "disciplinas": ["portugues", "raciocinio-logico", "direito-constitucional", "direito-administrativo", "direito-civil", "direito-trabalho", "processo-trabalho"],
        "area": "Judiciário",
    },
    {
        "id": "receita-federal-2025",
        "nome": "Receita Federal - Auditor",
        "orgao": "Receita Federal do Brasil",
        "cargo": "Auditor-Fiscal da Receita Federal",
        "banca": "ESAF/FGV",
        "estado": "Nacional",
        "vagas": 700,
        "salario": 21029.09,
        "escolaridade": "Nível Superior",
        "situacao": "Autorizado",
        "data_prova": "2026-10-05",
        "disciplinas": ["portugues", "raciocinio-logico", "informatica", "direito-constitucional", "direito-administrativo", "direito-tributario", "contabilidade", "administracao-publica", "atualidades"],
        "area": "Fiscal",
    },
    {
        "id": "camara-2025",
        "nome": "Câmara dos Deputados - Analista",
        "orgao": "Câmara dos Deputados",
        "cargo": "Analista Legislativo",
        "banca": "FGV",
        "estado": "DF",
        "vagas": 60,
        "salario": 26196.00,
        "escolaridade": "Nível Superior",
        "situacao": "Previsto",
        "data_prova": "2026-12-08",
        "disciplinas": ["portugues", "raciocinio-logico", "informatica", "direito-constitucional", "direito-administrativo", "administracao-publica", "atualidades"],
        "area": "Legislativo",
    },
    {
        "id": "enem-2026",
        "nome": "ENEM 2026 - Exame Nacional do Ensino Médio",
        "orgao": "INEP - Ministério da Educação",
        "cargo": "Ingresso no Ensino Superior",
        "banca": "INEP",
        "estado": "Nacional",
        "vagas": 0,
        "salario": 0,
        "escolaridade": "Ensino Médio",
        "situacao": "Inscrições Abertas",
        "data_prova": "2026-11-08",
        "disciplinas": ["linguagens", "ciencias-humanas", "ciencias-natureza", "matematica", "redacao"],
        "area": "Educação / Vestibular",
    },
]

DISCIPLINAS = [
    {"id": "portugues", "nome": "Língua Portuguesa", "icone": "book", "cor": "#059669"},
    {"id": "matematica", "nome": "Matemática", "icone": "calculator", "cor": "#0EA5E9"},
    {"id": "raciocinio-logico", "nome": "Raciocínio Lógico", "icone": "brain", "cor": "#8B5CF6"},
    {"id": "informatica", "nome": "Informática", "icone": "monitor", "cor": "#F59E0B"},
    {"id": "direito-constitucional", "nome": "Direito Constitucional", "icone": "scale", "cor": "#166534"},
    {"id": "direito-administrativo", "nome": "Direito Administrativo", "icone": "briefcase", "cor": "#0891B2"},
    {"id": "direito-penal", "nome": "Direito Penal", "icone": "shield", "cor": "#DC2626"},
    {"id": "direito-processo-penal", "nome": "Processo Penal", "icone": "gavel", "cor": "#B91C1C"},
    {"id": "direito-civil", "nome": "Direito Civil", "icone": "users", "cor": "#7C3AED"},
    {"id": "direito-tributario", "nome": "Direito Tributário", "icone": "coins", "cor": "#CA8A04"},
    {"id": "direito-previdenciario", "nome": "Direito Previdenciário", "icone": "heart", "cor": "#059669"},
    {"id": "direito-trabalho", "nome": "Direito do Trabalho", "icone": "hard-hat", "cor": "#EA580C"},
    {"id": "processo-trabalho", "nome": "Processo do Trabalho", "icone": "file-text", "cor": "#EA580C"},
    {"id": "administracao-publica", "nome": "Administração Pública", "icone": "building", "cor": "#0369A1"},
    {"id": "contabilidade", "nome": "Contabilidade", "icone": "book-open", "cor": "#0D9488"},
    {"id": "atualidades", "nome": "Atualidades", "icone": "newspaper", "cor": "#65A30D"},
    {"id": "etica", "nome": "Ética no Serviço Público", "icone": "award", "cor": "#166534"},
    {"id": "linguagens", "nome": "Linguagens, Códigos e suas Tecnologias", "icone": "book-open", "cor": "#8B5CF6"},
    {"id": "ciencias-humanas", "nome": "Ciências Humanas e suas Tecnologias", "icone": "globe", "cor": "#0891B2"},
    {"id": "ciencias-natureza", "nome": "Ciências da Natureza e suas Tecnologias", "icone": "flask", "cor": "#059669"},
    {"id": "redacao", "nome": "Redação", "icone": "edit", "cor": "#DC2626"},
]

# Questions - Public domain / self-generated by AI concepts based on common concurso topics
QUESTOES = [
    # Português
    {"id": _id(), "disciplina": "portugues", "assunto": "Concordância Verbal", "enunciado": "Assinale a alternativa em que a concordância verbal está correta:", "alternativas": ["Faz dez anos que não o vejo.", "Fazem dez anos que não o vejo.", "Fazem-se dez anos que não o vejo.", "Fizeram dez anos que não o vejo."], "correta": 0, "explicacao": "O verbo 'fazer' indicando tempo decorrido é impessoal, portanto fica na 3ª pessoa do singular. A forma correta é 'Faz dez anos'.", "banca": "CESPE", "ano": 2024, "dificuldade": "media"},
    {"id": _id(), "disciplina": "portugues", "assunto": "Crase", "enunciado": "Em qual alternativa o uso da crase está INCORRETO?", "alternativas": ["Vou à escola.", "Refiro-me à Sua Excelência.", "Chegamos à cidade cedo.", "Entreguei o livro à professora."], "correta": 1, "explicacao": "Não se usa crase antes de pronomes de tratamento (Sua Excelência, Vossa Senhoria, etc.).", "banca": "FGV", "ano": 2024, "dificuldade": "media"},
    {"id": _id(), "disciplina": "portugues", "assunto": "Pontuação", "enunciado": "A vírgula está corretamente empregada em:", "alternativas": ["O aluno, estudou, muito.", "Maria, foi ao mercado.", "Ana, minha irmã, chegou.", "Comprei livros, e canetas."], "correta": 2, "explicacao": "A vírgula é utilizada para isolar o aposto explicativo 'minha irmã'.", "banca": "FCC", "ano": 2023, "dificuldade": "facil"},
    # Direito Constitucional
    {"id": _id(), "disciplina": "direito-constitucional", "assunto": "Direitos Fundamentais", "enunciado": "Segundo o art. 5º da CF/88, é assegurado a todos:", "alternativas": ["O direito de reunião apenas mediante autorização policial.", "A liberdade de manifestação do pensamento, sendo vedado o anonimato.", "A liberdade de crença religiosa, salvo em locais públicos.", "O direito à propriedade, sem qualquer limitação."], "correta": 1, "explicacao": "O art. 5º, IV da CF/88 estabelece que é livre a manifestação do pensamento, sendo vedado o anonimato.", "banca": "CESPE", "ano": 2024, "dificuldade": "facil"},
    {"id": _id(), "disciplina": "direito-constitucional", "assunto": "Poder Legislativo", "enunciado": "O Congresso Nacional brasileiro é composto por:", "alternativas": ["Câmara dos Deputados apenas.", "Senado Federal apenas.", "Câmara dos Deputados e Senado Federal.", "Câmara dos Deputados, Senado Federal e Assembleias Legislativas."], "correta": 2, "explicacao": "O art. 44 da CF/88 estabelece que o Poder Legislativo é exercido pelo Congresso Nacional, composto pela Câmara dos Deputados e pelo Senado Federal.", "banca": "FGV", "ano": 2023, "dificuldade": "facil"},
    {"id": _id(), "disciplina": "direito-constitucional", "assunto": "Princípios Fundamentais", "enunciado": "NÃO constitui fundamento da República Federativa do Brasil:", "alternativas": ["Soberania.", "Cidadania.", "Erradicação da pobreza.", "Pluralismo político."], "correta": 2, "explicacao": "A erradicação da pobreza é OBJETIVO fundamental (art. 3º), não FUNDAMENTO (art. 1º) da República.", "banca": "CESPE", "ano": 2024, "dificuldade": "media"},
    # Direito Administrativo
    {"id": _id(), "disciplina": "direito-administrativo", "assunto": "Princípios", "enunciado": "Os princípios expressos da Administração Pública são conhecidos pelo acrônimo LIMPE. Qual das alternativas contém somente princípios expressos?", "alternativas": ["Legalidade, Impessoalidade, Moralidade, Publicidade, Eficiência.", "Legalidade, Isonomia, Motivação, Publicidade, Economicidade.", "Legalidade, Impessoalidade, Moralidade, Proporcionalidade, Eficiência.", "Legalidade, Interesse Público, Moralidade, Publicidade, Eficiência."], "correta": 0, "explicacao": "LIMPE = Legalidade, Impessoalidade, Moralidade, Publicidade e Eficiência. Todos previstos expressamente no art. 37, caput, da CF/88.", "banca": "CESPE", "ano": 2023, "dificuldade": "facil"},
    {"id": _id(), "disciplina": "direito-administrativo", "assunto": "Atos Administrativos", "enunciado": "São atributos do ato administrativo, EXCETO:", "alternativas": ["Presunção de legitimidade.", "Imperatividade.", "Autoexecutoriedade.", "Onerosidade."], "correta": 3, "explicacao": "Os atributos clássicos são: presunção de legitimidade, imperatividade, autoexecutoriedade e tipicidade. Onerosidade não é atributo.", "banca": "FGV", "ano": 2024, "dificuldade": "media"},
    # Raciocínio Lógico
    {"id": _id(), "disciplina": "raciocinio-logico", "assunto": "Proposições", "enunciado": "A negação da proposição 'Todo brasileiro é feliz' é:", "alternativas": ["Nenhum brasileiro é feliz.", "Algum brasileiro não é feliz.", "Todo brasileiro não é feliz.", "Algum brasileiro é feliz."], "correta": 1, "explicacao": "A negação de 'Todo A é B' é 'Existe pelo menos um A que não é B', ou seja, 'Algum brasileiro não é feliz'.", "banca": "CESPE", "ano": 2024, "dificuldade": "media"},
    {"id": _id(), "disciplina": "raciocinio-logico", "assunto": "Sequências", "enunciado": "Qual o próximo número da sequência: 2, 4, 8, 16, 32, ...?", "alternativas": ["48", "64", "56", "62"], "correta": 1, "explicacao": "Cada termo é o dobro do anterior (razão 2). Portanto, 32 x 2 = 64.", "banca": "FCC", "ano": 2023, "dificuldade": "facil"},
    # Informática
    {"id": _id(), "disciplina": "informatica", "assunto": "Segurança", "enunciado": "Um software malicioso que se disfarça de programa legítimo é chamado de:", "alternativas": ["Vírus.", "Worm.", "Cavalo de Troia (Trojan).", "Spyware."], "correta": 2, "explicacao": "O Cavalo de Troia (Trojan) se disfarça de programa útil/legítimo para enganar o usuário e obter acesso ao sistema.", "banca": "CESPE", "ano": 2023, "dificuldade": "facil"},
    {"id": _id(), "disciplina": "informatica", "assunto": "Redes", "enunciado": "O protocolo padrão utilizado para navegação segura na web é:", "alternativas": ["HTTP", "FTP", "HTTPS", "SMTP"], "correta": 2, "explicacao": "HTTPS (HTTP Secure) utiliza criptografia SSL/TLS para tornar segura a comunicação na web.", "banca": "FGV", "ano": 2024, "dificuldade": "facil"},
    # Matemática
    {"id": _id(), "disciplina": "matematica", "assunto": "Porcentagem", "enunciado": "Um produto custa R$ 200,00 e tem um desconto de 15%. Qual o valor final?", "alternativas": ["R$ 170,00", "R$ 180,00", "R$ 175,00", "R$ 185,00"], "correta": 0, "explicacao": "15% de 200 = 30. Portanto, 200 - 30 = R$ 170,00.", "banca": "FCC", "ano": 2023, "dificuldade": "facil"},
    # Direito Previdenciário
    {"id": _id(), "disciplina": "direito-previdenciario", "assunto": "Segurados", "enunciado": "São considerados segurados obrigatórios do RGPS, EXCETO:", "alternativas": ["Empregado.", "Trabalhador avulso.", "Contribuinte individual.", "Estagiário sem remuneração."], "correta": 3, "explicacao": "O estagiário sem remuneração NÃO é segurado obrigatório do RGPS. Segurados obrigatórios: empregado, empregado doméstico, contribuinte individual, trabalhador avulso e segurado especial.", "banca": "CESPE", "ano": 2024, "dificuldade": "media"},
    # Atualidades
    {"id": _id(), "disciplina": "atualidades", "assunto": "Meio Ambiente", "enunciado": "O acordo internacional que estabelece metas para redução de emissões de gases de efeito estufa é conhecido como:", "alternativas": ["Protocolo de Montreal.", "Acordo de Paris.", "Convenção de Basileia.", "Tratado de Kyoto (revisado 2020)."], "correta": 1, "explicacao": "O Acordo de Paris (2015) estabeleceu compromissos globais para limitar o aquecimento global.", "banca": "FGV", "ano": 2024, "dificuldade": "media"},
    # Ética
    {"id": _id(), "disciplina": "etica", "assunto": "Deveres do Servidor", "enunciado": "Segundo o Código de Ética do Servidor Público Federal (Decreto 1.171/94), é dever do servidor:", "alternativas": ["Manter-se neutro em qualquer situação.", "Ser probo, reto, leal e justo.", "Cumprir apenas as ordens que julgar corretas.", "Priorizar interesses pessoais quando urgentes."], "correta": 1, "explicacao": "É dever fundamental do servidor público ser probo, reto, leal e justo, demonstrando toda a integridade do seu caráter (art. IX do Código).", "banca": "CESPE", "ano": 2023, "dificuldade": "facil"},
    # Direito Penal
    {"id": _id(), "disciplina": "direito-penal", "assunto": "Aplicação da Lei Penal", "enunciado": "Segundo o Código Penal Brasileiro, a lei penal:", "alternativas": ["Retroage sempre em benefício do réu.", "Nunca retroage.", "Retroage apenas em prejuízo do réu.", "Retroage somente com decisão judicial."], "correta": 0, "explicacao": "Art. 5º, XL da CF/88: 'a lei penal não retroagirá, salvo para beneficiar o réu'. Princípio da retroatividade benéfica.", "banca": "CESPE", "ano": 2024, "dificuldade": "facil"},
    # Contabilidade
    {"id": _id(), "disciplina": "contabilidade", "assunto": "Princípios", "enunciado": "O princípio contábil que determina que os registros devem ser feitos pelos valores originais das transações é:", "alternativas": ["Prudência.", "Competência.", "Registro pelo valor original.", "Continuidade."], "correta": 2, "explicacao": "O princípio do Registro pelo Valor Original determina que os componentes do patrimônio devem ser registrados pelos valores originais das transações.", "banca": "FGV", "ano": 2023, "dificuldade": "media"},
    # Administração Pública
    {"id": _id(), "disciplina": "administracao-publica", "assunto": "Modelos", "enunciado": "O modelo de administração pública que enfatiza resultados e satisfação do cidadão é o:", "alternativas": ["Patrimonialista.", "Burocrático.", "Gerencial.", "Clientelista."], "correta": 2, "explicacao": "O modelo Gerencial (New Public Management), implementado no Brasil a partir de 1995, enfatiza eficiência, resultados e foco no cidadão-cliente.", "banca": "CESPE", "ano": 2024, "dificuldade": "media"},
]

# Questões autorais de exemplo para o modo ENEM
QUESTOES.extend([
    {"id": "enem-ling-001", "disciplina": "linguagens", "assunto": "Interpretação de texto", "enunciado": "Em textos argumentativos, a tese corresponde principalmente:", "alternativas": ["ao tema geral sem posicionamento", "à posição central defendida pelo autor", "à lista de referências", "ao título do texto"], "correta": 1, "explicacao": "A tese é o posicionamento central que o autor procura sustentar por meio de argumentos.", "banca": "ENEM", "ano": 2026, "dificuldade": "media", "area": "enem"},
    {"id": "enem-ling-002", "disciplina": "linguagens", "assunto": "Variação linguística", "enunciado": "A adequação da linguagem a diferentes situações de comunicação demonstra:", "alternativas": ["erro gramatical obrigatório", "variação e competência sociolinguística", "ausência de norma", "impossibilidade de comunicação"], "correta": 1, "explicacao": "O falante competente adapta registros e variedades ao contexto comunicativo.", "banca": "ENEM", "ano": 2026, "dificuldade": "facil", "area": "enem"},
    {"id": "enem-humanas-001", "disciplina": "ciencias-humanas", "assunto": "Cidadania", "enunciado": "A ampliação histórica dos direitos civis, políticos e sociais está diretamente relacionada ao conceito de:", "alternativas": ["cidadania", "mercantilismo", "absolutismo", "determinismo geográfico"], "correta": 0, "explicacao": "Cidadania envolve a construção e o exercício de direitos e deveres na vida social e política.", "banca": "ENEM", "ano": 2026, "dificuldade": "facil", "area": "enem"},
    {"id": "enem-humanas-002", "disciplina": "ciencias-humanas", "assunto": "Globalização", "enunciado": "Uma característica marcante da globalização contemporânea é:", "alternativas": ["redução dos fluxos de informação", "intensificação das redes econômicas e informacionais", "fim das desigualdades regionais", "isolamento dos mercados nacionais"], "correta": 1, "explicacao": "A globalização intensifica fluxos de capitais, mercadorias, pessoas e informação em redes mundiais.", "banca": "ENEM", "ano": 2026, "dificuldade": "media", "area": "enem"},
    {"id": "enem-natureza-001", "disciplina": "ciencias-natureza", "assunto": "Ecologia", "enunciado": "Em uma cadeia alimentar, os produtores são organismos que:", "alternativas": ["obtêm energia apenas consumindo animais", "produzem matéria orgânica a partir de fontes inorgânicas", "atuam somente como decompositores", "não participam do fluxo de energia"], "correta": 1, "explicacao": "Produtores, como plantas e algas, sintetizam matéria orgânica, geralmente por fotossíntese.", "banca": "ENEM", "ano": 2026, "dificuldade": "facil", "area": "enem"},
    {"id": "enem-natureza-002", "disciplina": "ciencias-natureza", "assunto": "Energia", "enunciado": "Ao desligar aparelhos da tomada para evitar consumo em modo de espera, busca-se principalmente:", "alternativas": ["aumentar a potência nominal", "reduzir desperdício de energia elétrica", "elevar a tensão da rede", "transformar energia elétrica em nuclear"], "correta": 1, "explicacao": "O modo de espera pode manter pequeno consumo contínuo; desligar da tomada reduz esse desperdício.", "banca": "ENEM", "ano": 2026, "dificuldade": "facil", "area": "enem"},
    {"id": "enem-mat-001", "disciplina": "matematica", "assunto": "Porcentagem", "enunciado": "Um produto de R$ 200 recebe desconto de 15%. Qual é o novo preço?", "alternativas": ["R$ 150", "R$ 160", "R$ 170", "R$ 185"], "correta": 2, "explicacao": "15% de 200 = 30. Logo, 200 - 30 = R$ 170.", "banca": "ENEM", "ano": 2026, "dificuldade": "facil", "area": "enem"},
    {"id": "enem-red-001", "disciplina": "redacao", "assunto": "Competências", "enunciado": "Na redação do ENEM, uma proposta de intervenção adequada deve:", "alternativas": ["ser desconectada dos argumentos", "respeitar os direitos humanos e relacionar-se ao problema discutido", "conter apenas uma frase genérica", "substituir toda a argumentação"], "correta": 1, "explicacao": "A proposta deve estar articulada à discussão e respeitar os direitos humanos.", "banca": "ENEM", "ano": 2026, "dificuldade": "media", "area": "enem"},
])

FLASHCARDS = [
    {"id": _id(), "disciplina": "direito-administrativo", "frente": "O que significa o princípio LIMPE?", "verso": "Legalidade, Impessoalidade, Moralidade, Publicidade e Eficiência — os cinco princípios expressos da Administração Pública (art. 37, CF/88)."},
    {"id": _id(), "disciplina": "direito-constitucional", "frente": "Quais são os fundamentos da República Federativa do Brasil?", "verso": "SOCIDIPLU: Soberania, Cidadania, Dignidade da pessoa humana, valores sociais do trabalho e da livre iniciativa, e Pluralismo político (art. 1º CF/88)."},
    {"id": _id(), "disciplina": "direito-constitucional", "frente": "Quais são os objetivos fundamentais da República?", "verso": "CON-GA-ER-PRO: CONstruir sociedade livre, justa e solidária; GArantir desenvolvimento nacional; ERradicar pobreza e reduzir desigualdades; PROmover o bem de todos (art. 3º CF/88)."},
    {"id": _id(), "disciplina": "direito-administrativo", "frente": "Quais os atributos do ato administrativo?", "verso": "PATI: Presunção de legitimidade, Autoexecutoriedade, Tipicidade e Imperatividade."},
    {"id": _id(), "disciplina": "portugues", "frente": "Quando NÃO se usa crase?", "verso": "Antes de: masculinos; verbos; pronomes pessoais/de tratamento; artigo indefinido; palavras no plural sem 'as'; nome de cidade que não admite 'a'."},
    {"id": _id(), "disciplina": "direito-previdenciario", "frente": "Quais os segurados obrigatórios do RGPS?", "verso": "Empregado, Empregado Doméstico, Trabalhador Avulso, Contribuinte Individual e Segurado Especial."},
    {"id": _id(), "disciplina": "raciocinio-logico", "frente": "Qual a negação de 'Todo A é B'?", "verso": "'Existe pelo menos um A que não é B' (ou 'Algum A não é B')."},
    {"id": _id(), "disciplina": "raciocinio-logico", "frente": "Qual a negação de 'p e q'?", "verso": "'~p ou ~q' (Lei de De Morgan)."},
    {"id": _id(), "disciplina": "informatica", "frente": "O que é HTTPS?", "verso": "HTTP Secure — versão criptografada do HTTP usando SSL/TLS para comunicação segura na web."},
    {"id": _id(), "disciplina": "direito-penal", "frente": "A lei penal retroage?", "verso": "Regra: NÃO retroage. Exceção: retroage SEMPRE para beneficiar o réu (art. 5º, XL, CF)."},
    {"id": _id(), "disciplina": "etica", "frente": "Qual o principal dever ético do servidor?", "verso": "Ser probo, reto, leal e justo (Decreto 1.171/94, seção II, IX)."},
    {"id": _id(), "disciplina": "administracao-publica", "frente": "O que é a Administração Gerencial?", "verso": "Modelo iniciado no Brasil em 1995 com foco em resultados, eficiência, controle a posteriori e cidadão-cliente."},
]
