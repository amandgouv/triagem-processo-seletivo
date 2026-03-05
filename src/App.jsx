import { useState, useRef, useEffect } from 'react'

const PERGUNTAS = [
  { id: 1, texto: "Me conta uma situação em que um cliente estava insatisfeito e você não tinha a solução na mão. O que você fez?" },
  { id: 2, texto: "Como você organiza sua rotina quando está gerenciando vários clientes ao mesmo tempo? Me dá um exemplo real." },
  { id: 3, texto: "Você já usou alguma plataforma de cursos online — como aluno, criador ou no trabalho? O que achou da experiência?" },
  { id: 4, texto: "Por que CS e por que agora? O que te atrai nessa área?" }
]

const SENHA_PAINEL = "curseduca2025"

async function avaliarRespostas(apiKey, nome, respostas) {
  const prompt = `Você é um recrutador especialista da Curseduca, uma EdTech brasileira em crescimento.
Avalie as respostas do candidato "${nome}" para a vaga de Analista de CS.

${respostas.map((r, i) => `Pergunta ${i+1}: ${PERGUNTAS[i].texto}\nResposta: ${r.texto}\n`).join('\n')}

Critérios: comunicação clara, exemplos concretos, fit cultural com startup, familiaridade com EdTech, motivação genuína.

Responda APENAS em JSON válido:
{"score":<0-100>,"classificacao":"<✅ Avança | 🟡 Talvez | ❌ Não avança>","pontos_fortes":["..."],"alertas":["..."],"resumo":"<2 frases>"}`

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "anthropic-dangerous-direct-browser-access": "true"
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1000,
        messages: [{ role: "user", content: prompt }]
      })
    })
    const data = await response.json()
    if (data.error) throw new Error(data.error.message)
    const text = data.content?.[0]?.text || "{}"
    return JSON.parse(text.replace(/```json|```/g, "").trim())
  } catch {
    return { score: 50, classificacao: "🟡 Talvez", pontos_fortes: [], alertas: ["Avaliação automática indisponível"], resumo: "Avalie manualmente." }
  }
}

function TelaCandidato({ apiKey, onFinalizar }) {
  const [nome, setNome] = useState("")
  const [iniciado, setIniciado] = useState(false)
  const [perguntaAtual, setPerguntaAtual] = useState(0)
  const [respostas, setRespostas] = useState([])
  const [inputTexto, setInputTexto] = useState("")
  const [gravando, setGravando] = useState(false)
  const [avaliando, setAvaliando] = useState(false)
  const [concluido, setConcluido] = useState(false)
  const recognitionRef = useRef(null)

  const iniciarGravacao = () => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SR) {
      alert("Use o Google Chrome para gravar voz, ou digite sua resposta.")
      return
    }
    const r = new SR()
    r.lang = 'pt-BR'
    r.continuous = true
    r.interimResults = true
    r.onresult = (e) => {
      const t = Array.from(e.results).map(x => x[0].transcript).join('')
      setInputTexto(t)
    }
    r.onerror = (e) => { if (e.error !== 'aborted') alert("Erro: " + e.error); setGravando(false) }
    r.onend = () => setGravando(false)
    recognitionRef.current = r
    r.start()
    setGravando(true)
  }

  const pararGravacao = () => { recognitionRef.current?.stop(); setGravando(false) }

  const enviarResposta = async () => {
    if (!inputTexto.trim()) return
    if (gravando) pararGravacao()
    const novas = [...respostas, { texto: inputTexto.trim() }]
    setRespostas(novas)
    setInputTexto("")
    if (perguntaAtual + 1 < PERGUNTAS.length) {
      setPerguntaAtual(perguntaAtual + 1)
    } else {
      setAvaliando(true)
      const aval = await avaliarRespostas(apiKey, nome, novas)
      const lista = JSON.parse(localStorage.getItem("candidatos") || "[]")
      lista.push({ nome, respostas: novas, avaliacao: aval, data: new Date().toLocaleDateString("pt-BR") })
      localStorage.setItem("candidatos", JSON.stringify(lista))
      setAvaliando(false)
      setConcluido(true)
      onFinalizar()
    }
  }

  const c = {
    page: { minHeight:'100vh', background:'linear-gradient(135deg,#0f172a,#1e293b)', display:'flex', alignItems:'center', justifyContent:'center', padding:'20px', fontFamily:'system-ui,sans-serif' },
    box: { background:'white', borderRadius:'16px', padding:'40px', maxWidth:'600px', width:'100%', boxShadow:'0 25px 50px rgba(0,0,0,.3)' },
    h1: { fontSize:'24px', fontWeight:'700', color:'#0f172a', margin:'0 0 8px' },
    p: { color:'#64748b', fontSize:'14px', margin:'0 0 32px' },
    inp: { width:'100%', padding:'12px 16px', border:'2px solid #e2e8f0', borderRadius:'10px', fontSize:'16px', boxSizing:'border-box', outline:'none' },
    btn: { background:'#7c3aed', color:'white', border:'none', borderRadius:'10px', padding:'14px', fontSize:'16px', fontWeight:'600', cursor:'pointer', width:'100%', marginTop:'16px' },
    btnR: { background:'#dc2626', color:'white', border:'none', borderRadius:'10px', padding:'12px 20px', fontSize:'14px', fontWeight:'600', cursor:'pointer' },
    btnG: { background:'#f1f5f9', color:'#475569', border:'none', borderRadius:'10px', padding:'12px 20px', fontSize:'14px', fontWeight:'600', cursor:'pointer' },
    bar: { background:'#e2e8f0', borderRadius:'99px', height:'8px', margin:'0 0 32px' },
    barIn: (p) => ({ background:'#7c3aed', borderRadius:'99px', height:'8px', width:`${p}%`, transition:'width .4s' }),
    qbox: { background:'#f8fafc', borderRadius:'12px', padding:'20px', margin:'0 0 24px', borderLeft:'4px solid #7c3aed' },
    ta: { width:'100%', padding:'12px 16px', border:'2px solid #e2e8f0', borderRadius:'10px', fontSize:'15px', boxSizing:'border-box', minHeight:'120px', resize:'vertical', outline:'none', fontFamily:'inherit' },
    row: { display:'flex', gap:'12px', marginTop:'16px', alignItems:'center' },
    badge: { display:'inline-block', background:'#ede9fe', color:'#7c3aed', borderRadius:'99px', padding:'4px 12px', fontSize:'12px', fontWeight:'600', margin:'0 0 16px' }
  }

  if (concluido) return <div style={c.page}><div style={{...c.box,textAlign:'center'}}><div style={{fontSize:'64px',marginBottom:'16px'}}>✅</div><h2 style={c.h1}>Triagem concluída!</h2><p style={{color:'#64748b',marginTop:'8px'}}>Obrigado, {nome}! Nossa equipe entrará em contato em breve.</p></div></div>
  if (avaliando) return <div style={c.page}><div style={{...c.box,textAlign:'center'}}><div style={{fontSize:'48px',marginBottom:'16px'}}>⏳</div><h2 style={c.h1}>Analisando respostas...</h2></div></div>

  if (!iniciado) return (
    <div style={c.page}>
      <div style={c.box}>
        <div style={{textAlign:'center',marginBottom:'32px'}}>
          <div style={{fontSize:'48px',marginBottom:'12px'}}>👋</div>
          <h1 style={c.h1}>Triagem — Analista de CS</h1>
          <p style={c.p}>Curseduca • Processo Seletivo</p>
        </div>
        <p style={{color:'#475569',marginBottom:'24px',lineHeight:'1.6'}}>Você vai responder <strong>4 perguntas</strong> — pode digitar ou usar sua voz (Chrome). Fale naturalmente, sem roteiro.</p>
        <input style={c.inp} placeholder="Seu nome completo" value={nome} onChange={e=>setNome(e.target.value)} onKeyDown={e=>e.key==='Enter'&&nome.trim()&&setIniciado(true)} />
        <button style={{...c.btn,opacity:nome.trim()?1:.5}} onClick={()=>nome.trim()&&setIniciado(true)}>Começar →</button>
      </div>
    </div>
  )

  return (
    <div style={c.page}>
      <div style={c.box}>
        <span style={c.badge}>Pergunta {perguntaAtual+1} de {PERGUNTAS.length}</span>
        <div style={c.bar}><div style={c.barIn((perguntaAtual/PERGUNTAS.length)*100)} /></div>
        <div style={c.qbox}><p style={{margin:0,fontSize:'17px',fontWeight:'600',color:'#1e293b',lineHeight:'1.5'}}>{PERGUNTAS[perguntaAtual].texto}</p></div>
        <textarea style={c.ta} placeholder="Digite sua resposta aqui..." value={inputTexto} onChange={e=>setInputTexto(e.target.value)} />
        {gravando && <p style={{color:'#dc2626',fontSize:'13px',marginTop:'8px'}}>🔴 Gravando... clique "Parar" quando terminar.</p>}
        <div style={c.row}>
          {!gravando
            ? <button style={c.btnG} onClick={iniciarGravacao}>🎙 Gravar voz</button>
            : <button style={c.btnR} onClick={pararGravacao}>⏹ Parar</button>
          }
          <button style={{...c.btn,marginTop:0,flex:1,opacity:inputTexto.trim()?1:.4}} onClick={enviarResposta} disabled={!inputTexto.trim()}>
            {perguntaAtual+1 < PERGUNTAS.length ? 'Próxima →' : 'Enviar ✓'}
          </button>
        </div>
      </div>
    </div>
  )
}

function Painel({ onVoltar }) {
  const [senha, setSenha] = useState("")
  const [auth, setAuth] = useState(false)
  const [candidatos, setCandidatos] = useState([])
  const [exp, setExp] = useState(null)
  const [filtro, setFiltro] = useState("todos")

  useEffect(() => { if (auth) setCandidatos(JSON.parse(localStorage.getItem("candidatos")||"[]")) }, [auth])

  const c = {
    page: { minHeight:'100vh', background:'#f8fafc', fontFamily:'system-ui,sans-serif', padding:'32px 20px' },
    card: { background:'white', borderRadius:'12px', padding:'20px', maxWidth:'900px', margin:'0 auto 16px', boxShadow:'0 1px 3px rgba(0,0,0,.1)', cursor:'pointer' },
    btn: { background:'#7c3aed', color:'white', border:'none', borderRadius:'8px', padding:'10px 20px', fontSize:'14px', fontWeight:'600', cursor:'pointer' },
    out: { background:'white', color:'#475569', border:'1px solid #e2e8f0', borderRadius:'8px', padding:'10px 20px', fontSize:'14px', cursor:'pointer' },
    sc: (n) => ({ display:'inline-block', background:n>=70?'#dcfce7':n>=50?'#fef9c3':'#fee2e2', color:n>=70?'#16a34a':n>=50?'#ca8a04':'#dc2626', borderRadius:'99px', padding:'4px 14px', fontSize:'13px', fontWeight:'700' }),
    inp: { width:'100%', padding:'12px 16px', border:'2px solid #e2e8f0', borderRadius:'10px', fontSize:'16px', boxSizing:'border-box', outline:'none', marginBottom:'16px' }
  }

  if (!auth) return (
    <div style={{...c.page,display:'flex',alignItems:'center',justifyContent:'center'}}>
      <div style={{background:'white',borderRadius:'16px',padding:'40px',maxWidth:'400px',width:'100%',boxShadow:'0 10px 30px rgba(0,0,0,.1)'}}>
        <h2 style={{fontSize:'20px',fontWeight:'700',marginBottom:'8px'}}>Painel G&C</h2>
        <p style={{color:'#64748b',marginBottom:'24px',fontSize:'14px'}}>Acesso restrito à equipe Curseduca</p>
        <input style={c.inp} type="password" placeholder="Senha" value={senha} onChange={e=>setSenha(e.target.value)} onKeyDown={e=>e.key==='Enter'&&senha===SENHA_PAINEL&&setAuth(true)} />
        <button style={{...c.btn,width:'100%'}} onClick={()=>senha===SENHA_PAINEL?setAuth(true):alert("Senha incorreta")}>Entrar</button>
        <button style={{...c.out,width:'100%',marginTop:'12px'}} onClick={onVoltar}>← Voltar</button>
      </div>
    </div>
  )

  const lista = filtro==="todos" ? candidatos : candidatos.filter(x=>x.avaliacao?.classificacao?.includes(filtro==="avanca"?"Avança":filtro==="talvez"?"Talvez":"Não avança"))

  return (
    <div style={c.page}>
      <div style={{maxWidth:'900px',margin:'0 auto 32px',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
        <div><h1 style={{fontSize:'22px',fontWeight:'700',color:'#0f172a'}}>Painel G&C — Analista de CS</h1><p style={{color:'#64748b',fontSize:'14px',marginTop:'4px'}}>{candidatos.length} candidato(s)</p></div>
        <button style={c.out} onClick={onVoltar}>← Voltar</button>
      </div>
      <div style={{maxWidth:'900px',margin:'0 auto 24px',display:'flex',gap:'8px',flexWrap:'wrap'}}>
        {[["todos","Todos"],["avanca","✅ Avança"],["talvez","🟡 Talvez"],["nao","❌ Não avança"]].map(([v,l])=>(
          <button key={v} onClick={()=>setFiltro(v)} style={{...c.btn,background:filtro===v?'#7c3aed':'white',color:filtro===v?'white':'#475569',border:'1px solid #e2e8f0',padding:'8px 16px'}}>{l}</button>
        ))}
      </div>
      {lista.length===0 && <div style={{...c.card,textAlign:'center',color:'#64748b'}}>Nenhum candidato ainda.</div>}
      {lista.map((x,i)=>(
        <div key={i} style={c.card} onClick={()=>setExp(exp===i?null:i)}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
            <div><strong style={{fontSize:'16px'}}>{x.nome}</strong><span style={{marginLeft:'12px',color:'#94a3b8',fontSize:'13px'}}>{x.data}</span></div>
            <div style={{display:'flex',gap:'10px',alignItems:'center'}}><span style={c.sc(x.avaliacao?.score||0)}>{x.avaliacao?.score||'?'}/100</span><span style={{fontSize:'18px'}}>{x.avaliacao?.classificacao?.split(' ')[0]}</span></div>
          </div>
          {exp===i && (
            <div style={{marginTop:'20px',borderTop:'1px solid #f1f5f9',paddingTop:'20px'}}>
              <p style={{color:'#475569',fontSize:'14px',marginBottom:'16px'}}>{x.avaliacao?.resumo}</p>
              {x.avaliacao?.pontos_fortes?.length>0&&<div style={{marginBottom:'12px'}}><strong style={{fontSize:'13px',color:'#16a34a'}}>✅ Pontos fortes</strong><ul style={{margin:'8px 0 0',paddingLeft:'20px'}}>{x.avaliacao.pontos_fortes.map((p,j)=><li key={j} style={{fontSize:'13px',color:'#475569'}}>{p}</li>)}</ul></div>}
              {x.avaliacao?.alertas?.length>0&&<div style={{marginBottom:'16px'}}><strong style={{fontSize:'13px',color:'#dc2626'}}>⚠️ Alertas</strong><ul style={{margin:'8px 0 0',paddingLeft:'20px'}}>{x.avaliacao.alertas.map((a,j)=><li key={j} style={{fontSize:'13px',color:'#475569'}}>{a}</li>)}</ul></div>}
              <strong style={{fontSize:'13px',color:'#475569'}}>Respostas</strong>
              {x.respostas.map((r,j)=>(
                <div key={j} style={{marginTop:'12px',background:'#f8fafc',borderRadius:'8px',padding:'12px'}}>
                  <p style={{margin:'0 0 6px',fontSize:'12px',color:'#94a3b8',fontWeight:'600'}}>P{j+1}: {PERGUNTAS[j]?.texto}</p>
                  <p style={{margin:0,fontSize:'14px',color:'#1e293b'}}>{r.texto}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

export default function App() {
  const [tela, setTela] = useState("home")
  const [apiKey, setApiKey] = useState(localStorage.getItem("anthropic_key")||"")
  const [inputKey, setInputKey] = useState("")

  const salvar = () => {
    if (!inputKey.trim()) return
    localStorage.setItem("anthropic_key", inputKey.trim())
    setApiKey(inputKey.trim())
    setInputKey("")
    alert("API key salva!")
  }

  const c = {
    page: { minHeight:'100vh', background:'linear-gradient(135deg,#0f172a,#4c1d95)', display:'flex', alignItems:'center', justifyContent:'center', padding:'20px', fontFamily:'system-ui,sans-serif' },
    box: { background:'white', borderRadius:'20px', padding:'48px 40px', maxWidth:'480px', width:'100%', boxShadow:'0 30px 60px rgba(0,0,0,.4)', textAlign:'center' },
    btn: (bg) => ({ background:bg, color:'white', border:'none', borderRadius:'12px', padding:'16px 24px', fontSize:'16px', fontWeight:'600', cursor:'pointer', width:'100%', marginBottom:'12px', display:'block' }),
    kb: { background:'#f8fafc', borderRadius:'12px', padding:'20px', marginTop:'32px', textAlign:'left' },
    inp: { width:'100%', padding:'10px 14px', border:'1px solid #e2e8f0', borderRadius:'8px', fontSize:'14px', boxSizing:'border-box', marginBottom:'10px', outline:'none' }
  }

  if (tela==="candidato") return <TelaCandidato apiKey={apiKey} onFinalizar={()=>setTela("home")} />
  if (tela==="painel") return <Painel onVoltar={()=>setTela("home")} />

  return (
    <div style={c.page}>
      <div style={c.box}>
        <div style={{fontSize:'48px',marginBottom:'12px'}}>🎯</div>
        <h1 style={{fontSize:'26px',fontWeight:'800',color:'#0f172a',marginBottom:'8px'}}>Triagem Curseduca</h1>
        <p style={{color:'#64748b',marginBottom:'40px',fontSize:'15px'}}>Analista de Customer Success</p>
        <button style={c.btn('#7c3aed')} onClick={()=>setTela("candidato")}>👤 Sou candidato(a)</button>
        <button style={c.btn('#1e293b')} onClick={()=>setTela("painel")}>🔒 Painel G&C</button>
        <div style={c.kb}>
          <p style={{margin:'0 0 10px',fontSize:'13px',color:'#475569',fontWeight:'600'}}>
            {apiKey ? "✅ API Key configurada" : "⚙️ Cole sua API Key da Anthropic (sk-ant-...)"}
          </p>
          <input style={c.inp} type="password" placeholder="sk-ant-..." value={inputKey} onChange={e=>setInputKey(e.target.value)} onKeyDown={e=>e.key==='Enter'&&salvar()} />
          <button onClick={salvar} style={{background:'#7c3aed',color:'white',border:'none',borderRadius:'8px',padding:'8px 16px',fontSize:'13px',cursor:'pointer',fontWeight:'600'}}>Salvar</button>
        </div>
      </div>
    </div>
  )
}
